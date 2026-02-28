import { createBrowserClient } from '@supabase/ssr'

const PUBLIC_SUPABASE_URL = 'NEXT_PUBLIC_SUPABASE_URL'
const PUBLIC_SUPABASE_ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

function readSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
}

function readSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
}

export function getSupabaseClientConfigError(): string | null {
  const missing: string[] = []
  if (!readSupabaseUrl()) missing.push(PUBLIC_SUPABASE_URL)
  if (!readSupabaseAnonKey()) missing.push(PUBLIC_SUPABASE_ANON_KEY)

  if (missing.length === 0) return null

  return `Supabase is not configured. Missing: ${missing.join(', ')}. Add them to .env.local and restart the dev server.`
}

export function createClient() {
  const configError = getSupabaseClientConfigError()
  const url = readSupabaseUrl()
  const anonKey = readSupabaseAnonKey()

  if (configError) {
    throw new Error(configError)
  }

  return createBrowserClient(url, anonKey)
}
