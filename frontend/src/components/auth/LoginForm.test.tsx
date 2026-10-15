import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LoginForm } from './LoginForm';
import { clearAppCache } from '@/lib/cache';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    token: null,
    isLoading: false,
    updateUser: vi.fn()
  })
}));

const renderClean = (elem: React.ReactElement) => renderToString(elem).replace(/<!-- -->/g, '');

describe('LoginForm Simplification & Authentication Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ONLY Google sign-in and Mobile Number OTP login methods', () => {
    const html = renderClean(<LoginForm defaultRole="customer" onSuccess={() => {}} />);

    // 1. Google Login must be present
    expect(html).toContain('Continue with Google');

    // 2. Mobile Number Input must be present
    expect(html).toContain('Mobile Number');
    expect(html).toContain('+91');
    expect(html).toContain('Enter 10-digit mobile number');
    expect(html).toContain('Get Verification Code');

    // 3. Email OTP login method must be REMOVED
    expect(html).not.toContain('Email Address');
    expect(html).not.toContain('name@example.com');
  });

  it('removes unnecessary banners and bank-grade security wording', () => {
    const html = renderClean(<LoginForm defaultRole="customer" onSuccess={() => {}} />);

    // Unnecessary wording like "Bank-Grade Encryption" must be REMOVED
    expect(html).not.toContain('Bank-Grade Encryption');
    expect(html).not.toContain('ISO 27001 Certified');
    expect(html).not.toContain('DPDPA 2023');

    // Cluttered 60-min banner in modal must be REMOVED
    expect(html).not.toContain('60-Min Doorstep Dispatch');
  });

  it('provides clean role switcher between Customer and Technician Pro', () => {
    const html = renderClean(<LoginForm defaultRole="customer" onSuccess={() => {}} />);

    expect(html).toContain('Customer Login');
    expect(html).toContain('Technician Pro');
  });

  it('includes clear cache and troubleshoot link for customers and technicians', () => {
    const html = renderClean(<LoginForm defaultRole="customer" onSuccess={() => {}} />);

    expect(html).toContain('Having trouble? Clear cache &amp; reload');
  });
});

describe('clearAppCache utility engine', () => {
  it('clears localStorage and sessionStorage while preserving user language', async () => {
    // Mock storage
    const localStore: Record<string, string> = {
      mud_token: 'jwt-12345',
      mud_active_user: '{"name":"Ramesh"}',
      mud_firestore_bookings: '[{"id":"1"}]',
      mud_language: 'kn'
    };

    const sessionStore: Record<string, string> = {
      temp_key: 'value'
    };

    const localClearSpy = vi.fn(() => {
      for (const k of Object.keys(localStore)) {
        delete localStore[k];
      }
    });

    const localSetSpy = vi.fn((key: string, val: string) => {
      localStore[key] = val;
    });

    const localGetSpy = vi.fn((key: string) => localStore[key] || null);

    const sessionClearSpy = vi.fn(() => {
      for (const k of Object.keys(sessionStore)) {
        delete sessionStore[k];
      }
    });

    // Assign mocked storage to global
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: localGetSpy,
        setItem: localSetSpy,
        clear: localClearSpy,
        removeItem: vi.fn((k: string) => delete localStore[k])
      },
      writable: true
    });

    Object.defineProperty(global, 'sessionStorage', {
      value: {
        clear: sessionClearSpy
      },
      writable: true
    });

    await clearAppCache({ reload: false, preserveLanguage: true });

    expect(localClearSpy).toHaveBeenCalled();
    expect(sessionClearSpy).toHaveBeenCalled();
    // Language preference preserved
    expect(localSetSpy).toHaveBeenCalledWith('mud_language', 'kn');
  });
});
