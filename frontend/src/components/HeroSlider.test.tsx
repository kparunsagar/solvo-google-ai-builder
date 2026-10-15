import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HeroSlider } from './HeroSlider';

describe('HeroSlider / HeroCommand Component SSR & Visual Structure', () => {
  it('renders all core text elements, search controls, and trust proof indicators without auto-rotating carousel clutter', () => {
    const html = renderToString(
      <HeroSlider
        locationLabel="Trusted Hyperlocal Home Services Platform"
        servingBadgeText="Trusted Hyperlocal Home Services Platform"
        searchQuery=""
        onSearchChange={() => {}}
        onSearchSubmit={() => {}}
        onPopularTagClick={() => {}}
      />
    );

    // Verify location badge
    expect(html).toContain('Trusted Hyperlocal Home Services Platform');
    
    // Verify default title
    expect(html).toContain('Trusted Home Services,');
    expect(html).toContain('On Demand');
    
    // Verify search elements
    expect(html).toContain('Search plumber, electrician, cleaning…');
    expect(html).toContain('Search');

    // Verify popular tags
    expect(html).toContain('AC Service');
    expect(html).toContain('Tap Repair');
    expect(html).toContain('House Cleaning');
    expect(html).toContain('Fan Install');

    // Verify top-tier trust proof metrics
    expect(html).toContain('4.9/5');
    expect(html).toContain('60-Min');
    expect(html).toContain('30-Day');
    expect(html).toContain('Background-Verified Pros');
  });

  it('renders with custom search placeholder and custom titles', () => {
    const html = renderToString(
      <HeroSlider
        locationLabel="Sagara"
        servingBadgeText="Serving Sagara & Bengaluru"
        searchQuery="solar"
        onSearchChange={() => {}}
        onSearchSubmit={() => {}}
        onPopularTagClick={() => {}}
        searchPlaceholder="Custom search for technicians..."
        searchButtonText="Find Expert"
        heroTitle="Home Maintenance Made Effortless,"
        heroTitleAccent="Instant Booking"
      />
    );

    expect(html).toContain('Serving Sagara &amp; Bengaluru');
    expect(html).toContain('Home Maintenance Made Effortless,');
    expect(html).toContain('Instant Booking');
    expect(html).toContain('Custom search for technicians...');
    expect(html).toContain('Find Expert');
  });
});
