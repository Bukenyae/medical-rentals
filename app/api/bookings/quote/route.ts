import { NextResponse } from 'next/server';
import { getEventQuote, getStayQuote } from '@/lib/bookings/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kind = body?.kind as 'stay' | 'event' | undefined;

    if (!kind) {
      return NextResponse.json({ error: 'Missing kind' }, { status: 400 });
    }

    if (kind === 'stay') {
      const quote = getStayQuote({
        propertyId: String(body.propertyId || ''),
        checkIn: String(body.checkIn || ''),
        checkOut: String(body.checkOut || ''),
        guestCount: Number(body.guestCount || 1),
        nightlyRateCents: Number(body.nightlyRateCents || 0),
        cleaningFeeCents: Number(body.cleaningFeeCents || 0),
        addonsTotalCents: Number(body.addonsTotalCents || 0),
      });
      return NextResponse.json({ quote }, { status: 200 });
    }

    const quote = getEventQuote({
      propertyId: String(body.propertyId || ''),
      eventType: body.eventType || 'other',
      startAt: String(body.startAt || ''),
      endAt: String(body.endAt || ''),
      guestCount: Number(body.guestCount || 1),
      estimatedVehicles: Number(body.estimatedVehicles || 0),
      hourlyRateCents: Number(body.hourlyRateCents || 0),
      minHours: Number(body.minHours || 4),
      dayRateCents: body.dayRateCents ? Number(body.dayRateCents) : null,
      dayRateHours: Number(body.dayRateHours || 8),
      cleaningFeeCents: Number(body.cleaningFeeCents || 25000),
      depositCents: Number(body.depositCents || 75000),
      addonsTotalCents: Number(body.addonsTotalCents || 0),
      allowInstantBook: !!body.allowInstantBook,
      curfewTime: body.curfewTime ? String(body.curfewTime) : null,
      alcohol: !!body.alcohol,
      amplifiedSound: !!body.amplifiedSound,
    });

    return NextResponse.json({ quote }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid quote payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
