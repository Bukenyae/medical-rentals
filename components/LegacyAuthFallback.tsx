'use client'

import { createClient } from '@/lib/supabase/client'

interface LegacyAuthFallbackProps {
  email: string
  password: string
  loading: boolean
  onLoadingChange: (value: boolean) => void
  onMessage: (value: string) => void
}

export default function LegacyAuthFallback({
  email,
  password,
  loading,
  onLoadingChange,
  onMessage,
}: LegacyAuthFallbackProps) {
  const supabase = createClient()

  const handleLegacySignIn = async () => {
    onLoadingChange(true)
    onMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      onMessage(error.message)
      onLoadingChange(false)
      return
    }

    window.location.replace('/auth/continue')
  }

  const handleMagicLink = async () => {
    onLoadingChange(true)
    onMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    onMessage(error ? error.message : 'Check your email for a secure sign-in link.')
    onLoadingChange(false)
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
      <p className="mb-3">
        Clerk is unavailable right now. Use legacy Belle Rouge sign-in for existing accounts.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleLegacySignIn}
          disabled={loading || !email || !password}
          className="rounded-lg bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          Legacy Sign In
        </button>
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading || !email}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-800 disabled:opacity-50"
        >
          Email Magic Link
        </button>
      </div>
    </div>
  )
}
