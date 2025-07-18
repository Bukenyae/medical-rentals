export interface Hospital {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'general' | 'specialty' | 'emergency' | 'rehabilitation';
  phone?: string;
  website?: string;
  services?: string[];
}

/**
 * Major hospitals in Baton Rouge area
 * Coordinates are approximate and should be verified/updated with actual geocoding
 */
export const BATON_ROUGE_HOSPITALS: Hospital[] = [
  {
    id: 'our-lady-of-the-lake',
    name: 'Our Lady of the Lake Regional Medical Center',
    address: '5000 Hennessy Blvd, Baton Rouge, LA 70808',
    coordinates: {
      lat: 30.4118,
      lng: -91.1258,
    },
    type: 'general',
    phone: '(225) 765-6565',
    website: 'https://ololrmc.com',
    services: ['Emergency', 'Cardiology', 'Oncology', 'Neurology', 'Surgery'],
  },
  {
    id: 'baton-rouge-general',
    name: 'Baton Rouge General Medical Center',
    address: '8585 Picardy Ave, Baton Rouge, LA 70809',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'general',
    phone: '(225) 387-7000',
    website: 'https://brgeneral.org',
    services: ['Emergency', 'Cardiology', 'Orthopedics', 'Women\'s Health'],
  },
  {
    id: 'baton-rouge-general-bluebonnet',
    name: 'Baton Rouge General Medical Center - Bluebonnet',
    address: '18790 Perkins Rd, Baton Rouge, LA 70810',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'general',
    phone: '(225) 763-4000',
    website: 'https://brgeneral.org',
    services: ['Emergency', 'Surgery', 'Imaging', 'Laboratory'],
  },
  {
    id: 'womans-hospital',
    name: 'Woman\'s Hospital',
    address: '100 Woman\'s Way, Baton Rouge, LA 70817',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'specialty',
    phone: '(225) 927-1300',
    website: 'https://womans.org',
    services: ['Maternity', 'Women\'s Health', 'NICU', 'Gynecology'],
  },
  {
    id: 'lane-regional',
    name: 'Lane Regional Medical Center',
    address: '6300 Main St, Zachary, LA 70791',
    coordinates: {
      lat: 30.6479,
      lng: -91.1565,
    },
    type: 'general',
    phone: '(225) 658-4000',
    website: 'https://laneregional.org',
    services: ['Emergency', 'Surgery', 'Cardiology', 'Rehabilitation'],
  },
  {
    id: 'st-elizabeth-hospital',
    name: 'St. Elizabeth Hospital',
    address: '1125 W Highway 30, Gonzales, LA 70737',
    coordinates: {
      lat: 30.2266,
      lng: -90.9204,
    },
    type: 'general',
    phone: '(225) 647-5000',
    website: 'https://steh.com',
    services: ['Emergency', 'Surgery', 'Cardiology', 'Orthopedics'],
  },
  {
    id: 'ochsner-baton-rouge',
    name: 'Ochsner Medical Center - Baton Rouge',
    address: '17000 Medical Center Dr, Baton Rouge, LA 70816',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'general',
    phone: '(225) 752-2470',
    website: 'https://ochsner.org',
    services: ['Emergency', 'Cardiology', 'Oncology', 'Surgery', 'Neurology'],
  },
  {
    id: 'spine-hospital',
    name: 'The Spine Hospital of Louisiana',
    address: '10105 Park Rowe Ave, Baton Rouge, LA 70810',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'specialty',
    phone: '(225) 769-2200',
    website: 'https://thespinehospitaloflousiana.com',
    services: ['Spine Surgery', 'Orthopedics', 'Pain Management', 'Rehabilitation'],
  },
  {
    id: 'cardiovascular-institute',
    name: 'Cardiovascular Institute of the South',
    address: '7941 Picardy Ave, Baton Rouge, LA 70809',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'specialty',
    phone: '(225) 308-0247',
    website: 'https://cardio.com',
    services: ['Cardiology', 'Cardiac Surgery', 'Vascular Surgery', 'Interventional Cardiology'],
  },
  {
    id: 'mary-bird-perkins',
    name: 'Mary Bird Perkins Cancer Center',
    address: '4950 Essen Ln, Baton Rouge, LA 70809',
    coordinates: {
      lat: 30.3668,
      lng: -91.0615,
    },
    type: 'specialty',
    phone: '(225) 767-0847',
    website: 'https://marybird.org',
    services: ['Oncology', 'Radiation Therapy', 'Chemotherapy', 'Cancer Surgery'],
  },
];

/**
 * Get hospital by ID
 */
export function getHospitalById(id: string): Hospital | undefined {
  return BATON_ROUGE_HOSPITALS.find(hospital => hospital.id === id);
}

/**
 * Get hospitals by type
 */
export function getHospitalsByType(type: Hospital['type']): Hospital[] {
  return BATON_ROUGE_HOSPITALS.filter(hospital => hospital.type === type);
}

/**
 * Get all hospital types
 */
export function getHospitalTypes(): Hospital['type'][] {
  return ['general', 'specialty', 'emergency', 'rehabilitation'];
}

/**
 * Search hospitals by name or services
 */
export function searchHospitals(query: string): Hospital[] {
  const lowercaseQuery = query.toLowerCase();
  
  return BATON_ROUGE_HOSPITALS.filter(hospital => 
    hospital.name.toLowerCase().includes(lowercaseQuery) ||
    hospital.services?.some(service => 
      service.toLowerCase().includes(lowercaseQuery)
    )
  );
}