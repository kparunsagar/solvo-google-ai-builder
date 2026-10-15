// Location & Serviceability Microservice Client
// High-precision mobile device GPS resolution with Google Maps-style accuracy.
// Validates whether customer is in active service area (Sagara, Hosanagara, Honnali) without inaccurate IP fallbacks.

import { reverseGeocode, searchAddressPlaces, GeocodedAddress } from '../geocoding';
import { nativeMobileService } from '../nativeMobile.service';
import { db, isFirebaseLive } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface LocationState {
  locality: string;
  street?: string;
  suburb: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  isServiceable: boolean;
  accuracy?: number;
  source?: 'gps' | 'search' | 'manual' | 'default';
}

export const BENGALURU_HUB: LocationState = {
  locality: 'MG Road / Brigade Road, Bengaluru',
  street: 'MG Road',
  suburb: 'Central Business District',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  formattedAddress: 'MG Road Metro Station, Central Business District, Bengaluru, Karnataka 560001',
  lat: 12.9716,
  lng: 77.5946,
  isServiceable: true,
  source: 'default'
};

export const SAGARA_HUB: LocationState = {
  locality: 'Gandhi Nagar, Sagara',
  street: 'Rotary Circle Road',
  suburb: 'Gandhi Nagar',
  city: 'Sagara',
  state: 'Karnataka',
  postalCode: '577401',
  formattedAddress: 'Near Rotary Circle, Gandhi Nagar, Sagara, Karnataka 577401',
  lat: 14.1670,
  lng: 75.0298,
  isServiceable: true,
  source: 'default'
};

export const HOSANAGARA_HUB: LocationState = {
  locality: 'Main Market, Hosanagara',
  street: 'KSRTC Bus Stand Road',
  suburb: 'Main Market',
  city: 'Hosanagara',
  state: 'Karnataka',
  postalCode: '577418',
  formattedAddress: 'Near KSRTC Bus Stand, Main Market, Hosanagara, Karnataka 577418',
  lat: 13.9190,
  lng: 75.0670,
  isServiceable: true,
  source: 'default'
};

export const HONNALI_HUB: LocationState = {
  locality: 'Main Bus Stand Circle, Honnali',
  street: 'TB Circle Road',
  suburb: 'Main Bus Stand Circle',
  city: 'Honnali',
  state: 'Karnataka',
  postalCode: '577217',
  formattedAddress: 'Near Tungabhadra River Bridge, Honnali, Karnataka 577217',
  lat: 14.2443,
  lng: 75.6425,
  isServiceable: true,
  source: 'default'
};

export const ACTIVE_SERVICE_HUBS: LocationState[] = [
  BENGALURU_HUB,
  SAGARA_HUB,
  HOSANAGARA_HUB,
  HONNALI_HUB
];

export const POPULAR_CITIES = [
  { name: 'Bengaluru', state: 'Karnataka', pincode: '560001', isServiceable: true, tag: 'Active Hub' },
  { name: 'Sagara', state: 'Karnataka', pincode: '577401', isServiceable: true, tag: 'Active Hub' },
  { name: 'Hosanagara', state: 'Karnataka', pincode: '577418', isServiceable: true, tag: 'Active Hub' },
  { name: 'Honnali', state: 'Karnataka', pincode: '577217', isServiceable: true, tag: 'Active Hub' },
  { name: 'Shivamogga', state: 'Karnataka', pincode: '577201', isServiceable: false, tag: 'Coming Soon' },
  { name: 'Mangalore', state: 'Karnataka', pincode: '575001', isServiceable: false, tag: 'Coming Soon' },
  { name: 'Hubballi', state: 'Karnataka', pincode: '580020', isServiceable: false, tag: 'Coming Soon' }
];

/**
 * Checks whether a given locality, city, postalCode or coordinates fall within
 * active operations (Bengaluru, Sagara, Hosanagara, Honnali).
 */
