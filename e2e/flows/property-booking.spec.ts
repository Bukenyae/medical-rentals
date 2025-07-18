import { test, expect } from '@playwright/test';

// Test the complete property booking flow
test('complete property booking flow', async ({ page }) => {
  // Mock authentication
  await page.route('**/api/auth/user', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          role: 'guest'
        }
      })
    });
  });

  // Mock property data
  await page.route('**/api/properties', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        properties: [
          {
            id: 'property-1',
            title: 'Medical Stay Near Hospital',
            description: 'Comfortable stay for medical visits',
            base_price: 150,
            images: ['https://example.com/image1.jpg'],
            address: {
              city: 'Baton Rouge',
              state: 'LA'
            },
            bedrooms: 2,
            bathrooms: 2,
            max_guests: 4,
            hospital_distances: {
              'Baton Rouge General': {
                distance_miles: 1.2,
                drive_time_minutes: 5
              }
            }
          }
        ],
        totalCount: 1
      })
    });
  });

  // Mock property details
  await page.route('**/api/properties/property-1', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 'property-1',
        title: 'Medical Stay Near Hospital',
        description: 'Comfortable stay for medical visits',
        base_price: 150,
        images: ['https://example.com/image1.jpg'],
        address: {
          street: '123 Medical Ave',
          city: 'Baton Rouge',
          state: 'LA',
          zip: '70808',
          coordinates: { lat: 30.45, lng: -91.18 }
        },
        bedrooms: 2,
        bathrooms: 2,
        max_guests: 4,
        hospital_distances: {
          'Baton Rouge General': {
            distance_miles: 1.2,
            drive_time_minutes: 5
          }
        }
      })
    });
  });

  // Mock availability
  await page.route('**/api/properties/property-1/availability', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        available: true,
        available_dates: [
          { date: '2025-08-01', price: 150 },
          { date: '2025-08-02', price: 150 },
          { date: '2025-08-03', price: 150 },
          { date: '2025-08-04', price: 150 },
          { date: '2025-08-05', price: 150 }
        ]
      })
    });
  });

  // Mock booking creation
  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 'booking-123',
          property_id: 'property-1',
          check_in: '2025-08-01',
          check_out: '2025-08-05',
          guest_count: 2,
          total_amount: 600,
          status: 'confirmed'
        })
      });
    }
  });

  // Start the test
  await page.goto('/properties');
  
  // Verify properties are displayed
  await expect(page.getByText('Medical Stay Near Hospital')).toBeVisible();
  
  // Click on a property
  await page.getByText('Medical Stay Near Hospital').click();
  
  // Verify property details page
  await expect(page.getByText('Comfortable stay for medical visits')).toBeVisible();
  
  // Navigate to booking page
  await page.getByRole('button', { name: /book now/i }).click();
  
  // Fill booking form
  await page.getByLabel('Check-in').fill('2025-08-01');
  await page.getByLabel('Check-out').fill('2025-08-05');
  await page.getByLabel('Number of guests').fill('2');
  await page.getByLabel('Full Name').fill('John Doe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByLabel('Phone').fill('555-123-4567');
  await page.getByLabel('Purpose of Visit').fill('Medical treatment');
  
  // Submit booking
  await page.getByRole('button', { name: /confirm booking/i }).click();
  
  // Verify booking confirmation
  await expect(page.getByText(/booking confirmed/i)).toBeVisible();
  await expect(page.getByText(/booking-123/i)).toBeVisible();
});