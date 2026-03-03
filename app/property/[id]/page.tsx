import PropertyDetailsClient, {
  DbPropertyRow,
  HostProfileRow,
} from './property-details-client';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;

interface PropertyDetailsProps {
  params: {
    id: string;
  };
}

export default async function PropertyDetails({ params }: PropertyDetailsProps) {
  const supabase = createClient();
  const pid = params.id;

  const basePropertySelect =
    'id,title,address,map_url,proximity_badge_1,proximity_badge_2,nightly_price,minimum_nights,bedrooms,bathrooms,sqft,cover_image_url,is_published,created_by,owner_id,about_space,indoor_outdoor_experiences,amenities_list,cleaning_fee_pct,weekly_discount_pct,weekly_price,monthly_discount_pct,monthly_price,host_bio,host_avatar_url';
  const extendedPropertySelect = `${basePropertySelect},minimum_event_hours,event_hourly_from_cents,max_event_guests,attendee_pricing_tiers,event_instant_book_enabled,event_curfew_time,event_multi_day_discount_pct,event_overnight_holding_pct,base_power_details,base_parking_capacity`;

  let initialDbProperty: DbPropertyRow | null = null;
  let initialDbError: string | null = null;
  let initialDbImages: string[] = [];
  let initialUnavailableDates: string[] = [];
  let initialHostProfile: HostProfileRow | null = null;

  try {
    const propertyFetchPromise = (async () => {
      const extendedResult = await supabase
        .from('properties')
        .select(extendedPropertySelect)
        .eq('id', pid)
        .limit(1)
        .maybeSingle();

      if (!extendedResult.error) return extendedResult;

      const message = extendedResult.error.message ?? '';
      const missingEventColumns =
        message.includes('minimum_event_hours') ||
        message.includes('event_hourly_from_cents') ||
        message.includes('max_event_guests') ||
        message.includes('attendee_pricing_tiers') ||
        message.includes('event_instant_book_enabled') ||
        message.includes('event_curfew_time') ||
        message.includes('event_multi_day_discount_pct') ||
        message.includes('event_overnight_holding_pct') ||
        message.includes('base_power_details') ||
        message.includes('base_parking_capacity');

      if (!missingEventColumns) return extendedResult;

      return supabase
        .from('properties')
        .select(basePropertySelect)
        .eq('id', pid)
        .limit(1)
        .maybeSingle();
    })();

    const [propResult, imgsResult, blocksResult] = await Promise.all([
      propertyFetchPromise,
      supabase
        .from('property_images')
        .select('url')
        .eq('property_id', pid)
        .eq('is_approved', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('property_unavailable_dates')
        .select('date')
        .eq('property_id', pid),
    ]);

    if (propResult.error) {
      const err: any = propResult.error;
      initialDbError = err?.code === 'PGRST116' ? 'not_found' : err?.message ?? 'Unable to load property';
    } else if (propResult.data) {
      initialDbProperty = propResult.data as unknown as DbPropertyRow;
    } else {
      initialDbError = 'not_found';
    }

    if (!imgsResult.error && Array.isArray(imgsResult.data)) {
      initialDbImages = imgsResult.data.map((row: any) => row?.url).filter(Boolean);
    }

    if (!blocksResult.error && Array.isArray(blocksResult.data)) {
      const isoList = blocksResult.data
        .map((r: any) => r?.date)
        .filter(Boolean)
        .map((d: string) => new Date(d))
        .map((dt: Date) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())))
        .map((dt: Date) => dt.toISOString().slice(0, 10));
      initialUnavailableDates = Array.from(new Set(isoList));
    }

    const hostId = initialDbProperty?.owner_id ?? initialDbProperty?.created_by;
    if (hostId) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id,first_name,last_name,avatar_url,created_at')
        .eq('id', hostId)
        .limit(1)
        .maybeSingle();

      if (userProfile) {
        initialHostProfile = {
          id: userProfile.id,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          full_name: [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || null,
          avatar_url: userProfile.avatar_url ?? null,
          created_at: userProfile.created_at ?? null,
        };
      } else {
        const { data: profileFallback } = await supabase
          .from('profiles')
          .select('id,full_name,name,avatar_url,created_at')
          .eq('id', hostId)
          .limit(1)
          .maybeSingle();
        if (profileFallback) {
          initialHostProfile = profileFallback as HostProfileRow;
        }
      }
    }
  } catch (error) {
    initialDbError = error instanceof Error ? error.message : String(error);
  }

  return (
    <PropertyDetailsClient
      initialDbProperty={initialDbProperty}
      initialDbImages={initialDbImages}
      initialUnavailableDates={initialUnavailableDates}
      initialDbError={initialDbError}
      initialHostProfile={initialHostProfile}
    />
  );
}
