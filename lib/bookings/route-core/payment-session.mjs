export async function handlePaymentSessionGet(req, deps) {
  const { getSupabaseWithAuth, requireStripe } = deps;

  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    if (!user) return { status: 401, body: { error: 'Unauthorized' } };

    const url = new URL(req.url);
    const bookingId = String(url.searchParams.get('bookingId') || '');
    if (!bookingId) return { status: 400, body: { error: 'Missing bookingId' } };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, guest_id, status, total_cents, deposit_cents, currency')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) return { status: 400, body: { error: bookingError.message } };
    if (!booking || booking.guest_id !== user.id) {
      return { status: 404, body: { error: 'Booking not found' } };
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, stripe_payment_intent_id, amount_cents, currency, status, purpose, capture_method')
      .eq('booking_id', bookingId)
      .in('purpose', ['booking_total', 'deposit_hold'])
      .order('created_at', { ascending: true });

    if (paymentsError) return { status: 400, body: { error: paymentsError.message } };

    const stripe = requireStripe();
    const sessions = await Promise.all(
      (payments || [])
        .filter((payment) => !!payment.stripe_payment_intent_id)
        .map(async (payment) => {
          const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

          let mappedStatus = payment.status;
          if (intent.status === 'succeeded') mappedStatus = 'succeeded';
          if (intent.status === 'requires_action' || intent.status === 'requires_confirmation') mappedStatus = 'requires_action';
          if (intent.status === 'canceled') mappedStatus = 'cancelled';

          if (mappedStatus !== payment.status) {
            await supabase.from('payments').update({ status: mappedStatus }).eq('id', payment.id);
          }

          return {
            paymentId: payment.id,
            purpose: payment.purpose,
            captureMethod: payment.capture_method,
            amountCents: payment.amount_cents,
            currency: payment.currency,
            status: mappedStatus,
            intentStatus: intent.status,
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
          };
        })
    );

    return { status: 200, body: { booking, sessions } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load payment session';
    return { status: 400, body: { error: message } };
  }
}
