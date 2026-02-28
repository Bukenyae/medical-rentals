import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PIPELINE_STAGES, loadRequestsData } from '@/lib/admin/requests';
import { createClient } from '@/lib/supabase/server';
import { updateRequestStage } from './actions';

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadRequestsData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Requests Pipeline (Events & Film)</CardTitle>
          <CardDescription>CRM stages from inquiry to completion/loss with auditable stage changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto_auto]" method="get">
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
              <Link href="/admin/requests">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-4">
        {data.columns.map((column) => (
          <Card key={column.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{column.title}</CardTitle>
              <CardDescription>{column.items.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.items.length === 0 ? (
                <p className="text-sm text-slate-500">No requests in this stage.</p>
              ) : (
                column.items.map((item) => (
                  <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.subtitle}</p>
                    <p className="text-xs text-slate-600">{item.dateLabel}</p>
                    <p className="text-xs text-slate-500">Guests: {item.guests}</p>
                    {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}

                    <form action={updateRequestStage} className="flex items-center gap-2">
                      <input type="hidden" name="bookingId" value={item.id} />
                      <select
                        name="nextStage"
                        defaultValue={column.key}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {PIPELINE_STAGES.map((stage) => (
                          <option key={stage.key} value={stage.key}>
                            {stage.title}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline" className="h-8 px-2 text-xs">
                        Move
                      </Button>
                    </form>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
