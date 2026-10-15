import React, { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Search, Navigation, Clock, Crosshair, Sparkles,
  Building2, Loader2, CheckCircle2, History, ArrowRight, Compass
} from 'lucide-react';
import { LocationState, locationService } from '@/services/microservices/location.service';
import { cn } from '@/lib/utils';

interface LocationDrawerProps {
  isOpen: boolean;
  currentLocality: string;
  onClose: () => void;
  onSelect: (label: string, locationState?: LocationState) => void;
  onUnserviceableLocation?: (loc: LocationState) => void;
}

export const LocationDrawer: React.FC<LocationDrawerProps> = ({
  isOpen,
  currentLocality,
  onClose,
  onSelect,
  onUnserviceableLocation,
}) => {
  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationState[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentLocations, setRecentLocations] = useState<LocationState[]>([]);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentLocations(locationService.getRecentLocations());
    } else {
      setSearch('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  // Live dynamic geocoding search as the user types
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await locationService.searchDynamicPlaces(trimmed);
        setSearchResults(results);
      } catch (err) {
        console.warn('Dynamic place search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  const handleSelectLocation = (loc: LocationState) => {
    locationService.saveLocation(loc);
    onSelect(loc.locality, loc);
    onClose();

    if (!loc.isServiceable && onUnserviceableLocation) {
      onUnserviceableLocation(loc);
    }
  };

  const handleSelectCustomTyped = () => {
    const trimmed = search.trim();
    if (!trimmed) return;

    // Build custom address based on user's exact typed query
    const lower = trimmed.toLowerCase();
    const isMarath = lower.includes('marath');
    const isSanjaya = lower.includes('sanjayanagara') || lower.includes('sanjayanagar') || lower.includes('sanjaynagar');
    const isBlr = lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('banaglore') || lower.includes('banglore') || lower.includes('blr') || isMarath || isSanjaya || lower.includes('koramangala') || lower.includes('indiranagar') || lower.includes('whitefield') || lower.includes('hsr') || lower.includes('electronic city') || lower.includes('bellandur') || lower.includes('jayanagar');
    const isHosa = lower.includes('hosa');
    const isHonn = lower.includes('honn');
    const city = isBlr ? 'Bengaluru' : isHosa ? 'Hosanagara' : isHonn ? 'Honnali' : 'Sagara';
    const pincode = isBlr ? (isMarath ? '560037' : '560001') : isHosa ? '577418' : isHonn ? '577217' : '577401';
    const coords = isBlr ? (isMarath ? { lat: 12.9562, lng: 77.7015 } : { lat: 12.9716, lng: 77.5946 }) : isHosa ? { lat: 13.9190, lng: 75.0670 } : isHonn ? { lat: 14.2443, lng: 75.6425 } : { lat: 14.1620, lng: 75.0250 };

    const customState: LocationState = {
      locality: trimmed.toLowerCase().includes(city.toLowerCase()) ? trimmed : `${trimmed}, ${city}`,
      street: trimmed,
      suburb: isMarath ? 'Marathahalli' : city,
      city,
      state: 'Karnataka',
      postalCode: pincode,
      formattedAddress: `${trimmed}, ${city}, Karnataka ${pincode}`,
      lat: coords.lat,
      lng: coords.lng,
      isServiceable: true,
      source: 'manual'
    };

    handleSelectLocation(customState);
  };

  const handleDetectGps = async () => {
    setDetecting(true);
    try {
      const loc = await locationService.resolveLiveLocation({
        enableHighAccuracy: true,
        timeoutMs: 15000,
        forceGps: true
      });
      setDetecting(false);
      onClose();

      locationService.saveLocation(loc);
      if (loc.isServiceable) {
        onSelect(loc.locality, loc);
      } else {
        const label = `${loc.city || loc.locality || 'Unknown'}, ${loc.state || 'Karnataka'}`;
        onSelect(label, loc);
        if (onUnserviceableLocation) {
          onUnserviceableLocation(loc);
        }
      }
    } catch (err) {
      setDetecting(false);
      console.warn('GPS detection failed:', err);
      alert('Unable to acquire precise GPS signal. Please enable device location or search for your street/area.');
    }
  };

  const isSearchActive = search.trim().length >= 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col sm:items-start sm:justify-end sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Select delivery location</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Active in Bengaluru, Sagara, Hosanagara & Honnali
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close location selector"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* "Use My Current Location" GPS Button */}
        <div className="p-4 pb-2">
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detecting}
            className={cn(
              "w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left shadow-xs cursor-pointer",
              detecting
                ? "bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/20"
                : "bg-white hover:bg-blue-50/50 border-slate-200 hover:border-blue-300"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform",
              detecting ? "bg-blue-600 text-white animate-pulse" : "bg-blue-50 text-blue-600 border border-blue-200"
            )}>
              <Crosshair className={cn("w-5 h-5", detecting && "animate-spin")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-700">
                  {detecting ? "Detecting Precise GPS…" : "Use my current location"}
                </span>
                {detecting && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    GPS Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {detecting
                  ? "Click 'Allow' on device prompt to grant GPS access"
                  : "Device-accurate GPS for exact doorstep match"}
              </p>
            </div>
          </button>
        </div>

        {/* Dynamic Search Input */}
        <div className="px-4 pb-3">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.length > 0) {
                    handleSelectLocation(searchResults[0]);
                  } else {
                    handleSelectCustomTyped();
                  }
                }
              }}
              placeholder="Search for area, street name, landmark, town…"
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all font-medium text-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="overflow-y-auto flex-1 px-4 pb-5 space-y-4">
          {/* SEARCH ACTIVE: Dynamic Results + Universal 1-Tap Option */}
          {isSearchActive ? (
            <div className="space-y-2">
              {/* Universal 1-Tap Custom Match Card */}
              <button
                type="button"
                onClick={handleSelectCustomTyped}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100/60 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-900 truncate">
                      Deliver to: <span className="underline font-black">"{search}"</span>
                    </p>
                    <p className="text-[11px] text-blue-600 truncate mt-0.5">
                      Tap to set this exact street / doorstep address
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                <span>Matching Places & Streets</span>
                <span className="text-[11px] font-bold text-slate-500 lowercase">
                  {searchResults.length} results
                </span>
              </div>

              {isSearching && searchResults.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span>Searching live streets and areas…</span>
                </div>
              )}

              <div className="space-y-1">
                {searchResults.map((item, idx) => {
                  const title = item.street || item.locality.split(',')[0] || item.suburb || item.city;
                  const isSelected = currentLocality.toLowerCase().includes(title.toLowerCase());

                  return (
                    <button
                      key={`search-${item.lat}-${item.lng}-${idx}`}
                      type="button"
                      onClick={() => handleSelectLocation(item)}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer border border-transparent',
                        isSelected && 'bg-blue-50/80 border-blue-200'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        item.isServiceable
                          ? isSelected ? 'bg-blue-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      )}>
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={cn(
                            'text-sm font-bold truncate',
                            isSelected ? 'text-blue-700' : 'text-slate-800'
                          )}>
                            {title}
                          </p>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                            item.isServiceable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          )}>
                            {item.isServiceable ? `${item.city}` : 'Coming Soon'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {item.formattedAddress}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SEARCH EMPTY: Clean Modern State with Zero Hardcoded Clutter */
            <div className="space-y-4">
              {/* Currently Selected Location */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Selected Location
                </p>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {currentLocality || 'Sagara, Karnataka'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Doorstep service active in this area
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Locations */}
              {recentLocations.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recent Locations</span>
                  </p>
                  <div className="space-y-1">
                    {recentLocations.map((rec, i) => (
                      <button
                        key={`recent-${rec.lat}-${rec.lng}-${i}`}
                        type="button"
                        onClick={() => handleSelectLocation(rec)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{rec.locality}</p>
                          <p className="text-[11px] text-slate-400 truncate">{rec.formattedAddress}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Automated Service Coverage Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/60 border border-blue-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Automatic Service Detection
                  </p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Urban Company automatically detects your live GPS coordinates to match you with nearby verified professionals in <strong className="text-slate-900">Bengaluru</strong>, <strong className="text-slate-900">Sagara</strong>, <strong className="text-slate-900">Hosanagara</strong>, and <strong className="text-slate-900">Honnali</strong>.
                </p>
                <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                  <span>Need exact doorstep pinning?</span>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    className="underline hover:text-blue-900 font-bold cursor-pointer"
                  >
                    Tap to detect GPS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
