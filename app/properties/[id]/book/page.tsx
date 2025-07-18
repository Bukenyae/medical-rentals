'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import BookingFlow from '@/components/BookingFlow'

interface BookingPageProps {
  params: {
    id: string
  }
}

export default function BookingPage({ params }: BookingPageProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  // Handle booking completion
  const handleBookingComplete = (bookingId: string) => {
    // Redirect to booking details after a short delay
    setTimeout(() => {
      router.push(`/dashboard/bookings`)
    }, 5000)
  }
  
  // Handle booking cancellation
  const handleBookingCancel = () => {
    router.push(`/properties/${params.id}`)
  }
  
  // If not logged in, redirect to sign in
  if (!loading && !user) {
    router.push(`/auth/signin?redirect=/properties/${params.id}/book`)
    return null
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <BookingFlow
          propertyId={params.id}
          onComplete={handleBookingComplete}
          onCancel={handleBookingCancel}
        />
      </div>
    </div>
  )
}