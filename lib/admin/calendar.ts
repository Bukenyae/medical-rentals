import { addDays, format, formatISO, startOfDay } from 'date-fns';

type PropertyRow = { id: string; title: string };

type BookingRow = {
  id: string;
  property_id: string;
  kind: string;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  guest_count?: number | null;
};

type BlockRow = {
  id: string;
  property_id: string;
  start_at: string;
  end_at: string;
  block_type: string;
  reason?: string | null;
};

type CalendarItem = {
  id: string;
  source: 'booking' | 'block';
  propertyId: string;
  propertyTitle: string;
  start: Date;
  end: Date;
  label: string;
  statusLabel: string;
};

export type CalendarData = {
  filters: { from: string; to: string; propertyId: string };
  properties: PropertyRow[];
  groupedByDay: Array<{ day: string; items: CalendarItem[] }>;
  conflicts: string[];
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

function overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  return start < rangeEnd && end > rangeStart;
}

export async function loadCalendarData(
  supabase: any,
  searchParams: Record<string, string | string[] | undefined>
): Promise<CalendarData> {
  const defaultFrom = startOfDay(new Date());
  const defaultTo = addDays(defaultFrom, 30);

  const from = parseDateInput(typeof searchParams.from === 'string' ? searchParams.from : undefined, defaultFrom);
  const to = parseDateInput(typeof searchParams.to === 'string' ? searchParams.to : undefined, defaultTo);
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';

  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase
    .from('properties')
    .select('id,title')
    .order('title', { ascending: true });

  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,property_id,kind,status,start_at,end_at,check_in,check_out,guest_count')
    .order('start_at', { ascending: true })
    .limit(5000);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const { data: blocksData, error: blocksError } = await supabase
    .from('calendar_blocks')
    .select('id,property_id,start_at,end_at,block_type,reason')
    .order('start_at', { ascending: true })
    .limit(5000);

  if (blocksError) warnings.push(`Calendar blocks query failed: ${blocksError.message}`);

  const items: CalendarItem[] = [];

  for (const booking of (bookingsData ?? []) as BookingRow[]) {
    if (propertyId !== 'all' && booking.property_id !== propertyId) continue;
    const window = bookingWindow(booking);
    if (!window || !overlapsRange(window.start, window.end, from, to)) continue;

    const kind = (booking.kind || 'stay').toUpperCase();
    const status = (booking.status || 'unknown').split('_').join(' ');
    items.push({
      id: booking.id,
      source: 'booking',
      propertyId: booking.property_id,
      propertyTitle: titleById.get(booking.property_id) ?? 'Unknown Property',
      start: window.start,
      end: window.end,
      label: `${kind} booking`,
      statusLabel: `${status}${booking.guest_count ? ` • ${booking.guest_count} guests` : ''}`,
    });
  }

  for (const block of (blocksData ?? []) as BlockRow[]) {
    if (propertyId !== 'all' && block.property_id !== propertyId) continue;
    const start = parseTs(block.start_at);
    const end = parseTs(block.end_at);
    if (!start || !end || !overlapsRange(start, end, from, to)) continue;

    items.push({
      id: block.id,
      source: 'block',
      propertyId: block.property_id,
      propertyTitle: titleById.get(block.property_id) ?? 'Unknown Property',
      start,
      end,
      label: `Block: ${(block.block_type || 'other').split('_').join(' ')}`,
      statusLabel: block.reason || 'No reason specified',
    });
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime());

  const conflicts: string[] = [];
  const byProperty = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const current = byProperty.get(item.propertyId) ?? [];
    current.push(item);
    byProperty.set(item.propertyId, current);
  }

  for (const [propId, propItems] of byProperty) {
    const sorted = [...propItems].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.start < prev.end) {
        conflicts.push(
          `${titleById.get(propId) ?? 'Property'} overlap on ${format(curr.start, 'yyyy-MM-dd')}: ${prev.label} conflicts with ${curr.label}`
        );
      }
    }
  }

  const grouped = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = formatISO(item.start, { representation: 'date' });
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  const groupedByDay = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, dayItems]) => ({ day, items: dayItems }));

  return {
    filters: {
      from: formatISO(from, { representation: 'date' }),
      to: formatISO(to, { representation: 'date' }),
      propertyId,
    },
    properties,
    groupedByDay,
    conflicts,
    warnings,
  };
}
