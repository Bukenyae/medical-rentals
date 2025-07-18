'use client'

import { useState, useEffect } from 'react'
import { useCalendar } from '@/lib/hooks/useCalendar'
import BookingCalendar from './BookingCalendar'
import RecurringPatternManager from './RecurringPatternManager'
import DraggableCalendar from './DraggableCalendar'
import { Booking, PropertyAvailability } from '@/lib/types'

interface CalendarManagerProps {
  propertyId: string
  bookings: Booking[]
}

export default function CalendarManager({ propertyId, bookings }: CalendarManagerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')
  const [isRecurringMode, setIsRecurringMode] = useState<boolean>(false)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [demandFactor, setDemandFactor] = useState<number>(1.0)
  const [activeTab, setActiveTab] = useState<'calendar' | 'patterns' | 'pricing'>('calendar')
  
  // Use the calendar hook
  const {
    availability,
    isLoading,
    error,
    updateDateAvailability,
    updateRecurringAvailability,
    applyDynamicPricing
  } = useCalendar({
    propertyId,
    initialStartDate: getDefaultStartDate(),
    initialEndDate: getDefaultEndDate()
  })
  
  // Helper functions to get default date ranges
  function getDefaultStartDate(): string {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  
  function getDefaultEndDate(): string {
    const today = new Date()
    today.setDate(today.getDate() + 90) // 3 months ahead
    return today.toISOString().split('T')[0]
  }
  
  // Update selected date info when a date is selected
  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      setSelectedDateStr(dateStr)
      
      // Find availability info for this date
      const availabilityInfo = availability?.find(a => a.date === dateStr)
      
      if (availabilityInfo) {
        setIsAvailable(availabilityInfo.is_available)
        setCustomPrice(availabilityInfo.price)
      } else {
        setIsAvailable(true)
        setCustomPrice(null)
      }
    }
  }, [selectedDate, availability])
  
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }
  
  // Handle availability toggle
  const handleAvailabilityToggle = () => {
    if (!selectedDateStr) return
    
    updateDateAvailability(selectedDateStr, !isAvailable, customPrice || undefined, notes || undefined)
    setIsAvailable(!isAvailable)
  }
  
  // Handle price update
  const handlePriceUpdate = () => {
    if (!selectedDateStr || customPrice === null) return
    
    updateDateAvailability(selectedDateStr, isAvailable, customPrice, notes || undefined)
  }
  
  // Handle recurring pattern update
  const handleRecurringUpdate = () => {
    if (!selectedDateStr || !endDate) return
    
    updateRecurringAvailability(
      selectedDateStr,
      endDate,
      selectedDays.length > 0 ? selectedDays : null,
      isAvailable,
      customPrice || undefined,
      notes || undefined
    )
  }
  
  // Handle dynamic pricing
  const handleDynamicPricing = () => {
    if (!selectedDateStr || !endDate) return
    
    applyDynamicPricing(selectedDateStr, endDate, demandFactor)
  }
  
  // Toggle day selection for recurring pattern
  const toggleDaySelection = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            type="button"
            aria-label="Calendar tab"
          >
            Calendar & Availability
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'patterns'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            type="button"
            aria-label="Recurring patterns tab"
          >
            Recurring Patterns
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'pricing'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            type="button"
            aria-label="Dynamic pricing tab"
          >
            Dynamic Pricing
          </button>
        </nav>
      </div>

      {/* Calendar & Availability Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Calendar Management</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsRecurringMode(!isRecurringMode)}
                className={`px-4 py-2 rounded-md ${
                  isRecurringMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                type="button"
              >
                {isRecurringMode ? 'Switch to Single Date' : 'Switch to Recurring Pattern'}
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading calendar data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar View with Drag-and-Drop */}
              <div>
                <h3 className="text-lg font-medium mb-4">Interactive Calendar</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Click on dates to select them individually, or click and drag to select multiple dates at once.
                    Use Shift+Click to select a range of dates.
                  </p>
                  <BookingCalendar 
                    bookings={bookings}
                    propertyId={propertyId}
                    onDateSelect={handleDateSelect}
                    selectedDate={selectedDate || undefined}
                    showAvailability={true}
                    availabilityData={availability}
                    onDragStart={(date) => {
                      setSelectedDate(date);
                      setSelectedDateStr(date.toISOString().split('T')[0]);
                    }}
                  />
                </div>
              </div>
              
              {/* Availability Management */}
              <div>
                <h3 className="text-lg font-medium mb-4">
                  {isRecurringMode ? 'Recurring Pattern Management' : 'Date Management'}
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  {selectedDateStr ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {isRecurringMode ? 'Start Date:' : 'Selected Date:'}
                        </span>
                        <span>{selectedDateStr}</span>
                      </div>
                      
                      {isRecurringMode && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">End Date:</span>
                            <input
                              type="date"
                              value={endDate || ''}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2"
                              aria-label="End date"
                            />
                          </div>
                          
                          <div>
                            <span className="font-medium block mb-2">Days of Week:</span>
                            <div className="flex flex-wrap gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                <button
                                  key={day}
                                  onClick={() => toggleDaySelection(index)}
                                  className={`px-3 py-1 rounded-md ${
                                    selectedDays.includes(index)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                  type="button"
                                  aria-label={`Select ${day}`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Availability:</span>
                        <div className="flex items-center">
                          <button
                            onClick={handleAvailabilityToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              isAvailable ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            type="button"
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
                      
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Custom Price:</span>
                        <div className="flex items-center">
                          <span className="mr-2">$</span>
                          <input
                            type="number"
                            value={customPrice || ''}
                            onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
                            className="border border-gray-300 rounded-md px-3 py-2 w-24"
                            placeholder="Price"
                            aria-label="Custom price"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium block mb-2">Notes:</span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full"
                          placeholder="Add notes about this date"
                          rows={2}
                          aria-label="Notes"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        {isRecurringMode ? (
                          <button
                            onClick={handleRecurringUpdate}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md"
                            disabled={!endDate}
                            type="button"
                          >
                            Apply to Date Range
                          </button>
                        ) : (
                          <button
                            onClick={handlePriceUpdate}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md"
                            type="button"
                          >
                            Update Date
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      Select a date on the calendar to manage availability
                    </div>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (selectedDateStr) {
                          updateDateAvailability(selectedDateStr, false);
                          setIsAvailable(false);
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                      disabled={!selectedDateStr}
                      type="button"
                    >
                      Block Date
                    </button>
                    <button
                      onClick={() => {
                        if (selectedDateStr) {
                          updateDateAvailability(selectedDateStr, true);
                          setIsAvailable(true);
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                      disabled={!selectedDateStr}
                      type="button"
                    >
                      Unblock Date
                    </button>
                    <button
                      onClick={() => {
                        if (selectedDateStr) {
                          updateDateAvailability(selectedDateStr, null, null);
                          setCustomPrice(null);
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                      disabled={!selectedDateStr}
                      type="button"
                    >
                      Reset Price
                    </button>
                    <button
                      onClick={() => setActiveTab('patterns')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                      type="button"
                    >
                      Manage Patterns
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Advanced Drag Selection */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Advanced Calendar Management</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use the drag-and-drop interface below to quickly manage multiple dates at once.
              Click and drag to select date ranges, then apply changes to all selected dates.
            </p>
            <DraggableCalendar propertyId={propertyId} bookings={bookings} />
          </div>
        </div>
      )}

      {/* Recurring Patterns Tab */}
      {activeTab === 'patterns' && (
        <div>
          <RecurringPatternManager propertyId={propertyId} />
        </div>
      )}

      {/* Dynamic Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Dynamic Pricing Management</h2>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Generate Dynamic Pricing</h3>
                <p className="text-gray-600 mb-4">
                  Set dynamic pricing based on seasonal factors, day of week, and demand. 
                  The system will automatically calculate optimal prices for the selected date range.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dynamic-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="dynamic-start-date"
                    type="date"
                    value={selectedDateStr || ''}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="dynamic-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="dynamic-end-date"
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="demand-factor" className="block text-sm font-medium text-gray-700 mb-1">
                  Demand Factor: {demandFactor.toFixed(1)}x
                </label>
                <input
                  id="demand-factor"
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={demandFactor}
                  onChange={(e) => setDemandFactor(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low Demand (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>High Demand (1.5x)</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How Dynamic Pricing Works</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Base price is adjusted by seasonal factors (summer, holidays, etc.)</li>
                  <li>Weekend days (Friday, Saturday) receive a 15% premium</li>
                  <li>Demand factor allows you to adjust for local events or market conditions</li>
                  <li>Prices are rounded to the nearest dollar amount</li>
                </ul>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleDynamicPricing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md"
                  disabled={!selectedDateStr || !endDate}
                  type="button"
                >
                  Generate Dynamic Pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}