'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import AuthModal from './AuthModal'

interface AuthButtonProps {
  user: User | null
}

export default function AuthButton({ user }: AuthButtonProps) {
  const supabase = createClient()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    window.location.reload()
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
    setIsMenuOpen(false)
  }

  if (user) {
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
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    )
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
            onClick={() => openAuthModal('signin')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuthModal('signup')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign Up
          </button>
        </div>
      )}
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  )
}