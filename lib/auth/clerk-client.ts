export function buildClerkContinueUrl(redirectTo: string, role: 'guest' | 'host') {
  const params = new URLSearchParams({ redirect: redirectTo, role })
  return `/auth/continue?${params.toString()}`
}

export function extractClerkErrorMessage(error: any) {
  return String(error?.errors?.[0]?.message || error?.message || '').trim()
}

export async function syncClerkIdentity(role: 'guest' | 'host') {
  const response = await fetch('/api/clerk/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || 'Failed to link your Belle Rouge account')
  }
}

export async function recoverAlreadyVerifiedSignUp(params: {
  signUp: any
  signIn: any
  signInLoaded: boolean
  email: string
  password: string
}) {
  const refreshed = await params.signUp.reload().catch(() => null)

  if (refreshed?.status === 'complete' && refreshed.createdSessionId) {
    return { sessionId: refreshed.createdSessionId as string }
  }

  if (params.signInLoaded) {
    const result = await params.signIn
      .create({ identifier: params.email, password: params.password })
      .catch(() => null)

    if (result?.status === 'complete') {
      return { sessionId: result.createdSessionId as string }
    }
  }

  return {
    sessionId: null,
    message: 'Your email is already verified. Sign in with the new password you just created.',
  }
}
