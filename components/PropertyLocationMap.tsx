'use client'

import { useEffect, useRef, useState } from 'react'
import { getHospitalById } from '@/lib/data/hospitals'

interface PropertyLocationMapProps {
  coordinates: { lat: number; lng: number }
  propertyTitle: string
  hospitalDistances?: Record<string, {
    distance_miles: number
    drive_time_minutes: number
    hospital_name: string
    hospital_type: string
  }> | null
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function PropertyLocationMap({ 
  coordinates, 
  propertyTitle,
  hospitalDistances
}: PropertyLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  
  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initializeMap()
      return
    }
    
    // Load Google Maps API
    window.initMap = () => {
      setMapLoaded(true)
    }
    
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initMap`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    
    return () => {
      window.initMap = () => {}
      document.head.removeChild(script)
    }
  }, [])
  
  useEffect(() => {
    if (mapLoaded) {
      initializeMap()
    }
  }, [mapLoaded])
  
  const initializeMap = () => {
    if (!mapRef.current) return
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: coordinates,
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false
    })
    
    // Add property marker
    new window.google.maps.Marker({
      position: coordinates,
      map,
      title: propertyTitle,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 10
      }
    })
    
    // Add hospital markers if available
    if (hospitalDistances) {
      Object.entries(hospitalDistances).forEach(([hospitalId, data]) => {
        const hospital = getHospitalById(hospitalId)
        if (hospital && hospital.coordinates) {
          const hospitalMarker = new window.google.maps.Marker({
            position: hospital.coordinates,
            map,
            title: hospital.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#EF4444',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 8
            }
          })
          
          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${hospital.name}</div>
                <div style="font-size: 12px; color: #666;">
                  ${data.distance_miles.toFixed(1)} miles (${data.drive_time_minutes.toFixed(0)} min drive)
                </div>
              </div>
            `
          })
          
          hospitalMarker.addListener('click', () => {
            infoWindow.open(map, hospitalMarker)
          })
        }
      })
      
      // Adjust bounds to fit all markers
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(coordinates)
      
      Object.entries(hospitalDistances).forEach(([hospitalId]) => {
        const hospital = getHospitalById(hospitalId)
        if (hospital && hospital.coordinates) {
          bounds.extend(hospital.coordinates)
        }
      })
      
      map.fitBounds(bounds)
    }
  }
  
  return (
    <div ref={mapRef} className="w-full h-full">
      {!mapLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}