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
      startDate: body.startDate ? String(body.startDate) : undefined,
      endDate: body.endDate ? String(body.endDate) : undefined,
      globalStartTime: body.globalStartTime ? String(body.globalStartTime) : undefined,
      globalEndTime: body.globalEndTime ? String(body.globalEndTime) : undefined,
      dayOverrides: Array.isArray(body.dayOverrides)
        ? body.dayOverrides
            .map((override: unknown) => {
              const item = typeof override === 'object' && override !== null ? (override as Record<string, unknown>) : {};
              return {
                date: String(item.date || ''),
                startTime: String(item.startTime || ''),
                endTime: String(item.endTime || ''),
              };
            })
            .filter((override: { date: string; startTime: string; endTime: string }) => override.date && override.startTime && override.endTime)
        : undefined,
      overnightHold: !!body.overnightHold,
      overnightHoldingPct: Number(body.overnightHoldingPct || 0),
      multiDayDiscountPct: Number(body.multiDayDiscountPct || 0),
      guestCount: Number(body.guestCount || 1),
      estimatedVehicles: Number(body.estimatedVehicles || 0),
      hourlyRateCents: Number(body.hourlyRateCents || 0),
      attendeePricingTiers: Array.isArray(body.attendeePricingTiers)
        ? body.attendeePricingTiers
            .map((tier: unknown) => {
              const item = typeof tier === 'object' && tier !== null ? (tier as Record<string, unknown>) : {};
              return {
                minAttendees: Number(item.minAttendees || 1),
                maxAttendees: Number(item.maxAttendees || 1),
                extraHourlyCents: Number(item.extraHourlyCents || 0),
              };
            })
            .filter((tier: { minAttendees: number; maxAttendees: number }) => Number.isFinite(tier.minAttendees) && Number.isFinite(tier.maxAttendees))
        : undefined,
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
