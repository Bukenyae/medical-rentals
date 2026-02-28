import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadDisputesData } from '@/lib/admin/disputes';
import { createClient } from '@/lib/supabase/server';

const statusOptions = ['all', 'open', 'investigating', 'resolved', 'closed'];
const severityOptions = ['all', 'low', 'medium', 'high', 'critical'];

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadDisputesData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Disputes & Incidents</CardTitle>
          <CardDescription>Read-only support view linked to booking and property context.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
            <select name="status" defaultValue={data.filters.status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
            <select name="severity" defaultValue={data.filters.severity} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  Severity: {severity}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Incident Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No disputes/incidents found.
                  </TableCell>
                </TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell>{row.propertyTitle}</TableCell>
                    <TableCell>{row.booking_id ?? '-'}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.severity}</TableCell>
                    <TableCell className="max-w-[380px] truncate" title={row.description}>
                      {row.description}
                    </TableCell>
                    <TableCell>{row.resolved_at ? new Date(row.resolved_at).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
