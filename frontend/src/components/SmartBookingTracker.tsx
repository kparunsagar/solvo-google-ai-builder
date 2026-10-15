import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  Navigation,
  Phone,
  Eye,
  KeyRound,
  Banknote,
  CreditCard,
  Download,
  XCircle,
  Sparkles,
  Gift,
  ExternalLink,
  Gauge,
  Bike,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Share2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  ShoppingBag,
  BadgePercent
} from 'lucide-react';
import { BookingRecord, getServiceName, api } from '@/lib/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseLive } from '@/lib/firebase';
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { resolveBookingBilling } from '@/lib/billing';
import { TechnicianVerificationCard } from '@/components/TechnicianVerificationCard';
import { ItemizedInvoiceModal } from '@/components/ItemizedInvoiceModal';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { PaymentModal } from '@/components/PaymentModal';

// ─── Application-Only Ads Engine with Photo Repository Support ─────────────────
import { AppAd, getActiveAppAds } from '@/data/app-ads';
export type RollingAd = AppAd;

const ROLLING_ADS: RollingAd[] = getActiveAppAds();

// ─── Status Pipeline Definitions ──────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'PENDING', label: 'Request Placed', icon: '⏳' },
  { key: 'ACCEPTED', label: 'Technician Assigned', icon: '✅' },
  { key: 'EN_ROUTE', label: 'On The Way', icon: '🚗' },
  { key: 'ARRIVED', label: 'At Doorstep', icon: '📍' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: '🔧' },
  { key: 'COMPLETED', label: 'Completed', icon: '🎉' }
];

interface SmartBookingTrackerProps {
  booking: BookingRecord;
  onBookingUpdated?: (updated: BookingRecord) => void;
  onPayRazorpay?: () => void;
  onCancelBooking?: () => void;
  onDownloadReceipt?: () => void;
  onBack?: () => void;
}

