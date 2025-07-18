'use client'

import { useState, useEffect } from 'react'
import { GuestDetails, Booking } from '@/lib/types'
import { useBookings } from '@/lib/hooks/useBookings'

interface GuestProfileProps {
  guestId: string
  onClose?: () => void
  onUpdate?: (guestDetails: GuestDetails) => void
}

interface GuestProfileData extends GuestDetails {
  totalBookings: number
  totalSpent: number
  lastBooking?: string
  bookingHistory: Booking[]
}

export default function GuestProfile({ guestId, onClose, onUpdate }: GuestProfileProps) {
  const [guestData, setGuestData] = useState<GuestProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<GuestDetails>({
    name: '',
    email: '',
    phone: '',
    purpose_of_visit: ''
  })

  const { bookings: guestBookings, loading: bookingsLoading } = useBookings({ guest_id: guestId })

  useEffect(() => {
    if (!bookingsLoading && guestBookings.length > 0) {
      const firstBooking = guestBookings[0]
      const totalSpent = guestBookings.reduce((sum, booking) => sum + booking.total_amount, 0)
      const lastBookingDate = guestBookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at

      const profileData: GuestProfileData = {
        name: firstBooking.guest_details?.name || '',
        email: firstBooking.guest_details?.email || '',
        phone: firstBooking.guest_details?.phone || '',
        purpose_of_visit: firstBooking.guest_details?.purpose_of_visit,
        totalBookings: guestBookings.length,
        totalSpent,
        lastBooking: lastBookingDate,
        bookingHistory: guestBookings
      }

      setGuestData(profileData)
      setEditData({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        purpose_of_visit: profileData.purpose_of_visit
      })
      setLoading(false)
    } else if (!bookingsLoading) {
      setError('No booking data found for this guest')
      setLoading(false)
    }
  }, [guestBookings, bookingsLoading])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSave = async () => {
    if (!guestData) return

    try {
      // Update guest details in all bookings
      // Note: In a real implementation, you might want to update a separate guest profile table
      // For now, we'll update the guest details in the most recent booking
      const mostRecentBooking = guestData.bookingHistory[0]
      if (mostRecentBooking) {
        const response = await fetch(`/api/bookings/${mostRecentBooking.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guest_details: editData
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update guest profile')
        }

        setGuestData(prev => prev ? { ...prev, ...editData } : null)
        setEditMode(false)
        onUpdate?.(editData)
      }
    } catch (err) {
      console.error('Failed to update guest profile:', err)
      alert('Failed to update guest profile. Please try again.')
    }
  }

  const getGuestStatus = () => {
    if (!guestData) return 'Unknown'
    
    if (guestData.totalBookings >= 5) return 'VIP Guest'
    if (guestData.totalBookings >= 3) return 'Frequent Guest'
    if (guestData.totalBookings >= 2) return 'Returning Guest'
    return 'New Guest'
  }

  const getStatusColor = () => {
    const status = getGuestStatus()
    switch (status) {
      case 'VIP Guest': return 'bg-purple-100 text-purple-800'
      case 'Frequent Guest': return 'bg-blue-100 text-blue-800'
      case 'Returning Guest': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error || !guestData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load guest profile'}</p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Guest Profile
            </h2>
            <p className="text-sm text-gray-600">
              Guest ID: {guestId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getGuestStatus()}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close guest profile"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Guest Information */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            {!editMode && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="guest-name"
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="guest-email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="guest-purpose" className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit
                </label>
                <input
                  id="guest-purpose"
                  type="text"
                  value={editData.purpose_of_visit || ''}
                  onChange={(e) => setEditData({ ...editData, purpose_of_visit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-gray-900">{guestData.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{guestData.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-gray-900">{guestData.phone}</p>
              </div>
              {guestData.purpose_of_visit && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Purpose of Visit</p>
                  <p className="text-gray-900">{guestData.purpose_of_visit}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guest Statistics */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Guest Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Total Bookings</p>
              <p className="text-2xl font-bold text-blue-900">{guestData.totalBookings}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Spent</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(guestData.totalSpent)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Last Booking</p>
              <p className="text-lg font-semibold text-purple-900">
                {guestData.lastBooking ? formatDate(guestData.lastBooking) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Bookings</h3>
          <div className="space-y-3">
            {guestData.bookingHistory.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''} • {booking.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(booking.total_amount)}</p>
                </div>
              </div>
            ))}
            {guestData.bookingHistory.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                And {guestData.bookingHistory.length - 5} more booking{guestData.bookingHistory.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}