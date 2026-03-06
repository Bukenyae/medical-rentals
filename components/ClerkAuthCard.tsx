'use client'

import { useEffect, useRef, useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { Eye, EyeOff } from 'lucide-react'
import {
  buildClerkContinueUrl,
  extractClerkErrorMessage,
  isClerkNetworkError,
  recoverAlreadyVerifiedSignUp,
  syncClerkIdentity,
} from '@/lib/auth/clerk-client'
import LegacyAuthFallback from '@/components/LegacyAuthFallback'
interface ClerkAuthCardProps {
  forceRole?: 'guest' | 'host'
  initialMode?: 'signin' | 'signup'
  redirectTo?: string
  onClose?: () => void
  onModeChange?: (mode: 'signin' | 'signup') => void
}

export default function ClerkAuthCard({
  forceRole = 'guest',
  initialMode = 'signin',
  redirectTo,
  onClose,
  onModeChange,
}: ClerkAuthCardProps) {
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn()
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showRecoveryHint, setShowRecoveryHint] = useState(false)
  const [legacyMode, setLegacyMode] = useState(false)
  const didRedirect = useRef(false)
  useEffect(() => {
    setMode(initialMode)
    resetVerificationState()
  }, [initialMode])
  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])
  const resolvedRedirect = redirectTo ?? (forceRole === 'host' ? '/portal/host' : '/portal/guest')
  const resetVerificationState = () => {
    setVerificationCode('')
    setPendingVerification(false)
    setMessage('')
    setShowRecoveryHint(false)
  }

  const enableRecoveryMode = (nextMessage?: string) => {
    setMode('signup')
    setPendingVerification(false)
    setVerificationCode('')
    setShowRecoveryHint(true)
    setMessage(
      nextMessage ||
        'Your old Supabase password will not work here. Create or recover your Clerk account with this same email, then your legacy Belle Rouge data will link automatically after sign-in.'
    )
    onModeChange?.('signup')
  }
  const finishAuth = async (sessionId?: string | null) => {
    if (!sessionId || didRedirect.current) return
    didRedirect.current = true
    try {
      if (mode === 'signin') {
        await setActiveSignIn?.({ session: sessionId })
      } else {
        await setActiveSignUp?.({ session: sessionId })
      }
      await syncClerkIdentity(forceRole)
      onClose?.()
      window.location.replace(resolvedRedirect)
    } catch (error: any) {
      didRedirect.current = false
      setMessage(extractClerkErrorMessage(error) || 'We could not finish linking your account')
    }
  }
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInLoaded || loading) return
    setLoading(true)
    setMessage('')
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })
      if (result.status === 'complete') {
        await finishAuth(result.createdSessionId)
      } else {
        setMessage('Additional sign-in verification is required.')
      }
    } catch (error: any) {
      const rawMessage = extractClerkErrorMessage(error).toLowerCase()
      if (
        rawMessage.includes('password') ||
        rawMessage.includes('credentials') ||
        rawMessage.includes('identifier') ||
        rawMessage.includes('account') ||
        rawMessage.includes('not found')
      ) {
        enableRecoveryMode()
      } else if (isClerkNetworkError(rawMessage)) {
        setLegacyMode(true)
        setMode('signin')
        setPendingVerification(false)
        setMessage('Clerk is temporarily unavailable. Use your legacy Belle Rouge credentials below.')
      } else {
        setMessage(error?.errors?.[0]?.message || 'Sign in failed')
        setShowRecoveryHint(false)
      }
    }
    setLoading(false)
  }
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded || loading) return
    setLoading(true)
    setMessage('')
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: { role: forceRole },
      })
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      })
      setPendingVerification(true)
      setMessage('Enter the verification code sent to your email.')
    } catch (error: any) {
      const rawMessage = extractClerkErrorMessage(error)
      const lowered = rawMessage.toLowerCase()
      if (lowered.includes('already exists') || lowered.includes('already registered')) {
        setMode('signin')
        setPendingVerification(false)
        setShowRecoveryHint(false)
        setMessage('This email already has a Clerk account. Sign in with your new password or use a social provider linked to this email.')
      } else if (isClerkNetworkError(lowered)) {
        setLegacyMode(true)
        setMode('signin')
        setPendingVerification(false)
        setMessage('Clerk is temporarily unavailable. Use your legacy Belle Rouge credentials below.')
      } else {
        setMessage(rawMessage || 'Sign up failed')
      }
    }
    setLoading(false)
  }
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded || loading) return
    setLoading(true)
    setMessage('')
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      })
      if (result.status === 'complete') {
        await finishAuth(result.createdSessionId)
      } else {
        setMessage('Verification is not complete yet.')
      }
    } catch (error: any) {
      const rawMessage = extractClerkErrorMessage(error)
      const lowered = rawMessage.toLowerCase()
      if (lowered.includes('already verified')) {
        const recovered = await recoverAlreadyVerifiedSignUp({
          signUp,
          signIn,
          signInLoaded,
          email,
          password,
        })

        if (recovered.sessionId) {
          await finishAuth(recovered.sessionId)
        } else {
          setPendingVerification(false)
          setMode('signin')
          setMessage(recovered.message)
        }
      } else {
        if (isClerkNetworkError(lowered)) {
          setLegacyMode(true)
          setPendingVerification(false)
          setMode('signin')
          setMessage('Clerk is temporarily unavailable. Use your legacy Belle Rouge credentials below.')
        } else {
          setMessage(rawMessage || 'Verification failed')
        }
      }
    }
    setLoading(false)
  }
  const handleSocial = async (strategy: 'oauth_google' | 'oauth_apple' | 'oauth_linkedin_oidc') => {
    if (!signInLoaded || loading) return
    setLoading(true)
    setMessage('')
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: buildClerkContinueUrl(resolvedRedirect, forceRole),
      })
    } catch (error: any) {
      const rawMessage = extractClerkErrorMessage(error)
      if (isClerkNetworkError(rawMessage)) {
        setLegacyMode(true)
        setMode('signin')
        setMessage('Clerk social sign-in is unavailable. Use your legacy Belle Rouge credentials below.')
      } else {
        setMessage(rawMessage || 'Social sign in failed')
      }
      setLoading(false)
    }
  }
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => handleSocial('oauth_apple')} disabled={loading} className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-white disabled:opacity-60">Apple</button>
        <button type="button" onClick={() => handleSocial('oauth_google')} disabled={loading} className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-white disabled:opacity-60">Google</button>
        <button type="button" onClick={() => handleSocial('oauth_linkedin_oidc')} disabled={loading} className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-white disabled:opacity-60">LinkedIn</button>
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <form onSubmit={pendingVerification ? handleVerification : (mode === 'signin' ? handleSignIn : handleSignUp)} className="space-y-4">
        {!pendingVerification && <div><label htmlFor="clerk-auth-email" className="mb-1 block text-sm font-medium text-gray-700">Email address</label><input id="clerk-auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white/95 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email" /></div>}
        {!pendingVerification && (
          <div>
            <label htmlFor="clerk-auth-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input id="clerk-auth-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white/95 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        {!pendingVerification && mode === 'signup' && <div><label htmlFor="clerk-auth-confirm-password" className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label><input id="clerk-auth-confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white/95 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Confirm your password" /></div>}
        {pendingVerification && <div><label htmlFor="clerk-auth-verification-code" className="mb-1 block text-sm font-medium text-gray-700">Verification code</label><input id="clerk-auth-verification-code" type="text" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white/95 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter code" /></div>}
        {message && <div className={`rounded-lg border px-3 py-2 text-sm ${message.toLowerCase().includes('code sent') ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</div>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400">{loading ? 'Please wait...' : pendingVerification ? 'Verify Email' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <div className="mt-4 text-center text-sm text-gray-600">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => {
            const nextMode = mode === 'signin' ? 'signup' : 'signin'
            setMode(nextMode)
            resetVerificationState()
            onModeChange?.(nextMode)
          }}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
      {legacyMode && (
        <LegacyAuthFallback
          email={email}
          password={password}
          loading={loading}
          onLoadingChange={setLoading}
          onMessage={setMessage}
        />
      )}
      {mode === 'signin' && !pendingVerification && <div className="mt-3 text-center text-sm text-gray-600"><button type="button" onClick={() => enableRecoveryMode()} className="font-medium text-blue-600 hover:text-blue-500">Recover an older Belle Rouge account</button></div>}
      {showRecoveryHint && mode === 'signup' && !pendingVerification && <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">Use the same email address from your older account. After you verify the email and sign in, your legacy properties, bookings, and roles can be linked automatically.</div>}
    </>
  )
}
