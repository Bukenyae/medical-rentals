'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBookings } from '@/lib/hooks/useBookings'
import { Booking, BookingStatus } from '@/lib/types'
import BookingCard from './BookingCard'
import BookingDetails from './BookingDetails'

interface GuestDashboardProps {
  initialTab?: 'upcoming' | 'past' | 'all'
}

export default function GuestDashboard({ initialTab = 'upcoming' }: GuestDashboardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>(initialTab)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  
  const { bookings, loading, error, refreshBookings } = useBookings({
    guest_id: user?.id,
    sort_by: 'check_in',
    sort_order: activeTab === 'past' ? 'desc' : 'asc'
  })

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkOut = new Date(booking.check_out)
    
    if (activeTab === 'upcoming') {
      return checkOut >= today && booking.status !== 'cancelled'
    } else if (activeTab === 'past') {
      return checkOut < today || booking.status === 'cancelled'
    }
    
    return true // 'all' tab
  })

  // Handle booking update
  const handleBookingUpdate = () => {
    refreshBookings()
    setSelectedBookingId(null)
  }

  // Handle booking click
  const handleBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId)
  }

  if (!user) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800">Authentication Required</h3>
        <p className="mt-2 text-yellow-700">
          Please sign in to view your bookings.
        </p>
        <button
          type="button"
          onClick={() => router.push('/auth/signin')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <h2 className="text-xl font-semibold">My Bookings</h2>
        <p className="text-blue-100">Manage your reservations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'past'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Bookings
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-gray-500">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming bookings."
                : activeTab === 'past'
                ? "You don't have any past bookings."
                : "You don't have any bookings yet."}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push('/properties')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Properties
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => handleBookingClick(booking.id)}
                className="cursor-pointer"
              >
                <BookingCard
                  booking={booking}
                  onUpdate={handleBookingUpdate}
                  showActions={false}
                  compact={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBookingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <BookingDetails
              bookingId={selectedBookingId}
              onClose={() => setSelectedBookingId(null)}
              onUpdate={handleBookingUpdate}
            />
          </div>
        </div>
      )}
    </div>
  )
}