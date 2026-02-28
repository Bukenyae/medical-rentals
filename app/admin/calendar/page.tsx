import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loadCalendarData } from '@/lib/admin/calendar';
import { createClient } from '@/lib/supabase/server';

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadCalendarData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Calendar & Availability</CardTitle>
          <CardDescription>Unified view of stays, events/film, and explicit calendar blocks.</CardDescription>
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
              <Link href="/admin/calendar">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            Calendar data is partial. Run admin migration `017_admin_portal_foundation.sql`.
          </CardContent>
        </Card>
      ) : null}

      <Card className={data.conflicts.length > 0 ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'}>
        <CardHeader>
          <CardTitle className="text-base">Conflict Warnings</CardTitle>
          <CardDescription>
            {data.conflicts.length > 0
              ? `${data.conflicts.length} overlap(s) detected in selected range.`
              : 'No overlaps detected in selected range.'}
          </CardDescription>
        </CardHeader>
        {data.conflicts.length > 0 ? (
          <CardContent className="space-y-2">
            {data.conflicts.slice(0, 10).map((conflict) => (
              <p className="text-sm text-rose-900" key={conflict}>
                {conflict}
              </p>
            ))}
          </CardContent>
        ) : null}
      </Card>

      <div className="space-y-3">
        {data.groupedByDay.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-slate-600">No calendar items in the selected range.</CardContent>
          </Card>
        ) : (
          data.groupedByDay.map((group) => (
            <Card key={group.day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((item) => (
                  <div className="rounded-lg border border-slate-200 bg-white p-3" key={`${item.source}-${item.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{item.propertyTitle}</p>
                      <Badge variant={item.source === 'booking' ? 'secondary' : 'outline'}>{item.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.start.toLocaleString()} - {item.end.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{item.statusLabel}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
