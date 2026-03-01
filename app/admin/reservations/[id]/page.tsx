import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadReservationDetail } from '@/lib/admin/reservations';
import { createClient } from '@/lib/supabase/server';

function fmtCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value ?? 0);
}

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const data = await loadReservationDetail(supabase, params.id);

  if (!data.booking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservation not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin/reservations">Back to reservations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Reservation Detail</h2>
        <Button asChild variant="outline">
          <Link href="/admin/reservations">Back</Link>
        </Button>
      </div>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">Some detail modules are unavailable until all admin tables are migrated.</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{data.propertyTitle}</CardTitle>
          <CardDescription>
            Status: {data.booking.status} • Guest: {data.booking.guest_id ?? 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            Date range: {(data.booking.start_at ?? data.booking.check_in ?? '-') + ' → ' + (data.booking.end_at ?? data.booking.check_out ?? '-')}
          </p>
          <p>Notes: {data.booking.notes ?? 'No notes'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p>Subtotal: {fmtCurrency(data.financials?.gmv_subtotal)}</p>
            <p>Cleaning fee: {fmtCurrency(data.financials?.cleaning_fee)}</p>
            <p>Platform fee: {fmtCurrency(data.financials?.platform_fee)}</p>
            <p>Processing fee: {fmtCurrency(data.financials?.processing_fee)}</p>
            <p>Taxes: {fmtCurrency(data.financials?.taxes)}</p>
            <p>Deposit: {fmtCurrency(data.financials?.security_deposit)}</p>
            <p>Discounts: {fmtCurrency(data.financials?.discounts)}</p>
            <p>Total charged: {fmtCurrency(data.financials?.total_charged ?? data.booking.total_amount)}</p>
            <p>Owner earnings: {fmtCurrency(data.financials?.owner_earnings)}</p>
            <p>Platform revenue: {fmtCurrency(data.financials?.platform_revenue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">
                    No messages for this reservation.
                  </TableCell>
                </TableRow>
              ) : (
                data.messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>{new Date(message.created_at).toLocaleString()}</TableCell>
                    <TableCell>{message.from_user_id ?? message.sender_id ?? '-'}</TableCell>
                    <TableCell>{message.to_user_id ?? message.recipient_id ?? '-'}</TableCell>
                    <TableCell>{message.body ?? message.content ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.audit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">
                    No audit records found for this reservation.
                  </TableCell>
                </TableRow>
              ) : (
                data.audit.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                    <TableCell>{entry.actor_id ?? '-'}</TableCell>
                    <TableCell>{entry.action}</TableCell>
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
