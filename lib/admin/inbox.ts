import { parseDateInput, parseTimestamp } from '@/lib/admin/shared';

type PropertyRow = { id: string; title: string };
type MessageRow = {
  id: string;
  booking_id?: string | null;
  property_id?: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  body?: string | null;
  content?: string | null;
  created_at: string;
};

type BookingRow = { id: string; kind?: string | null };

export async function loadInboxData(supabase: any, searchParams: Record<string, string | string[] | undefined>) {
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';
  const fromRaw = typeof searchParams.from === 'string' ? searchParams.from : undefined;
  const toRaw = typeof searchParams.to === 'string' ? searchParams.to : undefined;

  const defaultFrom = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const defaultTo = new Date();
  const from = parseDateInput(fromRaw, defaultFrom);
  const to = parseDateInput(toRaw, defaultTo);

  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('id,booking_id,property_id,from_user_id,to_user_id,sender_id,recipient_id,body,content,created_at')
    .order('created_at', { ascending: false })
    .limit(3000);

  if (messagesError) warnings.push(`Messages query failed: ${messagesError.message}`);

  const rows = ((messagesData ?? []) as MessageRow[])
    .filter((row) => (propertyId === 'all' ? true : row.property_id === propertyId))
    .filter((row) => {
      const at = parseTimestamp(row.created_at);
      if (!at) return false;
      return at >= from && at <= to;
    });

  const bookingSeen: Record<string, true> = {};
  const bookingIds: string[] = [];
  for (const row of rows) {
    if (!row.booking_id || bookingSeen[row.booking_id]) continue;
    bookingSeen[row.booking_id] = true;
    bookingIds.push(row.booking_id);
  }
  let bookingKindById = new Map<string, string>();

  if (bookingIds.length > 0) {
    const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select('id,kind').in('id', bookingIds);
    if (bookingsError) warnings.push(`Booking-kind lookup failed: ${bookingsError.message}`);
    const bookings = (bookingsData ?? []) as BookingRow[];
    bookingKindById = new Map(bookings.map((b) => [b.id, b.kind || 'unknown']));
  }

  const viewRows = rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    property: titleById.get(row.property_id || '') ?? 'Unknown Property',
    bookingId: row.booking_id ?? '-',
    bookingType: row.booking_id ? bookingKindById.get(row.booking_id) ?? 'unknown' : '-',
    fromUser: row.from_user_id ?? row.sender_id ?? '-',
    toUser: row.to_user_id ?? row.recipient_id ?? '-',
    body: row.body ?? row.content ?? '-',
  }));

  return {
    filters: {
      propertyId,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    properties,
    rows: viewRows,
    warnings,
  };
}