export const SmartBookingTracker: React.FC<SmartBookingTrackerProps> = ({
  booking: initialBooking,
  onBookingUpdated,
  onPayRazorpay,
  onCancelBooking,
  onDownloadReceipt,
  onBack
}) => {
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRecord>(initialBooking);

  // Sync when initial prop changes
  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking]);

  // Live synchronization across Firestore, Window Events, and Cross-tab BroadcastChannel
  useEffect(() => {
    if (!booking?.id) return;

    const handleUpdate = (incoming: any) => {
      setBooking((prev) => {
        const merged = { ...prev, ...incoming };
        if (merged.payment_status === 'PAID' || merged.status === 'COMPLETED') {
          setShowPaymentModal(false);
        }
        return merged;
      });
      onBookingUpdated?.(incoming);
    };

    const onMudBookingUpdated = (e: any) => {
      if (e?.detail?.id === booking.id || e?.detail?.bookingId === booking.id) {
        handleUpdate(e.detail);
      }
    };

    const onMudPaymentCompleted = (e: any) => {
      if (e?.detail?.bookingId === booking.id || e?.detail?.id === booking.id) {
        handleUpdate({ ...e.detail, payment_status: 'PAID', status: 'COMPLETED' });
      }
    };

    window.addEventListener('mud_booking_updated', onMudBookingUpdated);
    window.addEventListener('mud_payment_completed', onMudPaymentCompleted);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('urbandaily_sync_bus');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'mud_payment_completed' && msg.data?.payload?.bookingId === booking.id) {
            handleUpdate({ ...msg.data.payload, payment_status: 'PAID', status: 'COMPLETED' });
          } else if (msg.data?.type === 'mud_booking_updated' && msg.data?.payload?.id === booking.id) {
            handleUpdate(msg.data.payload);
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
            handleUpdate(data);
          }
        });
      } catch (err) {
        console.warn('[SmartBookingTracker] Firestore snapshot error:', err);
      }
    }

    return () => {
      window.removeEventListener('mud_booking_updated', onMudBookingUpdated);
      window.removeEventListener('mud_payment_completed', onMudPaymentCompleted);
      if (bc) bc.close();
      if (unsubscribe) unsubscribe();
    };
  }, [booking?.id, onBookingUpdated]);

  // Rolling Ads carousel state
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [isAdPaused, setIsAdPaused] = useState(false);
  const [selectedOfferModal, setSelectedOfferModal] = useState<RollingAd | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Map view toggle (PiP mini map vs Expanded full tracking map)
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Modals
  const [showTechModal, setShowTechModal] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [isRewardRevealed, setIsRewardRevealed] = useState(false);

  // Local payment loading
  const [localPayLoading, setLocalPayLoading] = useState(false);

  // Live GPS telemetry simulation state
  const customerLat = booking.address_lat || 14.1670;
  const customerLng = booking.address_lng || 75.0298;

  const [telemetry, setTelemetry] = useState({
    speedKmh: 32,
    remainingKm: 1.4,
    etaMins: 7,
    progressPct: 42,
    isSimulating: false
  });

  // Auto-rotate rolling ads every 4.5 seconds unless paused
  useEffect(() => {
    if (isAdPaused || selectedOfferModal) return;
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % ROLLING_ADS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isAdPaused, selectedOfferModal]);

  // Telemetry updates if status is EN_ROUTE
  const normStatus = (booking.status || 'PENDING').toUpperCase();
  const isEnRoute = normStatus === 'EN_ROUTE' || normStatus === 'ON_THE_WAY';
  const isArrived = normStatus === 'ARRIVED';
  const isInProgress = normStatus === 'IN_PROGRESS' || normStatus === 'SERVICE_IN_PROGRESS';
  const isCompleted = normStatus === 'COMPLETED' || normStatus === 'REVIEWED';
  const isCancelled = normStatus === 'CANCELLED';
  const isPending = normStatus === 'PENDING';
  const isPaid = booking.payment_status === 'PAID';

  // Dynamic ETA & headline text
  const etaMinutes = useMemo(() => {
    if (isArrived) return 0;
    if (isPending) return 15;
    if (normStatus === 'ACCEPTED') return 12;
    return telemetry.etaMins;
  }, [normStatus, isArrived, isPending, telemetry.etaMins]);

  // Billing breakdown
  const billing = resolveBookingBilling(booking);
  const finalPrice = billing.total;
  const activeOtp = booking.doorstep_otp || booking.otp;

  // Simulate smooth vehicle movement along the route
  const handleSimulateMovement = () => {
    setTelemetry((prev) => ({ ...prev, isSimulating: true }));
    let progress = telemetry.progressPct;
    const interval = setInterval(() => {
      progress += 6;
      if (progress >= 100) {
        clearInterval(interval);
        setTelemetry({
          speedKmh: 0,
          remainingKm: 0.1,
          etaMins: 1,
          progressPct: 100,
          isSimulating: false
        });
      } else {
        const remaining = Math.max(0.1, Number((2.4 * (1 - progress / 100)).toFixed(1)));
        const eta = Math.max(1, Math.round(9 * (1 - progress / 100)));
        setTelemetry({
          speedKmh: 31,
          remainingKm: remaining,
          etaMins: eta,
          progressPct: progress,
          isSimulating: true
        });
      }
    }, 600);
  };

  // Copy coupon code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleNextAd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveAdIndex((prev) => (prev + 1) % ROLLING_ADS.length);
  };

  const handlePrevAd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveAdIndex((prev) => (prev - 1 + ROLLING_ADS.length) % ROLLING_ADS.length);
  };

  const handlePayNow = async () => {
    if (onPayRazorpay) {
      onPayRazorpay();
      return;
    }
    setShowPaymentModal(true);
  };

  const currentAd = ROLLING_ADS[activeAdIndex];

  return (
    <div className="w-full max-w-5xl mx-auto my-2 select-none">
      {/* ──────────────────────────────────────────────────────────────────────────
          RESPONSIVE WRAPPER:
          - Mobile: Single-column stacked (100% faithful to the reference image)
          - Laptop / Desktop: Reflows into a master-detail dashboard with map on left,
            rolling ads engine on right.
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        
        {/* ======================================================================
            COLUMN A: MAP & ORDER COCKPIT (Mobile Top & Desktop Left 7-Cols)
        ====================================================================== */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* ─── Hero Rolling Ad Banner with Mini Map PiP (MOBILE ONLY) ────────── */}
          <div
            className="block lg:hidden relative rounded-3xl overflow-hidden shadow-xl text-white transition-all duration-500"
            onMouseEnter={() => setIsAdPaused(true)}
            onMouseLeave={() => setIsAdPaused(false)}
            onTouchStart={() => setIsAdPaused(true)}
            onTouchEnd={() => setIsAdPaused(false)}
            style={{
              background: currentAd.gradient
                ? `linear-gradient(135deg, ${currentAd.accentColor} 0%, #0f172a 100%)`
                : 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)'
            }}
          >
            {/* Auto-change Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 overflow-hidden z-30">
              <div
                key={`mob-progress-${currentAd.id}-${activeAdIndex}`}
                className={cn(
                  "h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 animate-bannerProgress",
                  (isAdPaused || selectedOfferModal) && "opacity-50"
                )}
                style={{
                  animationDuration: '5000ms'
                }}
              />
            </div>

            {/* Background Photographic Image with Rich Scrim */}
            {currentAd.image && (
              <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <img
                  key={currentAd.id}
                  src={currentAd.image}
                  alt={currentAd.headline}
                  className="w-full h-full object-cover object-center transform scale-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
              </div>
            )}

            {/* Top Navigation Bar: Back Button */}
            <div className="relative z-20 flex items-center justify-between p-4 pb-2">
              <button
                onClick={() => onBack ? onBack() : navigate(-1)}
                className="w-10 h-10 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-900" />
              </button>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] font-bold text-white/90">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Tracking Active</span>
              </div>
            </div>

            {/* Ad Content Hero Area */}
            <div className="px-5 pt-1 pb-4 relative z-10">
              {/* Brand Strip */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-black tracking-wider text-base lowercase">{currentAd.partnerName}</span>
                <span className="h-3 w-px bg-white/40" />
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider">
                  {currentAd.partnerLogoText}
                </span>
                <span className="text-[10px] text-white/80 font-semibold bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Official Guarantee
                </span>
              </div>

              {/* Huge Bold Headline */}
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight max-w-[75%] drop-shadow-sm">
                {currentAd.headline}
              </h2>

              {/* Primary Action Button */}
              <div className="mt-3">
                <button
                  onClick={() => setSelectedOfferModal(currentAd)}
                  className="bg-white text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-md hover:bg-slate-100 transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>{currentAd.ctaText}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subtitle / Details */}
              <div className="mt-5 max-w-[70%]">
                <p className="text-sm font-black text-white">{currentAd.subhead.split('•')[0]}</p>
                <p className="text-xs text-white/90 font-medium mt-0.5">
                  {currentAd.subhead.split('•')[1] || currentAd.highlightTag}
                </p>
              </div>

              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5 mt-5">
                {ROLLING_ADS.map((ad, idx) => (
                  <button
                    key={ad.id}
                    onClick={() => setActiveAdIndex(idx)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      idx === activeAdIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                    )}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Fine Print Note */}
              <p className="text-[9px] text-white/50 text-right mt-1">T&Cs apply</p>
            </div>

            {/* ─── Floating Mini Map PiP (Positioned at bottom-right of ad hero) ─── */}
            <div className="absolute right-3.5 bottom-7 z-20 w-[142px] sm:w-[160px] h-[105px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-2xl">
              {/* Stylized Road Network Graphic */}
              <div className="relative w-full h-full bg-[#f1f5f9]">
                {/* SVG Road Layout */}
                <svg className="w-full h-full" viewBox="0 0 160 105" fill="none">
                  {/* Road Paths */}
                  <path d="M-10 40 Q 60 20 80 50 T 170 30" stroke="#ffffff" strokeWidth="12" />
                  <path d="M40 -10 Q 50 50 120 70 T 180 110" stroke="#ffffff" strokeWidth="10" />
                  <path d="M-10 80 Q 70 85 100 60 T 170 85" stroke="#ffffff" strokeWidth="8" />

                  {/* Dashed Live GPS Route Line */}
                  <path
                    d="M 35 48 C 65 30, 95 80, 125 45"
                    stroke="#475569"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                  />

                  {/* Customer Destination Home Marker */}
                  <g transform="translate(24, 38)">
                    <circle cx="10" cy="10" r="10" fill="#1e293b" />
                    <path
                      d="M6 13 L6 9.5 L10 6.5 L14 9.5 L14 13 L11.5 13 L11.5 10.5 L8.5 10.5 L8.5 13 Z"
                      fill="#ffffff"
                    />
                  </g>

                  {/* Moving Technician Vehicle / Brand Pin */}
                  <g transform="translate(116, 32)">
                    <circle cx="10" cy="10" r="11" fill="#7c3aed" />
                    <text
                      x="10"
                      y="14"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      UD
                    </text>
                  </g>
                </svg>

                {/* "VIEW MAP" Floating Pill Button */}
                <div className="absolute inset-x-2 bottom-1.5 flex justify-center">
                  <button
                    onClick={() => setIsMapExpanded(true)}
                    className="w-full bg-white text-slate-900 font-extrabold text-[10px] py-1 px-2 rounded-full shadow-md hover:bg-slate-50 transition active:scale-95 flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>VIEW MAP</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── DESKTOP FULL LIVE GPS MAP DISPLAY (Shown prominently on Laptop) ─── */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Map Telemetry Header HUD */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">Live GPS Telemetry</span>
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                      GPS Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {booking.technician_name || 'Assigned Technician'} • {booking.address_locality || 'Sagara'}
                  </p>
                </div>
              </div>

              {/* Telemetry Gauges */}
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1 text-sky-400">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{telemetry.speedKmh} km/h</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ETA ~{etaMinutes} mins</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{telemetry.remainingKm} km</span>
                </div>
                <button
                  onClick={handleSimulateMovement}
                  disabled={telemetry.isSimulating}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={cn('w-3 h-3', telemetry.isSimulating && 'animate-spin')} />
                  <span>{telemetry.isSimulating ? 'Simulating...' : 'Simulate Ride'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Desktop Canvas Map */}
            <div className="relative w-full h-[320px] bg-[#0f172a] overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 700 320" fill="none">
                {/* Background Roads Grid */}
                <path d="M-20 80 Q 250 40 400 120 T 720 90" stroke="#1e293b" strokeWidth="26" />
                <path d="M120 -20 Q 220 180 500 220 T 740 340" stroke="#1e293b" strokeWidth="20" />
                <path d="M-20 240 Q 320 260 480 180 T 720 260" stroke="#1e293b" strokeWidth="22" />

                {/* Road centerlines */}
                <path d="M-20 80 Q 250 40 400 120 T 720 90" stroke="#334155" strokeWidth="1" strokeDasharray="6 6" />
                <path d="M120 -20 Q 220 180 500 220 T 740 340" stroke="#334155" strokeWidth="1" strokeDasharray="6 6" />

                {/* Animated Navigation Route */}
                <path
                  d="M 160 210 C 280 150, 420 260, 540 120"
                  stroke="#8b5cf6"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M 160 210 C 280 150, 420 260, 540 120"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                />

                {/* Customer Doorstep Marker */}
                <g transform="translate(130, 180)">
                  <circle cx="30" cy="30" r="28" fill="#3b82f6" fillOpacity="0.2" className="animate-ping" />
                  <circle cx="30" cy="30" r="20" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                  <text x="30" y="35" textAnchor="middle" fontSize="14">🏠</text>
                  <text x="30" y="60" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                    Customer Doorstep
                  </text>
                </g>

                {/* Moving Technician Vehicle Marker */}
                {(() => {
                  const pct = telemetry.progressPct / 100;
                  // Bezier interpolation
                  const x = 540 - pct * (540 - 160);
                  const y = 120 + Math.sin(pct * Math.PI) * 60 + pct * (210 - 120);
                  return (
                    <g transform={`translate(${x - 22}, ${y - 22})`}>
                      <circle cx="22" cy="22" r="24" fill="#a855f7" fillOpacity="0.3" className="animate-pulse" />
                      <circle cx="22" cy="22" r="16" fill="#7c3aed" stroke="#ffffff" strokeWidth="3" />
                      <text x="22" y="27" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900">
                        UD
                      </text>
                      <text x="22" y="-6" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="800">
                        {booking.technician_name ? booking.technician_name.split(' ')[0] : 'Pro'} (Live)
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Map Footer Links */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${telemetry.speedKmh ? customerLat + 0.01 : customerLat},${customerLng + 0.01}&destination=${customerLat},${customerLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/95 backdrop-blur-md text-slate-800 hover:text-purple-600 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition flex items-center gap-1.5 border border-slate-200"
                >
                  <Navigation className="w-3.5 h-3.5 text-purple-600" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* ─── Main Floating Status Card (Zepto / Quick Commerce Design) ────── */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-5 sm:p-6 relative overflow-hidden">
            {/* Top Row: ETA + Subtitle + "On Time" Badge */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isArrived
                    ? 'Technician At Doorstep'
                    : isPending
                    ? 'Dispatching'
                    : 'Arriving in'}
                </p>

                {/* Big Bold ETA Typography */}
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-0.5">
                  {isArrived ? (
                    <span className="text-emerald-600">At Doorstep</span>
                  ) : isPending ? (
                    <span className="text-amber-600">~15 mins</span>
                  ) : (
                    <>
                      <span className="text-purple-600 font-extrabold">{etaMinutes} mins</span>
                    </>
                  )}
                </h3>

                {/* Dynamic Status Subtitle */}
                <p className="text-sm font-extrabold text-slate-700 mt-1 leading-snug">
                  {isPending
                    ? 'Finding nearby verified expert'
                    : normStatus === 'ACCEPTED'
                    ? 'Technician assigned & preparing tools'
                    : isEnRoute
                    ? 'Technician is en route to your address'
                    : isArrived
                    ? 'Technician has arrived outside!'
                    : isInProgress
                    ? 'Work is currently in progress'
                    : isCompleted
                    ? 'Service successfully completed'
                    : 'Order Status'}
                </p>
              </div>

              {/* Top-Right Side Sponsor Perk & "On Time" Badge */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* ⚡ On time Badge */}
                <div className="bg-emerald-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>On time</span>
                </div>

                {/* Contextual Mystery Reward / "Tap to Play" Widget */}
                <button
                  onClick={() => {
                    setShowRewardModal(true);
                    setIsRewardRevealed(false);
                  }}
                  className="group relative bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white p-2 sm:px-3 sm:py-2 rounded-2xl shadow-md border border-purple-500/30 hover:border-purple-400 transition cursor-pointer flex items-center gap-2 active:scale-95"
                  title="Tap to reveal surprise discount reward"
                >
                  <div className="relative">
                    <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping" />
                    <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-xs">
                      <Gift className="w-4 h-4 text-amber-900 animate-bounce" />
                    </div>
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="block text-[9px] font-bold text-amber-300 uppercase tracking-wider">
                      Tap to Play
                    </span>
                    <span className="block text-xs font-black text-white">Surprise Gift</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Service & Delivery Address Summary Strip */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Shopping/Service Bag Icon */}
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {getServiceName(booking.service_id)}
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ₹192 saved
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Delivering to: {booking.address_locality || booking.address_text || 'Doorstep Address'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Service Price */}
              <div className="text-right shrink-0">
                <span className="text-base font-black text-slate-900">{formatCurrency(finalPrice)}</span>
              </div>
            </div>

            {/* Full-Width Payment Status Pill (Green Pill as in Screenshot) */}
            <div className="mt-4">
              {isPaid ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-950">Payment done</p>
                      <p className="text-[11px] text-emerald-700">You have successfully paid for this order</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInvoiceModalOpen(true)}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Receipt</span>
                  </button>
                </div>
              ) : isCancelled ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-red-950">Order Cancelled</p>
                    <p className="text-[11px] text-red-700">This booking was cancelled. No charges apply.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-950">Payment Due: {formatCurrency(finalPrice)}</p>
                      <p className="text-[11px] text-amber-700">
                        {booking.payment_method === 'COD' ? 'Cash on Doorstep Completion' : 'Online Payment Pending'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handlePayNow}
                    disabled={localPayLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{localPayLoading ? 'Opening...' : 'Pay Online'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Doorstep Verification OTP PIN (When Technician En Route or Arrived) */}
            {activeOtp && !isCompleted && !isCancelled && (
              <div className="mt-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                      Doorstep Security PIN
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/20">
                    Verify Arrival
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-amber-300 font-mono">
                    {activeOtp}
                  </div>
                  <p className="text-[11px] text-purple-200 max-w-[200px] text-right leading-tight">
                    Share with technician only when they are physically at your door.
                  </p>
                </div>
              </div>
            )}

            {/* Assigned Technician Profile Bar */}
            {booking.technician_name && !isPending && !isCancelled && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      booking.technician_avatar_url ||
                      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={booking.technician_name}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-400 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{booking.technician_name}</p>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> KYC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Verified Service Partner • ⭐ 4.8</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTechModal(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View ID</span>
                  </button>

                  {(booking.technician_phone || (booking as any).technician_masked_phone) && (
                    <a
                      href={`tel:${(booking.technician_phone || (booking as any).technician_masked_phone || '').replace(/[^0-9+]/g, '')}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar (Cancel Option) */}
            {!isCompleted && !isCancelled && !isInProgress && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Need to make changes?</span>
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="font-bold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================
            COLUMN B: ROLLING ADS ENGINE & REVENUE GROWTH (Desktop Right 5-Cols)
        ====================================================================== */}
        <div className="hidden lg:flex lg:col-span-5 flex-col space-y-4">
          
          {/* ─── Premium Desktop Rotating Ad Billboard ────────────────────────── */}
          <div
            className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 text-white transition-all duration-500 relative group"
            onMouseEnter={() => setIsAdPaused(true)}
            onMouseLeave={() => setIsAdPaused(false)}
            style={{
              background: currentAd.gradient
                ? `linear-gradient(135deg, ${currentAd.accentColor} 0%, #0f172a 100%)`
                : 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)'
            }}
          >
            {/* Auto-Rotation Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 overflow-hidden z-20">
              <div
                key={`progress-${currentAd.id}-${activeAdIndex}`}
                className={cn(
                  "h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 animate-bannerProgress",
                  (isAdPaused || selectedOfferModal) && "opacity-50"
                )}
                style={{
                  animationDuration: '5000ms'
                }}
              />
            </div>

            {/* Background Photographic Image with Rich Scrim Overlay */}
            {currentAd.image && (
              <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <img
                  key={currentAd.id}
                  src={currentAd.image}
                  alt={currentAd.headline}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-700 ease-out"
                />
                {/* High contrast gradient scrims so photography is stunning and text is 100% crisp */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-900/30" />
              </div>
            )}

            <div className="p-6 relative z-10 flex flex-col justify-between min-h-[380px]">
              {/* Partner Brand Strip & Guarantee Badge */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                      UD
                    </div>
                    <span className="font-black text-base lowercase tracking-wider text-white drop-shadow-md">
                      {currentAd.partnerName}
                    </span>
                    <span className="h-4 w-px bg-white/40" />
                    <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider backdrop-blur-xs">
                      {currentAd.partnerLogoText}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-300 animate-pulse" />
                    <span>Official Platform Guarantee</span>
                  </span>
                </div>

                {/* Tag / Badge */}
                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    {currentAd.badge}
                  </span>
                </div>

                {/* Billboard Headline */}
                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">
                  {currentAd.headline}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1.5 drop-shadow-xs line-clamp-2">
                  {currentAd.subhead}
                </p>

                {/* Partner Key Benefits List */}
                <div className="mt-3.5 space-y-1.5 bg-black/45 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-inner">
                  {currentAd.perks.slice(0, 3).map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/95">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="drop-shadow-xs">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button & Slide Controller */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedOfferModal(currentAd)}
                    className="bg-white hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-2.5 rounded-full shadow-xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1.5 group/btn"
                  >
                    <span>{currentAd.ctaText}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Desktop Dots + Prev/Next Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevAd}
                      className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xs"
                      aria-label="Previous ad"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {ROLLING_ADS.map((ad, idx) => (
                        <button
                          key={ad.id}
                          onClick={() => setActiveAdIndex(idx)}
                          className={cn(
                            'h-2 rounded-full transition-all duration-300 cursor-pointer',
                            idx === activeAdIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                          )}
                          aria-label={`Go to ad ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleNextAd}
                      className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xs"
                      aria-label="Next ad"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5 text-[10px] text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Auto-rotating offers
                  </span>
                  <span>{currentAd.finePrint}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Interactive Reward Box ("Tap to Play") ────────────────────────── */}
          <div
            onClick={() => {
              setShowRewardModal(true);
              setIsRewardRevealed(false);
            }}
            className="group bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-purple-500/30 shadow-md hover:border-purple-400 transition cursor-pointer relative overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <span className="absolute -inset-1 rounded-2xl bg-amber-400/30 animate-ping" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-lg">
                    <Gift className="w-6 h-6 text-amber-900 animate-bounce" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                    Play & Win
                  </span>
                  <h4 className="text-base font-black text-white">Tap to Play Mystery Box</h4>
                  <p className="text-xs text-purple-200 mt-0.5">Win up to ₹300 OFF your next home repair</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* ─── Safety & Verified Guarantee Card ──────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Urban Daily Safety Protocol
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every professional is Aadhaar KYC verified, police background checked, and arrives in standard safety gear. Your call is bridged via masked telephony for zero number leakage.
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          EXPANDABLE LIVE GPS TRACKING MODAL (FOR MOBILE WHEN TAPPING "VIEW MAP")
      ────────────────────────────────────────────────────────────────────────── */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-800 w-full max-w-2xl mx-auto overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-sm">Full Live GPS Route</h4>
                  <p className="text-[11px] text-slate-400">ETA ~{etaMinutes} mins • {telemetry.remainingKm} km remaining</p>
                </div>
              </div>
              <button
                onClick={() => setIsMapExpanded(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive GPS SVG Canvas */}
            <div className="relative w-full h-[340px] bg-[#0b1120]">
              <svg className="w-full h-full" viewBox="0 0 600 340" fill="none">
                {/* Simulated Road Paths */}
                <path d="M-10 60 Q 200 40 340 100 T 610 80" stroke="#1e293b" strokeWidth="24" />
                <path d="M100 -10 Q 180 180 420 220 T 610 320" stroke="#1e293b" strokeWidth="18" />
                <path d="M-10 240 Q 280 250 420 180 T 610 240" stroke="#1e293b" strokeWidth="20" />

                {/* Animated Navigation Route */}
                <path
                  d="M 140 220 C 240 160, 360 250, 460 110"
                  stroke="#8b5cf6"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 140 220 C 240 160, 360 250, 460 110"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />

                {/* Customer Pin */}
                <g transform="translate(112, 192)">
                  <circle cx="28" cy="28" r="24" fill="#3b82f6" fillOpacity="0.25" className="animate-ping" />
                  <circle cx="28" cy="28" r="18" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                  <text x="28" y="33" textAnchor="middle" fontSize="13">🏠</text>
                  <text x="28" y="56" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700">
                    Your Doorstep
                  </text>
                </g>

                {/* Moving Technician Vehicle Marker */}
                {(() => {
                  const pct = telemetry.progressPct / 100;
                  const x = 460 - pct * (460 - 140);
                  const y = 110 + Math.sin(pct * Math.PI) * 60 + pct * (220 - 110);
                  return (
                    <g transform={`translate(${x - 20}, ${y - 20})`}>
                      <circle cx="20" cy="20" r="22" fill="#a855f7" fillOpacity="0.3" className="animate-pulse" />
                      <circle cx="20" cy="20" r="15" fill="#7c3aed" stroke="#ffffff" strokeWidth="3" />
                      <text x="20" y="24" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
                        UD
                      </text>
                      <text x="20" y="-6" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="800">
                        {booking.technician_name || 'Technician'}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Modal Bottom Controls */}
            <div className="p-4 bg-slate-950 flex items-center justify-between gap-3">
              <button
                onClick={handleSimulateMovement}
                disabled={telemetry.isSimulating}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', telemetry.isSimulating && 'animate-spin')} />
                <span>{telemetry.isSimulating ? 'Simulating...' : 'Simulate Ride'}</span>
              </button>

              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${customerLat + 0.01},${customerLng + 0.01}&destination=${customerLat},${customerLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-purple-400" />
                <span>Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          PARTNER OFFER DETAILS MODAL (TRIGGERED WHEN CLICKING ROLLING ADS)
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header Banner with High-Res Photographic Image */}
            <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-950">
              {selectedOfferModal.image ? (
                <img
                  src={selectedOfferModal.image}
                  alt={selectedOfferModal.headline}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(135deg, ${selectedOfferModal.accentColor || '#1d4ed8'} 0%, #0f172a 100%)`
                  }}
                />
              )}
              {/* Dark Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedOfferModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xs z-10"
                aria-label="Close offer details"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Text overlay on image */}
              <div className="absolute bottom-4 left-5 right-5 z-10 text-white">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full inline-block mb-1.5 shadow-sm">
                  {selectedOfferModal.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black drop-shadow-md leading-tight text-white">
                  {selectedOfferModal.headline}
                </h3>
                <p className="text-xs text-slate-200 drop-shadow-xs mt-0.5 line-clamp-1">
                  {selectedOfferModal.subhead}
                </p>
              </div>
            </div>

            {/* Offer Body */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  SOLVO Guarantee & Perks
                </h4>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {selectedOfferModal.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon Code Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Exclusive Promo Voucher
                  </span>
                  <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                    {selectedOfferModal.offerCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(selectedOfferModal.offerCode)}
                  className="bg-white border border-blue-200 hover:border-blue-400 text-blue-900 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-50 transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    navigate('/services');
                    setSelectedOfferModal(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Book Service Now</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    alert(`Voucher ${selectedOfferModal.offerCode} applied to booking #${booking.id.slice(-6)}!`);
                    setSelectedOfferModal(null);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-2xl transition cursor-pointer"
                >
                  Apply Voucher
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">{selectedOfferModal.finePrint}</p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAP TO PLAY MYSTERY REWARD MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl max-w-sm w-full p-6 text-center border border-purple-500/30 shadow-2xl relative">
            <button
              onClick={() => setShowRewardModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!isRewardRevealed ? (
              <div className="py-4">
                <div className="relative inline-block my-3">
                  <span className="absolute -inset-3 rounded-full bg-amber-400/20 animate-ping" />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center mx-auto shadow-2xl">
                    <Gift className="w-10 h-10 text-amber-900 animate-bounce" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-white mt-2">Mystery Reward Waiting!</h3>
                <p className="text-xs text-purple-200 mt-1 max-w-[240px] mx-auto">
                  Tap below to open your lucky gift box for today's service booking.
                </p>
                <button
                  onClick={() => setIsRewardRevealed(true)}
                  className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-sm py-3 rounded-2xl shadow-xl hover:from-amber-300 hover:to-yellow-200 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-900" />
                  <span>TAP TO UNBOX REWARD</span>
                </button>
              </div>
            ) : (
              <div className="py-2 animate-in zoom-in-90 duration-300">
                <span className="text-4xl block my-2">🎉</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30 inline-block">
                  Congratulations!
                </span>
                <h3 className="text-2xl font-black text-white mt-2">₹150 Flat Discount</h3>
                <p className="text-xs text-purple-200 mt-1">
                  Unlocked on your next home repair or appliance service booking!
                </p>

                <div className="my-5 bg-black/40 border border-purple-500/40 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-purple-300 uppercase block">Coupon Code</span>
                    <span className="font-mono font-black text-base text-amber-300 tracking-wider">
                      MUDREWARD150
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode('MUDREWARD150')}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowRewardModal(false)}
                  className="w-full bg-white text-slate-950 font-black text-xs py-3 rounded-2xl shadow-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Done & Continue Tracking
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TECHNICIAN VERIFICATION ID CARD MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showTechModal && (
        <TechnicianVerificationCard
          tech={{
            technician_id: booking.technician_id || '',
            technician_name: booking.technician_name || '',
            tech_uid: (booking as any).tech_uid || `UD-PRO-${Math.abs(parseInt(booking.id.slice(-5), 16)) % 90000 + 10000}`,
            photo_url:
              booking.technician_avatar_url ||
              (booking as any).tech_photo_url ||
              'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
            masked_phone: booking.technician_phone || (booking as any).technician_masked_phone,
            rating: 4.8,
            reviews_count: 127,
            aadhaar_verified: (booking as any).tech_aadhaar_verified !== false,
            background_checked: (booking as any).tech_background_checked !== false,
            skill_certified: (booking as any).tech_skill_certified !== false,
            device_bound: true,
            arrival_selfie_url: (booking as any).arrival_selfie_url,
            worklocation_photo_url: (booking as any).worklocation_photo_url,
            arrival_selfie_locality: (booking as any).arrival_selfie_locality,
            arrival_selfie_timestamp: (booking as any).arrival_selfie_timestamp,
            arrival_selfie_coords: (booking as any).arrival_selfie_coords,
            ai_face_match_score: (booking as any).ai_face_match_score,
            ai_face_match_status: (booking as any).ai_face_match_status,
            ai_face_match_summary: (booking as any).ai_face_match_summary
          }}
          safetyMode={(booking as any).safety_mode}
          onClose={() => setShowTechModal(false)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          INVOICE & RECEIPT DOWNLOAD MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {invoiceModalOpen && (
        <ItemizedInvoiceModal
          booking={booking}
          customerUser={null}
          onClose={() => setInvoiceModalOpen(false)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          CANCEL BOOKING MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {cancelModalOpen && (
        <CancelBookingModal
          isOpen={cancelModalOpen}
          bookingId={booking.id}
          bookingCode={booking.id}
          serviceTitle={getServiceName(booking.service_id)}
          onClose={() => setCancelModalOpen(false)}
          onSuccess={() => {
            setCancelModalOpen(false);
            setBooking((prev) => ({ ...prev, status: 'CANCELLED' }));
            if (onCancelBooking) onCancelBooking();
          }}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          PAYMENT MODAL (RAZORPAY + DOORSTEP UPI QR + CASH)
      ────────────────────────────────────────────────────────────────────────── */}
      {showPaymentModal && (
        <PaymentModal
          booking={booking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updatedBooking) => {
            const nextBooking = updatedBooking || { ...booking, payment_status: 'PAID' };
            setBooking(nextBooking);
            onBookingUpdated?.(nextBooking);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
};
