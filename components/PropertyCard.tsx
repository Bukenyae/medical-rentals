'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Property } from '@/lib/types/property'
import { formatCurrency } from '@/lib/utils/format'

interface PropertyCardProps {
  property: Property
  onEdit?: (property: Property) => void
  onDelete?: (propertyId: string) => void
  showActions?: boolean
}

export function PropertyCard({ 
  property, 
  onEdit, 
  onDelete, 
  showActions = true 
}: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const address = typeof property.address === 'object' && property.address !== null
    ? property.address as { street: string; city: string; state: string; zip: string }
    : { street: '', city: '', state: '', zip: '' }

  const primaryImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : null

  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm('Are you sure you want to delete this property? This action cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(property.id)
    } catch (error) {
      console.error('Error deleting property:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Property Image */}
      <div className="relative h-48 sm:h-56 md:h-48 bg-gray-200">
        {primaryImage && !imageError ? (
          <Image
            src={primaryImage}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImageError(true)}
            priority={true}
            loading="eager"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            property.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {property.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mb-1 sm:mb-0">
            {property.title}
          </h3>
          <span className="text-base sm:text-lg font-bold text-blue-600 sm:ml-2">
            {formatCurrency(property.base_price)}/night
          </span>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">
          {address.street}, {address.city}, {address.state} {address.zip}
        </p>

        <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 mb-3">
          <span className="flex items-center mr-3 mb-1 sm:mb-0">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {property.max_guests} guests
          </span>
          
          {property.bedrooms && (
            <span className="flex items-center mr-3 mb-1 sm:mb-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
            </span>
          )}
          
          {property.bathrooms && (
            <span className="flex items-center mb-1 sm:mb-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 2).map((amenity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 2 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                  +{property.amenities.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 sm:pt-3 border-t border-gray-200 gap-2 sm:gap-0">
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium text-center sm:text-left"
            >
              View Details
            </Link>
            
            <div className="flex justify-center sm:justify-start space-x-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(property)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Edit
                </button>
              )}
              
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}