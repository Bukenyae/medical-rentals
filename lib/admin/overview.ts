import { addDays, formatISO, startOfDay, subDays } from 'date-fns';
import { diffPercent, formatCurrency, formatPercent, overlapDays, parseDateInput, parseTimestamp } from '@/lib/admin/shared';

type PropertyRow = { id: string; title: string; is_active?: boolean | null; status?: string | null };
type FinancialRow = { total_charged?: number | null; platform_revenue?: number | null; owner_earnings?: number | null };
type BookingRow = {
  id: string;
  property_id: string;
  kind: string;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  total_amount?: number | null;
  booking_financials?: FinancialRow | FinancialRow[] | null;
};
type PayoutRow = { status: string; amount: number | null; period_start?: string | null; period_end?: string | null; property_id?: string | null };
type TrendPoint = { label: string; gmv: number; platformRevenue: number };

type KpiItem = {
  label: string;
  value: string;
  subLabel?: string;
  deltaText: string;
  deltaTone: 'up' | 'down' | 'neutral';
};

export type OverviewData = {
  filters: { from: string; to: string; propertyId: string };
  properties: PropertyRow[];
  kpis: KpiItem[];
  trend: TrendPoint[];
  warnings: string[];
};

const REVENUE_STATUSES = new Set(['confirmed', 'completed', 'paid', 'approved', 'in_progress', 'checked_in', 'checked_out']);
const EVENT_CONVERTED_STATUSES = new Set(['paid', 'confirmed', 'completed', 'in_progress', 'checked_in']);
const EXCLUDED_STATUSES = new Set(['cancelled', 'canceled', 'declined', 'expired']);

function bookingWindow(booking: BookingRow) {
  const start = parseTimestamp(booking.start_at) ?? parseTimestamp(booking.check_in);
  const end = parseTimestamp(booking.end_at) ?? parseTimestamp(booking.check_out);
  if (!start || !end) return null;
  return { start, end };
}

function inRange(booking: BookingRow, from: Date, to: Date) {
  const window = bookingWindow(booking);
  return window ? window.start < to && window.end > from : false;
}

function financialsFor(booking: BookingRow) {
  if (!booking.booking_financials) return null;
  return Array.isArray(booking.booking_financials) ? booking.booking_financials[0] ?? null : booking.booking_financials;
}

function metricSum(bookings: BookingRow[], getValue: (b: BookingRow) => number) {
  return bookings.reduce((sum, row) => sum + getValue(row), 0);
}

