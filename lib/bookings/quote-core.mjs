const HOUR_IN_MS = 1000 * 60 * 60;

function clampCents(value) {
  return Math.max(0, Math.round(value ?? 0));
}

function getDurationHours(startAt, endAt) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.ceil((end - start) / HOUR_IN_MS));
}

function parseDateParts(isoDate) {
  if (!isoDate) return null;
  const [yearStr, monthStr, dayStr] = String(isoDate).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function parseTimeMinutes(timeValue) {
  if (!timeValue) return NaN;
  const [hourStr, minuteStr] = String(timeValue).split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour * 60 + minute;
}

function formatDateKey(dateObj) {
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function enumerateDateRange(startDateIso, endDateIso) {
  const startParts = parseDateParts(startDateIso);
  const endParts = parseDateParts(endDateIso);
  if (!startParts || !endParts) return [];

  const start = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const end = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  const days = [];
  for (let cursor = start; cursor <= end; cursor += 24 * HOUR_IN_MS) {
    days.push(formatDateKey(new Date(cursor)));
  }
  return days;
}

function computeWindowHours(startTime, endTime) {
  const startMinutes = parseTimeMinutes(startTime);
  const endMinutes = parseTimeMinutes(endTime);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return { hours: 0, endsNextDay: false, endMinutes: NaN };
  }

  const spansOvernight = endMinutes <= startMinutes;
  const adjustedEnd = spansOvernight ? endMinutes + 24 * 60 : endMinutes;
  const durationHours = Math.max(0, (adjustedEnd - startMinutes) / 60);
  return {
    hours: durationHours,
    endsNextDay: spansOvernight,
    endMinutes,
  };
}

function buildSessionDays(input) {
  const hasSessionConfig =
    !!input.startDate &&
    !!input.endDate &&
    !!input.globalStartTime &&
    !!input.globalEndTime;

  if (!hasSessionConfig) {
    const durationHours = getDurationHours(input.startAt, input.endAt);
    return {
      days: [
        {
          date: input.startDate || String(input.startAt || '').slice(0, 10),
          startTime: String(input.startAt || '').slice(11, 16),
          endTime: String(input.endAt || '').slice(11, 16),
          durationHours,
          endsNextDay: false,
          endMinutes: Number.isFinite(parseTimeMinutes(String(input.endAt || '').slice(11, 16)))
            ? parseTimeMinutes(String(input.endAt || '').slice(11, 16))
            : NaN,
        },
      ],
      daysCount: 1,
      overnightNights: 0,
    };
  }

  const rangeDays = enumerateDateRange(input.startDate, input.endDate);
  const overrideMap = new Map(
    (input.dayOverrides || []).map((override) => [override.date, override])
  );

  const days = rangeDays.map((dateIso) => {
    const override = overrideMap.get(dateIso);
    const startTime = override?.startTime || input.globalStartTime;
    const endTime = override?.endTime || input.globalEndTime;
    const computed = computeWindowHours(startTime, endTime);

    return {
      date: dateIso,
      startTime,
      endTime,
      durationHours: computed.hours,
      endsNextDay: computed.endsNextDay,
      endMinutes: computed.endMinutes,
    };
  });

  return {
    days,
    daysCount: rangeDays.length || 1,
    overnightNights: rangeDays.length > 1 ? rangeDays.length - 1 : 0,
  };
}

function getEventRiskFlags(input, durationHours, latestSessionEndMinutes) {
  const flags = [];
  const vehicles = input.estimatedVehicles ?? 0;
  const isWedding = input.eventType === 'intimate_wedding';
  const isProduction = input.eventType === 'production';

  const curfewExceeded = (() => {
    if (!input.curfewTime) return false;
    const [h, m] = String(input.curfewTime).split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
    if (!Number.isFinite(latestSessionEndMinutes)) {
      const end = new Date(input.endAt);
      if (!Number.isFinite(end.getTime())) return false;
      return end.getHours() * 60 + end.getMinutes() > h * 60 + m;
    }
    return latestSessionEndMinutes > h * 60 + m;
  })();

  if (input.alcohol) flags.push('ALCOHOL');
  if (input.amplifiedSound) flags.push('AMPLIFIED_SOUND');
  if (vehicles > 8) flags.push('OVER_PARKING');
  if (curfewExceeded) flags.push('LATE_END');
  if (isWedding) flags.push('WEDDING');
  if (isProduction) flags.push('PRODUCTION');
  if (durationHours <= 0) flags.push('INVALID_DURATION');

  return flags;
}

function decideEventMode(input, flags) {
  const basePolicySatisfied =
    !!input.allowInstantBook &&
    input.guestCount <= 12 &&
    !input.alcohol &&
    !input.amplifiedSound &&
    (input.estimatedVehicles ?? 0) <= 8 &&
    input.eventType !== 'intimate_wedding' &&
    input.eventType !== 'production';

  return basePolicySatisfied && flags.length === 0 ? 'instant' : 'request';
}

function normalizeAttendeePricingTiers(tiersInput = []) {
  if (!Array.isArray(tiersInput)) return [];

  return tiersInput
    .map((tier) => ({
      minAttendees: Math.max(1, Number(tier?.minAttendees || 1)),
      maxAttendees: Math.max(1, Number(tier?.maxAttendees || 1)),
      extraHourlyCents: clampCents(tier?.extraHourlyCents || 0),
    }))
    .filter((tier) => Number.isFinite(tier.minAttendees) && Number.isFinite(tier.maxAttendees))
    .sort((a, b) => a.minAttendees - b.minAttendees);
}

function resolveAttendeeTier(attendeePricingTiers, guestCount) {
  const safeGuestCount = Math.max(1, Number(guestCount || 1));
  const tiers = normalizeAttendeePricingTiers(attendeePricingTiers);
  if (tiers.length === 0) {
    return {
      minAttendees: 1,
      maxAttendees: safeGuestCount,
      extraHourlyCents: 0,
      label: `${safeGuestCount} people`,
    };
  }

  const matchedTier = tiers.find(
    (tier) => safeGuestCount >= tier.minAttendees && safeGuestCount <= tier.maxAttendees
  ) || tiers[tiers.length - 1];

  return {
    ...matchedTier,
    label: `${matchedTier.minAttendees}-${matchedTier.maxAttendees} people`,
  };
}

export function computeStayQuote(input) {
  const checkIn = new Date(input.checkIn).getTime();
  const checkOut = new Date(input.checkOut).getTime();
  const nights =
    Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkOut > checkIn
      ? Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)))
      : 1;

  const subtotalCents = clampCents(input.nightlyRateCents) * nights;
  const feesCents = clampCents(input.cleaningFeeCents);
  const addonsTotalCents = clampCents(input.addonsTotalCents);

  return {
    mode: 'instant',
    currency: 'usd',
    subtotalCents,
    feesCents,
    addonsTotalCents,
    depositCents: 0,
    totalCents: subtotalCents + feesCents + addonsTotalCents,
    pricingSnapshot: {
      kind: 'stay',
      nights,
      nightlyRateCents: clampCents(input.nightlyRateCents),
      cleaningFeeCents: feesCents,
    },
    riskFlags: [],
  };
}

