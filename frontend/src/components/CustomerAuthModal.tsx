import React, { useState } from 'react';
import { Phone, ShieldCheck, ArrowRight, CheckCircle2, Lock, X } from 'lucide-react';
import { getSecureRandomDigits } from '@/utils/crypto';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onSuccess: (user: any) => void;
  language: 'en' | 'kn';
  onClose?: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ isOpen, onSuccess, language, onClose }) => {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      alert('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    // Generate realistic 4-digit demo OTP
    const mockOtp = getSecureRandomDigits(4);
    setGeneratedOtp(mockOtp);
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otp.join('');
    if (entered !== generatedOtp) {
      alert(`Invalid OTP! Please enter the code sent to your phone.`);
      return;
    }

    const user = {
      id: `usr-cust-${phone.slice(-4)}`,
      phone,
      name: name || `Customer (${phone.slice(-4)})`,
      role: 'customer',
      preferred_language: language,
      created_at: new Date().toISOString()
    };

    localStorage.setItem('urbanai_customer_token', JSON.stringify(user));
    onSuccess(user);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        )}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Lock size={24} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {step === 'phone' ? 'Login with Mobile Number' : 'Enter 4-Digit Verification Code'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            {step === 'phone'
              ? 'Enter your phone number to book verified services in Sagara'
              : `We sent an SMS with a 4-digit code to +91 ${phone}`}
          </p>
        </div>

        <div style={{ padding: 24 }}>
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Hegde"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mobile Number (India +91)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    padding: '10px 14px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '0.9rem'
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8
                }}
              >
                <span>Send Verification OTP</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'grid', gap: 16 }}>
              {/* Demo OTP Banner for immediate instant testing */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px dashed #3b82f6',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#1d4ed8',
                textAlign: 'center'
              }}>
                🔑 Demo SMS Received: <strong>{generatedOtp}</strong> (or type 1234)
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '10px 0' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={otp[idx]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextOtp = [...otp];
                      nextOtp[idx] = val;
                      setOtp(nextOtp);
                      if (val && idx < 3) {
                        const nextField = document.getElementById(`otp-${idx + 1}`);
                        nextField?.focus();
                      }
                    }}
                    style={{
                      width: 48,
                      height: 52,
                      borderRadius: 8,
                      border: '2px solid #93c5fd',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                ))}
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <CheckCircle2 size={18} />
                <span>Verify & Login to Book</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Change mobile number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
