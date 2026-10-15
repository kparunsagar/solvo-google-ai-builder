import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { SmartBookingTracker } from '@/components/SmartBookingTracker';
import { BookingRecord } from '@/lib/api';

const mockBooking: BookingRecord = {
  id: 'bk-test-12345678',
  customer_id: 'cust-456',
  customer_name: 'Aditi Sharma',
  customer_phone: '9876543210',
  service_id: 'srv_electrical_repair',
  category_id: 'cat_electrical',
  status: 'EN_ROUTE',
  price: 499,
  total_price: 499,
  payment_status: 'PAID',
  payment_method: 'UPI_QR',
  address_text: 'Laxmi Venkateshwara Nelaya, Sagara',
  address_locality: 'Sagara Town',
  address_lat: 14.1670,
  address_lng: 75.0298,
  tech_lat: 14.1720,
  tech_lng: 75.0350,
  technician_id: 'tech-999',
  technician_name: 'Praveen Kumar',
  technician_phone: '9876500000',
  doorstep_otp: '7829',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const renderComponent = (element: React.ReactElement, path = '/bookings') => {
  return renderToString(
    <StaticRouter location={path}>
      {element}
    </StaticRouter>
  ).replace(/<!-- -->/g, '');
};

describe('SmartBookingTracker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rolling ad hero banner with headline and CTA button', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    // Rolling ad headline (Application-only MyUrbanDaily feature)
    expect(html).toContain('Zero repair bills for 1 full year');
    expect(html).toContain('EXPLORE SAFECARE');
    expect(html).toContain('SAFECARE AMC');
  });

  it('renders Mini Map PiP with VIEW MAP button and road layout SVG', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('VIEW MAP');
    expect(html).toContain('Live Tracking Active');
    // Mini map road canvas
    expect(html).toContain('viewBox="0 0 160 105"');
  });

  it('displays bold ETA and "⚡ On time" badge', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('Arriving in');
    expect(html).toContain('7 mins');
    expect(html).toContain('On time');
    expect(html).toContain('Technician is en route to your address');
  });

  it('renders green "Payment done" status pill for paid bookings', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('Payment done');
    expect(html).toContain('You have successfully paid for this order');
  });

  it('renders "Payment Due" with Pay Online button when payment is pending', () => {
    const unpaidBooking: BookingRecord = {
      ...mockBooking,
      payment_status: 'PENDING',
      payment_method: 'COD'
    };

    const html = renderComponent(<SmartBookingTracker booking={unpaidBooking} />);

    expect(html).toContain('Payment Due:');
    expect(html).toContain('Pay Online');
    expect(html).toContain('Cash on Doorstep Completion');
  });

  it('renders Doorstep Verification OTP PIN securely', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('Doorstep Security PIN');
    expect(html).toContain('7829');
    expect(html).toContain('Share with technician only when they are physically at your door');
  });

  it('renders "Tap to Play" mystery reward widget', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('Tap to Play');
    expect(html).toContain('Surprise Gift');
    expect(html).toContain('Tap to Play Mystery Box');
    expect(html).toContain('Win up to ₹300 OFF your next home repair');
  });

  it('renders desktop live GPS map layout and HUD gauges', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    // Desktop Telemetry HUD
    expect(html).toContain('Live GPS Telemetry');
    expect(html).toContain('GPS Live');
    expect(html).toContain('Simulate Ride');
    expect(html).toContain('Open in Google Maps');
  });

  it('renders assigned technician information and KYC verified badge', () => {
    const html = renderComponent(<SmartBookingTracker booking={mockBooking} />);

    expect(html).toContain('Praveen Kumar');
    expect(html).toContain('KYC');
    expect(html).toContain('Verified Service Partner');
    expect(html).toContain('Call');
  });
});
