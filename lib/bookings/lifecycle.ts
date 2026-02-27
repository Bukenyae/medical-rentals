import { SupabaseClient } from '@supabase/supabase-js';
import { requireStripe } from '@/lib/stripe';
import { sendBookingApprovalPaymentEmail } from '@/lib/notifications/bookingEmails';
import { BookingDraftInput, BookingKind, BookingStatus, QuoteResult } from '@/lib/bookings/types';
import { resolveSubmissionOutcome } from '@/lib/bookings/submission-core.mjs';

type PaymentPurpose = 'booking_total' | 'deposit_hold';
async function createPaymentRecord(
  supabase: SupabaseClient,
  bookingId: string,
  amountCents: number,
  currency: string,
  stripePaymentIntentId: string,
  purpose: PaymentPurpose,
  captureMethod: 'automatic' | 'manual'
) {
  const { error } = await supabase.from('payments').insert({
    booking_id: bookingId,
    stripe_payment_intent_id: stripePaymentIntentId,
    amount_cents: amountCents,
    currency,
    status: 'pending',
    purpose,
    capture_method: captureMethod,
    authorized_at: captureMethod === 'manual' ? new Date().toISOString() : null,
  });

  if (error) throw new Error(error.message);
}

export async function createDraftBooking(
  supabase: SupabaseClient,
  userId: string,
  input: BookingDraftInput
) {
  const checkIn = new Date(input.startAt).toISOString().slice(0, 10);
  const checkOut = new Date(input.endAt).toISOString().slice(0, 10);
  const status: BookingStatus = 'draft';

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      property_id: input.propertyId,
      guest_id: userId,
      user_id: userId,
      kind: input.kind,
      mode: input.mode,
      status,
      check_in: checkIn,
      check_out: checkOut,
      start_at: input.startAt,
      end_at: input.endAt,
      guest_count: input.guestCount,
      total_amount: input.quote.totalCents / 100,
      currency: input.quote.currency,
      subtotal_cents: input.quote.subtotalCents,
      fees_cents: input.quote.feesCents,
      addons_total_cents: input.quote.addonsTotalCents,
      total_cents: input.quote.totalCents,
      deposit_cents: input.quote.depositCents,
      pricing_snapshot: input.quote.pricingSnapshot,
      blocks_calendar: false,
    })
    .select('id, kind, mode, status')
    .single();

  if (error) throw new Error(error.message);

  if (input.kind === 'event' && input.eventDetails) {
    const { error: detailError } = await supabase.from('event_booking_details').insert({
      booking_id: booking.id,
      event_type: (input.eventDetails.eventType as string) ?? 'other',
      estimated_vehicle_count: input.eventDetails.estimatedVehicleCount ?? null,
      alcohol: input.eventDetails.alcohol ?? false,
      amplified_sound: input.eventDetails.amplifiedSound ?? false,
      event_description: input.eventDetails.eventDescription ?? 'Event request',
      vendors: input.eventDetails.vendors ?? [],
      production_details: input.eventDetails.productionDetails ?? null,
    });

    if (detailError) throw new Error(detailError.message);
  }

  if (input.kind === 'stay' && input.stayDetails) {
    const { error: detailError } = await supabase.from('stay_booking_details').insert({
      booking_id: booking.id,
      adults: input.stayDetails.adults ?? null,
      children: input.stayDetails.children ?? null,
      infants: input.stayDetails.infants ?? null,
      pets: input.stayDetails.pets ?? false,
      special_requests: input.stayDetails.specialRequests ?? null,
    });

    if (detailError) throw new Error(detailError.message);
  }

  return booking;
}
export async function submitBookingRequest(
  supabase: SupabaseClient,
  bookingId: string,
  quote: QuoteResult,
  kind: BookingKind
) {
  const outcome = resolveSubmissionOutcome(kind, quote.mode, quote.riskFlags);
  const status = outcome.status as BookingStatus;

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      mode: outcome.mode,
      status,
      pricing_snapshot: {
        ...(quote.pricingSnapshot || {}),
        riskFlags: quote.riskFlags,
      },
      blocks_calendar: outcome.blocksCalendar,
    })
    .eq('id', bookingId)
    .select('id, kind, mode, status, property_id')
    .single();

  if (error) throw new Error(error.message);

  if (quote.riskFlags.length > 0) {
    const rows = quote.riskFlags.map((flag) => ({
      booking_id: bookingId,
      flag_code: flag,
      severity: 2,
      details: { source: 'event_submit' },
    }));
    const { error: riskError } = await supabase.from('booking_risk_flags').insert(rows);
    if (riskError) throw new Error(riskError.message);
  }

  return booking;
}

