import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  getLocalWorkbook,
  saveUserToWorkbook,
  generateWorkbookCsv,
  fetchAllWorkbookEntries,
  downloadWorkbookFile,
} from './workbook';

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

describe('Workbook & Cryptographic Password Hashing (workbook.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('hashPassword', () => {
    it('returns empty string if password is empty', async () => {
      expect(await hashPassword('')).toBe('');
    });

    it('generates a valid $sha256$ formatted hash', async () => {
      const hash = await hashPassword('Secret123!');
      expect(hash).toMatch(/^\$sha256\$[a-zA-Z0-9_-]+\$[a-f0-9]{64}$/);
    });

    it('produces deterministic hashes with the same salt', async () => {
      const salt = 'custom_salt_99';
      const hash1 = await hashPassword('MyPass', salt);
      const hash2 = await hashPassword('MyPass', salt);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different passwords with same salt', async () => {
      const salt = 'custom_salt_99';
      const hash1 = await hashPassword('PasswordA', salt);
      const hash2 = await hashPassword('PasswordB', salt);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password and hash', async () => {
      const password = 'CorrectPassword!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await hashPassword('CorrectPassword!');
      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('returns false when password or hash is missing', async () => {
      expect(await verifyPassword('', 'hash')).toBe(false);
      expect(await verifyPassword('pass', '')).toBe(false);
    });
  });

  describe('getLocalWorkbook', () => {
    it('returns empty array when localStorage is empty', () => {
      const entries = getLocalWorkbook();
      expect(entries).toEqual([]);
    });

    it('parses existing entries from localStorage', () => {
      const mockEntries = [
        {
          userId: 'user_1',
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          role: 'customer',
          passwordHash: '$sha256$salt$abc',
          address: 'Bengaluru',
          kycStatus: 'approved',
          registeredAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('mud_user_directory_workbook', JSON.stringify(mockEntries));

      const entries = getLocalWorkbook();
      expect(entries).toHaveLength(1);
      expect(entries[0].userId).toBe('user_1');
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('mud_user_directory_workbook', 'invalid-json-content');
      const entries = getLocalWorkbook();
      expect(entries).toEqual([]);
    });
  });

  describe('saveUserToWorkbook', () => {
    it('saves a user entry into localStorage workbook', async () => {
      await saveUserToWorkbook({
        userId: 'usr_101',
        fullName: 'Arun Sagar',
        email: 'arun@example.com',
        phone: '9876543210',
        role: 'customer',
        passwordHash: '$sha256$mock',
        address: 'Bengaluru',
        kycStatus: 'approved',
        registeredAt: '2026-09-20T00:00:00.000Z',
      });

      const local = getLocalWorkbook();
      const saved = local.find((u) => u.userId === 'usr_101');
      expect(saved).toBeDefined();
      expect(saved?.fullName).toBe('Arun Sagar');
    }, 15000);

    it('updates an existing user entry in localStorage workbook', async () => {
      await saveUserToWorkbook({
        userId: 'usr_update',
        fullName: 'Initial Name',
        email: 'update@example.com',
        phone: '9876543211',
        role: 'customer',
        passwordHash: '$sha256$mock',
        address: 'Bengaluru',
        kycStatus: 'pending',
        registeredAt: '2026-09-20T00:00:00.000Z',
      });

      await saveUserToWorkbook({
        userId: 'usr_update',
        fullName: 'Updated Name',
        email: 'update@example.com',
        phone: '9876543211',
        role: 'customer',
        passwordHash: '$sha256$mock',
        address: 'Bengaluru',
        kycStatus: 'approved',
        registeredAt: '2026-09-20T00:00:00.000Z',
      });

      const local = getLocalWorkbook();
      const updated = local.find((u) => u.userId === 'usr_update');
      expect(updated?.fullName).toBe('Updated Name');
      expect(updated?.kycStatus).toBe('approved');
    }, 15000);
  });

  describe('generateWorkbookCsv', () => {
    it('generates valid CSV header and rows', () => {
      const csv = generateWorkbookCsv([
        {
          userId: 'u_1',
          fullName: 'John "The Plumber" Doe',
          email: 'john@example.com',
          phone: '1234567890',
          role: 'technician',
          passwordHash: '$sha256$hash',
          address: 'Main St, Apt 4',
          kycStatus: 'approved',
          registeredAt: '2026-09-20',
        },
      ]);

      expect(csv).toContain('User ID,Full Name,Email Address');
      expect(csv).toContain('"John ""The Plumber"" Doe"');
      expect(csv).toContain('"u_1"');
    });

    it('handles empty entries array', () => {
      const csv = generateWorkbookCsv([]);
      expect(csv).toContain('User ID,Full Name,Email Address');
      expect(csv.split('\n')).toHaveLength(1);
    });
  });

  describe('fetchAllWorkbookEntries', () => {
    it('returns local entries when Firebase is not live', async () => {
      const entries = await fetchAllWorkbookEntries();
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe('downloadWorkbookFile', () => {
    it('creates a download link and triggers click', () => {
      const clickSpy = vi.fn();
      const mockElement = {
        setAttribute: vi.fn(),
        click: clickSpy,
      };
      const originalDocument = globalThis.document;
      globalThis.document = {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        createElement: vi.fn().mockReturnValue(mockElement),
      } as any;
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock');
      globalThis.URL.revokeObjectURL = vi.fn();

      downloadWorkbookFile([]);

      expect(clickSpy).toHaveBeenCalled();
      globalThis.document = originalDocument;
    });
  });
});
