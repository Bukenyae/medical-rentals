import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadReservationsList } from '@/lib/admin/reservations';
import { createClient } from '@/lib/supabase/server';

const STATUS_OPTIONS = ['all', 'draft', 'requested', 'approved', 'confirmed', 'completed', 'cancelled'];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadReservationsList(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Reservations (Stays)</CardTitle>
          <CardDescription>Monitor stay bookings with financial outputs and status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_1.3fr_1fr_auto_auto]" method="get">
            <Input name="from" type="date" defaultValue={data.filters.from} />
            <Input name="to" type="date" defaultValue={data.filters.to} />
            <select
              name="propertyId"
              defaultValue={data.filters.propertyId}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All properties</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={data.filters.status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
            <Button asChild variant="outline">
              <Link href="/admin/reservations">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">Some reservation fields are missing until admin migration is applied.</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Stay Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="text-right">Total Charged</TableHead>
                <TableHead className="text-right">Owner Earnings</TableHead>
                <TableHead className="text-right">Platform Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No stay reservations found.
                  </TableCell>
                </TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/admin/reservations/${row.id}`} className="font-medium text-blue-700 hover:underline">
                        {row.propertyTitle}
                      </Link>
                    </TableCell>
                    <TableCell>{row.dateRange}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.guestLabel}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.totalCharged)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.ownerEarnings)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.platformRevenue)}</TableCell>
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
