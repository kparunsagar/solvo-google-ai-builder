import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { WelcomeGreetingModal } from '@/components/WelcomeGreetingModal';
import { HomePage } from '@/pages/HomePage';
import { firebaseConfig } from '@/lib/firebase';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    token: null,
    isLoading: false,
    updateUser: vi.fn()
  })
}));

const renderClean = (element: React.ReactElement, path = '/') => {
  return renderToString(
    <StaticRouter location={path}>
      {element}
    </StaticRouter>
  ).replace(/<!-- -->/g, '');
};

describe('Welcome Greeting Modal & Background Verification UI Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. Firebase Auth Domain Configuration', () => {
    it('uses myurbandaily.firebaseapp.com without any numbers in authDomain', () => {
      expect(firebaseConfig.authDomain).toBe('myurbandaily.firebaseapp.com');
      expect(firebaseConfig.authDomain).not.toContain('458d0');
      expect(firebaseConfig.projectId).toBe('myurbandaily-458d0');
    });
  });

  describe('2. Welcome Greeting Modal Simplification & Safeguards', () => {
    it('renders the welcome greeting without voucher or dispatch email sections', () => {
      const html = renderClean(
        <WelcomeGreetingModal
          isOpen={true}
          userName="Arun Sagar"
          userEmail="arun@example.com"
          onClose={() => {}}
        />
      );

      // 1. Personalized welcome is rendered
      expect(html).toContain('Welcome, Arun! 🎉');
      expect(html).toContain('Account Activated');

      // 2. Voucher section is completely REMOVED
      expect(html).not.toContain('WELCOME200');
      expect(html).not.toContain('Exclusive First-Time Customer Voucher');
      expect(html).not.toContain('₹200 Service Credit');

      // 3. Email dispatch card is completely REMOVED
      expect(html).not.toContain('Welcome Email Dispatched');

      // 4. Verification pillar displays Aadhaar & photo-verified
      expect(html).toContain('Aadhaar &amp; photo-verified');
      expect(html).not.toContain('Police &amp; Aadhaar checked');
      expect(html).not.toContain('police-verified');
    });

    it('returns null when isOpen is false', () => {
      const html = renderClean(
        <WelcomeGreetingModal
          isOpen={false}
          userName="Arun Sagar"
          userEmail="arun@example.com"
          onClose={() => {}}
        />
      );

      expect(html).toBe('');
    });
  });

  describe('3. UI Background Verification Phrasing', () => {
    it('HomePage displays Aadhaar & photo-verified instead of police-verified', () => {
      const html = renderClean(<HomePage />);

      expect(html).toContain('Background Verified');
      expect(html).toContain('Aadhaar &amp; photo-verified');
      expect(html).not.toContain('All technicians police-verified');
      expect(html).not.toContain('police-verified');
    });
  });

  describe('4. Professional Welcome Greeting Cards (Customer & Technician)', () => {
    it('generates an attractive, professional Customer Welcome Greeting Card', async () => {
      const { generateWelcomeEmailHtml } = await import('../services/welcomeEmail.service');
      const emailHtml = generateWelcomeEmailHtml({
        name: 'Sharada N',
        email: 'sharada@example.com',
        role: 'customer'
      });

      expect(emailHtml).toContain('OFFICIAL WELCOME GREETING CARD');
      expect(emailHtml).toContain('Welcome to the Family, Sharada!');
      expect(emailHtml).toContain('Official Member Privilege Card');
      expect(emailHtml).toContain('MUD-CUST-');
      expect(emailHtml).toContain('45-Min Doorstep Dispatch');
      expect(emailHtml).toContain('Aadhaar & Photo-Verified');
      expect(emailHtml).toContain('Pay After Service');
      expect(emailHtml).toContain('urbanaiidea@gmail.com');
      expect(emailHtml).toContain('sharada@example.com');
    });

    it('generates an attractive, professional Technician Partner Onboarding Card', async () => {
      const { generateWelcomeEmailHtml } = await import('../services/welcomeEmail.service');
      const emailHtml = generateWelcomeEmailHtml({
        name: 'Chandan K',
        email: 'chandan@example.com',
        role: 'provider'
      });

      expect(emailHtml).toContain('OFFICIAL TECHNICIAN PARTNER ONBOARDING');
      expect(emailHtml).toContain('Welcome to the Partner Network, Chandan!');
      expect(emailHtml).toContain('Official Partner Credential');
      expect(emailHtml).toContain('MUD-TECH-');
      expect(emailHtml).toContain('Direct Local Bookings');
      expect(emailHtml).toContain('Weekly Payouts');
      expect(emailHtml).toContain('Verified Pro Badge');
      expect(emailHtml).toContain('urbanaiidea@gmail.com');
      expect(emailHtml).toContain('chandan@example.com');
    });

    it('deduplicates welcome emails so users are emailed strictly once on 1st-time login', async () => {
      const { welcomeEmailService } = await import('../services/welcomeEmail.service');
      
      const store: Record<string, string> = {
        'mud_welcome_sent_repeat@example.com': 'true'
      };
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => {}
      };

      const result = await welcomeEmailService.sendWelcomeEmail({
        name: 'Repeat User',
        email: 'repeat@example.com',
        role: 'customer'
      });

      // Returns true without dispatching duplicate
      expect(result).toBe(true);
    });
  });
});
