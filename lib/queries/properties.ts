import type { SupabaseClient } from '@supabase/supabase-js';

export const PROPERTIES_REFRESH_EVENT = 'properties:refresh';

export function dispatchPropertiesRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROPERTIES_REFRESH_EVENT));
}

export interface HostPropertyRecord {
  id: string;
  title: string | null;
  address: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft?: number | null;
  nightly_price?: number | null;
  base_price?: number | null;
  weekly_discount_pct?: number | null;
  weekly_price?: number | null;
  monthly_discount_pct?: number | null;
  monthly_price?: number | null;
  cleaning_fee_pct?: number | null;
  proximity_badge_1?: string | null;
  proximity_badge_2?: string | null;
  map_url: string | null;
  is_published: boolean | null;
  cover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  about_space?: string | null;
  indoor_outdoor_experiences?: string | null;
  host_bio?: string | null;
  host_avatar_url?: string | null;
}

export async function fetchHostProperties(
  supabase: SupabaseClient,
  uid: string
): Promise<HostPropertyRecord[]> {
  const [byCreator, byOwner] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('created_by', uid)
      .order('created_at', { ascending: false }),
    supabase
      .from('properties')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false }),
  ]);

  if (byCreator.error) throw byCreator.error;
  if (byOwner.error) throw byOwner.error;

  const creatorRows = (byCreator.data ?? []) as HostPropertyRecord[];
  const ownerRows = (byOwner.data ?? []) as HostPropertyRecord[];

  const map = new Map<string, HostPropertyRecord>();
  creatorRows.forEach((row) => map.set(row.id, row));
  ownerRows.forEach((row) => map.set(row.id, row));

  return Array.from(map.values()).sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });
}

export interface PublishedPropertyRecord extends HostPropertyRecord {
  base_price?: number | null;
}

export async function fetchPublishedProperties(
  supabase: SupabaseClient
): Promise<PublishedPropertyRecord[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PublishedPropertyRecord[];
}
