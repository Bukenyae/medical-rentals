'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Property } from '@/lib/types/property'
import { formatCurrency } from '@/lib/utils/format'
import { HospitalProximityCard } from './HospitalProximityCard'

interface PropertyListingProps {
  properties: Property[]
  loading: boolean
  onCompareToggle?: (propertyId: string) => void
  selectedForCompare?: string[]
}

export function PropertyListing({
  properties,
  loading,
  onCompareToggle,
  selectedForCompare = []
}: PropertyListingProps) {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No properties found</h3>
        <p className="mt-1 text-gray-500">Try adjusting your search filters to find more options.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map(property => {
        const isExpanded = expandedProperty === property.id
        const isSelected = selectedForCompare?.includes(property.id)
        
        const address = typeof property.address === 'object' && property.address !== null
          ? property.address as { street: string; city: string; state: string; zip: string }
          : { street: '', city: '', state: '', zip: '' }

        const primaryImage = property.images && property.images.length > 0 
          ? property.images[0] 
          : null

        // Extract hospital proximity data
        const hospitalDistances = property.hospital_distances as Record<string, {
          distance_miles: number;
          drive_time_minutes: number;
          hospital_name: string;
          hospital_type: string;
        }> | null

        // Find closest hospital
        let closestHospital = null
        if (hospitalDistances) {
          const hospitals = Object.entries(hospitalDistances)
          if (hospitals.length > 0) {
            closestHospital = hospitals.reduce((closest, [id, data]) => {
              if (!closest || data.distance_miles < closest.distance_miles) {
                return { id, ...data }
              }
              return closest
            }, null as null | { id: string; distance_miles: number; drive_time_minutes: number; hospital_name: string; hospital_type: string })
          }
        }

        return (
          <div 
            key={property.id} 
            className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Property Image */}
            <div className="relative h-48 bg-gray-200">
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Price Badge */}
              <div className="absolute bottom-2 right-2">
                <span className="px-3 py-1 text-sm font-bold bg-blue-600 text-white rounded-full shadow-sm">
                  {formatCurrency(property.base_price)}/night
                </span>
              </div>

              {/* Compare Button */}
              {onCompareToggle && (
                <button
                  type="button"
                  onClick={() => onCompareToggle(property.id)}
                  className={`absolute top-2 right-2 p-2 rounded-full ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/80 text-gray-700 hover:bg-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSelected ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    )}
                  </svg>
                </button>
              )}
            </div>

            {/* Property Details */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {property.title}
              </h3>

              <p className="text-sm text-gray-600 mb-2">
                {address.street}, {address.city}, {address.state} {address.zip}
              </p>

              <div className="flex items-center text-sm text-gray-500 mb-3">
                <span className="flex items-center mr-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {property.max_guests} guests
                </span>
                
                {property.bedrooms && (
                  <span className="flex items-center mr-4">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                  </span>
                )}
                
                {property.bathrooms && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Hospital Proximity */}
              {closestHospital && (
                <div className="mb-3 p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium text-blue-800">
                      {closestHospital.distance_miles.toFixed(1)} miles to {closestHospital.hospital_name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 ml-5">
                    {closestHospital.drive_time_minutes.toFixed(0)} min drive
                  </div>
                </div>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {property.amenities.slice(0, 3).map((amenity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {property.amenities.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        +{property.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
                
                <Link
                  href={`/properties/${property.id}`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Details
                </Link>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {/* Description */}
                  {property.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Description</h4>
                      <p className="text-sm text-gray-600">{property.description}</p>
                    </div>
                  )}
                  
                  {/* Hospital Proximity Details */}
                  {hospitalDistances && Object.keys(hospitalDistances).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Hospital Proximity</h4>
                      <HospitalProximityCard hospitalDistances={hospitalDistances} compact />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}