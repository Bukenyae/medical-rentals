'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBookings } from '@/lib/hooks/useBookings'
import { useProperties } from '@/lib/hooks/useProperties'
import { Property } from '@/lib/types/property'
import { CreateBookingInput } from '@/lib/validations/booking'
import { formatCurrency } from '@/lib/utils/format'

interface BookingFlowProps {
  propertyId: string
  onComplete?: (bookingId: string) => void
  onCancel?: () => void
}

type BookingStep = 'dates' | 'guests' | 'review' | 'confirmation'

export default function BookingFlow({ propertyId, onComplete, onCancel }: BookingFlowProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { createBooking } = useBookings()
  const { property, loading: propertyLoading } = useProperties().useProperty(propertyId)
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('dates')
  const [bookingData, setBookingData] = useState<Partial<CreateBookingInput>>({
    property_id: propertyId,
    guest_count: 1,
    guest_details: {
      name: user?.profile?.first_name && user?.profile?.last_name 
        ? `${user.profile.first_name} ${user.profile.last_name}`
        : '',
      email: user?.email || '',
      phone: user?.profile?.phone || '',
    },
    special_requests: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState<number | null>(null)

  // Calculate number of nights and total price
  const calculateTotalPrice = () => {
    if (!property || !bookingData.check_in || !bookingData.check_out) return null
    
    const checkIn = new Date(bookingData.check_in)
    const checkOut = new Date(bookingData.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    
    return property.base_price * nights
  }

  // Handle date selection
  const handleDateChange = (field: 'check_in' | 'check_out', value: string) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle guest details change
  const handleGuestDetailsChange = (field: keyof typeof bookingData.guest_details, value: string) => {
    setBookingData(prev => ({
      ...prev,
      guest_details: {
        ...prev.guest_details!,
        [field]: value
      }
    }))
  }

  // Handle guest count change
  const handleGuestCountChange = (value: number) => {
    setBookingData(prev => ({
      ...prev,
      guest_count: value
    }))
  }

  // Handle special requests change
  const handleSpecialRequestsChange = (value: string) => {
    setBookingData(prev => ({
      ...prev,
      special_requests: value
    }))
  }

  // Validate current step
  const validateCurrentStep = (): boolean => {
    setError(null)
    
    switch (currentStep) {
      case 'dates':
        if (!bookingData.check_in || !bookingData.check_out) {
          setError('Please select check-in and check-out dates')
          return false
        }
        
        const checkIn = new Date(bookingData.check_in)
        const checkOut = new Date(bookingData.check_out)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (checkIn < today) {
          setError('Check-in date must be today or in the future')
          return false
        }
        
        if (checkOut <= checkIn) {
          setError('Check-out date must be after check-in date')
          return false
        }
        
        return true
        
      case 'guests':
        if (!bookingData.guest_details?.name) {
          setError('Please enter your name')
          return false
        }
        
        if (!bookingData.guest_details?.email) {
          setError('Please enter your email')
          return false
        }
        
        if (!bookingData.guest_details?.phone) {
          setError('Please enter your phone number')
          return false
        }
        
        if (!bookingData.guest_count || bookingData.guest_count < 1) {
          setError('Please enter a valid number of guests')
          return false
        }
        
        if (property && bookingData.guest_count > property.max_guests) {
          setError(`Maximum ${property.max_guests} guests allowed for this property`)
          return false
        }
        
        return true
        
      case 'review':
        // All validation should be done in previous steps
        return true
        
      default:
        return true
    }
  }

  // Move to next step
  const handleNextStep = () => {
    if (!validateCurrentStep()) return
    
    if (currentStep === 'dates') {
      const calculatedPrice = calculateTotalPrice()
      setTotalPrice(calculatedPrice)
      setCurrentStep('guests')
    } else if (currentStep === 'guests') {
      setCurrentStep('review')
    } else if (currentStep === 'review') {
      handleSubmitBooking()
    }
  }

  // Move to previous step
  const handlePreviousStep = () => {
    if (currentStep === 'guests') {
      setCurrentStep('dates')
    } else if (currentStep === 'review') {
      setCurrentStep('guests')
    }
  }

  // Submit booking
  const handleSubmitBooking = async () => {
    if (!validateCurrentStep() || !bookingData.check_in || !bookingData.check_out || 
        !bookingData.guest_count || !bookingData.guest_details) {
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const booking = await createBooking({
        property_id: propertyId,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        guest_count: bookingData.guest_count,
        guest_details: bookingData.guest_details,
        special_requests: bookingData.special_requests
      })
      
      setCreatedBookingId(booking.id)
      setCurrentStep('confirmation')
      
      if (onComplete) {
        onComplete(booking.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle view booking details
  const handleViewBooking = () => {
    if (createdBookingId) {
      router.push(`/dashboard/bookings/${createdBookingId}`)
    }
  }

  // Handle booking another property
  const handleBookAnother = () => {
    router.push('/properties')
  }

  if (propertyLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800">Property not found</h3>
        <p className="mt-2 text-red-700">
          The property you are trying to book could not be found. Please try again or contact support.
        </p>
        <button
          type="button"
          onClick={() => router.push('/properties')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Browse Properties
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <h2 className="text-xl font-semibold">Book Your Stay</h2>
        <p className="text-blue-100">{property.title}</p>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={`flex flex-col items-center ${currentStep === 'dates' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'dates' ? 'bg-blue-600 text-white' : 
              currentStep === 'guests' || currentStep === 'review' || currentStep === 'confirmation' ? 'bg-green-500 text-white' : 
              'bg-gray-200 text-gray-700'
            }`}>
              1
            </div>
            <span className="text-xs mt-1">Dates</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${
            currentStep === 'guests' || currentStep === 'review' || currentStep === 'confirmation' ? 'bg-green-500' : 'bg-gray-200'
          }`}></div>
          
          <div className={`flex flex-col items-center ${currentStep === 'guests' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'guests' ? 'bg-blue-600 text-white' : 
              currentStep === 'review' || currentStep === 'confirmation' ? 'bg-green-500 text-white' : 
              'bg-gray-200 text-gray-700'
            }`}>
              2
            </div>
            <span className="text-xs mt-1">Guests</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${
            currentStep === 'review' || currentStep === 'confirmation' ? 'bg-green-500' : 'bg-gray-200'
          }`}></div>
          
          <div className={`flex flex-col items-center ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'review' ? 'bg-blue-600 text-white' : 
              currentStep === 'confirmation' ? 'bg-green-500 text-white' : 
              'bg-gray-200 text-gray-700'
            }`}>
              3
            </div>
            <span className="text-xs mt-1">Review</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${currentStep === 'confirmation' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          
          <div className={`flex flex-col items-center ${currentStep === 'confirmation' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'confirmation' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              4
            </div>
            <span className="text-xs mt-1">Confirm</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {currentStep === 'dates' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Select Your Dates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="check-in" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date
                </label>
                <input
                  type="date"
                  id="check-in"
                  value={bookingData.check_in || ''}
                  onChange={(e) => handleDateChange('check_in', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="check-out" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date
                </label>
                <input
                  type="date"
                  id="check-out"
                  value={bookingData.check_out || ''}
                  onChange={(e) => handleDateChange('check_out', e.target.value)}
                  min={bookingData.check_in || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            {bookingData.check_in && bookingData.check_out && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {new Date(bookingData.check_in).toLocaleDateString()} - {new Date(bookingData.check_out).toLocaleDateString()}
                  </span>
                  <span className="font-semibold">
                    {(() => {
                      const checkIn = new Date(bookingData.check_in)
                      const checkOut = new Date(bookingData.check_out)
                      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                      return `${nights} night${nights !== 1 ? 's' : ''}`
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'guests' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Guest Information</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="guest-name"
                  value={bookingData.guest_details?.name || ''}
                  onChange={(e) => handleGuestDetailsChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="guest-email"
                  value={bookingData.guest_details?.email || ''}
                  onChange={(e) => handleGuestDetailsChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="guest-phone"
                  value={bookingData.guest_details?.phone || ''}
                  onChange={(e) => handleGuestDetailsChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="purpose-of-visit" className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit (Optional)
                </label>
                <input
                  type="text"
                  id="purpose-of-visit"
                  value={bookingData.guest_details?.purpose_of_visit || ''}
                  onChange={(e) => handleGuestDetailsChange('purpose_of_visit', e.target.value)}
                  placeholder="e.g., Medical treatment, Family visit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="guest-count" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Guests
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleGuestCountChange(Math.max(1, (bookingData.guest_count || 1) - 1))}
                    className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                    disabled={(bookingData.guest_count || 1) <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="guest-count"
                    value={bookingData.guest_count || 1}
                    onChange={(e) => handleGuestCountChange(parseInt(e.target.value) || 1)}
                    min="1"
                    max={property.max_guests}
                    className="w-16 px-3 py-2 border-t border-b border-gray-300 text-center focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleGuestCountChange(Math.min(property.max_guests, (bookingData.guest_count || 1) + 1))}
                    className="px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                    disabled={(bookingData.guest_count || 1) >= property.max_guests}
                  >
                    +
                  </button>
                  <span className="ml-2 text-sm text-gray-500">
                    (Max: {property.max_guests})
                  </span>
                </div>
              </div>
              
              <div>
                <label htmlFor="special-requests" className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  id="special-requests"
                  value={bookingData.special_requests || ''}
                  onChange={(e) => handleSpecialRequestsChange(e.target.value)}
                  rows={3}
                  placeholder="Any special requirements or requests?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Your Booking</h3>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Property</h4>
                <p>{property.title}</p>
                <p className="text-sm text-gray-500">
                  {property.address.street}, {property.address.city}, {property.address.state} {property.address.zip}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Check-in</h4>
                  <p>{new Date(bookingData.check_in!).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Check-out</h4>
                  <p>{new Date(bookingData.check_out!).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Guest Information</h4>
                <p>{bookingData.guest_details?.name}</p>
                <p>{bookingData.guest_details?.email}</p>
                <p>{bookingData.guest_details?.phone}</p>
                <p>{bookingData.guest_count} guest{bookingData.guest_count !== 1 ? 's' : ''}</p>
              </div>
              
              {bookingData.special_requests && (
                <div>
                  <h4 className="font-medium text-gray-900">Special Requests</h4>
                  <p>{bookingData.special_requests}</p>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Total Price</h4>
                  <p className="text-xl font-bold text-blue-600">
                    {totalPrice ? formatCurrency(totalPrice) : 'Calculating...'}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {(() => {
                    if (!bookingData.check_in || !bookingData.check_out) return '';
                    const checkIn = new Date(bookingData.check_in);
                    const checkOut = new Date(bookingData.check_out);
                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    return `${formatCurrency(property.base_price)} × ${nights} night${nights !== 1 ? 's' : ''}`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'confirmation' && (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="mt-4 text-xl font-medium text-gray-900">Booking Confirmed!</h3>
            
            <p className="mt-2 text-gray-600">
              Your booking has been successfully confirmed. You will receive a confirmation email shortly.
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
              <button
                type="button"
                onClick={handleViewBooking}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                View Booking Details
              </button>
              
              <button
                type="button"
                onClick={handleBookAnother}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Book Another Property
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {currentStep !== 'confirmation' && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          {currentStep !== 'dates' ? (
            <button
              type="button"
              onClick={handlePreviousStep}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          
          <button
            type="button"
            onClick={handleNextStep}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {currentStep === 'review' ? 'Confirm Booking' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}