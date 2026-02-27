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

function getEventRiskFlags(input, durationHours) {
  const flags = [];
  const vehicles = input.estimatedVehicles ?? 0;
  const isWedding = input.eventType === 'intimate_wedding';
  const isProduction = input.eventType === 'production';

  const curfewExceeded = (() => {
    if (!input.curfewTime) return false;
    const end = new Date(input.endAt);
    if (!Number.isFinite(end.getTime())) return false;
    const [h, m] = String(input.curfewTime).split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
    return end.getHours() * 60 + end.getMinutes() > h * 60 + m;
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
  const durationHours = getDurationHours(input.startAt, input.endAt);
  const minHours = Math.max(1, input.minHours ?? 4);
  const billableHours = Math.max(durationHours, minHours);
  const dayRateHours = Math.max(1, input.dayRateHours ?? 8);
  const hourlyTotal = billableHours * clampCents(input.hourlyRateCents);
  const dayRateTotal = input.dayRateCents ? clampCents(input.dayRateCents) : null;

  const subtotalCents =
    dayRateTotal !== null && durationHours >= dayRateHours ? dayRateTotal : hourlyTotal;

  const feesCents = clampCents(input.cleaningFeeCents ?? 25000);
  const depositCents = clampCents(input.depositCents ?? 75000);
  const addonsTotalCents = clampCents(input.addonsTotalCents);
  const riskFlags = getEventRiskFlags(input, durationHours);

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
      hourlyRateCents: clampCents(input.hourlyRateCents),
      minHours,
      dayRateCents: dayRateTotal,
      dayRateHours,
      cleaningFeeCents: feesCents,
      depositCents,
      estimatedVehicles: input.estimatedVehicles ?? 0,
    },
    riskFlags,
  };
}
