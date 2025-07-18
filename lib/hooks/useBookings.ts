import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Booking, ApiResponse } from '@/lib/types'
import { CreateBookingInput, UpdateBookingInput, BookingQuery } from '@/lib/validations/booking'

interface UseBookingsResult {
  bookings: Booking[]
  total: number
  loading: boolean
  error: string | null
  createBooking: (data: CreateBookingInput) => Promise<Booking>
  updateBooking: (data: UpdateBookingInput) => Promise<Booking>
  cancelBooking: (id: string) => Promise<Booking>
  deleteBooking: (id: string) => Promise<void>
  refreshBookings: () => Promise<void>
}

export function useBookings(query: BookingQuery = {}): UseBookingsResult {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/bookings?${searchParams.toString()}`)
      const result: ApiResponse<{ bookings: Booking[]; total: number }> = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch bookings')
      }

      if (result.data) {
        setBookings(result.data.bookings)
        setTotal(result.data.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createBooking = async (data: CreateBookingInput): Promise<Booking> => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result: ApiResponse<Booking> = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to create booking')
    }

    if (!result.data) {
      throw new Error('No data returned from server')
    }

    // Refresh bookings list
    await fetchBookings()

    return result.data
  }

  const updateBooking = async (data: UpdateBookingInput): Promise<Booking> => {
    const { id, ...updateData } = data
    const response = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    const result: ApiResponse<Booking> = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to update booking')
    }

    if (!result.data) {
      throw new Error('No data returned from server')
    }

    // Update local state
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? result.data! : booking
      )
    )

    return result.data
  }

  const cancelBooking = async (id: string): Promise<Booking> => {
    const response = await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
    })

    const result: ApiResponse<Booking> = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to cancel booking')
    }

    if (!result.data) {
      throw new Error('No data returned from server')
    }

    // Update local state
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? result.data! : booking
      )
    )

    return result.data
  }

  const deleteBooking = async (id: string): Promise<void> => {
    const response = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result: ApiResponse<any> = await response.json()
      throw new Error(result.error?.message || 'Failed to delete booking')
    }

    // Remove from local state
    setBookings(prev => prev.filter(booking => booking.id !== id))
    setTotal(prev => prev - 1)
  }

  const refreshBookings = async () => {
    await fetchBookings()
  }

  useEffect(() => {
    fetchBookings()
  }, [JSON.stringify(query)]) // Re-fetch when query changes

  return {
    bookings,
    total,
    loading,
    error,
    createBooking,
    updateBooking,
    cancelBooking,
    deleteBooking,
    refreshBookings,
  }
}

// Hook for a single booking
export function useBooking(id: string) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooking = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/bookings/${id}`)
      const result: ApiResponse<Booking> = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch booking')
      }

      setBooking(result.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchBooking()
    }
  }, [id])

  return {
    booking,
    loading,
    error,
    refreshBooking: fetchBooking,
  }
}