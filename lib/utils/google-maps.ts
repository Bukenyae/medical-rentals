import { Loader } from '@googlemaps/js-api-loader';

interface Coordinates {
  lat: number;
  lng: number;
}

interface ProximityResult {
  distance_miles: number | null;
  drive_time_minutes: number | null;
}

/**
 * Calculates the distance and drive time between a property and a hospital
 * using the Google Maps Distance Matrix API
 */
export async function calculateHospitalProximity(
  propertyCoordinates: Coordinates,
  hospitalCoordinates: Coordinates
): Promise<ProximityResult> {
  try {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    const google = await loader.load();
    const service = new google.maps.DistanceMatrixService();

    return new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [new google.maps.LatLng(propertyCoordinates.lat, propertyCoordinates.lng)],
          destinations: [new google.maps.LatLng(hospitalCoordinates.lat, hospitalCoordinates.lng)],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL
        },
        (response, status) => {
          if (
            status === 'OK' &&
            response.rows[0].elements[0].status === 'OK' &&
            response.rows[0].elements[0].distance &&
            response.rows[0].elements[0].duration
          ) {
            const distanceInMeters = response.rows[0].elements[0].distance.value;
            const durationInSeconds = response.rows[0].elements[0].duration.value;
            
            // Convert meters to miles (1 meter = 0.000621371 miles)
            const distanceInMiles = distanceInMeters * 0.000621371;
            
            // Convert seconds to minutes
            const durationInMinutes = durationInSeconds / 60;
            
            resolve({
              distance_miles: parseFloat(distanceInMiles.toFixed(1)),
              drive_time_minutes: Math.round(durationInMinutes)
            });
          } else {
            resolve({
              distance_miles: null,
              drive_time_minutes: null
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error calculating hospital proximity:', error);
    return {
      distance_miles: null,
      drive_time_minutes: null
    };
  }
}