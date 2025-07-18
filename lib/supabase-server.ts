import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

// Server component helper
export const createSupabaseServerClient = () => createServerComponentClient<Database>({ cookies })