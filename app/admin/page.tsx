import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadOverviewData } from '@/lib/admin/overview';
import { createClient } from '@/lib/supabase/server';

function deltaClass(tone: 'up' | 'down' | 'neutral') {
  if (tone === 'up') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (tone === 'down') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadOverviewData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Overview Filters</CardTitle>
          <CardDescription>Adjust the reporting window and property scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto_auto]" method="get">
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
            <Button type="submit">Apply</Button>
            <Button asChild variant="outline">
              <Link href="/admin">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              Some admin metrics are partial. Run migrations `017_admin_portal_foundation.sql` and seed script for full coverage.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpi.subLabel ? <p className="text-xs text-slate-600">{kpi.subLabel}</p> : null}
              <Badge className={deltaClass(kpi.deltaTone)} variant="outline">
                {kpi.deltaText}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Trend Snapshot</CardTitle>
          <CardDescription>GMV and platform revenue by 7-day window.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Starting</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">Platform Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.trend.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.gmv)}</TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.platformRevenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
