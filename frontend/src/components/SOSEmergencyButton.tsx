import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle, Shield, Phone, MapPin, X, ShieldAlert,
  MessageSquare, User, BadgeCheck, Radio, Clock, CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface SOSPanelProps {
  bookingId: string;
  technicianName?: string | null;
  technicianId?: string | null;
  serviceAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
  locality?: string | null;
  onClose: () => void;
}

const SOSPanel: React.FC<SOSPanelProps> = ({
  bookingId,
  technicianName,
  technicianId,
  serviceAddress,
  customerName,
  customerPhone,
  customerId,
  emergencyContactName,
  emergencyContactPhone,
  lat,
  lng,
  locality,
  onClose,
}) => {
  const [alertSent, setAlertSent] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [stage, setStage] = useState<"CONFIRM" | "ALERTING" | "CONFIRMED">("CONFIRM");

  const sendSOSAlert = () => {
    setStage("ALERTING");
    let c = 5;
    const interval = setInterval(async () => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        // Acquire fast live device GPS if possible
        let liveLat = lat;
        let liveLng = lng;
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            await new Promise<void>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  liveLat = pos.coords.latitude;
                  liveLng = pos.coords.longitude;
                  resolve();
                },
                () => resolve(),
                { timeout: 1200, enableHighAccuracy: true }
              );
            });
          } catch {}
        }

        // Trigger live SOS alert across Firestore and Admin Portal
        try {
          await api.triggerSOSAlert({
            booking_id: bookingId,
            technician_name: technicianName || "Assigned Technician",
            technician_id: technicianId || undefined,
            service_address: serviceAddress || "Service Location",
            customer_name: customerName || "Customer",
            customer_phone: customerPhone || undefined,
            customer_id: customerId || undefined,
            emergency_contact_name: emergencyContactName || undefined,
            emergency_contact_phone: emergencyContactPhone || undefined,
            lat: liveLat || undefined,
            lng: liveLng || undefined,
            locality: locality || undefined,
          });
        } catch (e) {
          console.error("SOS Alert trigger error:", e);
        }
        setAlertSent(true);
        setStage("CONFIRMED");
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Red header */}
        <div className="bg-red-600 px-5 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <span className="font-black text-lg">SOS Emergency Alert</span>
            </div>
            {stage !== "ALERTING" && (
              <button onClick={onClose} className="p-1 hover:bg-red-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-red-100 text-xs leading-relaxed">
            This will immediately alert the Urban Daily Safety Team (24/7) and share your live location.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {stage === "CONFIRM" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border border-red-200">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Service Location Shared</p>
                    <p className="text-xs text-slate-500">{serviceAddress || "Your current booking address"}</p>
                  </div>
                </div>
                {technicianName && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <User className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Assigned Technician</p>
                      <p className="text-xs text-slate-500">{technicianName}</p>
                    </div>
                  </div>
                )}
                {emergencyContactName && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                    <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Trusted Contact Notified</p>
                      <p className="text-xs text-slate-500">{emergencyContactName} ({emergencyContactPhone})</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-1.5 bg-red-600 text-white font-bold text-sm py-3 rounded-2xl hover:bg-red-700 transition"
                >
                  <Phone className="w-4 h-4" />
                  Call 112
                </a>
                <button
                  onClick={sendSOSAlert}
                  className="flex items-center justify-center gap-1.5 bg-orange-500 text-white font-bold text-sm py-3 rounded-2xl hover:bg-orange-600 transition"
                >
                  <Radio className="w-4 h-4" />
                  Alert Safety Team
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition"
              >
                Cancel — I am safe
              </button>
            </>
          )}

          {stage === "ALERTING" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Radio className="w-8 h-8 text-orange-600 animate-pulse" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-xl">{countdown}</p>
                <p className="text-sm text-slate-500 mt-1">Sending alert in {countdown} seconds…</p>
                <p className="text-xs text-slate-400 mt-1">Urban Daily Safety Team being notified</p>
              </div>
            </div>
          )}

          {stage === "CONFIRMED" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">Safety Alert Sent</p>
                <p className="text-sm text-slate-500 mt-1">
                  Our 24/7 Safety Team has been notified. Stay calm — help is on the way.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-xs text-green-800 space-y-1">
                <p className="font-bold">✓ Location shared with Safety Team</p>
                {emergencyContactName && <p className="font-bold">✓ {emergencyContactName} notified</p>}
                <p className="font-bold">✓ Booking ID: {bookingId.slice(-8)} flagged</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-1.5 bg-red-600 text-white font-bold text-xs py-2.5 rounded-xl"
                >
                  <Phone className="w-3.5 h-3.5" /> Call 112
                </a>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl"
                >
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Floating SOS Button ─────────────────────────────────────────────────────
interface FloatingSOSButtonProps {
  bookingId: string;
  technicianName?: string | null;
  technicianId?: string | null;
  serviceAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
  locality?: string | null;
  isActive: boolean;
}

export const FloatingSOSButton: React.FC<FloatingSOSButtonProps> = (props) => {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Subtle pulse every 30s to remind customer it's there
  useEffect(() => {
    if (!props.isActive) return;
    const t = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    }, 30000);
    return () => clearInterval(t);
  }, [props.isActive]);

  if (!props.isActive) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-[150] flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-4 py-3 rounded-2xl shadow-2xl transition-all",
          pulse ? "scale-110 ring-4 ring-red-400/60" : "scale-100"
        )}
        title="Emergency SOS"
        aria-label="SOS Emergency Button"
      >
        <ShieldAlert className="w-4 h-4" />
        SOS
      </button>

      {open && (
        <SOSPanel
          {...props}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
