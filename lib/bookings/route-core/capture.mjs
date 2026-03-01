export async function handleCaptureBookingPost(req, deps) {
  const { getSupabaseWithAuth, capturePayment } = deps;

  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    if (!user) return { status: 401, body: { error: 'Unauthorized' } };

    const body = await req.json();
    const bookingId = String(body?.bookingId || '');
    if (!bookingId) return { status: 400, body: { error: 'Missing bookingId' } };

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, guest_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking || booking.guest_id !== user.id) {
      return { status: 403, body: { error: 'Forbidden' } };
    }

    const result = await capturePayment(supabase, bookingId);
    return { status: 200, body: { result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to capture payment';
    return { status: 400, body: { error: message } };
  }
}
