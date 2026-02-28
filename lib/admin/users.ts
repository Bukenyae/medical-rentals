type UserProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  phone?: string | null;
};

type UserFlagRow = {
  id: string;
  user_id: string;
  flag_type: string;
  severity: string;
  status: string;
  note?: string | null;
  created_at: string;
};

const TARGET_ROLES = new Set(['guest', 'host', 'owner']);

function fullName(profile: UserProfileRow) {
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.id;
}

export async function loadUsersTrustData(supabase: any, searchParams: Record<string, string | string[] | undefined>) {
  const roleFilter = typeof searchParams.role === 'string' ? searchParams.role : 'all';
  const statusFilter = typeof searchParams.flagStatus === 'string' ? searchParams.flagStatus : 'all';
  const warnings: string[] = [];

  const { data: profilesData, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id,first_name,last_name,role,phone')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (profilesError) warnings.push(`Profiles query failed: ${profilesError.message}`);
  const profiles = ((profilesData ?? []) as UserProfileRow[]).filter((p) => {
    if (!TARGET_ROLES.has((p.role || '').toLowerCase())) return false;
    if (roleFilter === 'all') return true;
    return (p.role || '').toLowerCase() === roleFilter.toLowerCase();
  });

  const { data: flagsData, error: flagsError } = await supabase
    .from('user_flags')
    .select('id,user_id,flag_type,severity,status,note,created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (flagsError) warnings.push(`User flags query failed: ${flagsError.message}`);
  const flags = (flagsData ?? []) as UserFlagRow[];

  const filteredFlags = flags.filter((flag) => {
    if (statusFilter === 'all') return true;
    return (flag.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const flagsByUser = new Map<string, UserFlagRow[]>();
  for (const flag of filteredFlags) {
    const list = flagsByUser.get(flag.user_id) ?? [];
    list.push(flag);
    flagsByUser.set(flag.user_id, list);
  }

  const rows = profiles.map((profile) => {
    const userFlags = flagsByUser.get(profile.id) ?? [];
    const openFlags = userFlags.filter((flag) => ['open', 'reviewing'].includes((flag.status || '').toLowerCase()));
    return {
      id: profile.id,
      name: fullName(profile),
      role: profile.role ?? 'guest',
      phone: profile.phone ?? '-',
      openFlagCount: openFlags.length,
      lastFlagAt: userFlags[0]?.created_at ?? null,
      latestFlag: userFlags[0] ?? null,
    };
  });

  return {
    filters: { role: roleFilter, flagStatus: statusFilter },
    rows,
    warnings,
  };
}

export const FLAG_TYPES = ['identity', 'payment', 'behavior', 'incident', 'other'];
export const FLAG_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const FLAG_STATUS = ['open', 'reviewing', 'resolved', 'dismissed'];
