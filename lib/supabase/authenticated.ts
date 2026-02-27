import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function getSupabaseWithAuth(req: Request) {
  const cookieClient = createServerSupabase();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();

  if (cookieUser) {
    return { supabase: cookieClient, user: cookieUser } as const;
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (token) {
    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient.auth.getUser(token);
    if (!error && data?.user) {
      return { supabase: serviceClient, user: data.user } as const;
    }
  }

  return { supabase: cookieClient, user: null } as const;
}
