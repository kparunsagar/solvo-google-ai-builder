import React, { useState } from 'react';
import {
  MapPin, Compass, Navigation, Eye, Layers, ExternalLink,
  Crosshair, ShieldCheck, CheckCircle2, Copy, Check
} from 'lucide-react';
import {
  SAGARA_LOCALITIES,
  REGION_HUBS,
  findLocalityByCoords,
  detectRegionFromLocality,
  SagaraLocality
} from '../data/sagara-localities';
import { cn } from '@/lib/utils';

interface SagaraMapProps {
  customerLocality?: string;
  customerLat?: number;
  customerLng?: number;
  landmark?: string;
  providerName?: string;
  providerDistanceKm?: number;
  status?: string;
  initialMode?: 'radar' | 'streetview';
}

export const SagaraMap: React.FC<SagaraMapProps> = ({
  customerLocality = 'Gandhi Nagar, Sagara',
  customerLat,
  customerLng,
  landmark,
  providerName = 'Assigned Technician',
  providerDistanceKm = 1.2,
  status = 'ACCEPTED',
  initialMode = 'radar'
}) => {
  const [viewMode, setViewMode] = useState<'radar' | 'streetview'>(initialMode);
  const [copied, setCopied] = useState(false);

  // 1. Resolve active locality metadata
  const detectedRegionKey = detectRegionFromLocality(customerLocality);
  const hubConfig = REGION_HUBS[detectedRegionKey] || REGION_HUBS.sagara;

  // Find exact matching locality or closest locality
  const matchedLocality: SagaraLocality = React.useMemo(() => {
    if (customerLat && customerLng) {
      return findLocalityByCoords(customerLat, customerLng);
    }
    const found = SAGARA_LOCALITIES.find(
      (l) =>
        customerLocality.toLowerCase().includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(customerLocality.toLowerCase())
    );
    if (found) return found;

    // Fall back to hub center of detected region
    return (
      SAGARA_LOCALITIES.find((l) => l.region === detectedRegionKey) ||
      SAGARA_LOCALITIES[0]
    );
  }, [customerLocality, customerLat, customerLng, detectedRegionKey]);

  const activeLat = customerLat || matchedLocality.lat;
  const activeLng = customerLng || matchedLocality.lng;
  const extractedStreetOrArea = customerLocality ? customerLocality.split(',')[0].trim() : '';
  const activeLocalityName = extractedStreetOrArea || matchedLocality.name;
  const activeLandmark = landmark || (customerLocality && customerLocality !== activeLocalityName ? customerLocality : matchedLocality.landmark);
  const activeRegionName = matchedLocality.regionName;
  const activePincode = matchedLocality.pincode;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${activeLat}, ${activeLng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeLat},${activeLng}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - 0.005}%2C${activeLat - 0.0035}%2C${activeLng + 0.005}%2C${activeLat + 0.0035}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all mb-4">
      {/* ── Header with Region & Mode Switcher ─────────────────────────── */}
      <div className="p-4 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 tracking-tight">
                {activeRegionName} Hyperlocal Dispatch & Street View Radar
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Hub (PIN: {activePincode})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Identified Locality: <strong className="text-slate-800">{activeLocalityName}</strong> • {activeLandmark}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl text-xs font-bold border border-slate-200/70">
          <button
            type="button"
            onClick={() => setViewMode('radar')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'radar'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Radar View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('streetview')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'streetview'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200/60'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Street View</span>
          </button>
        </div>
      </div>

      {/* ── View 1: Hyperlocal Radar Canvas ──────────────────────────────── */}
      {viewMode === 'radar' && (
        <div className="h-56 relative bg-slate-100 flex items-center justify-center overflow-hidden">
          {/* Grid pattern background */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(#94a3b8 1.5px, transparent 1.5px),
                linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px, 48px 48px, 48px 48px'
            }}
          />

          {/* Regional Landmark Markers according to active town */}
          {detectedRegionKey === 'hosanagara' && (
            <>
              <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Sharavathi Backwater ↗
              </div>
              <div className="absolute bottom-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                ↙ Nagar Fort (Bidanur)
              </div>
              <div className="absolute top-3 right-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Riponpet / Mini Vidhana Soudha ↗
              </div>
            </>
          )}

          {detectedRegionKey === 'honnali' && (
            <>
              <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Tungabhadra River Ghat ↗
              </div>
              <div className="absolute bottom-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                ↙ TB Circle & Mini Vidhana Soudha
              </div>
              <div className="absolute top-3 right-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Shikaripura Road ↗
              </div>
            </>
          )}

          {detectedRegionKey === 'sagara' && (
            <>
              <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Keladi Rameshwara Gate ↗
              </div>
              <div className="absolute bottom-3 left-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                ↙ Holebagilu Road & Varada River
              </div>
              <div className="absolute top-3 right-4 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-200">
                Jog Falls Road ↗
              </div>
            </>
          )}

          {/* Dynamic Dispatch Route Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="35%"
              y1="50%"
              x2="65%"
              y2="50%"
              stroke="#2563eb"
              strokeWidth="3"
              strokeDasharray={status === 'ON_THE_WAY' || status === 'EN_ROUTE' ? '6 6' : 'none'}
              className={status === 'ON_THE_WAY' || status === 'EN_ROUTE' ? 'animate-pulse' : ''}
            />
          </svg>

          {/* Customer Doorstep Location Pin */}
          <div
            className="absolute left-[35%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
            title={`${activeLocalityName}, ${activeRegionName}`}
          >
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg ring-4 ring-red-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="mt-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-slate-800 shadow-xs whitespace-nowrap">
              {activeLocalityName}
            </div>
          </div>

          {/* Distance Indicator Pill */}
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md z-20 flex items-center gap-1">
            <span>{providerDistanceKm} km</span>
          </div>

          {/* Technician Dispatch Pin */}
          <div className="absolute left-[65%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-100 animate-bounce">
              <Navigation className="w-5 h-5 rotate-45" />
            </div>
            <div className="mt-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-emerald-800 shadow-xs whitespace-nowrap">
              {providerName}
            </div>
          </div>
        </div>
      )}

      {/* ── View 2: High-Precision Street View & OpenStreetMap Frame ───── */}
      {viewMode === 'streetview' && (
        <div className="relative h-64 bg-slate-900 overflow-hidden">
          <iframe
            title={`Street View Map - ${activeLocalityName}`}
            src={osmEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />

          {/* Doorstep Precision Overlay */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 shadow-lg text-xs max-w-xs pointer-events-auto">
            <div className="flex items-center gap-1.5 text-purple-700 font-extrabold text-[11px] uppercase tracking-wider mb-0.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Street View Locality Identified</span>
            </div>
            <p className="font-black text-slate-900 text-sm">{activeLocalityName}</p>
            <p className="text-[11px] text-slate-500">{activeLandmark} • {activeRegionName}</p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-semibold">
              <span>{activeLat.toFixed(4)}° N, {activeLng.toFixed(4)}° E</span>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy GPS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Action Bar ────────────────────────────────────────────── */}
      <div className="p-3 bg-white border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-600 font-semibold">
            Locality: <strong className="text-slate-900">{activeLocalityName}, {activeRegionName}</strong> (PIN: {activePincode})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* External Google 360° Street View Launcher */}
          <a
            href={streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold border border-purple-200 transition-colors cursor-pointer text-xs"
            title="Open in Google Street View / 360 Panoramic View"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open 360° Street View</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          {/* Standard Google Maps Directions */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
            title="Open in Google Maps Directions"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};
