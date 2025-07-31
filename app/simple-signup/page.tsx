'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export default function SimpleSignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  const handleSimpleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Simple signup without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'guest',
            email_confirm: false
          }
        }
      })

      if (error) {
        setMessage(`Sign-up error: ${error.message}`)
      } else if (data.user) {
        if (data.user.email_confirmed_at) {
          setMessage('Account created successfully! You are now signed in.')
          setUser(data.user)
        } else {
          setMessage('Account created! Please check your email for confirmation link.')
        }
      }
    } catch (err) {
      setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    
    setLoading(false)
  }

  const handleSimpleSignIn = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Sign-in error: ${error.message}`)
      } else {
        setMessage('Signed in successfully!')
        setUser(data.user)
      }
    } catch (err) {
      setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setMessage('Redirecting to Google...')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`Google OAuth error: ${error.message}`)
        setLoading(false)
      }
      // If successful, user will be redirected
    } catch (err) {
      setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  const checkCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setMessage(`Current user: ${user.email}`)
    } else {
      setMessage('No current user')
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setMessage('Signed out successfully')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Heart className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Simple Authentication Test
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bypass user profile creation issues
          </p>
        </div>

        {message && (
          <div className={`border px-4 py-3 rounded ${
            message.includes('successfully') || message.includes('created') || message.includes('Current user')
              ? 'bg-green-100 border-green-400 text-green-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {user && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Authenticated User:</h3>
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
            <p>Confirmed: {user.email_confirmed_at ? 'Yes' : 'No'}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSimpleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Create a password (min 6 characters)"
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account (Simple)'}
            </button>

            <button
              type="button"
              onClick={handleSimpleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Redirecting...' : 'Sign Up with Google'}
            </button>
          </div>
        </form>

        <div className="flex space-x-4">
          <button
            onClick={checkCurrentUser}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Check User
          </button>
          {user && (
            <button
              onClick={handleSignOut}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          )}
        </div>

        <div className="text-center space-y-2">
          <Link href="/" className="block text-blue-600 hover:text-blue-500">
            ← Back to home
          </Link>
          <Link href="/auth/signup" className="block text-blue-600 hover:text-blue-500">
            Try original signup
          </Link>
        </div>
      </div>
    </div>
  )
}