import { SupabaseClient } from '@supabase/supabase-js';
import { requireStripe } from '@/lib/stripe';
import { sendBookingApprovalPaymentEmail } from '@/lib/notifications/bookingEmails';
import { BookingStatus } from '@/lib/bookings/types';
import {
  mapIntentStatusToPaymentStatus,
  resolveCaptureBookingStatus,
  selectLatestPaymentByPurpose,
  shouldCreateReplacementIntent,
} from '@/lib/bookings/payment-lifecycle-core.mjs';

type PaymentPurpose = 'booking_total' | 'deposit_hold';

type ExistingPayment = {
  id: string;
  purpose: PaymentPurpose;
  status: string;
  stripe_payment_intent_id: string | null;
};

type StripeIntent = {
  id: string;
  client_secret: string | null;
  status: string;
  amount: number;
  currency: string;
};

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

async function loadExistingPayments(supabase: SupabaseClient, bookingId: string) {
  const { data: existingPayments, error } = await supabase
    .from('payments')
    .select('id, purpose, status, stripe_payment_intent_id, created_at')
    .eq('booking_id', bookingId)
    .in('purpose', ['booking_total', 'deposit_hold'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (existingPayments || []) as ExistingPayment[];
}

async function ensurePaymentIntent(
  supabase: SupabaseClient,
  stripe: ReturnType<typeof requireStripe>,
  bookingId: string,
  purpose: PaymentPurpose,
  amountCents: number,
  currency: string,
  existingPayments: ExistingPayment[]
): Promise<StripeIntent> {
  const latest = selectLatestPaymentByPurpose(existingPayments, purpose);

  if (latest?.stripe_payment_intent_id) {
    const existingIntent = (await stripe.paymentIntents.retrieve(
      latest.stripe_payment_intent_id
    )) as StripeIntent;

    if (!shouldCreateReplacementIntent(existingIntent, amountCents, currency)) {
      return existingIntent;
    }
  }

  const intent = (await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    capture_method: purpose === 'deposit_hold' ? 'manual' : 'automatic',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { booking_id: bookingId, flow: 'event_approval', purpose },
  })) as StripeIntent;

  await createPaymentRecord(
    supabase,
    bookingId,
    amountCents,
    currency,
    intent.id,
    purpose,
    purpose === 'deposit_hold' ? 'manual' : 'automatic'
  );

  return intent;
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
  const existingPayments = await loadExistingPayments(supabase, bookingId);

  const balanceIntent = await ensurePaymentIntent(
    supabase,
    stripe,
    bookingId,
    'booking_total',
    totalCents,
    currency,
    existingPayments
  );

  let depositHold: { paymentIntentId: string; clientSecret: string | null } | null = null;
  if (depositCents > 0) {
    const depositIntent = await ensurePaymentIntent(
      supabase,
      stripe,
      bookingId,
      'deposit_hold',
      depositCents,
      currency,
      existingPayments
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
    .select('id, stripe_payment_intent_id, status')
    .eq('booking_id', bookingId)
    .eq('purpose', 'booking_total')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payment?.stripe_payment_intent_id) throw new Error('No booking_total payment intent found');

  const stripe = requireStripe();
  const totalIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

  if (totalIntent.status !== 'succeeded' && totalIntent.status !== 'processing') {
    throw new Error(`Payment not complete: ${totalIntent.status}`);
  }

  const normalizedTotalStatus = mapIntentStatusToPaymentStatus(totalIntent.status);
  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({ status: normalizedTotalStatus, stripe_charge_id: totalIntent.latest_charge as string })
    .eq('id', payment.id);
  if (paymentUpdateError) throw new Error(paymentUpdateError.message);

  const { data: depositPayment, error: depositError } = await supabase
    .from('payments')
    .select('id, stripe_payment_intent_id, status')
    .eq('booking_id', bookingId)
    .eq('purpose', 'deposit_hold')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (depositError) throw new Error(depositError.message);

  let bookingStatus: BookingStatus = 'confirmed';
  let depositIntentStatus: string | null = null;

  if (depositPayment?.stripe_payment_intent_id) {
    const depositIntent = await stripe.paymentIntents.retrieve(depositPayment.stripe_payment_intent_id);
    depositIntentStatus = depositIntent.status;
    const normalizedDepositStatus = mapIntentStatusToPaymentStatus(depositIntent.status);

    if (normalizedDepositStatus !== depositPayment.status) {
      const { error: depositUpdateError } = await supabase
        .from('payments')
        .update({ status: normalizedDepositStatus })
        .eq('id', depositPayment.id);
      if (depositUpdateError) throw new Error(depositUpdateError.message);
    }

    bookingStatus = resolveCaptureBookingStatus(true, depositIntent.status) as BookingStatus;
  }

  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({ status: bookingStatus, blocks_calendar: true })
    .eq('id', bookingId);
  if (bookingUpdateError) throw new Error(bookingUpdateError.message);

  return {
    bookingId,
    paymentIntentId: totalIntent.id,
    status: totalIntent.status,
    bookingStatus,
    depositIntentStatus,
  };
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
