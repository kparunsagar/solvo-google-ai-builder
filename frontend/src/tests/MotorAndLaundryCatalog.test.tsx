import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, DEFAULT_CATEGORIES, DEFAULT_SERVICES, CATEGORY_TRADE_MAP, getTradeCategoryForService } from '@/lib/api';

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
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  });
}

describe('Motor Service & Laundry Dynamic Catalog Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
  });


  it('contains Motor Service and Laundry categories with respective service modes', async () => {
    const categories = await api.getCategories();

    const motor = categories.find(c => c.id === 'cat-motor');
    expect(motor).toBeDefined();
    expect(motor?.name).toBe('Motor Service');
    expect(motor?.icon).toBe('Car');
    expect(motor?.service_mode).toBe('STATION_SLOT');

    const laundry = categories.find(c => c.id === 'cat-laundry');
    expect(laundry).toBeDefined();
    expect(laundry?.name).toBe('Laundry');
    expect(laundry?.icon).toBe('Shirt');
    expect(laundry?.service_mode).toBe('PICKUP_DELIVERY');
  });

  it('provides dedicated Motor Service packages and Trusted Sagara Service Stations with Bay Slots', () => {
    const motorServices = DEFAULT_SERVICES.filter(s => s.category_id === 'cat-motor');
    expect(motorServices.length).toBeGreaterThanOrEqual(4);

    const carWash = motorServices.find(s => s.id === 'svc-motor-1');
    expect(carWash).toBeDefined();
    expect(carWash?.name).toContain('Car Express Foam');
    expect(carWash?.price).toBe(399);

    const bikeWash = motorServices.find(s => s.id === 'svc-motor-2');
    expect(bikeWash).toBeDefined();
    expect(bikeWash?.name).toContain('Bike Deep Foam Wash');
    expect(bikeWash?.price).toBe(199);

    const stations = api.getMotorStations();
    expect(stations.length).toBeGreaterThanOrEqual(3);

    const sagaraAutoSpa = stations.find(s => s.id === 'sta_sagara_auto_spa');
    expect(sagaraAutoSpa).toBeDefined();
    expect(sagaraAutoSpa?.total_bays).toBe(4);
    expect(sagaraAutoSpa?.available_slots.length).toBeGreaterThanOrEqual(4);
    expect(sagaraAutoSpa?.available_slots[0].open_bays).toBeGreaterThan(0);
  });

  it('provides Laundry packages with per-kg rate and pickup partners', () => {
    const laundryServices = DEFAULT_SERVICES.filter(s => s.category_id === 'cat-laundry');
    expect(laundryServices.length).toBeGreaterThanOrEqual(4);

    const washAndFold = laundryServices.find(s => s.id === 'svc-laund-1');
    expect(washAndFold).toBeDefined();
    expect(washAndFold?.name).toContain('Wash & Fold');
    expect(washAndFold?.price).toBe(49);

    const dryClean = laundryServices.find(s => s.id === 'svc-laund-3');
    expect(dryClean).toBeDefined();
    expect(dryClean?.name).toContain('Dry Cleaning');

    const partners = api.getLaundryPartners();
    expect(partners.length).toBeGreaterThanOrEqual(1);
    expect(partners[0].pickup_windows.length).toBeGreaterThanOrEqual(2);
  });

  it('correctly maps trade categories for KYC technician dispatch', () => {
    expect(CATEGORY_TRADE_MAP['cat-motor']).toBe('Automobile & Motor Care');
    expect(CATEGORY_TRADE_MAP['cat-laundry']).toBe('Laundry & Dry Cleaning');

    expect(getTradeCategoryForService('svc-motor-1')).toBe('Automobile & Motor Care');
    expect(getTradeCategoryForService('svc-laund-1')).toBe('Laundry & Dry Cleaning');
    expect(getTradeCategoryForService('svc-plumb-1')).toBe('Plumbing & Sanitary');
  });

  it('creates a Motor Service booking with verified station bay slot reservation', async () => {
    localStorage.setItem('mud_active_user', JSON.stringify({
      id: 'usr_test_cust',
      name: 'Ramesh Hegde',
      email: 'ramesh@example.com',
      phone: '9845112233',
      role: 'customer'
    }));

    const stations = api.getMotorStations();
    const station = stations[0];
    const slot = station.available_slots[0];

    await api.createBooking({
      service_id: 'svc-motor-1',
      address_text: `${station.name}, ${station.address}`,
      address_lat: 14.167,
      address_lng: 75.040,
      address_locality: station.locality,
      motor_station_id: station.id,
      motor_station_name: station.name,
      motor_vehicle_type: 'HATCHBACK',
      motor_bay_slot: slot.time_window,
      service_type_mode: 'STATION_SLOT',
      payment_method: 'COD'
    });

    const bookingsRaw = localStorage.getItem('mud_firestore_bookings');
    expect(bookingsRaw).toBeDefined();
    const bookings = JSON.parse(bookingsRaw || '[]');
    expect(bookings.length).toBe(1);

    const b = bookings[0];
    expect(b.service_id).toBe('svc-motor-1');
    expect(b.motor_station_id).toBe(station.id);
    expect(b.motor_station_name).toBe(station.name);
    expect(b.motor_vehicle_type).toBe('HATCHBACK');
    expect(b.motor_bay_slot).toBe(slot.time_window);
    expect(b.service_type_mode).toBe('STATION_SLOT');
    expect(b.trade_category).toBe('Automobile & Motor Care');
  });

  it('creates a Laundry booking with doorstep pickup window and weight', async () => {
    localStorage.setItem('mud_active_user', JSON.stringify({
      id: 'usr_test_cust',
      name: 'Pooja Bhat',
      email: 'pooja@example.com',
      phone: '9845223344',
      role: 'customer'
    }));

    await api.createBooking({
      service_id: 'svc-laund-1',
      address_text: 'Near Ganapathi Temple, Sagara',
      address_lat: 14.168,
      address_lng: 75.039,
      address_locality: 'Gandhi Circle, Sagara',
      laundry_pickup_window: 'Morning: 08:00 AM – 10:30 AM',
      laundry_estimated_weight: 5,
      service_type_mode: 'PICKUP_DELIVERY',
      payment_method: 'COD'
    });

    const bookingsRaw = localStorage.getItem('mud_firestore_bookings');
    const bookings = JSON.parse(bookingsRaw || '[]');
    const b = bookings[0];

    expect(b.service_id).toBe('svc-laund-1');
    expect(b.laundry_pickup_window).toBe('Morning: 08:00 AM – 10:30 AM');
    expect(b.laundry_estimated_weight).toBe(5);
    expect(b.service_type_mode).toBe('PICKUP_DELIVERY');
    expect(b.trade_category).toBe('Laundry & Dry Cleaning');
  });
});