export async function approveBooking(supabase: SupabaseClient, bookingId: string) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ status: 'approved', blocks_calendar: true })
    .eq('id', bookingId)
    .select('id, total_cents, deposit_cents, currency, mode, guest_id, start_at, end_at, properties(title)')
    .single();

  if (error) throw new Error(error.message);

  const stripe = requireStripe();
  const currency = (booking.currency || 'usd') as string;
  const totalCents = Math.max(0, Number(booking.total_cents || 0));
  const depositCents = Math.max(0, Number(booking.deposit_cents || 0));

  const balanceIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { booking_id: bookingId, flow: 'event_approval', purpose: 'booking_total' },
  });

  await createPaymentRecord(
    supabase,
    bookingId,
    totalCents,
    currency,
    balanceIntent.id,
    'booking_total',
    'automatic'
  );

  let depositHold: { paymentIntentId: string; clientSecret: string | null } | null = null;
  if (depositCents > 0) {
    const depositIntent = await stripe.paymentIntents.create({
      amount: depositCents,
      currency,
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { booking_id: bookingId, flow: 'event_approval', purpose: 'deposit_hold' },
    });

    await createPaymentRecord(
      supabase,
      bookingId,
      depositCents,
      currency,
      depositIntent.id,
      'deposit_hold',
      'manual'
    );

    depositHold = {
      paymentIntentId: depositIntent.id,
      clientSecret: depositIntent.client_secret,
    };
  }

  const { error: awaitingError } = await supabase
    .from('bookings')
    .update({ status: 'awaiting_payment' })
    .eq('id', bookingId);

  if (awaitingError) throw new Error(awaitingError.message);

  let approvalEmailSent = false;
  if (booking.guest_id) {
    try {
      await sendBookingApprovalPaymentEmail({
        guestUserId: booking.guest_id as string,
        bookingId,
        propertyTitle: (booking.properties as { title?: string | null } | null)?.title ?? null,
        startAt: booking.start_at as string | null,
        endAt: booking.end_at as string | null,
      });
      approvalEmailSent = true;
    } catch (emailError) {
      console.error('Failed to send booking approval payment email', { bookingId, emailError });
    }
  }

  return {
    approvalEmailSent,
    bookingId,
    paymentIntentId: balanceIntent.id,
    clientSecret: balanceIntent.client_secret,
    depositHold,
  };
}

export async function capturePayment(supabase: SupabaseClient, bookingId: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, stripe_payment_intent_id, purpose')
    .eq('booking_id', bookingId)
    .eq('purpose', 'booking_total')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payment?.stripe_payment_intent_id) throw new Error('No booking_total payment intent found');

  const stripe = requireStripe();
  const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

  if (intent.status !== 'succeeded' && intent.status !== 'processing') {
    throw new Error(`Payment not complete: ${intent.status}`);
  }

  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({ status: 'succeeded', stripe_charge_id: intent.latest_charge as string })
    .eq('id', payment.id);
  if (paymentUpdateError) throw new Error(paymentUpdateError.message);

  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', blocks_calendar: true })
    .eq('id', bookingId);
  if (bookingUpdateError) throw new Error(bookingUpdateError.message);

  return { bookingId, paymentIntentId: intent.id, status: intent.status };
}

export async function releaseDepositHold(supabase: SupabaseClient, bookingId: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, stripe_payment_intent_id, status')
    .eq('booking_id', bookingId)
    .eq('purpose', 'deposit_hold')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payment?.stripe_payment_intent_id) throw new Error('No deposit hold found for booking');

  const stripe = requireStripe();
  const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

  if (intent.status === 'requires_capture') {
    await stripe.paymentIntents.cancel(intent.id, { cancellation_reason: 'requested_by_customer' });
  }

  const { error: updatePaymentError } = await supabase
    .from('payments')
    .update({ status: 'cancelled', released_at: new Date().toISOString() })
    .eq('id', payment.id);
  if (updatePaymentError) throw new Error(updatePaymentError.message);

  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ status: 'deposit_released' })
    .eq('id', bookingId)
    .in('status', ['completed', 'confirmed', 'paid']);

  if (bookingError) throw new Error(bookingError.message);

  return { bookingId, released: true, paymentIntentId: intent.id };
}
