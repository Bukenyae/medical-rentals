import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PaymentPurpose = 'booking_total' | 'deposit_hold' | 'legacy';

function getPurpose(metadata: Record<string, string>): PaymentPurpose {
  if (metadata.purpose === 'booking_total') return 'booking_total';
  if (metadata.purpose === 'deposit_hold') return 'deposit_hold';
  return 'legacy';
}

export async function POST(req: Request) {
  const stripe = requireStripe();
  const sig = headers().get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  const payload = await req.text();

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const supabase = getServiceSupabase();
        const metadata = (pi.metadata || {}) as Record<string, string>;
        const bookingId = typeof metadata.booking_id === 'string' ? metadata.booking_id : null;
        const purpose = getPurpose(metadata);
        const amountDecimal = ((pi.amount_received ?? pi.amount) ?? 0) / 100;

        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            stripe_charge_id: (pi.latest_charge as string | null) ?? null,
          })
          .eq('stripe_payment_intent_id', pi.id);

        const updateBookingConfirmed = async (id: string) => {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'confirmed', payment_intent_id: pi.id, total_amount: amountDecimal })
            .eq('id', id);
          if (error) {
            console.error('Failed to update booking to confirmed', { bookingId: id, piId: pi.id, error });
            return false;
          }
          return true;
        };

        if (bookingId && (purpose === 'booking_total' || purpose === 'legacy')) {
          const updated = await updateBookingConfirmed(bookingId);
          if (updated) break;
        }

        if (purpose === 'deposit_hold') {
          break;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const resolvePropertyId = async (): Promise<string | null> => {
          if (metadata.property_ref && uuidRegex.test(String(metadata.property_ref))) {
            return String(metadata.property_ref);
          }
          if (metadata.property_title) {
            const { data: foundByTitle } = await supabase
              .from('properties')
              .select('id,title')
              .ilike('title', String(metadata.property_title))
              .limit(1)
              .maybeSingle();
            if (foundByTitle?.id) return foundByTitle.id as string;
          }
          return null;
        };

        const { data: existingByPi } = await supabase
          .from('bookings')
          .select('id')
          .eq('payment_intent_id', pi.id)
          .maybeSingle();

        if (existingByPi?.id) {
          await updateBookingConfirmed(existingByPi.id as string);
          break;
        }

        if (!metadata.check_in || !metadata.check_out || !metadata.guests) {
          break;
        }

        const resolvedPropertyId = await resolvePropertyId();
        if (!resolvedPropertyId) break;

        const maybeCustomer = (pi.customer as string | null) || null;
        const includeGuestId = !!(maybeCustomer && uuidRegex.test(maybeCustomer));

        const { data: newBooking, error: createError } = await supabase
          .from('bookings')
          .insert({
            property_id: resolvedPropertyId,
            ...(includeGuestId ? { guest_id: maybeCustomer, user_id: maybeCustomer } : {}),
            check_in: metadata.check_in,
            check_out: metadata.check_out,
            start_at: `${metadata.check_in}T12:00:00Z`,
            end_at: `${metadata.check_out}T12:00:00Z`,
            guest_count: parseInt(metadata.guests, 10) || 1,
            total_amount: amountDecimal,
            total_cents: Math.round(amountDecimal * 100),
            kind: 'stay',
            mode: 'instant',
            status: 'confirmed',
            payment_intent_id: pi.id,
            blocks_calendar: true,
          })
          .select('id')
          .maybeSingle();

        if (createError) {
          console.error('Failed to create booking from metadata:', createError);
        } else if (newBooking?.id) {
          await supabase.from('payments').update({ booking_id: newBooking.id }).eq('stripe_payment_intent_id', pi.id);
        }

        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const supabase = getServiceSupabase();
        const metadata = (pi.metadata || {}) as Record<string, string>;
        const bookingId = typeof metadata.booking_id === 'string' ? metadata.booking_id : null;
        const purpose = getPurpose(metadata);
        const failureCode = pi.last_payment_error?.code ?? pi.status;
        const failureMessage = pi.last_payment_error?.message ?? 'Payment failed';

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);

        if (purpose === 'deposit_hold') {
          if (bookingId) {
            await supabase
              .from('bookings')
              .update({ status: 'awaiting_payment' })
              .eq('id', bookingId);
          }
          break;
        }

        const updateBookingById = async (id: string) => {
          const { error } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              payment_intent_id: pi.id,
              payment_failure_code: failureCode,
              payment_failure_message: failureMessage?.slice(0, 500) ?? null,
              payment_failure_at: new Date().toISOString(),
            })
            .eq('id', id);
          return !error;
        };

        let handled = false;
        if (bookingId) handled = await updateBookingById(bookingId);

        if (!handled) {
          const { data: fallback } = await supabase
            .from('bookings')
            .select('id')
            .eq('payment_intent_id', pi.id)
            .maybeSingle();
          if (fallback?.id) await updateBookingById(fallback.id as string);
        }

        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
