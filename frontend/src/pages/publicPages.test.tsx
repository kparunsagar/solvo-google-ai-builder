import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AboutPage } from './AboutPage';
import { PartnerPage } from './PartnerPage';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';
import { ContactPage } from './ContactPage';
import { RefundPolicyPage } from './RefundPolicyPage';

const renderPage = (component: React.ReactElement, location = '/') => {
  return renderToString(
    <StaticRouter location={location}>
      {component}
    </StaticRouter>
  );
};

describe('Public Information & Legal Pages SSR Verification', () => {
  it('renders AboutPage with brand mission and contact email', () => {
    const html = renderPage(<AboutPage />);
    expect(html).toContain('Hyperlocal Home Services');
    expect(html).toContain('Born in Sagara, Built to Elevate Every Local Indian Home');
    expect(html).toContain('urbanaiidea@gmail.com');
  });

  it('renders PartnerPage with benefits, process and partner application', () => {
    const html = renderPage(<PartnerPage />);
    expect(html).toContain('Partner with SOLVO');
    expect(html).toContain('Partner Express Application');
    expect(html).toContain('urbanaiidea@gmail.com');
    expect(html).toContain('₹35k - ₹65k/Mo');
  });

  it('renders PrivacyPage with DPDPA 2023 compliance and Grievance Officer details', () => {
    const html = renderPage(<PrivacyPage />);
    expect(html).toContain('Privacy Policy &amp; Data Protection Charter');
    expect(html).toContain('Statutory Grievance Redressal &amp; Data Protection Officer');
    expect(html).toContain('urbanaiidea@gmail.com');
  });

  it('renders TermsPage with User Agreement and 30-Day Warranty terms', () => {
    const html = renderPage(<TermsPage />);
    expect(html).toContain('Terms of Service &amp; User Agreement');
    expect(html).toContain('30-Day Free Rework Warranty Policy');
    expect(html).toContain('urbanaiidea@gmail.com');
  });

  it('renders ContactPage with support channels and contact email', () => {
    const html = renderPage(<ContactPage />);
    expect(html).toContain('Customer &amp; Partner Support Hub');
    expect(html).toContain('urbanaiidea@gmail.com');
    expect(html).toContain('+91 8183 224400');
  });

  it('renders RefundPolicyPage with cancellation rules and refund SLA', () => {
    const html = renderPage(<RefundPolicyPage />);
    expect(html).toContain('Cancellation &amp; Refund Policy');
    expect(html).toContain('100% Free');
    expect(html).toContain('urbanaiidea@gmail.com');
  });
});
