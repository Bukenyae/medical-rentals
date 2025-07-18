'use client'

import { useState, useMemo } from 'react'
import { Booking, BookingStatus } from '@/lib/types'
import { useBookings } from '@/lib/hooks/useBookings'
import BookingCard from './BookingCard'
import BookingDetails from './BookingDetails'
import GuestProfile from './GuestProfile'

interface BookingListProps {
  propertyId?: string
  guestId?: string
  compact?: boolean
  showFilters?: boolean
  showActions?: boolean
}

export default function BookingList({ 
  propertyId, 
  guestId, 
  compact = false, 
  showFilters = true,
  showActions = true
}: BookingListProps) {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'check_in' | 'created_at' | 'total_amount'>('check_in')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'current' | 'past'>('all')

  const { bookings, loading, error, refreshBookings } = useBookings({
    property_id: propertyId,
    guest_id: guestId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sort_by: sortBy,
    sort_order: sortOrder
  })

  const filteredBookings = useMemo(() => {
    let filtered = bookings

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.guest_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.guest_details?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(booking => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        checkIn.setHours(0, 0, 0, 0)
        checkOut.setHours(0, 0, 0, 0)
        
        switch (dateFilter) {
          case 'upcoming':
            return checkIn > today
          case 'current':
            return checkIn <= today && checkOut > today
          case 'past':
            return checkOut <= today
          default:
            return true
        }
      })
    }

    return filtered
  }, [bookings, searchTerm, dateFilter])

  const handleBookingUpdate = (updatedBooking: Booking) => {
    refreshBookings()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="text-right">
                <div className="h-8 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 mb-4">Failed to load bookings: {error}</p>
        <button
          onClick={refreshBookings}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Guest name, email, or booking ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'upcoming' | 'current' | 'past')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="current">Current</option>
                <option value="past">Past</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'check_in' | 'created_at' | 'total_amount')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="check_in">Check-in Date</option>
                <option value="created_at">Created Date</option>
                <option value="total_amount">Amount</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'No bookings have been created yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="relative">
              <BookingCard
                booking={booking}
                onUpdate={handleBookingUpdate}
                compact={compact}
                showActions={showActions}
              />
              {!compact && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGuestId(booking.guest_id)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Guest Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

      {/* Guest Profile Modal */}
      {selectedGuestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <GuestProfile
              guestId={selectedGuestId}
              onClose={() => setSelectedGuestId(null)}
              onUpdate={() => refreshBookings()}
            />
          </div>
        </div>
      )}
    </div>
  )
}