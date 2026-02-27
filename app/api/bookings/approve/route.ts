import { NextResponse } from 'next/server';
import { approveBooking } from '@/lib/bookings/lifecycle';
import { handleApproveBookingPost } from '@/lib/bookings/route-core/approve.mjs';
import { getSupabaseWithAuth } from '@/lib/supabase/authenticated';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const response = await handleApproveBookingPost(req, {
    getSupabaseWithAuth,
    approveBooking,
  });
  return NextResponse.json(response.body, { status: response.status });
}
