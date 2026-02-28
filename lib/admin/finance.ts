import { addDays, formatISO, startOfDay, subDays } from 'date-fns';
import { formatCurrency, parseDateInput, parseTimestamp } from '@/lib/admin/shared';

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
  total_amount?: number | null;
  booking_financials?: {
    total_charged?: number | null;
    platform_revenue?: number | null;
    owner_earnings?: number | null;
  } | {
    total_charged?: number | null;
    platform_revenue?: number | null;
    owner_earnings?: number | null;
  }[] | null;
};
type PayoutRow = { property_id?: string | null; amount?: number | null; status?: string | null; period_start?: string | null; period_end?: string | null };
type ExpenseRow = { property_id?: string | null; category?: string | null; amount?: number | null; scope?: string | null; incurred_at?: string | null; expense_date?: string | null };

type BreakdownRow = { label: string; amount: number };

type FinanceTab = 'gmv' | 'revenue' | 'payouts' | 'expenses' | 'fcf';

export type FinanceData = {
  filters: { from: string; to: string; propertyId: string; tab: FinanceTab };
  properties: PropertyRow[];
  definitions: Record<FinanceTab, string>;
  kpis: Array<{ label: string; value: string; sub?: string }>;
  breakdown: BreakdownRow[];
  warnings: string[];
};

const VALID_TABS: FinanceTab[] = ['gmv', 'revenue', 'payouts', 'expenses', 'fcf'];
const REVENUE_STATUSES = new Set(['confirmed', 'completed', 'paid', 'approved', 'in_progress', 'checked_in', 'checked_out']);

function bookingWindow(booking: BookingRow) {
  const start = parseTimestamp(booking.start_at) ?? parseTimestamp(booking.check_in);
  const end = parseTimestamp(booking.end_at) ?? parseTimestamp(booking.check_out);
  if (!start || !end) return null;
  return { start, end };
}

function inRange(booking: BookingRow, from: Date, to: Date) {
  const win = bookingWindow(booking);
  return win ? win.start < to && win.end > from : false;
}

function payoutInRange(payout: PayoutRow, from: Date, to: Date) {
  const start = payout.period_start ? new Date(`${payout.period_start}T00:00:00Z`) : null;
  const end = payout.period_end ? new Date(`${payout.period_end}T00:00:00Z`) : null;
  if (!start || !end) return false;
  return start < to && end >= from;
}

function expenseInRange(expense: ExpenseRow, from: Date, to: Date) {
  const rawDate = expense.incurred_at ?? expense.expense_date;
  if (!rawDate) return false;
  const date = new Date(`${rawDate}T00:00:00Z`);
  return date >= from && date <= to;
}

function financialsFor(booking: BookingRow) {
  if (!booking.booking_financials) return null;
  return Array.isArray(booking.booking_financials) ? booking.booking_financials[0] ?? null : booking.booking_financials;
}

function sumBy<T>(rows: T[], keyOf: (row: T) => string, amountOf: (row: T) => number): BreakdownRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    map.set(key, (map.get(key) ?? 0) + amountOf(row));
  }
  return Array.from(map.entries()).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
}

