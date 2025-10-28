import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

async function getSupabaseWithAuth(req: Request) {
  const cookieClient = createServerSupabase();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();

  if (cookieUser) {
    return { supabase: cookieClient, user: cookieUser } as const;
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (token) {
    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient.auth.getUser(token);
    if (!error && data?.user) {
      return { supabase: serviceClient, user: data.user } as const;
    }
  }

  return { supabase: cookieClient, user: null } as const;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getSupabaseWithAuth(req);
    const {
      propertyId,
      propertyTitle,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      guestDetails,
      specialRequests,
    } = await req.json();

    // Auth check
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Normalize and validate inputs
    const toIsoDate = (v: string | null | undefined) => {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      // Normalize to UTC date (yyyy-mm-dd) so it matches Supabase date column
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        .toISOString()
        .slice(0, 10);
      return iso;
    };

    const normalizedCheckIn = toIsoDate(checkIn);
    const normalizedCheckOut = toIsoDate(checkOut);

    const missing: string[] = [];
    if (!propertyId && !propertyTitle) missing.push('propertyId or propertyTitle');
    if (!normalizedCheckIn) missing.push('checkIn');
    if (!normalizedCheckOut) missing.push('checkOut');
    if (guests === null || guests === undefined) missing.push('guests');
    if (totalAmount === null || totalAmount === undefined) missing.push('totalAmount');

    if (missing.length > 0) {
      console.warn('create-draft validation failed: missing fields', { missing, payload: { propertyId, propertyTitle, checkIn, checkOut, guests, totalAmount } });
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    // Additional constraints
    if (typeof guests !== 'number' || guests < 1) {
      return NextResponse.json({ error: 'Invalid guests value (must be >= 1)' }, { status: 400 });
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      return NextResponse.json({ error: 'Invalid totalAmount value (must be >= 0)' }, { status: 400 });
    }

    // Resolve property UUID if propertyId is not a valid UUID
    let resolvedPropertyId: string | null = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (propertyId && uuidRegex.test(propertyId)) {
      resolvedPropertyId = propertyId;
    } else if (propertyTitle) {
      const { data: prop } = await supabase
        .from('properties')
        .select('id')
        .ilike('title', propertyTitle)
        .limit(1)
        .maybeSingle();
      if (prop?.id) resolvedPropertyId = prop.id as string;
    }

    if (!resolvedPropertyId) {
      return NextResponse.json({ error: 'Could not resolve property to a valid UUID' }, { status: 400 });
    }

    // Insert booking with pending status; conflicts checked via DB trigger
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        property_id: resolvedPropertyId,
        guest_id: user.id,
        check_in: normalizedCheckIn,
        check_out: normalizedCheckOut,
        guest_count: guests,
        total_amount: totalAmount,
        status: 'pending',
        guest_details: guestDetails ?? null,
        special_requests: specialRequests ?? null,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ bookingId: data.id }, { status: 200 });
  } catch (err: any) {
    console.error('Error creating booking draft:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