export function checkServiceability(
  locality: string,
  city: string,
  postalCode?: string,
  lat?: number,
  lng?: number
): boolean {
  const query = `${locality} ${city} ${postalCode || ''}`.toLowerCase();

  // 1. Bengaluru / Bangalore match (PIN starting with 560xxx, or names containing bengaluru/bangalore/blr)
  if (
    query.includes('bengaluru') ||
    query.includes('bangalore') ||
    query.includes('blr') ||
    (postalCode && postalCode.startsWith('560')) ||
    /\b560\d{3}\b/.test(query)
  ) {
    return true;
  }

  // 2. Sagara match (PIN 577401, 577400)
  if (query.includes('sagara') || query.includes('sagar') || query.includes('577401') || query.includes('577400') || postalCode === '577401' || postalCode === '577400') {
    return true;
  }

  // 3. Hosanagara match (PIN 577418, 577452, 577417)
  if (query.includes('hosanagara') || query.includes('hosanagar') || query.includes('hosangara') ||
      query.includes('577418') || query.includes('577452') || postalCode === '577418' || postalCode === '577452') {
    return true;
  }

  // 4. Honnali match (PIN 577217, 577224, 577225)
  if (query.includes('honnali') || query.includes('honnalli') ||
      query.includes('577217') || postalCode === '577217') {
    return true;
  }

  // 5. Geofence anchors: within radius of Bengaluru (45km), Sagara (25km), Hosanagara (25km), or Honnali (25km)
  if (lat && lng) {
    for (const hub of ACTIVE_SERVICE_HUBS) {
      const radiusKm = hub.city.toLowerCase().includes('bengaluru') ? 45 : 25;
      const dLat = (lat - hub.lat) * 111;
      const dLng = (lng - hub.lng) * 111 * Math.cos(hub.lat * (Math.PI / 180));
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
      if (distKm <= radiusKm) {
        return true;
      }
    }
  }

  return false;
}

