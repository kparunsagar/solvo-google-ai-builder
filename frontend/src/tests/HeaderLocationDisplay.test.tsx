import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Header } from '@/components/layout/Header';
import { LocationState } from '@/services/microservices/location.service';

// Mock contexts and router
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, d: string) => d,
  }),
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 0,
  }),
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Lang</div>,
}));

vi.mock('@/components/NotificationDropdown', () => ({
  NotificationDropdown: () => null,
}));

vi.mock('@/components/AIVoiceBookingModal', () => ({
  AIVoiceBookingModal: () => null,
}));

describe('Header Quick-Commerce Dual-Line Location Display', () => {
  it('renders dual-line format with lightning dispatch badge and exact 2-part address', () => {
    const mockBengaluruLocation: LocationState = {
      locality: 'Marathahalli, Bengaluru',
      street: '65, 2nd Cross Road',
      suburb: 'Marathahalli',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560037',
      formattedAddress: '65, 2nd Cross Road, Marathahalli, Bangalore, Karnataka',
      lat: 12.9591,
      lng: 77.6974,
      isServiceable: true,
      source: 'gps',
    };

    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Marathahalli, Bengaluru"
        currentLocation={mockBengaluruLocation}
        dispatchTime="45 minutes"
      />
    );

    // Line 1: Delivery time badge & lightning bolt
    expect(html).toContain('data-testid="delivery-time"');
    expect(html).toContain('45 minutes');

    // Line 2: Exact 2-part address button
    expect(html).toContain('data-testid="delivery-location-btn"');
    expect(html).toContain('Marathahalli');
    expect(html).toContain('65, 2nd Cross Road, Marathahalli, Bangalore, Karnataka');
  });

  it('renders detecting state when location is being resolved', () => {
    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Detecting live location..."
        currentLocation={null}
      />
    );

    expect(html).toContain('Detecting...');
    expect(html).toContain('Locating doorstep GPS...');
  });

  it('correctly parses string location labels when location object is not yet loaded', () => {
    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Gandhi Nagar, Sagara"
        currentLocation={null}
      />
    );

    expect(html).toContain('Gandhi Nagar');
    expect(html).toContain('Sagara');
    expect(html).toContain('45 minutes');
  });
});
