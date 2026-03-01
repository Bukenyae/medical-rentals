import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStayQuote, computeEventQuote } from '../lib/bookings/quote-core.mjs';

test('stay quote computes nightly + cleaning + addons', () => {
  const quote = computeStayQuote({
    propertyId: 'p1',
    checkIn: '2026-03-10',
    checkOut: '2026-03-13',
    guestCount: 2,
    nightlyRateCents: 12000,
    cleaningFeeCents: 4500,
    addonsTotalCents: 1500,
  });

  assert.equal(quote.subtotalCents, 36000);
  assert.equal(quote.feesCents, 4500);
  assert.equal(quote.addonsTotalCents, 1500);
  assert.equal(quote.totalCents, 42000);
  assert.equal(quote.mode, 'instant');
});

test('event quote forces request mode when risk flags are present', () => {
  const quote = computeEventQuote({
    propertyId: 'p1',
    eventType: 'production',
    startAt: '2026-03-12T17:00:00',
    endAt: '2026-03-12T22:30:00',
    guestCount: 40,
    estimatedVehicles: 12,
    hourlyRateCents: 20000,
    minHours: 4,
    dayRateHours: 8,
    cleaningFeeCents: 25000,
    depositCents: 75000,
    addonsTotalCents: 0,
    allowInstantBook: true,
    curfewTime: '22:00',
    alcohol: true,
    amplifiedSound: true,
  });

  assert.equal(quote.mode, 'request');
  assert.ok(quote.riskFlags.includes('PRODUCTION'));
  assert.ok(quote.riskFlags.includes('OVER_PARKING'));
  assert.ok(quote.riskFlags.includes('ALCOHOL'));
  assert.ok(quote.riskFlags.includes('AMPLIFIED_SOUND'));
  assert.ok(quote.riskFlags.includes('LATE_END'));
});

test('event quote allows instant when all policy checks pass', () => {
  const quote = computeEventQuote({
    propertyId: 'p1',
    eventType: 'corporate',
    startAt: '2026-03-12T13:00:00',
    endAt: '2026-03-12T17:00:00',
    guestCount: 10,
    estimatedVehicles: 4,
    hourlyRateCents: 18000,
    minHours: 4,
    dayRateHours: 8,
    cleaningFeeCents: 25000,
    depositCents: 75000,
    addonsTotalCents: 10000,
    allowInstantBook: true,
    curfewTime: '22:00',
    alcohol: false,
    amplifiedSound: false,
  });

  assert.equal(quote.mode, 'instant');
  assert.equal(quote.riskFlags.length, 0);
  assert.equal(quote.subtotalCents, 72000);
  assert.equal(quote.totalCents, 107000);
});
