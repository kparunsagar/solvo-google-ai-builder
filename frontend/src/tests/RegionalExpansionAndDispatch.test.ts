import { describe, it, expect, beforeEach } from 'vitest';
import {
  SAGARA_LOCALITIES,
  SAGARA_ONLY_LOCALITIES,
  HOSANAGARA_LOCALITIES,
  HONNALI_LOCALITIES,
  REGION_HUBS,
  findLocalityByCoords,
  detectRegionFromLocality
} from '../data/sagara-localities';
import {
  checkServiceability,
  SAGARA_HUB,
  HOSANAGARA_HUB,
  HONNALI_HUB,
  POPULAR_CITIES
} from '../services/microservices/location.service';
import { api, BookingRecord } from '../lib/api';

// Polyfill localStorage for Node test runner
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
  (globalThis as any).localStorage = localStorageMock;
}

describe('Regional Business Expansion to Bengaluru, Hosanagara & Honnali', () => {
  it('contains valid locality registries for Bengaluru, Sagara, Hosanagara, and Honnali', () => {
    expect(SAGARA_ONLY_LOCALITIES.length).toBeGreaterThanOrEqual(6);
    expect(HOSANAGARA_LOCALITIES.length).toBeGreaterThanOrEqual(5);
    expect(HONNALI_LOCALITIES.length).toBeGreaterThanOrEqual(5);

    // Verify Bengaluru has correct PIN & center
    expect(REGION_HUBS.bengaluru.pincode).toBe('560001');
    expect(REGION_HUBS.bengaluru.center.lat).toBeCloseTo(12.9716, 2);
    expect(REGION_HUBS.bengaluru.center.lng).toBeCloseTo(77.5946, 2);

    // Verify Hosanagara has correct PIN & center
    expect(REGION_HUBS.hosanagara.pincode).toBe('577418');
    expect(REGION_HUBS.hosanagara.center.lat).toBeCloseTo(13.9190, 2);
    expect(REGION_HUBS.hosanagara.center.lng).toBeCloseTo(75.0670, 2);

    // Verify Honnali has correct PIN & center
    expect(REGION_HUBS.honnali.pincode).toBe('577217');
    expect(REGION_HUBS.honnali.center.lat).toBeCloseTo(14.2443, 2);
    expect(REGION_HUBS.honnali.center.lng).toBeCloseTo(75.6425, 2);
  });

  it('validates serviceability correctly for all active hubs and rejects unserviced regions', () => {
    // Bengaluru
    expect(checkServiceability('Indiranagar', 'Bengaluru', '560038')).toBe(true);
    expect(checkServiceability('Koramangala', 'Bangalore', '560034')).toBe(true);
    expect(checkServiceability('Whitefield', 'Bangalore', '560066')).toBe(true);
    expect(checkServiceability('', '', '', 12.97, 77.59)).toBe(true);

    // Sagara
    expect(checkServiceability('Gandhi Nagar', 'Sagara', '577401')).toBe(true);
    expect(checkServiceability('Anywhere', 'Sagara')).toBe(true);

    // Hosanagara
    expect(checkServiceability('Main Market', 'Hosanagara', '577418')).toBe(true);
    expect(checkServiceability('Riponpet Road', 'Hosangara')).toBe(true);
    expect(checkServiceability('Kerehalli', '', '577418')).toBe(true);
    // Geofence within Hosanagara
    expect(checkServiceability('', '', '', 13.92, 75.07)).toBe(true);

    // Honnali
    expect(checkServiceability('Tungabhadra River Bridge', 'Honnali', '577217')).toBe(true);
    expect(checkServiceability('TB Circle', 'Honnali')).toBe(true);
    // Geofence within Honnali
    expect(checkServiceability('', '', '', 14.24, 75.64)).toBe(true);

    // Unsupported cities
    expect(checkServiceability('Connaught Place', 'New Delhi', '110001')).toBe(false);
    expect(checkServiceability('Oxford Street', 'London', 'W1D')).toBe(false);
  });

  it('accurately resolves closest locality and detects region', () => {
    // Near Bengaluru Indiranagar
    const blrLoc = findLocalityByCoords(12.9784, 77.6408);
    expect(blrLoc.region).toBe('bengaluru');
    expect(blrLoc.regionName).toBe('Bengaluru');
    expect(blrLoc.pincode).toBe('560038');

    // Near Hosanagara bus stand
    const hnLoc = findLocalityByCoords(13.9192, 75.0672);
    expect(hnLoc.region).toBe('hosanagara');
    expect(hnLoc.regionName).toBe('Hosanagara');
    expect(hnLoc.pincode).toBe('577418');

    // Near Honnali river bridge
    const hlLoc = findLocalityByCoords(14.2482, 75.6452);
    expect(hlLoc.region).toBe('honnali');
    expect(hlLoc.regionName).toBe('Honnali');
    expect(hlLoc.pincode).toBe('577217');

    // Near Sagara Gandhi Nagar
    const sgLoc = findLocalityByCoords(14.1671, 75.0299);
    expect(sgLoc.region).toBe('sagara');
    expect(sgLoc.regionName).toBe('Sagara');

    expect(detectRegionFromLocality('Indiranagar, Bengaluru')).toBe('bengaluru');
    expect(detectRegionFromLocality('Riponpet Road, Hosanagara')).toBe('hosanagara');
    expect(detectRegionFromLocality('Tungabhadra Bridge, Honnali')).toBe('honnali');
    expect(detectRegionFromLocality('Keladi Road, Sagara')).toBe('sagara');
  });

  it('marks Bengaluru, Sagara, Hosanagara, and Honnali as active serviceable hubs in POPULAR_CITIES', () => {
    const bengaluru = POPULAR_CITIES.find(c => c.name === 'Bengaluru');
    const sagara = POPULAR_CITIES.find(c => c.name === 'Sagara');
    const hosanagara = POPULAR_CITIES.find(c => c.name === 'Hosanagara');
    const honnali = POPULAR_CITIES.find(c => c.name === 'Honnali');

    expect(bengaluru?.isServiceable).toBe(true);
    expect(sagara?.isServiceable).toBe(true);
    expect(hosanagara?.isServiceable).toBe(true);
    expect(honnali?.isServiceable).toBe(true);
  });
});

