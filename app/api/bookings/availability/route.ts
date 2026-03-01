import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BLOCKING_STATUSES = [
  'requested',
  'approved',
  'awaiting_payment',
  'paid',
  'confirmed',
  'in_progress',
  'pending',
  'checked_in',
];

export async function POST(req: Request) {
  try {
    const { propertyId, startAt, endAt, excludeBookingId } = await req.json();
    if (!propertyId || !startAt || !endAt) {
      return NextResponse.json({ error: 'Missing propertyId, startAt, or endAt' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let query = supabase
      .from('bookings')
      .select('id, kind, status, start_at, end_at, check_in, check_out')
      .eq('property_id', propertyId)
      .in('status', BLOCKING_STATUSES)
      .or(`and(start_at.lt.${endAt},end_at.gt.${startAt}),and(check_in.lt.${endAt.slice(0, 10)},check_out.gt.${startAt.slice(0, 10)})`)
      .limit(1);

    if (excludeBookingId) query = query.neq('id', excludeBookingId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const conflict = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return NextResponse.json({ available: !conflict, conflict }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check availability';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
