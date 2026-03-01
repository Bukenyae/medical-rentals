import { NextResponse } from 'next/server';
import { capturePayment } from '@/lib/bookings/lifecycle';
import { handleCaptureBookingPost } from '@/lib/bookings/route-core/capture.mjs';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const response = await handleCaptureBookingPost(req, {
    getSupabaseWithAuth,
    capturePayment,
  });
  return NextResponse.json(response.body, { status: response.status });
}