export function computeEventQuote(input) {
  const session = buildSessionDays(input);
  const durationHours = session.days.reduce((sum, day) => sum + day.durationHours, 0);
  const minHours = Math.max(1, input.minHours ?? 4);
  const billableHours = Math.max(durationHours, minHours);
  const dayRateHours = Math.max(1, input.dayRateHours ?? 8);
  const hourlyRateCents = clampCents(input.hourlyRateCents);
  const dayRateTotal = input.dayRateCents ? clampCents(input.dayRateCents) : null;
  const attendeeTier = resolveAttendeeTier(input.attendeePricingTiers, input.guestCount);

  const dailyCharges = session.days.map((day) => {
    const dayBillableHours = Math.max(day.durationHours, session.days.length === 1 ? minHours : 0);
    const hourlyTotal = dayBillableHours * hourlyRateCents;
    const subtotal = dayRateTotal !== null && day.durationHours >= dayRateHours ? dayRateTotal : hourlyTotal;
    return {
      ...day,
      dayBillableHours,
      subtotalCents: subtotal,
    };
  });

  const productionSubtotalCents =
    dailyCharges.length > 0
      ? dailyCharges.reduce((sum, day) => sum + day.subtotalCents, 0)
      : billableHours * hourlyRateCents;

  const multiDayDiscountPct = Math.max(0, Number(input.multiDayDiscountPct ?? 0));
  const discountCents =
    session.daysCount > 1 && multiDayDiscountPct > 0
      ? Math.round((productionSubtotalCents * Math.min(90, multiDayDiscountPct)) / 100)
      : 0;

  const subtotalAfterDiscountCents = Math.max(0, productionSubtotalCents - discountCents);

  const attendeeHourlySurchargeCents = clampCents(attendeeTier.extraHourlyCents);
  const attendeeSurchargeCents = attendeeHourlySurchargeCents * billableHours;

  const overnightHoldingPct = Math.max(0, Number(input.overnightHoldingPct ?? 0));
  const averageDailySubtotal =
    session.daysCount > 0
      ? Math.round((subtotalAfterDiscountCents + attendeeSurchargeCents) / session.daysCount)
      : 0;
  const overnightHoldingCents =
    input.overnightHold && session.overnightNights > 0 && overnightHoldingPct > 0
      ? Math.round((averageDailySubtotal * overnightHoldingPct * session.overnightNights) / 100)
      : 0;

  const subtotalCents = subtotalAfterDiscountCents + attendeeSurchargeCents + overnightHoldingCents;

  const feesCents = clampCents(input.cleaningFeeCents ?? 25000);
  const depositCents = clampCents(input.depositCents ?? 75000);
  const addonsTotalCents = clampCents(input.addonsTotalCents);
  const latestSessionEndMinutes = dailyCharges.reduce(
    (max, day) => (Number.isFinite(day.endMinutes) && day.endMinutes > max ? day.endMinutes : max),
    Number.NaN
  );
  const riskFlags = getEventRiskFlags(input, durationHours, latestSessionEndMinutes);

  return {
    mode: decideEventMode(input, riskFlags),
    currency: 'usd',
    subtotalCents,
    feesCents,
    addonsTotalCents,
    depositCents,
    totalCents: subtotalCents + feesCents + addonsTotalCents,
    durationHours,
    pricingSnapshot: {
      kind: 'event',
      eventType: input.eventType,
      durationHours,
      billableHours,
      hourlyRateCents,
      minHours,
      dayRateCents: dayRateTotal,
      dayRateHours,
      sessionDays: dailyCharges.map((day) => ({
        date: day.date,
        startTime: day.startTime,
        endTime: day.endTime,
        durationHours: day.durationHours,
        billableHours: day.dayBillableHours,
        subtotalCents: day.subtotalCents,
      })),
      productionSubtotalCents,
      multiDayDiscountPct,
      multiDayDiscountCents: discountCents,
      attendeeTier,
      attendeeHourlySurchargeCents,
      attendeeSurchargeCents,
      overnightHold: !!input.overnightHold,
      overnightHoldingPct,
      overnightNights: session.overnightNights,
      overnightHoldingCents,
      cleaningFeeCents: feesCents,
      depositCents,
      estimatedVehicles: input.estimatedVehicles ?? 0,
    },
    riskFlags,
  };
}
