import { formatISO } from 'date-fns';
import { parseDateInput, parseTimestamp } from '@/lib/admin/shared';

type PropertyRow = { id: string; title: string };
type RequestRow = {
  id: string;
  property_id: string;
  kind: string;
  status: string;
  pipeline_stage?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  notes?: string | null;
  guest_count?: number | null;
};

type StageColumn = {
  key: string;
  title: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    dateLabel: string;
    guests: number;
    notes: string;
  }>;
};

export const PIPELINE_STAGES: Array<{ key: string; title: string }> = [
  { key: 'new', title: 'New' },
  { key: 'qualified', title: 'Qualified' },
  { key: 'quote_sent', title: 'Quote Sent' },
  { key: 'contract_out', title: 'Contract Out' },
  { key: 'deposit_paid', title: 'Deposit Paid' },
  { key: 'confirmed', title: 'Confirmed' },
  { key: 'completed', title: 'Completed' },
  { key: 'closed_lost', title: 'Closed / Lost' },
];

function deriveStageFromStatus(status: string | null | undefined) {
  const lowered = (status || '').toLowerCase();
  if (['requested', 'draft', 'inquiry'].includes(lowered)) return 'new';
  if (['approved'].includes(lowered)) return 'qualified';
  if (['awaiting_payment'].includes(lowered)) return 'contract_out';
  if (['paid'].includes(lowered)) return 'deposit_paid';
  if (['confirmed', 'checked_in'].includes(lowered)) return 'confirmed';
  if (['completed', 'checked_out'].includes(lowered)) return 'completed';
  if (['declined', 'cancelled', 'canceled', 'expired'].includes(lowered)) return 'closed_lost';
  return 'new';
}

function inRange(row: RequestRow, from: Date, to: Date) {
  const start = parseTimestamp(row.start_at);
  const end = parseTimestamp(row.end_at);
  if (!start || !end) return false;
  return start < to && end > from;
}

export async function loadRequestsData(
  supabase: any,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{
  filters: { from: string; to: string; propertyId: string };
  properties: PropertyRow[];
  columns: StageColumn[];
  warnings: string[];
}> {
  const now = new Date();
  const defaultFrom = new Date(`${formatISO(now, { representation: 'date' })}T00:00:00Z`);
  const defaultTo = new Date(defaultFrom.getTime() + 1000 * 60 * 60 * 24 * 45);

  const from = parseDateInput(typeof searchParams.from === 'string' ? searchParams.from : undefined, defaultFrom);
  const to = parseDateInput(typeof searchParams.to === 'string' ? searchParams.to : undefined, defaultTo);
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';
  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  let rows: RequestRow[] = [];
  const withPipeline = await supabase
    .from('bookings')
    .select('id,property_id,kind,status,pipeline_stage,start_at,end_at,notes,guest_count')
    .in('kind', ['event', 'film'])
    .order('start_at', { ascending: true })
    .limit(2000);

  if (withPipeline.error) {
    warnings.push(`Pipeline stage not available yet (${withPipeline.error.message}). Falling back to status mapping.`);
    const fallback = await supabase
      .from('bookings')
      .select('id,property_id,kind,status,start_at,end_at,notes,guest_count')
      .in('kind', ['event', 'film'])
      .order('start_at', { ascending: true })
      .limit(2000);

    if (fallback.error) {
      warnings.push(`Bookings query failed: ${fallback.error.message}`);
    } else {
      rows = (fallback.data ?? []) as RequestRow[];
    }
  } else {
    rows = (withPipeline.data ?? []) as RequestRow[];
  }

  const scoped = rows
    .filter((row) => (propertyId === 'all' ? true : row.property_id === propertyId))
    .filter((row) => inRange(row, from, to));

  const columns: StageColumn[] = PIPELINE_STAGES.map((stage) => ({ key: stage.key, title: stage.title, items: [] }));
  const byStage = new Map(columns.map((column) => [column.key, column]));

  for (const row of scoped) {
    const stage = (row.pipeline_stage || deriveStageFromStatus(row.status)).toLowerCase();
    const target = byStage.get(stage) ?? byStage.get('new');
    if (!target) continue;

    const start = parseTimestamp(row.start_at);
    const end = parseTimestamp(row.end_at);

    target.items.push({
      id: row.id,
      title: titleById.get(row.property_id) ?? 'Unknown Property',
      subtitle: `${(row.kind || 'event').toUpperCase()} • ${row.status}`,
      dateLabel: `${start?.toLocaleString() ?? '-'} - ${end?.toLocaleString() ?? '-'}`,
      guests: row.guest_count ?? 0,
      notes: row.notes ?? '',
    });
  }

  return {
    filters: {
      from: formatISO(from, { representation: 'date' }),
      to: formatISO(to, { representation: 'date' }),
      propertyId,
    },
    properties,
    columns,
    warnings,
  };
}
