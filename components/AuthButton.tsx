'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

interface AuthButtonProps {
  user: User | null
}

export default function AuthButton({ user }: AuthButtonProps) {
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/auth/signin"
        className="text-gray-700 hover:text-blue-600"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Sign Up
      </Link>
    </div>
  )
}