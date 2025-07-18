'use client'

import { useState } from 'react'
import { Booking, BookingStatus } from '@/lib/types'
import { useBookings } from '@/lib/hooks/useBookings'

interface BookingCardProps {
  booking: Booking
  onUpdate?: (booking: Booking) => void
  showActions?: boolean
  compact?: boolean
  onGuestProfileClick?: (guestId: string) => void
}

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  checked_in: 'bg-blue-100 text-blue-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled'
}

export default function BookingCard({ 
  booking, 
  onUpdate, 
  showActions = true, 
  compact = false,
  onGuestProfileClick
}: BookingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { updateBooking, cancelBooking } = useBookings()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateNights = () => {
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (isLoading) return

    try {
      setIsLoading(true)
      const updatedBooking = await updateBooking({
        id: booking.id,
        status: newStatus
      })
      onUpdate?.(updatedBooking)
    } catch (error) {
      console.error('Failed to update booking status:', error)
      alert('Failed to update booking status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (isLoading) return
    
    const confirmed = window.confirm('Are you sure you want to cancel this booking?')
    if (!confirmed) return

    try {
      setIsLoading(true)
      const cancelledBooking = await cancelBooking(booking.id)
      onUpdate?.(cancelledBooking)
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('Failed to cancel booking. Please try again.')
    } finally {
      setIsLoading(false)
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

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                {statusLabels[booking.status]}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {booking.guest_details?.name} • {booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">{formatCurrency(booking.total_amount)}</p>
            <p className="text-xs text-gray-500">{calculateNights()} night{calculateNights() > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status]}`}>
              {statusLabels[booking.status]}
            </span>
            <span className="text-sm text-gray-500">
              Booking #{booking.id.slice(-8)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {booking.guest_details?.name}
          </h3>
          <p className="text-sm text-gray-600">
            {booking.guest_details?.email} • {booking.guest_details?.phone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(booking.total_amount)}</p>
          <p className="text-sm text-gray-500">{calculateNights()} night{calculateNights() > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Check-in</p>
          <p className="text-lg text-gray-900">{formatDate(booking.check_in)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Check-out</p>
          <p className="text-lg text-gray-900">{formatDate(booking.check_out)}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Guest Count</p>
        <p className="text-gray-900">{booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</p>
      </div>

      {booking.special_requests && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Special Requests</p>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {booking.special_requests}
          </p>
        </div>
      )}

      {booking.guest_details?.purpose_of_visit && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Purpose of Visit</p>
          <p className="text-sm text-gray-600">{booking.guest_details.purpose_of_visit}</p>
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {canUpdateStatus(booking.status, 'confirmed') && (
            <button
              onClick={() => handleStatusUpdate('confirmed')}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Confirm
            </button>
          )}
          
          {canUpdateStatus(booking.status, 'checked_in') && (
            <button
              onClick={() => handleStatusUpdate('checked_in')}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Check In
            </button>
          )}
          
          {canUpdateStatus(booking.status, 'checked_out') && (
            <button
              onClick={() => handleStatusUpdate('checked_out')}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Check Out
            </button>
          )}
          
          {['pending', 'confirmed'].includes(booking.status) && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}