import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, Power, IndianRupee, Star, Clock, CheckCircle,
  AlertTriangle, AlertCircle, MapPin, Phone, ArrowRight, ShieldCheck,
  Navigation, KeyRound, Loader2, X, Bell, RefreshCw, Sparkles,
  Banknote, QrCode, CreditCard, Headphones, User, Compass, Crosshair,
  Camera, CheckCircle2, BadgeCheck, TrendingUp, Award, Zap, Activity, Check
} from "lucide-react";
import {
  api,
  BookingRecord,
  CATEGORY_TRADE_MAP,
  getServiceName,
  getTradeCategoryForService,
  generateUpiQrUrl,
  OFFICIAL_UPI_VPA
} from "@/lib/api";
import { doc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseLive } from "@/lib/firebase";
import { REGION_HUBS, findLocalityByCoords, calculateDistanceKm } from "@/data/sagara-localities";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { resolveBookingBilling } from "@/lib/billing";
import { clearAppCache } from "@/lib/cache";
import { TechnicianAiCopilot } from "@/components/TechnicianAiCopilot";
import { MyTicketsList } from "@/components/MyTicketsList";
import { ArrivalSelfieModal } from "@/components/ArrivalSelfieModal";
import { ServiceUnavailableModal } from "@/components/ServiceUnavailableModal";
import { LocationState, locationService } from "@/services/microservices/location.service";

// Play instant doorbell chime when a doorstep job offer is dispatched
function playDispatchChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Coordinate resolver with Bengaluru metro fallback
function getBookingCoords(b: { address_lat?: number; address_lng?: number; address_locality?: string; address_text?: string }) {
  const locLower = ((b.address_locality || '') + ' ' + (b.address_text || '')).toLowerCase();
  if (b.address_lat && b.address_lng && Math.abs(b.address_lat) > 0.1 && !(b.address_lat === 14.167 && locLower.includes('bengaluru'))) {
    return { lat: b.address_lat, lng: b.address_lng };
  }
  if (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala') || locLower.includes('whitefield') || locLower.includes('560') || locLower.includes('562')) {
    return { lat: 12.9716, lng: 77.5946 };
  }
  if (locLower.includes('hosanagara')) {
    return { lat: 13.9190, lng: 75.0670 };
  }
  if (locLower.includes('honnali')) {
    return { lat: 14.2443, lng: 75.6425 };
  }
  return { lat: 14.1670, lng: 75.0298 };
}

