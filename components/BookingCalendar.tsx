'use client'

import { useState, useMemo, useEffect } from 'react'
import { Booking, PropertyAvailability } from '@/lib/types'
import { useCalendar } from '@/lib/hooks/useCalendar'

interface BookingCalendarProps {
  bookings: Booking[]
  propertyId?: string
  onDateSelect?: (date: Date) => void
  selectedDate?: Date
  selectedDates?: Date[]
  showAvailability?: boolean
  onBookingClick?: (booking: Booking) => void
  availabilityData?: PropertyAvailability[]
  onAvailabilityChange?: (date: string, isAvailable: boolean) => void
  onPriceChange?: (date: string, price: number) => void
  onDragStart?: (date: Date) => void
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  bookings: Booking[]
  isBooked: boolean
  isAvailable: boolean
  price: number
  hasCustomPrice: boolean
}

export default function BookingCalendar({ 
  bookings, 
  propertyId, 
  onDateSelect, 
  selectedDate,
  showAvailability = true,
  onBookingClick,
  availabilityData,
  onAvailabilityChange,
  onPriceChange
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Use the calendar hook if propertyId is provided and no external availability data
  const {
    availability,
    isLoading,
    updateDateAvailability
  } = useCalendar({
    propertyId: propertyId && !availabilityData ? propertyId : undefined,
    initialStartDate: getMonthStartDate(currentDate),
    initialEndDate: getMonthEndDate(currentDate)
  })
  
  // Helper functions to get month date range
  function getMonthStartDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    // Go back to include the days from previous month that appear in calendar
    firstDay.setDate(firstDay.getDate() - firstDay.getDay())
    return firstDay.toISOString().split('T')[0]
  }
  
  function getMonthEndDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth()
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0)
    // Add days to include the days from next month that appear in calendar
    lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
    return lastDay.toISOString().split('T')[0]
  }

  // Update date range when month changes
  useEffect(() => {
    if (propertyId && !availabilityData) {
      const startDate = getMonthStartDate(currentDate)
      const endDate = getMonthEndDate(currentDate)
      // This would trigger a refetch in the useCalendar hook
      // We're not using updateDateRange directly to avoid circular dependencies
    }
  }, [currentDate, propertyId, availabilityData])

  const filteredBookings = useMemo(() => {
    return propertyId 
      ? bookings.filter(booking => booking.property_id === propertyId)
      : bookings
  }, [bookings, propertyId])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of the month and calculate starting date
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const dayBookings = filteredBookings.filter(booking => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        return date >= checkIn && date < checkOut && 
               ['confirmed', 'checked_in'].includes(booking.status)
      })
      
      // Format date as YYYY-MM-DD for availability lookup
      const dateString = date.toISOString().split('T')[0]
      
      // Find availability data for this date
      const availabilityInfo = availabilityData 
        ? availabilityData.find(a => a.date === dateString)
        : availability?.find(a => a.date === dateString)
      
      // Default values if no availability data found
      const isAvailable = availabilityInfo ? availabilityInfo.is_available : true
      const price = availabilityInfo ? availabilityInfo.price : 0
      const hasCustomPrice = availabilityInfo ? availabilityInfo.price > 0 : false
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString(),
        bookings: dayBookings,
        isBooked: dayBookings.length > 0,
        isAvailable: isAvailable && !dayBookings.length,
        price,
        hasCustomPrice
      })
    }
    
    return days
  }, [currentDate, filteredBookings, availabilityData, availability])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const handleDateClick = (day: CalendarDay) => {
    if (onDateSelect) {
      onDateSelect(day.date)
    }
  }

  const getDayClassName = (day: CalendarDay) => {
    const baseClasses = 'calendar-day relative p-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors'
    const classes = [baseClasses]
    
    if (!day.isCurrentMonth) {
      classes.push('text-gray-400')
    } else {
      classes.push('text-gray-900')
    }
    
    if (day.isToday) {
      classes.push('bg-blue-50 text-blue-600 font-semibold')
    }
    
    if (day.isBooked) {
      classes.push('bg-red-50 text-red-700')
    } else if (showAvailability && !day.isAvailable) {
      classes.push('bg-gray-100 text-gray-500')
    }
    
    // Check if this date is selected (single selection)
    if (selectedDate && day.date.toDateString() === selectedDate.toDateString()) {
      classes.push('ring-2 ring-blue-500')
    }
    
    // Check if this date is in the multi-selection array
    if (selectedDates && selectedDates.some(d => d.toDateString() === day.date.toDateString())) {
      classes.push('bg-blue-100 ring-1 ring-blue-400')
    }
    
    return classes.join(' ')
  }
  
  // Handle availability toggle
  const handleAvailabilityToggle = (day: CalendarDay) => {
    if (!propertyId || day.isBooked) return;
    
    const dateString = day.date.toISOString().split('T')[0];
    const newAvailability = !day.isAvailable;
    
    if (onAvailabilityChange) {
      onAvailabilityChange(dateString, newAvailability);
    } else if (updateDateAvailability) {
      updateDateAvailability(dateString, newAvailability);
    }
  }
  
  // Handle price update
  const handlePriceUpdate = (day: CalendarDay, price: number) => {
    if (!propertyId || day.isBooked) return;
    
    const dateString = day.date.toISOString().split('T')[0];
    
    if (onPriceChange) {
      onPriceChange(dateString, price);
    } else if (updateDateAvailability) {
      updateDateAvailability(dateString, null, price);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatMonthYear(currentDate)}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            type="button"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            type="button"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-xs font-medium text-gray-500 text-center">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={getDayClassName(day)}
            onClick={() => handleDateClick(day)}
            onMouseDown={(e) => {
              // Start drag operation if onDragStart is provided
              if (e.button === 0 && onDragStart) { // Left mouse button only
                e.preventDefault(); // Prevent text selection
                onDragStart(day.date);
              }
            }}
            data-date={day.date.toISOString().split('T')[0]} // Add date attribute for drag operations
          >
            <div className="text-center">
              {day.date.getDate()}
            </div>
            
            {/* Price indicator */}
            {showAvailability && day.hasCustomPrice && !day.isBooked && (
              <div className="absolute top-1 right-1">
                <div className="text-xs font-medium text-green-600">
                  ${day.price}
                </div>
              </div>
            )}
            
            {/* Booking indicators */}
            {day.bookings.length > 0 && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-1">
                  {day.bookings.slice(0, 3).map((booking, i) => (
                    <div
                      key={booking.id}
                      className="w-1.5 h-1.5 rounded-full bg-red-500"
                      title={`${booking.guest_details?.name} - ${booking.status}`}
                    />
                  ))}
                  {day.bookings.length > 3 && (
                    <div className="text-xs text-red-600 font-bold">
                      +{day.bookings.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Availability indicator */}
            {showAvailability && !day.isBooked && !day.isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
          <span className="text-gray-600">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Booking</span>
        </div>
        {showAvailability && propertyId && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span className="text-gray-600">Custom Price</span>
          </div>
        )}
      </div>
    </div>
  )
}