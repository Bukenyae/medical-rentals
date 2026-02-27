import { NextResponse } from 'next/server';
import { createDraftBooking } from '@/lib/bookings/lifecycle';
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
    const booking = await createDraftBooking(supabase, user.id, {
      propertyId: String(body.propertyId || ''),
      kind: body.kind === 'event' ? 'event' : 'stay',
      guestCount: Number(body.guestCount || 1),
      startAt: String(body.startAt || ''),
      endAt: String(body.endAt || ''),
      mode: body.mode === 'instant' ? 'instant' : 'request',
      quote: body.quote,
      eventDetails: body.eventDetails || undefined,
      stayDetails: body.stayDetails || undefined,
    });

    return NextResponse.json({ booking }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
