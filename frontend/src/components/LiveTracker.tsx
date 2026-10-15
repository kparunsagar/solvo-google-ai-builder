import React from 'react';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  Navigation,
  KeyRound,
  Wrench,
  CheckCheck,
  CreditCard,
  Star,
  Phone,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { resolveBookingBilling } from '@/lib/billing';

export const LIFECYCLE_STEPS = [
  { key: 'REQUESTED', label: 'Requested', label_kn: 'ಕೋರಲಾಗಿದೆ', icon: Clock, desc: 'Matching nearby technician' },
  { key: 'PROVIDER_MATCHED', label: 'Matched', label_kn: 'ಹೊಂದಾಣಿಕೆ', icon: UserCheck, desc: 'Provider notified' },
  { key: 'ACCEPTED', label: 'Accepted', label_kn: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ', icon: CheckCircle2, desc: 'Job confirmed' },
  { key: 'ON_THE_WAY', label: 'On The Way', label_kn: 'ದಾರಿಯಲ್ಲಿದ್ದಾರೆ', icon: Navigation, desc: 'Technician en route' },
  { key: 'ARRIVED', label: 'Arrived', label_kn: 'ತಲುಪಿದ್ದಾರೆ', icon: KeyRound, desc: 'At customer door' },
  { key: 'SERVICE_IN_PROGRESS', label: 'In Progress', label_kn: 'ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ', icon: Wrench, desc: 'Service ongoing' },
  { key: 'COMPLETED', label: 'Completed', label_kn: 'ಪೂರ್ಣಗೊಂಡಿದೆ', icon: CheckCheck, desc: 'Work done' },
  { key: 'PAYMENT_CONFIRMED', label: 'Paid', label_kn: 'ಪಾವತಿಸಲಾಗಿದೆ', icon: CreditCard, desc: 'Payment verified' },
  { key: 'REVIEWED', label: 'Reviewed', label_kn: 'ರೇಟಿಂಗ್ ನೀಡಲಾಗಿದೆ', icon: Star, desc: 'Feedback submitted' }
];

interface LiveTrackerProps {
  booking: any;
  language: 'en' | 'kn';
  onPayNow?: () => void;
  onReviewNow?: () => void;
  onViewInvoice?: () => void;
  onCancelOrder?: () => void;
}

export const LiveTracker: React.FC<LiveTrackerProps> = ({
  booking,
  language,
  onPayNow,
  onReviewNow,
  onViewInvoice,
  onCancelOrder
}) => {
  if (!booking) return null;

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);
  const isTerminal = booking.status === 'REVIEWED';

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
    }}>
      {/* Header Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: 16,
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '3px 8px',
              borderRadius: 6
            }}>
              {booking.booking_code}
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              {booking.service ? (language === 'kn' ? booking.service.name_kn : booking.service.name) : 'Home Service'}
            </h3>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            📍 {booking.address_locality} • {booking.address_text}
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: booking.status === 'PAYMENT_CONFIRMED' || booking.status === 'REVIEWED' ? '#ecfdf5' : '#eff6ff',
          color: booking.status === 'PAYMENT_CONFIRMED' || booking.status === 'REVIEWED' ? '#059669' : '#2563eb',
          padding: '6px 14px',
          borderRadius: 20,
          fontWeight: 700,
          fontSize: '0.85rem'
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'currentColor'
          }} className="radar-ping" />
          <span>
            {LIFECYCLE_STEPS.find((s) => s.key === booking.status)?.label || booking.status}
          </span>
        </div>
      </div>

      {/* 8-Stage Horizontal Timeline */}
      <div style={{ overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: 720,
          position: 'relative',
          padding: '0 10px'
        }}>
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isUpcoming = idx > currentStepIndex;
            const StepIcon = step.icon;

            return (
              <div
                key={step.key}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  textAlign: 'center'
                }}
              >
                {/* Connecting Line */}
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 18,
                    left: '50%',
                    width: '100%',
                    height: 3,
                    backgroundColor: isDone ? '#10b981' : '#e2e8f0',
                    zIndex: 1,
                    transition: 'background-color 0.3s ease'
                  }} />
                )}

                {/* Circle Icon Node */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  backgroundColor: isCurrent ? '#2563eb' : isDone ? '#10b981' : '#f1f5f9',
                  color: isCurrent || isDone ? '#ffffff' : '#94a3b8',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.3s ease'
                }} className={isCurrent ? 'animate-pulse-glow' : ''}>
                  <StepIcon size={16} />
                </div>

                {/* Step Label */}
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? '#2563eb' : isDone ? '#0f172a' : '#94a3b8'
                  }}>
                    {language === 'kn' ? step.label_kn : step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrival OTP Security Card (Visible until Work Completed) */}
      {(() => {
        const trackerOtp = booking.otp || booking.doorstep_otp;
        if (!trackerOtp || currentStepIndex >= 6) return null;
        return (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px dashed #3b82f6',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            boxShadow: '0 4px 14px rgba(37,99,235,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8'
              }}>
                <KeyRound size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {language === 'kn' ? 'ಆಗಮನ ಪರಿಶೀಲನಾ ಪಿನ್ (OTP)' : 'Doorstep Verification PIN'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: 2 }}>
                  {language === 'kn' ? 'ತಂತ್ರಜ್ಞರು ನಿಮ್ಮ ಮನೆಗೆ ಬಂದಾಗ ಈ 4-ಅಂಕಿಯ ಕೋಡ್ ತಿಳಿಸಿ' : 'Share this 4-digit code with the technician upon arrival at your door'}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '0.25em',
              color: '#1d4ed8',
              backgroundColor: '#ffffff',
              padding: '6px 16px',
              borderRadius: 10,
              border: '2px solid #bfdbfe',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              {trackerOtp}
            </div>
          </div>
        );
      })()}

      {/* Assigned Technician Card */}
      {booking.provider && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: 12,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={booking.provider.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'}
              alt={booking.provider.name}
              style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                  {booking.provider.name}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  <ShieldCheck size={12} /> Verified Sagara Pro
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                ⭐ {booking.provider.profile?.rating || 4.9} ({booking.provider.profile?.total_reviews || 100}+ reviews) • {booking.provider.profile?.aadhaar_number ? 'KYC Verified' : 'Govt ID Checked'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={`tel:${booking.provider.phone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <Phone size={14} color="#059669" />
              <span>Call Pro</span>
            </a>
          </div>
        </div>
      )}

      {/* Bill & Invoicing Summary */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: '16px',
        fontSize: '0.85rem'
      }}>
        <div style={{ fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={15} />
          <span>{language === 'kn' ? 'ಶುಲ್ಕದ ವಿವರಣೆ (GST ಸೇರಿದಂತೆ)' : 'Bill Summary (Including Taxes)'}</span>
        </div>

        {(() => {
          const billing = resolveBookingBilling(booking);
          const parts = billing.partsAmount;
          const base = billing.baseAmount;
          const finalPayable = billing.total;

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>{language === 'kn' ? 'ಮೂಲ ಸೇವಾ ಶುಲ್ಕ' : 'Service Inspection Fee'}</span>
                <span>₹{base}</span>
              </div>

              {parts > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                  <span>{language === 'kn' ? 'ಹೆಚ್ಚುವರಿ ಭಾಗಗಳು / ಸಾಮಗ್ರಿಗಳು' : 'Spare Parts & Materials'}</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>₹{parts}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>{language === 'kn' ? 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಶುಲ್ಕ ಮತ್ತು GST (18% ಒಳಗೊಂಡಿದೆ)' : 'Platform Fee & GST (18% Incl.)'}</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{language === 'kn' ? 'ಸೇರಿಸಲಾಗಿದೆ' : 'Included'}</span>
              </div>

              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: 8,
                marginTop: 8,
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                color: '#0f172a',
                fontSize: '1rem'
              }}>
                <span>{language === 'kn' ? 'ಒಟ್ಟು ಮೊತ್ತ' : 'Total Amount Payable'}</span>
                <span style={{ color: '#2563eb' }}>₹{finalPayable}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Action Footer for Customer */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        {['COMPLETED', 'PAYMENT_CONFIRMED', 'REVIEWED'].includes(booking.status) && onViewInvoice && (
          <button
            onClick={onViewInvoice}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} color="#2563eb" />
            <span>{language === 'kn' ? 'ತೆರಿಗೆ ಸರಕುಪಟ್ಟಿ (Invoice)' : 'View Tax Invoice'}</span>
          </button>
        )}

        {booking.status === 'COMPLETED' && onPayNow && (
          <button
            onClick={onPayNow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
            }}
          >
            <CreditCard size={18} />
            <span>Pay ₹{booking.total_amount} (UPI / Card)</span>
          </button>
        )}

        {booking.status === 'PAYMENT_CONFIRMED' && onReviewNow && (
          <button
            onClick={onReviewNow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: '#059669',
              color: '#ffffff',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 2px 8px rgba(5,150,105,0.4)'
            }}
          >
            <Star size={18} />
            <span>{language === 'kn' ? 'ರೇಟಿಂಗ್ ಮತ್ತು ವಿಮರ್ಶೆ ನೀಡಿ' : 'Rate & Review Technician'}</span>
          </button>
        )}

        {booking.status === 'REVIEWED' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#059669',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <CheckCheck size={18} />
            <span>{language === 'kn' ? 'ಸೇವೆ ಯಶಸ್ವಿಯಾಗಿ ಮುಕ್ತಾಯಗೊಂಡಿದೆ!' : 'Service Completed & Reviewed!'}</span>
          </div>
        )}

        {['REQUESTED', 'PROVIDER_MATCHED', 'ACCEPTED', 'PENDING', 'EN_ROUTE', 'ON_THE_WAY'].includes(booking.status) && onCancelOrder && (
          <button
            onClick={onCancelOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <span>{language === 'kn' ? 'ಆರ್ಡರ್ ರದ್ದುಮಾಡಿ' : 'Cancel Order'}</span>
          </button>
        )}

        {booking.status === 'CANCELLED' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#dc2626',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: '#fef2f2',
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid #fecaca'
          }}>
            <span>
              {language === 'kn' ? 'ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ' : 'Booking Cancelled'}
              {booking.cancellation_reason ? `: ${booking.cancellation_reason}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
