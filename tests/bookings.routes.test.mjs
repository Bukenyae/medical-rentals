import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApproveBookingPost } from '../lib/bookings/route-core/approve.mjs';
import { handleCaptureBookingPost } from '../lib/bookings/route-core/capture.mjs';
import { handlePaymentSessionGet } from '../lib/bookings/route-core/payment-session.mjs';

function createRequest(body = {}, url = 'http://localhost/api?bookingId=b1') {
  return {
    url,
    async json() {
      return body;
    },
  };
}

function createSupabaseMock({ booking, payments = [], bookingError = null, paymentsError = null }) {
  return {
    updates: [],
    from(table) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: booking, error: bookingError };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'payments') {
        const ctx = this;
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      async order() {
                        return { data: payments, error: paymentsError };
                      },
                    };
                  },
                };
              },
            };
          },
          update(payload) {
            return {
              async eq(_col, id) {
                ctx.updates.push({ id, payload });
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test('approve route returns forbidden when user does not own booking property', async () => {
  const supabase = createSupabaseMock({
    booking: { id: 'b1', properties: { owner_id: 'owner-1', created_by: null } },
  });

  const response = await handleApproveBookingPost(createRequest({ bookingId: 'b1' }), {
    getSupabaseWithAuth: async () => ({ supabase, user: { id: 'guest-1' } }),
    approveBooking: async () => ({ ok: true }),
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'Forbidden');
});

test('approve route returns success for owner', async () => {
  const supabase = createSupabaseMock({
    booking: { id: 'b1', properties: { owner_id: 'owner-1', created_by: null } },
  });

  const response = await handleApproveBookingPost(createRequest({ bookingId: 'b1' }), {
    getSupabaseWithAuth: async () => ({ supabase, user: { id: 'owner-1' } }),
    approveBooking: async (_client, bookingId) => ({ bookingId, paymentIntentId: 'pi_1' }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.result.bookingId, 'b1');
});

test('capture route returns forbidden for non-booking guest', async () => {
  const supabase = createSupabaseMock({ booking: { id: 'b1', guest_id: 'guest-2' } });

  const response = await handleCaptureBookingPost(createRequest({ bookingId: 'b1' }), {
    getSupabaseWithAuth: async () => ({ supabase, user: { id: 'guest-1' } }),
    capturePayment: async () => ({ ok: true }),
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'Forbidden');
});

test('capture route returns success for booking guest', async () => {
  const supabase = createSupabaseMock({ booking: { id: 'b1', guest_id: 'guest-1' } });

  const response = await handleCaptureBookingPost(createRequest({ bookingId: 'b1' }), {
    getSupabaseWithAuth: async () => ({ supabase, user: { id: 'guest-1' } }),
    capturePayment: async (_client, bookingId) => ({ bookingId, status: 'succeeded' }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.result.bookingId, 'b1');
});

test('payment-session route maps stripe statuses and persists changes', async () => {
  const supabase = createSupabaseMock({
    booking: { id: 'b1', guest_id: 'guest-1', status: 'awaiting_payment', total_cents: 10000, deposit_cents: 5000, currency: 'usd' },
    payments: [
      {
        id: 'pay_1',
        stripe_payment_intent_id: 'pi_pay_1',
        amount_cents: 10000,
        currency: 'usd',
        status: 'pending',
        purpose: 'booking_total',
        capture_method: 'automatic',
      },
      {
        id: 'pay_2',
        stripe_payment_intent_id: 'pi_pay_2',
        amount_cents: 5000,
        currency: 'usd',
        status: 'pending',
        purpose: 'deposit_hold',
        capture_method: 'manual',
      },
    ],
  });

  const stripe = {
    paymentIntents: {
      async retrieve(intentId) {
        if (intentId === 'pi_pay_1') {
          return { id: 'pi_pay_1', status: 'succeeded', client_secret: 'sec_1' };
        }
        return { id: 'pi_pay_2', status: 'requires_action', client_secret: 'sec_2' };
      },
    },
  };

  const response = await handlePaymentSessionGet(createRequest({}, 'http://localhost/api/bookings/payment-session?bookingId=b1'), {
    getSupabaseWithAuth: async () => ({ supabase, user: { id: 'guest-1' } }),
    requireStripe: () => stripe,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.sessions.length, 2);
  assert.deepEqual(
    response.body.sessions.map((s) => s.status),
    ['succeeded', 'requires_action']
  );
  assert.deepEqual(supabase.updates, [
    { id: 'pay_1', payload: { status: 'succeeded' } },
    { id: 'pay_2', payload: { status: 'requires_action' } },
  ]);
});
