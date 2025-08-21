'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import AuthModal from '@/components/AuthModal'
import Avatar from '@/components/ui/Avatar'
import AccountMenu from '@/components/AccountMenu'

interface AuthButtonProps {
  user: User | null
}

export default function AuthButton({ user }: AuthButtonProps) {
  const supabase = createClient()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [modalMode, setModalMode] = useState<'signin' | 'signup'>('signin')
  const [forceRole, setForceRole] = useState<'guest' | 'host'>('guest')
  const avatarUrl = (user?.user_metadata as any)?.avatar_url as string | undefined
  const displayName = (user?.user_metadata as any)?.name as string | undefined

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    // Send user to homepage to avoid landing on a protected portal route
    window.location.replace('/')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const go = (path: string) => {
    setIsMenuOpen(false)
    window.location.href = path
  }

  if (user) {
    return <AccountMenu user={user} variant="icon" />
  }

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        {isMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>
      
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
          <button
            onClick={() => { setForceRole('guest'); setModalMode('signup'); setShowAuthModal(true); setIsMenuOpen(false) }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Guest Sign Up
          </button>
          <button
            onClick={() => { setForceRole('guest'); setModalMode('signin'); setShowAuthModal(true); setIsMenuOpen(false) }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Guest Sign In
          </button>
          <button
            onClick={() => { setForceRole('host'); setModalMode('signin'); setShowAuthModal(true); setIsMenuOpen(false) }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Host Sign In
          </button>
        </div>
      )}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={modalMode}
        forceRole={forceRole}
      />
    </div>
  )
}