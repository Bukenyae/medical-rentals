import { NextResponse } from 'next/server';
import { handlePaymentSessionGet } from '@/lib/bookings/route-core/payment-session.mjs';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';
import { requireStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const response = await handlePaymentSessionGet(req, {
    getSupabaseWithAuth,
    requireStripe,
  });
  return NextResponse.json(response.body, { status: response.status });
}
