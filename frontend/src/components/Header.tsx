import React from 'react';
import { MapPin, Globe, ShieldCheck, User, Wrench, ShieldAlert, LogOut, Lock, ChevronDown, Zap, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps {
  language: 'en' | 'kn';
  setLanguage: (lang: 'en' | 'kn') => void;
  selectedLocality: string;
  isConnected: boolean;
  currentUser: any;
  viewMode?: 'mobile' | 'desktop';
  onToggleViewMode?: () => void;
  onOpenAuth: (role?: 'customer' | 'provider' | 'admin') => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onOpenLocationDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  selectedLocality,
  isConnected,
  currentUser,
  viewMode = 'desktop',
  onToggleViewMode,
  onOpenAuth,
  onLogout,
  onNavigateHome,
  onOpenLocationDrawer
}) => {
  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand & Location Anchor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={onNavigateHome}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: 40,
              height: 40,
              backgroundColor: '#2563eb',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}>
              M
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
                MyUrban<span style={{ color: '#2563eb' }}>Daily</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                {language === 'kn' ? 'ವಿಶ್ವಾಸಾರ್ಹ ಮನೆ ಸೇವೆಗಳ ವೇದಿಕೆ' : 'Trusted On-Demand Daily Home Services'}
              </div>
            </div>
          </div>

          {/* Zepto/Flipkart Style Delivery Location Pill */}
          <div
            onClick={onOpenLocationDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: 12,
              cursor: onOpenLocationDrawer ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
            title="Click to change your delivery/service location"
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MapPin size={14} color="#ef4444" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Doorstep in 45 Mins
                </span>
                {onOpenLocationDrawer && <ChevronDown size={12} color="#64748b" />}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedLocality}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Controls & Auth Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* WebSocket Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isConnected ? '#059669' : '#e11d48'
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#e11d48',
              boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
            }} />
            <span>{isConnected ? 'Live Sync' : 'Connecting...'}</span>
          </div>

          {/* Language Switch */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            <Globe size={13} />
            <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
          </button>

          {/* View Mode Toggle: Mobile App Mode vs Desktop Mode */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: viewMode === 'mobile' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: viewMode === 'mobile' ? '#eff6ff' : '#ffffff',
                color: viewMode === 'mobile' ? '#2563eb' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Toggle between Mobile App View and Desktop Dashboard View"
            >
              {viewMode === 'mobile' ? <Smartphone size={14} color="#2563eb" /> : <Monitor size={14} color="#64748b" />}
              <span>{viewMode === 'mobile' ? 'Mobile App Mode' : 'Desktop Mode'}</span>
            </button>
          )}

          {/* User Auth Section */}
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#f8fafc',
              padding: '6px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: currentUser.role === 'provider' ? '#fef3c7' : currentUser.role === 'admin' ? '#fee2e2' : '#dbeafe',
                color: currentUser.role === 'provider' ? '#d97706' : currentUser.role === 'admin' ? '#dc2626' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={11} />
                  <span>
                    {currentUser.role === 'provider'
                      ? 'Technician Pro'
                      : currentUser.role === 'admin'
                      ? 'Administrator'
                      : 'Customer'} • MFA Active
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Logout from session"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 4
                }}
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Single Uncluttered Auth Action (No Duplicate Buttons) */}
              <button
                onClick={() => onOpenAuth('customer')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                }}
              >
                <Lock size={14} />
                <span>Sign In / Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
