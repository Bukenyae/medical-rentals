import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FLAG_SEVERITIES, FLAG_STATUS, FLAG_TYPES, loadUsersTrustData } from '@/lib/admin/users';
import { createClient } from '@/lib/supabase/server';
import { createUserFlag } from './actions';

const roleOptions = ['all', 'guest', 'host', 'owner'];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadUsersTrustData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Users & Trust</CardTitle>
          <CardDescription>Guests/hosts overview and trust/risk flag management.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
            <select name="role" defaultValue={data.filters.role} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {roleOptions.map((role) => (
                <option value={role} key={role}>
                  Role: {role}
                </option>
              ))}
            </select>
            <select
              name="flagStatus"
              defaultValue={data.filters.flagStatus}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Flag status: all</option>
              {FLAG_STATUS.map((status) => (
                <option value={status} key={status}>
                  Flag status: {status}
                </option>
              ))}
            </select>
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
          <CardTitle>Create Risk Flag</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserFlag} className="grid gap-3 md:grid-cols-5">
            <Input name="userId" placeholder="User UUID" required />
            <select name="flagType" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="behavior">
              {FLAG_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select name="severity" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="medium">
              {FLAG_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
            <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="open">
              {FLAG_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input name="note" placeholder="Optional note" />
            <Button type="submit" className="md:col-span-5 md:w-fit">
              Add Flag
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Trust Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Open Flags</TableHead>
                <TableHead>Latest Flag</TableHead>
                <TableHead>Latest At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No users found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[260px] truncate" title={row.id}>
                      {row.name}
                    </TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell className="text-right">{row.openFlagCount}</TableCell>
                    <TableCell>
                      {row.latestFlag ? `${row.latestFlag.flag_type} • ${row.latestFlag.severity} • ${row.latestFlag.status}` : '-'}
                    </TableCell>
                    <TableCell>{row.lastFlagAt ? new Date(row.lastFlagAt).toLocaleString() : '-'}</TableCell>
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
