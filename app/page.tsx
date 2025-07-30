import { Heart } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Heart className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Medical Rentals
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comfortable short-term rentals near medical facilities in Baton Rouge
          </p>
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
          <div className="mt-12">
            <p className="text-gray-500">
              Platform launching soon...
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}