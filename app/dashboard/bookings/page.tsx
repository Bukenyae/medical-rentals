'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import GuestDashboard from '@/components/GuestDashboard'
import GuestProfileManager from '@/components/GuestProfileManager'

export default function BookingsDashboardPage() {
  const { user } = useAuth()
  const [showProfileManager, setShowProfileManager] = useState(false)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        
        <button
          type="button"
          onClick={() => setShowProfileManager(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Manage Profile
        </button>
      </div>
      
      <GuestDashboard />
      
      {/* Profile Manager Modal */}
      {showProfileManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <GuestProfileManager onClose={() => setShowProfileManager(false)} />
          </div>
        </div>
      )}
    </div>
  )
}