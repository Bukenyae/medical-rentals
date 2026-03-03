import HomeClient from './home-client';
import { fetchPublishedProperties } from '@/lib/queries/properties';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;

export default async function Home() {
  const supabase = createClient();

  try {
    const data = await fetchPublishedProperties(supabase);
    return <HomeClient initialProperties={data} initialError={null} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <HomeClient initialProperties={[]} initialError={message || 'Unable to load properties.'} />;
  }
}
