'use client';

import { useEffect, useState } from 'react';

type EventRequest = {
  id: string;
  start_at: string;
  end_at: string;
  guest_count: number;
  total_cents: number;
  event_booking_details?: {
    event_type?: string;
    estimated_vehicle_count?: number;
    alcohol?: boolean;
    amplified_sound?: boolean;
    event_description?: string;
  }[];
  booking_risk_flags?: { flag_code: string }[];
  properties?: { title?: string } | null;
};

export default function EventBookingQueue() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setError(null);
      const res = await fetch('/api/bookings/event-requests', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to load event requests');
      setRequests(json.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load event requests');
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function runAction(bookingId: string, action: 'approve' | 'decline' | 'request_info') {
    try {
      setBusyId(bookingId);
      if (action === 'approve') {
        const res = await fetch('/api/bookings/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Unable to approve request');
      } else {
        const res = await fetch('/api/bookings/event-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            action,
            note: action === 'request_info' ? 'Please share vendor COI and setup timeline.' : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Unable to update request');
      }
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update request');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Requested Event Bookings</h3>
        <button onClick={() => void loadRequests()} className="text-sm text-gray-600 underline">Refresh</button>
      </div>

      {error && <p className="mb-3 rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      {requests.length === 0 && <p className="text-sm text-gray-500">No requested event bookings right now.</p>}

      <div className="space-y-3">
        {requests.map((request) => {
          const details = request.event_booking_details?.[0];
          const flags = request.booking_risk_flags?.map((f) => f.flag_code).join(', ') || 'None';
          return (
            <article key={request.id} className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{request.properties?.title || 'Property'} · {details?.event_type || 'event'}</p>
              <p className="text-xs text-gray-600">{new Date(request.start_at).toLocaleString()} - {new Date(request.end_at).toLocaleString()}</p>
              <p className="mt-1 text-sm text-gray-700">Guests: {request.guest_count} · Vehicles: {details?.estimated_vehicle_count || 0} · Total: ${(request.total_cents / 100).toFixed(2)}</p>
              <p className="text-sm text-gray-700">Risk flags: {flags}</p>
              {details?.event_description && <p className="mt-1 text-sm text-gray-600">{details.event_description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busyId === request.id} onClick={() => void runAction(request.id, 'approve')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Approve</button>
                <button disabled={busyId === request.id} onClick={() => void runAction(request.id, 'decline')} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Decline</button>
                <button disabled={busyId === request.id} onClick={() => void runAction(request.id, 'request_info')} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-60">Request info</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
