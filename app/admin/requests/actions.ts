'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PIPELINE_STAGES } from '@/lib/admin/requests';

const allowedStages = new Set(PIPELINE_STAGES.map((s) => s.key));

export async function updateRequestStage(formData: FormData) {
  const bookingId = String(formData.get('bookingId') ?? '');
  const nextStage = String(formData.get('nextStage') ?? '').toLowerCase();

  if (!bookingId || !allowedStages.has(nextStage)) {
    return;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from('bookings')
    .select('id,status,pipeline_stage,kind')
    .eq('id', bookingId)
    .maybeSingle();

  if (!existing || !['event', 'film'].includes((existing.kind || '').toLowerCase())) {
    return;
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ pipeline_stage: nextStage })
    .eq('id', bookingId);

  if (!updateError) {
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      action: 'pipeline_stage_updated',
      entity_type: 'booking',
      entity_id: bookingId,
      before: { pipeline_stage: existing.pipeline_stage ?? null, status: existing.status ?? null },
      after: { pipeline_stage: nextStage, status: existing.status ?? null },
    });
  }

  revalidatePath('/admin/requests');
  revalidatePath(`/admin/reservations/${bookingId}`);
}
