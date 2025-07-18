import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../app/api/properties/route';

// Mock the Supabase client
jest.mock('../../lib/supabase-server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'property-1',
                title: 'Medical Stay 1',
                description: 'Near hospital',
                base_price: 150,
                max_guests: 4,
                bedrooms: 2,
                bathrooms: 2,
                images: ['image1.jpg'],
                hospital_distances: {
                  'Hospital A': { distance_miles: 1.2, drive_time_minutes: 5 }
                }
              }
            ],
            count: 1,
            error: null
          })
        }))
      })),
      insert: jest.fn().mockResolvedValue({
        data: { id: 'new-property-id' },
        error: null
      })
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'images/property.jpg' } }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/images/property.jpg' } }))
      }))
    }
  }))
}));

// Mock auth
jest.mock('../../lib/auth', () => ({
  getSession: jest.fn(() => ({
    user: { id: 'user-123', role: 'owner' }
  }))
}));

describe('Properties API Routes', () => {
  describe('GET /api/properties', () => {
    it('should return properties with pagination', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/properties?page=1&limit=10'
      });
      
      const response = await GET(req as unknown as NextRequest);
      const responseData = await response.json();
      
      expect(response.status).toBe(200);
      expect(responseData.properties).toHaveLength(1);
      expect(responseData.properties[0].title).toBe('Medical Stay 1');
      expect(responseData.totalCount).toBe(1);
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property', async () => {
      const propertyData = {
        title: 'New Medical Stay',
        description: 'Close to hospital',
        address: {
          street: '123 Medical St',
          city: 'Baton Rouge',
          state: 'LA',
          zip: '70808',
          coordinates: { lat: 30.45, lng: -91.18 }
        },
        base_price: 175,
        max_guests: 3,
        bedrooms: 2,
        bathrooms: 1
      };

      const { req } = createMocks({
        method: 'POST',
        body: propertyData
      });
      
      const response = await POST(req as unknown as NextRequest);
      const responseData = await response.json();
      
      expect(response.status).toBe(201);
      expect(responseData.id).toBe('new-property-id');
    });
  });
});