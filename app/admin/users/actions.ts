'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { FLAG_SEVERITIES, FLAG_STATUS, FLAG_TYPES } from '@/lib/admin/users';

const allowedTypes = new Set(FLAG_TYPES);
const allowedSeverities = new Set(FLAG_SEVERITIES);
const allowedStatus = new Set(FLAG_STATUS);

export async function createUserFlag(formData: FormData) {
  const userId = String(formData.get('userId') ?? '').trim();
  const flagType = String(formData.get('flagType') ?? '').trim().toLowerCase();
  const severity = String(formData.get('severity') ?? '').trim().toLowerCase();
  const status = String(formData.get('status') ?? '').trim().toLowerCase();
  const note = String(formData.get('note') ?? '').trim();

  if (!userId || !allowedTypes.has(flagType) || !allowedSeverities.has(severity) || !allowedStatus.has(status)) {
    return;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from('user_flags')
    .insert({
      user_id: userId,
      flagged_by: user?.id ?? null,
      flag_type: flagType,
      severity,
      status,
      note: note || null,
    })
    .select('id,user_id,flag_type,severity,status,note')
    .maybeSingle();

  if (!error && inserted) {
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      action: 'user_flag_created',
      entity_type: 'user_flag',
      entity_id: inserted.id,
      before: null,
      after: inserted,
    });
  }

  revalidatePath('/admin/users');
}
