import { NextResponse } from 'next/server';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function canManageProperty(userId: string, property: { owner_id?: string | null; created_by?: string | null } | null) {
  return property?.owner_id === userId || property?.created_by === userId;
}

export async function GET(req: Request) {
  const { supabase, user } = await getSupabaseWithAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      property_id,
      start_at,
      end_at,
      guest_count,
      status,
      total_cents,
      pricing_snapshot,
      event_booking_details(*),
      booking_risk_flags(*),
      properties!inner(id,title,owner_id,created_by)
    `)
    .eq('kind', 'event')
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const filtered = (data || []).filter((row) =>
    canManageProperty(user.id, row.properties as { owner_id?: string | null; created_by?: string | null } | null)
  );

  return NextResponse.json({ requests: filtered }, { status: 200 });
}

export async function PATCH(req: Request) {
  const { supabase, user } = await getSupabaseWithAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const bookingId = String(body?.bookingId || '');
  const action = String(body?.action || '');

  if (!bookingId || !['decline', 'request_info'].includes(action)) {
    return NextResponse.json({ error: 'Invalid bookingId or action' }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, properties!inner(owner_id,created_by)')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 400 });
  const property = booking?.properties as { owner_id?: string | null; created_by?: string | null } | null;
  if (!booking || !canManageProperty(user.id, property)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextStatus = action === 'decline' ? 'declined' : 'requested';
  const snapshot = action === 'request_info'
    ? { host_request_info: String(body?.note || 'Please provide more event details.') }
    : undefined;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: nextStatus,
      pricing_snapshot: snapshot
        ? { ...(body?.pricingSnapshot || {}), ...snapshot }
        : undefined,
      blocks_calendar: action === 'request_info',
    })
    .eq('id', bookingId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
