import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSessionUser } from '@/lib/auth/session-user'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const sessionUser = await buildSessionUser({
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
    avatarUrl:
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null,
  })

  return NextResponse.json({ user: sessionUser })
}