describe('Technician Location-Based Proximity Dispatch', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  const sagaraBooking: BookingRecord = {
    id: 'book-sg-1',
    customer_id: 'cust-1',
    technician_id: '',
    service_id: 'srv_plumber_general',
    category_id: 'cat-plumb',
    status: 'PENDING',
    price: 299,
    address_locality: 'Gandhi Nagar, Sagara',
    address_text: 'Near Rotary Circle',
    address_lat: 14.1670,
    address_lng: 75.0298,
    created_at: new Date().toISOString()
  };

  const hosanagaraBooking: BookingRecord = {
    id: 'book-hn-1',
    customer_id: 'cust-2',
    technician_id: '',
    service_id: 'srv_plumber_general',
    category_id: 'cat-plumb',
    status: 'PENDING',
    price: 299,
    address_locality: 'Main Market, Hosanagara',
    address_text: 'Near KSRTC Bus Stand',
    address_lat: 13.9190,
    address_lng: 75.0670,
    created_at: new Date().toISOString()
  };

  it('filters available requests: Sagara technician only sees Sagara booking, not Hosanagara booking', async () => {
    // Mock stored bookings in localStorage
    storageMap.set('mud_firestore_bookings', JSON.stringify([sagaraBooking, hosanagaraBooking]));

    // Technician is currently located in Sagara (Lat 14.1670, Lng 75.0298)
    const sagaraTechLocation = { lat: 14.1670, lng: 75.0298, city: 'sagara', radiusKm: 20 };
    const availableForSagaraTech = await api.getAvailableBookings(undefined, sagaraTechLocation);

    // Should include Sagara booking (distance ~0 km)
    const hasSagara = availableForSagaraTech.some(b => b.id === 'book-sg-1');
    expect(hasSagara).toBe(true);

    // Should NOT include Hosanagara booking (distance ~35 km > 20 km)
    const hasHosanagara = availableForSagaraTech.some(b => b.id === 'book-hn-1');
    expect(hasHosanagara).toBe(false);
  }, 15000);

  it('filters available requests: Hosanagara technician in Hosanagara only sees Hosanagara booking', async () => {
    storageMap.set('mud_firestore_bookings', JSON.stringify([sagaraBooking, hosanagaraBooking]));

    // Technician is physically in Hosanagara
    const hosanagaraTechLocation = { lat: 13.9190, lng: 75.0670, city: 'hosanagara', radiusKm: 20 };
    const availableForHnTech = await api.getAvailableBookings(undefined, hosanagaraTechLocation);

    expect(availableForHnTech.some(b => b.id === 'book-hn-1')).toBe(true);
    expect(availableForHnTech.some(b => b.id === 'book-sg-1')).toBe(false);
  }, 15000);

  it('enables a Hosanagara technician who travels to Sagara to see and accept the Sagara offer', async () => {
    storageMap.set('mud_firestore_bookings', JSON.stringify([sagaraBooking, hosanagaraBooking]));

    // Hosanagara technician moves to Sagara (their current duty location becomes Sagara coordinates)
    const movedToSagaraLocation = { lat: 14.1670, lng: 75.0298, city: 'sagara', radiusKm: 20 };
    const availableWhenInSagara = await api.getAvailableBookings(undefined, movedToSagaraLocation);

    // Now they can see and accept the Sagara offer!
    expect(availableWhenInSagara.some(b => b.id === 'book-sg-1')).toBe(true);
    const matchedSagara = availableWhenInSagara.find(b => b.id === 'book-sg-1');
    expect((matchedSagara as any).distanceKm).toBeLessThanOrEqual(5);
  });

  it('dynamically resolves localities for all operational hubs without hardcoding', () => {
    const blrLocalities = SAGARA_LOCALITIES.filter(l => l.region === 'bengaluru');
    expect(blrLocalities.length).toBeGreaterThanOrEqual(10);
    expect(blrLocalities.some(l => l.name.includes('Indiranagar'))).toBe(true);
    expect(blrLocalities.some(l => l.name.includes('Whitefield'))).toBe(true);
    expect(blrLocalities.some(l => l.name.includes('Marathahalli'))).toBe(true);

    const sagaraLocalities = SAGARA_LOCALITIES.filter(l => l.region === 'sagara');
    expect(sagaraLocalities.length).toBeGreaterThanOrEqual(6);

    const hosanagaraLocalities = SAGARA_LOCALITIES.filter(l => l.region === 'hosanagara');
    expect(hosanagaraLocalities.length).toBeGreaterThanOrEqual(5);

    const honnaliLocalities = SAGARA_LOCALITIES.filter(l => l.region === 'honnali');
    expect(honnaliLocalities.length).toBeGreaterThanOrEqual(5);
  });

  it('correctly creates bookings with composite doorstep address including house/flat and street', async () => {
    const res = await api.createBooking({
      service_id: 'srv_plumber_general',
      address_text: 'Flat 402, Prestige Palms, 100ft Road, Indiranagar',
      address_lat: 12.9784,
      address_lng: 77.6408,
      address_locality: 'Indiranagar, Bengaluru',
      customer_phone: '9876543210',
      payment_method: 'COD',
      payment_status: 'PENDING'
    });

    expect(res.booking.address_text).toBe('Flat 402, Prestige Palms, 100ft Road, Indiranagar');
    expect(res.booking.address_locality).toBe('Indiranagar, Bengaluru');
    expect(res.booking.address_lat).toBeCloseTo(12.9784, 2);
    expect(res.booking.address_lng).toBeCloseTo(77.6408, 2);
  });
});

