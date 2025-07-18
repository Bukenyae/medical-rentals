import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const propertyListingRequests = new Counter('property_listing_requests');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

export default function() {
  // Test property listing endpoint
  const propertiesResponse = http.get('http://localhost:3000/api/properties?page=1&limit=10');
  check(propertiesResponse, {
    'status is 200': (r) => r.status === 200,
    'response has properties': (r) => JSON.parse(r.body).properties.length > 0,
  });
  propertyListingRequests.add(1);
  
  // Test property detail endpoint
  const propertyId = 'property-1'; // This would be dynamic in a real test
  const propertyDetailResponse = http.get(`http://localhost:3000/api/properties/${propertyId}`);
  check(propertyDetailResponse, {
    'status is 200': (r) => r.status === 200,
    'response has property details': (r) => JSON.parse(r.body).id === propertyId,
  });
  
  // Test property availability endpoint
  const availabilityResponse = http.get(`http://localhost:3000/api/properties/${propertyId}/availability?start_date=2025-08-01&end_date=2025-08-10`);
  check(availabilityResponse, {
    'status is 200': (r) => r.status === 200,
    'response has availability data': (r) => JSON.parse(r.body).available_dates.length > 0,
  });
  
  sleep(1);
}