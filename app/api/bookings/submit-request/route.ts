import { NextResponse } from 'next/server';
import { submitBookingRequest } from '@/lib/bookings/lifecycle';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body?.bookingId || !body?.quote || !body?.kind) {
      return NextResponse.json({ error: 'Missing bookingId, kind, or quote' }, { status: 400 });
    }

    const { data: owned } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', body.bookingId)
      .eq('guest_id', user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = await submitBookingRequest(
      supabase,
      String(body.bookingId),
      body.quote,
      body.kind === 'event' ? 'event' : 'stay'
    );

    return NextResponse.json({ booking }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
