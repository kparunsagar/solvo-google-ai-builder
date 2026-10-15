import React, { useState } from "react";
import {
  BadgeCheck, User, Star, Shield, QrCode, Fingerprint,
  CheckCircle, AlertTriangle, X, Camera, Phone, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TechnicianVerificationData {
  technician_id: string;
  technician_name: string;
  tech_uid?: string;        // Unique Tech ID e.g. UD-SGR-00412
  photo_url?: string;
  masked_phone?: string;    // Urban Daily Robo Telephony Bridge (hiding real mobile number)
  rating?: number;
  reviews_count?: number;
  skills?: string[];
  aadhaar_verified?: boolean;
  background_checked?: boolean;
  skill_certified?: boolean;
  device_bound?: boolean;
  gender?: string;
  years_experience?: number;
  // Live verification and AI match fields
  arrival_selfie_url?: string;
  worklocation_photo_url?: string;
  arrival_selfie_locality?: string;
  arrival_selfie_timestamp?: string;
  arrival_selfie_coords?: { lat: number; lng: number };
  ai_face_match_score?: number;
  ai_face_match_status?: string;
  ai_face_match_summary?: string;
}

interface Props {
  tech: TechnicianVerificationData;
  safetyMode?: "DOOR_OPEN" | "DOOR_PARTIAL" | "DOOR_CLOSED";
  onClose?: () => void;
  inline?: boolean;
}

const SAFETY_MODE_LABELS = {
  DOOR_OPEN: { label: "Door Open Mode", color: "emerald", icon: "🚪" },
  DOOR_PARTIAL: { label: "Door Partial Mode", color: "blue", icon: "🔰" },
  DOOR_CLOSED: { label: "Door Closed Mode", color: "purple", icon: "🔒" },
};

export const TechnicianVerificationCard: React.FC<Props> = ({
  tech,
  safetyMode,
  onClose,
  inline = false,
}) => {
  const isAiMatched = tech.ai_face_match_status === "VERIFIED_MATCH" || (tech.ai_face_match_score !== undefined && tech.ai_face_match_score >= 75);
  const [photoVerified, setPhotoVerified] = useState(isAiMatched);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const initials = tech.technician_name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const safetyInfo = safetyMode ? SAFETY_MODE_LABELS[safetyMode] : null;

  const card = (
    <div className={cn(
      "bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden max-h-[92vh] flex flex-col",
      !inline && "max-w-md w-full"
    )}>
      {/* Green verified header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-200" />
            <span className="text-sm font-black">Urban Daily Verified</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-emerald-800/50 rounded-lg transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-emerald-100 text-xs">
          Identity verified • Background checked • KYC verified technician
        </p>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Photo + Name Row */}
        <div className="flex items-center gap-4">
          {tech.photo_url ? (
            <img
              src={tech.photo_url}
              alt={tech.technician_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-200 shadow-xs cursor-pointer"
              onClick={() => tech.photo_url && setPreviewImage({ url: tech.photo_url, title: `${tech.technician_name} - Registered KYC Photo` })}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white text-xl font-black border-2 border-blue-200">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <p className="font-black text-slate-900 text-base">{tech.technician_name}</p>
            {tech.tech_uid && (
              <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                <QrCode className="w-3 h-3" />
                Tech ID: <span className="font-bold text-slate-700">{tech.tech_uid}</span>
              </p>
            )}
            {tech.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-700">{tech.rating}</span>
                {tech.reviews_count && (
                  <span className="text-xs text-slate-400">({tech.reviews_count} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Doorstep Physical & Biometric Status (Customer Safe Profile - Raw photos segregated to Admin Panel) */}
        {tech.arrival_selfie_locality && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-950">Doorstep Arrival Verified</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                GPS Verified
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Technician physical presence confirmed at <strong>{tech.arrival_selfie_locality}</strong>.
            </p>
            {tech.arrival_selfie_timestamp && (
              <p className="text-[10px] text-emerald-700">
                Arrival Timestamp: {tech.arrival_selfie_timestamp}
              </p>
            )}
          </div>
        )}

        {/* Identity Verification Badges */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Government & Platform KYC</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Aadhaar Verified", ok: tech.aadhaar_verified !== false, icon: Fingerprint },
              { label: "Background Checked", ok: tech.background_checked !== false, icon: Shield },
              { label: "Skill Evaluated", ok: tech.skill_certified !== false, icon: BadgeCheck },
              { label: "Device Bound", ok: tech.device_bound !== false, icon: User },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium",
                    item.ok
                      ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                      : "border-red-200 bg-red-50/60 text-red-800"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.ok ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo Match Confirmation Toggle */}
        <div
          className={cn(
            "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all",
            photoVerified
              ? "border-emerald-400 bg-emerald-50/70"
              : "border-amber-300 bg-amber-50/60"
          )}
          onClick={() => setPhotoVerified(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-slate-900">
                {photoVerified ? "✅ Doorstep Photo Confirmed" : "⚠️ Verify Technician Photo"}
              </p>
              <p className="text-[11px] text-slate-500">
                {photoVerified
                  ? "Identity and doorstep arrival verified with ID"
                  : "Tap to confirm the technician matches the photos above"}
              </p>
            </div>
          </div>
          <div className={cn(
            "w-9 h-5 rounded-full relative flex-shrink-0",
            photoVerified ? "bg-emerald-500" : "bg-slate-200"
          )}>
            <div
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
              style={{ left: photoVerified ? "18px" : "2px" }}
            />
          </div>
        </div>

        {/* Safety Mode Reminder */}
        {safetyInfo && (
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-xl border text-xs",
            `border-${safetyInfo.color}-200 bg-${safetyInfo.color}-50/60 text-${safetyInfo.color}-900`
          )}>
            <span className="text-base">{safetyInfo.icon}</span>
            <div>
              <p className="font-bold">Your Safety Mode: {safetyInfo.label}</p>
              <p className="text-[11px] mt-0.5 opacity-80">Technician has been briefed on your safety preference</p>
            </div>
          </div>
        )}

        {/* Masked Telephony Strip (Hiding Real Mobile Number) */}
        {tech.masked_phone && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{tech.masked_phone}</p>
                <p className="text-[10px] text-emerald-800 font-medium">🛡️ Real mobile number hidden for safety (Robo Bridge)</p>
              </div>
            </div>
            <a
              href={`tel:${tech.masked_phone.replace(/[^0-9+]/g, '')}`}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
            >
              Call
            </a>
          </div>
        )}

        {/* In-App Communication Note */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Phone numbers are hidden.</strong> All communication happens through Urban Daily's secure in-app channel.
            Technicians cannot see your personal contact details.
          </p>
        </div>
      </div>

      {/* Lightbox Preview Modal for High-Resolution Inspection on Mobile / Desktop */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold">{previewImage.title}</h4>
                {previewImage.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{previewImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return card;

  return (
    <div className="fixed inset-0 z-[180] bg-black/60 flex items-end sm:items-center justify-center p-4">
      {card}
    </div>
  );
};
