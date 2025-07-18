'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Property } from '@/lib/types/property'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface PropertyDetailsProps {
  property: Property
  onEdit?: (property: Property) => void
  onDelete?: (propertyId: string) => void
  onImageUpload?: (propertyId: string, file: File) => Promise<void>
  onImageDelete?: (propertyId: string, imagePath: string) => Promise<void>
}

export function PropertyDetails({ 
  property, 
  onEdit, 
  onDelete, 
  onImageUpload,
  onImageDelete 
}: PropertyDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const address = typeof property.address === 'object' && property.address !== null
    ? property.address as { street: string; city: string; state: string; zip: string }
    : { street: '', city: '', state: '', zip: '' }

  const hospitalDistances = typeof property.hospital_distances === 'object' && property.hospital_distances !== null
    ? property.hospital_distances as Record<string, { distance_miles: number; drive_time_minutes: number }>
    : {}

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onImageUpload) return

    setIsUploading(true)
    setUploadError(null)

    try {
      await onImageUpload(property.id, file)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageDelete = async (imagePath: string) => {
    if (!onImageDelete) return

    const confirmed = window.confirm('Are you sure you want to delete this image?')
    if (!confirmed) return

    try {
      await onImageDelete(property.id, imagePath)
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm('Are you sure you want to delete this property? This action cannot be undone.')
    if (!confirmed) return

    try {
      await onDelete(property.id)
    } catch (error) {
      console.error('Failed to delete property:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
            <p className="text-gray-600 mt-1">
              {address.street}, {address.city}, {address.state} {address.zip}
            </p>
            <div className="flex items-center mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                property.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {property.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="ml-4 text-lg font-bold text-blue-600">
                {formatCurrency(property.base_price)}/night
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(property)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit Property
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete Property
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Image Gallery */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
          
          {property.images && property.images.length > 0 ? (
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={property.images[selectedImageIndex]}
                  alt={`${property.title} - Image ${selectedImageIndex + 1}`}
                  fill
                  className="object-cover"
                />
                
                {/* Image Navigation */}
                {property.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex(prev => 
                        prev > 0 ? prev - 1 : property.images!.length - 1
                      )}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex(prev => 
                        prev < property.images!.length - 1 ? prev + 1 : 0
                      )}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Grid */}
              {property.images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {property.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative h-16 rounded-lg overflow-hidden ${
                        selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No images uploaded</p>
              </div>
            </div>
          )}

          {/* Image Upload */}
          {onImageUpload && (
            <div className="mt-4">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Photo
                    </>
                  )}
                </div>
              </label>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Maximum Guests</dt>
                <dd className="text-sm text-gray-900">{property.max_guests}</dd>
              </div>
              {property.bedrooms && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bedrooms</dt>
                  <dd className="text-sm text-gray-900">{property.bedrooms}</dd>
                </div>
              )}
              {property.bathrooms && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bathrooms</dt>
                  <dd className="text-sm text-gray-900">{property.bathrooms}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Base Price</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(property.base_price)} per night</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(property.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="text-sm text-gray-900">{formatDate(property.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Hospital Distances */}
          {Object.keys(hospitalDistances).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Hospital Proximity</h2>
              <div className="space-y-3">
                {Object.entries(hospitalDistances).map(([hospital, data]) => (
                  <div key={hospital} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{hospital}</span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{data.distance_miles} miles</div>
                      <div className="text-xs text-gray-500">{data.drive_time_minutes} min drive</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {property.description && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
          </div>
        )}

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {property.amenities.map((amenity, index) => (
                <div
                  key={index}
                  className="flex items-center p-2 bg-gray-50 rounded-lg"
                >
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-900">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}