export async function loadFinanceData(supabase: any, searchParams: Record<string, string | string[] | undefined>): Promise<FinanceData> {
  const defaultFrom = subDays(startOfDay(new Date()), 30);
  const defaultTo = addDays(startOfDay(new Date()), 1);

  const from = parseDateInput(typeof searchParams.from === 'string' ? searchParams.from : undefined, defaultFrom);
  const to = parseDateInput(typeof searchParams.to === 'string' ? searchParams.to : undefined, defaultTo);
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';
  const rawTab = typeof searchParams.tab === 'string' ? searchParams.tab.toLowerCase() : 'gmv';
  const tab: FinanceTab = VALID_TABS.includes(rawTab as FinanceTab) ? (rawTab as FinanceTab) : 'gmv';

  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id,property_id,kind,status,start_at,end_at,check_in,check_out,total_amount,booking_financials(total_charged,platform_revenue,owner_earnings)')
    .order('start_at', { ascending: false })
    .limit(6000);

  if (bookingsError) warnings.push(`Bookings query failed: ${bookingsError.message}`);

  const { data: payoutsData, error: payoutsError } = await supabase
    .from('payouts')
    .select('property_id,amount,status,period_start,period_end')
    .limit(4000);

  if (payoutsError) warnings.push(`Payouts query failed: ${payoutsError.message}`);

  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('property_id,category,amount,scope,incurred_at,expense_date')
    .limit(4000);

  if (expensesError) warnings.push(`Expenses query failed: ${expensesError.message}`);

  const scopedBookings = ((bookingsData ?? []) as BookingRow[])
    .filter((b) => (propertyId === 'all' ? true : b.property_id === propertyId))
    .filter((b) => inRange(b, from, to))
    .filter((b) => REVENUE_STATUSES.has((b.status || '').toLowerCase()));

  const scopedPayouts = ((payoutsData ?? []) as PayoutRow[])
    .filter((p) => (propertyId === 'all' ? true : p.property_id === propertyId))
    .filter((p) => payoutInRange(p, from, to));

  const scopedExpenses = ((expensesData ?? []) as ExpenseRow[])
    .filter((e) => (propertyId === 'all' ? true : e.property_id === propertyId))
    .filter((e) => expenseInRange(e, from, to));

  const gmv = scopedBookings.reduce((sum, b) => sum + (financialsFor(b)?.total_charged ?? b.total_amount ?? 0), 0);
  const platformRevenue = scopedBookings.reduce((sum, b) => sum + (financialsFor(b)?.platform_revenue ?? 0), 0);
  const ownerEarnings = scopedBookings.reduce((sum, b) => sum + (financialsFor(b)?.owner_earnings ?? 0), 0);
  const payoutsTotal = scopedPayouts.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const expensesTotal = scopedExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const platformOpex = scopedExpenses.filter((e) => (e.scope || '').toLowerCase() === 'platform').reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const propertyCogs = scopedExpenses.filter((e) => (e.scope || '').toLowerCase() === 'property').reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const fcfProxy = platformRevenue - platformOpex - propertyCogs;

  const definitions: Record<FinanceTab, string> = {
    gmv: 'GMV = sum of total charged for confirmed/completed bookings in range.',
    revenue: 'Platform Revenue = sum of retained platform revenue; take-rate = revenue / GMV.',
    payouts: 'Owner Payouts = distributions due/paid from payouts table by period.',
    expenses: 'Expenses split into Platform OPEX and Property COGS by scope/category.',
    fcf: 'FCF proxy = Platform Revenue - Platform OPEX - unreimbursed Property COGS.',
  };

  const byPropertyFromBookings = sumBy(
    scopedBookings,
    (b) => titleById.get(b.property_id) ?? 'Unknown Property',
    (b) => financialsFor(b)?.total_charged ?? b.total_amount ?? 0
  );

  let kpis: Array<{ label: string; value: string; sub?: string }> = [];
  let breakdown: BreakdownRow[] = [];

  if (tab === 'gmv') {
    kpis = [
      { label: 'GMV', value: formatCurrency(gmv) },
      { label: 'Bookings Count', value: String(scopedBookings.length) },
      { label: 'Stays vs Events/Film', value: `${scopedBookings.filter((b) => b.kind === 'stay').length} / ${scopedBookings.filter((b) => b.kind !== 'stay').length}` },
    ];
    breakdown = byPropertyFromBookings;
  } else if (tab === 'revenue') {
    kpis = [
      { label: 'Platform Revenue', value: formatCurrency(platformRevenue) },
      { label: 'Effective Take-rate', value: `${gmv > 0 ? ((platformRevenue / gmv) * 100).toFixed(1) : '0.0'}%` },
      { label: 'Owner Earnings', value: formatCurrency(ownerEarnings) },
    ];
    breakdown = sumBy(scopedBookings, (b) => (b.kind || 'unknown').toUpperCase(), (b) => financialsFor(b)?.platform_revenue ?? 0);
  } else if (tab === 'payouts') {
    kpis = [
      { label: 'Total Payouts', value: formatCurrency(payoutsTotal) },
      { label: 'Pending/Approved', value: formatCurrency(scopedPayouts.filter((p) => ['pending', 'approved'].includes((p.status || '').toLowerCase())).reduce((sum, p) => sum + (p.amount ?? 0), 0)) },
      { label: 'Paid', value: formatCurrency(scopedPayouts.filter((p) => (p.status || '').toLowerCase() === 'paid').reduce((sum, p) => sum + (p.amount ?? 0), 0)) },
    ];
    breakdown = sumBy(scopedPayouts, (p) => titleById.get(p.property_id || '') ?? 'Unknown Property', (p) => p.amount ?? 0);
  } else if (tab === 'expenses') {
    kpis = [
      { label: 'Total Expenses', value: formatCurrency(expensesTotal) },
      { label: 'Platform OPEX', value: formatCurrency(platformOpex) },
      { label: 'Property COGS', value: formatCurrency(propertyCogs) },
    ];
    breakdown = sumBy(scopedExpenses, (e) => `${(e.scope || 'unknown').toLowerCase()} • ${e.category || 'other'}`, (e) => e.amount ?? 0);
  } else {
    kpis = [
      { label: 'FCF Proxy', value: formatCurrency(fcfProxy) },
      { label: 'Platform Revenue', value: formatCurrency(platformRevenue) },
      { label: 'Cost Base', value: formatCurrency(platformOpex + propertyCogs), sub: 'OPEX + Property COGS' },
    ];
    breakdown = [
      { label: 'Platform Revenue', amount: platformRevenue },
      { label: 'Platform OPEX', amount: -platformOpex },
      { label: 'Property COGS', amount: -propertyCogs },
      { label: 'FCF Proxy', amount: fcfProxy },
    ];
  }

  return {
    filters: { from: formatISO(from, { representation: 'date' }), to: formatISO(to, { representation: 'date' }), propertyId, tab },
    properties,
    definitions,
    kpis,
    breakdown,
    warnings,
  };
}
