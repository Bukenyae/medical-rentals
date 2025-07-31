import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/test-oauth - Test OAuth configuration
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Test if we can get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Get environment variables (without exposing secrets)
    const envCheck = {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
      node_env: process.env.NODE_ENV
    }

    // Test basic Supabase connection
    let dbTest = null
    try {
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
      dbTest = { success: !error, error: error?.message }
    } catch (e) {
      dbTest = { success: false, error: 'Connection failed' }
    }

    return NextResponse.json({
      status: 'OAuth Configuration Test',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbTest,
      session: session ? {
        user_id: session.user?.id,
        expires_at: session.expires_at
      } : null,
      oauth_test_instructions: {
        step1: 'Verify Google Cloud Console has correct redirect URI',
        step2: 'Verify Supabase has Google OAuth enabled with Client ID/Secret',
        step3: 'Try OAuth flow again',
        debug_url: `${request.nextUrl.origin}/api/auth/debug`
      },
      expected_redirect_uri: 'https://yewtveuzyqoairuttjcs.supabase.co/auth/v1/callback',
      current_domain: request.headers.get('host')
    })

  } catch (error) {
    console.error('OAuth test error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}