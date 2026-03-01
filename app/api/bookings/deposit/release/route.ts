import { NextResponse } from 'next/server';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';
import { releaseDepositHold } from '@/lib/bookings/lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const bookingId = String(body?.bookingId || '');
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, properties!inner(owner_id,created_by)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 400 });
    const property = booking?.properties as { owner_id?: string | null; created_by?: string | null } | null;
    const isOwner = property?.owner_id === user.id || property?.created_by === user.id;
    if (!booking || !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await releaseDepositHold(supabase, bookingId);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to release deposit hold';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
