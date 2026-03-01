export function selectLatestPaymentByPurpose(payments, purpose) {
  return (payments || []).find((payment) => payment.purpose === purpose) || null;
}

export function shouldCreateReplacementIntent(existingIntent, expectedAmountCents, currency) {
  if (!existingIntent) return true;
  if (existingIntent.status === 'canceled') return true;
  if (Number(existingIntent.amount || 0) !== Number(expectedAmountCents)) return true;
  return String(existingIntent.currency || '').toLowerCase() !== String(currency || '').toLowerCase();
}

export function mapIntentStatusToPaymentStatus(intentStatus) {
  if (intentStatus === 'succeeded') return 'succeeded';
  if (intentStatus === 'requires_action' || intentStatus === 'requires_confirmation') {
    return 'requires_action';
  }
  if (intentStatus === 'canceled') return 'cancelled';
  if (intentStatus === 'failed') return 'failed';
  return 'pending';
}

export function resolveCaptureBookingStatus(hasDepositHold, depositIntentStatus) {
  if (!hasDepositHold) return 'confirmed';
  if (depositIntentStatus === 'requires_capture' || depositIntentStatus === 'succeeded') {
    return 'confirmed';
  }
  return 'paid';
}
