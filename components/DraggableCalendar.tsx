'use client'

import { useState, useRef, useEffect } from 'react'
import { useCalendar } from '@/lib/hooks/useCalendar'
import { Booking, PropertyAvailability } from '@/lib/types'
import BookingCalendar from './BookingCalendar'

interface DraggableCalendarProps {
  propertyId: string
  bookings: Booking[]
}

type DragOperation = 'block' | 'unblock' | 'price'
type DragState = {
  active: boolean
  startDate: Date | null
  endDate: Date | null
  operation: DragOperation
  customPrice: number | null
}

export default function DraggableCalendar({ propertyId, bookings }: DraggableCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    active: false,
    startDate: null,
    endDate: null,
    operation: 'block',
    customPrice: null
  })
  const [selectedOperation, setSelectedOperation] = useState<DragOperation>('block')
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isApplying, setIsApplying] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  
  const {
    availability,
    isLoading,
    error,
    updateBulkAvailability
  } = useCalendar({
    propertyId
  })
  
  // Reset selected dates when operation changes
  useEffect(() => {
    setSelectedDates([])
  }, [selectedOperation])
  
  // Handle mouse down on calendar day
  const handleDragStart = (date: Date) => {
    // Don't start drag if we're in price mode but no price is set
    if (selectedOperation === 'price' && customPrice === null) {
      return
    }
    
    setDragState({
      active: true,
      startDate: date,
      endDate: date,
      operation: selectedOperation,
      customPrice
    })
    
    setSelectedDates([date])
    
    // Add event listeners for mouse move and mouse up
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }
  
  // Handle mouse move during drag
  const handleDragMove = (e: MouseEvent) => {
    if (!dragState.active || !dragState.startDate || !calendarRef.current) return
    
    // Get the element under the cursor
    const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY)
    
    // Find if any of the elements is a calendar day
    for (const element of elementsUnderCursor) {
      if (element.classList.contains('calendar-day') && element.getAttribute('data-date')) {
        const dateStr = element.getAttribute('data-date')
        if (dateStr) {
          const date = new Date(dateStr)
          
          // Update end date
          setDragState(prev => ({
            ...prev,
            endDate: date
          }))
          
          // Update selected dates
          updateSelectedDateRange(dragState.startDate, date)
          break
        }
      }
    }
  }
  
  // Handle mouse up to end drag
  const handleDragEnd = () => {
    setDragState(prev => ({
      ...prev,
      active: false
    }))
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }
  
  // Update the selected date range based on start and end dates
  const updateSelectedDateRange = (startDate: Date, endDate: Date) => {
    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()))
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()))
    
    const dates: Date[] = []
    const currentDate = new Date(start)
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    setSelectedDates(dates)
  }
  
  // Handle click on a single date
  const handleDateClick = (date: Date) => {
    // If shift key is pressed, extend selection
    if (window.event && (window.event as MouseEvent).shiftKey && selectedDates.length > 0) {
      const lastSelectedDate = selectedDates[selectedDates.length - 1]
      updateSelectedDateRange(lastSelectedDate, date)
    } else {
      // Toggle selection of this date
      const dateExists = selectedDates.some(d => d.toDateString() === date.toDateString())
      
      if (dateExists) {
        setSelectedDates(selectedDates.filter(d => d.toDateString() !== date.toDateString()))
      } else {
        setSelectedDates([...selectedDates, date])
      }
    }
  }
  
  // Apply the selected operation to the selected dates
  const applyOperation = async () => {
    if (selectedDates.length === 0) return
    
    setIsApplying(true)
    
    try {
      // Convert dates to strings
      const dateStrings = selectedDates.map(date => date.toISOString().split('T')[0])
      
      // Apply operation based on selected operation
      switch (selectedOperation) {
        case 'block':
          await updateBulkAvailability(dateStrings, false)
          break
        case 'unblock':
          await updateBulkAvailability(dateStrings, true)
          break
        case 'price':
          if (customPrice !== null) {
            await updateBulkAvailability(dateStrings, null, customPrice)
          }
          break
      }
      
      // Clear selection after successful operation
      setSelectedDates([])
    } catch (error) {
      console.error('Error applying operation:', error)
    } finally {
      setIsApplying(false)
    }
  }
  
  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => d.toDateString() === date.toDateString())
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Calendar Management</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'} selected
          </span>
          {selectedDates.length > 0 && (
            <button
              onClick={applyOperation}
              disabled={isApplying || (selectedOperation === 'price' && customPrice === null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
              type="button"
            >
              {isApplying ? 'Applying...' : 'Apply Changes'}
            </button>
          )}
        </div>
      </div>
      
      {/* Operation Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Select Operation</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedOperation('block')}
            className={`px-4 py-2 rounded-md ${
              selectedOperation === 'block'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            type="button"
          >
            Block Dates
          </button>
          <button
            onClick={() => setSelectedOperation('unblock')}
            className={`px-4 py-2 rounded-md ${
              selectedOperation === 'unblock'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            type="button"
          >
            Unblock Dates
          </button>
          <button
            onClick={() => setSelectedOperation('price')}
            className={`px-4 py-2 rounded-md ${
              selectedOperation === 'price'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
            type="button"
          >
            Set Price
          </button>
          
          {selectedOperation === 'price' && (
            <div className="flex items-center">
              <span className="mr-2">$</span>
              <input
                type="number"
                value={customPrice || ''}
                onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-300 rounded-md px-3 py-2 w-24"
                placeholder="Price"
                min="0"
                step="0.01"
                aria-label="Custom price"
              />
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Tip:</strong> Click and drag to select multiple dates, or use Shift+Click to select a range.
          </p>
        </div>
      </div>
      
      {/* Calendar */}
      <div 
        ref={calendarRef}
        className={`relative ${dragState.active ? 'cursor-grabbing' : 'cursor-pointer'}`}
        onMouseDown={(e) => e.preventDefault()} // Prevent text selection during drag
      >
        <BookingCalendar
          bookings={bookings}
          propertyId={propertyId}
          showAvailability={true}
          availabilityData={availability}
          onDateSelect={handleDateClick}
          selectedDates={selectedDates}
          onDragStart={handleDragStart}
        />
        
        {/* Selection overlay */}
        {dragState.active && dragState.startDate && dragState.endDate && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-30 pointer-events-none">
            {/* Visual indicator for drag operation */}
          </div>
        )}
      </div>
      
      {/* Selected Dates Summary */}
      {selectedDates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Selected Dates</h3>
          <div className="flex flex-wrap gap-2">
            {selectedDates.slice(0, 10).map((date, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {date.toLocaleDateString()}
              </span>
            ))}
            {selectedDates.length > 10 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                +{selectedDates.length - 10} more
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Operation: <span className="font-medium">
                {selectedOperation === 'block' ? 'Block dates' : 
                 selectedOperation === 'unblock' ? 'Unblock dates' : 
                 `Set price to $${customPrice || 0}`}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
</content>
</invoke>