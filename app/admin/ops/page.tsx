import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OPS_STATUS, OPS_TYPES, loadOpsData } from '@/lib/admin/ops';
import { createClient } from '@/lib/supabase/server';
import { createOpsTask } from './actions';

export default async function AdminOpsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const data = await loadOpsData(supabase, searchParams);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Ops Tasks</CardTitle>
          <CardDescription>Lightweight assignment board for cleaning, prep, and vendor tasks.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createOpsTask} className="grid gap-3 md:grid-cols-4">
            <select name="propertyId" required className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Property</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <Input name="bookingId" placeholder="Booking ID (optional)" />
            <select name="taskType" defaultValue="cleaning" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {OPS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select name="status" defaultValue="todo" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {OPS_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input name="assignedTo" placeholder="Assigned user ID (optional)" />
            <Input name="dueDate" type="date" />
            <Input name="notes" placeholder="Notes" className="md:col-span-2" />
            <Button type="submit" className="md:w-fit">
              Add Task
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 md:grid-cols-[1.5fr_1fr_auto]" method="get">
            <select name="propertyId" defaultValue={data.filters.propertyId} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All properties</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={data.filters.status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All statuses</option>
              {OPS_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>

          <div className="space-y-2">
            {data.rows.length === 0 ? (
              <p className="text-sm text-slate-500">No ops tasks found.</p>
            ) : (
              data.rows.map((task) => (
                <div className="rounded-lg border border-slate-200 p-3" key={task.id}>
                  <p className="text-sm font-medium text-slate-900">{task.propertyTitle} • {task.task_type}</p>
                  <p className="text-xs text-slate-600">Status: {task.status} • Due: {task.due_at ? new Date(task.due_at).toLocaleDateString() : '-'}</p>
                  <p className="text-xs text-slate-600">Assigned: {task.assigned_to ?? '-'} • Booking: {task.booking_id ?? '-'}</p>
                  {task.notes ? <p className="mt-1 text-xs text-slate-500">{task.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {data.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{data.warnings.join(' ')}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
