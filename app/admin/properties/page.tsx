import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/admin/shared';
import { loadPropertiesData } from '@/lib/admin/properties';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPropertiesPage() {
  const supabase = createClient();
  const data = await loadPropertiesData(supabase);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Properties & Venues</CardTitle>
          <CardDescription>Inventory health, upcoming workload, and recent revenue context.</CardDescription>
        </CardHeader>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Property List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Event Rate From</TableHead>
                <TableHead className="text-right">Upcoming Stays</TableHead>
                <TableHead className="text-right">Upcoming Events/Film</TableHead>
                <TableHead className="text-right">Recent Revenue (30d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No properties found.
                  </TableCell>
                </TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/admin/properties/${row.id}`} className="font-medium text-blue-700 hover:underline">
                        {row.title}
                      </Link>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.capacity}</TableCell>
                    <TableCell>{row.eventFrom}</TableCell>
                    <TableCell className="text-right">{row.upcomingStays}</TableCell>
                    <TableCell className="text-right">{row.upcomingEvents}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.recentRevenue)}</TableCell>
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
