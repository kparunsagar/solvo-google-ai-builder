import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HomePage } from '@/pages/HomePage';
import { ServicesPage } from '@/pages/ServicesPage';

let mockUser: any = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    token: mockUser ? 'mock-jwt-token' : null,
    isLoading: false,
    updateUser: vi.fn()
  })
}));

const renderWithRouter = (element: React.ReactElement, path = '/') => {
  return renderToString(
    <StaticRouter location={path}>
      {element}
    </StaticRouter>
  ).replace(/<!-- -->/g, '');
};

describe('Product Owner Catalog Gating: Category Browsing vs Protected Services & Pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  describe('Unauthenticated Visitors (user is null)', () => {
    it('HomePage: allows browsing service categories while completely hiding service prices', () => {
      mockUser = null;
      const html = renderWithRouter(<HomePage />);

      // 1. Service categories must be visible for browsing
      expect(html).toContain('Browse Services');
      expect(html).toContain('Plumbing');
      expect(html).toContain('Electrician');
      expect(html).toContain('Cleaning');

      // 2. Specific service pricing (₹299 onwards, ₹499 onwards) must NOT be visible
      expect(html).not.toContain('₹299');
      expect(html).not.toContain('₹499');
      expect(html).not.toContain('Popular Right Now');

      // 3. Member unlock gate with 1-click login CTA must be displayed
      expect(html).toContain('Login to View Available Services &amp; Transparent Pricing');
      expect(html).toContain('Continue with Google / Mobile');
    });

    it('ServicesPage: allows browsing category chips and directories while protecting rates behind login', () => {
      mockUser = null;
      const html = renderWithRouter(<ServicesPage />, '/services');

      // 1. Category browsing is accessible
      expect(html).toContain('Browse Services');
      expect(html).toContain('All Categories');
      expect(html).toContain('Plumbing');
      expect(html).toContain('Electrician');

      // 2. Frictionless category browsing without demanding login pills
      expect(html).toContain('Available Service Categories');
      expect(html).not.toContain('Login for rates');
      expect(html).toContain('Explore Category');

      // 3. Service pricing must NOT be leaked
      expect(html).not.toContain('Fixed rate');
      expect(html).not.toContain('₹299');
      expect(html).not.toContain('₹499');
    });

    it('ServicesPage: displays category overview details without exposing pricing when a category is selected', () => {
      mockUser = null;
      const html = renderWithRouter(<ServicesPage />, '/services?category=cat-plumb');

      // Category details are browseable
      expect(html).toContain('Browse Plumbing');
      expect(html).toContain('Services Covered in this Category');
      expect(html).toContain('Individual Services &amp; Pricing Hidden');
      expect(html).toContain('Sign In to View Rates');

      // Still no pricing numbers
      expect(html).not.toContain('₹299');
      expect(html).not.toContain('₹499');
    });
  });

  describe('Authenticated Customers (user is logged in)', () => {
    beforeEach(() => {
      mockUser = {
        id: 'cust_987',
        name: 'Arun Sagar',
        email: 'arun@example.com',
        phone: '9876543210',
        role: 'customer'
      };
    });

    it('HomePage: renders Popular Right Now services with pricing for authenticated customers', () => {
      const html = renderWithRouter(<HomePage />);

      // Popular services with pricing are unlocked
      expect(html).toContain('Popular Right Now');
      expect(html).toContain('₹299');
      expect(html).toContain('Tap / Faucet Repair');

      // Member gate is hidden
      expect(html).not.toContain('Login to View Available Services &amp; Transparent Pricing');
    });

    it('ServicesPage: reveals live services view and hides customer login gate', () => {
      const html = renderWithRouter(<ServicesPage />, '/services');

      // Customer gate is hidden
      expect(html).not.toContain('Customer Login Required');
      expect(html).not.toContain('Login to View Available Services &amp; Transparent Pricing');
    });
  });
});
