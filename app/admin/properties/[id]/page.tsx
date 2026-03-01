import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/admin/shared';
import { loadPropertyDetail } from '@/lib/admin/properties';
import { createClient } from '@/lib/supabase/server';

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const data = await loadPropertyDetail(supabase, params.id);

  if (!data.property) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin/properties">Back to properties</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{data.property.title}</h2>
        <Button asChild variant="outline">
          <Link href="/admin/properties">Back</Link>
        </Button>
      </div>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Property Summary</CardTitle>
          <CardDescription>
            Status: {data.property.status ?? (data.property.is_active === false ? 'inactive' : 'active')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Base nightly rate: {formatCurrency(data.property.base_price ?? 0)}</p>
          <p>Event rate from: {formatCurrency((data.property.event_hourly_from_cents ?? 0) / 100)}</p>
          <p>Capacity: {data.property.max_stay_guests ?? '-'} stay / {data.property.max_event_guests ?? '-'} event</p>
          <p>Recent revenue (30d): {formatCurrency(data.recentRevenue)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Stays & Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.upcoming.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    No upcoming bookings.
                  </TableCell>
                </TableRow>
              ) : (
                data.upcoming.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.kind}</TableCell>
                    <TableCell>{booking.status}</TableCell>
                    <TableCell>{booking.start_at ?? booking.check_in ?? '-'}</TableCell>
                    <TableCell>{booking.end_at ?? booking.check_out ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (Array.isArray(booking.booking_financials)
                          ? booking.booking_financials[0]?.total_charged
                          : booking.booking_financials?.total_charged) ?? booking.total_amount ?? 0
                      )}
                    </TableCell>
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
