'use client'

import { useState, useEffect } from 'react'
import { useCalendar } from '@/lib/hooks/useCalendar'
import { RecurringPattern } from '@/lib/types'

interface RecurringPatternManagerProps {
  propertyId: string
}

export default function RecurringPatternManager({ propertyId }: RecurringPatternManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [isAvailable, setIsAvailable] = useState(true)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  
  const {
    recurringPatterns,
    isPatternsLoading,
    error,
    addRecurringPattern,
    editRecurringPattern,
    removeRecurringPattern
  } = useCalendar({ propertyId })
  
  // Reset form when switching between create/edit modes
  useEffect(() => {
    if (isCreating) {
      // Set default values for new pattern
      setName('')
      setStartDate(getTodayString())
      setEndDate(getNextMonthString())
      setSelectedDays([])
      setIsAvailable(true)
      setCustomPrice(null)
      setNotes('')
    } else if (isEditing) {
      // Find the pattern being edited
      const pattern = recurringPatterns.find(p => p.id === isEditing)
      if (pattern) {
        setName(pattern.name)
        setStartDate(pattern.start_date)
        setEndDate(pattern.end_date)
        setSelectedDays(pattern.days_of_week)
        setIsAvailable(pattern.is_available)
        setCustomPrice(pattern.custom_price || null)
        setNotes(pattern.notes || '')
      }
    }
  }, [isCreating, isEditing, recurringPatterns])
  
  // Helper functions for dates
  function getTodayString(): string {
    return new Date().toISOString().split('T')[0]
  }
  
  function getNextMonthString(): string {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().split('T')[0]
  }
  
  // Toggle day selection
  const toggleDaySelection = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !startDate || !endDate || selectedDays.length === 0) {
      return
    }
    
    if (isCreating) {
      await addRecurringPattern(
        name,
        startDate,
        endDate,
        selectedDays,
        isAvailable,
        customPrice,
        notes || undefined
      )
      setIsCreating(false)
    } else if (isEditing) {
      await editRecurringPattern(
        isEditing,
        {
          name,
          start_date: startDate,
          end_date: endDate,
          days_of_week: selectedDays,
          is_available: isAvailable,
          custom_price: customPrice,
          notes: notes || undefined
        }
      )
      setIsEditing(null)
    }
  }
  
  // Handle pattern deletion
  const handleDelete = async (patternId: string) => {
    if (confirm('Are you sure you want to delete this recurring pattern?')) {
      await removeRecurringPattern(patternId)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recurring Availability Patterns</h2>
        {!isCreating && !isEditing && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
            type="button"
          >
            Create New Pattern
          </button>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Pattern form */}
      {(isCreating || isEditing) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">
            {isCreating ? 'Create New Pattern' : 'Edit Pattern'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pattern-name" className="block text-sm font-medium text-gray-700 mb-1">
                Pattern Name
              </label>
              <input
                id="pattern-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="e.g., Summer Weekends"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDaySelection(index)}
                    className={`px-3 py-1 rounded-md ${
                      selectedDays.includes(index)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    aria-label={`Select ${day}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Please select at least one day of the week
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    isAvailable ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  aria-label={isAvailable ? 'Set as unavailable' : 'Set as available'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-2">{isAvailable ? 'Available' : 'Blocked'}</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="custom-price" className="block text-sm font-medium text-gray-700 mb-1">
                Custom Price (leave empty for default price)
              </label>
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <input
                  id="custom-price"
                  type="number"
                  value={customPrice || ''}
                  onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  placeholder="Default price"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="pattern-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="pattern-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="Add notes about this pattern"
                rows={2}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false)
                  setIsEditing(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                disabled={selectedDays.length === 0}
              >
                {isCreating ? 'Create Pattern' : 'Update Pattern'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Patterns list */}
      {!isCreating && !isEditing && (
        <div className="space-y-4">
          {isPatternsLoading ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              Loading patterns...
            </div>
          ) : recurringPatterns.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              No recurring patterns found. Create one to get started.
            </div>
          ) : (
            recurringPatterns.map((pattern) => (
              <div key={pattern.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium">{pattern.name}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(pattern.id)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-md"
                      type="button"
                      aria-label="Edit pattern"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(pattern.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                      type="button"
                      aria-label="Delete pattern"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Date Range:</span>{' '}
                    {new Date(pattern.start_date).toLocaleDateString()} to{' '}
                    {new Date(pattern.end_date).toLocaleDateString()}
                  </div>
                  
                  <div>
                    <span className="font-medium">Days:</span>{' '}
                    {pattern.days_of_week
                      .sort((a, b) => a - b)
                      .map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
                      .join(', ')}
                  </div>
                  
                  <div>
                    <span className="font-medium">Availability:</span>{' '}
                    <span className={pattern.is_available ? 'text-green-600' : 'text-red-600'}>
                      {pattern.is_available ? 'Available' : 'Blocked'}
                    </span>
                  </div>
                  
                  {pattern.custom_price && (
                    <div>
                      <span className="font-medium">Custom Price:</span>{' '}
                      ${pattern.custom_price}
                    </div>
                  )}
                  
                  {pattern.notes && (
                    <div className="col-span-2">
                      <span className="font-medium">Notes:</span>{' '}
                      {pattern.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}