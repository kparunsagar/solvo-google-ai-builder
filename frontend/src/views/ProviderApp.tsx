import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Power,
  IndianRupee,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  KeyRound,
  PlusCircle,
  Navigation,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { SagaraMap } from '../components/SagaraMap';

interface ProviderAppProps {
  language: 'en' | 'kn';
  providerUser: any;
}

export const ProviderApp: React.FC<ProviderAppProps> = ({ language, providerUser }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [offerCountdown, setOfferCountdown] = useState<number>(60);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [partsInput, setPartsInput] = useState<string>('');
  const [partsDesc, setPartsDesc] = useState<string>('');
  const [jobHistory, setJobHistory] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
    loadJobs();

    // Subscribe to WebSocket for instant dispatches and state updates
    const unsubscribe = socket.subscribe((payload) => {
      if (payload.type === 'INCOMING_JOB_OFFER' && payload.booking) {
        setIncomingOffer(payload.booking);
        setOfferCountdown(payload.timeoutSecs || 60);
      } else if (payload.type === 'BOOKING_UPDATED' && payload.booking) {
        if (payload.booking.provider_id === providerUser.id) {
          setActiveJob(payload.booking);
          loadJobs();
        }
      }
    });

    return () => unsubscribe();
  }, [providerUser.id]);

  // Countdown timer for incoming dispatch offer
  useEffect(() => {
    if (!incomingOffer) return;
    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          setIncomingOffer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingOffer]);

  const loadProfile = async () => {
    try {
      const data = await api.getProviderProfile(providerUser.id);
      setProfile(data);
      setIsOnline(data.is_online);
    } catch (err) {
      console.error('Failed to load provider profile', err);
    }
  };

  const loadJobs = async () => {
    try {
      const list = await api.getBookings({ providerId: providerUser.id });
      setJobHistory(list);
      const ongoing = list.find((b) => !['REVIEWED', 'CANCELLED'].includes(b.status));
      if (ongoing) {
        setActiveJob(ongoing);
      }
    } catch (err) {
      console.error('Failed to load provider jobs', err);
    }
  };

  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      await api.updateAvailability({ userId: providerUser.id, isOnline: nextState });
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  // Job Stepper actions
  const handleAcceptOffer = async (bookingId: string) => {
    try {
      const updated = await api.acceptBooking(bookingId, providerUser.id);
      setActiveJob(updated);
      setIncomingOffer(null);
      loadJobs();
    } catch (err: any) {
      alert(`Accept failed: ${err.message}`);
    }
  };

  const handleDeclineOffer = () => {
    setIncomingOffer(null);
  };

  const handleStartJourney = async () => {
    if (!activeJob) return;
    try {
      const updated = await api.markOnTheWay(activeJob.id, providerUser.id);
      setActiveJob(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArrive = async () => {
    if (!activeJob) return;
    if (!otpInput) {
      alert('Please ask the customer for their 4-digit arrival PIN and enter it below.');
      return;
    }
    try {
      const updated = await api.markArrived(activeJob.id, providerUser.id, otpInput);
      setActiveJob(updated);
      setOtpInput('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartWork = async () => {
    if (!activeJob) return;
    try {
      const updated = await api.startService(activeJob.id, providerUser.id);
      setActiveJob(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddParts = async () => {
    if (!activeJob || !partsInput) return;
    try {
      const updated = await api.addParts(
        activeJob.id,
        providerUser.id,
        parseFloat(partsInput),
        partsDesc || 'Spare materials'
      );
      setActiveJob(updated);
      setPartsInput('');
      setPartsDesc('');
      alert('Spare parts added to invoice!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteWork = async () => {
    if (!activeJob) return;
    try {
      const updated = await api.completeService(activeJob.id, providerUser.id);
      setActiveJob(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Bar: Profile & Availability Toggle */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={providerUser.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'}
            alt={providerUser.name}
            style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {providerUser.name}
              </h2>
              <span className={`badge-pill ${profile?.kyc_status === 'verified' ? 'badge-success' : 'badge-warning'}`}>
                <ShieldCheck size={12} />
                {profile?.kyc_status === 'verified' ? 'KYC Verified' : 'KYC Pending Review'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
              Sagara Taluk Service Area (15 km Radius) • Rating: ⭐ {profile?.rating || 4.9}
            </div>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isOnline ? '#059669' : '#64748b' }}>
            {isOnline ? '🟢 Online & Receiving Jobs' : '⚪ Offline'}
          </span>
          <button
            onClick={toggleOnline}
            style={{
              padding: '10px 18px',
              borderRadius: 24,
              backgroundColor: isOnline ? '#059669' : '#e2e8f0',
              color: isOnline ? '#ffffff' : '#475569',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isOnline ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Power size={16} />
            <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Earnings Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Completed Payouts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            ₹{profile?.total_earnings || 42800}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
            Direct Bank Transfer to {profile?.bank_account_info?.bank_name || 'Bank of Baroda Sagara'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Pending Payout Balance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
            ₹{profile?.pending_payout || 3450}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
            Credited next banking cycle
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Completed Jobs</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {profile?.total_reviews || 134}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
            99.2% Acceptance Rate in Sagara
          </div>
        </div>
      </div>

      {/* REAL-TIME INCOMING JOB OFFER POPUP BANNER (RADAR) */}
      {incomingOffer && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #2563eb',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(37,99,235,0.2)'
        }} className="animate-pulse-glow">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wrench size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6 }}>
                    NEW MATCHED REQUEST
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626' }}>
                    ⏳ {offerCountdown}s remaining
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                  {incomingOffer.service?.name} in {incomingOffer.address_locality}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569' }}>
                  📍 {incomingOffer.address_text} • Customer notes: "{incomingOffer.customer_notes || 'Standard service'}"
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right', marginRight: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Earnings</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                  ₹{incomingOffer.provider_payout_amount}
                </div>
              </div>

              <button
                onClick={handleDeclineOffer}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                Pass
              </button>

              <button
                onClick={() => handleAcceptOffer(incomingOffer.id)}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.4)'
                }}
              >
                Accept Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE JOB WORKFLOW CONTROLLER */}
      {activeJob && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          marginBottom: 28
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 16,
            marginBottom: 20
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                  {activeJob.booking_code}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeJob.service?.name}
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                Customer: {activeJob.customer?.name} ({activeJob.customer?.phone}) • 📍 {activeJob.address_locality}
              </p>
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: 20
            }}>
              Current State: {activeJob.status}
            </div>
          </div>

          {/* Stepper Progression Buttons */}
          <div style={{ display: 'grid', gap: 16 }}>
            {/* STEP 1: ON THE WAY */}
            {activeJob.status === 'ACCEPTED' && (
              <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Step 1: Start Journey</h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>
                  Notify customer that you have departed and are traveling towards their address in {activeJob.address_locality}.
                </p>
                <button
                  onClick={handleStartJourney}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Navigation size={16} />
                  <span>Start Journey (On The Way)</span>
                </button>
              </div>
            )}

            {/* STEP 2: ARRIVED (REQUIRES CUSTOMER 4-DIGIT OTP) */}
            {activeJob.status === 'ON_THE_WAY' && (
              <div style={{ backgroundColor: '#eff6ff', padding: 20, borderRadius: 12, border: '1px dashed #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <KeyRound size={20} color="#1d4ed8" />
                  <h4 style={{ fontWeight: 800, color: '#1e3a8a' }}>
                    Step 2: Doorstep Arrival & Secure OTP Verification
                  </h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#3b82f6', marginBottom: 14 }}>
                  Ask the customer at the door for their 4-digit PIN displayed on their app to verify arrival.
                </p>
                <div style={{ display: 'flex', gap: 10, maxWidth: 360 }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '2px solid #93c5fd',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      letterSpacing: '0.2em',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleArrive}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      backgroundColor: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}
                  >
                    Verify & Mark Arrived
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: BEGIN WORK */}
            {activeJob.status === 'ARRIVED' && (
              <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Step 3: Begin Service</h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>
                  OTP verified! Inspect the problem and begin service work.
                </p>
                <button
                  onClick={handleStartWork}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Wrench size={16} />
                  <span>Start Work (Service In Progress)</span>
                </button>
              </div>
            )}

            {/* STEP 4: WORK IN PROGRESS + OPTIONAL EXTRA PARTS */}
            {activeJob.status === 'SERVICE_IN_PROGRESS' && (
              <div>
                <div style={{ backgroundColor: '#fffbeb', padding: 20, borderRadius: 12, border: '1px solid #fde68a', marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 800, color: '#92400e', marginBottom: 6 }}>Work In Progress</h4>
                  <p style={{ fontSize: '0.82rem', color: '#b45309', marginBottom: 14 }}>
                    If additional spare parts or replacement pipes/capacitors were required, add them below:
                  </p>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      placeholder="Extra Parts (₹)"
                      value={partsInput}
                      onChange={(e) => setPartsInput(e.target.value)}
                      style={{ width: 140, padding: '8px 12px', borderRadius: 8, border: '1px solid #d97706' }}
                    />
                    <input
                      type="text"
                      placeholder="Parts Description (e.g. Brass valve)"
                      value={partsDesc}
                      onChange={(e) => setPartsDesc(e.target.value)}
                      style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #d97706' }}
                    />
                    <button
                      onClick={handleAddParts}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    >
                      Add Parts
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCompleteWork}
                  style={{
                    padding: '14px 28px',
                    borderRadius: 10,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Check size={18} />
                  <span>Mark Work Complete (Send Invoice to Customer)</span>
                </button>
              </div>
            )}

            {/* STEP 5: PENDING PAYMENT */}
            {activeJob.status === 'COMPLETED' && (
              <div style={{ backgroundColor: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <h4 style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: 6 }}>Work Marked Complete!</h4>
                <p style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                  Invoice of ₹{activeJob.total_amount} sent to customer. Awaiting UPI/Card payment confirmation.
                  Your payout of ₹{activeJob.provider_payout_amount} will be credited instantly once confirmed!
                </p>
              </div>
            )}

            {/* STEP 6: PAYMENT CONFIRMED */}
            {activeJob.status === 'PAYMENT_CONFIRMED' && (
              <div style={{ backgroundColor: '#ecfdf5', padding: 20, borderRadius: 12, border: '1px solid #a7f3d0' }}>
                <h4 style={{ fontWeight: 800, color: '#065f46', marginBottom: 6 }}>Payment Received!</h4>
                <p style={{ fontSize: '0.85rem', color: '#047857' }}>
                  Payment of ₹{activeJob.total_amount} verified via gateway webhook! Your net earning of ₹{activeJob.provider_payout_amount} has been credited to your wallet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider Past Completed Jobs */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
          Recent Jobs in Sagara
        </h3>
        {jobHistory.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: 30, borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
            No completed jobs yet. Keep app online to receive bookings!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {jobHistory.map((j) => (
              <div
                key={j.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{j.service?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {j.address_locality} • {new Date(j.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#059669' }}>+₹{j.provider_payout_amount}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{j.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
