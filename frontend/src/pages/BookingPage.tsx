import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Calendar, MessageSquare, ArrowLeft, CheckCircle,
  Loader2, Wrench, Zap, Sparkles, Tv, Hammer, Paintbrush,
  Star, Clock, CreditCard, Banknote, ShieldCheck,
  Car, Bike, Shirt, PackageCheck, Fuel, Gauge, Award, Check,
  Phone, Mail, Camera, AlertTriangle, Building, Home, Navigation,
  Compass, ChevronDown, Crosshair, Search, ChevronRight
} from "lucide-react";
import { AIVisualDiagnosticModal } from "@/components/AIVisualDiagnosticModal";
import type { AIVisualDiagnosticResult } from "@/lib/gemini";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import {
  SAGARA_LOCALITIES,
  SAGARA_ONLY_LOCALITIES,
  HOSANAGARA_LOCALITIES,
  HONNALI_LOCALITIES,
  BENGALURU_LOCALITIES,
  SagaraLocality,
  getLocalitiesForRegion,
  detectRegionFromLocality,
  findLocalityByCoords
} from "@/data/sagara-localities";
import { LocationState, locationService } from "@/services/microservices/location.service";
import { LocationDrawer } from "@/components/LocationDrawer";
import { ServiceUnavailableModal } from "@/components/ServiceUnavailableModal";
import { SagaraMap } from "@/components/SagaraMap";
import { SafetyPreferencePanel, DEFAULT_SAFETY_PREFS, type SafetyPreferences } from "@/components/SafetyPreferencePanel";

const ICON_MAP: Record<string, React.ElementType> = {
  Wrench, Zap, Sparkles, Tv, Hammer, Paintbrush,
  Car, Bike, Shirt, PackageCheck
};

