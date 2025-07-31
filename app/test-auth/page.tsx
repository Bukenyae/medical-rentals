'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export default function TestAuth() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  const handleTestSignUp = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(`Sign-up error: ${error.message}`)
    } else {
      setMessage('Sign-up successful! Check email for confirmation.')
      setUser(data.user)
    }
    setLoading(false)
  }

  const handleTestSignIn = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Sign-in error: ${error.message}`)
    } else {
      setMessage('Sign-in successful!')
      setUser(data.user)
    }
    setLoading(false)
  }

  const handleTestGoogleOAuth = async () => {
    setLoading(true)
    setMessage('Attempting Google OAuth...')

    const { data, error } = await supabase.auth.signInWithOAuth({
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
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setMessage('Signed out successfully')
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Authentication Test Page</h1>
          <p className="text-gray-600 mt-2">Test different authentication methods</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('successful') || message.includes('Current user')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {user && (
          <div className="mb-6 p-4 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg">
            <h3 className="font-semibold">Current User:</h3>
            <p>ID: {user.id}</p>
            <p>Email: {user.email}</p>
            <p>Created: {new Date(user.created_at).toLocaleString()}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Email/Password Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Email/Password Authentication</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="flex space-x-4">
                <button
                  onClick={handleTestSignUp}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Test Sign Up
                </button>
                <button
                  onClick={handleTestSignIn}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Test Sign In
                </button>
              </div>
            </div>
          </div>

          {/* Google OAuth Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Google OAuth Test</h2>
            <button
              onClick={handleTestGoogleOAuth}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Testing Google OAuth...' : 'Test Google OAuth'}
            </button>
          </div>

          {/* Utility Buttons */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Utilities</h2>
            <div className="flex space-x-4">
              <button
                onClick={checkCurrentUser}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Check Current User
              </button>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>

          {/* Debug Links */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="space-y-2">
              <a
                href="/api/auth/debug"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                View Auth Debug Info
              </a>
              <a
                href="/api/auth/test-oauth"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                View OAuth Test Info
              </a>
              <a
                href="/api/test-properties"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                Test Property API
              </a>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}