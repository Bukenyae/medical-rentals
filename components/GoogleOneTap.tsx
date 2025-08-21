'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GoogleOneTap() {
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    // Pause One Tap on auth and portal routes to avoid overlay conflicts
    try {
      const path = window.location.pathname
      if (path.startsWith('/auth') || path.startsWith('/portal')) {
        return
      }
    } catch {}

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      ;(window as any).google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }: { credential?: string }) => {
          if (!credential) return
          const supabase = createClient()
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
          })
        },
      })
      ;(window as any).google?.accounts.id.prompt()
    }
    document.head.appendChild(script)
  }, [])

  return null
}
