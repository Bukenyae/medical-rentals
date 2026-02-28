import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSubmissionOutcome } from '../lib/bookings/submission-core.mjs';

test('event booking is forced to request mode when high-risk flags exist', () => {
  const result = resolveSubmissionOutcome('event', 'instant', ['ALCOHOL', 'OVER_PARKING']);

  assert.equal(result.mode, 'request');
  assert.equal(result.status, 'requested');
  assert.equal(result.blocksCalendar, true);
  assert.equal(result.requiresRequest, true);
});

test('event booking keeps instant mode when no blocking flags exist', () => {
  const result = resolveSubmissionOutcome('event', 'instant', []);

  assert.equal(result.mode, 'instant');
  assert.equal(result.status, 'awaiting_payment');
  assert.equal(result.blocksCalendar, true);
  assert.equal(result.requiresRequest, false);
});

test('stay booking always resolves to instant + awaiting payment', () => {
  const result = resolveSubmissionOutcome('stay', 'request', ['WEDDING']);

  assert.equal(result.mode, 'instant');
  assert.equal(result.status, 'awaiting_payment');
  assert.equal(result.blocksCalendar, true);
});
