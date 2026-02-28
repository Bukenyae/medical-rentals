'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import AuthGate from '@/components/portal/AuthGate';
import { toCurrency } from '@/lib/pricing';

type PaymentSession = {
  paymentId: string;
  purpose: 'booking_total' | 'deposit_hold';
  captureMethod: 'automatic' | 'manual';
  amountCents: number;
  currency: string;
  status: string;
  intentStatus: string;
  clientSecret: string | null;
  paymentIntentId: string;
};

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function SessionPayForm({
  bookingId,
  session,
  onDone,
}: {
  bookingId: string;
  session: PaymentSession;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!stripe || !elements || !session.clientSecret) return;
    setBusy(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card element not available');
      setBusy(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      session.clientSecret,
      { payment_method: { card } }
    );

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setBusy(false);
      return;
    }

    if (session.purpose === 'booking_total' && paymentIntent?.status === 'succeeded') {
      await fetch('/api/bookings/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
    }

    onDone();
    setBusy(false);
  }

  const purposeLabel = session.purpose === 'deposit_hold' ? 'Deposit authorization hold' : 'Booking total';

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{purposeLabel}</p>
        <span className="text-sm font-medium text-gray-700">
          {toCurrency(session.amountCents / 100, session.currency.toUpperCase())}
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">Intent status: {session.intentStatus}</p>
      {session.intentStatus === 'requires_capture' ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Authorized. Hold is active.</p>
      ) : session.intentStatus === 'succeeded' ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Paid successfully.</p>
      ) : (
        <>
          <div className="rounded-md border border-gray-300 p-3">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || !stripe || !elements || !session.clientSecret}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Processing...' : session.purpose === 'deposit_hold' ? 'Authorize hold' : 'Pay now'}
          </button>
        </>
      )}
    </div>
  );
}

export default function GuestPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PaymentSession[]>([]);

  const bookingId = searchParams?.get('booking') || '';

  const loadSessions = useCallback(async () => {
    if (!bookingId) {
      setError('Missing booking reference');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/payment-session?bookingId=${encodeURIComponent(bookingId)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || 'Unable to load payment session');
      setLoading(false);
      return;
    }

    setSessions((json.sessions || []) as PaymentSession[]);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const actionable = useMemo(
    () => sessions.filter((s) => ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(s.intentStatus)),
    [sessions]
  );

  return (
    <AuthGate allowRoles={['guest']}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Complete Event Payment</h1>
          <Link href={bookingId ? `/portal/guest?booking=${encodeURIComponent(bookingId)}` : '/portal/guest'} className="text-sm text-blue-700 underline">Back to portal</Link>
        </div>

        {loading && <p className="text-sm text-gray-600">Loading payment session...</p>}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">No pending payments for this booking.</div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <Elements stripe={stripePromise} options={{ appearance: { theme: 'stripe' as const } }}>
            <div className="space-y-4">
              {sessions.map((session) => (
                <SessionPayForm key={session.paymentId} bookingId={bookingId} session={session} onDone={() => void loadSessions()} />
              ))}

              {actionable.length === 0 && (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  All required payment steps are complete.
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push(`/portal/guest/confirmation?booking=${encodeURIComponent(bookingId)}`)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                View booking status
              </button>
            </div>
          </Elements>
        )}
      </div>
    </AuthGate>
  );
}
