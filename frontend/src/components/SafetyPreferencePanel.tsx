import React, { useState } from "react";
import {
  Shield, User, Users, Home, DoorOpen, Lock, Heart,
  Phone, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SafetyMode = "DOOR_OPEN" | "DOOR_PARTIAL" | "DOOR_CLOSED";
export type TechnicianGenderPreference = "NO_PREFERENCE" | "MALE" | "FEMALE";

export interface SafetyPreferences {
  safety_mode: SafetyMode;
  alone_at_home: boolean;
  gender_preference: TechnicianGenderPreference;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notify_emergency_contact: boolean;
}

export const DEFAULT_SAFETY_PREFS: SafetyPreferences = {
  safety_mode: "DOOR_PARTIAL",
  alone_at_home: false,
  gender_preference: "NO_PREFERENCE",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notify_emergency_contact: false,
};

interface Props {
  value: SafetyPreferences;
  onChange: (prefs: SafetyPreferences) => void;
  compact?: boolean;
}

const DOOR_MODES: { mode: SafetyMode; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  {
    mode: "DOOR_OPEN",
    label: "Door Open",
    desc: "Technician enters freely — best for large jobs",
    icon: DoorOpen,
    color: "emerald",
  },
  {
    mode: "DOOR_PARTIAL",
    label: "Door Partial",
    desc: "Technician works in defined area only (recommended)",
    icon: Shield,
    color: "blue",
  },
  {
    mode: "DOOR_CLOSED",
    label: "Door Closed",
    desc: "All work done outside / at balcony / exterior only",
    icon: Lock,
    color: "purple",
  },
];

const GENDER_OPTIONS: { value: TechnicianGenderPreference; label: string; emoji: string }[] = [
  { value: "NO_PREFERENCE", label: "No Preference", emoji: "👤" },
  { value: "FEMALE", label: "Prefer Female", emoji: "👩" },
  { value: "MALE", label: "Prefer Male", emoji: "👨" },
];

export const SafetyPreferencePanel: React.FC<Props> = ({ value, onChange, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);
  const set = (patch: Partial<SafetyPreferences>) => onChange({ ...value, ...patch });

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500 bg-emerald-50/60 text-emerald-900",
    blue: "border-blue-500 bg-blue-50/60 text-blue-900",
    purple: "border-purple-500 bg-purple-50/60 text-purpleald-900",
  };

  const selectedMode = DOOR_MODES.find(d => d.mode === value.safety_mode)!;
  const SelIcon = selectedMode.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">Safety Preferences</span>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Urban Daily Shield
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <SelIcon className="w-3 h-3" />
              {selectedMode.label}
              {value.alone_at_home && <span className="text-amber-600 font-bold"> · Alone</span>}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-5">
          {/* Safety Info Banner */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Your safety, our priority</p>
              <p className="text-blue-800 mt-0.5 leading-relaxed">
                Set your comfort level. All technicians see your safety mode before arriving.
                Phone numbers are never shared — all communication happens in-app only.
              </p>
            </div>
          </div>

          {/* Alone at Home Toggle */}
          <div
            className={cn(
              "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer",
              value.alone_at_home
                ? "border-amber-400 bg-amber-50/70"
                : "border-slate-200 hover:border-slate-300"
            )}
            onClick={() => set({ alone_at_home: !value.alone_at_home })}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                value.alone_at_home ? "bg-amber-100" : "bg-slate-100"
              )}>
                <User className={cn("w-5 h-5", value.alone_at_home ? "text-amber-700" : "text-slate-500")} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">I am alone at home</p>
                <p className="text-xs text-slate-500">
                  {value.alone_at_home
                    ? "⚠️ Safety team gets periodic check-in alerts during service"
                    : "Technician safety mode is standard"}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-11 h-6 rounded-full relative transition-all flex-shrink-0",
              value.alone_at_home ? "bg-amber-500" : "bg-slate-200"
            )}>
              <div className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all",
                value.alone_at_home ? "left-5.5" : "left-0.5"
              )} style={{ left: value.alone_at_home ? "22px" : "2px" }} />
            </div>
          </div>

          {/* Door Mode Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Door Open Mode — Technician Workspace Boundary
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DOOR_MODES.map(dm => {
                const Icon = dm.icon;
                const isSelected = value.safety_mode === dm.mode;
                return (
                  <button
                    key={dm.mode}
                    type="button"
                    onClick={() => set({ safety_mode: dm.mode })}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                      isSelected
                        ? colorMap[dm.color]
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected ? "" : "text-slate-400")} />
                    <div className="text-xs font-bold">{dm.label}</div>
                    <div className="text-[10px] leading-tight text-slate-500">{dm.desc}</div>
                    {isSelected && <CheckCircle className="w-3 h-3 self-end" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender Preference */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Technician Gender Preference
              <span className="text-[10px] font-normal text-slate-400 ml-1">(Best effort, subject to availability)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ gender_preference: opt.value })}
                  className={cn(
                    "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                    value.gender_preference === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                      : "border-slate-200 text-slate-600 text-xs font-medium hover:border-slate-300"
                  )}
                >
                  <div className="text-base">{opt.emoji}</div>
                  <div className="text-[11px] mt-0.5">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              Emergency / Trusted Contact
              <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Contact Name"
                value={value.emergency_contact_name}
                onChange={e => set({ emergency_contact_name: e.target.value })}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
              <input
                type="tel"
                placeholder="+91 98450 00000"
                value={value.emergency_contact_phone}
                onChange={e => set({ emergency_contact_phone: e.target.value })}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>

            {(value.emergency_contact_name || value.emergency_contact_phone) && (
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                  value.notify_emergency_contact
                    ? "border-emerald-400 bg-emerald-50/60"
                    : "border-slate-200"
                )}
                onClick={() => set({ notify_emergency_contact: !value.notify_emergency_contact })}
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-700">
                    Notify <strong>{value.emergency_contact_name || "contact"}</strong> when technician is assigned
                  </span>
                </div>
                <div className={cn(
                  "w-9 h-5 rounded-full relative transition-all flex-shrink-0",
                  value.notify_emergency_contact ? "bg-emerald-500" : "bg-slate-200"
                )}>
                  <div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                    style={{ left: value.notify_emergency_contact ? "18px" : "2px" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* In-App Comms Notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">In-App Communication Only</p>
              <p className="leading-relaxed mt-0.5">
                Your personal phone number is <strong>never shared</strong> with technicians.
                All calls and messages go through Urban Daily's masked communication layer.
                Technicians violating this policy are immediately de-platformed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
