import { Heart } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AuthButton from '@/components/AuthButton'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Medical Rentals</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <AuthButton user={user} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Heart className="h-16 w-16 text-blue-600" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Medical Rentals
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comfortable short-term rentals near medical facilities in Baton Rouge
          </p>
          
          {user && (
            <div className="mb-8 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg max-w-md mx-auto">
              <p className="font-medium">Welcome back!</p>
              <p className="text-sm">Signed in as {user.email}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              🏥 Close to hospitals
            </p>
            <p className="text-lg text-gray-700">
              🏠 Comfortable accommodations
            </p>
            <p className="text-lg text-gray-700">
              📱 Easy booking process
            </p>
          </div>
          
          <div className="mt-12 space-y-4">
            {!user ? (
              <div className="space-x-4">
                <Link
                  href="/auth/signin"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            ) : (
              <p className="text-gray-600">
                Welcome! Ready to find your perfect medical stay accommodation.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}