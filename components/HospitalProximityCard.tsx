'use client'

import { useState } from 'react'
import { getHospitalsByType } from '@/lib/data/hospitals'

interface HospitalProximityCardProps {
  hospitalDistances: Record<string, {
    distance_miles: number
    drive_time_minutes: number
    hospital_name: string
    hospital_type: string
  }>
  compact?: boolean
}

export function HospitalProximityCard({ 
  hospitalDistances,
  compact = false
}: HospitalProximityCardProps) {
  const [showAll, setShowAll] = useState(false)
  
  // Convert to array and sort by distance
  const hospitals = Object.entries(hospitalDistances)
    .map(([id, data]) => ({
      id,
      ...data
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles)

  // Group by type
  const hospitalsByType = hospitals.reduce((acc, hospital) => {
    if (!acc[hospital.hospital_type]) {
      acc[hospital.hospital_type] = []
    }
    acc[hospital.hospital_type].push(hospital)
    return acc
  }, {} as Record<string, typeof hospitals>)

  // Calculate statistics
  const closestHospital = hospitals.length > 0 ? hospitals[0] : null
  const generalHospitals = hospitals.filter(h => h.hospital_type === 'general')
  const specialtyHospitals = hospitals.filter(h => h.hospital_type === 'specialty')
  const within5Miles = hospitals.filter(h => h.distance_miles <= 5).length
  const within10Miles = hospitals.filter(h => h.distance_miles <= 10).length

  if (compact) {
    return (
      <div className="text-sm">
        {closestHospital && (
          <div className="mb-2">
            <div className="font-medium">Closest: {closestHospital.hospital_name}</div>
            <div className="text-gray-600">
              {closestHospital.distance_miles.toFixed(1)} miles ({closestHospital.drive_time_minutes.toFixed(0)} min drive)
            </div>
          </div>
        )}
        
        <div className="text-gray-600">
          {within5Miles} hospitals within 5 miles
          <br />
          {within10Miles} hospitals within 10 miles
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Hospital Proximity</h3>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-md p-3">
          <h4 className="font-medium text-blue-800 mb-1">Closest Hospital</h4>
          {closestHospital ? (
            <>
              <div className="font-medium">{closestHospital.hospital_name}</div>
              <div className="text-sm text-gray-600">
                {closestHospital.distance_miles.toFixed(1)} miles ({closestHospital.drive_time_minutes.toFixed(0)} min drive)
              </div>
            </>
          ) : (
            <div className="text-gray-500">No data available</div>
          )}
        </div>
        
        <div className="bg-blue-50 rounded-md p-3">
          <h4 className="font-medium text-blue-800 mb-1">Hospital Coverage</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-2xl font-bold">{within5Miles}</div>
              <div className="text-sm text-gray-600">Within 5 miles</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{within10Miles}</div>
              <div className="text-sm text-gray-600">Within 10 miles</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hospital List */}
      <div className="space-y-4">
        {Object.entries(hospitalsByType).map(([type, hospitals]) => (
          <div key={type}>
            <h4 className="font-medium text-gray-900 mb-2 capitalize">
              {type} Hospitals
            </h4>
            <div className="space-y-2">
              {(showAll ? hospitals : hospitals.slice(0, 3)).map(hospital => (
                <div key={hospital.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <div>
                    <div className="font-medium">{hospital.hospital_name}</div>
                    <div className="text-sm text-gray-600">
                      {hospital.distance_miles.toFixed(1)} miles
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {hospital.drive_time_minutes.toFixed(0)} min drive
                  </div>
                </div>
              ))}
            </div>
            
            {hospitals.length > 3 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                Show {hospitals.length - 3} more {type} hospitals
              </button>
            )}
          </div>
        ))}
      </div>
      
      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-sm text-blue-600 hover:text-blue-800 mt-4 block"
        >
          Show less
        </button>
      )}
    </div>
  )
}