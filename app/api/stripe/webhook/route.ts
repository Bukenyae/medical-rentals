import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        const amountDecimal = ((pi.amount_received ?? pi.amount) ?? 0) / 100;
        const logContext = {
          piId: pi.id,
          bookingId,
          metadata,
          amount: amountDecimal,
        };

        console.log('Processing payment_intent.succeeded', logContext);

        const upsertBookingById = async (id: string) => {
          const { data: existing, error: existingError } = await supabase
            .from('bookings')
            .select('id,status,payment_intent_id')
            .eq('id', id)
            .maybeSingle();

          if (existingError) {
            console.error('Failed to load booking before update:', existingError);
            return false;
          }

          if (!existing) {
            return false;
          }

          if (existing.payment_intent_id === pi.id && existing.status === 'confirmed') {
            return true; // already processed
          }

          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              payment_intent_id: pi.id,
              total_amount: amountDecimal,
            })
            .eq('id', id);

          if (updateError) {
            console.error('Failed to update booking by ID:', updateError);
            return false;
          }

          return true;
        };

        if (bookingId) {
          const updated = await upsertBookingById(bookingId);
          if (updated) {
            console.log('Booking updated from webhook by booking_id', { bookingId, piId: pi.id });
          }
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        // Attempt to resolve property_id if property_ref is missing or not a UUID
        const resolvePropertyId = async (): Promise<string | null> => {
          if (metadata.property_ref && uuidRegex.test(String(metadata.property_ref))) {
            return String(metadata.property_ref);
          }
          if (metadata.property_title) {
            try {
              const { data: foundByTitle } = await supabase
                .from('properties')
                .select('id,title')
                .ilike('title', String(metadata.property_title))
                .limit(1)
                .maybeSingle();
              if (foundByTitle?.id) {
                return foundByTitle.id as string;
              }
            } catch (e) {
              console.warn('Property resolution by title failed in webhook:', e);
            }
          }
          return null;
        };

        const ensureBookingExists = async () => {
          const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('payment_intent_id', pi.id)
            .maybeSingle();

          if (existing) {
            return existing.id;
          }

          if (!metadata.check_in || !metadata.check_out || !metadata.guests) {
            console.warn('Insufficient metadata to create booking from webhook', logContext);
            return null;
          }

          const resolvedPropertyId = await resolvePropertyId();
          if (!resolvedPropertyId) {
            console.warn('Unable to resolve property for webhook-created booking', logContext);
            return null;
          }

          const maybeCustomer = (pi.customer as string | null) || null;
          const includeGuestId = !!(maybeCustomer && uuidRegex.test(maybeCustomer));

          const { data: newBooking, error: createError } = await supabase
            .from('bookings')
            .insert({
              property_id: resolvedPropertyId,
              ...(includeGuestId ? { guest_id: maybeCustomer } : {}),
              check_in: metadata.check_in,
              check_out: metadata.check_out,
              guest_count: parseInt(metadata.guests, 10) || 1,
              total_amount: amountDecimal,
              status: 'confirmed',
              payment_intent_id: pi.id,
            })
            .select('id')
            .maybeSingle();

          if (createError) {
            console.error('Failed to create booking from metadata:', createError);
            return null;
          }

          console.log('Created booking from payment metadata', { bookingId: newBooking?.id, piId: pi.id });
          return newBooking?.id ?? null;
        };

        const ensuredBookingId = await ensureBookingExists();
        if (ensuredBookingId && (!bookingId || bookingId !== ensuredBookingId)) {
          await upsertBookingById(ensuredBookingId);
        }

        console.log('Payment processing completed', logContext);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const supabase = getServiceSupabase();
        const metadata = (pi.metadata || {}) as Record<string, string>;
        const bookingIdFromMetadata = typeof metadata.booking_id === 'string' ? metadata.booking_id : null;
        const failureCode = pi.last_payment_error?.code ?? pi.status;
        const failureMessage = pi.last_payment_error?.message ?? 'Payment failed';

        const updateBookingById = async (id: string) => {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              payment_intent_id: pi.id,
              payment_failure_code: failureCode,
              payment_failure_message: failureMessage?.slice(0, 500) ?? null,
              payment_failure_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (updateError) {
            console.error('Failed to mark booking as cancelled after payment failure', { updateError, bookingId: id, piId: pi.id });
            return false;
          }
          return true;
        };

        let handled = false;

        if (bookingIdFromMetadata) {
          handled = await updateBookingById(bookingIdFromMetadata);
        }

        if (!handled) {
          const { data: fallbackBooking, error: fetchError } = await supabase
            .from('bookings')
            .select('id')
            .eq('payment_intent_id', pi.id)
            .maybeSingle();

          if (fetchError) {
            console.error('Failed to fetch booking by payment_intent_id after failure', { fetchError, piId: pi.id });
          } else if (fallbackBooking?.id) {
            await updateBookingById(fallbackBooking.id as string);
          }
        }

        console.warn('Payment failed', {
          piId: pi.id,
          code: failureCode,
          message: pi.last_payment_error?.message,
          bookingId: bookingIdFromMetadata,
        });
        break;
      }
      default:
        // No-op for other events for now
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
