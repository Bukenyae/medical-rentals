export async function handleApproveBookingPost(req, deps) {
  const { getSupabaseWithAuth, approveBooking } = deps;

  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    if (!user) return { status: 401, body: { error: 'Unauthorized' } };

    const body = await req.json();
    const bookingId = String(body?.bookingId || '');
    if (!bookingId) return { status: 400, body: { error: 'Missing bookingId' } };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, property_id, properties!inner(owner_id, created_by)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) return { status: 400, body: { error: bookingError.message } };

    const property = booking?.properties || null;
    const isOwner = property?.owner_id === user.id || property?.created_by === user.id;
    if (!booking || !isOwner) return { status: 403, body: { error: 'Forbidden' } };

    const result = await approveBooking(supabase, bookingId);
    return { status: 200, body: { result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve booking';
    return { status: 400, body: { error: message } };
  }
}
