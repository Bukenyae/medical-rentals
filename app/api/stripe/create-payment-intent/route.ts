import { NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

async function getSupabaseWithAuth(req: Request) {
  const cookieClient = createServerSupabase();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();

  if (cookieUser) {
    return { supabase: cookieClient, user: cookieUser } as const;
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (token) {
    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient.auth.getUser(token);
    if (!error && data?.user) {
      return { supabase: serviceClient, user: data.user } as const;
    }
  }

  return { supabase: cookieClient, user: null } as const;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestPayload {
  bookingId?: string;
  amount?: number; // Optional legacy field from client; verified against booking total
  currency?: string;
  metadata?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    const stripe = requireStripe();
    const { supabase, user } = await getSupabaseWithAuth(req);

    const body = (await req.json().catch(() => ({}))) as RequestPayload;
    const { bookingId, currency = 'usd', metadata = {}, amount } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // Ensure user is authenticated and owns the booking draft
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `id, property_id, guest_id, check_in, check_out, guest_count, total_amount, status, payment_intent_id,
         properties:properties(title)`
      )
      .eq('id', bookingId)
      .eq('guest_id', user.id)
      .maybeSingle();

    if (bookingError) {
      console.error('Failed to fetch booking for payment intent:', bookingError);
      return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let bookingRecord = booking;

    if (bookingRecord.status === 'cancelled') {
      const { error: resetError } = await supabase
        .from('bookings')
        .update({
          status: 'pending',
          payment_intent_id: null,
          payment_failure_code: null,
          payment_failure_message: null,
          payment_failure_at: null,
        })
        .eq('id', bookingRecord.id);

      if (resetError) {
        console.error('Failed to reset cancelled booking before retry:', resetError);
        return NextResponse.json({ error: 'Unable to retry payment for this booking' }, { status: 400 });
      }

      bookingRecord = {
        ...bookingRecord,
        status: 'pending',
        payment_intent_id: null,
      };
    }

    if (bookingRecord.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending bookings can be charged' }, { status: 400 });
    }

    const totalAmount = Number(bookingRecord.total_amount ?? 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Booking total is invalid' }, { status: 400 });
    }

    const computedAmountCents = Math.round(totalAmount * 100);

    if (amount !== undefined && Math.round(amount) !== computedAmountCents) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    const enrichedMetadata: Record<string, string> = {
      ...metadata,
      booking_id: booking.id,
      property_ref: bookingRecord.property_id ?? '',
      property_title: (bookingRecord.properties as { title?: string | null } | null)?.title ?? '',
      check_in: bookingRecord.check_in ?? '',
      check_out: bookingRecord.check_out ?? '',
      guests: String(bookingRecord.guest_count ?? ''),
      guest_id: bookingRecord.guest_id ?? '',
    };

    const reuseExistingIntent = async (paymentIntentId: string) => {
      try {
        const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (existing.status === 'succeeded') {
          return existing;
        }

        if (existing.status === 'canceled') {
          return null;
        }

        if (existing.amount !== computedAmountCents || existing.currency !== currency) {
          await stripe.paymentIntents.update(paymentIntentId, {
            amount: computedAmountCents,
            currency,
            metadata: enrichedMetadata,
          });
        } else {
          await stripe.paymentIntents.update(paymentIntentId, { metadata: enrichedMetadata });
        }

        const refreshed = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (refreshed.status === 'processing' || refreshed.status === 'requires_capture') {
          return refreshed;
        }

        return refreshed;
      } catch (intentError) {
        console.warn('Unable to reuse existing PaymentIntent; creating a new one.', intentError);
        return null;
      }
    };

    let paymentIntent = null;

    if (bookingRecord.payment_intent_id) {
      paymentIntent = await reuseExistingIntent(bookingRecord.payment_intent_id);
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: computedAmountCents,
        currency,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: enrichedMetadata,
      });

      const { data: updatedRows, error: updateError } = await supabase
        .from('bookings')
        .update({ payment_intent_id: paymentIntent.id, total_amount: totalAmount })
        .eq('id', bookingRecord.id)
        .eq('status', 'pending')
        .is('payment_intent_id', null)
        .select('id')
        .maybeSingle();

      if (updateError) {
        console.error('Failed to persist payment_intent_id on booking:', updateError);
        try {
          await stripe.paymentIntents.cancel(paymentIntent.id, { cancellation_reason: 'requested_by_customer' });
        } catch (cancelError) {
          console.warn('Failed to cancel PaymentIntent after persistence error', cancelError);
        }
        return NextResponse.json({ error: 'Failed to update booking with payment intent' }, { status: 500 });
      }

      if (!updatedRows) {
        try {
          await stripe.paymentIntents.cancel(paymentIntent.id, { cancellation_reason: 'requested_by_customer' });
        } catch (cancelError) {
          console.warn('Failed to cancel PaymentIntent after race detection', cancelError);
        }
        return NextResponse.json({ error: 'Another checkout session is already in progress for this booking.' }, { status: 409 });
      }
    }

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: computedAmountCents,
        currency,
        status: paymentIntent.status,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error creating PaymentIntent:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