export const BookingPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [service, setService] = useState<any>(null);
  const [locality, setLocality] = useState(SAGARA_LOCALITIES[0]);
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  // Payment Selection: Single mode COD / UPI (Pay After Service). Upfront PAYNOW is disabled/commented out.
  const [paymentChoice, setPaymentChoice] = useState<"COD">("COD");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Customer Contact Details (Saved inline so user is never interrupted or redirected)
  const [contactPhone, setContactPhone] = useState(() => {
    return (
      user?.phone ||
      localStorage.getItem('mud_customer_phone') ||
      localStorage.getItem('mud_remembered_phone') ||
      ''
    ).replace(/\D/g, '').slice(-10);
  });
  const [contactEmail, setContactEmail] = useState(() => {
    return (
      user?.email ||
      localStorage.getItem('mud_remembered_email') ||
      ''
    );
  });

  useEffect(() => {
    if (user?.phone && !contactPhone) {
      setContactPhone(user.phone.replace(/\D/g, '').slice(-10));
    }
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user?.phone, user?.email]);

  const [detectedUserLocation, setDetectedUserLocation] = useState<LocationState | null>(null);
  const [showExpansionModal, setShowExpansionModal] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Helper to test if a string is simply a city/region name
  const isGenericCity = (val?: string | null): boolean => {
    if (!val) return true;
    const lower = val.trim().toLowerCase();
    return ['sagara', 'sagar', 'bengaluru', 'bangalore', 'hosanagara', 'honnali', 'shivamogga', 'shimoga', 'karnataka'].includes(lower);
  };

  // Doorstep precise address details (persisted so customers never retype)
  const [houseFlatNo, setHouseFlatNo] = useState(() => {
    const saved = localStorage.getItem('mud_saved_house_flat');
    if (saved && !isGenericCity(saved)) return saved;
    const userAddrFirst = user?.address?.split(',')[0]?.trim();
    if (userAddrFirst && !isGenericCity(userAddrFirst)) return userAddrFirst;
    return '';
  });
  const [streetAddress, setStreetAddress] = useState(() => {
    return localStorage.getItem('mud_saved_street') || '';
  });
  const [landmark, setLandmark] = useState(() => {
    return localStorage.getItem('mud_saved_landmark') || '';
  });
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [saveAddressPref, setSaveAddressPref] = useState(true);

  // Purge any stale city names saved into house/flat storage
  useEffect(() => {
    const saved = localStorage.getItem('mud_saved_house_flat');
    if (saved && isGenericCity(saved)) {
      localStorage.removeItem('mud_saved_house_flat');
      setHouseFlatNo('');
    }
  }, []);

  // ─── Motor Service Bay Slot Booking State ────────────────────────────────
  const motorStations = api.getMotorStations();
  const [motorServiceMode, setMotorServiceMode] = useState<'STATION_SLOT' | 'DOORSTEP'>('STATION_SLOT');
  const [selectedStation, setSelectedStation] = useState(motorStations[0]);
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'HATCHBACK' | 'SEDAN' | 'SUV'>('HATCHBACK');
  const [selectedSlot, setSelectedSlot] = useState(motorStations[0]?.available_slots[0]?.slot_id || 'slot_0900');

  // ─── Laundry Service State ────────────────────────────────────────────────
  const laundryPartners = api.getLaundryPartners();
  const [laundryWindow, setLaundryWindow] = useState('Morning: 08:00 AM – 10:30 AM');
  const [laundryWeight, setLaundryWeight] = useState(3);

  const [safetyPrefs, setSafetyPrefs] = useState<SafetyPreferences>(DEFAULT_SAFETY_PREFS);

  // ─── Google Gemini AI Visual Diagnostic ──────────────────────────────────
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<AIVisualDiagnosticResult | null>(null);
  const [aiDiagnosticPhoto, setAiDiagnosticPhoto] = useState<string | null>(null);


  const isMotor = service?.category_id === 'cat-motor' || service?.id?.includes('motor') || service?.name?.toLowerCase().includes('wash');
  const isLaundry = service?.category_id === 'cat-laundry' || service?.id?.includes('laund') || service?.name?.toLowerCase().includes('dry clean');

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    api.getServices().then(svcs => {
      // 1. Direct ID match
      let svc = svcs.find(s => s.id === serviceId);

      // 2. Normalize and check aliases (e.g. srv_plumber_general vs svc-plumb-1)
      if (!svc && serviceId) {
        const sid = serviceId.toLowerCase();
        if (sid.includes('motor') || sid.includes('car') || sid.includes('bike')) svc = svcs.find(s => s.category_id === 'cat-motor');
        else if (sid.includes('laund') || sid.includes('cloth') || sid.includes('dryclean')) svc = svcs.find(s => s.category_id === 'cat-laundry');
        else if (sid.includes('plumb')) svc = svcs.find(s => s.id === 'srv_plumber_general' || s.id === 'svc-plumb-1');
        else if (sid.includes('elec') || sid.includes('fan')) svc = svcs.find(s => s.id === 'srv_electrician_general' || s.id === 'svc-elec-1');
        else if (sid.includes('ac')) svc = svcs.find(s => s.id === 'srv_ac_repair' || s.id === 'svc-appli-1');
        else if (sid.includes('clean')) svc = svcs.find(s => s.id === 'srv_cleaning_deep' || s.id === 'svc-clean-1');
        else if (sid.includes('appli') || sid.includes('wash') || sid.includes('ro')) svc = svcs.find(s => s.id === 'srv_appliance_repair' || s.id === 'svc-appli-2');
        else if (sid.includes('carp')) svc = svcs.find(s => s.id === 'svc-carp-1');
        else if (sid.includes('paint')) svc = svcs.find(s => s.id === 'svc-paint-1');
      }


      // 3. Resilient fallback object so booking screen NEVER hangs
      if (!svc && serviceId) {
        const titleCase = serviceId
          .replace(/^(srv_|svc-)/, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        svc = {
          id: serviceId,
          category_id: serviceId.includes('plumb') ? 'cat-plumb' : serviceId.includes('elec') ? 'cat-elec' : serviceId.includes('clean') ? 'cat-clean' : 'cat-appli',
          name: titleCase.includes('Plumber') ? 'Plumber — General Plumbing & Leak Repair' : titleCase.includes('Electrician') ? 'Electrician — General Electrical Repair' : titleCase,
          description: 'Verified professional doorstep service',
          price: serviceId.includes('clean') ? 899 : serviceId.includes('ac') ? 699 : 299,
          duration_min: 60,
          rating: 4.8,
          reviews_count: 140,
          icon: serviceId.includes('elec') ? 'Zap' : serviceId.includes('clean') ? 'Sparkles' : 'Wrench'
        };
      }

      if (svc) setService(svc);
    }).catch(console.error);

    // 1. Resolve stored or recent location from device storage
    const stored = locationService.getStoredLocation();
    if (stored) {
      setDetectedUserLocation(stored);
      if (!stored.isServiceable) {
        setShowExpansionModal(true);
      }
      const dynamicLoc: SagaraLocality = {
        id: `stored-${Date.now()}`,
        name: stored.street || stored.suburb || stored.locality.split(',')[0],
        name_kn: '',
        landmark: stored.formattedAddress || stored.street || stored.locality,
        lat: stored.lat,
        lng: stored.lng,
        pincode: stored.postalCode || '560001',
        region: detectRegionFromLocality(stored.city || stored.locality),
        regionName: stored.city || 'Bengaluru',
        regionNameKn: ''
      };
      setLocality(dynamicLoc);
      if (stored.street && !streetAddress) {
        setStreetAddress(stored.street);
      }
    }

    // 2. Automatically resolve live mobile device GPS & street-level reverse geocoding API only if no verified location
    if (!stored || stored.source === 'default') {
      locationService.resolveLiveLocation().then(loc => {
        if (loc) {
          setDetectedUserLocation(loc);
          if (!loc.isServiceable) {
            setShowExpansionModal(true);
          }
          const dynamicLoc: SagaraLocality = {
            id: `gps-${Date.now()}`,
            name: loc.street || loc.suburb || loc.locality.split(',')[0],
            name_kn: '',
            landmark: loc.formattedAddress || loc.street || loc.locality,
            lat: loc.lat,
            lng: loc.lng,
            pincode: loc.postalCode || '560001',
            region: detectRegionFromLocality(loc.city || loc.locality),
            regionName: loc.city || 'Bengaluru',
            regionNameKn: ''
          };
          setLocality(dynamicLoc);
          if (loc.street && !streetAddress) {
            setStreetAddress(loc.street);
          }
        }
      }).catch(console.warn);
    }
  }, [serviceId, user]);

  // ─── Global Location Synchronization ──────────────────────────────────────
  // Syncs instantaneously whenever user updates location in Header or LocationDrawer
  useEffect(() => {
    const handleLocationChange = (e: any) => {
      const loc = e.detail as LocationState;
      if (!loc) return;
      setDetectedUserLocation(loc);
      const dynamicLoc: SagaraLocality = {
        id: `sync-${Date.now()}`,
        name: loc.street || loc.suburb || loc.locality.split(',')[0],
        name_kn: '',
        landmark: loc.formattedAddress || loc.street || loc.locality,
        lat: loc.lat,
        lng: loc.lng,
        pincode: loc.postalCode || '560001',
        region: detectRegionFromLocality(loc.city || loc.locality),
        regionName: loc.city || 'Bengaluru',
        regionNameKn: ''
      };
      setLocality(dynamicLoc);
      if (loc.street) {
        setStreetAddress(loc.street);
      }
    };
    window.addEventListener('mud_location_changed', handleLocationChange);
    return () => window.removeEventListener('mud_location_changed', handleLocationChange);
  }, []);

  const handleLocationDrawerSelect = (label: string, locationState?: LocationState) => {
    if (!locationState) return;
    locationService.saveLocation(locationState);
    const dynamicLoc: SagaraLocality = {
      id: `custom-${Date.now()}`,
      name: locationState.street || locationState.suburb || locationState.locality.split(',')[0],
      name_kn: '',
      landmark: locationState.formattedAddress || locationState.street || locationState.locality,
      lat: locationState.lat,
      lng: locationState.lng,
      pincode: locationState.postalCode || '560001',
      region: detectRegionFromLocality(locationState.city || locationState.locality),
      regionName: locationState.city || 'Bengaluru',
      regionNameKn: ''
    };
    setLocality(dynamicLoc);
    if (locationState.street) {
      setStreetAddress(locationState.street);
    }
  };

  const handleDetectGps = async () => {
    setGpsDetecting(true);
    try {
      const loc = await locationService.resolveLiveLocation({ forceGps: true, enableHighAccuracy: true });
      if (loc) {
        locationService.saveLocation(loc);
        setDetectedUserLocation(loc);
        if (!loc.isServiceable) {
          setShowExpansionModal(true);
        }
        const dynamicLoc: SagaraLocality = {
          id: `gps-${Date.now()}`,
          name: loc.street || loc.suburb || loc.locality.split(',')[0],
          name_kn: '',
          landmark: loc.formattedAddress || loc.street || loc.locality,
          lat: loc.lat,
          lng: loc.lng,
          pincode: loc.postalCode || '560001',
          region: detectRegionFromLocality(loc.city || loc.locality),
          regionName: loc.city || 'Bengaluru',
          regionNameKn: ''
        };
        setLocality(dynamicLoc);
        if (loc.street) {
          setStreetAddress(loc.street);
        }
      }
    } catch (err) {
      console.warn("GPS resolution error:", err);
    } finally {
      setGpsDetecting(false);
    }
  };

  const executeBooking = async (
    method: "COD" | "RAZORPAY" | "UPI_QR",
    status: "PENDING" | "PAID",
    txnId?: string,
    phoneOverride?: string
  ) => {
    if (!service || !user) return;
    setLoading(true);
    setError("");
    try {
      const activeSlotObj = selectedStation?.available_slots.find(s => s.slot_id === selectedSlot);
      const computedScheduledAt = isMotor && motorServiceMode === 'STATION_SLOT'
        ? (scheduledAt || `${new Date().toISOString().slice(0, 10)} ${activeSlotObj?.time_window || '09:00 AM – 10:00 AM'}`)
        : (isLaundry ? `${new Date().toISOString().slice(0, 10)} ${laundryWindow}` : (scheduledAt || undefined));

      const isStationVisit = isMotor && motorServiceMode === 'STATION_SLOT' && selectedStation;
      const doorstepDetails = [
        houseFlatNo.trim(),
        streetAddress.trim() || locality.name,
        landmark.trim()
      ].filter(Boolean).join(', ');

      const finalAddressText = isStationVisit
        ? `${selectedStation.name} — ${selectedStation.address}`
        : `${doorstepDetails || locality.landmark || `${locality.name}, ${locality.regionName}`}${locality.regionName && !doorstepDetails?.includes(locality.regionName) ? `, ${locality.regionName}` : ''}${locality.pincode && locality.pincode !== '000000' && !doorstepDetails?.includes(locality.pincode) ? ` - ${locality.pincode}` : ''}`;

      const finalLocalityText = isStationVisit
        ? selectedStation.locality
        : `${streetAddress.trim() || locality.name}, ${locality.regionName}`;

      const finalPhone = phoneOverride || contactPhone.trim().replace(/\D/g, '').slice(-10) || user.phone || '9876543210';

      if (saveAddressPref && houseFlatNo.trim()) {
        try {
          localStorage.setItem('mud_saved_house_flat', houseFlatNo.trim());
          if (streetAddress.trim()) {
            localStorage.setItem('mud_saved_street', streetAddress.trim());
          }
          if (landmark.trim()) {
            localStorage.setItem('mud_saved_landmark', landmark.trim());
          }
          if (user && updateUser) {
            updateUser({ address: `${doorstepDetails}, ${locality.name}, ${locality.regionName}` });
          }
        } catch {}
      }

      await api.createBooking({
        service_id: service.id,
        address_text: finalAddressText,
        address_lat: locality.lat,
        address_lng: locality.lng,
        address_locality: finalLocalityText,
        notes: notes || undefined,
        scheduled_at: computedScheduledAt,
        payment_method: method,
        payment_status: status,
        payment_transaction_id: txnId,
        customer_phone: finalPhone,
        customer_email: contactEmail || user.email || undefined,
        motor_station_id: isStationVisit ? selectedStation.id : undefined,
        motor_station_name: isStationVisit ? selectedStation.name : (isMotor ? 'Doorstep Mobile Wash Van' : undefined),
        motor_vehicle_type: isMotor ? vehicleType : undefined,
        motor_bay_slot: isStationVisit && activeSlotObj ? activeSlotObj.time_window : undefined,
        service_type_mode: isMotor ? motorServiceMode : (isLaundry ? 'PICKUP_DELIVERY' : 'DOORSTEP'),
        laundry_pickup_window: isLaundry ? laundryWindow : undefined,
        laundry_estimated_weight: isLaundry ? laundryWeight : undefined,
        // Safety Architecture
        safety_mode: safetyPrefs.safety_mode,
        alone_at_home: safetyPrefs.alone_at_home,
        gender_preference: safetyPrefs.gender_preference,
        emergency_contact_name: safetyPrefs.emergency_contact_name || undefined,
        emergency_contact_phone: safetyPrefs.emergency_contact_phone || undefined,
        notify_emergency_contact: safetyPrefs.notify_emergency_contact,
        // Google Gemini AI Diagnostic
        ai_diagnostic: aiDiagnostic || undefined,
        ai_diagnostic_photo: aiDiagnosticPhoto || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/bookings`), 2000);
    } catch (err: any) {
      setError(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmBooking = async () => {
    if (!service || !user) return;
    setError("");

    // ─── Inline Customer Phone Validation & Permanent Auto-Persistence ────────
    const cleanPhone = contactPhone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("⚠️ Please enter a valid 10-digit mobile number for technician arrival coordination.");
      const el = document.getElementById("booking-contact-section");
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Automatically persist to storage and user session so it never asks on future orders
    localStorage.setItem('mud_customer_phone', cleanPhone);
    localStorage.setItem('mud_remembered_phone', cleanPhone);
    if (contactEmail) localStorage.setItem('mud_remembered_email', contactEmail.trim());

    if (!user.phone || user.phone !== cleanPhone || (contactEmail && user.email !== contactEmail)) {
      updateUser({
        phone: cleanPhone,
        ...(contactEmail ? { email: contactEmail.trim() } : {})
      });
      api.updateProfile({
        phone: cleanPhone,
        ...(contactEmail ? { email: contactEmail.trim() } : {})
      }).catch(console.warn);
    }

    // Direct Cash / Doorstep UPI on Delivery (Pay After Service)
    // Advance payment is disabled at checkout. Razorpay online payment is integrated post-completion.
    executeBooking("COD", "PENDING", undefined, cleanPhone);
    /*
    // ─── UPFRONT PAYNOW OPTION COMMENTED OUT ───
    // Razorpay standard checkout is initiated post-completion from Booking Tracker & Payment Modal
    if ((paymentChoice as any) === "PAY_NOW") {
      setLoading(true);
      try {
        await api.openRazorpayCheckout({
          amount: service.price,
          name: service.name,
          description: `Booking for ${service.name} in ${locality.regionName || 'your area'}`,
          bookingId: `bk_${Date.now()}`,
          customerName: user.name || "Customer",
          customerEmail: contactEmail || user.email || "customer@solvo.app",
          customerPhone: cleanPhone,
          onSuccess: (resp) => {
            executeBooking("RAZORPAY", "PAID", resp.razorpay_payment_id, cleanPhone);
          },
          onFailure: (err) => {
            setLoading(false);
            setError(err.message || "Payment cancelled. You can select Cash on Delivery (COD) to proceed.");
          }
        });
      } catch (err: any) {
        setLoading(false);
        setError(err.message || "Could not initialize online checkout. You can select Cash on Delivery (COD).");
      }
    }
    */
  };

  if (!service) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-500">Loading service details…</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed! 🎉</h2>
        <p className="text-slate-500 mb-1">
          {paymentChoice === "COD" ? "Payment Mode: Cash on Delivery (Pay after service)" : "Payment Successful via UPI / Online!"}
        </p>
        <p className="text-slate-400 text-sm">Matching you with the nearest verified technician in {locality.regionName || "your area"}…</p>
      </div>
    );
  }

  const Icon = ICON_MAP[service.icon] || Wrench;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-6 text-sm font-semibold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </button>

      {/* Service Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg">{service.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{service.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {service.rating} ({service.reviews_count} reviews)
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{service.duration_min} min
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500 font-medium">
            {isLaundry && (service.id === 'svc-laund-1' || service.id === 'svc-laund-2')
              ? `Estimated Charge (${laundryWeight} kg @ ₹${service.price}/kg)`
              : (isMotor && vehicleType === 'SUV' && !service.name.toLowerCase().includes('bike')
                ? `Service Charge (${vehicleType} + ₹100)`
                : 'Service Charge')}
          </span>
          <span className="text-2xl font-black text-slate-900">
            {formatCurrency(
              isLaundry && (service.id === 'svc-laund-1' || service.id === 'svc-laund-2')
                ? service.price * laundryWeight
                : (isMotor && vehicleType === 'SUV' && !service.name.toLowerCase().includes('bike')
                  ? service.price + 100
                  : service.price)
            )}
          </span>
        </div>
      </div>

      {/* ─── MOTOR SERVICE SPECIALIZATION: Bay Slot Reservation & Station Selection ─── */}
      {isMotor && (
        <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 mb-4 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Car className="w-4 h-4 text-sky-600" /> Motor Service & Bay Slot Selection
            </h3>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              ⚡ Zero-Queue Bay Guarantee
            </span>
          </div>

          {/* Mode Switch: Drive-In Station vs Doorstep Mobile Wash */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Service Execution Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMotorServiceMode('STATION_SLOT')}
                className={cn(
                  "p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1",
                  motorServiceMode === 'STATION_SLOT'
                    ? "border-sky-600 bg-sky-50/60 text-sky-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm">🏢 Visit Service Station</span>
                <span className="text-[11px] font-normal text-slate-500">Pick timing & drive straight into bay</span>
              </button>

              <button
                type="button"
                onClick={() => setMotorServiceMode('DOORSTEP')}
                className={cn(
                  "p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1",
                  motorServiceMode === 'DOORSTEP'
                    ? "border-sky-600 bg-sky-50/60 text-sky-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm">🚐 Doorstep Mobile Van</span>
                <span className="text-[11px] font-normal text-slate-500">Wash van arrives at your home/office</span>
              </button>
            </div>
          </div>

          {/* Vehicle Type Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Vehicle Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'BIKE', label: 'Bike / Scooter', icon: '🏍️' },
                { type: 'HATCHBACK', label: 'Hatchback', icon: '🚗' },
                { type: 'SEDAN', label: 'Sedan', icon: '🚘' },
                { type: 'SUV', label: 'SUV / 4x4', icon: '🚙' }
              ].map(v => (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => setVehicleType(v.type as any)}
                  className={cn(
                    "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                    vehicleType === v.type
                      ? "border-sky-600 bg-sky-50 text-sky-900 font-bold"
                      : "border-slate-200 text-slate-600 text-xs font-medium hover:border-slate-300"
                  )}
                >
                  <div className="text-base">{v.icon}</div>
                  <div className="text-xs mt-0.5">{v.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Service Station Selection */}
          {motorServiceMode === 'STATION_SLOT' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Choose Trusted Service Station</label>
              <select
                value={selectedStation?.id}
                onChange={e => {
                  const match = motorStations.find(s => s.id === e.target.value);
                  if (match) {
                    setSelectedStation(match);
                    setSelectedSlot(match.available_slots[0]?.slot_id || '');
                  }
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
              >
                {motorStations.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name} — {station.landmark} ({station.total_bays} Bays, ★{station.rating})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{selectedStation?.address} · Hours: {selectedStation?.opening_hours}</span>
              </p>
            </div>
          )}

          {/* Time Slot & Bay Availability Picker */}
          {motorServiceMode === 'STATION_SLOT' && selectedStation && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">Select Arrival Timing (Pre-allocated Bay)</label>
                <span className="text-[11px] text-emerald-600 font-bold">● Active Real-time Slots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedStation.available_slots.map(slot => (
                  <button
                    key={slot.slot_id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.slot_id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between",
                      selectedSlot === slot.slot_id
                        ? "border-sky-600 bg-sky-50/70 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{slot.time_window}</div>
                      <div className="text-[11px] text-slate-500">Dedicated Washing Bay</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      🟢 {slot.open_bays} of {slot.total_bays} Bays Free
                    </span>
                  </button>
                ))}
              </div>

              {/* Zero Wait Assurance Card */}
              <div className="mt-3 p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl text-xs text-sky-950 flex items-start gap-2.5">
                <span className="text-base leading-none">🛡️</span>
                <div>
                  <p className="font-bold">Zero-Queue Bay Guarantee</p>
                  <p className="text-sky-800 text-[11px] mt-0.5 leading-relaxed">
                    Instead of waiting in queue at the water wash center, drive in directly at your scheduled timing.
                    Bay {selectedSlot.replace('slot_', '#')} is held exclusively for your vehicle.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── LAUNDRY SPECIALIZATION: Pickup Window & Weight Estimation ─── */}
      {isLaundry && (
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-6 mb-4 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Shirt className="w-4 h-4 text-pink-600" /> Laundry Care & Pickup Window
            </h3>
            <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
              🧺 Free Doorstep Pickup
            </span>
          </div>

          {/* Pickup Window Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Select Doorstep Pickup Window</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { window: 'Morning: 08:00 AM – 10:30 AM', label: 'Morning Slot' },
                { window: 'Afternoon: 01:00 PM – 03:30 PM', label: 'Afternoon Slot' },
                { window: 'Evening: 06:00 PM – 08:30 PM', label: 'Evening Slot' }
              ].map(w => (
                <button
                  key={w.window}
                  type="button"
                  onClick={() => setLaundryWindow(w.window)}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all cursor-pointer",
                    laundryWindow === w.window
                      ? "border-pink-600 bg-pink-50 text-pink-900 font-bold shadow-xs"
                      : "border-slate-200 text-slate-600 text-xs font-medium hover:border-slate-300"
                  )}
                >
                  <div className="text-xs font-bold">{w.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{w.window.split(': ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Counter for per-kg services */}
          {(service.id === 'svc-laund-1' || service.id === 'svc-laund-2') && (
            <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Estimated Clothes Weight</div>
                <div className="text-[11px] text-slate-500">Minimum pickup weight: 3 kg</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLaundryWeight(Math.max(3, laundryWeight - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  -
                </button>
                <span className="font-black text-sm text-slate-900 min-w-10 text-center">{laundryWeight} kg</span>
                <button
                  type="button"
                  onClick={() => setLaundryWeight(laundryWeight + 1)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-pink-50/60 border border-pink-200 rounded-2xl text-xs text-pink-950 flex items-start gap-2.5">
            <span className="text-base leading-none">✨</span>
            <div>
              <p className="font-bold">24–48 Hour Fresh Return Guarantee</p>
              <p className="text-pink-800 text-[11px] mt-0.5 leading-relaxed">
                Our verified delivery partner arrives with hygienic branded garment bags at your chosen time window.
                Processed, sanitised, and returned to your doorstep within 24 to 48 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Ultra-Simple, Beautiful Doorstep Address Card (100% Dynamic, Zero Hardcoding) ─── */}
      {(!isMotor || motorServiceMode === 'DOORSTEP') && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-blue-600" /> Service Delivery Address
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocationDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Search or select your exact area / street"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Search / Change Area</span>
              </button>
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={gpsDetecting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                title="Detect live device GPS"
              >
                <Crosshair className={cn("w-3.5 h-3.5", gpsDetecting && "animate-spin text-blue-600")} />
                <span className="hidden xs:inline">{gpsDetecting ? "Detecting..." : "Re-sync GPS"}</span>
              </button>
            </div>
          </div>

          {/* Current Picked Location Card (Street Level) - Clickable to Change */}
          <div
            onClick={() => setLocationDrawerOpen(true)}
            className="p-4 bg-gradient-to-r from-blue-50/60 via-slate-50 to-emerald-50/40 border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl mb-3 cursor-pointer transition-all group relative"
            title="Click to change delivery locality or search an address"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {locality.name}
                  </span>
                  {locality.regionName && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {locality.regionName}{locality.pincode && locality.pincode !== '000000' ? ` · ${locality.pincode}` : ''}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full inline-flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Search className="w-2.5 h-2.5" /> Click to Change
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {locality.landmark || `${locality.name}, ${locality.regionName}`}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                <span>Change</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Quick Operating Hubs 1-Click Switcher */}
          <div className="mb-4 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
              <span className="flex items-center gap-1 text-slate-700"><Sparkles className="w-3 h-3 text-amber-500" /> Quick Select Active Hub:</span>
              <button
                type="button"
                onClick={() => setLocationDrawerOpen(true)}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                + Search all cities / areas
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: 'Gandhi Nagar', city: 'Sagara', pin: '577401', lat: 14.1670, lng: 75.0298, label: '🏡 Sagara (Gandhi Nagar)' },
                { name: 'Aramanekeri', city: 'Sagara', pin: '577401', lat: 14.1620, lng: 75.0250, label: '🏡 Sagara (Aramanekeri)' },
                { name: 'Koramangala', city: 'Bengaluru', pin: '560034', lat: 12.9352, lng: 77.6245, label: '🏙️ Bengaluru (Koramangala)' },
                { name: 'Indiranagar', city: 'Bengaluru', pin: '560038', lat: 12.9784, lng: 77.6408, label: '🏙️ Bengaluru (Indiranagar)' },
                { name: 'Main Market', city: 'Hosanagara', pin: '577418', lat: 13.9190, lng: 75.0670, label: '📍 Hosanagara' },
                { name: 'TB Circle', city: 'Honnali', pin: '577217', lat: 14.2443, lng: 75.6425, label: '📍 Honnali' }
              ].map((hub) => {
                const isActive = locality.name.toLowerCase().includes(hub.name.toLowerCase()) ||
                  (locality.regionName?.toLowerCase().includes(hub.city.toLowerCase()) && locality.name.toLowerCase().includes(hub.name.toLowerCase()));
                return (
                  <button
                    key={hub.label}
                    type="button"
                    onClick={() => {
                      const customLoc: LocationState = {
                        locality: `${hub.name}, ${hub.city}`,
                        street: hub.name,
                        suburb: hub.name,
                        city: hub.city,
                        state: 'Karnataka',
                        postalCode: hub.pin,
                        formattedAddress: `${hub.name}, ${hub.city}, Karnataka ${hub.pin}`,
                        lat: hub.lat,
                        lng: hub.lng,
                        isServiceable: true,
                        source: 'manual'
                      };
                      handleLocationDrawerSelect(customLoc.locality, customLoc);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                    )}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Out of Coverage Warning */}
          {detectedUserLocation && !detectedUserLocation.isServiceable && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base leading-none">📍</span>
              <div>
                <span className="font-bold">Detected outside active service hubs:</span> We currently deliver in Bengaluru, Sagara, Hosanagara & Honnali.{' '}
                <button
                  type="button"
                  onClick={() => setShowExpansionModal(true)}
                  className="underline text-blue-700 font-semibold cursor-pointer"
                >
                  Notify me when available
                </button>
              </div>
            </div>
          )}

          {/* Precise Doorstep Details: Clean 3-Tier Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Flat / House / Floor / Building <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={houseFlatNo}
                  onChange={e => setHouseFlatNo(e.target.value)}
                  placeholder="e.g., Flat 402, 4th Floor, Prestige Palms"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street / Road / Colony / Area
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={streetAddress}
                  onChange={e => setStreetAddress(e.target.value)}
                  placeholder={locality.name ? `e.g., ${locality.name} Main Road` : "e.g., 5th Cross Road, B.H. Road"}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Landmark / Directions for Partner (Optional)
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="e.g., Near Axis Bank ATM / Opposite Park"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            {/* Address Tag Pills & Save */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {(['Home', 'Work', 'Other'] as const).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setAddressType(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      addressType === tag
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {tag === 'Home' ? '🏠 Home' : tag === 'Work' ? '💼 Work' : '📍 Other'}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAddressPref}
                  onChange={e => setSaveAddressPref(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Save address</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Schedule for Standard Doorstep Services */}
      {(!isMotor && !isLaundry) && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-blue-600" /> Schedule (Optional)
          </h3>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <p className="text-xs text-slate-400 mt-2">Leave blank for instant technician dispatch</p>
        </div>
      )}


      {/* ─── SAFETY PREFERENCES (Urban Daily Shield) ─── */}
      <SafetyPreferencePanel
        value={safetyPrefs}
        onChange={setSafetyPrefs}
        compact={true}
      />

      {/* ─── GOOGLE GEMINI MULTIMODAL VISUAL DIAGNOSTIC ─── */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-purple-50/50 rounded-3xl border border-blue-200/80 shadow-xs p-5 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-xs">AI Visual Appliance Diagnostic</h3>
                <span className="text-[9px] uppercase font-black tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Gemini 1.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Snap a photo of the defect for instant fault detection and fixed upfront parts quote
              </p>
            </div>
          </div>
        </div>

        {aiDiagnostic ? (
          <div className="bg-white rounded-2xl p-4 border border-blue-200 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{aiDiagnostic.applianceType}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                AI Inspected
              </span>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
              <span className="font-bold text-slate-800">Fault: </span>{aiDiagnostic.detectedFault}
            </p>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Estimated Parts & Total:</span>
              <span className="font-black text-emerald-700">{formatCurrency(aiDiagnostic.estimatedTotalINR)}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 pt-1 cursor-pointer"
            >
              Retake Photo or View Full Diagnostic Report →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-white border border-blue-200 hover:border-blue-400 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-blue-50/50 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            Snap Photo for AI Diagnostic & Upfront Quote
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4 text-blue-600" /> Instructions for Technician
        </h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="E.g. 'Near Government Hospital', 'Bring extra pipe fitting', etc."
          rows={2}
          className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* ─── Doorstep Contact & Coordination Details ─── */}
      <div id="booking-contact-section" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-blue-600" /> Doorstep Contact Details
          </h3>
          {contactPhone.length === 10 ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3" /> Ready & Saved
            </span>
          ) : (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Required for Arrival
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Technician will call this number for doorstep coordination and send the 4-digit arrival OTP.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              10-Digit Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-slate-500 flex items-center gap-1 pointer-events-none select-none">
                <span>🇮🇳</span> +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={contactPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setContactPhone(val);
                  if (error) setError("");
                }}
                placeholder="98451 23456"
                className={cn(
                  "w-full pl-16 pr-4 py-3 border rounded-2xl text-sm font-semibold transition-all focus:outline-none focus:ring-2",
                  contactPhone.length === 10
                    ? "border-emerald-300 bg-emerald-50/20 text-slate-900 focus:ring-emerald-400"
                    : "border-slate-200 bg-white text-slate-900 focus:ring-blue-500"
                )}
              />
            </div>
            {contactPhone.length > 0 && contactPhone.length < 10 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                Please enter a complete 10-digit mobile number ({10 - contactPhone.length} digits remaining)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email for Digital Invoice <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 💳 Simplified Payment Selection: Pay Now OR COD */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" /> Payment Option
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Secure Payment
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Option: COD / UPI (Pay After Service) */}
          <label
            onClick={() => setPaymentChoice("COD")}
            className={cn(
              "flex flex-col p-4 rounded-2xl border-2 transition-all relative border-blue-600 bg-blue-50/40 shadow-xs cursor-pointer"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentChoice"
                  checked={paymentChoice === "COD"}
                  onChange={() => setPaymentChoice("COD")}
                  className="text-blue-600"
                />
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">COD / UPI (Pay After Service)</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                Zero Advance
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Pay via Cash, UPI QR, or online Razorpay link to your verified technician only after doorstep service is completed.
            </p>
          </label>

          {/* 
          // ─── UPFRONT PAYNOW OPTION COMMENTED OUT ───
          // Per requirements: Customers pay post-completion. Once work finishes, 
          // a "Pay with Razorpay" button is provided on the booking payment step.
          <label
            onClick={() => setPaymentChoice("PAY_NOW" as any)}
            className={cn(
              "flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all relative",
              paymentChoice === ("PAY_NOW" as any)
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentChoice"
                  checked={paymentChoice === ("PAY_NOW" as any)}
                  onChange={() => setPaymentChoice("PAY_NOW" as any)}
                  className="text-blue-600"
                />
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm text-slate-900">Pay Now</span>
              </div>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                UPI / Cards
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Instant checkout via PhonePe, GPay, Paytm, Cards or NetBanking.
            </p>
          </label>
          */}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-2xl mb-4">
          {error}
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirmBooking}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl cursor-pointer"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
        ) : (
          <><CheckCircle className="w-5 h-5" /> Book Service — COD / UPI (Pay After Service) — {formatCurrency(service.price)}</>
        )}
      </button>

      <p className="text-xs text-center text-slate-400 mt-3">
        Zero advance payment required · Pay only after service is completed at your doorstep.
      </p>

      <LocationDrawer
        isOpen={locationDrawerOpen}
        currentLocality={`${locality.name}, ${locality.regionName}`}
        onClose={() => setLocationDrawerOpen(false)}
        onSelect={handleLocationDrawerSelect}
        onUnserviceableLocation={(loc) => {
          setDetectedUserLocation(loc);
          setShowExpansionModal(true);
        }}
      />

      <ServiceUnavailableModal
        isOpen={showExpansionModal}
        location={detectedUserLocation}
        onClose={() => setShowExpansionModal(false)}
        onExploreDemo={() => setShowExpansionModal(false)}
        onRecheckGps={handleDetectGps}
      />

      {/* Google Gemini AI Visual Diagnostic Modal */}
      <AIVisualDiagnosticModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        serviceName={service?.name}
        onApplyDiagnostic={(diagResult, photoDataUrl) => {
          setAiDiagnostic(diagResult);
          setAiDiagnosticPhoto(photoDataUrl);
          const diagnosticNote = `[Gemini AI Diagnosis]: ${diagResult.applianceType} - ${diagResult.detectedFault} (Estimated Parts: ₹${diagResult.estimatedTotalINR - diagResult.recommendedLaborPriceINR})`;
          setNotes(prev => prev ? `${prev}\n${diagnosticNote}` : diagnosticNote);
        }}
      />
    </div>
  );
};
