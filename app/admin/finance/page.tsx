import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadFinanceData } from '@/lib/admin/finance';
import { formatCurrency } from '@/lib/admin/shared';
import { createClient } from '@/lib/supabase/server';

const tabs = [
  { key: 'gmv', label: 'GMV' },
  { key: 'revenue', label: 'Platform Revenue' },
  { key: 'payouts', label: 'Owner Payouts' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'fcf', label: 'FCF Proxy' },
] as const;

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadFinanceData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Finance Dashboard</CardTitle>
          <CardDescription>{data.definitions[data.filters.tab]}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]" method="get">
            <Input type="date" name="from" defaultValue={data.filters.from} />
            <Input type="date" name="to" defaultValue={data.filters.to} />
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
            <input type="hidden" name="tab" value={data.filters.tab} />
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button asChild variant={data.filters.tab === tab.key ? 'default' : 'outline'} key={tab.key}>
            <Link href={`/admin/finance?tab=${tab.key}&from=${data.filters.from}&to=${data.filters.to}&propertyId=${data.filters.propertyId}`}>
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {data.kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            {kpi.sub ? (
              <CardContent>
                <p className="text-xs text-slate-500">{kpi.sub}</p>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>Grouped totals for the selected finance tab and filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.breakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500">
                    No finance records in selected range.
                  </TableCell>
                </TableRow>
              ) : (
                data.breakdown.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
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
