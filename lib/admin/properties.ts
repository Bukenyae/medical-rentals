import { addDays, startOfDay } from 'date-fns';
import { formatCurrency, parseTimestamp } from '@/lib/admin/shared';

type PropertyRow = {
  id: string;
  title: string;
  status?: string | null;
  is_active?: boolean | null;
  max_stay_guests?: number | null;
  max_event_guests?: number | null;
  event_hourly_from_cents?: number | null;
};

type BookingRow = {
  id: string;
  property_id: string;
  kind: string;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  total_amount?: number | null;
  booking_financials?: { total_charged?: number | null; platform_revenue?: number | null } | { total_charged?: number | null; platform_revenue?: number | null }[] | null;
};

function bookingWindow(booking: BookingRow) {
  const start = parseTimestamp(booking.start_at) ?? parseTimestamp(booking.check_in);
  const end = parseTimestamp(booking.end_at) ?? parseTimestamp(booking.check_out);
  if (!start || !end) return null;
  return { start, end };
}

function financialsFor(booking: BookingRow) {
  if (!booking.booking_financials) return null;
  return Array.isArray(booking.booking_financials) ? booking.booking_financials[0] ?? null : booking.booking_financials;
}

export async function loadPropertiesData(supabase: any) {
  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase
    .from('properties')
    .select('id,title,status,is_active,max_stay_guests,max_event_guests,event_hourly_from_cents')
    .order('title', { ascending: true });

  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,property_id,kind,status,start_at,end_at,check_in,check_out,total_amount,booking_financials(total_charged,platform_revenue)')
    .order('start_at', { ascending: false })
    .limit(5000);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const now = startOfDay(new Date());
  const next90 = addDays(now, 90);
  const last30 = addDays(now, -30);

  const bookings = (bookingsData ?? []) as BookingRow[];

  const rows = properties.map((property) => {
    const scoped = bookings.filter((b) => b.property_id === property.id);

    const upcoming = scoped.filter((b) => {
      const win = bookingWindow(b);
      return win ? win.start >= now && win.start <= next90 : false;
    });

    const recentRevenue = scoped.reduce((sum, booking) => {
      const win = bookingWindow(booking);
      if (!win || win.start < last30 || win.start > now) return sum;
      return sum + (financialsFor(booking)?.total_charged ?? booking.total_amount ?? 0);
    }, 0);

    return {
      id: property.id,
      title: property.title,
      status: property.status ?? (property.is_active === false ? 'inactive' : 'active'),
      capacity: `${property.max_stay_guests ?? '-'} stay / ${property.max_event_guests ?? '-'} event`,
      eventFrom: property.event_hourly_from_cents ? formatCurrency(property.event_hourly_from_cents / 100) : '-',
      upcomingStays: upcoming.filter((b) => (b.kind || '').toLowerCase() === 'stay').length,
      upcomingEvents: upcoming.filter((b) => ['event', 'film'].includes((b.kind || '').toLowerCase())).length,
      recentRevenue,
    };
  });

  return { rows, warnings };
}

export async function loadPropertyDetail(supabase: any, propertyId: string) {
  const warnings: string[] = [];

  const { data: propertyData, error: propertyError } = await supabase
    .from('properties')
    .select('id,title,description,address,status,is_active,max_stay_guests,max_event_guests,event_hourly_from_cents,base_price')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) warnings.push(`Property query failed: ${propertyError.message}`);

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,kind,status,start_at,end_at,check_in,check_out,total_amount,booking_financials(total_charged,platform_revenue)')
    .eq('property_id', propertyId)
    .order('start_at', { ascending: true })
    .limit(500);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const bookings = (bookingsData ?? []) as BookingRow[];
  const now = new Date();
  const upcoming = bookings.filter((booking) => {
    const window = bookingWindow(booking);
    return window ? window.start >= now : false;
  });

  const recentRevenue = bookings.reduce((sum, booking) => {
    const win = bookingWindow(booking);
    if (!win) return sum;
    if (win.start < addDays(now, -30) || win.start > now) return sum;
    return sum + (financialsFor(booking)?.total_charged ?? booking.total_amount ?? 0);
  }, 0);

  return {
    property: propertyData,
    upcoming,
    recentRevenue,
    warnings,
  };
}
