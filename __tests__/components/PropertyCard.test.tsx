import React from 'react';
import { render, screen } from '@testing-library/react';
import PropertyCard from '../../components/PropertyCard';

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

describe('PropertyCard Component', () => {
  const mockProperty = {
    id: '123',
    title: 'Cozy Medical Stay',
    description: 'A comfortable property near the hospital',
    address: {
      street: '123 Medical Ave',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70808',
      coordinates: { lat: 30.4515, lng: -91.1871 }
    },
    base_price: 150,
    bedrooms: 2,
    bathrooms: 2,
    max_guests: 4,
    images: ['property1.jpg'],
    hospital_distances: {
      'Baton Rouge General': {
        distance_miles: 1.2,
        drive_time_minutes: 5
      }
    }
  };

  test('renders property title', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Cozy Medical Stay')).toBeInTheDocument();
  });

  test('renders property price', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(/\$150/)).toBeInTheDocument();
  });

  test('renders property details', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(/2 bed/i)).toBeInTheDocument();
    expect(screen.getByText(/2 bath/i)).toBeInTheDocument();
    expect(screen.getByText(/4 guests/i)).toBeInTheDocument();
  });

  test('renders hospital proximity information', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(/1.2 miles/i)).toBeInTheDocument();
    expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  });
});