'use client'

import { useState, useEffect } from 'react'
import { Booking, BookingStatus } from '@/lib/types'
import { useBooking } from '@/lib/hooks/useBookings'
import { useBookings } from '@/lib/hooks/useBookings'
import ConversationThread from './ConversationThread'

interface BookingDetailsProps {
  bookingId: string
  onClose?: () => void
  onUpdate?: (booking: Booking) => void
}

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  checked_in: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_out: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
}

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending Confirmation',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled'
}

export default function BookingDetails({ bookingId, onClose, onUpdate }: BookingDetailsProps) {
  const { booking, loading, error, refreshBooking } = useBooking(bookingId)
  const { updateBooking, cancelBooking } = useBookings()
  const [isUpdating, setIsUpdating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Booking>>({})

  useEffect(() => {
    if (booking) {
      setEditData({
        guest_details: booking.guest_details,
        special_requests: booking.special_requests,
        guest_count: booking.guest_count
      })
    }
  }, [booking])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateNights = () => {
    if (!booking) return 0
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!booking || isUpdating) return

    try {
      setIsUpdating(true)
      const updatedBooking = await updateBooking({
        id: booking.id,
        status: newStatus
      })
      onUpdate?.(updatedBooking)
      refreshBooking()
    } catch (error) {
      console.error('Failed to update booking status:', error)
      alert('Failed to update booking status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!booking || isUpdating) return
    
    const confirmed = window.confirm('Are you sure you want to cancel this booking?')
    if (!confirmed) return

    try {
      setIsUpdating(true)
      const cancelledBooking = await cancelBooking(booking.id)
      onUpdate?.(cancelledBooking)
      refreshBooking()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('Failed to cancel booking. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!booking || isUpdating) return

    try {
      setIsUpdating(true)
      const updatedBooking = await updateBooking({
        id: booking.id,
        ...editData
      })
      onUpdate?.(updatedBooking)
      refreshBooking()
      setEditMode(false)
    } catch (error) {
      console.error('Failed to update booking:', error)
      alert('Failed to update booking. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const canUpdateStatus = (currentStatus: BookingStatus, targetStatus: BookingStatus) => {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['checked_in', 'cancelled'],
      checked_in: ['checked_out'],
      checked_out: [],
      cancelled: []
    }
    return validTransitions[currentStatus]?.includes(targetStatus) || false
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

  if (error || !booking) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load booking details</p>
          <button
            onClick={refreshBooking}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
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
              Booking Details
            </h2>
            <p className="text-sm text-gray-600">
              ID: {booking.id}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className={`px-4 py-2 rounded-lg border ${statusColors[booking.status]}`}>
            <span className="font-medium">{statusLabels[booking.status]}</span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(booking.total_amount)}</p>
            <p className="text-sm text-gray-500">{calculateNights()} night{calculateNights() > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Check-in</h3>
            <p className="text-lg text-gray-700">{formatDate(booking.check_in)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Check-out</h3>
            <p className="text-lg text-gray-700">{formatDate(booking.check_out)}</p>
          </div>
        </div>

        {/* Guest Information */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Guest Information</h3>
            {!editMode && ['pending', 'confirmed'].includes(booking.status) && (
              <button
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={editData.guest_details?.name || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    guest_details: {
                      ...editData.guest_details!,
                      name: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editData.guest_details?.email || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    guest_details: {
                      ...editData.guest_details!,
                      email: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editData.guest_details?.phone || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    guest_details: {
                      ...editData.guest_details!,
                      phone: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={editData.guest_count || 1}
                  onChange={(e) => setEditData({
                    ...editData,
                    guest_count: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  value={editData.special_requests || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    special_requests: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
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
                <p className="text-gray-900">{booking.guest_details?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{booking.guest_details?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-gray-900">{booking.guest_details?.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Guest Count</p>
                <p className="text-gray-900">{booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</p>
              </div>
              {booking.guest_details?.purpose_of_visit && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700">Purpose of Visit</p>
                  <p className="text-gray-900">{booking.guest_details.purpose_of_visit}</p>
                </div>
              )}
              {booking.special_requests && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700">Special Requests</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{booking.special_requests}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Booking Timeline */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Timeline</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created</span>
              <span className="text-gray-900">{formatDateTime(booking.created_at)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Updated</span>
              <span className="text-gray-900">{formatDateTime(booking.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!editMode && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-wrap gap-2">
              {canUpdateStatus(booking.status, 'confirmed') && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Booking
                </button>
              )}
              
              {canUpdateStatus(booking.status, 'checked_in') && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('checked_in')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check In Guest
                </button>
              )}
              
              {canUpdateStatus(booking.status, 'checked_out') && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('checked_out')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check Out Guest
                </button>
              )}
              
              {['pending', 'confirmed'].includes(booking.status) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Messages</h3>
          <div className="bg-gray-50 rounded-lg border border-gray-200 h-96">
            <ConversationThread bookingId={booking.id} onNewMessage={refreshBooking} />
          </div>
        </div>
      </div>
    </div>
  )
}