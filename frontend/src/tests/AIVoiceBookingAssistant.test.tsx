import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Header } from '@/components/layout/Header';
import { AIVoiceBookingModal } from '@/components/AIVoiceBookingModal';
import { parseVoiceBookingIntent } from '@/lib/gemini';

let mockUser: any = null;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
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

describe('Indic Voice AI Booking Assistant & Role Gating', () => {
  beforeEach(() => {
    mockUser = null;
    vi.clearAllMocks();
  });

  it('hides Voice Booking button from unauthenticated (anonymous) visitors', () => {
    mockUser = null;

    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Gandhi Nagar, Sagara"
      />
    );

    expect(html).not.toContain('Voice Booking');
    expect(html).not.toContain('data-testid="voice-booking-btn"');
  });

  it('hides Voice Booking button from technicians (providers)', () => {
    mockUser = {
      id: 'tech-123',
      name: 'Ramesh Kumar',
      role: 'provider',
      phone: '9845011223',
    };

    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Gandhi Nagar, Sagara"
      />
    );

    expect(html).not.toContain('Voice Booking');
    expect(html).not.toContain('data-testid="voice-booking-btn"');
  });

  it('shows Voice Booking button strictly when a verified customer is logged in', () => {
    mockUser = {
      id: 'cust-456',
      name: 'Ananya Rao',
      role: 'customer',
      email: 'ananya@example.com',
      phone: '9845099887',
    };

    const html = renderToString(
      <Header
        onOpenAuth={() => {}}
        onOpenLocationDrawer={() => {}}
        locationLabel="Gandhi Nagar, Sagara"
      />
    );

    expect(html).toContain('Voice Booking');
    expect(html).toContain('data-testid="voice-booking-btn"');
  });

  it('renders AIVoiceBookingModal with Indic language controls for logged-in customer', () => {
    mockUser = {
      id: 'cust-456',
      name: 'Ananya Rao',
      role: 'customer',
    };

    const html = renderToString(
      <AIVoiceBookingModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Indic Voice Booking');
    expect(html).toContain('ಕನ್ನಡ (Kannada)');
    expect(html).toContain('हिन्दी (Hindi)');
    expect(html).toContain('English');
    expect(html).toContain('Tap Microphone to Speak');
  });

  it('displays Customer Account Required notice if unauthorized user invokes modal', () => {
    mockUser = null;

    const html = renderToString(
      <AIVoiceBookingModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Customer Account Required');
    expect(html).toContain('Indic Voice AI Booking is exclusively available to logged-in customers');
  });

  it('parses voice intents into exact valid catalog service IDs for booking navigation', async () => {
    const plumbingIntent = await parseVoiceBookingIntent('Bathroom tap is leaking continuously');
    expect(plumbingIntent.serviceId).toBe('srv_plumber_general');

    const motorIntent = await parseVoiceBookingIntent('ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ');
    expect(motorIntent.serviceId).toBe('cat-motor');

    const elecIntent = await parseVoiceBookingIntent('ಕರೆಂಟ್ ಸ್ವಿಚ್ ಸ್ಪಾರ್ಕ್ ಆಗ್ತಿದೆ');
    expect(elecIntent.serviceId).toBe('srv_electrician_general');

    const roIntent = await parseVoiceBookingIntent('Water purifier filter replacement and slow water flow');
    expect(roIntent.serviceId).toBe('srv_appliance_repair');
  });

  it('does NOT display microphone permission popup on normal initial open', () => {
    mockUser = {
      id: 'cust-456',
      name: 'Ananya Rao',
      role: 'customer',
    };

    const html = renderToString(
      <AIVoiceBookingModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).not.toContain('data-testid="mic-permission-popup"');
    expect(html).not.toContain('Microphone Access Needed');
    expect(html).toContain('data-testid="mic-speak-btn"');
  });

  it('automatically displays popup notification when microphone permission was denied, without asking to change settings', () => {
    mockUser = {
      id: 'cust-456',
      name: 'Ananya Rao',
      role: 'customer',
    };

    const html = renderToString(
      <AIVoiceBookingModal
        isOpen={true}
        onClose={() => {}}
        initialPermissionDenied={true}
      />
    );

    // Popup notification is presented automatically
    expect(html).toContain('data-testid="mic-permission-popup"');
    expect(html).toContain('Microphone Access Needed');
    expect(html).toContain('Microphone permission was not granted');
    expect(html).toContain('data-testid="allow-mic-btn"');
    expect(html).toContain('Allow Microphone Prompt');
    expect(html).toContain('data-testid="popup-quick-repair-0"');
    expect(html).toContain('Dismiss');

    // Strictly ensure no text instructing users to manually change/update settings in browser
    expect(html).not.toContain('browser settings');
    expect(html).not.toContain('change or update settings');
  });
});
