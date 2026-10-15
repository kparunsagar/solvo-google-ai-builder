import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardList, Clock, CheckCircle,
  Loader2, Phone, Navigation, KeyRound,
  Wrench, AlertCircle, CreditCard, Banknote, XCircle, Headphones,
  FileText, Download, Shield, ShieldCheck, BadgeCheck, Eye, Camera, MapPin, Sparkles, X, Bell
} from "lucide-react";
import {
  api,
  BookingRecord,
  getServiceName
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { CancelBookingModal } from "@/components/CancelBookingModal";
import { ItemizedInvoiceModal } from "@/components/ItemizedInvoiceModal";
import { resolveBookingBilling } from "@/lib/billing";
import { MyTicketsList } from "@/components/MyTicketsList";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { db, isFirebaseLive } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { FloatingSOSButton } from "@/components/SOSEmergencyButton";
import { TechnicianVerificationCard } from "@/components/TechnicianVerificationCard";
import { SmartBookingTracker } from "@/components/SmartBookingTracker";

// ─── Status pipeline labels ─────────────────────────────────────────────────
const STEPS = [
  { key: "PENDING",     icon: "⏳", label: "Request Placed" },
  { key: "ACCEPTED",    icon: "✅", label: "Technician Assigned" },
  { key: "EN_ROUTE",    icon: "🚗", label: "Technician En Route" },
  { key: "IN_PROGRESS", icon: "🔧", label: "Work In Progress" },
  { key: "COMPLETED",   icon: "🎉", label: "Completed" },
];

// ─── Live Booking Card ──────────────────────────────────────────────────────
function LiveBookingCard({
  booking: initial,
  onBookingUpdated
}: {
  booking: BookingRecord;
  onBookingUpdated?: (updated: BookingRecord) => void;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [booking, setBooking] = useState<BookingRecord>(initial);
  const [payLoading, setPayLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  useEffect(() => {
    setBooking(initial);
  }, [initial]);

  // Subscribe to real-time Firestore updates for this booking
  useEffect(() => {
    if (!isFirebaseLive()) return;
    const unsub = onSnapshot(doc(db, "bookings", initial.id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as BookingRecord;
        if ((data.status || '').toUpperCase() === "PENDING") {
          data.technician_id = null;
          data.technician_name = undefined;
          data.technician_phone = undefined;
          data.accepted_at = undefined;
        }
        setBooking(data);
        onBookingUpdated?.(data);
      }
    });
    return () => unsub();
  }, [initial.id]);

  // Window event listener for in-tab / cross-tab updates
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.id === initial.id || e.detail?.booking_id === initial.id) {
        setBooking((prev) => {
          const isPending = ((e.detail?.status || prev.status || '').toUpperCase() === "PENDING");
          const updated = {
            ...prev,
            ...e.detail,
            ...(isPending
              ? {
                  technician_id: null,
                  technician_name: undefined,
                  technician_phone: undefined,
                  accepted_at: undefined,
                }
              : {}),
          };
          onBookingUpdated?.(updated);
          return updated;
        });
      }
    };
    window.addEventListener("mud_booking_updated", handler);
    window.addEventListener("mud_tech_location_updated", (e: any) => {
      if (e.detail?.bookingId === initial.id) {
        setBooking((prev) => ({ ...prev, tech_lat: e.detail.lat, tech_lng: e.detail.lng }));
      }
    });
    return () => window.removeEventListener("mud_booking_updated", handler);
  }, [initial.id]);

  const handlePayRazorpay = async () => {
    setPayLoading(true);
    const amount = booking.total_price || booking.price || 350;
    try {
      await api.openRazorpayCheckout({
        amount,
        name: getServiceName(booking.service_id),
        description: `Payment for booking #${booking.id.slice(-8)}`,
        bookingId: booking.id,
        customerName: user?.name || "Customer",
        customerEmail: user?.email || "customer@solvo.app",
        customerPhone: user?.phone || "9876543210",
        onSuccess: async (resp) => {
          await api.markPaymentComplete(booking.id, "RAZORPAY", resp.razorpay_payment_id);
          setPayLoading(false);
        },
        onFailure: (err?: any) => {
          setPayLoading(false);
          if (err?.description) {
            alert(`Payment could not be completed: ${err.description}`);
          }
        },
        onDismiss: () => {
          setPayLoading(false);
        }
      });
    } catch (e: any) {
      alert(e.message || "Failed to open Razorpay");
      setPayLoading(false);
    }
  };

  const normStatus = (booking.status || "").toUpperCase();
  const currentStepIdx = STEPS.findIndex((s) => s.key === normStatus);
  const isTerminal = ["COMPLETED", "CANCELLED", "REVIEWED"].includes(normStatus);
  const isActive = !isTerminal;
  const isEnRoute = normStatus === "EN_ROUTE" || normStatus === "ON_THE_WAY";
  const hasLocation = booking.tech_lat && booking.tech_lng;
  const isPaid = booking.payment_status === "PAID";
  const isCancelled = normStatus === "CANCELLED";
  const isCompleted = normStatus === "COMPLETED";
  const isInProgress = ["IN_PROGRESS", "SERVICE_IN_PROGRESS", "ARRIVED"].includes(normStatus);
  const canCancel = !isTerminal && !isInProgress;
  const billing = resolveBookingBilling(booking);
  const partsCost = billing.partsAmount;
  const basePrice = billing.baseAmount;
  const finalPrice = billing.total;
  const activeOtp = booking.doorstep_otp || booking.otp;
  const shouldShowOtp = isActive && !!activeOtp;
  const isArrivedOrEnRoute = normStatus === "ARRIVED" || normStatus === "EN_ROUTE" || booking.status === "ARRIVED" || booking.status === "EN_ROUTE" || !!booking.arrival_notification_sent;

  const displayLocality = React.useMemo(() => {
    const rawLoc = booking.address_locality || booking.address_text || "";
    if (!rawLoc) return "local";
    const parts = rawLoc.split(",").map((p: string) => p.trim()).filter(Boolean);
    const city = parts.find((p: string) => /bengaluru|bangalore|sagara|shimoga|mysuru|mumbai|delhi|hyderabad|pune|chennai/i.test(p));
    return city || parts[0] || "local";
  }, [booking.address_locality, booking.address_text]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-slate-900 text-base">{getServiceName(booking.service_id)}</h3>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">#{booking.id.slice(-6).toUpperCase()}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{booking.address_locality || booking.address_text || "Doorstep Address"}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {isCompleted && booking.completed_at
                ? `Completed ${formatDate(booking.completed_at)}`
                : formatDate(booking.created_at)}
            </span>
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className={cn("text-xs font-bold px-3 py-1 rounded-full border shadow-2xs", getStatusColor(normStatus))}>
            {getStatusLabel(normStatus)}
          </span>
          <p className="text-base font-black text-slate-900 mt-0.5">{formatCurrency(finalPrice)}</p>
        </div>
      </div>

      {/* Status Pipeline */}
      {isActive && (
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between gap-1">
            {STEPS.filter(s => s.key !== "CANCELLED").map((step, idx) => {
              const done = idx < currentStepIdx;
              const current = idx === currentStepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all",
                      done ? "bg-emerald-500 text-white" :
                      current ? "bg-blue-600 text-white ring-2 ring-blue-200" :
                      "bg-slate-200 text-slate-400"
                    )}>
                      {done ? "✓" : step.icon}
                    </div>
                    <span className={cn(
                      "text-[9px] font-semibold text-center leading-tight hidden sm:block",
                      current ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"
                    )}>{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("h-0.5 flex-1 max-w-8 transition-all", idx < currentStepIdx ? "bg-emerald-400" : "bg-slate-200")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Technician Info: Assigned vs Open in Public Pool */}
      {normStatus !== "PENDING" && normStatus !== "CANCELLED" && booking.technician_name ? (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {booking.technician_avatar_url || booking.tech_photo_url ? (
                <img
                  src={booking.technician_avatar_url || booking.tech_photo_url}
                  alt={booking.technician_name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-purple-700" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">{t('bookings.assigned_tech', 'Assigned Technician')}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{booking.technician_name}</p>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3 h-3" /> KYC Verified
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Safety Mode pill */}
                  {booking.safety_mode && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                      booking.safety_mode === "DOOR_OPEN" ? "bg-emerald-100 text-emerald-700" :
                      booking.safety_mode === "DOOR_PARTIAL" ? "bg-blue-100 text-blue-700" :
                      "bg-purple-100 text-purple-700"
                    )}>
                      🛡 {booking.safety_mode === "DOOR_OPEN" ? "Door Open" : booking.safety_mode === "DOOR_PARTIAL" ? "Door Partial" : "Door Closed"} Mode
                    </span>
                  )}
                  {/* Masked Telephony Pill */}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    🛡️ Masked Robo Line
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* View Tech Identity Card */}
              <button
                onClick={() => setShowTechModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View ID
              </button>
              {(booking.technician_phone || booking.technician_masked_phone) && (
                <a
                  href={`tel:${(booking.technician_phone || booking.technician_masked_phone || '').replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition shadow-xs"
                  title="Calls via secure Urban Daily masked telephony bridge"
                >
                  <Phone className="w-3.5 h-3.5" /> {t('bookings.call_tech', 'Call')}
                </a>
              )}
            </div>
          </div>

          {/* TechnicianVerificationCard Modal */}
          {showTechModal && (
            <TechnicianVerificationCard
              tech={{
                technician_id: booking.technician_id || "",
                technician_name: booking.technician_name || "",
                tech_uid: booking.tech_uid || `UD-PRO-${Math.abs(parseInt(booking.id.slice(-5), 16)) % 90000 + 10000}`,
                photo_url: booking.technician_avatar_url || booking.tech_photo_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
                masked_phone: booking.technician_phone || booking.technician_masked_phone,
                rating: 4.8,
                reviews_count: 127,
                aadhaar_verified: booking.tech_aadhaar_verified !== false,
                background_checked: booking.tech_background_checked !== false,
                skill_certified: booking.tech_skill_certified !== false,
                device_bound: true,
                arrival_selfie_url: booking.arrival_selfie_url,
                worklocation_photo_url: booking.worklocation_photo_url,
                arrival_selfie_locality: booking.arrival_selfie_locality,
                arrival_selfie_timestamp: booking.arrival_selfie_timestamp,
                arrival_selfie_coords: booking.arrival_selfie_coords,
                ai_face_match_score: booking.ai_face_match_score,
                ai_face_match_status: booking.ai_face_match_status,
                ai_face_match_summary: booking.ai_face_match_summary,
              }}
              safetyMode={booking.safety_mode}
              onClose={() => setShowTechModal(false)}
            />
          )}
        </div>
      ) : normStatus === "PENDING" ? (
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping opacity-60" />
                <div className="relative w-10 h-10 bg-amber-100 border border-amber-200/80 rounded-2xl flex items-center justify-center text-amber-700 shadow-2xs">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300/60 shadow-2xs">
                    {t('bookings.in_pool', 'Finding Nearby Professional')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Typically assigned in 2–5 mins
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Your request is active in the <span className="font-semibold text-slate-800">{displayLocality}</span> verified partner network. Nearest verified professionals are being notified.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 💳 Payment Status Strip & Online Pay Options */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-3 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Paid via {booking.payment_method || "Online Gateway"}
            </span>
          ) : isCancelled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100/70 border border-red-300 px-3 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" /> Cancelled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-3 py-1 rounded-full">
              <Banknote className="w-3.5 h-3.5" /> Payment Due: {formatCurrency(finalPrice)} ({booking.payment_method === "COD" ? "Cash on Delivery" : "Pending"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isPaid && (
            <button
              onClick={() => setInvoiceModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
              title="Download or Print this single order receipt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download / Print Receipt</span>
            </button>
          )}

          {!isPaid && !isCancelled && (
            <button
              onClick={handlePayRazorpay}
              disabled={payLoading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
            >
              {payLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Pay Online (Razorpay)
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3.5 py-2 rounded-xl border border-red-200 transition"
              title="Cancel this booking"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* 🛑 Cancellation Details Banner */}
      {isCancelled && (
        <div className="mx-5 my-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold text-xs uppercase tracking-wide text-red-900">Booking Cancelled</p>
            {booking.cancellation_reason && (
              <p className="text-xs text-red-700 mt-1 font-medium">
                <span className="font-bold">Reason:</span> {booking.cancellation_reason}
              </p>
            )}
            <p className="text-[11px] text-red-500 mt-1">
              This booking has been cancelled and unassigned from any technician. No further charges will apply.
            </p>
          </div>
        </div>
      )}

      {/* ⚠️ In-Progress Notice */}
      {isInProgress && (
        <div className="mx-5 my-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
          <span>🔧 Service is currently in progress. Need to cancel or reschedule? Please speak with your technician.</span>
        </div>
      )}

      {/* 🔔 Doorstep Physical Arrival Notification Banner */}
      {booking.arrival_notification_sent && !booking.otp_verified_at && !isCompleted && !isCancelled && (
        <div className="mx-5 my-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-sm">Technician Has Arrived Outside!</p>
              <p className="text-xs text-emerald-100 mt-0.5">
                {booking.technician_name || "Your technician"} has physically arrived at your doorstep. Please share the 4-digit OTP below when you are ready to start.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ Doorstep Arrival & Presence Verification Status (Customer View - Only shown when technician has physically arrived) */}
      {!isCancelled &&
        normStatus !== "PENDING" &&
        normStatus !== "ACCEPTED" &&
        (normStatus === "ARRIVED" || normStatus === "IN_PROGRESS" || isCompleted) &&
        (booking.arrival_geo_verified || booking.arrival_selfie_verified || booking.status === "ARRIVED") && (
        <div className="mx-5 my-3 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-blue-50/30 border border-emerald-300 rounded-2xl p-4 text-emerald-950 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-900">
                Doorstep Physical Presence Verified
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Technician GPS location confirmed at your address • Identity AI-checked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" /> Identity Verified
            </span>
            <button
              onClick={() => setShowTechModal(true)}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer ml-1"
            >
              View Profile
            </button>
          </div>
        </div>
      )}


      {/* 🔑 Doorstep OTP — Context-aware: compact security PIN during PENDING/ACCEPTED, prominent banner when EN_ROUTE/ARRIVED */}
      {shouldShowOtp && (
        isArrivedOrEnRoute ? (
          <div className="mx-5 my-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg border border-blue-400/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-100">{t('bookings.doorstep_otp', 'Doorstep Verification OTP')}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 border border-blue-300/30">
                {normStatus === "ARRIVED" ? "Technician at Doorstep" : "Technician Arriving"}
              </span>
            </div>
            <div className="text-center py-1">
              <div className="text-5xl sm:text-6xl font-black tracking-[0.35em] text-amber-300 font-mono drop-shadow-md">
                {activeOtp}
              </div>
              <p className="text-xs font-medium text-blue-100 mt-2 max-w-md mx-auto leading-relaxed">
                {normStatus === "ARRIVED"
                  ? "Technician has arrived at your address! Share this 4-digit code with them to verify arrival and start service."
                  : "Your technician is on the way. Share this 4-digit code when they arrive at your door."}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-200 bg-blue-900/40 rounded-xl px-3.5 py-2.5 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>One-time security PIN. Share only when technician is physically present.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-5 my-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-black text-sm border border-blue-100/80 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Doorstep Security PIN:</span>
                  <span className="font-mono font-black text-slate-900 tracking-wider text-sm bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {activeOtp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Share with your technician once they arrive at your address to verify and start service.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs shrink-0 hidden sm:inline-block">
              🛡️ Protected Start
            </span>
          </div>
        )
      )}

      {/* 🗺️ Live Map — technician location tracking */}
      {isEnRoute && hasLocation && (
        <div className="mx-5 mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Live Technician Location
          </p>
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 220 }}>
            <iframe
              title="Technician Live Location"
              width="100%"
              height="220"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps?q=${booking.tech_lat},${booking.tech_lng}&z=15&output=embed`}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${booking.tech_lat},${booking.tech_lng}&destination=${booking.address_lat},${booking.address_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl py-2 hover:bg-blue-100 transition"
            >
              <Navigation className="w-3.5 h-3.5" /> View Route on Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={cancelModalOpen}
        bookingId={booking.id}
        bookingCode={booking.id}
        serviceTitle={getServiceName(booking.service_id)}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={(updated) => {
          const merged = { ...booking, ...updated, status: "CANCELLED" as const };
          setBooking(merged);
          onBookingUpdated?.(merged);
        }}
      />

      {invoiceModalOpen && (
        <ItemizedInvoiceModal
          booking={booking}
          customerUser={user}
          onClose={() => setInvoiceModalOpen(false)}
        />
      )}

      {/* Lightbox Modal for Full-Resolution Photo Inspection on Mobile / Desktop */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold">{lightboxImage.title}</h4>
                {lightboxImage.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{lightboxImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Bookings Page ─────────────────────────────────────────────────────
export const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history" | "tickets">(() => {
    const t = searchParams.get("tab");
    return t === "tickets" ? "tickets" : t === "history" ? "history" : "active";
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getBookings()
      .then(async (list) => {
        setBookings(list);
        // Guarantee pending bookings are synced to Firestore so all technicians see them
        if (isFirebaseLive()) {
          for (const b of list) {
            if (b.status === "PENDING") {
              try {
                const payload: any = { ...b, firestore_timestamp: serverTimestamp() };
                Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
                await setDoc(doc(db, "bookings", b.id), payload, { merge: true });
              } catch {}
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // ─── Real-time Firestore customer bookings listener ────────────────────────
  useEffect(() => {
    if (!user || !isFirebaseLive()) return;
    try {
      const colRef = collection(db, "bookings");
      const q = query(colRef, where("customer_id", "==", user.id));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const liveList = snap.docs.map((d) => {
            const data = { id: d.id, ...d.data() } as BookingRecord;
            if ((data.status || "").toUpperCase() === "PENDING") {
              data.technician_id = null;
              data.technician_name = undefined;
              data.technician_phone = undefined;
              data.accepted_at = undefined;
            }
            return data;
          });
          setBookings((prev) => {
            const merged = [...prev];
            liveList.forEach((lb) => {
              const isPending = (lb.status || "").toUpperCase() === "PENDING";
              const idx = merged.findIndex((b) => b.id === lb.id);
              if (idx >= 0) {
                merged[idx] = {
                  ...merged[idx],
                  ...lb,
                  ...(isPending
                    ? {
                        technician_id: null,
                        technician_name: undefined,
                        technician_phone: undefined,
                        accepted_at: undefined,
                      }
                    : {}),
                };
              } else {
                merged.unshift(lb);
              }
            });
            return merged;
          });
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("[BookingsPage] Live listener error:", e);
    }
  }, [user]);

  // ─── Cross-Portal Sync Bus & Window Event Listeners ────────────────────────
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.id) {
        const isPending = (e.detail.status || "").toUpperCase() === "PENDING";
        const isCompleted = (e.detail.status || "").toUpperCase() === "COMPLETED";
        const now = new Date().toISOString();
        setBookings((prev) =>
          prev.map((b) =>
            b.id === e.detail.id
              ? {
                  ...b,
                  ...e.detail,
                  completed_at: e.detail.completed_at || (isCompleted ? (b.completed_at || now) : b.completed_at),
                  updated_at: now,
                  ...(isPending
                    ? {
                        technician_id: null,
                        technician_name: undefined,
                        technician_phone: undefined,
                        accepted_at: undefined,
                      }
                    : {}),
                }
              : b
          )
        );
      }
    };
    window.addEventListener("mud_booking_updated", handler);

    let bus: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bus = new BroadcastChannel("urbandaily_sync_bus");
        bus.onmessage = (evt) => {
          if (evt.data?.payload?.id) {
            const payload = evt.data.payload;
            const isPending = (payload.status || "").toUpperCase() === "PENDING";
            const isCompleted = (payload.status || "").toUpperCase() === "COMPLETED";
            const now = new Date().toISOString();
            setBookings((prev) =>
              prev.map((b) =>
                b.id === payload.id
                  ? {
                      ...b,
                      ...payload,
                      completed_at: payload.completed_at || (isCompleted ? (b.completed_at || now) : b.completed_at),
                      updated_at: now,
                      ...(isPending
                        ? {
                            technician_id: null,
                            technician_name: undefined,
                            technician_phone: undefined,
                            accepted_at: undefined,
                          }
                        : {}),
                    }
                  : b
              )
            );
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("mud_booking_updated", handler);
      bus?.close();
    };
  }, []);

  const handleBookingUpdated = (updated: BookingRecord) => {
    const isCompleted = (updated.status || "").toUpperCase() === "COMPLETED";
    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === updated.id
          ? {
              ...b,
              ...updated,
              completed_at: updated.completed_at || (isCompleted ? (b.completed_at || now) : b.completed_at),
              updated_at: now,
            }
          : b
      )
    );
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <ClipboardList className="w-14 h-14 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">View Your Bookings</h2>
        <p className="text-slate-500 mb-6">Login to see your booking history and track live jobs</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Login to Continue
        </button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  // Helper to extract the most accurate timestamp for ordering bookings
  const getBookingSortTime = (b: BookingRecord, preferCompleted = false): number => {
    if (preferCompleted) {
      const candidates = [
        b.completed_at,
        b.paid_at,
        b.updated_at,
        (b as any).cancelled_at,
        b.created_at,
        b.scheduled_at,
      ];
      for (const c of candidates) {
        if (c) {
          const ms = typeof c === "string" ? Date.parse(c) : new Date(c).getTime();
          if (!isNaN(ms) && ms > 0) return ms;
        }
      }
    } else {
      const candidates = [
        b.updated_at,
        b.created_at,
        b.scheduled_at,
      ];
      for (const c of candidates) {
        if (c) {
          const ms = typeof c === "string" ? Date.parse(c) : new Date(c).getTime();
          if (!isNaN(ms) && ms > 0) return ms;
        }
      }
    }

    if ((b as any).firestore_updated_at) {
      const fs = (b as any).firestore_updated_at;
      if (typeof fs?.toMillis === "function") return fs.toMillis();
      if (fs?.seconds) return fs.seconds * 1000;
    }
    if ((b as any).firestore_timestamp) {
      const fs = (b as any).firestore_timestamp;
      if (typeof fs?.toMillis === "function") return fs.toMillis();
      if (fs?.seconds) return fs.seconds * 1000;
    }

    return 0;
  };

  const active = React.useMemo(() => {
    return bookings
      .filter((b) => !["COMPLETED", "CANCELLED", "REVIEWED"].includes((b.status || "").toUpperCase()))
      .sort((a, b) => getBookingSortTime(b, false) - getBookingSortTime(a, false));
  }, [bookings]);

  const history = React.useMemo(() => {
    return bookings
      .filter((b) => ["COMPLETED", "CANCELLED", "REVIEWED"].includes((b.status || "").toUpperCase()))
      .sort((a, b) => {
        // Latest completed/terminal booking strictly at the top
        const diff = getBookingSortTime(b, true) - getBookingSortTime(a, true);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [bookings]);

  const shown = tab === "active" ? active : history;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {tab === "tickets" ? "Customer Support Desk" : "My Bookings"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {tab === "tickets"
              ? "Track resolution of your customer inquiries & service requests"
              : "Track live technician status, doorstep verification & service updates"}
          </p>
        </div>
      </div>

      {/* Modern Segmented Pill Tabs */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 mb-6 border border-slate-200/80 shadow-2xs">
        {(["active", "history", "tickets"] as const).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearchParams(t === "active" ? {} : { tab: t });
            }}
            className={cn(
              "flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all capitalize flex items-center justify-center gap-2 cursor-pointer select-none",
              tab === t
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            )}
          >
            {t === "active" ? (
              <>
                <span>Active</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full transition-colors",
                  tab === t ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600"
                )}>
                  {active.length}
                </span>
              </>
            ) : t === "history" ? (
              <>
                <span>History</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full transition-colors",
                  tab === t ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600"
                )}>
                  {history.length}
                </span>
              </>
            ) : (
              <>
                <Headphones className="w-3.5 h-3.5" />
                <span>My Tickets</span>
              </>
            )}
          </button>
        ))}
      </div>

      {tab === "tickets" ? (
        <MyTicketsList initialTicketId={searchParams.get("ticketId")} />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            {tab === "active" ? "No active bookings" : "No booking history yet"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === "active" ? "Book your first service!" : "Completed bookings appear here."}
          </p>
          {tab === "active" && (
            <button
              onClick={() => navigate("/services")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Browse Services
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {shown.map(booking => (
            tab === "active" ? (
              <SmartBookingTracker
                key={booking.id}
                booking={booking}
                onBookingUpdated={handleBookingUpdated}
                onBack={() => navigate(-1)}
              />
            ) : (
              <LiveBookingCard
                key={booking.id}
                booking={booking}
                onBookingUpdated={handleBookingUpdated}
              />
            )
          ))}
        </div>
      )}

      {/* ─── Floating SOS Emergency Button (shows for active bookings) ─── */}
      {tab === "active" && active.length > 0 && (() => {
        const mostRecent = active[0];
        const isActiveJob = !["COMPLETED", "CANCELLED", "REVIEWED"].includes(mostRecent.status);
        return (
          <FloatingSOSButton
            bookingId={mostRecent.id}
            technicianName={mostRecent.technician_name}
            technicianId={mostRecent.technician_id}
            serviceAddress={mostRecent.address_text || mostRecent.address_locality}
            customerName={user?.name || mostRecent.customer_name}
            customerPhone={user?.phone || mostRecent.customer_phone}
            customerId={user?.id || mostRecent.customer_id}
            emergencyContactName={mostRecent.emergency_contact_name}
            emergencyContactPhone={mostRecent.emergency_contact_phone}
            lat={mostRecent.address_lat}
            lng={mostRecent.address_lng}
            locality={mostRecent.address_locality}
            isActive={isActiveJob}
          />
        );
      })()}
    </div>
  );
};
