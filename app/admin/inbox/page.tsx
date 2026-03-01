import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadInboxData } from '@/lib/admin/inbox';
import { createClient } from '@/lib/supabase/server';

export default async function AdminInboxPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient();
  const data = await loadInboxData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Guest and host interactions linked to bookings and properties.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]" method="get">
            <select name="propertyId" defaultValue={data.filters.propertyId} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All properties</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>{property.title}</option>
              ))}
            </select>
            <Input type="date" name="from" defaultValue={data.filters.from} />
            <Input type="date" name="to" defaultValue={data.filters.to} />
            <Button type="submit">Apply</Button>
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
          <CardTitle>Conversation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-500">No messages in this range.</TableCell></TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{row.property}</TableCell>
                    <TableCell>{row.bookingId}</TableCell>
                    <TableCell>{row.bookingType}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={row.fromUser}>{row.fromUser}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={row.toUser}>{row.toUser}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={row.body}>{row.body}</TableCell>
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
