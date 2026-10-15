import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  CreditCard,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Gift,
  ShieldAlert,
  Loader2,
  Smartphone,
  Banknote,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseLive } from '@/lib/firebase';
import { api as libApi, generateUpiUri, OFFICIAL_UPI_VPA } from '@/lib/api';
import { resolveBookingBilling } from '@/lib/billing';
import { initiateRazorpayPayment, RazorpayState } from '../services/razorpay.service';

interface PaymentModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: (updatedBooking: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ booking, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'upi' | 'card' | 'cash'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [paymentState, setPaymentState] = useState<RazorpayState | null>(null);
  const [doorstepQr, setDoorstepQr] = useState<string | null>(null);
  const [showSecondaryQr, setShowSecondaryQr] = useState(false);
  const [hasLaunchedUpi, setHasLaunchedUpi] = useState(false);
  const [launchedAppName, setLaunchedAppName] = useState<string>('Google Pay');
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);

  // Anti-Bypass / Whistleblower State
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportedUpi, setReportedUpi] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [whistleblowerDiscount, setWhistleblowerDiscount] = useState<number>(
    booking.whistleblower_discount || 0
  );
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  // Compute 20% platform commission breakdown using unified billing engine
  const billing = resolveBookingBilling(booking);
  const baseLabor = billing.baseAmount;
  const partsCost = billing.partsAmount;
  const platformFee = Math.round(baseLabor * 0.20);
  const gstAmount = Math.round(platformFee * 0.18);
  const techNetPayout = (baseLabor - platformFee) + partsCost;

  // Effective Total after any whistleblower reward discount
  const nominalTotal = billing.subtotal;
  const effectiveTotal = Math.max(0, nominalTotal - whistleblowerDiscount);

  React.useEffect(() => {
    // Generate official platform dynamic UPI QR code
    api.getDoorstepQr(booking.id)
      .then((res: any) => {
        if (res?.qr_data_url) {
          setDoorstepQr(res.qr_data_url);
        }
      })
      .catch(() => {});
  }, [booking.id]);

  // Real-time payment detection across Firestore, Window Events, and Cross-tab BroadcastChannel
  React.useEffect(() => {
    if (!booking?.id) return;

    const handlePaymentEvent = (e: any) => {
      const detail = e?.detail;
      if (detail?.bookingId === booking.id || detail?.id === booking.id) {
        setVerificationResult({
          message: `Payment of ₹${effectiveTotal} Confirmed! Job successfully completed with 30-Day Free Rework Warranty.`,
          isUpi: true
        });
        setTimeout(() => {
          onSuccess({ ...booking, ...detail, payment_status: 'PAID', status: 'COMPLETED', completed_at: detail?.completed_at || new Date().toISOString() });
        }, 1200);
      }
    };

    window.addEventListener('mud_payment_completed', handlePaymentEvent);
    window.addEventListener('mud_booking_updated', handlePaymentEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('urbandaily_sync_bus');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'mud_payment_completed' && msg.data?.payload?.bookingId === booking.id) {
            setVerificationResult({
              message: `Payment of ₹${effectiveTotal} Confirmed! Job marked completed.`,
              isUpi: true
            });
            setTimeout(() => {
              onSuccess({ ...booking, ...msg.data.payload, payment_status: 'PAID', status: 'COMPLETED', completed_at: msg.data?.payload?.completed_at || new Date().toISOString() });
            }, 1200);
          }
        };
      }
    } catch {}

    let unsubscribe: (() => void) | null = null;
    if (isFirebaseLive()) {
      try {
        unsubscribe = onSnapshot(doc(db, 'bookings', booking.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.payment_status === 'PAID' || data.status === 'COMPLETED') {
              setVerificationResult({
                message: `Payment Received! Job marked completed with 30-Day Warranty.`,
                isUpi: true
              });
              setTimeout(() => {
                onSuccess({ ...booking, ...data, payment_status: 'PAID', status: 'COMPLETED', completed_at: data?.completed_at || new Date().toISOString() });
              }, 1200);
            }
          }
        });
      } catch (err) {
        console.warn('[PaymentModal] Firestore listener warning:', err);
      }
    }

    return () => {
      window.removeEventListener('mud_payment_completed', handlePaymentEvent);
      window.removeEventListener('mud_booking_updated', handlePaymentEvent);
      if (bc) bc.close();
      if (unsubscribe) unsubscribe();
    };
  }, [booking?.id, effectiveTotal, onSuccess]);

  const handlePay = async () => {
    if (method === 'cash') {
      setIsProcessing(true);
      try {
        const cashRes = await api.collectCash(booking.id, booking.provider_id);
        try {
          await libApi.markPaymentComplete(booking.id, 'COD', `cash_${Date.now()}`);
        } catch {}
        setVerificationResult({
          message: `Cash payment confirmed! 30-Day Free Rework Warranty activated.`,
          isCash: true
        });
        setTimeout(() => {
          const finalB = cashRes.booking || { ...booking, payment_status: 'PAID', status: 'COMPLETED' };
          onSuccess({ ...finalB, completed_at: finalB.completed_at || new Date().toISOString() });
        }, 1500);
      } catch (err: any) {
        alert(`Payment failed: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(true);
      setPaymentState({
        status: 'creating_order',
        message: 'Initializing Razorpay Standard Checkout...'
      });

      await initiateRazorpayPayment({
        bookingId: booking.id,
        amount: effectiveTotal,
        customerName: booking.customer_name || 'Customer',
        customerEmail: booking.customer_email || 'customer@solvo.app',
        customerPhone: booking.customer_phone || '9876543210',
        onStateChange: (state) => {
          setPaymentState(state);
          if (state.status === 'popup_closed' || state.status === 'failed') {
            setIsProcessing(false);
          }
        },
        onSuccess: async (result) => {
          setIsProcessing(false);
          setVerificationResult({
            message: `Payment authorized via Razorpay (${result.paymentId})! Escrow settlement confirmed.`,
            isRazorpay: true
          });
          try {
            await libApi.markPaymentComplete(booking.id, 'RAZORPAY', result.paymentId);
          } catch {}
          setTimeout(() => {
            const finalB = result.booking || { ...booking, payment_status: 'PAID', status: 'COMPLETED' };
            onSuccess({ ...finalB, completed_at: finalB.completed_at || new Date().toISOString() });
          }, 1800);
        },
        onFailure: (err?: any) => {
          setIsProcessing(false);
          const msg = err?.description || err?.message || 'Payment was cancelled or could not be completed.';
          setPaymentState({ status: 'failed', message: msg, error: msg });
        },
        onDismiss: () => {
          setIsProcessing(false);
        }
      });
    }
  };

  const handleLaunchUpi = (appType?: 'gpay' | 'phonepe' | 'paytm' | 'generic') => {
    const appTitle = appType === 'gpay' ? 'Google Pay' : appType === 'phonepe' ? 'PhonePe' : appType === 'paytm' ? 'Paytm' : 'UPI App';
    setLaunchedAppName(appTitle);
    setHasLaunchedUpi(true);

    const serviceName = booking.service_title || booking.service_id || 'Doorstep Service';
    const upiUri = generateUpiUri(effectiveTotal, booking.id, serviceName);

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = upiUri;
      setPaymentState({
        status: 'popup_open',
        message: `Opening ${appTitle}... Confirm screen lock & authorize payment in ${appTitle}.`
      });
      setTimeout(() => {
        setPaymentState((curr) => {
          if (curr?.status === 'popup_open') {
            return {
              status: 'idle',
              message: `Opened ${appTitle}. Once completed, tap "Yes, Payment Done — Complete Job" below.`
            };
          }
          return curr;
        });
      }, 4000);
    } else {
      // Desktop / laptop: open Razorpay Standard Checkout which provides seamless desktop-friendly checkout & QR
      handlePay();
    }
  };

  const handleConfirmUpiPaid = async () => {
    setIsVerifyingUpi(true);
    try {
      const txnId = `upi_app_${Date.now()}`;
      const res = await libApi.markPaymentComplete(booking.id, 'UPI_QR', txnId);
      setVerificationResult({
        message: `Payment Confirmed via ${launchedAppName}! 30-Day Free Warranty Activated.`,
        isUpi: true
      });
      setTimeout(() => {
        const finalB = res.booking || { ...booking, payment_status: 'PAID', status: 'COMPLETED' };
        onSuccess({ ...finalB, completed_at: finalB.completed_at || new Date().toISOString() });
      }, 1200);
    } catch (err: any) {
      alert(`Could not confirm payment: ${err.message}`);
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleReportBypass = async () => {
    setIsSubmittingReport(true);
    try {
      const discount = Math.round(baseLabor * 0.20);
      await api.reportBypass({
        bookingId: booking.id,
        customerId: booking.customer_id,
        technicianId: booking.provider_id,
        reason: 'Technician requested personal UPI / direct offline payment at doorstep',
        upiIdOffered: reportedUpi || undefined
      });
      setWhistleblowerDiscount(discount);
      setReportNotice(
        `🎉 Whistleblower Discount of ₹${discount} (20%) Applied! Your 30-Day Warranty is protected. The technician has been flagged for audit.`
      );
      setShowReportDialog(false);
    } catch (err: any) {
      alert(`Failed to submit report: ${err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const defaultQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=solvo.escrow@icici%26pn=SOLVO%20Escrow%26am=${effectiveTotal}%26cu=INR%26tr=MUD-${booking.id}`;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Razorpay Escrow Gateway
              </h4>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                256-Bit SSL Encrypted • 30-Day Warranty & Protection Guarantee
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Warranty & Damage Insurance Lock Banner */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}>
            <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.72rem', color: '#166534', lineHeight: 1.4 }}>
              <strong>30-Day Free Rework Warranty:</strong>
              <div>
                Protected ONLY when paying through Official Escrow QR or App.
                <span style={{ color: '#b91c1c', fontWeight: 700 }}> Paying to technician's personal or relative's UPI voids all warranty coverage!</span>
              </div>
            </div>
          </div>

          {/* Amount banner */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Total Payable to SOLVO
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
                    ₹{effectiveTotal}
                  </div>
                  {whistleblowerDiscount > 0 && (
                    <div style={{ fontSize: '0.9rem', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 700 }}>
                      ₹{nominalTotal}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 8px',
                  borderRadius: 6
                }}>
                  Official Escrow
                </span>
                <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
                  30-Day Free Warranty
                </div>
              </div>
            </div>

            {/* Transparent customer pricing breakdown */}
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px dashed #cbd5e1',
              fontSize: '0.72rem',
              color: '#64748b',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4
            }}>
              <div>Service & Labor: <strong>₹{baseLabor}</strong></div>
              <div>Newly Added Materials: <strong>₹{partsCost}</strong></div>
              <div>Applicable Taxes (GST 18%): <strong>₹{gstAmount}</strong></div>
              <div>Total Payable: <strong style={{ color: '#2563eb' }}>₹{effectiveTotal}</strong></div>
            </div>

            {whistleblowerDiscount > 0 && (
              <div style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.72rem',
                color: '#16a34a',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Gift size={14} /> Whistleblower Protection Discount: -₹{whistleblowerDiscount} (20% OFF)
              </div>
            )}
          </div>

          {/* Whistleblower Anti-Bypass Banner */}
          {whistleblowerDiscount === 0 && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px dashed #f59e0b',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} color="#d97706" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>
                    Technician asked for personal UPI?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportDialog(!showReportDialog)}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#b45309',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  {showReportDialog ? 'Cancel' : 'Report & Get 20% Off'}
                </button>
              </div>

              {showReportDialog && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fed7aa' }}>
                  <p style={{ fontSize: '0.7rem', color: '#78350f', marginBottom: 6 }}>
                    Technicians are strictly prohibited from asking for payment on personal UPI, personal QR, or relatives' accounts. Report below to receive an instant <strong>20% discount</strong> and retain full warranty!
                  </p>
                  <input
                    type="text"
                    value={reportedUpi}
                    onChange={(e) => setReportedUpi(e.target.value)}
                    placeholder="Enter Technician's UPI ID / Phone (Optional)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      border: '1px solid #fcd34d',
                      borderRadius: 6,
                      marginBottom: 8,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleReportBypass}
                    disabled={isSubmittingReport}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    {isSubmittingReport ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                    Submit Report & Claim 20% Discount
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner if Whistleblower discount applied */}
          {reportNotice && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: '0.72rem',
              color: '#065f46',
              fontWeight: 600
            }}>
              {reportNotice}
            </div>
          )}

          {/* Payment Method Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setMethod('upi')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 10,
                border: method === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: method === 'upi' ? '#eff6ff' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.78rem',
                color: method === 'upi' ? '#2563eb' : '#475569',
                cursor: 'pointer'
              }}
            >
              <Smartphone size={18} />
              <span>UPI Apps (GPay)</span>
            </button>

            <button
              onClick={() => setMethod('card')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 10,
                border: method === 'card' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: method === 'card' ? '#eff6ff' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.78rem',
                color: method === 'card' ? '#2563eb' : '#475569',
                cursor: 'pointer'
              }}
            >
              <CreditCard size={18} />
              <span>Cards / NetBank</span>
            </button>

            <button
              onClick={() => setMethod('cash')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 10,
                border: method === 'cash' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: method === 'cash' ? '#eff6ff' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.78rem',
                color: method === 'cash' ? '#2563eb' : '#475569',
                cursor: 'pointer'
              }}
            >
              <Banknote size={18} />
              <span>Pay Cash</span>
            </button>
          </div>

          {method === 'upi' && (
            <div style={{ marginBottom: 16 }}>
              {/* Post-App Launch Auto-Confirm Card */}
              {hasLaunchedUpi && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #86efac',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 12,
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#166534', fontSize: '0.82rem' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>Authorized Payment on {launchedAppName}?</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#15803d', margin: '4px 0 10px', lineHeight: 1.4 }}>
                    If you confirmed your lock & paid ₹{effectiveTotal} in {launchedAppName}, tap below to immediately complete the booking and generate your invoice!
                  </p>
                  <button
                    type="button"
                    onClick={handleConfirmUpiPaid}
                    disabled={isVerifyingUpi}
                    style={{
                      width: '100%',
                      padding: '11px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
                    }}
                  >
                    {isVerifyingUpi ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>✓ I Completed Payment on {launchedAppName} — Complete Job</span>
                  </button>
                </div>
              )}

              {/* Direct UPI App Launch Buttons */}
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Pay directly with your installed UPI App (Instant 1-Tap):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {/* Google Pay */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('gpay')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem'
                  }}>
                    G
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Google Pay</div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Open GPay app</div>
                  </div>
                </button>

                {/* PhonePe */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('phonepe')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#faf5ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.9rem'
                  }}>
                    Pe
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>PhonePe</div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Open PhonePe app</div>
                  </div>
                </button>

                {/* Paytm / Any UPI */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('paytm')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#f0f9ff',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.72rem'
                  }}>
                    UPI
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Paytm / BHIM</div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Cred, Any UPI</div>
                  </div>
                </button>

                {/* Razorpay Gateway */}
                <button
                  type="button"
                  onClick={handlePay}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Razorpay</div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>All UPI & Cards</div>
                  </div>
                </button>
              </div>

              {/* In-Person Doorstep Guidance Card */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 800, fontSize: '0.78rem' }}>
                  <QrCode size={16} color="#7c3aed" />
                  <span>Paying Technician in Person at Doorstep?</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, lineHeight: 1.45, margin: '4px 0 0' }}>
                  The technician will tap <strong>"Show Escrow QR Code"</strong> on their phone screen.
                  Open Google Pay, PhonePe, or Paytm camera scanner on your device and point it at the <strong>technician's screen</strong> to pay.
                </p>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '0.7rem' }}>
                  <span style={{ color: '#166534', fontWeight: 700 }}>✔ Verified Escrow VPA:</span>
                  <code style={{ color: '#15803d', fontWeight: 800, backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                    {OFFICIAL_UPI_VPA}
                  </code>
                </div>
              </div>

              {/* Secondary phone optional QR toggle */}
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowSecondaryQr(!showSecondaryQr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {showSecondaryQr ? '▲ Hide QR Code' : '▼ Paying from another device? Show QR Code'}
                </button>
                {showSecondaryQr && (
                  <div style={{
                    marginTop: 8,
                    padding: 10,
                    backgroundColor: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    display: 'inline-block',
                    textAlign: 'center'
                  }}>
                    <img
                      src={doorstepQr || defaultQrUrl}
                      alt="SOLVO Escrow QR"
                      style={{ width: 130, height: 130, margin: '0 auto', display: 'block', borderRadius: 6 }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 4, fontWeight: 700 }}>
                      Scan with another mobile device
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {method === 'card' && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px',
              marginBottom: 16,
              fontSize: '0.75rem',
              color: '#334155'
            }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={16} color="#2563eb" />
                <span>Credit Card, Debit Card & NetBanking</span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', lineHeight: 1.4 }}>
                Supports Visa, MasterCard, RuPay, Maestro, Corporate Cards & 50+ NetBanking options via Razorpay's 256-Bit SSL Encrypted Escrow Gateway.
              </p>
            </div>
          )}

          {method === 'cash' && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 16,
              fontSize: '0.75rem',
              color: '#92400e'
            }}>
              <strong>Doorstep Cash Collection:</strong> You may hand cash directly to technician.
              Your official digital receipt and 30-Day Free Rework Warranty will be generated and saved under your profile upon receipt.
            </div>
          )}

          {/* Razorpay Interactive Payment State Banners */}
          {paymentState?.status === 'payment_pending' && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <Loader2 size={18} className="animate-spin text-amber-600" />
              <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                <strong>Payment Pending:</strong> Payment authorized on Razorpay ({paymentState.paymentId}). Awaiting secure bank webhook to confirm settlement.
              </div>
            </div>
          )}

          {paymentState?.status === 'popup_closed' && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 16,
              fontSize: '0.78rem',
              color: '#475569'
            }}>
              ℹ️ Payment window closed. Click below to pay online whenever you are ready.
            </div>
          )}

          {paymentState?.status === 'failed' && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertTriangle size={18} color="#dc2626" />
              <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>
                <strong>Payment Notice:</strong> {paymentState.message || 'Payment was declined or cancelled.'}
              </div>
            </div>
          )}

          {/* Webhook Verification Banner */}
          {verificationResult && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <CheckCircle2 size={20} color="#059669" />
              <div style={{ fontSize: '0.8rem', color: '#065f46' }}>
                <strong>Payment Confirmed!</strong> {verificationResult.message || `Razorpay webhook verified with HMAC-SHA256 signature.`}
              </div>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={() => {
              if (method === 'upi') {
                handleLaunchUpi('generic');
              } else {
                handlePay();
              }
            }}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: method === 'cash' ? '#059669' : '#2563eb',
              color: '#ffffff',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              opacity: isProcessing ? 0.7 : 1,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Lock size={16} />
            <span>
              {isProcessing
                ? 'Processing & Securing Escrow...'
                : method === 'cash'
                ? `Confirm Cash Payment of ₹${effectiveTotal}`
                : method === 'upi'
                ? `Pay ₹${effectiveTotal} via Google Pay / UPI`
                : `Pay ₹${effectiveTotal} via Cards / NetBanking`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
