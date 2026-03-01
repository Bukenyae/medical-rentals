type DisputeRow = {
  id: string;
  booking_id?: string | null;
  property_id?: string | null;
  status: string;
  severity: string;
  description: string;
  created_at: string;
  resolved_at?: string | null;
};

type PropertyRow = { id: string; title: string };

export async function loadDisputesData(supabase: any, searchParams: Record<string, string | string[] | undefined>) {
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : 'all';
  const severityFilter = typeof searchParams.severity === 'string' ? searchParams.severity : 'all';
  const warnings: string[] = [];

  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select('id,title').order('title');
  if (propertiesError) warnings.push(`Properties query failed: ${propertiesError.message}`);
  const properties = (propertiesData ?? []) as PropertyRow[];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: disputesData, error: disputesError } = await supabase
    .from('disputes_incidents')
    .select('id,booking_id,property_id,status,severity,description,created_at,resolved_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (disputesError) warnings.push(`Disputes query failed: ${disputesError.message}`);

  const rows = ((disputesData ?? []) as DisputeRow[])
    .filter((row) => (statusFilter === 'all' ? true : row.status === statusFilter))
    .filter((row) => (severityFilter === 'all' ? true : row.severity === severityFilter))
    .map((row) => ({ ...row, propertyTitle: titleById.get(row.property_id || '') ?? 'Unknown Property' }));

  return {
    filters: { status: statusFilter, severity: severityFilter },
    rows,
    warnings,
  };
}
