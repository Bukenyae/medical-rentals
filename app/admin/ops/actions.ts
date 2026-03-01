'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { OPS_STATUS, OPS_TYPES, parseOpsDueDate } from '@/lib/admin/ops';

const allowedStatus = new Set(OPS_STATUS);
const allowedTypes = new Set(OPS_TYPES);

export async function createOpsTask(formData: FormData) {
  const propertyId = String(formData.get('propertyId') ?? '').trim();
  const bookingId = String(formData.get('bookingId') ?? '').trim();
  const taskType = String(formData.get('taskType') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const assignedTo = String(formData.get('assignedTo') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!propertyId || !allowedTypes.has(taskType) || !allowedStatus.has(status)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dueAt = parseOpsDueDate(formData.get('dueDate'));

  await supabase.from('ops_tasks').insert({
    property_id: propertyId,
    booking_id: bookingId || null,
    task_type: taskType,
    status,
    assigned_to: assignedTo || null,
    due_at: dueAt,
    notes: notes || null,
    created_by: user?.id ?? null,
  });

  revalidatePath('/admin/ops');
}
