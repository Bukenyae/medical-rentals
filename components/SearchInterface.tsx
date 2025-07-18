'use client'

import { useState } from 'react'
import { PropertyQueryParams } from '@/lib/types/property'
import { Hospital } from '@/lib/data/hospitals'

interface SearchInterfaceProps {
  filters: PropertyQueryParams
  onFilterChange: (filters: Partial<PropertyQueryParams>) => void
  loading?: boolean
  hospitals: Hospital[]
}

export function SearchInterface({ 
  filters, 
  onFilterChange, 
  loading = false,
  hospitals
}: SearchInterfaceProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<string>('')
  const [maxDistance, setMaxDistance] = useState<string>('')

  const handleSearchChange = (search: string) => {
    onFilterChange({ search: search || undefined })
  }

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    onFilterChange({ 
      sort_by: sortBy as any,
      sort_order: sortOrder as any
    })
  }

  const handleAdvancedFilterChange = (key: string, value: string) => {
    const numValue = value ? parseFloat(value) : undefined
    onFilterChange({ [key]: numValue })
  }

  const handleHospitalProximityChange = () => {
    if (!selectedHospital || !maxDistance) return
    
    onFilterChange({ 
      hospital_id: selectedHospital,
      max_distance: parseFloat(maxDistance)
    })
  }

  const clearFilters = () => {
    setSelectedHospital('')
    setMaxDistance('')
    onFilterChange({
      search: undefined,
      min_price: undefined,
      max_price: undefined,
      min_guests: undefined,
      max_guests: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      hospital_id: undefined,
      max_distance: undefined,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.min_price ||
    filters.max_price ||
    filters.min_guests ||
    filters.max_guests ||
    filters.bedrooms ||
    filters.bathrooms ||
    filters.hospital_id ||
    filters.max_distance
  )

  // Group hospitals by type
  const hospitalsByType = hospitals.reduce((acc, hospital) => {
    if (!acc[hospital.type]) {
      acc[hospital.type] = []
    }
    acc[hospital.type].push(hospital)
    return acc
  }, {} as Record<Hospital['type'], Hospital[]>)

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border space-y-4">
      <h2 className="text-xl font-semibold mb-4">Find Your Perfect Medical Stay</h2>
      
      {/* Basic Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Properties
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              placeholder="Search by location, amenities, or features..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sort"
            value={`${filters.sort_by || 'created_at'}-${filters.sort_order || 'desc'}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-')
              handleSortChange(sortBy, sortOrder)
            }}
            disabled={loading}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="base_price-asc">Price Low to High</option>
            <option value="base_price-desc">Price High to Low</option>
          </select>
        </div>
      </div>

      {/* Hospital Proximity Filter */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-md font-medium mb-3">Hospital Proximity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
              Select Hospital
            </label>
            <select
              id="hospital"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select a hospital</option>
              
              {Object.entries(hospitalsByType).map(([type, hospitals]) => (
                <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1) + ' Hospitals'}>
                  {hospitals.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="max_distance" className="block text-sm font-medium text-gray-700 mb-1">
              Max Distance (miles)
            </label>
            <div className="flex">
              <input
                type="number"
                id="max_distance"
                placeholder="5"
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
                disabled={loading || !selectedHospital}
                className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleHospitalProximityChange}
                disabled={loading || !selectedHospital || !maxDistance}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <svg 
            className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
          {/* Price Range */}
          <div>
            <label htmlFor="min_price" className="block text-sm font-medium text-gray-700 mb-1">
              Min Price
            </label>
            <input
              type="number"
              id="min_price"
              placeholder="$0"
              value={filters.min_price || ''}
              onChange={(e) => handleAdvancedFilterChange('min_price', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="max_price" className="block text-sm font-medium text-gray-700 mb-1">
              Max Price
            </label>
            <input
              type="number"
              id="max_price"
              placeholder="$999+"
              value={filters.max_price || ''}
              onChange={(e) => handleAdvancedFilterChange('max_price', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Guest Range */}
          <div>
            <label htmlFor="min_guests" className="block text-sm font-medium text-gray-700 mb-1">
              Min Guests
            </label>
            <input
              type="number"
              id="min_guests"
              placeholder="1"
              value={filters.min_guests || ''}
              onChange={(e) => handleAdvancedFilterChange('min_guests', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="max_guests" className="block text-sm font-medium text-gray-700 mb-1">
              Max Guests
            </label>
            <input
              type="number"
              id="max_guests"
              placeholder="10+"
              value={filters.max_guests || ''}
              onChange={(e) => handleAdvancedFilterChange('max_guests', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Bedrooms */}
          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms
            </label>
            <select
              id="bedrooms"
              value={filters.bedrooms || ''}
              onChange={(e) => handleAdvancedFilterChange('bedrooms', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Bathrooms
            </label>
            <select
              id="bathrooms"
              value={filters.bathrooms || ''}
              onChange={(e) => handleAdvancedFilterChange('bathrooms', e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="2.5">2.5+</option>
              <option value="3">3+</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}