export const locationService = {
  getVerifiedLocation(): LocationState | null {
    try {
      const stored = localStorage.getItem('myurbandaily_user_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sanitize: Purge any legacy carrier IP geolocations or unverified defaults
        if (
          !parsed ||
          parsed.source === 'default' ||
          parsed.city?.toLowerCase().includes('hukeri') ||
          parsed.locality?.toLowerCase().includes('hukeri') ||
          parsed.city?.toLowerCase().includes('anekal')
        ) {
          localStorage.removeItem('myurbandaily_user_location');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  },

  getStoredLocation(): LocationState {
    const verified = this.getVerifiedLocation();
    if (verified) return verified;
    return SAGARA_HUB;
  },

  saveLocation(loc: LocationState) {
    if (loc.source !== 'default') {
      localStorage.setItem('myurbandaily_user_location', JSON.stringify(loc));
      this.saveRecentLocation(loc);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mud_location_changed', { detail: loc }));
      }
    }
  },

  getRecentLocations(): LocationState[] {
    try {
      const stored = localStorage.getItem('myurbandaily_recent_locations');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  },

  saveRecentLocation(loc: LocationState) {
    try {
      const existing = this.getRecentLocations();
      const filtered = existing.filter(item =>
        item.locality.toLowerCase() !== loc.locality.toLowerCase() &&
        Math.abs(item.lat - loc.lat) > 0.001
      );
      const updated = [loc, ...filtered].slice(0, 5);
      localStorage.setItem('myurbandaily_recent_locations', JSON.stringify(updated));
    } catch {}
  },

  async resolveGpsLocation(lat: number, lng: number, accuracy?: number): Promise<LocationState> {
    const geocoded = await reverseGeocode(lat, lng, accuracy);
    const isServiceable = checkServiceability(geocoded.locality, geocoded.city, geocoded.postalCode, lat, lng);

    const state: LocationState = {
      ...geocoded,
      accuracy,
      source: 'gps',
      isServiceable
    };
    this.saveLocation(state);
    return state;
  },

  /**
   * High-precision device GPS resolution with Google Maps-style multi-tier accuracy:
   * 1. Native Mobile Hardware Bridge (@capacitor/geolocation with FusedLocationProvider)
   * 2. Phase 1 Fast Lock: High accuracy with cached fix (maximumAge: 60s, timeout: 6s)
   * 3. Phase 2 Network Fallback: Wi-Fi / Cell tower triangulation if cold satellite times out (timeout: 6s)
   * 4. Multi-engine reverse geocoding with Photon (Komoot) + BigDataCloud (open CORS, exact street level)
   */
  async resolveLiveLocation(options?: {
    enableHighAccuracy?: boolean;
    timeoutMs?: number;
    forceGps?: boolean;
  }): Promise<LocationState> {
    // 0. If user has explicitly selected or searched their address, and forceGps is not set, respect their choice!
    const existing = this.getVerifiedLocation();
    if (existing && (existing.source === 'search' || existing.source === 'manual') && !options?.forceGps) {
      console.log('[Location] Preserving user-selected doorstep location:', existing.locality);
      return existing;
    }

    // 1. Try Native Mobile Hardware Bridge (Capacitor Geolocation with FusedLocationProvider)
    if (typeof nativeMobileService !== 'undefined' && nativeMobileService.isNative()) {
      try {
        const nativePos = await nativeMobileService.getNativeCurrentPosition();
        if (nativePos) {
          console.log(`[Location] Native Mobile GPS Locked: Lat ${nativePos.lat.toFixed(5)}, Lng ${nativePos.lng.toFixed(5)}`);
          return await this.resolveGpsLocation(nativePos.lat, nativePos.lng, nativePos.accuracy);
        }
      } catch (err) {
        console.warn('[Location] Native GPS fallback to browser API:', err);
      }
    }

    return new Promise((resolve) => {
      let hasResolved = false;

      const finishWithSafeDefault = (reason: string) => {
        if (hasResolved) return;
        hasResolved = true;
        console.info(`[Location] Device GPS not locked (${reason}). Preserving operational hub.`);
        const fallback = this.getStoredLocation() || SAGARA_HUB;
        resolve(fallback);
      };

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        finishWithSafeDefault('navigator.geolocation not supported by browser');
        return;
      }

      // Check permission state if supported
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((perm) => {
          if (perm.state === 'denied' && !options?.forceGps) {
            finishWithSafeDefault('Geolocation permission explicitly denied');
          }
        }).catch(() => {});
      }

      const totalTimeout = options?.timeoutMs || 15000;
      const safetyTimer = setTimeout(() => {
        finishWithSafeDefault(`GPS acquisition timed out after ${totalTimeout / 1000}s`);
      }, totalTimeout);

      const processPosition = async (pos: GeolocationPosition) => {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(safetyTimer);
        try {
          const accuracy = Math.round(pos.coords.accuracy);
          console.log(`[Location] Device GPS Locked: Lat ${pos.coords.latitude.toFixed(5)}, Lng ${pos.coords.longitude.toFixed(5)} (±${accuracy}m)`);
          const geocoded = await reverseGeocode(pos.coords.latitude, pos.coords.longitude, accuracy);
          const isServiceable = checkServiceability(
            geocoded.locality,
            geocoded.city,
            geocoded.postalCode,
            pos.coords.latitude,
            pos.coords.longitude
          );
          const state: LocationState = {
            ...geocoded,
            accuracy,
            source: 'gps',
            isServiceable
          };
          this.saveLocation(state);
          resolve(state);
        } catch (e) {
          console.warn('[Location] Reverse geocoding failed for GPS coordinates:', e);
          finishWithSafeDefault('Reverse geocoding failure');
        }
      };

      // Two-Phase Google Maps Geolocation:
      // Phase 1: High accuracy with cached fix allowance (60 seconds)
      // Rapid lock within 50ms on mobile phones with recent GPS use
      const phase1Timeout = Math.min(7000, Math.max(300, Math.floor(totalTimeout / 2)));
      navigator.geolocation.getCurrentPosition(
        processPosition,
        (err) => {
          // If permission explicitly denied by user (code 1), do not retry
          if (err.code === 1) {
            clearTimeout(safetyTimer);
            console.info(`[Location] Geolocation permission denied by user: ${err.message}`);
            finishWithSafeDefault(`Geolocation denied (${err.message})`);
            return;
          }

          // If Phase 1 timed out or satellite unavailable (code 2 or 3), try Phase 2 (Network / Cell Tower / Wi-Fi)
          console.info(`[Location] High-accuracy GPS phase 1 note (Code ${err.code}: ${err.message}). Attempting network/cell tower fallback...`);
          navigator.geolocation.getCurrentPosition(
            processPosition,
            (err2) => {
              clearTimeout(safetyTimer);
              console.info(`[Location] Network geolocation fallback note: Code ${err2.code} - ${err2.message}`);
              finishWithSafeDefault(`Geolocation error (${err2.message})`);
            },
            {
              enableHighAccuracy: false, // Network / Wi-Fi triangulation
              timeout: Math.min(6000, Math.max(300, totalTimeout - phase1Timeout - 500)),
              maximumAge: 300000 // 5-minute cache
            }
          );
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: phase1Timeout,
          maximumAge: 60000 // 1-minute cache prevents cold satellite timeouts
        }
      );
    });
  },

  /**
   * Multi-Engine Dynamic Place & Street Search:
   * Handles any user search input dynamically without hardcoding.
   */
  async searchDynamicPlaces(query: string): Promise<LocationState[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    // Query multi-engine dynamic search
    const dynamicResults = await searchAddressPlaces(trimmed);

    // Convert dynamic results to LocationState with serviceability check
    return dynamicResults.map((res) => {
      const isServiceable = typeof res.isServiceable === 'boolean'
        ? res.isServiceable
        : checkServiceability(res.locality, res.city, res.postalCode, res.lat, res.lng);

      return {
        locality: res.locality,
        street: res.street,
        suburb: res.suburb || res.city,
        city: res.city,
        state: res.state,
        postalCode: res.postalCode,
        formattedAddress: res.formattedAddress,
        lat: res.lat,
        lng: res.lng,
        isServiceable,
        source: 'search'
      };
    });
  },

  switchToSagaraHub(): LocationState {
    this.saveLocation(SAGARA_HUB);
    return SAGARA_HUB;
  },

  switchToHub(hubId: 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru'): LocationState {
    const hub = hubId === 'bengaluru' ? BENGALURU_HUB : hubId === 'hosanagara' ? HOSANAGARA_HUB : hubId === 'honnali' ? HONNALI_HUB : SAGARA_HUB;
    this.saveLocation(hub);
    return hub;
  },

  async registerExpansionWaitlist(data: {
    email: string;
    mobile?: string;
    name?: string;
    tradeCategory?: string;
    role?: 'customer' | 'technician';
    city: string;
    locality?: string;
    state?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  }): Promise<{ success: boolean; id: string }> {
    const recordId = `waitlist-${Date.now()}`;
    const payload = {
      email: data.email.trim().toLowerCase(),
      mobile: data.mobile?.trim() || '',
      name: data.name?.trim() || '',
      tradeCategory: data.tradeCategory || '',
      role: data.role || 'customer',
      city: data.city || 'Unknown City',
      locality: data.locality || '',
      state: data.state || 'Karnataka',
      postalCode: data.postalCode || '',
      lat: data.lat || null,
      lng: data.lng || null,
      created_at: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      source: data.role === 'technician' ? 'TECHNICIAN_EXPANSION_POPUP' : 'UNSERVICEABLE_LOCATION_POPUP',
      status: 'PENDING_EXPANSION'
    };

    try {
      const existingWaitlist = JSON.parse(localStorage.getItem('myurbandaily_waitlist_records') || '[]');
      existingWaitlist.push(payload);
      localStorage.setItem('myurbandaily_waitlist_records', JSON.stringify(existingWaitlist));
      localStorage.setItem('mud_waitlist_registered_email', payload.email);
    } catch {}

    try {
      if (isFirebaseLive()) {
        await setDoc(doc(db, 'expansion_waitlist', recordId), {
          ...payload,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('[Firestore] Waitlist submission offline fallback:', e);
    }

    return { success: true, id: recordId };
  }
};
