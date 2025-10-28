'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthGate from '@/components/portal/AuthGate';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { toCurrency } from '@/lib/pricing';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface BookingRecord {
  id: string;
  status: string | null;
  total_amount: number | null;
  check_in: string | null;
  check_out: string | null;
  guest_count: number | null;
  property_id: string | null;
  properties?: {
    title?: string | null;
    address?: string | null;
    cover_image_url?: string | null;
  } | null;
}

const STATUS_META: Record<
  string,
  {
    label: string;
    tone: string;
    badge: string;
    description: string;
    Icon: typeof CheckCircleIcon;
  }
> = {
  confirmed: {
    label: 'Booking confirmed',
    tone: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    description: 'Your reservation is confirmed. We\'ve emailed the stay details and added them to your guest portal.',
    Icon: CheckCircleIcon,
  },
  pending: {
    label: 'Awaiting confirmation',
    tone: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    description: 'Stripe is finishing the payment confirmation. This page will refresh automatically once complete.',
    Icon: ClockIcon,
  },
  cancelled: {
    label: 'Payment failed',
    tone: 'text-red-600',
    badge: 'bg-red-100 text-red-800',
    description: 'The payment did not complete. You can retry from the guest portal or contact support for assistance.',
    Icon: XCircleIcon,
  },
};

const DEFAULT_STATUS = {
  label: 'Processing booking',
  tone: 'text-gray-700',
  badge: 'bg-gray-100 text-gray-800',
  description: 'We\'re processing your booking details. This page will refresh once everything is ready.',
  Icon: ClockIcon,
};

export default function GuestConfirmationPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams?.get('booking') ?? null;
  const statusKey = (booking?.status ?? 'pending').toLowerCase();
  const statusMeta = STATUS_META[statusKey] ?? DEFAULT_STATUS;

  useEffect(() => {
    if (!bookingId) {
      setError('Missing booking reference. Return to the guest portal to view your stays.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchBooking = async () => {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(
          `id,status,total_amount,check_in,check_out,guest_count,property_id,
           properties:properties(title,address,cover_image_url)`
        )
        .eq('id', bookingId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        console.error('[confirmation] failed to load booking', fetchError);
        setError('Unable to load your booking. Try refreshing or return to the guest portal.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Booking not found.');
        setLoading(false);
        return;
      }

      setBooking(data as BookingRecord);
      setLoading(false);

      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('booking:last', data.id);
        }
      } catch {/* ignore */}
    };

    fetchBooking();

    const channel = supabase
      .channel(`booking-confirmation-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          setBooking((prev) => {
            const next = payload.new as Partial<BookingRecord>;
            if (!prev) {
              return { ...(next as BookingRecord) };
            }
            return {
              ...prev,
              ...next,
              properties: prev.properties,
            };
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId, supabase]);

  return (
    <AuthGate allowRoles={['guest']} showInlineSignOut={false}>
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col">
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="mb-6">
              <button
                type="button"
                onClick={() => router.push(booking ? `/portal/guest?booking=${booking.id}` : '/portal/guest')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#8B1A1A] hover:text-[#601111]"
              >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                Back to guest portal
              </button>
            </div>

            <div className="rounded-3xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 sm:px-8 py-8">
                <div className="flex items-start gap-4">
                  <statusMeta.Icon className={`h-10 w-10 flex-shrink-0 ${statusMeta.tone}`} aria-hidden />
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-wide ${statusMeta.tone}`}>
                      {statusMeta.label}
                    </p>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">Thank you for reserving with Belle Rouge Properties</h1>
                    <p className="mt-3 text-sm text-gray-600">{statusMeta.description}</p>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {loading && !error && (
                  <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Checking Stripe for the latest payment status…
                  </div>
                )}

                {!loading && !error && booking && (
                  <div className="mt-8 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Stay details</h2>
                        <dl className="mt-3 space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between">
                            <dt>Check-in</dt>
                            <dd className="font-medium text-gray-900">{booking.check_in || 'TBD'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Check-out</dt>
                            <dd className="font-medium text-gray-900">{booking.check_out || 'TBD'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Guests</dt>
                            <dd className="font-medium text-gray-900">{booking.guest_count ?? '—'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Total</dt>
                            <dd className="font-semibold text-gray-900">
                              {typeof booking.total_amount === 'number'
                                ? toCurrency(booking.total_amount)
                                : '—'}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Status</dt>
                            <dd>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusMeta.badge}`}>
                                <span className="block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                                {statusMeta.label}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <h2 className="text-lg font-semibold text-gray-900">Booking reference</h2>
                        <p className="mt-2 text-sm text-gray-600">
                          Keep this reference for your records. You can always revisit it from the guest portal.
                        </p>
                        <code className="mt-3 block truncate rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-900 border border-gray-200">
                          {booking.id}
                        </code>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Your stay</h2>
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.properties?.title ? `You\'ll be staying at ${booking.properties.title}.` : 'We\'ll share the full property details in your welcome email.'}
                        </p>
                        {booking.properties?.address && (
                          <p className="mt-1 text-sm text-gray-600">{booking.properties.address}</p>
                        )}
                      </div>

                      <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-gray-100">
                        <Image
                          src={booking.properties?.cover_image_url || '/images/properties/Leighton/living-room.jpg'}
                          alt={booking.properties?.title ? `${booking.properties.title} hero image` : 'Property preview'}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={booking ? `/portal/guest?booking=${booking.id}` : '/portal/guest'}
                        className="inline-flex items-center justify-center rounded-xl bg-[#8B1A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#751414] transition"
                      >
                        Open guest portal
                      </Link>
                      <Link
                        href={booking ? `/portal/guest/confirmation?booking=${booking.id}` : '#'}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                      >
                        Refresh status
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGate>
  );
}
