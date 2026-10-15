import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { reverseGeocode, searchAddressPlaces } from '../services/geocoding';
import {
  locationService,
  checkServiceability,
  SAGARA_HUB,
  HOSANAGARA_HUB,
  HONNALI_HUB
} from '../services/microservices/location.service';

// Polyfill localStorage and sessionStorage for Node test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) || null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] || null
};
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', { value: localStorageMock, writable: true });
}

describe('Device-Accurate Mobile Geolocation & Street Resolution', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dynamic Reverse Geocoding with Street-Level Granularity', () => {
    it('extracts exact road name and builds Google Maps-style street label', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async (url: any) => {
        if (url.toString().includes('nominatim.openstreetmap.org/reverse')) {
          return {
            ok: true,
            json: async () => ({
              display_name: 'SH62, Kambalikoppa, Sagara, Shimoga, Karnataka, 577400, India',
              address: {
                road: 'SH62',
                suburb: 'Kambalikoppa',
                town: 'Sagara',
                state_district: 'Shimoga',
                state: 'Karnataka',
                postcode: '577400',
                country: 'India'
              }
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const res = await reverseGeocode(14.1670, 75.0300, 10);

      expect(res.street).toBe('SH62');
      expect(res.suburb).toBe('Kambalikoppa');
      expect(res.city).toBe('Sagara');
      expect(res.locality).toBe('SH62, Kambalikoppa');
      expect(res.postalCode).toBe('577400');
      expect(res.accuracy).toBe(10);
      expect(res.source).toBe('gps');
    });

    it('extracts POI and street together when available', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async (url: any) => {
        if (url.toString().includes('nominatim.openstreetmap.org/reverse')) {
          return {
            ok: true,
            json: async () => ({
              display_name: 'KSRTC Bus Stand, B.H. Road, Hosanagara, Karnataka, 577418, India',
              address: {
                amenity: 'KSRTC Bus Stand',
                road: 'B.H. Road',
                town: 'Hosanagara',
                state: 'Karnataka',
                postcode: '577418',
                country: 'India'
              }
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const res = await reverseGeocode(13.9190, 75.0670, 15);

      expect(res.street).toBe('KSRTC Bus Stand, B.H. Road');
      expect(res.city).toBe('Hosanagara');
      expect(res.locality).toBe('KSRTC Bus Stand, B.H. Road, Hosanagara');
      expect(res.postalCode).toBe('577418');
    });

    it('geofence prevents any erroneous Bangalore/Anekal city tags when GPS is in Sagara', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          display_name: 'Cell Tower Gateway, Anekal, Bengaluru, Karnataka, 560099',
          address: {
            city: 'Bengaluru',
            state: 'Karnataka'
          }
        })
      } as Response));

      // Sagara coordinates: lat 14.1670, lng 75.0298
      const res = await reverseGeocode(14.1670, 75.0298, 20);
      // Must NOT be Bengaluru because coordinates are geographically in Sagara corridor!
      expect(res.city).toBe('Sagara');
      expect(res.city).not.toBe('Bengaluru');
    });

    it('handles fallback coordinates gracefully if APIs are unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network offline'));

      const res = await reverseGeocode(14.1670, 75.0298, 25);
      expect(res.lat).toBe(14.1670);
      expect(res.lng).toBe(75.0298);
      expect(res.locality).toContain('GPS Pin');
      expect(res.formattedAddress).toContain('Sagara');
    });
  });

  describe('Custom Street & Location Search ("Aramanekeri sagara" resolution)', () => {
    it('successfully resolves custom typed search "Aramanekeri sagara" without hardcoded limits', async () => {
      const places = await locationService.searchDynamicPlaces('Aramanekeri sagara');
      expect(places.length).toBeGreaterThan(0);

      const aramanekeri = places.find(p => p.locality.toLowerCase().includes('aramanekeri'));
      expect(aramanekeri).toBeDefined();
      expect(aramanekeri?.city).toBe('Sagara');
      expect(aramanekeri?.postalCode).toBe('577401');
      expect(aramanekeri?.isServiceable).toBe(true);
      expect(aramanekeri?.formattedAddress).toContain('Aramanekeri, Sagara');
    }, 45000);

    it('resolves other custom localities like "KHB Colony Hosanagara" and "Durgigudi Honnali"', async () => {
      const hosaPlaces = await locationService.searchDynamicPlaces('KHB Colony Hosanagara');
      expect(hosaPlaces.length).toBeGreaterThan(0);
      expect(hosaPlaces[0].city).toBe('Hosanagara');
      expect(hosaPlaces[0].isServiceable).toBe(true);

      const honnPlaces = await locationService.searchDynamicPlaces('Durgigudi Honnali');
      expect(honnPlaces.length).toBeGreaterThan(0);
      expect(honnPlaces[0].city).toBe('Honnali');
      expect(honnPlaces[0].isServiceable).toBe(true);
    }, 45000);

    it('saves selected locations to recent searches for instant 1-tap re-use', () => {
      locationService.saveLocation({
        locality: 'Aramanekeri, Sagara',
        street: 'Aramanekeri',
        suburb: 'Aramanekeri',
        city: 'Sagara',
        state: 'Karnataka',
        postalCode: '577401',
        formattedAddress: 'Aramanekeri, Sagara, Karnataka 577401',
        lat: 14.1620,
        lng: 75.0250,
        isServiceable: true
      });

      const recents = locationService.getRecentLocations();
      expect(recents.length).toBe(1);
      expect(recents[0].locality).toBe('Aramanekeri, Sagara');
    });
  });

  describe('Cellular Carrier IP Protection (No "Hukeri" Erroneous Lockouts)', () => {
    it('sanitizes legacy "Hukeri" or "Anekal" stored carrier IP locations on startup', () => {
      localStorageMock.setItem('myurbandaily_user_location', JSON.stringify({
        locality: 'Hukeri, Karnataka',
        city: 'Hukeri',
        state: 'Karnataka',
        postalCode: '',
        lat: 16.2300,
        lng: 74.6000,
        isServiceable: false
      }));

      const active = locationService.getStoredLocation();
      expect(active.city).not.toBe('Hukeri');
      expect(active.city).toBe('Sagara');
      expect(active.isServiceable).toBe(true);
    });

    it('gracefully retains the active hub when device GPS times out or is denied', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success, error) => {
          error({ code: 1, message: 'User denied Geolocation' });
        })
      };
      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
        permissions: { query: vi.fn().mockResolvedValue({ state: 'denied' }) }
      });

      const loc = await locationService.resolveLiveLocation({ timeoutMs: 500 });
      expect(loc.isServiceable).toBe(true);
      expect(loc.city).toBe('Sagara');
      expect(loc.locality).toContain('Sagara');
    });

    it('locks high-accuracy device GPS coordinates when granted by user', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 14.1670,
              longitude: 75.0298,
              accuracy: 12
            }
          });
        })
      };
      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
      });

      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          address: {
            road: 'Rotary Circle Road',
            suburb: 'Gandhi Nagar',
            town: 'Sagara',
            postcode: '577401'
          }
        })
      } as Response));

      const loc = await locationService.resolveLiveLocation();
      expect(loc.accuracy).toBe(12);
      expect(loc.source).toBe('gps');
      expect(loc.locality).toBe('Rotary Circle Road, Gandhi Nagar');
      expect(loc.isServiceable).toBe(true);
    });
  });

  describe('Serviceability Matrix across Bengaluru, Sagara, Hosanagara, and Honnali', () => {
    it('marks Bengaluru (560xxx) and its localities as serviceable', () => {
      expect(checkServiceability('Indiranagar', 'Bengaluru', '560038')).toBe(true);
      expect(checkServiceability('Koramangala', 'Bangalore', '560034')).toBe(true);
      expect(checkServiceability('Whitefield', 'Bengaluru', '560066')).toBe(true);
      expect(checkServiceability('MG Road', 'Bangalore', '560001')).toBe(true);
      expect(checkServiceability('', '', '', 12.9716, 77.5946)).toBe(true);
    });

    it('marks Sagara (577401 / 577400) as serviceable', () => {
      expect(checkServiceability('Gandhi Nagar', 'Sagara', '577401')).toBe(true);
      expect(checkServiceability('Kambalikoppa', 'Sagara', '577400')).toBe(true);
    });

    it('marks Hosanagara (577418) as serviceable', () => {
      expect(checkServiceability('Main Market', 'Hosanagara', '577418')).toBe(true);
    });

    it('marks Honnali (577217) as serviceable', () => {
      expect(checkServiceability('Bus Stand Circle', 'Honnali', '577217')).toBe(true);
    });

    it('marks unserviced cities (e.g. Mumbai, New Delhi, Hukeri) as unserviceable for expansion capture', () => {
      expect(checkServiceability('Connaught Place', 'New Delhi', '110001')).toBe(false);
      expect(checkServiceability('Andheri', 'Mumbai', '400053')).toBe(false);
      expect(checkServiceability('Hukeri', 'Hukeri', '591309')).toBe(false);
    });
  });

  describe('Google Maps-Style Multi-Phase Resolution & Photon Reverse Geocoding', () => {
    it('resolves doorstep address using Photon Komoot when Nominatim fails', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('photon.komoot.io/reverse')) {
          return {
            ok: true,
            json: async () => ({
              type: 'FeatureCollection',
              features: [
                {
                  properties: {
                    name: 'Tilak Road',
                    street: 'Tilak Road',
                    district: 'Kambalikoppa',
                    city: 'Sagara',
                    state: 'Karnataka',
                    postcode: '577400'
                  }
                }
              ]
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const res = await reverseGeocode(14.1670, 75.0300, 15);
      expect(res.street).toBe('Tilak Road');
      expect(res.suburb).toBe('Kambalikoppa');
      expect(res.city).toBe('Sagara');
      expect(res.locality).toBe('Tilak Road, Kambalikoppa');
      expect(res.source).toBe('gps');
    });

    it('falls back to Phase 2 network/cell triangulation when Phase 1 cold GPS times out', async () => {
      let callCount = 0;
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success, error) => {
          callCount++;
          if (callCount === 1) {
            // Phase 1 times out (code 3)
            error({ code: 3, message: 'Position timeout (cold satellite)' });
          } else {
            // Phase 2 network fix succeeds
            success({
              coords: {
                latitude: 14.1670,
                longitude: 75.0298,
                accuracy: 45
              }
            });
          }
        })
      };
      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
      });

      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('photon.komoot.io/reverse')) {
          return {
            ok: true,
            json: async () => ({
              type: 'FeatureCollection',
              features: [
                {
                  properties: {
                    name: 'Rotary Circle',
                    street: 'Rotary Circle Road',
                    district: 'Gandhi Nagar',
                    city: 'Sagara',
                    postcode: '577401'
                  }
                }
              ]
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const loc = await locationService.resolveLiveLocation();
      expect(callCount).toBe(2);
      expect(loc.accuracy).toBe(45);
      expect(loc.source).toBe('gps');
      expect(loc.locality).toContain('Gandhi Nagar');
      expect(loc.isServiceable).toBe(true);
    });

    it('preserves exact mobile GPS location when user is in Bengaluru without replacing with Sagara', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 12.9784,
              longitude: 77.6408,
              accuracy: 10
            }
          });
        })
      };
      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
      });

      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('photon.komoot.io/reverse')) {
          return {
            ok: true,
            json: async () => ({
              type: 'FeatureCollection',
              features: [
                {
                  properties: {
                    name: '100 Feet Road',
                    street: '100 Feet Road',
                    district: 'Indiranagar',
                    city: 'Bengaluru',
                    postcode: '560038'
                  }
                }
              ]
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const loc = await locationService.resolveLiveLocation();
      expect(loc.city).toBe('Bengaluru');
      expect(loc.locality).toContain('Indiranagar');
      expect(loc.isServiceable).toBe(true);
      expect(loc.source).toBe('gps');

      // Stored verified location reflects Bangalore, NOT Sagara
      const verified = locationService.getVerifiedLocation();
      expect(verified?.city).toBe('Bengaluru');
      expect(verified?.locality).toContain('Indiranagar');
      expect(verified?.isServiceable).toBe(true);
    });

    it('preserves exact mobile GPS location when user is in unserviced city (Mumbai) with isServiceable=false', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 19.0760,
              longitude: 72.8777,
              accuracy: 15
            }
          });
        })
      };
      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
      });

      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('photon.komoot.io/reverse')) {
          return {
            ok: true,
            json: async () => ({
              type: 'FeatureCollection',
              features: [
                {
                  properties: {
                    name: 'Andheri West',
                    street: 'Link Road',
                    district: 'Andheri',
                    city: 'Mumbai',
                    postcode: '400053'
                  }
                }
              ]
            })
          } as Response;
        }
        return { ok: false } as Response;
      });

      const loc = await locationService.resolveLiveLocation();
      expect(loc.city).toBe('Mumbai');
      expect(loc.isServiceable).toBe(false);
      expect(loc.source).toBe('gps');
    });

    it('returns null from getVerifiedLocation if only default hub was present, preventing permanent Sagara lock', () => {
      expect(locationService.getVerifiedLocation()).toBeNull();

      localStorageMock.setItem('myurbandaily_user_location', JSON.stringify({
        ...SAGARA_HUB,
        source: 'default'
      }));

      expect(locationService.getVerifiedLocation()).toBeNull();
    });
  });
});
