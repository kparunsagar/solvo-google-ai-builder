import React from 'react';
import {
  Users,
  Wrench,
  ShieldCheck,
  SplitSquareVertical,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface PortalSelectorProps {
  onSelectRole: (role: 'customer' | 'provider' | 'admin' | 'split') => void;
  language: 'en' | 'kn';
}

export const PortalSelector: React.FC<PortalSelectorProps> = ({ onSelectRole, language }) => {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 16px' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%)',
        borderRadius: 24,
        padding: '40px 32px',
        color: '#ffffff',
        marginBottom: 36,
        boxShadow: '0 20px 40px -15px rgba(37,99,235,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 720, position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: 16
          }}>
            <MapPin size={13} color="#60a5fa" />
            <span>Sagara, Shivamogga, Karnataka (577401) • Multi-City Scalable</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 12 }}>
            UrbanAI Local Services Marketplace
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 24 }}>
            Select your portal below to enter the live platform: book services as a <strong>Customer</strong>, dispatch and track jobs as a <strong>Technician (Bike Pro)</strong>, or manage verification and finances as an <strong>Admin</strong>.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => onSelectRole('split')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.92rem',
                boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
                transition: 'transform 0.15s ease'
              }}
            >
              <SplitSquareVertical size={18} />
              <span>Launch Side-by-Side Live Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 DISTINCT DEDICATED PORTAL TILES */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 20, textAlign: 'center' }}>
        Select Dedicated Marketplace Portal
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 36
      }}>
        {/* PORTAL 1: CUSTOMER APP */}
        <div
          onClick={() => onSelectRole('customer')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '2px solid #e2e8f0',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Users size={28} />
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portal 1
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px' }}>
              Customer Client App
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
              Browse verified plumbers, electricians, cleaners in Sagara. Instant booking, arrival PIN protection, live motorcycle tracking, and secure UPI payment.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Bilingual catalog (English & ಕನ್ನಡ)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Live 🏍️ Bike Tracking with dynamic ETA</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#10b981' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Verified Razorpay / UPI QR checkout</span>
              </li>
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            fontWeight: 800,
            color: '#2563eb',
            fontSize: '0.92rem'
          }}>
            <span>Enter as Customer</span>
            <ArrowRight size={18} />
          </div>
        </div>

        {/* PORTAL 2: TECHNICIAN (PROVIDER) APP */}
        <div
          onClick={() => onSelectRole('provider')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '2px solid #e2e8f0',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Wrench size={28} />
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portal 2
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px' }}>
              Technician (Pro) Portal
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
              For service professionals & motorcycle riders. Receive matching jobs via radar dispatch, verify customer arrival OTP, add spare parts, and track daily earnings.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Online / Offline dispatch switch</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Instant sound radar with 60s countdown</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Bank payout ledger & KYC status</span>
              </li>
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            fontWeight: 800,
            color: '#059669',
            fontSize: '0.92rem'
          }}>
            <span>Enter as Technician</span>
            <ArrowRight size={18} />
          </div>
        </div>

        {/* PORTAL 3: ADMIN & OPS DASHBOARD */}
        <div
          onClick={() => onSelectRole('admin')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '2px solid #e2e8f0',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d97706';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <ShieldAlert size={28} />
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portal 3
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px' }}>
              Admin Operations Desk
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
              Marketplace headquarters. Verify technician Aadhaar and license documents, adjust pricing and platform commissions, inspect live dispatch, and view audit logs.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>KYC Document verification approval queue</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Real-time Gross Merchandise Value (GMV)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Immutable security & transaction audit logs</span>
              </li>
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            fontWeight: 800,
            color: '#d97706',
            fontSize: '0.92rem'
          }}>
            <span>Enter as Admin</span>
            <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};
