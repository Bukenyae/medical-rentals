'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function ClerkAuthContinuePage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Finishing your Belle Rouge sign-in...')

  const redirectTarget = useMemo(() => {
    const explicit = searchParams.get('redirect')
    if (explicit) return explicit

    return searchParams.get('role') === 'host' ? '/portal/host' : '/portal/guest'
  }, [searchParams])

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user) {
      window.location.replace('/auth/signin')
      return
    }

    let active = true

    void (async () => {
      try {
        const response = await fetch('/api/clerk/identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: searchParams.get('role') || 'guest',
            name: user.fullName ?? user.firstName ?? undefined,
            avatarUrl: user.imageUrl ?? undefined,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to sync your Belle Rouge account')
        }

        if (!active) return
        window.location.replace(redirectTarget)
      } catch (error: any) {
        if (!active) return
        setMessage(error?.message || 'We could not finish your sign-in')
      }
    })()

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, redirectTarget, searchParams, user])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
        <h1 className="text-lg font-semibold text-gray-900">Account recovery</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
