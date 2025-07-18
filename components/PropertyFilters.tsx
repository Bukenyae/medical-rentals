'use client'

import { useState } from 'react'
import { PropertyQueryParams } from '@/lib/types/property'

interface PropertyFiltersProps {
  filters: PropertyQueryParams
  onFilterChange: (filters: Partial<PropertyQueryParams>) => void
  loading?: boolean
}

export function PropertyFilters({ 
  filters, 
  onFilterChange, 
  loading = false 
}: PropertyFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (search: string) => {
    onFilterChange({ search: search || undefined })
  }

  const handleStatusChange = (status: string) => {
    onFilterChange({ 
      is_active: status === 'all' ? undefined : status === 'active' 
    })
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

  const clearFilters = () => {
    onFilterChange({
      search: undefined,
      is_active: undefined,
      min_price: undefined,
      max_price: undefined,
      min_guests: undefined,
      max_guests: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.is_active !== undefined ||
    filters.min_price ||
    filters.max_price ||
    filters.min_guests ||
    filters.max_guests ||
    filters.bedrooms ||
    filters.bathrooms
  )

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Properties
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              placeholder="Search by title or description..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="all">All Properties</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="base_price-asc">Price Low to High</option>
            <option value="base_price-desc">Price High to Low</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <button
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
          Advanced Filters
        </button>

        {hasActiveFilters && (
          <button
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