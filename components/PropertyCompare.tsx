'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Property } from '@/lib/types/property'
import { formatCurrency } from '@/lib/utils/format'
import { HospitalProximityCard } from './HospitalProximityCard'

interface PropertyCompareProps {
  propertyIds: string[]
  onClose: () => void
}

export function PropertyCompare({ propertyIds, onClose }: PropertyCompareProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)
      setError(null)
      
      try {
        const fetchedProperties = await Promise.all(
          propertyIds.map(async (id) => {
            const response = await fetch(`/api/properties/${id}`)
            if (!response.ok) {
              throw new Error(`Failed to fetch property ${id}`)
            }
            return response.json()
          })
        )
        
        setProperties(fetchedProperties)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch properties')
      } finally {
        setLoading(false)
      }
    }
    
    if (propertyIds.length > 0) {
      fetchProperties()
    }
  }, [propertyIds])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Comparing Properties</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Error</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Compare Properties</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left bg-gray-100 w-1/4">Feature</th>
                {properties.map(property => (
                  <th key={property.id} className="p-2 text-left bg-gray-100">
                    {property.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Images */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Image</td>
                {properties.map(property => {
                  const primaryImage = property.images && property.images.length > 0 
                    ? property.images[0] 
                    : null
                  
                  return (
                    <td key={property.id} className="p-2 border-b border-gray-200">
                      <div className="relative h-32 w-full bg-gray-200">
                        {primaryImage ? (
                          <Image
                            src={primaryImage}
                            alt={property.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Price */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Price per night</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200 font-bold text-blue-600">
                    {formatCurrency(property.base_price)}
                  </td>
                ))}
              </tr>

              {/* Address */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Address</td>
                {properties.map(property => {
                  const address = typeof property.address === 'object' && property.address !== null
                    ? property.address as { street: string; city: string; state: string; zip: string }
                    : { street: '', city: '', state: '', zip: '' }
                  
                  return (
                    <td key={property.id} className="p-2 border-b border-gray-200">
                      {address.street}, {address.city}, {address.state} {address.zip}
                    </td>
                  )
                })}
              </tr>

              {/* Guests */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Max Guests</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200">
                    {property.max_guests}
                  </td>
                ))}
              </tr>

              {/* Bedrooms */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Bedrooms</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200">
                    {property.bedrooms || 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Bathrooms */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Bathrooms</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200">
                    {property.bathrooms || 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Hospital Proximity */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Closest Hospital</td>
                {properties.map(property => {
                  const hospitalDistances = property.hospital_distances as Record<string, {
                    distance_miles: number;
                    drive_time_minutes: number;
                    hospital_name: string;
                  }> | null

                  let closestHospital = null
                  if (hospitalDistances) {
                    const hospitals = Object.entries(hospitalDistances)
                    if (hospitals.length > 0) {
                      closestHospital = hospitals.reduce((closest, [id, data]) => {
                        if (!closest || data.distance_miles < closest.distance_miles) {
                          return { id, ...data }
                        }
                        return closest
                      }, null as null | { id: string; distance_miles: number; drive_time_minutes: number; hospital_name: string })
                    }
                  }
                  
                  return (
                    <td key={property.id} className="p-2 border-b border-gray-200">
                      {closestHospital ? (
                        <div>
                          <div className="font-medium">{closestHospital.hospital_name}</div>
                          <div className="text-sm text-gray-600">
                            {closestHospital.distance_miles.toFixed(1)} miles ({closestHospital.drive_time_minutes.toFixed(0)} min drive)
                          </div>
                        </div>
                      ) : (
                        'No data available'
                      )}
                    </td>
                  )
                })}
              </tr>

              {/* Amenities */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Amenities</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200">
                    {property.amenities && property.amenities.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {property.amenities.map((amenity, index) => (
                          <li key={index} className="text-sm">{amenity}</li>
                        ))}
                      </ul>
                    ) : (
                      'No amenities listed'
                    )}
                  </td>
                ))}
              </tr>

              {/* Description */}
              <tr>
                <td className="p-2 border-b border-gray-200 font-medium">Description</td>
                {properties.map(property => (
                  <td key={property.id} className="p-2 border-b border-gray-200">
                    {property.description || 'No description available'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors mr-2"
          >
            Close
          </button>
          <a
            href="/properties"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View All Properties
          </a>
        </div>
      </div>
    </div>
  )
}