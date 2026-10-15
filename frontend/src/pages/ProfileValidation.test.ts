import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    setDoc: vi.fn().mockResolvedValue(true),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  };
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import { api } from '@/lib/api';

describe('Customer & Technician Profile Validation and Google Login Auto-Update', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('rejects profile update if full name is empty', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    await expect(api.updateProfile({ name: '   ' })).rejects.toThrow('Full name is required.');
  });

  it('rejects profile update if email is empty or missing', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    await expect(api.updateProfile({ email: '' })).rejects.toThrow('Email field is mandatory, without that no one can save it.');
  });

  it('rejects profile update if email format is invalid', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    await expect(api.updateProfile({ email: 'invalid-email-address' })).rejects.toThrow('Please enter a valid email address');
  });

  it('rejects profile update if mobile number is empty or missing', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    await expect(api.updateProfile({ phone: '' })).rejects.toThrow('Mobile number is mandatory for customer and technician profiles.');
  });

  it('rejects profile update if mobile number is not 10 digits', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    await expect(api.updateProfile({ phone: '12345' })).rejects.toThrow('Please enter a valid 10-digit mobile number.');
  });

  it('successfully updates profile when name, valid email, and 10-digit mobile number are provided', async () => {
    const user = { id: 'usr_cust_1', name: 'John Doe', email: 'john@example.com', phone: '9845123456', role: 'customer' };
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    const result = await api.updateProfile({
      name: 'Ramesh Hegde',
      email: 'ramesh.hegde@gmail.com',
      phone: '9845678901',
      address: 'Gandhi Nagar, Sagara'
    });

    expect(result.user.name).toBe('Ramesh Hegde');
    expect(result.user.email).toBe('ramesh.hegde@gmail.com');
    expect(result.user.phone).toBe('9845678901');

    const cached = JSON.parse(localStorage.getItem('mud_active_user') || '{}');
    expect(cached.email).toBe('ramesh.hegde@gmail.com');
    expect(cached.phone).toBe('9845678901');
  }, 15000);

  it('works identically for technician role', async () => {
    const techUser = { id: 'usr_tech_1', name: 'Manju Pro', email: 'manju@example.com', phone: '9844011223', role: 'provider' };
    localStorage.setItem('mud_active_user', JSON.stringify(techUser));

    const result = await api.updateProfile({
      name: 'Manjunath K',
      email: 'manjunath.technician@gmail.com',
      phone: '9844011223',
      trade_category: 'Electrical & AC Repair'
    });

    expect(result.user.role).toBe('provider');
    expect(result.user.email).toBe('manjunath.technician@gmail.com');
    expect(result.user.phone).toBe('9844011223');
  }, 15000);
});
