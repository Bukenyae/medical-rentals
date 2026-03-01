import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminNavItems } from './_components/nav';

type ProfileRoleRow = {
  role: string | null;
};

async function resolveAdminRole(userId: string, metadataRole: string | null) {
  const normalizedMetaRole = metadataRole?.toLowerCase() ?? null;
  if (normalizedMetaRole === 'admin' || normalizedMetaRole === 'ops') {
    return normalizedMetaRole;
  }

  const supabase = createClient();
  const profileQueries: Array<'user_profiles' | 'profiles'> = ['user_profiles', 'profiles'];

  for (const table of profileQueries) {
    const { data, error } = await supabase
      .from(table)
      .select('role')
      .eq('id', userId)
      .maybeSingle<ProfileRoleRow>();

    if (!error && data?.role) {
      const role = data.role.toLowerCase();
      if (role === 'admin' || role === 'ops') {
        return role;
      }
    }
  }

  return null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin?next=/admin');
  }

  const role = await resolveAdminRole(user.id, (user.user_metadata?.role as string | undefined) ?? null);

  if (!role) {
    redirect('/portal/guest');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-4 py-6 lg:border-b-0 lg:border-r lg:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">BelleRouge Admin</p>
          <nav className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Admin Portal</h1>
              <p className="text-sm text-slate-600">Operational and financial control center</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              Date range and property filters will appear in Task 4
            </div>
          </header>
          <section className="p-5">{children}</section>
        </main>
      </div>
    </div>
  );
}