function deltaPack(current: number, previous: number) {
  const delta = diffPercent(current, previous);
  return {
    tone: (delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
    text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous`,
  };
}

function payoutInRange(payout: PayoutRow, from: Date, to: Date) {
  const start = payout.period_start ? new Date(`${payout.period_start}T00:00:00Z`) : null;
  const end = payout.period_end ? new Date(`${payout.period_end}T00:00:00Z`) : null;
  if (!start || !end) return false;
  return start < to && end >= from;
}

export async function loadOverviewData(supabase: any, searchParams: Record<string, string | string[] | undefined>): Promise<OverviewData> {
  const now = new Date();
  const defaultFrom = subDays(startOfDay(now), 30);
  const defaultTo = addDays(startOfDay(now), 1);

  const fromDate = parseDateInput(typeof searchParams.from === 'string' ? searchParams.from : undefined, defaultFrom);
  const toDate = parseDateInput(typeof searchParams.to === 'string' ? searchParams.to : undefined, defaultTo);
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';

  const from = fromDate <= toDate ? fromDate : defaultFrom;
  const to = toDate > fromDate ? toDate : defaultTo;
  const rangeDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
  const previousFrom = subDays(from, rangeDays);
  const previousTo = from;
  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title,is_active,status').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];

  const minFetch = subDays(from < previousFrom ? from : previousFrom, 120);
  const maxFetch = addDays(to > addDays(now, 90) ? to : addDays(now, 90), 1);

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,property_id,kind,status,check_in,check_out,start_at,end_at,total_amount,booking_financials(total_charged,platform_revenue,owner_earnings)')
    .order('start_at', { ascending: true })
    .limit(5000);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const rawBookings = ((bookingsData ?? []) as BookingRow[]).filter((row) => inRange(row, minFetch, maxFetch));
  const scopedBookings = propertyId === 'all' ? rawBookings : rawBookings.filter((b) => b.property_id === propertyId);
  const inCurrentRange = scopedBookings.filter((b) => inRange(b, from, to));
  const inPreviousRange = scopedBookings.filter((b) => inRange(b, previousFrom, previousTo));

  const revenueCurrent = inCurrentRange.filter((b) => REVENUE_STATUSES.has((b.status || '').toLowerCase()));
  const revenuePrevious = inPreviousRange.filter((b) => REVENUE_STATUSES.has((b.status || '').toLowerCase()));

  const gmvCurrent = metricSum(revenueCurrent, (b) => financialsFor(b)?.total_charged ?? b.total_amount ?? 0);
  const gmvPrevious = metricSum(revenuePrevious, (b) => financialsFor(b)?.total_charged ?? b.total_amount ?? 0);
  const platformRevenueCurrent = metricSum(revenueCurrent, (b) => financialsFor(b)?.platform_revenue ?? 0);
  const platformRevenuePrevious = metricSum(revenuePrevious, (b) => financialsFor(b)?.platform_revenue ?? 0);

  const eventCurrent = inCurrentRange.filter((b) => ['event', 'film'].includes((b.kind || '').toLowerCase()));
  const eventPrev = inPreviousRange.filter((b) => ['event', 'film'].includes((b.kind || '').toLowerCase()));
  const eventConvertedCurrent = eventCurrent.filter((b) => EVENT_CONVERTED_STATUSES.has((b.status || '').toLowerCase()));
  const eventConvertedPrev = eventPrev.filter((b) => EVENT_CONVERTED_STATUSES.has((b.status || '').toLowerCase()));
  const eventConversionCurrent = eventCurrent.length ? (eventConvertedCurrent.length / eventCurrent.length) * 100 : 0;
  const eventConversionPrevious = eventPrev.length ? (eventConvertedPrev.length / eventPrev.length) * 100 : 0;

  const stayBookings = scopedBookings.filter((b) => (b.kind || '').toLowerCase() === 'stay' && !EXCLUDED_STATUSES.has((b.status || '').toLowerCase()));
  const activePropertyCount = Math.max(1, (propertyId === 'all' ? properties.filter((p) => p.is_active !== false && p.status !== 'inactive').length : 1) || 1);

  const occupancyForDays = (days: number) => {
    const occStart = startOfDay(now);
    const occEnd = addDays(occStart, days);
    const bookedDays = stayBookings.reduce((sum, booking) => {
      const window = bookingWindow(booking);
      return window ? sum + overlapDays(window.start, window.end, occStart, occEnd) : sum;
    }, 0);
    return (bookedDays / (days * activePropertyCount)) * 100;
  };

  const occupancy14 = occupancyForDays(14);
  const occupancy30 = occupancyForDays(30);
  const occupancy90 = occupancyForDays(90);

  const previousOccStart = subDays(startOfDay(now), 30);
  const previousOccEnd = startOfDay(now);
  const prevBooked = stayBookings.reduce((sum, booking) => {
    const window = bookingWindow(booking);
    return window ? sum + overlapDays(window.start, window.end, previousOccStart, previousOccEnd) : sum;
  }, 0);
  const occupancy30Previous = (prevBooked / (30 * activePropertyCount)) * 100;

  const { data: payoutsData, error: payoutsError } = await supabase.from('payouts').select('status,amount,period_start,period_end,property_id').limit(5000);
  if (payoutsError) warnings.push(`Payouts query failed: ${payoutsError.message}`);

  const scopedPayouts = ((payoutsData ?? []) as PayoutRow[]).filter((p) => propertyId === 'all' || p.property_id === propertyId);
  const currentPayouts = scopedPayouts.filter((p) => payoutInRange(p, from, to));
  const previousPayouts = scopedPayouts.filter((p) => payoutInRange(p, previousFrom, previousTo));

  const payoutsDueCurrent = currentPayouts.reduce((sum, p) => sum + (['pending', 'approved'].includes((p.status || '').toLowerCase()) ? p.amount ?? 0 : 0), 0);
  const payoutsPaidCurrent = currentPayouts.reduce((sum, p) => sum + ((p.status || '').toLowerCase() === 'paid' ? p.amount ?? 0 : 0), 0);
  const payoutsDuePrevious = previousPayouts.reduce((sum, p) => sum + (['pending', 'approved'].includes((p.status || '').toLowerCase()) ? p.amount ?? 0 : 0), 0);

  const trend: TrendPoint[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const pointStart = subDays(to, i * 7);
    const pointEnd = addDays(pointStart, 7);
    const rows = scopedBookings.filter((b) => inRange(b, pointStart, pointEnd) && REVENUE_STATUSES.has((b.status || '').toLowerCase()));
    trend.push({
      label: formatISO(pointStart, { representation: 'date' }),
      gmv: metricSum(rows, (b) => financialsFor(b)?.total_charged ?? b.total_amount ?? 0),
      platformRevenue: metricSum(rows, (b) => financialsFor(b)?.platform_revenue ?? 0),
    });
  }

  const occDelta = deltaPack(occupancy30, occupancy30Previous);
  const gmvDelta = deltaPack(gmvCurrent, gmvPrevious);
  const revDelta = deltaPack(platformRevenueCurrent, platformRevenuePrevious);
  const payoutDelta = deltaPack(payoutsDueCurrent, payoutsDuePrevious);
  const eventDelta = deltaPack(eventConversionCurrent, eventConversionPrevious);

  return {
    filters: { from: formatISO(from, { representation: 'date' }), to: formatISO(to, { representation: 'date' }), propertyId },
    properties,
    warnings,
    trend,
    kpis: [
      { label: 'Occupancy (next 30d)', value: formatPercent(occupancy30), subLabel: `14d ${formatPercent(occupancy14)} • 90d ${formatPercent(occupancy90)}`, deltaText: occDelta.text, deltaTone: occDelta.tone },
      { label: 'GMV', value: formatCurrency(gmvCurrent), deltaText: gmvDelta.text, deltaTone: gmvDelta.tone },
      { label: 'Platform Revenue', value: formatCurrency(platformRevenueCurrent), subLabel: gmvCurrent > 0 ? `Take-rate ${((platformRevenueCurrent / gmvCurrent) * 100).toFixed(1)}%` : 'Take-rate 0.0%', deltaText: revDelta.text, deltaTone: revDelta.tone },
      { label: 'Owner Payouts', value: formatCurrency(payoutsDueCurrent), subLabel: `Paid ${formatCurrency(payoutsPaidCurrent)}`, deltaText: payoutDelta.text, deltaTone: payoutDelta.tone },
      { label: 'Event Conversion', value: formatPercent(eventConversionCurrent), subLabel: `${eventConvertedCurrent.length}/${eventCurrent.length || 0} converted`, deltaText: eventDelta.text, deltaTone: eventDelta.tone },
    ],
  };
}
