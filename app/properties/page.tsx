'use client'

import { useState, useEffect } from 'react'
import { PropertyListing } from '@/components/PropertyListing'
import { SearchInterface } from '@/components/SearchInterface'
import { PropertyCompare } from '@/components/PropertyCompare'
import { useProperties } from '@/lib/hooks/useProperties'
import { PropertyQueryParams } from '@/lib/types/property'
import { BATON_ROUGE_HOSPITALS } from '@/lib/data/hospitals'

export default function PropertiesPage() {
  const { properties, loading, total, page, limit, fetchProperties } = useProperties()
  const [queryParams, setQueryParams] = useState<PropertyQueryParams>({
    page: 1,
    limit: 9,
    is_active: true,
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  const [compareProperties, setCompareProperties] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    fetchProperties(queryParams)
  }, [fetchProperties, queryParams])

  const handleFilterChange = (filters: Partial<PropertyQueryParams>) => {
    setQueryParams(prev => ({
      ...prev,
      ...filters,
      page: filters.page || 1 // Reset to page 1 when filters change
    }))
  }

  const handlePageChange = (newPage: number) => {
    setQueryParams(prev => ({
      ...prev,
      page: newPage
    }))
  }

  const togglePropertyCompare = (propertyId: string) => {
    setCompareProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId)
      } else {
        // Limit to 3 properties for comparison
        if (prev.length >= 3) {
          return [...prev.slice(1), propertyId]
        }
        return [...prev, propertyId]
      }
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Medical Stay</h1>
          <p className="text-blue-100 max-w-3xl">
            Comfortable accommodations near Baton Rouge medical facilities.
            Perfect for patients, families, and medical professionals.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Search Interface */}
        <div className="mb-8">
          <SearchInterface 
            filters={queryParams} 
            onFilterChange={handleFilterChange}
            loading={loading}
            hospitals={BATON_ROUGE_HOSPITALS}
          />
        </div>

        {/* Compare Bar */}
        {compareProperties.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium mr-2">
                {compareProperties.length} {compareProperties.length === 1 ? 'property' : 'properties'} selected
              </span>
              <button
                type="button"
                onClick={() => setCompareProperties([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Compare Properties
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            {loading ? 'Loading properties...' : `Showing ${properties.length} of ${total} properties`}
          </p>
        </div>

        {/* Property Listings */}
        <PropertyListing 
          properties={properties}
          loading={loading}
          onCompareToggle={togglePropertyCompare}
          selectedForCompare={compareProperties}
        />

        {/* Pagination */}
        {total > limit && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.ceil(total / limit) }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePageChange(i + 1)}
                  disabled={loading}
                  className={`px-3 py-1 rounded ${
                    page === i + 1 
                      ? 'bg-blue-600 text-white' 
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(total / limit) || loading}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Property Comparison Modal */}
      {showCompare && compareProperties.length > 0 && (
        <PropertyCompare
          propertyIds={compareProperties}
          onClose={() => setShowCompare(false)}
        />
      )}
    </main>
  )
}