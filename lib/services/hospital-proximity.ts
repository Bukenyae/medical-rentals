import { calculateDistance } from '@/lib/utils/google-maps';
import { BATON_ROUGE_HOSPITALS, Hospital } from '@/lib/data/hospitals';

export interface HospitalProximity {
  hospital_id: string;
  hospital_name: string;
  distance_miles: number;
  drive_time_minutes: number;
  hospital_type: Hospital['type'];
}

export interface PropertyHospitalData {
  [hospitalId: string]: {
    distance_miles: number;
    drive_time_minutes: number;
    hospital_name: string;
    hospital_type: Hospital['type'];
  };
}

/**
 * Hospital proximity calculation service
 */
export class HospitalProximityService {
  /**
   * Calculate distances from a property to all hospitals
   */
  static async calculateAllHospitalDistances(
    propertyCoordinates: { lat: number; lng: number }
  ): Promise<HospitalProximity[]> {
    const proximityData: HospitalProximity[] = [];

    // Calculate distance to each hospital
    for (const hospital of BATON_ROUGE_HOSPITALS) {
      try {
        const distanceData = await calculateDistance(
          propertyCoordinates,
          hospital.coordinates
        );

        if (distanceData) {
          proximityData.push({
            hospital_id: hospital.id,
            hospital_name: hospital.name,
            distance_miles: distanceData.distance_miles,
            drive_time_minutes: distanceData.drive_time_minutes,
            hospital_type: hospital.type,
          });
        }
      } catch (error) {
        console.error(`Error calculating distance to ${hospital.name}:`, error);
      }
    }

    // Sort by distance (closest first)
    return proximityData.sort((a, b) => a.distance_miles - b.distance_miles);
  }

  /**
   * Calculate distance to specific hospitals
   */
  static async calculateSpecificHospitalDistances(
    propertyCoordinates: { lat: number; lng: number },
    hospitalIds: string[]
  ): Promise<HospitalProximity[]> {
    const proximityData: HospitalProximity[] = [];

    for (const hospitalId of hospitalIds) {
      const hospital = BATON_ROUGE_HOSPITALS.find(h => h.id === hospitalId);
      if (!hospital) continue;

      try {
        const distanceData = await calculateDistance(
          propertyCoordinates,
          hospital.coordinates
        );

        if (distanceData) {
          proximityData.push({
            hospital_id: hospital.id,
            hospital_name: hospital.name,
            distance_miles: distanceData.distance_miles,
            drive_time_minutes: distanceData.drive_time_minutes,
            hospital_type: hospital.type,
          });
        }
      } catch (error) {
        console.error(`Error calculating distance to ${hospital.name}:`, error);
      }
    }

    return proximityData.sort((a, b) => a.distance_miles - b.distance_miles);
  }

  /**
   * Convert proximity array to database format
   */
  static formatForDatabase(proximityData: HospitalProximity[]): PropertyHospitalData {
    const formatted: PropertyHospitalData = {};

    proximityData.forEach(proximity => {
      formatted[proximity.hospital_id] = {
        distance_miles: proximity.distance_miles,
        drive_time_minutes: proximity.drive_time_minutes,
        hospital_name: proximity.hospital_name,
        hospital_type: proximity.hospital_type,
      };
    });

    return formatted;
  }

  /**
   * Get closest hospitals by type
   */
  static getClosestByType(
    proximityData: HospitalProximity[],
    type: Hospital['type'],
    limit: number = 3
  ): HospitalProximity[] {
    return proximityData
      .filter(proximity => proximity.hospital_type === type)
      .slice(0, limit);
  }

  /**
   * Get hospitals within a certain distance
   */
  static getHospitalsWithinDistance(
    proximityData: HospitalProximity[],
    maxDistanceMiles: number
  ): HospitalProximity[] {
    return proximityData.filter(
      proximity => proximity.distance_miles <= maxDistanceMiles
    );
  }

  /**
   * Get hospitals within a certain drive time
   */
  static getHospitalsWithinDriveTime(
    proximityData: HospitalProximity[],
    maxDriveTimeMinutes: number
  ): HospitalProximity[] {
    return proximityData.filter(
      proximity => proximity.drive_time_minutes <= maxDriveTimeMinutes
    );
  }

  /**
   * Calculate average distance to hospitals
   */
  static calculateAverageDistance(proximityData: HospitalProximity[]): {
    averageDistance: number;
    averageDriveTime: number;
  } {
    if (proximityData.length === 0) {
      return { averageDistance: 0, averageDriveTime: 0 };
    }

    const totalDistance = proximityData.reduce(
      (sum, proximity) => sum + proximity.distance_miles,
      0
    );
    const totalDriveTime = proximityData.reduce(
      (sum, proximity) => sum + proximity.drive_time_minutes,
      0
    );

    return {
      averageDistance: totalDistance / proximityData.length,
      averageDriveTime: totalDriveTime / proximityData.length,
    };
  }

  /**
   * Get proximity summary for display
   */
  static getProximitySummary(proximityData: HospitalProximity[]): {
    closest: HospitalProximity | null;
    generalHospitals: HospitalProximity[];
    specialtyHospitals: HospitalProximity[];
    within5Miles: number;
    within10Miles: number;
  } {
    const closest = proximityData.length > 0 ? proximityData[0] : null;
    const generalHospitals = this.getClosestByType(proximityData, 'general', 3);
    const specialtyHospitals = this.getClosestByType(proximityData, 'specialty', 3);
    const within5Miles = this.getHospitalsWithinDistance(proximityData, 5).length;
    const within10Miles = this.getHospitalsWithinDistance(proximityData, 10).length;

    return {
      closest,
      generalHospitals,
      specialtyHospitals,
      within5Miles,
      within10Miles,
    };
  }
}