import { calculateHospitalProximity } from '../../lib/utils/google-maps';
import { Loader } from '@googlemaps/js-api-loader';

// Mock the Google Maps API
jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({
      maps: {
        DistanceMatrixService: jest.fn(() => ({
          getDistanceMatrix: jest.fn((params, callback) => {
            callback({
              rows: [{
                elements: [{
                  distance: { text: '5 km', value: 5000 },
                  duration: { text: '10 mins', value: 600 },
                  status: 'OK',
                }],
              }],
            }, 'OK');
          }),
        })),
      },
    }),
  })),
}));

describe('Google Maps Utilities', () => {
  test('calculateHospitalProximity returns distance and duration', async () => {
    const propertyCoordinates = { lat: 30.45, lng: -91.18 };
    const hospitalCoordinates = { lat: 30.46, lng: -91.19 };
    
    const result = await calculateHospitalProximity(propertyCoordinates, hospitalCoordinates);
    
    expect(result).toEqual({
      distance_miles: expect.any(Number),
      drive_time_minutes: expect.any(Number),
    });
    
    expect(result.distance_miles).toBeGreaterThan(0);
    expect(result.drive_time_minutes).toBeGreaterThan(0);
  });
  
  test('calculateHospitalProximity handles API errors', async () => {
    // Override the mock for this specific test
    const mockLoader = Loader as jest.Mock;
    mockLoader.mockImplementationOnce(() => ({
      load: jest.fn().mockResolvedValue({
        maps: {
          DistanceMatrixService: jest.fn(() => ({
            getDistanceMatrix: jest.fn((params, callback) => {
              callback({
                rows: [{
                  elements: [{
                    status: 'ZERO_RESULTS',
                  }],
                }],
              }, 'OK');
            }),
          })),
        },
      }),
    }));
    
    const propertyCoordinates = { lat: 30.45, lng: -91.18 };
    const hospitalCoordinates = { lat: 30.46, lng: -91.19 };
    
    const result = await calculateHospitalProximity(propertyCoordinates, hospitalCoordinates);
    
    expect(result).toEqual({
      distance_miles: null,
      drive_time_minutes: null,
    });
  });
});