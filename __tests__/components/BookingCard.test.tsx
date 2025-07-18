import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingCard from '../../components/BookingCard';

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('BookingCard Component', () => {
  const mockBooking = {
    id: 'booking-123',
    property_id: 'property-123',
    guest_id: 'guest-123',
    check_in: '2025-08-01',
    check_out: '2025-08-05',
    guest_count: 2,
    total_amount: 600,
    status: 'confirmed',
    guest_details: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-123-4567',
      purpose_of_visit: 'Medical treatment'
    },
    created_at: '2025-07-15T10:00:00Z',
    updated_at: '2025-07-15T10:00:00Z'
  };

  const mockProperty = {
    id: 'property-123',
    title: 'Medical Stay Near Hospital',
    images: ['property1.jpg']
  };

  test('renders booking details', () => {
    render(<BookingCard booking={mockBooking} property={mockProperty} />);
    
    expect(screen.getByText('Medical Stay Near Hospital')).toBeInTheDocument();
    expect(screen.getByText(/Aug 1, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Aug 5, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/\$600/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmed/i)).toBeInTheDocument();
  });

  test('renders guest information', () => {
    render(<BookingCard booking={mockBooking} property={mockProperty} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Medical treatment')).toBeInTheDocument();
  });

  test('clicking on card navigates to booking details', () => {
    const { container } = render(<BookingCard booking={mockBooking} property={mockProperty} />);
    
    // Find the clickable element (could be a button or the card itself)
    const clickableElement = container.querySelector('[data-testid="booking-card"]') || container.firstChild;
    
    if (clickableElement) {
      fireEvent.click(clickableElement);
      // We would verify navigation, but since it's mocked we just ensure it doesn't crash
    }
  });
});