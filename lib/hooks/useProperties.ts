'use client'

import { useState, useCallback } from 'react'
import type { 
  Property, 
  PropertyListResponse, 
  PropertyQueryParams,
  PropertyFormData,
  PropertyImageUploadResponse,
  PropertyDeleteResponse
} from '../types/property'

interface UsePropertiesReturn {
  properties: Property[]
  loading: boolean
  error: string | null
  total: number
  page: number
  limit: number
  fetchProperties: (params?: PropertyQueryParams) => Promise<void>
  createProperty: (data: PropertyFormData) => Promise<Property>
  updateProperty: (id: string, data: Partial<PropertyFormData>) => Promise<Property>
  deleteProperty: (id: string) => Promise<void>
  uploadImage: (propertyId: string, file: File) => Promise<string>
  deleteImage: (propertyId: string, imagePath: string) => Promise<void>
}

export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const fetchProperties = useCallback(async (params?: PropertyQueryParams) => {
    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams()
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
      }

      const response = await fetch(`/api/properties?${searchParams.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch properties')
      }

      const data: PropertyListResponse = await response.json()
      setProperties(data.properties)
      setTotal(data.total)
      setPage(data.page)
      setLimit(data.limit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createProperty = useCallback(async (data: PropertyFormData): Promise<Property> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create property')
      }

      const property: Property = await response.json()
      setProperties(prev => [property, ...prev])
      setTotal(prev => prev + 1)
      
      return property
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProperty = useCallback(async (id: string, data: Partial<PropertyFormData>): Promise<Property> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update property')
      }

      const updatedProperty: Property = await response.json()
      setProperties(prev => 
        prev.map(property => 
          property.id === id ? updatedProperty : property
        )
      )
      
      return updatedProperty
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteProperty = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete property')
      }

      setProperties(prev => prev.filter(property => property.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadImage = useCallback(async (propertyId: string, file: File): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const data: PropertyImageUploadResponse = await response.json()
      return data.imageUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteImage = useCallback(async (propertyId: string, imagePath: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/images?path=${encodeURIComponent(imagePath)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete image')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    properties,
    loading,
    error,
    total,
    page,
    limit,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadImage,
    deleteImage,
  }
}