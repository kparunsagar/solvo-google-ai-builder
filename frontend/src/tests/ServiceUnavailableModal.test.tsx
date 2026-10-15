import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServiceUnavailableModal } from '@/components/ServiceUnavailableModal';
import { LocationState } from '@/services/microservices/location.service';

describe('ServiceUnavailableModal Compact & iOS Accessibility', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    vi.clearAllMocks();
  });

  const mockUnservicedLocation: LocationState = {
    locality: 'Marine Drive, Mumbai',
    city: 'Mumbai',
    suburb: 'Marine Drive',
    state: 'Maharashtra',
    postalCode: '400020',
    formattedAddress: 'Marine Drive, Mumbai, Maharashtra 400020',
    lat: 18.944,
    lng: 72.823,
    isServiceable: false,
    source: 'gps',
  };

  it('renders in compact format without taking over complete screen', () => {
    const html = renderToString(
      <ServiceUnavailableModal
        isOpen={true}
        location={mockUnservicedLocation}
        onClose={() => {}}
        onExploreDemo={() => {}}
        onOpenLocationDrawer={() => {}}
      />
    );

    // Verify Expansion Zone badge & title
    expect(html).toContain('Expansion Zone');
    expect(html).toContain('expanding to');
    expect(html).toContain('Mumbai');
    expect(html).toContain('Mumbai, Maharashtra');

    // Verify operational hubs reference
    expect(html).toContain('Bengaluru');
    expect(html).toContain('Sagara');

    // Verify close & dismiss buttons exist
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('Dismiss &amp; continue to app');
    expect(html).toContain('Select Active Hub');
    expect(html).toContain('Explore Catalog');
  });

  it('does not render when isOpen is false', () => {
    const html = renderToString(
      <ServiceUnavailableModal
        isOpen={false}
        location={mockUnservicedLocation}
        onClose={() => {}}
        onExploreDemo={() => {}}
        onOpenLocationDrawer={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('does not render when location is null', () => {
    const html = renderToString(
      <ServiceUnavailableModal
        isOpen={true}
        location={null}
        onClose={() => {}}
        onExploreDemo={() => {}}
        onOpenLocationDrawer={() => {}}
      />
    );

    expect(html).toBe('');
  });
});
