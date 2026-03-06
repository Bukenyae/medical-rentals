import { getServiceSupabase } from '@/lib/supabase/service'
import { AppAuthUser, AppRole, normalizeRole } from '@/lib/auth/app-user'

async function resolveLegacyRole(userId: string, email: string) {
  const fallbackRole = normalizeRole(undefined, email) ?? 'guest'
  const supabase = getServiceSupabase()

  for (const table of ['user_profiles', 'profiles'] as const) {
    const { data, error } = await supabase
      .from(table)
      .select('role')
      .eq('id', userId)
      .maybeSingle<{ role: string | null }>()

    if (!error && data?.role) {
      return normalizeRole(data.role, email) ?? fallbackRole
    }
  }

  return fallbackRole
}

export async function buildSessionUser(params: {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
  requestedRole?: AppRole
}): Promise<AppAuthUser> {
  const role =
    normalizeRole(params.requestedRole, params.email) ??
    (await resolveLegacyRole(params.id, params.email))

  return {
    id: params.id,
    clerk_user_id: params.id,
    legacy_supabase_user_id: params.id,
    email: params.email,
    user_metadata: {
      name: params.name ?? undefined,
      avatar_url: params.avatarUrl ?? undefined,
      role,
    },
  }
}
