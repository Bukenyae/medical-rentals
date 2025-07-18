'use client'

import { useState } from 'react'

interface HospitalProximityDisplayProps {
  hospitalDistances: Record<string, {
    distance_miles: number
    drive_time_minutes: number
    hospital_name: string
    hospital_type: string
  }>
}

export function HospitalProximityDisplay({ hospitalDistances }: HospitalProximityDisplayProps) {
  const [showAll, setShowAll] = useState(false)
  
  // Convert to array and sort by distance
  const hospitals = Object.entries(hospitalDistances)
    .map(([id, data]) => ({
      id,
      ...data
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles)

  // Get closest hospital
  const closestHospital = hospitals.length > 0 ? hospitals[0] : null
  
  // Count hospitals within certain distances
  const within5Miles = hospitals.filter(h => h.distance_miles <= 5).length
  const within10Miles = hospitals.filter(h => h.distance_miles <= 10).length
  
  // Group by type
  const hospitalsByType = hospitals.reduce((acc, hospital) => {
    if (!acc[hospital.hospital_type]) {
      acc[hospital.hospital_type] = []
    }
    acc[hospital.hospital_type].push(hospital)
    return acc
  }, {} as Record<string, typeof hospitals>)

  return (
    <div>
      {/* Summary */}
      <div className="mb-4">
        {closestHospital && (
          <div className="mb-3">
            <div className="font-medium">Closest Hospital:</div>
            <div className="flex items-center text-blue-600 font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {closestHospital.hospital_name}
            </div>
            <div className="ml-6 text-sm text-gray-600">
              {closestHospital.distance_miles.toFixed(1)} miles ({closestHospital.drive_time_minutes.toFixed(0)} min drive)
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-2xl font-bold text-blue-700">{within5Miles}</div>
            <div className="text-xs text-gray-600">Hospitals within 5 miles</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-2xl font-bold text-blue-700">{within10Miles}</div>
            <div className="text-xs text-gray-600">Hospitals within 10 miles</div>
          </div>
        </div>
      </div>
      
      {/* Hospital List */}
      <div className="space-y-3">
        {Object.entries(hospitalsByType).map(([type, hospitals]) => (
          <div key={type}>
            <h4 className="font-medium text-gray-900 mb-1 capitalize">
              {type} Hospitals
            </h4>
            <ul className="space-y-2">
              {(showAll ? hospitals : hospitals.slice(0, 2)).map(hospital => (
                <li key={hospital.id} className="text-sm">
                  <div className="font-medium">{hospital.hospital_name}</div>
                  <div className="text-gray-600">
                    {hospital.distance_miles.toFixed(1)} miles ({hospital.drive_time_minutes.toFixed(0)} min drive)
                  </div>
                </li>
              ))}
            </ul>
            
            {hospitals.length > 2 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                Show {hospitals.length - 2} more {type} hospitals
              </button>
            )}
          </div>
        ))}
      </div>
      
      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-blue-600 hover:text-blue-800 mt-3 block"
        >
          Show less
        </button>
      )}
    </div>
  )
}