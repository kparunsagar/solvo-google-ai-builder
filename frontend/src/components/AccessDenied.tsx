import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound } from 'lucide-react';

interface AccessDeniedProps {
  attemptedRole: string;
  userRole?: string;
  onReturnHome: () => void;
  onLoginAgain: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  attemptedRole,
  userRole,
  onReturnHome,
  onLoginAgain
}) => {
  return (
    <div style={{
      maxWidth: 620,
      margin: '60px auto',
      padding: '32px 24px',
      backgroundColor: '#ffffff',
      borderRadius: 16,
      border: '1px solid #fee2e2',
      boxShadow: '0 10px 30px rgba(239, 68, 68, 0.08)',
      textAlign: 'center'
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.1)'
      }}>
        <ShieldAlert size={32} />
      </div>

      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 20,
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        fontSize: '0.75rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 12
      }}>
        HTTP 403 • Restricted Access
      </span>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
        Role-Based Security Guard Violation
      </h2>

      <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
        You are currently recognized as <strong>{userRole || 'an unauthenticated client'}</strong>. 
        You do not possess the required credentials or verified privileges to access the 
        <strong> {attemptedRole.toUpperCase()}</strong> portal.
      </p>

      {/* Security & Access Protocol Note */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        fontSize: '0.78rem',
        color: '#475569',
        textAlign: 'left',
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start'
      }}>
        <Lock size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
            Account & Session Isolation
          </div>
          <div>
            Under platform security policies, technician financial ledgers, payout balances, and dispatch controls are strictly isolated from customer sessions.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onReturnHome}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Customer Portal</span>
        </button>

        <button
          onClick={onLoginAgain}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
          }}
        >
          <KeyRound size={16} />
          <span>Login with Authorized Role</span>
        </button>
      </div>
    </div>
  );
};
