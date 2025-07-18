'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Database } from '@/lib/database.types'
import { Property, Booking } from '@/lib/types'
import ConsolidatedCalendarView from '@/components/ConsolidatedCalendarView'

export default function CalendarDashboardPage() {
  const supabase = useSupabaseClient<Database>()
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch properties and bookings
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch properties owned by the current user
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('*')
          .eq('is_active', true)
        
        if (propertiesError) {
          throw new Error(`Failed to fetch properties: ${propertiesError.message}`)
        }
        
        setProperties(propertiesData || [])
        
        if (propertiesData && propertiesData.length > 0) {
          // Get property IDs
          const propertyIds = propertiesData.map(p => p.id)
          
          // Fetch bookings for these properties
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .in('property_id', propertyIds)
            .not('status', 'eq', 'cancelled')
          
          if (bookingsError) {
            throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
          }
          
          setBookings(bookingsData || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data')
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [supabase])
  
  // Handle property selection
  const handlePropertySelect = (propertyId: string) => {
    // Navigate to property-specific calendar page
    window.location.href = `/dashboard/properties/${propertyId}/calendar`
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Calendar Dashboard</h1>
      
      {isLoading ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading calendar data...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      ) : properties.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <p className="mb-4">You don't have any properties yet.</p>
          <a 
            href="/dashboard/properties/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Your First Property
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <ConsolidatedCalendarView 
              properties={properties}
              bookings={bookings}
              onPropertySelect={handlePropertySelect}
            />
          </div>
        </div>
      )}
    </div>
  )
}