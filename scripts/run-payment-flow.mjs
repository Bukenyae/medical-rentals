import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    const rawValue = rest.join('=').trim();
    const withoutComment = rawValue.split('#')[0]?.trim() ?? '';
    const cleaned = withoutComment.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    if (!(key in process.env)) {
      process.env[key] = cleaned;
    }
  }
}

loadEnv();

const env = process.env;
const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration. Ensure .env.local is populated.');
}

const log = (...args) => console.log('[FLOW]', ...args);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureTestUser(adminClient) {
  const email = 'test.booker@example.com';
  const password = 'TestUser123!';

  const { data: existingList, error: listError } = await adminClient.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) {
    throw listError;
  }
  const match = existingList.users.find((user) => user.email === email);
  if (match) {
    return { email, password };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    throw error;
  }
  log('Created test user', data.user?.id);
  return { email, password };
}

async function signIn(email, password) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw error || new Error('Failed to sign in');
  }
  return data.session;
}

async function fetchProperty(adminClient) {
  const { data, error } = await adminClient
    .from('properties')
    .select('id,title,base_price')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('No properties found. Seed a property first.');
  return data;
}

async function callCreateDraft(session, property) {
  const today = new Date();
  const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
    .toISOString()
    .slice(0, 10);
  const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)
    .toISOString()
    .slice(0, 10);

  const payload = {
    propertyId: property.id,
    checkIn,
    checkOut,
    guests: 1,
    totalAmount: Number(property.base_price ?? 150),
  };

  const cookieHeader = `sb-access-token=${encodeURIComponent(session.access_token)}; sb-refresh-token=${encodeURIComponent(session.refresh_token)}`;
  const authHeader = `Bearer ${session.access_token}`;
  const res = await fetch(`${siteUrl}/api/bookings/create-draft`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      authorization: authHeader,
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (parseErr) {
    json = null;
  }
  if (!res.ok) {
    throw new Error(`Draft creation failed (${res.status}): ${json?.error ?? text ?? res.statusText}`);
  }
  if (!json?.bookingId) {
    throw new Error(`Draft creation response missing bookingId: ${text}`);
  }
  log('Draft booking created', json.bookingId);
  return { bookingId: json.bookingId, payload };
}

async function callCreatePaymentIntent(session, bookingId, amountCents) {
  const cookieHeader = `sb-access-token=${encodeURIComponent(session.access_token)}; sb-refresh-token=${encodeURIComponent(session.refresh_token)}`;
  const authHeader = `Bearer ${session.access_token}`;
  const res = await fetch(`${siteUrl}/api/stripe/create-payment-intent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      authorization: authHeader,
      accept: 'application/json',
    },
    body: JSON.stringify({
      bookingId,
      amount: amountCents,
      currency: 'usd',
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (parseErr) {
    json = null;
  }
  if (!res.ok) {
    throw new Error(`Payment intent creation failed (${res.status}): ${json?.error ?? text ?? res.statusText}`);
  }
  if (!json?.paymentIntentId) {
    throw new Error(`Payment intent response missing id: ${text}`);
  }
  log('PaymentIntent created', json.paymentIntentId);
  return json;
}

async function fetchBooking(adminClient, bookingId) {
  const { data, error } = await adminClient
    .from('bookings')
    .select('id,status,total_amount,payment_intent_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function waitForBookingCompletion(adminClient, bookingId, { timeoutMs = 60000, intervalMs = 2000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const record = await fetchBooking(adminClient, bookingId);
    if (!record) {
      throw new Error('Booking record disappeared while waiting for completion');
    }
    if (record.status && record.status !== 'pending') {
      return record;
    }
    await delay(intervalMs);
  }
  throw new Error('Timed out waiting for booking to complete. Check Stripe dashboard and webhooks.');
}

async function main() {
  log('Starting payment flow exercise');
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { email, password } = await ensureTestUser(adminClient);
  const property = await fetchProperty(adminClient);
  log('Using property', property.id, property.title);

  const session = await signIn(email, password);
  log('Signed in test user', session.user.id);

  const { bookingId, payload } = await callCreateDraft(session, property);
  const draftRecord = await fetchBooking(adminClient, bookingId);
  log('Draft status', draftRecord?.status, draftRecord?.total_amount);

  const amountCents = Math.round(payload.totalAmount * 100);
  const paymentIntent = await callCreatePaymentIntent(session, bookingId, amountCents);
  log('Client secret', paymentIntent.clientSecret);

  log('\nTo confirm payment via Stripe CLI, run:');
  console.log(`stripe payment_intents confirm ${paymentIntent.paymentIntentId} --payment-method pm_card_visa`);
  log('Waiting for booking status to update (confirm via Stripe CLI now)...');
  const updated = await waitForBookingCompletion(adminClient, bookingId);
  log('Post-confirm booking status', updated?.status, updated?.payment_intent_id);

  log('Flow complete.');
}

main().catch((err) => {
  console.error('[FLOW] Error', err);
  process.exit(1);
});
