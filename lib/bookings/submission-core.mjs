export const BLOCKING_STATUSES = new Set([
  'requested',
  'approved',
  'awaiting_payment',
  'paid',
  'confirmed',
  'in_progress',
]);

export const REQUEST_FLAG_CODES = new Set([
  'ALCOHOL',
  'AMPLIFIED_SOUND',
  'LATE_END',
  'OVER_PARKING',
  'PRODUCTION',
  'WEDDING',
]);

export function resolveSubmissionOutcome(kind, quoteMode, riskFlags) {
  const requiresRequest = riskFlags.some((flag) => REQUEST_FLAG_CODES.has(flag));
  const mode = kind === 'event' ? (requiresRequest ? 'request' : quoteMode) : 'instant';
  const status = mode === 'instant' ? 'awaiting_payment' : 'requested';
  return {
    mode,
    status,
    blocksCalendar: BLOCKING_STATUSES.has(status),
    requiresRequest,
  };
}
