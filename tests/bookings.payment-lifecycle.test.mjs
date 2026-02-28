import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapIntentStatusToPaymentStatus,
  resolveCaptureBookingStatus,
  shouldCreateReplacementIntent,
} from '../lib/bookings/payment-lifecycle-core.mjs';

test('shouldCreateReplacementIntent returns false for reusable intent', () => {
  const reusable = shouldCreateReplacementIntent(
    { status: 'requires_payment_method', amount: 10000, currency: 'usd' },
    10000,
    'usd'
  );

  assert.equal(reusable, false);
});

test('shouldCreateReplacementIntent returns true for cancelled intent', () => {
  const replace = shouldCreateReplacementIntent(
    { status: 'canceled', amount: 10000, currency: 'usd' },
    10000,
    'usd'
  );

  assert.equal(replace, true);
});

test('resolveCaptureBookingStatus requires deposit authorization before confirmed', () => {
  assert.equal(resolveCaptureBookingStatus(true, 'requires_capture'), 'confirmed');
  assert.equal(resolveCaptureBookingStatus(true, 'requires_payment_method'), 'paid');
  assert.equal(resolveCaptureBookingStatus(false, null), 'confirmed');
});

test('mapIntentStatusToPaymentStatus normalizes status values', () => {
  assert.equal(mapIntentStatusToPaymentStatus('requires_action'), 'requires_action');
  assert.equal(mapIntentStatusToPaymentStatus('succeeded'), 'succeeded');
  assert.equal(mapIntentStatusToPaymentStatus('canceled'), 'cancelled');
});
