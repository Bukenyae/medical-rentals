import { parseDateInput } from '@/lib/admin/shared';

type PropertyRow = { id: string; title: string };
type OpsTaskRow = {
  id: string;
  property_id: string;
  booking_id?: string | null;
  task_type: string;
  status: string;
  assigned_to?: string | null;
  due_at?: string | null;
  notes?: string | null;
};

export const OPS_STATUS = ['todo', 'in_progress', 'done', 'blocked'];
export const OPS_TYPES = ['cleaning', 'prep', 'inspection', 'vendor', 'other'];

export async function loadOpsData(supabase: any, searchParams: Record<string, string | string[] | undefined>) {
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : 'all';
  const propertyId = typeof searchParams.propertyId === 'string' ? searchParams.propertyId : 'all';
  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: tasksData, error: tasksError } = await supabase
    .from('ops_tasks')
    .select('id,property_id,booking_id,task_type,status,assigned_to,due_at,notes')
    .order('due_at', { ascending: true })
    .limit(2000);

  if (tasksError) warnings.push(`Ops tasks query failed: ${tasksError.message}`);

  const rows = ((tasksData ?? []) as OpsTaskRow[])
    .filter((task) => (propertyId === 'all' ? true : task.property_id === propertyId))
    .filter((task) => (statusFilter === 'all' ? true : task.status === statusFilter))
    .map((task) => ({
      ...task,
      propertyTitle: titleById.get(task.property_id) ?? 'Unknown Property',
    }));

  return {
    filters: { status: statusFilter, propertyId },
    properties,
    rows,
    warnings,
  };
}

export function parseOpsDueDate(input: FormDataEntryValue | null) {
  if (!input) return null;
  const value = String(input);
  const date = parseDateInput(value, new Date());
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