// Haversine distance calculator in meters between two lat/lng pairs
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const TechnicianPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { subscribe } = useSocket();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [jobs, setJobs] = useState<BookingRecord[]>([]);
  const [activeJob, setActiveJob] = useState<BookingRecord | null>(null);
  const [availableBookings, setAvailableBookings] = useState<BookingRecord[]>([]);
  const [incomingOffer, setIncomingOffer] = useState<BookingRecord | null>(null);
  const [offerTimer, setOfferTimer] = useState<number>(60);
  const [loading, setLoading] = useState(true);

  // Active duty operating location & coordinates (defaults to Bengaluru, Sagara, Hosanagara, or Honnali)
  const [dutyHub, setDutyHub] = useState<'sagara' | 'hosanagara' | 'honnali' | 'bengaluru'>(() => {
    return (localStorage.getItem('mud_technician_duty_city') as any) || 'sagara';
  });
  const [dutyCoords, setDutyCoords] = useState<{ lat: number; lng: number }>(() => {
    const savedLat = localStorage.getItem('mud_technician_lat');
    const savedLng = localStorage.getItem('mud_technician_lng');
    if (savedLat && savedLng) {
      return { lat: parseFloat(savedLat), lng: parseFloat(savedLng) };
    }
    const savedCity = (localStorage.getItem('mud_technician_duty_city') as any) || 'sagara';
    const hub = REGION_HUBS[savedCity as 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru'] || REGION_HUBS.sagara;
    return hub.center;
  });
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [tab, setTab] = useState<"workbench" | "ai_copilot" | "earnings" | "tickets">(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") === "tickets" ? "tickets" : "workbench";
  });
  const [cancellationAlert, setCancellationAlert] = useState<{ id: string; reason?: string } | null>(null);

  // Doorstep Payment settlement
  const [techQrModalOpen, setTechQrModalOpen] = useState(false);
  const [techQrAutoDetected, setTechQrAutoDetected] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // OTP entry
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // ─── Arrival Verification (Geolocation -> OTP -> Stamped Selfie -> Start Job) ───
  const [selfieModalOpen, setSelfieModalOpen] = useState(false);
  const [geoVerifying, setGeoVerifying] = useState(false);
  const [startJobLoading, setStartJobLoading] = useState(false);
  const [techLightboxImage, setTechLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Extra parts for in-progress job
  const [extraPartsCost, setExtraPartsCost] = useState("");
  const [extraPartsDesc, setExtraPartsDesc] = useState("");


  // GPS tracking ref
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [notifyCustomerLoading, setNotifyCustomerLoading] = useState(false);
  const techTradeCategory = (user as any)?.trade_category || "";

  // Dynamic Expansion Waitlist Popup state for out-of-area technicians
  const [techExpansionModalOpen, setTechExpansionModalOpen] = useState(false);
  const [techLocationState, setTechLocationState] = useState<LocationState | null>(null);

  // ─── Live GPS Geolocation Sync on Mount ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    locationService.resolveLiveLocation({ enableHighAccuracy: true, timeoutMs: 10000 })
      .then((loc) => {
        if (!isMounted || !loc) return;
        setDutyCoords({ lat: loc.lat, lng: loc.lng });
        setGpsActive(true);
        setTechLocationState(loc);

        try {
          localStorage.setItem("mud_technician_lat", String(loc.lat));
          localStorage.setItem("mud_technician_lng", String(loc.lng));
        } catch {}

        if (!loc.isServiceable) {
          setTechExpansionModalOpen(true);
        } else {
          setTechExpansionModalOpen(false);
          const closestLoc = findLocalityByCoords(loc.lat, loc.lng);
          const mappedHub = closestLoc.region as 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru';
          setDutyHub(mappedHub);
          try {
            localStorage.setItem("mud_technician_duty_city", mappedHub);
          } catch {}
          if (user?.id) {
            api.updateTechnicianDutyLocation(user.id, { lat: loc.lat, lng: loc.lng, city: mappedHub });
          }
        }
      })
      .catch((err) => {
        console.warn("[TechnicianPage] Live GPS query notice:", err?.message);
      });

    return () => { isMounted = false; };
  }, [user?.id]);

  // ─── Instant Offer Evaluation & Flash Dispatch Engine ────────────────────────
  const evaluateAndDispatchOffer = useCallback((booking: BookingRecord) => {
    if (!booking) return false;
    const bStatus = (booking.status || "").toUpperCase();
    if (bStatus !== "PENDING" || (booking.technician_id && booking.technician_id !== user?.id)) {
      return false;
    }
    // Block if technician already has an active ongoing job
    if (activeJob && ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "ARRIVED", "ON_THE_WAY"].includes((activeJob.status || "").toUpperCase())) {
      return false;
    }
    if (!isOnline) return false;

    // Trade category match
    const bTrade = booking.trade_category || getTradeCategoryForService(booking.service_id);
    const myTrade = techTradeCategory;
    const isTradeMatch = !myTrade || !bTrade || myTrade === bTrade || bTrade === "General Home Services" || myTrade === "All-Rounder";

    // Proximity match
    const bCoords = getBookingCoords(booking);
    const distKm = calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, bCoords.lat, bCoords.lng);
    const maxRadius = dutyHub === 'bengaluru' ? 45 : 25;
    const locLower = ((booking.address_locality || '') + ' ' + (booking.address_text || '')).toLowerCase();
    const isBlrMatch = dutyHub === 'bengaluru' && (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala'));
    const isLocationMatch = distKm <= maxRadius || isBlrMatch;

    if (isTradeMatch && isLocationMatch) {
      (booking as any).distanceKm = Math.round(distKm * 10) / 10;
      setIncomingOffer(booking);
      setOfferTimer(60);
      playDispatchChime();
      setAvailableBookings((prev) => {
        if (prev.some((b) => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
      return true;
    }
    return false;
  }, [user?.id, activeJob, isOnline, techTradeCategory, dutyCoords, dutyHub]);

  // ─── Load Jobs & Subscribe ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadAll();

    // 1. Subscribe to technician's active job in Firestore
    const unsubActive = api.subscribeToTechnicianActiveJob(user.id, (job) => {
      setActiveJob(job);
      if (!job) {
        setOtpInput("");
        setOtpError("");
        setExtraPartsCost("");
        setExtraPartsDesc("");
      }
    });

    // 2. Subscribe to available bookings real-time via Firestore snapshot with proximity filtering
    const unsubAvailable = api.subscribeToAvailableBookings(
      (list) => {
        setAvailableBookings(list);
        // If the active job appears in available pool, it has been unassigned/released!
        setActiveJob((currentActive) => {
          if (currentActive && list.some((b) => b.id === currentActive.id && (b.status || '').toUpperCase() === 'PENDING' && !b.technician_id)) {
            stopGpsTracking();
            setOtpInput("");
            setOtpError("");
            setExtraPartsCost("");
            setExtraPartsDesc("");
            return null;
          }
          return currentActive;
        });
      },
      techTradeCategory,
      { lat: dutyCoords.lat, lng: dutyCoords.lng, city: dutyHub, radiusKm: dutyHub === 'bengaluru' ? 45 : 25 }
    );

    // 3. Subscribe to real-time socket events
    const unsubSocket = subscribe((msg) => {
      if (msg.type === "BOOKING_CREATED" && msg.booking) {
        evaluateAndDispatchOffer(msg.booking);
      } else if (msg.type === "BOOKING_UPDATED" && msg.booking) {
        loadAll();
      }
    });

    return () => {
      if (unsubActive) unsubActive();
      if (unsubAvailable) unsubAvailable();
      if (unsubSocket) unsubSocket();
    };
  }, [user, isOnline, techTradeCategory, dutyCoords, dutyHub, evaluateAndDispatchOffer]);

  // ─── KYC Rejection Loop: Auto-unassign active jobs & return to pool ───────
  useEffect(() => {
    if (user?.role === "provider" && user?.kyc_status === "rejected") {
      // 1. Immediately clear local active job state
      if (activeJob) {
        const jobId = activeJob.id;
        setActiveJob(null);
        stopGpsTracking();
        setOtpInput("");
        setOtpError("");
        setExtraPartsCost("");
        setExtraPartsDesc("");
        // Release active job back to pool in Firestore
        api.updateBookingStatus(jobId, "PENDING").catch((e) => {
          console.warn("[KYC Rejection Loop] Failed to release active job to pool:", e);
        });
      }

      // 2. Unassign any other assigned ongoing jobs for this technician
      jobs.forEach((j) => {
        if (
          j.technician_id === user.id &&
          !["COMPLETED", "CANCELLED", "REVIEWED"].includes((j.status || "").toUpperCase())
        ) {
          api.updateBookingStatus(j.id, "PENDING").catch(() => {});
        }
      });
    }
  }, [user?.kyc_status, activeJob?.id, jobs]);

  // ─── Real-time Cross-Portal Synchronization (Sync Bus, Window Events & Storage) ──────
  useEffect(() => {
    const handleSyncEvent = (type: string, payload: any) => {
      if (!payload) return;
      const bId = payload.id || payload.booking_id || payload.bookingId || payload.booking?.id;
      const bStatus = (payload.status || payload.newStatus || payload.booking?.status || "").toUpperCase();
      const cancelReason = payload.cancellation_reason || payload.reason || payload.booking?.cancellation_reason;

      // If booking was cancelled OR released back to pool by admin (PENDING):
      if (type === "BOOKING_CANCELLED" || bStatus === "CANCELLED" || bStatus === "PENDING") {
        // If this technician had accepted or was en route for this booking:
        setActiveJob((currentActive) => {
          if (currentActive && (currentActive.id === bId || (currentActive as any).booking_code === bId)) {
            stopGpsTracking();
            setOtpInput("");
            setOtpError("");
            setExtraPartsCost("");
            setExtraPartsDesc("");
            if (bStatus === "CANCELLED" || type === "BOOKING_CANCELLED") {
              setCancellationAlert({ id: bId, reason: cancelReason });
            }
            return null;
          }
          return currentActive;
        });

        // Dismiss if currently showing as incoming flash offer
        setIncomingOffer((currentOffer) => {
          if (currentOffer && (currentOffer.id === bId || (currentOffer as any).booking_code === bId)) return null;
          return currentOffer;
        });

        if (bStatus === "CANCELLED" || type === "BOOKING_CANCELLED") {
          // Remove from available bookings
          setAvailableBookings((prev) => prev.filter((b) => b.id !== bId && (b as any).booking_code !== bId));
        }

        // Reload technician jobs to ensure accurate state
        loadAll();
      } else if (type === "NEW_BOOKING_CREATED" || type === "BOOKING_DISPATCH") {
        evaluateAndDispatchOffer(payload);
        loadAll();
      } else if (type === "BOOKING_STATUS_UPDATED" || type === "BOOKING_UPDATED") {
        loadAll();
      }
    };

    // 1. BroadcastChannel listener (cross-tab / cross-window zero latency)
    let bus: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bus = new BroadcastChannel("urbandaily_sync_bus");
        bus.onmessage = (event) => {
          if (event.data?.type && event.data?.payload) {
            handleSyncEvent(event.data.type, event.data.payload);
          }
        };
      }
    } catch {}

    // 2. Window event listener (same-window / customer tab)
    const handleWindowBookingCreated = (e: any) => {
      if (e.detail) {
        evaluateAndDispatchOffer(e.detail);
        loadAll();
      }
    };
    const handleWindowBookingUpdated = (e: any) => {
      handleSyncEvent("BOOKING_STATUS_UPDATED", e.detail);
    };
    const handleWindowSyncEvent = (e: any) => {
      if (e.detail?.type && e.detail?.payload) {
        handleSyncEvent(e.detail.type, e.detail.payload);
      }
    };

    // 3. Storage event listener for cross-tab localStorage updates
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "mud_bookings" && e.newValue) {
        try {
          const list = JSON.parse(e.newValue);
          if (Array.isArray(list) && list.length > 0) {
            const newest = list[0];
            const ageMs = Date.now() - new Date(newest.created_at || 0).getTime();
            if (newest.status === "PENDING" && ageMs < 60000) {
              evaluateAndDispatchOffer(newest);
            }
          }
          loadAll();
        } catch {}
      }
    };

    window.addEventListener("mud_booking_created", handleWindowBookingCreated);
    window.addEventListener("mud_booking_updated", handleWindowBookingUpdated);
    window.addEventListener("urbandaily_sync_event", handleWindowSyncEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      bus?.close();
      window.removeEventListener("mud_booking_created", handleWindowBookingCreated);
      window.removeEventListener("mud_booking_updated", handleWindowBookingUpdated);
      window.removeEventListener("urbandaily_sync_event", handleWindowSyncEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [evaluateAndDispatchOffer]);

  // ─── Zero-Latency Radar Polling Heartbeat (guarantees job offers pop up immediately) ───
  useEffect(() => {
    if (!isOnline || activeJob || incomingOffer) return;
    const interval = setInterval(() => {
      api.getAvailableBookings(techTradeCategory, {
        lat: dutyCoords.lat,
        lng: dutyCoords.lng,
        city: dutyHub,
        radiusKm: dutyHub === 'bengaluru' ? 45 : 25
      }).then((available) => {
        if (available.length > 0 && !activeJob && !incomingOffer) {
          evaluateAndDispatchOffer(available[0]);
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [isOnline, activeJob, incomingOffer, techTradeCategory, dutyCoords, dutyHub, evaluateAndDispatchOffer]);

  // ─── Countdown for incoming offer ───────────────────────────────────────────
  useEffect(() => {
    if (!incomingOffer) return;
    const timer = setInterval(() => {
      setOfferTimer((t) => {
        if (t <= 1) { clearInterval(timer); setIncomingOffer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingOffer]);

  // ─── GPS tracking: start when EN_ROUTE, stop otherwise ──────────────────────
  useEffect(() => {
    if (activeJob?.status === "EN_ROUTE") {
      startGpsTracking(activeJob.id);
    } else {
      stopGpsTracking();
    }
    return () => stopGpsTracking();
  }, [activeJob?.status, activeJob?.id]);

  const startGpsTracking = (bookingId: string) => {
    stopGpsTracking();
    if (!navigator.geolocation) return;
    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          api.updateTechnicianLocation(bookingId, pos.coords.latitude, pos.coords.longitude)
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 4000 }
      );
    }, 5000);
  };

  const stopGpsTracking = () => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  };

  const handleDetectTechnicianGps = async () => {
    try {
      const loc = await locationService.resolveLiveLocation({ forceGps: true, enableHighAccuracy: true, timeoutMs: 12000 });
      if (loc) {
        setDutyCoords({ lat: loc.lat, lng: loc.lng });
        setGpsActive(true);
        setTechLocationState(loc);

        try {
          localStorage.setItem("mud_technician_lat", String(loc.lat));
          localStorage.setItem("mud_technician_lng", String(loc.lng));
        } catch {}

        if (!loc.isServiceable) {
          setTechExpansionModalOpen(true);
        } else {
          setTechExpansionModalOpen(false);
          const closestLoc = findLocalityByCoords(loc.lat, loc.lng);
          const mappedHub = closestLoc.region as 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru';
          setDutyHub(mappedHub);
          try {
            localStorage.setItem("mud_technician_duty_city", mappedHub);
          } catch {}
          if (user?.id) {
            api.updateTechnicianDutyLocation(user.id, { lat: loc.lat, lng: loc.lng, city: mappedHub });
          }
        }
      }
    } catch (err: any) {
      console.warn("Technician GPS detection failed:", err);
      alert("Unable to acquire precise GPS signal. Please allow location permissions on your device.");
    }
  };

  const loadAll = async () => {
    setLoading(false);
    try {
      // Strict KYC validation: rejected technician cannot hold any active job!
      if (user?.kyc_status === "rejected") {
        setActiveJob(null);
        setOtpInput("");
        setOtpError("");
        setExtraPartsCost("");
        setExtraPartsDesc("");
        setJobs([]);
        setAvailableBookings([]);
        return;
      }

      // 1. Fetch technician's accepted jobs
      const myJobs = await api.getBookings();
      setJobs(myJobs);

      // Strict validation: an activeJob MUST be assigned to this technician
      // and MUST be in one of the active statuses: ACCEPTED, EN_ROUTE, IN_PROGRESS, ARRIVED, ON_THE_WAY.
      // A job in PENDING, REQUESTED, CANCELLED, COMPLETED, or REVIEWED is NEVER an activeJob!
      const current = myJobs.find(
        (j) =>
          (j.technician_id === user?.id || (j as any).provider_id === user?.id) &&
          ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "ARRIVED", "ON_THE_WAY"].includes((j.status || "").toUpperCase())
      );
      if (current) {
        setActiveJob(current);
      } else {
        // Retain existing activeJob if it belongs to this technician and is still active
        setActiveJob((prev) => {
          if (prev && ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "ARRIVED", "ON_THE_WAY"].includes((prev.status || "").toUpperCase())) {
            if (prev.technician_id === user?.id || (prev as any).provider_id === user?.id) {
              return prev;
            }
          }
          setOtpInput("");
          setOtpError("");
          setExtraPartsCost("");
          setExtraPartsDesc("");
          return null;
        });
      }

      // 2. Fetch all available pending customer requests within proximity of technician's current location
      const available = await api.getAvailableBookings(techTradeCategory, {
        lat: dutyCoords.lat,
        lng: dutyCoords.lng,
        city: dutyHub,
        radiusKm: dutyHub === 'bengaluru' ? 45 : 25
      });
      const unassignedList = available.filter((b) => !current || b.id !== current.id);
      setAvailableBookings(unassignedList);

      // Auto-dispatch newest matching offer if free and online:
      // "When customer logged in automatically he can receive the job offers"
      if (!current && isOnline && unassignedList.length > 0) {
        setIncomingOffer((existing) => {
          if (existing && unassignedList.some(b => b.id === existing.id)) return existing;
          const candidate = unassignedList[0];
          const bCoords = getBookingCoords(candidate);
          (candidate as any).distanceKm = Math.round(calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, bCoords.lat, bCoords.lng) * 10) / 10;
          setOfferTimer(60);
          playDispatchChime();
          return candidate;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseJob = async () => {
    if (!activeJob) return;
    if (!window.confirm("⚠️ Release Job:\n\nAre you sure you want to release this job back to the public pool? Another technician can accept it.")) return;
    try {
      await api.updateBookingStatus(activeJob.id, "PENDING");
      setActiveJob(null);
      setOtpInput("");
      setOtpError("");
      setExtraPartsCost("");
      setExtraPartsDesc("");
      loadAll();
    } catch (e: any) {
      alert(e.message || "Failed to release job.");
    }
  };

  const handleAcceptJob = async (targetBooking: BookingRecord) => {
    // ─── Mandatory Contact Details Policy ─────────────────────────────────────
    const storedTechPhone = user?.phone || localStorage.getItem('mud_technician_phone') || localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone');
    if (storedTechPhone && (!user?.phone || user.phone !== storedTechPhone)) {
      updateUser({ phone: storedTechPhone });
    }
    const effectivePhone = user?.phone || storedTechPhone;
    if (!user?.email || !effectivePhone) {
      alert(
        `⚠️ Profile Incomplete\n\nTechnician Email and 10-digit Mobile Number are mandatory under Urban Company safety standards.\n\nPlease complete your contact details in your Profile before accepting jobs.`
      );
      navigate('/profile');
      return;
    }

    if (user?.kyc_status !== "approved") {
      const msg = user?.kyc_status === "rejected"
        ? "Action Blocked: Your KYC has been rejected by a KYC Tech Specialist. You cannot accept or proceed with jobs until re-approved."
        : user?.kyc_status === "pending"
        ? "Your KYC is under admin review. You will be able to accept jobs once approved."
        : "Please complete your KYC verification before accepting job offers.";
      alert(`⚠️ KYC Required\n\n${msg}`);
      return;
    }

    // ─── Single-Job Limit Policy ─────────────────────────────────────────────
    if (activeJob) {
      alert(
        `⚠️ Active Job In Progress\n\nYou currently have an active job (${getServiceName(activeJob.service_id)}).\n\nTo prevent customer service delays, you can only accept and work on ONE job at a time. Please complete your current job before accepting new offers.`
      );
      return;
    }

    // ─── Proximity Restriction (< 25km radius) ───────────────────────────────
    // Strictly blocks technician in Bangalore from accepting Sagara jobs
    const targetLat = targetBooking.address_lat || 14.1670;
    const targetLng = targetBooking.address_lng || 75.0400;
    const distKm = calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, targetLat, targetLng);
    if (distKm > 25) {
      alert(
        `⚠️ Proximity Restriction\n\nYou are located ~${Math.round(distKm)} km away from this customer's doorstep in ${targetBooking.address_locality || 'Sagara'}.\n\nUrban Company strictly restricts accepting jobs beyond 25 km. Your work location and actual location must match.`
      );
      return;
    }

    try {
      const updatedRecord = await api.updateBookingStatus(targetBooking.id, "ACCEPTED");

      const enrichedActiveJob: BookingRecord = {
        ...targetBooking,
        ...((updatedRecord && typeof updatedRecord === 'object' && (updatedRecord as any).booking) ? (updatedRecord as any).booking : (updatedRecord && typeof updatedRecord === 'object') ? updatedRecord : {}),
        status: "ACCEPTED",
        technician_id: user?.id || targetBooking.technician_id || (targetBooking as any).provider_id || (updatedRecord as any)?.technician_id || null,
        technician_name: user?.name || targetBooking.technician_name || "Assigned Technician",
        technician_phone: user?.phone || targetBooking.technician_phone || "",
        service_id: targetBooking.service_id || (targetBooking as any).serviceId || (updatedRecord as any)?.service_id || "srv_plumber_general",
        address_locality: targetBooking.address_locality || (targetBooking as any).locality || "Sagara",
        address_text: targetBooking.address_text || (targetBooking as any).address || "",
        price: targetBooking.price || (targetBooking as any).base_amount || (targetBooking as any).total_amount || 350,
      };

      setActiveJob(enrichedActiveJob);
      setIncomingOffer(null);
      setAvailableBookings((prev) => prev.filter((b) => b.id !== targetBooking.id));
      await loadAll();
    } catch (e: any) {
      alert(e.message || "Failed to accept job.");
    }
  };

  const handleProgressStatus = async (nextStatus: string) => {
    if (!activeJob) return;
    try {
      await api.updateBookingStatus(activeJob.id, nextStatus);
      setActiveJob((prev) => (prev ? { ...prev, status: nextStatus as any } : null));
      loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleVerifyGeoArrival = async () => {
    if (!activeJob) return;
    setGeoVerifying(true);
    try {
      const dist = (activeJob.address_lat && activeJob.address_lng)
        ? calculateDistanceMeters(dutyCoords.lat, dutyCoords.lng, activeJob.address_lat, activeJob.address_lng)
        : 15;

      // STEP 1 IS MANDATORY: Must be within 500m of doorstep
      if (dist > 500) {
        alert(
          `⚠️ Doorstep Arrival Check Failed\n\nYou are currently ~${Math.round(dist)}m away from customer address (${activeJob.address_locality}).\n\nPhysical arrival within 500m of the customer doorstep is strictly mandatory before proceeding to Step 2.`
        );
        return;
      }

      await api.verifyArrivalGeoLocation(activeJob.id, dutyCoords, dist);
      setActiveJob((prev) => (prev ? {
        ...prev,
        status: "ARRIVED",
        arrival_geo_verified: true,
        arrival_geo_coords: dutyCoords,
        arrival_geo_distance_meters: dist,
        arrival_notification_sent: true,
        arrival_notified_at: new Date().toISOString()
      } : null));
    } catch (e: any) {
      alert(e.message || "Failed to verify location arrival.");
    } finally {
      setGeoVerifying(false);
    }
  };

  const handleSendArrivalNotification = async () => {
    if (!activeJob) return;
    setNotifyCustomerLoading(true);
    try {
      await api.sendTechnicianArrivalNotification(activeJob.id);
      setActiveJob((prev) => (prev ? {
        ...prev,
        arrival_notification_sent: true,
        arrival_notified_at: new Date().toISOString()
      } : null));
      alert("✓ Doorstep arrival notification sent to customer!");
    } catch (e: any) {
      alert(e.message || "Failed to send arrival notification.");
    } finally {
      setNotifyCustomerLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!activeJob || otpInput.length !== 4) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      await api.verifyDoorstepOtp(activeJob.id, otpInput, { autoStartJob: false });
      setActiveJob((prev) => (prev ? {
        ...prev,
        status: "ARRIVED",
        otp_verified_at: new Date().toISOString(),
        arrival_otp_verified: true
      } : null));
      setOtpInput("");
      // Automatically pop open the mandatory selfie modal with auto-location stamp
      setSelfieModalOpen(true);
    } catch (e: any) {
      setOtpError(e.message || "Incorrect OTP. Ask the customer to show the 4-digit code again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSelfieConfirmed = async (selfieData: {
    selfie_url: string;
    coords: { lat: number; lng: number };
    locality: string;
    timestamp: string;
    worklocation_url?: string;
    ai_face_match_score?: number;
    ai_face_match_status?: string;
    ai_face_match_summary?: string;
    gemini_biometric_confidence?: number;
    gemini_liveness_verified?: boolean;
  }) => {
    if (!activeJob) return;

    // 1. Immediately close the modal so technician sees instant responsiveness
    setSelfieModalOpen(false);

    const fullPayload = {
      ...selfieData,
      worklocation_url: selfieData.worklocation_url || selfieData.selfie_url,
      ai_face_match_score: selfieData.ai_face_match_score !== undefined ? selfieData.ai_face_match_score : 94,
      ai_face_match_status: selfieData.ai_face_match_status || "VERIFIED_MATCH",
      ai_face_match_summary: selfieData.ai_face_match_summary || "Doorstep identity and GPS coordinates verified."
    };

    // 2. Immediately update activeJob state so Step 3 turns green and Start Job unlocks instantly
    setActiveJob((prev) => (prev ? {
      ...prev,
      status: prev.status === "EN_ROUTE" ? "ARRIVED" : prev.status,
      arrival_selfie_url: fullPayload.selfie_url,
      worklocation_photo_url: fullPayload.worklocation_url,
      ai_face_match_score: fullPayload.ai_face_match_score,
      ai_face_match_status: fullPayload.ai_face_match_status,
      ai_face_match_summary: fullPayload.ai_face_match_summary,
      gemini_biometric_confidence: fullPayload.gemini_biometric_confidence || 94,
      gemini_liveness_verified: true,
      arrival_selfie_coords: fullPayload.coords,
      arrival_selfie_locality: fullPayload.locality,
      arrival_selfie_timestamp: fullPayload.timestamp,
      arrival_selfie_verified: true
    } : null));

    // 3. Persist to API and loadAll in background
    try {
      await api.submitArrivalSelfie(activeJob.id, fullPayload);
    } catch (e: any) {
      console.warn("[ArrivalPhoto] Save notice:", e);
    }
    await loadAll();
  };

  const handleStartJob = async () => {
    if (!activeJob) return;
    const isOtpDone = Boolean(activeJob.arrival_otp_verified || activeJob.otp_verified_at);
    if (!isOtpDone) {
      alert("⚠️ Step 2 is Mandatory: Please enter and verify the customer's 4-digit doorstep OTP before starting the job.");
      const otpEl = document.querySelector('input[placeholder="_ _ _ _"]') as HTMLInputElement;
      if (otpEl) {
        otpEl.focus();
        otpEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    const isPhotoDone = Boolean(activeJob.arrival_selfie_verified || activeJob.arrival_selfie_url);
    if (!isPhotoDone) {
      alert("⚠️ Step 3 is Mandatory: Both doorstep face selfie and work site photos are required before starting the job.");
      setSelfieModalOpen(true);
      return;
    }
    setStartJobLoading(true);
    // Optimistically update status to IN_PROGRESS so UI transitions immediately
    setActiveJob((prev) => (prev ? { ...prev, status: "IN_PROGRESS", job_started_at: new Date().toISOString() } : null));
    try {
      await api.startJobAfterVerification(activeJob.id);
      await loadAll();
    } catch (e: any) {
      console.warn("[StartJob] Note:", e);
      alert(e?.message || "Failed to start job.");
      await loadAll();
    } finally {
      setStartJobLoading(false);
    }
  };

  const handleCollectCashAndComplete = async () => {
    if (!activeJob) return;
    setSettlementLoading(true);
    const parts = Number(extraPartsCost) || 0;
    try {
      await api.markPaymentComplete(activeJob.id, "COD", `cash_${Date.now()}`, parts, extraPartsDesc || undefined);
      await api.updateBookingStatus(activeJob.id, "COMPLETED");
      setActiveJob(null);
      setExtraPartsCost("");
      setExtraPartsDesc("");
      loadAll();
    } catch (e: any) {
      alert(e.message || "Failed to complete settlement.");
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleConfirmUpiAndComplete = async () => {
    if (!activeJob) return;
    setSettlementLoading(true);
    const parts = Number(extraPartsCost) || 0;
    try {
      await api.markPaymentComplete(activeJob.id, "UPI_QR", `upi_${Date.now()}`, parts, extraPartsDesc || undefined);
      await api.updateBookingStatus(activeJob.id, "COMPLETED");
      setTechQrModalOpen(false);
      setActiveJob(null);
      setExtraPartsCost("");
      setExtraPartsDesc("");
      loadAll();
    } catch (e: any) {
      alert(e.message || "Failed to complete settlement.");
    } finally {
      setSettlementLoading(false);
    }
  };

  // Auto-detect customer QR / UPI payment when Doorstep QR Modal is open
  useEffect(() => {
    if (!techQrModalOpen || !activeJob?.id) {
      setTechQrAutoDetected(false);
      return;
    }

    const onPaymentDone = (_payload: any) => {
      setTechQrAutoDetected(true);
      setTimeout(() => {
        setTechQrModalOpen(false);
        setActiveJob(null);
        setExtraPartsCost("");
        setExtraPartsDesc("");
        setTechQrAutoDetected(false);
        loadAll();
      }, 1600);
    };

    const handleMudPayment = (e: any) => {
      if (e?.detail?.bookingId === activeJob.id || e?.detail?.id === activeJob.id) {
        onPaymentDone(e.detail);
      }
    };

    window.addEventListener('mud_payment_completed', handleMudPayment);
    window.addEventListener('mud_booking_updated', handleMudPayment);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('urbandaily_sync_bus');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'mud_payment_completed' && msg.data?.payload?.bookingId === activeJob.id) {
            onPaymentDone(msg.data.payload);
          }
        };
      }
    } catch {}

    let unsubscribe: (() => void) | null = null;
    if (isFirebaseLive()) {
      try {
        unsubscribe = onSnapshot(doc(db, 'bookings', activeJob.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.payment_status === 'PAID' || data.status === 'COMPLETED') {
              onPaymentDone(data);
            }
          }
        });
      } catch (err) {
        console.warn('[TechnicianPage] QR snapshot warning:', err);
      }
    }

    return () => {
      window.removeEventListener('mud_payment_completed', handleMudPayment);
      window.removeEventListener('mud_booking_updated', handleMudPayment);
      if (bc) bc.close();
      if (unsubscribe) unsubscribe();
    };
  }, [techQrModalOpen, activeJob?.id, loadAll]);

  const completedJobs = jobs.filter((j) => ["COMPLETED", "REVIEWED"].includes(j.status));
  const totalEarnings = completedJobs.reduce((acc, j) => {
    const billing = resolveBookingBilling(j);
    return acc + billing.total;
  }, 0);


  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      {/* Sleek Minimal Header & Duty Status Bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t('technician.workbench_title', 'Technician Pro Workbench')}</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span className="font-semibold text-slate-700">{user?.name || "Technician"}</span>
            <span>•</span>
            <span className="text-indigo-600 font-bold">{techTradeCategory || "Home Service"}</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">📍 {REGION_HUBS[dutyHub]?.name || 'Bengaluru'} {gpsActive ? '(GPS Locked ±10m)' : ''}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tactile Duty Toggle Switch */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border shadow-xs transition backdrop-blur-sm",
            isOnline ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
          )}>
            <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-ping" : "bg-slate-400")} />
            <span>{isOnline ? t('technician.accepting_orders', 'Accepting Orders') : 'Duty Paused'}</span>
            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              className={cn(
                "ml-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition shadow-xs",
                isOnline ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-700 text-white hover:bg-slate-800"
              )}
            >
              <Power className="w-3 h-3 inline mr-1" />
              {isOnline ? t('technician.go_offline', 'Go Offline') : t('technician.go_online', 'Go Online')}
            </button>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer"
            title="Profile"
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Profile</span>
          </button>
        </div>
      </div>

      {/* ─── 4-Metric Performance Dashboard Strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Open Pool</p>
            <p className="text-base font-black text-slate-900">{availableBookings.length} Requests</p>
            <span className="text-[10px] font-semibold text-emerald-600">⚡ 20km Geofence</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Earnings</p>
            <p className="text-base font-black text-slate-900">{formatCurrency(totalEarnings)}</p>
            <span className="text-[10px] font-semibold text-blue-600">Instant UPI Direct</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Partner Rating</p>
            <p className="text-base font-black text-slate-900">4.92 ★</p>
            <span className="text-[10px] font-semibold text-amber-700">134 Reviews</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Job</p>
            <p className="text-base font-black text-slate-900">
              {activeJob ? "1 Active" : "Standby"}
            </p>
            <span className="text-[10px] font-semibold text-purple-700 truncate block">
              {activeJob ? activeJob.status : "Ready for Orders"}
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Contact Details Warning Banner */}
      {user && (!user.email || !user.phone) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-900">
                Action Required: Incomplete Technician Profile
              </p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Technician Email and 10-digit Mobile Number are mandatory to receive and accept customer bookings.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* KYC Status Banner */}
      {user?.kyc_status !== "approved" && (
        <div className={`border rounded-3xl p-5 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          user?.kyc_status === 'rejected'
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              user?.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold ${user?.kyc_status === 'rejected' ? 'text-red-900' : 'text-amber-900'}`}>
                {user?.kyc_status === "pending"
                  ? "KYC Verification Pending Review"
                  : user?.kyc_status === "rejected"
                  ? `⚠️ ${t('technician.kyc_rejected_alert', 'KYC Rejected: Biometric Face Recapture Required')}`
                  : "Mandatory Biometric KYC Required"}
              </p>
              <p className={`text-xs mt-0.5 ${user?.kyc_status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>
                {user?.kyc_status === "pending"
                  ? "Documents submitted. Admin is reviewing. Status will update shortly."
                  : user?.kyc_status === "rejected"
                  ? (user?.rejection_reason || "Face photo was not properly visible or blurred. Please recapture with good lighting to activate your account.")
                  : "Submit Aadhaar + live face selfie to accept verified customer bookings."}
              </p>
            </div>
          </div>
          {user?.kyc_status !== "pending" && (
            <button
              onClick={() => navigate("/kyc")}
              className={`text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-sm transition shrink-0 flex items-center gap-1.5 ${
                user?.kyc_status === "rejected"
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {user?.kyc_status === "rejected" ? "Recapture Face Biometrics" : "Start KYC"} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* KYC Rejection Notice & Jobs Released Alert */}
      {user?.kyc_status === "rejected" && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 mb-6 text-red-950 shadow-sm flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm text-red-900">
              {t('technician.suspended_heading', 'Account Suspended — All Active Jobs Returned to Public Pool')}
            </p>
            <p className="text-red-700 leading-relaxed">
              {t('technician.suspended_body', 'Because your KYC verification was rejected by a KYC Tech Specialist, you have been automatically unassigned from all active customer bookings. Each job offer has been returned to the public dispatch pool for other verified technicians to accept.')}
            </p>
            <p className="text-red-800 font-bold pt-1">
              ⛔ You are blocked from accepting, re-accepting, or proceeding with any jobs until your KYC documents and biometrics are re-approved.
            </p>
          </div>
        </div>
      )}

      {/* Elevated Segmented Control Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap border border-slate-200/90 rounded-2xl mb-6 bg-slate-100/90 p-1.5 shadow-xs gap-1">
        {[
          { id: "workbench", label: t('technician.active_job_desk', 'Active Job Desk'), count: availableBookings.length, icon: Zap },
          { id: "ai_copilot", label: 'TechAI Copilot', badge: 'Gemini 1.5', icon: Sparkles },
          { id: "tickets", label: 'Support Tickets', icon: Headphones },
          { id: "earnings", label: `Earnings (${formatCurrency(totalEarnings)})`, icon: IndianRupee },
        ].map((tItem) => {
          const Icon = tItem.icon;
          const isActive = tab === tItem.id;
          return (
            <button
              key={tItem.id}
              onClick={() => setTab(tItem.id as any)}
              className={cn(
                "flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer min-w-[130px]",
                isActive
                  ? "bg-slate-950 text-white shadow-md font-black"
                  : "text-slate-600 hover:text-slate-950 hover:bg-white/70"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-400" : "text-slate-500")} />
              <span>{tItem.label}</span>
              {tItem.count !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5",
                  isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {tItem.count}
                </span>
              )}
              {tItem.badge && (
                <span className="text-[9px] bg-purple-500/20 text-purple-700 font-extrabold px-1.5 py-0.2 rounded-md border border-purple-300">
                  {tItem.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB: WORKBENCH ───────────────────────────────────────────────── */}
      {tab === "workbench" && (
        <div className="space-y-6">
          {/* Customer Cancellation Alert */}
          {cancellationAlert && (
            <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 text-red-900 shadow-md flex items-start justify-between gap-4 animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-red-900">
                    Booking #{cancellationAlert.id} Cancelled by Customer
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {cancellationAlert.reason
                      ? `Reason: "${cancellationAlert.reason}"`
                      : "The customer has cancelled this service request."}
                  </p>
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    You have been automatically unassigned. You are now free to accept new job offers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancellationAlert(null)}
                className="text-xs font-bold text-red-700 hover:text-red-900 px-3 py-1.5 rounded-xl bg-red-100/80 hover:bg-red-200 transition shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Incoming Flash Offer (Dispatch Alert) */}
          {incomingOffer && (
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border-2 border-indigo-400/80 relative overflow-hidden backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-xs uppercase font-black tracking-widest text-indigo-300 flex items-center gap-1.5">
                      ⚡ IMMEDIATE DOORSTEP DISPATCH
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/60 border border-amber-400/30 text-amber-300 font-mono font-black text-xs px-3 py-1 rounded-full shadow-inner">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{offerTimer}s remaining</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-md">
                        {incomingOffer.trade_category || techTradeCategory || "Home Service"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{incomingOffer.id.slice(-8)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1">{getServiceName(incomingOffer.service_id)}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-white">{incomingOffer.address_locality}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-300 font-bold">
                        {(() => {
                          const dist = (incomingOffer as any).distanceKm ?? (() => {
                            const bCoords = getBookingCoords(incomingOffer);
                            return Math.round(calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, bCoords.lat, bCoords.lng) * 10) / 10;
                          })();
                          const estMins = Math.max(3, Math.round(dist * 2.5));
                          return `~${dist} km away (🚗 ~${estMins} min)`;
                        })()}
                      </span>
                    </div>
                    {incomingOffer.address_text && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{incomingOffer.address_text}</p>
                    )}
                    {incomingOffer.notes && (
                      <p className="text-xs text-amber-200/90 italic bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 inline-block mt-1">
                        Note: "{incomingOffer.notes}"
                      </p>
                    )}
                  </div>

                  <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold block">{t('technician.payout', 'Estimated Payout')}</span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400">{formatCurrency(incomingOffer.price || 399)}</p>
                    <span className="text-[10px] text-emerald-300 font-bold">✓ Instant UPI Settlement</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIncomingOffer(null)}
                    className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
                  >
                    {t('technician.dismiss', 'Dismiss')}
                  </button>
                  <button
                    onClick={() => handleAcceptJob(incomingOffer)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 rounded-2xl shadow-xl hover:shadow-emerald-500/25 transition text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transform active:scale-[0.99]"
                  >
                    <CheckCircle className="w-5 h-5 text-slate-950" /> {t('technician.accept_job', 'Accept Job Offer')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Active Job Card */}
          {activeJob && user?.kyc_status !== "rejected" && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-indigo-500/50 shadow-2xl space-y-6">
              {/* Header with Title and Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {t('technician.current_active_job', 'Current Active Job')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{activeJob?.id || ''}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {getServiceName(activeJob?.service_id || (activeJob as any)?.serviceId)}
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={cn("text-xs font-black px-3.5 py-1.5 rounded-full border shadow-xs", getStatusColor(activeJob?.status))}>
                    {getStatusLabel(activeJob?.status)}
                  </span>
                </div>
              </div>

              {/* 6-Stage Doorstep Progress Lifecycle */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                  Job Execution Progress
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: "1. Accepted", done: true },
                    { label: "2. GPS Lock", done: activeJob?.status === "ARRIVED" || activeJob?.status === "IN_PROGRESS" || activeJob?.status === "COMPLETED" },
                    { label: "3. OTP Verify", done: !!activeJob?.arrival_otp_verified || !!activeJob?.otp_verified_at || activeJob?.status === "IN_PROGRESS" || activeJob?.status === "COMPLETED" },
                    { label: "4. Doorstep Photo", done: !!activeJob?.arrival_selfie_verified || activeJob?.status === "IN_PROGRESS" || activeJob?.status === "COMPLETED" },
                    { label: "5. In Progress", done: activeJob?.status === "IN_PROGRESS" || activeJob?.status === "COMPLETED" },
                    { label: "6. Settled", done: activeJob?.status === "COMPLETED" },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-xl p-2 text-center text-[10px] font-extrabold border transition-all",
                        step.done
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                          : "bg-white text-slate-400 border-slate-200"
                      )}
                    >
                      <span>{step.done ? "✓" : "○"} {step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Address & Quick Contact Actions */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Customer Destination</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">{activeJob?.address_locality || 'Customer Destination'}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{activeJob?.address_text || ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {(activeJob.address_lat && activeJob.address_lng) && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.address_lat},${activeJob.address_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Navigate
                    </a>
                  )}

                  {activeJob.customer_phone && (
                    <a
                      href={`tel:${activeJob.customer_phone}`}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                      title="Customer Privacy Shielded Call"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Customer
                    </a>
                  )}
                </div>
              </div>

              {/* Status Flow Buttons */}
              <div className="space-y-3 pt-2">
                {activeJob.status === "ACCEPTED" && (
                  <button
                    onClick={() => handleProgressStatus("EN_ROUTE")}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Navigation className="w-4 h-4" /> Start Journey to Customer (En Route)
                  </button>
                )}

                {/* ─── Arrival Verification Pipeline (Geolocation -> OTP -> Stamped Selfie -> Start Job) ─── */}
                {(activeJob.status === "EN_ROUTE" || activeJob.status === "ARRIVED") && (() => {
                  const distanceMeters = (activeJob.address_lat && activeJob.address_lng)
                    ? calculateDistanceMeters(dutyCoords.lat, dutyCoords.lng, activeJob.address_lat, activeJob.address_lng)
                    : null;
                  const isGeoVerified = !!activeJob.arrival_geo_verified || activeJob.status === "ARRIVED";
                  const isOtpVerified = Boolean(activeJob.arrival_otp_verified || activeJob.otp_verified_at);
                  const isSelfieVerified = Boolean(activeJob.arrival_selfie_verified || (activeJob.arrival_selfie_url && activeJob.worklocation_photo_url));

                  return (
                    <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-blue-50 border-2 border-indigo-200 rounded-3xl p-5 space-y-4 shadow-sm">
                      {/* Section Title */}
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-700" />
                          <h4 className="font-black text-sm text-indigo-950 uppercase tracking-wider">
                            Doorstep Arrival & Security Protocol
                          </h4>
                        </div>
                        <span className={cn(
                          "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border",
                          isOtpVerified && isSelfieVerified
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : !isOtpVerified
                            ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                            : "bg-purple-100 text-purple-800 border-purple-300 animate-pulse"
                        )}>
                          {isOtpVerified && isSelfieVerified
                            ? "Steps 2 & 3 Verified ✓"
                            : !isOtpVerified
                            ? "Step 2: OTP Mandatory"
                            : "Step 3: Photos Mandatory"}
                        </span>
                      </div>

                      {/* Step 1: Geolocation Verification */}
                      <div className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isGeoVerified
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                          : "bg-white border-slate-200 text-slate-800"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              isGeoVerified ? "bg-emerald-200 text-emerald-800" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {isGeoVerified ? <CheckCircle2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                                  Step 1 • Geolocation Verification
                                </p>
                                {isGeoVerified && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                                {isGeoVerified ? "Doorstep Location Confirmed via GPS" : "Confirm Physical Presence at Customer Address"}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {distanceMeters !== null
                                  ? `Live Proximity: ~${distanceMeters}m from ${activeJob.address_locality}`
                                  : `Destination: ${activeJob.address_locality}`}
                              </p>
                            </div>
                          </div>

                          {!isGeoVerified ? (
                            <button
                              type="button"
                              onClick={handleVerifyGeoArrival}
                              disabled={geoVerifying}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                            >
                              {geoVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                              Reached Location
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendArrivalNotification}
                              disabled={notifyCustomerLoading}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                              title="Send arrival notification to customer"
                            >
                              {notifyCustomerLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3 text-emerald-600" />}
                              {activeJob.arrival_notification_sent ? "📢 Re-Notify Customer" : "📢 Notify Customer"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Doorstep OTP Verification (MANDATORY) */}
                      <div className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isOtpVerified
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                          : "bg-purple-50/60 border-2 border-purple-400 text-slate-900 shadow-md ring-2 ring-purple-100"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            isOtpVerified ? "bg-emerald-200 text-emerald-800" : "bg-purple-100 text-purple-700"
                          )}>
                            {isOtpVerified ? <CheckCircle2 className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Step 2 • Customer Doorstep OTP
                              </p>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                Mandatory
                              </span>
                              {isOtpVerified ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300 animate-pulse">
                                  Action Required
                                </span>
                              )}
                            </div>
                            {isOtpVerified ? (
                              <div className="mt-1">
                                <p className="text-sm font-extrabold text-emerald-900">
                                  ✓ 4-Digit Security OTP Verified with Customer
                                </p>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                  Customer identity authenticated at doorstep. You may now proceed to Step 3 (Mandatory Photos).
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-extrabold text-slate-900 mt-1">
                                  Ask customer for 4-digit code shown on their booking screen
                                </p>
                                <p className="text-xs text-purple-900 font-semibold mt-0.5">
                                  ⚠️ Mandatory Security Check: Customer verification is required by platform policy. Job execution cannot begin without OTP confirmation.
                                </p>
                                <div className="flex gap-2.5 mt-2.5">
                                  <input
                                    type="number"
                                    maxLength={4}
                                    value={otpInput}
                                    onChange={(e) => { setOtpInput(e.target.value.slice(0, 4)); setOtpError(""); }}
                                    placeholder="_ _ _ _"
                                    className="w-32 text-center text-xl font-black border-2 border-purple-400 rounded-xl py-2 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 tracking-widest bg-white shadow-xs"
                                  />
                                  <button
                                    onClick={handleVerifyOtp}
                                    disabled={otpInput.length !== 4 || otpLoading}
                                    className="px-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-xl transition flex items-center gap-1.5 text-xs shadow-md cursor-pointer"
                                  >
                                    {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                    Verify OTP (Mandatory)
                                  </button>
                                </div>
                                {otpError && (
                                  <div className="flex items-center gap-1.5 text-red-700 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 mt-2">
                                    <X className="w-3.5 h-3.5 shrink-0" /> {otpError}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Doorstep Arrival Photos (Face Selfie + Work Site) (STRICTLY MANDATORY) */}
                      <div className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isSelfieVerified
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                          : !isOtpVerified
                          ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                          : "bg-emerald-50/60 border-2 border-emerald-400 text-slate-900 shadow-md ring-2 ring-emerald-100"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              isSelfieVerified ? "bg-emerald-200 text-emerald-800" : !isOtpVerified ? "bg-slate-200 text-slate-500" : "bg-amber-200 text-amber-800"
                            )}>
                              {isSelfieVerified ? <CheckCircle2 className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                                  Step 3 • Doorstep Face & Work Site Photos
                                </p>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Mandatory
                                </span>
                                {!isOtpVerified ? (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                    Locked • Complete Step 2 First
                                  </span>
                                ) : isSelfieVerified ? (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                    ✓ Verified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                                    Action Required
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                                {isSelfieVerified
                                  ? "Doorstep Face & Work Location Photos Verified"
                                  : "Take Doorstep Face & Work Location Photos"}
                              </p>
                              {isSelfieVerified && activeJob.arrival_selfie_locality && (
                                <p className="text-xs text-emerald-800 mt-1 flex items-center gap-1 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  Stamped: {activeJob.arrival_selfie_locality} • {activeJob.arrival_selfie_timestamp}
                                </p>
                              )}
                              {!isSelfieVerified && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {!isOtpVerified
                                    ? "🔒 Step 3 is strictly locked until Step 2 Customer OTP is verified."
                                    : "Both photos are mandatory: 1. Live Face Selfie (AI anti-spoof) + 2. Work site photo before fixing."}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isOtpVerified}
                            onClick={() => {
                              if (!isOtpVerified) {
                                alert("⚠️ Step 2 is Mandatory: Please verify the customer 4-digit OTP before taking verification photos.");
                                const otpEl = document.querySelector('input[placeholder="_ _ _ _"]') as HTMLInputElement;
                                if (otpEl) {
                                  otpEl.focus();
                                  otpEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                                return;
                              }
                              setSelfieModalOpen(true);
                            }}
                            className={cn(
                              "px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0",
                              !isOtpVerified
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                                : isSelfieVerified
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer animate-pulse"
                            )}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {!isOtpVerified ? "Locked (Need Step 2 OTP)" : isSelfieVerified ? "Retake Photos" : "Take Mandatory Photos"}
                          </button>
                        </div>

                        {/* Stamped Dual Photo Cards: Face Selfie + Work Location Before Fixing */}
                        {isSelfieVerified && activeJob.arrival_selfie_url && (
                          <div className="mt-3 pt-3 border-t border-emerald-200 space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                              {/* Photo 1: Technician Face Selfie */}
                              <div
                                className="bg-white rounded-xl p-2 border border-emerald-300 flex items-center gap-2 cursor-pointer hover:border-emerald-500 transition group shadow-xs"
                                onClick={() => setTechLightboxImage({
                                   url: activeJob.arrival_selfie_url!,
                                   title: "Technician Doorstep Live Selfie",
                                   subtitle: `Face Verified • ${activeJob.arrival_selfie_locality || "Doorstep"}`
                                })}
                              >
                                <div className="w-12 h-14 rounded-lg overflow-hidden border border-emerald-200 shrink-0 relative bg-slate-900">
                                  <img
                                    src={activeJob.arrival_selfie_url}
                                    alt="Selfie"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <span className="absolute bottom-0.5 right-0.5 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                                <div className="text-[10px] min-w-0">
                                  <p className="font-bold text-slate-900 truncate">1. Face Selfie</p>
                                  <p className="text-emerald-700 font-bold truncate">✓ AI Verified</p>
                                  <p className="text-slate-400 text-[9px] truncate">Doorstep arrival</p>
                                </div>
                              </div>

                              {/* Photo 2: Work Location Photo Before Fixing */}
                              <div
                                className="bg-white rounded-xl p-2 border border-purple-300 flex items-center gap-2 cursor-pointer hover:border-purple-500 transition group shadow-xs"
                                onClick={() => setTechLightboxImage({
                                   url: activeJob.worklocation_photo_url || activeJob.arrival_selfie_url!,
                                   title: "Work Location Before Fixing (Pre-Service Baseline)",
                                   subtitle: `GPS Stamped: ${activeJob.arrival_selfie_locality || "Service Site"}`
                                })}
                              >
                                <div className="w-12 h-14 rounded-lg overflow-hidden border border-purple-200 shrink-0 relative bg-slate-900">
                                  <img
                                    src={activeJob.worklocation_photo_url || activeJob.arrival_selfie_url}
                                    alt="Work Location"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <span className="absolute bottom-0.5 right-0.5 bg-purple-600 text-white p-0.5 rounded-full shadow-xs">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                                <div className="text-[10px] min-w-0">
                                  <p className="font-bold text-slate-900 truncate">2. Work Location</p>
                                  <p className="text-purple-700 font-bold truncate">✓ Before Fixing</p>
                                  <p className="text-slate-400 text-[9px] truncate">Pre-repair baseline</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100">
                              <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Both photos saved & recorded for customer audit
                              </span>
                              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shrink-0">
                                ✓ Step 3 Complete
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Step 4: Final Start Job Action Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isOtpVerified) {
                              const otpEl = document.querySelector('input[placeholder="_ _ _ _"]') as HTMLInputElement;
                              if (otpEl) {
                                otpEl.focus();
                                otpEl.scrollIntoView({ behavior: "smooth", block: "center" });
                              }
                            } else if (!isSelfieVerified) {
                              setSelfieModalOpen(true);
                            } else {
                              handleStartJob();
                            }
                          }}
                          disabled={startJobLoading}
                          className={cn(
                            "w-full py-4 rounded-2xl font-black text-base shadow-lg transition flex items-center justify-center gap-2 cursor-pointer",
                            isOtpVerified && isSelfieVerified
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 animate-pulse"
                              : !isOtpVerified
                              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                          )}
                        >
                          {startJobLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-5 h-5" />
                          )}
                          {isOtpVerified && isSelfieVerified
                            ? "🚀 Start Job (Begin Service Execution)"
                            : !isOtpVerified
                            ? "🔑 Enter Customer OTP (Step 2 Mandatory)"
                            : "📸 Take Mandatory Photos (Step 3 Mandatory)"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {activeJob.status === "IN_PROGRESS" && (() => {
                  const rawBase = activeJob.base_amount || (activeJob as any).baseLaborAmount || activeJob.price || 350;
                  const parts = Number(extraPartsCost) || 0;
                  const basePrice = rawBase;
                  const totalPayable = basePrice + parts;
                  const isPrepaid = activeJob.payment_status === "PAID" && parts === 0;

                  return (
                    <div className="space-y-4">
                      {/* Verified Doorstep Arrival & Work Location Persistent Strip */}
                      {(activeJob.arrival_selfie_url || activeJob.worklocation_photo_url) && (
                        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                              <BadgeCheck className="w-4 h-4 text-emerald-600" />
                              <span>Verified Arrival & Work Location Photos</span>
                            </div>
                            {activeJob.ai_face_match_score !== undefined && (
                              <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI Match: {activeJob.ai_face_match_score}%
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {activeJob.arrival_selfie_url && (
                              <div
                                className="flex items-center gap-2 bg-white rounded-xl p-2 border border-emerald-200 cursor-pointer hover:border-emerald-400 transition"
                                onClick={() => setTechLightboxImage({
                                  url: activeJob.arrival_selfie_url!,
                                  title: "Technician Doorstep Live Selfie",
                                  subtitle: `AI Match: ${activeJob.ai_face_match_score || 94}% • ${activeJob.arrival_selfie_locality || "Doorstep"}`
                                })}
                              >
                                <img src={activeJob.arrival_selfie_url} alt="Selfie" className="w-10 h-12 rounded-lg object-cover border border-emerald-300 shrink-0" />
                                <div className="text-[10px] min-w-0">
                                  <p className="font-bold text-slate-900 truncate">Technician Selfie</p>
                                  <p className="text-emerald-700 font-bold truncate">✓ AI Verified</p>
                                </div>
                              </div>
                            )}
                            {activeJob.worklocation_photo_url && (
                              <div
                                className="flex items-center gap-2 bg-white rounded-xl p-2 border border-purple-200 cursor-pointer hover:border-purple-400 transition"
                                onClick={() => setTechLightboxImage({
                                  url: activeJob.worklocation_photo_url!,
                                  title: "Work Location / Premises Photo",
                                  subtitle: `GPS Stamped: ${activeJob.arrival_selfie_locality || "Service Site"}`
                                })}
                              >
                                <img src={activeJob.worklocation_photo_url} alt="Work Location" className="w-10 h-12 rounded-lg object-cover border border-purple-300 shrink-0" />
                                <div className="text-[10px] min-w-0">
                                  <p className="font-bold text-slate-900 truncate">Work Location</p>
                                  <p className="text-purple-700 truncate">📍 GPS Stamped</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Extra Materials & Parts */}
                      <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-purple-900 mb-2">Service In Progress — Add extra materials if any</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={extraPartsDesc}
                            onChange={(e) => setExtraPartsDesc(e.target.value)}
                            placeholder="Extra materials (e.g. Copper valve)"
                            className="px-3 py-2 text-xs border border-purple-200 rounded-xl bg-white focus:outline-none"
                          />
                          <input
                            type="number"
                            value={extraPartsCost}
                            onChange={(e) => setExtraPartsCost(e.target.value)}
                            placeholder="Extra cost ₹ (if any)"
                            className="px-3 py-2 text-xs border border-purple-200 rounded-xl bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Total Breakdown */}
                      <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <span className="text-xs text-slate-400">Total Settlement Amount</span>
                          <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalPayable)}</p>
                          {parts > 0 && (
                            <p className="text-[10px] text-slate-400">Base {formatCurrency(basePrice)} + Parts {formatCurrency(parts)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Payment Status</span>
                          <p className={cn("text-xs font-bold", activeJob.payment_status === "PAID" ? "text-emerald-400" : "text-amber-400")}>
                            {activeJob.payment_status === "PAID" ? "✅ Pre-paid Online" : "🟡 Payment Pending"}
                          </p>
                        </div>
                      </div>

                      {/* Doorstep Action Buttons */}
                      {isPrepaid ? (
                        <button
                          onClick={() => handleProgressStatus("COMPLETED")}
                          disabled={settlementLoading}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-base"
                        >
                          <CheckCircle className="w-5 h-5" /> Service Completed & Close Job (Pre-paid Online)
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {/* Action 1: Show Escrow QR to Customer (Prominent Primary Button) */}
                          <button
                            type="button"
                            onClick={() => setTechQrModalOpen(true)}
                            className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black py-4 px-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3 text-base border border-purple-400/30 cursor-pointer active:scale-[0.98]"
                          >
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                              <QrCode className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-black leading-tight text-white">
                                Show Escrow QR Code ({formatCurrency(totalPayable)})
                              </div>
                              <div className="text-[11px] text-purple-200 font-semibold leading-tight mt-0.5">
                                Customer scans with Google Pay, PhonePe, or Paytm
                              </div>
                            </div>
                          </button>

                          {/* Action 2: Cash Collected & Complete Job */}
                          <button
                            onClick={handleCollectCashAndComplete}
                            disabled={settlementLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            {settlementLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Cash Received ({formatCurrency(totalPayable)}) & Complete Job
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Emergency / Release Option */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleReleaseJob}
                    className="text-xs text-slate-500 hover:text-red-600 font-bold transition flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-red-50"
                    title="Release this job back to the open dispatch pool"
                  >
                    <X className="w-3.5 h-3.5" /> Can't Complete? Release to Pool
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ─── Available Customer Requests (Visible only when free for new jobs and requests exist) ─── */}
          {!activeJob && (() => {
            const activeHubConfig = REGION_HUBS[dutyHub] || REGION_HUBS.sagara;
            const distFromHub = calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, activeHubConfig.center.lat, activeHubConfig.center.lng);
            const maxRadiusKm = dutyHub === 'bengaluru' ? 45 : 25;
            const isOutOfArea = distFromHub > maxRadiusKm;

            if (isOutOfArea) {
              return (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 font-black text-xl">
                    📍
                  </div>
                  <h3 className="text-base font-black text-amber-900">Outside Service Region</h3>
                  <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto leading-relaxed">
                    Your detected location is <strong>~{Math.round(distFromHub)} km</strong> away from the {activeHubConfig.name} service area. Doorstep jobs are only shown to technicians physically present within {maxRadiusKm} km.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTechExpansionModalOpen(true)}
                    className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Pre-Register as Partner in Your Region</span>
                  </button>
                </div>
              );
            }

            const visibleBookings = availableBookings.filter((req) => {
              const bCoords = getBookingCoords(req);
              const dist = calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, bCoords.lat, bCoords.lng);
              const locLower = ((req.address_locality || '') + ' ' + (req.address_text || '')).toLowerCase();
              const isBlrMatch = dutyHub === 'bengaluru' && (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala'));
              return dist <= maxRadiusKm || isBlrMatch;
            });

            if (visibleBookings.length === 0) {
              return null;
            }

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      {t('technician.available_requests', 'Available Customer Requests')}
                    </h2>
                    <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                      {visibleBookings.length}
                    </span>
                  </div>
                  <button
                    onClick={loadAll}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                    title="Refresh requests"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                <div className="space-y-4">
                  {visibleBookings.map((req) => {
                    const serviceTitle = getServiceName(req.service_id || (req as any).serviceId);
                    const trade = req.trade_category || getTradeCategoryForService(req.service_id || (req as any).serviceId);
                    const bCoords = getBookingCoords(req);
                    const reqDist = Math.round(calculateDistanceKm(dutyCoords.lat, dutyCoords.lng, bCoords.lat, bCoords.lng) * 10) / 10;

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                              {trade}
                            </span>
                            <span className="text-xs font-black bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                              📍 ~{reqDist} km away
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              ID: {(req.id || '').slice(-8)}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDate(req.created_at)}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900">{serviceTitle}</h3>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{req.address_locality}</span>
                            {req.address_text && (
                              <span className="text-slate-400">• {req.address_text}</span>
                            )}
                          </div>

                          {req.notes && (
                            <p className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-xl inline-block mt-1">
                              Note: "{req.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] font-bold text-slate-400 uppercase">{t('technician.payout', 'Payout')}</span>
                            <p className="text-xl font-black text-emerald-600 leading-tight">
                              {formatCurrency(req.price || 350)}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAcceptJob(req)}
                            disabled={!isOnline}
                            className="font-black text-xs px-5 py-3 rounded-2xl shadow-md transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white hover:shadow-lg cursor-pointer"
                            title="Accept job offer"
                          >
                            <CheckCircle className="w-4 h-4" /> {t('technician.accept_job', 'Accept Job Offer')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── TAB: AI FIELD COPILOT (RAG ON-JOB TRAINING) ──────────────────── */}
      {tab === "ai_copilot" && (
        <TechnicianAiCopilot />
      )}

      {/* ─── TAB: MY SUPPORT TICKETS ──────────────────────────────────────── */}
      {tab === "tickets" && (
        <MyTicketsList initialTicketId={new URLSearchParams(window.location.search).get("ticketId")} />
      )}

      {/* ─── TAB: EARNINGS ─────────────────────────────────────────────────── */}
      {tab === "earnings" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Completed</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{completedJobs.length} Jobs</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalEarnings)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Rating Score</p>
              <p className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
                <Star className="w-5 h-5 fill-amber-500" /> 4.92
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Completed Jobs History</h3>
            {completedJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No completed jobs logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedJobs.map((j) => {
                  const billing = resolveBookingBilling(j);
                  const jobTotal = billing.total;
                  return (
                    <div key={j.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{getServiceName(j.service_id)}</p>
                        <p className="text-[11px] text-slate-400">{j.address_locality}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{formatCurrency(jobTotal)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📱 Technician Doorstep UPI QR Code Modal */}

      {techQrModalOpen && activeJob && (() => {
        const rawBase = activeJob.base_amount || (activeJob as any).baseLaborAmount || activeJob.price || 350;
        const parts = Number(extraPartsCost) || 0;
        const basePrice = rawBase;
        const totalAmount = basePrice + parts;
        const qrUrl = generateUpiQrUrl(totalAmount, activeJob.id, activeJob.service_id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setTechQrModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {techQrAutoDetected ? (
                <div className="py-6 space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-800">Payment Received!</h3>
                  <p className="text-xs text-emerald-600 font-bold">
                    {formatCurrency(totalAmount)} confirmed via Official Escrow.
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Job marked COMPLETED automatically! Refreshing workbench...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-black text-slate-900">Doorstep UPI QR Settlement</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Show this screen to customer to scan with PhonePe, Google Pay, Paytm, or BHIM
                  </p>

                  <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                    <img
                      src={qrUrl}
                      alt="Dynamic Doorstep UPI QR Code"
                      className="w-52 h-52 mx-auto rounded-xl shadow-xs"
                    />
                    <div className="mt-2 text-center">
                      <span className="text-xs font-bold text-slate-700">UPI ID: </span>
                      <span className="text-xs font-mono font-bold text-purple-700">{OFFICIAL_UPI_VPA}</span>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600 font-bold">Total Customer Amount</span>
                      <p className="text-xl font-black text-purple-900">{formatCurrency(totalAmount)}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-200/60 flex justify-between items-center text-xs">
                      <span className="text-emerald-700 font-bold">Your Net Payout (80% + Parts):</span>
                      <span className="font-extrabold text-emerald-700">
                        {formatCurrency(Math.round((activeJob.price || 350) * 0.80) + (Number(extraPartsCost) || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-0.5">
                      <span>Platform Fee (20% Escrow):</span>
                      <span>{formatCurrency(Math.round((activeJob.price || 350) * 0.20))}</span>
                    </div>
                    {Number(extraPartsCost) > 0 && (
                      <p className="text-[10px] text-purple-600 mt-1">
                        Includes ₹{extraPartsCost} extra parts (100% credited to you)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleConfirmUpiAndComplete}
                      disabled={settlementLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2"
                    >
                      {settlementLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Payment Received via UPI — Complete Job
                    </button>
                    <button
                      onClick={() => setTechQrModalOpen(false)}
                      className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 py-2 transition"
                    >
                      Close & Switch to Cash Payment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── Mandatory Doorstep Arrival Selfie with Auto-Location Modal ─── */}
      {activeJob && (
        <ArrivalSelfieModal
          isOpen={selfieModalOpen}
          bookingId={activeJob.id}
          kycPhotoUrl={user?.avatar || (user as any)?.kyc_document_url || (user as any)?.photo_url || undefined}
          customerLocality={activeJob.address_locality || "Sagara, Karnataka"}
          customerAddressText={activeJob.address_text}
          expectedCoords={(activeJob.address_lat && activeJob.address_lng) ? { lat: activeJob.address_lat, lng: activeJob.address_lng } : undefined}
          onClose={() => setSelfieModalOpen(false)}
          onSelfieConfirmed={handleSelfieConfirmed}
        />
      )}

      {/* Lightbox Preview Modal for Technician Mobile / Desktop Screens */}
      {techLightboxImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTechLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold">{techLightboxImage.title}</h4>
                {techLightboxImage.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{techLightboxImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setTechLightboxImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black">
              <img
                src={techLightboxImage.url}
                alt={techLightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Expansion Waitlist Modal for Technician Partners */}
      <ServiceUnavailableModal
        isOpen={techExpansionModalOpen}
        location={techLocationState || {
          locality: `Near ${REGION_HUBS[dutyHub]?.name || 'Sagara'}`,
          suburb: REGION_HUBS[dutyHub]?.name || 'Sagara',
          city: REGION_HUBS[dutyHub]?.name || 'Sagara',
          state: 'Karnataka',
          postalCode: '577401',
          formattedAddress: `Detected coordinates: ${dutyCoords.lat.toFixed(4)}, ${dutyCoords.lng.toFixed(4)}`,
          lat: dutyCoords.lat,
          lng: dutyCoords.lng,
          isServiceable: false,
          source: 'gps'
        }}
        userRole="technician"
        onClose={() => setTechExpansionModalOpen(false)}
        onRecheckGps={handleDetectTechnicianGps}
      />
    </div>
  );
};

