import { addDays, formatISO, startOfDay, subDays } from 'date-fns';

type PropertyRow = { id: string; title: string };

type BookingFinancialsRow = {
  total_charged?: number | null;
  owner_earnings?: number | null;
  platform_revenue?: number | null;
  gmv_subtotal?: number | null;
  cleaning_fee?: number | null;
  platform_fee?: number | null;
  taxes?: number | null;
  processing_fee?: number | null;
  security_deposit?: number | null;
  discounts?: number | null;
};

type BookingRow = {
  id: string;
  property_id: string;
  guest_id?: string | null;
  status: string;
  kind: string;
  check_in?: string | null;
  check_out?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  total_amount?: number | null;
  notes?: string | null;
  booking_financials?: BookingFinancialsRow | BookingFinancialsRow[] | null;
};

type MessageRow = {
  id: string;
  created_at: string;
  body?: string | null;
  content?: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor_id?: string | null;
};

export type ReservationsListData = {
  filters: { from: string; to: string; propertyId: string; status: string };
  properties: PropertyRow[];
  rows: Array<{
    id: string;
    propertyTitle: string;
    dateRange: string;
    status: string;
    guestLabel: string;
    totalCharged: number;
    ownerEarnings: number;
    platformRevenue: number;
  }>;
  warnings: string[];
};

export type ReservationDetailData = {
  booking: BookingRow | null;
  propertyTitle: string;
  financials: BookingFinancialsRow | null;
  messages: MessageRow[];
  audit: AuditRow[];
  warnings: string[];
};

function parseDateInput(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function parseTs(value: string | null | undefined) {
  if (!value) return null;
  if (value.includes('T')) return new Date(value);
  return new Date(`${value}T00:00:00Z`);
}

function bookingWindow(row: BookingRow) {
  const start = parseTs(row.start_at) ?? parseTs(row.check_in);
  const end = parseTs(row.end_at) ?? parseTs(row.check_out);
  if (!start || !end) return null;
  return { start, end };
}

function inRange(row: BookingRow, from: Date, to: Date) {
  const window = bookingWindow(row);
  if (!window) return false;
  return window.start < to && window.end > from;
}

function rowFinancials(booking: BookingRow) {
  if (!booking.booking_financials) return null;
  return Array.isArray(booking.booking_financials) ? booking.booking_financials[0] ?? null : booking.booking_financials;
}

export async function loadReservationsList(
  supabase: any,
  searchParams: Record<string, string | string[] | undefined>
): Promise<ReservationsListData> {
  const defaultFrom = subDays(startOfDay(new Date()), 30);
  const defaultTo = addDays(startOfDay(new Date()), 30);

  const from = parseDateInput(typeof searchParams.from === 'string' ? searchParams.from : undefined, defaultFrom);
  const to = parseDateInput(typeof searchParams.to === 'string' ? searchParams.to : undefined, defaultTo);
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';
  const status = typeof searchParams.status === 'string' ? searchParams.status : 'all';

  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,property_id,guest_id,status,kind,check_in,check_out,start_at,end_at,total_amount,notes,booking_financials(total_charged,owner_earnings,platform_revenue)')
    .eq('kind', 'stay')
    .order('start_at', { ascending: false })
    .limit(5000);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const rows = ((bookingsData ?? []) as BookingRow[])
    .filter((row) => (propertyId === 'all' ? true : row.property_id === propertyId))
    .filter((row) => (status === 'all' ? true : (row.status || '').toLowerCase() === status.toLowerCase()))
    .filter((row) => inRange(row, from, to))
    .map((row) => {
      const fin = rowFinancials(row);
      const start = parseTs(row.start_at) ?? parseTs(row.check_in);
      const end = parseTs(row.end_at) ?? parseTs(row.check_out);
      return {
        id: row.id,
        propertyTitle: titleById.get(row.property_id) ?? 'Unknown Property',
        dateRange: `${start?.toLocaleDateString() ?? '-'} - ${end?.toLocaleDateString() ?? '-'}`,
        status: row.status,
        guestLabel: row.guest_id ?? 'N/A',
        totalCharged: fin?.total_charged ?? row.total_amount ?? 0,
        ownerEarnings: fin?.owner_earnings ?? 0,
        platformRevenue: fin?.platform_revenue ?? 0,
      };
    });

  return {
    filters: {
      from: formatISO(from, { representation: 'date' }),
      to: formatISO(to, { representation: 'date' }),
      propertyId,
      status,
    },
    properties,
    rows,
    warnings,
  };
}

export async function loadReservationDetail(supabase: any, id: string): Promise<ReservationDetailData> {
  const warnings: string[] = [];

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .select('id,property_id,guest_id,status,kind,check_in,check_out,start_at,end_at,total_amount,notes,booking_financials(total_charged,owner_earnings,platform_revenue,gmv_subtotal,cleaning_fee,platform_fee,taxes,processing_fee,security_deposit,discounts)')
    .eq('id', id)
    .maybeSingle();

  if (bookingError) warnings.push(`Booking query failed: ${bookingError.message}`);
  const booking = (bookingData as BookingRow | null) ?? null;

  let propertyTitle = 'Unknown Property';
  if (booking?.property_id) {
    const { data: propertyData } = await supabase.from('properties').select('title').eq('id', booking.property_id).maybeSingle();
    propertyTitle = propertyData?.title ?? propertyTitle;
  }

  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .select('id,created_at,body,content,from_user_id,to_user_id,sender_id,recipient_id')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (messageError) warnings.push(`Messages query failed: ${messageError.message}`);

  const { data: auditData, error: auditError } = await supabase
    .from('audit_log')
    .select('id,action,entity_type,created_at,actor_id')
    .eq('entity_type', 'booking')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (auditError) warnings.push(`Audit query failed: ${auditError.message}`);

  return {
    booking,
    propertyTitle,
    financials: booking ? rowFinancials(booking) : null,
    messages: (messageData ?? []) as MessageRow[],
    audit: (auditData ?? []) as AuditRow[],
    warnings,
  };
}
