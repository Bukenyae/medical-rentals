'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Database } from '@/lib/database.types'
import { Property, Booking, PropertyAvailability } from '@/lib/types'
import { getPropertyAvailability } from '@/lib/services/calendar'
import BookingCalendar from './BookingCalendar'

interface ConsolidatedCalendarViewProps {
  properties?: Property[]
  bookings: Booking[]
  onPropertySelect?: (propertyId: string) => void
}

export default function ConsolidatedCalendarView({ 
  properties, 
  bookings,
  onPropertySelect
}: ConsolidatedCalendarViewProps) {
  const supabase = useSupabaseClient<Database>()
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availabilityData, setAvailabilityData] = useState<Record<string, PropertyAvailability[]>>({})
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get date range for current month view
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Adjust to include days from previous/next month that appear in calendar
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }, [currentDate])
  
  // Fetch availability data for all properties
  useEffect(() => {
    if (!properties || properties.length === 0) return
    
    const fetchAllAvailability = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const availabilityPromises = properties.map(property => 
          getPropertyAvailability(
            supabase,
            property.id,
            dateRange.startDate,
            dateRange.endDate
          )
        )
        
        const availabilityResults = await Promise.all(availabilityPromises)
        
        // Create a map of property ID to availability data
        const availabilityMap: Record<string, PropertyAvailability[]> = {}
        properties.forEach((property, index) => {
          availabilityMap[property.id] = availabilityResults[index]
        })
        
        setAvailabilityData(availabilityMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch availability data')
        console.error('Error fetching availability data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAllAvailability()
  }, [properties, dateRange, supabase])
  
  // Handle property selection
  const handlePropertySelect = (propertyId: string) => {
    setSelectedProperty(propertyId)
    if (onPropertySelect) {
      onPropertySelect(propertyId)
    }
  }
  
  // Navigate to previous/next month
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }
  
  // Format month and year for display
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
  }
  
  // Get property availability status summary
  const getPropertyAvailabilitySummary = (propertyId: string) => {
    if (!availabilityData[propertyId]) return { available: 0, booked: 0, blocked: 0 }
    
    return availabilityData[propertyId].reduce((summary, day) => {
      if (day.is_booked) {
        summary.booked++
      } else if (day.is_available) {
        summary.available++
      } else {
        summary.blocked++
      }
      return summary
    }, { available: 0, booked: 0, blocked: 0 })
  }
  
  // Get property bookings
  const getPropertyBookings = (propertyId: string) => {
    return bookings.filter(booking => booking.property_id === propertyId)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Consolidated Calendar View</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            type="button"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-medium">{formatMonthYear(currentDate)}</span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            type="button"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading calendar data...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <p>No properties found. Add properties to view the consolidated calendar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Property Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map(property => {
              const summary = getPropertyAvailabilitySummary(property.id)
              const isSelected = selectedProperty === property.id
              
              return (
                <div 
                  key={property.id}
                  onClick={() => handlePropertySelect(property.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-medium text-lg mb-2 truncate">{property.title}</h3>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span>{summary.available} available</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                      <span>{summary.booked} booked</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-gray-400 rounded-full mr-1"></span>
                      <span>{summary.blocked} blocked</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Selected Property Calendar */}
          {selectedProperty && (
            <div>
              <h3 className="text-lg font-medium mb-4">
                {properties.find(p => p.id === selectedProperty)?.title} - Calendar
              </h3>
              <BookingCalendar
                bookings={getPropertyBookings(selectedProperty)}
                propertyId={selectedProperty}
                showAvailability={true}
                availabilityData={availabilityData[selectedProperty]}
              />
            </div>
          )}
          
          {/* All Properties Calendar Grid */}
          {!selectedProperty && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">All Properties</h3>
              <div className="grid grid-cols-1 gap-8">
                {properties.map(property => (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">{property.title}</h4>
                    <BookingCalendar
                      bookings={getPropertyBookings(property.id)}
                      propertyId={property.id}
                      showAvailability={true}
                      availabilityData={availabilityData[property.id]}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
</content>
</invoke>