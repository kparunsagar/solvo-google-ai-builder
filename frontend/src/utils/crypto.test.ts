import { describe, it, expect } from 'vitest';
import { getSecureRandomDigits, getSecureRandomString, getSecureRandomInt } from './crypto';

describe('Cryptographic Utilities (crypto.ts)', () => {
  describe('getSecureRandomDigits', () => {
    it('generates 4 digits by default', () => {
      const result = getSecureRandomDigits();
      expect(result).toHaveLength(4);
      expect(/^\d{4}$/.test(result)).toBe(true);
    });

    it('generates the specified number of digits', () => {
      const result = getSecureRandomDigits(8);
      expect(result).toHaveLength(8);
      expect(/^\d{8}$/.test(result)).toBe(true);
    });

    it('handles single digit generation', () => {
      const result = getSecureRandomDigits(1);
      expect(result).toHaveLength(1);
      expect(/^\d$/.test(result)).toBe(true);
    });
  });

  describe('getSecureRandomString', () => {
    it('generates a string of default length 6', () => {
      const result = getSecureRandomString();
      expect(result).toHaveLength(6);
      expect(/^[a-z0-9]+$/i.test(result)).toBe(true);
    });

    it('generates a string of specified length', () => {
      const result = getSecureRandomString(12);
      expect(result).toHaveLength(12);
      expect(/^[a-z0-9]+$/i.test(result)).toBe(true);
    });

    it('generates unique random strings', () => {
      const set = new Set();
      for (let i = 0; i < 20; i++) {
        set.add(getSecureRandomString(8));
      }
      expect(set.size).toBe(20);
    });
  });

  describe('getSecureRandomInt', () => {
    it('generates an integer within the specified min and max (inclusive)', () => {
      for (let i = 0; i < 50; i++) {
        const val = getSecureRandomInt(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('handles identical min and max', () => {
      const val = getSecureRandomInt(5, 5);
      expect(val).toBe(5);
    });

    it('handles negative ranges', () => {
      const val = getSecureRandomInt(-10, -5);
      expect(val).toBeGreaterThanOrEqual(-10);
      expect(val).toBeLessThanOrEqual(-5);
    });
  });
});
