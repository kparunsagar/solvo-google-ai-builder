import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  formatDistanceToNow,
} from './utils';

describe('UI & Formatting Utilities (utils.ts)', () => {
  describe('cn (classNames merger)', () => {
    it('combines class names correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('handles conditional and falsy values', () => {
      expect(cn('px-2', false && 'py-1', undefined, null, 'text-red-500')).toBe('px-2 text-red-500');
    });

    it('resolves Tailwind conflicts using tailwind-merge', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers to Indian Rupee currency format', () => {
      const formatted = formatCurrency(1500);
      expect(formatted).toContain('1,500');
      expect(formatted).toMatch(/₹|INR/);
    });

    it('handles zero correctly', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0');
    });

    it('handles large amounts', () => {
      const formatted = formatCurrency(100000);
      expect(formatted).toContain('1,00,000');
    });
  });

  describe('formatDate', () => {
    it('formats a date string to Indian locale format', () => {
      const dateStr = '2026-09-20T10:30:00.000Z';
      const formatted = formatDate(dateStr);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Sep');
    });
  });

  describe('getStatusColor', () => {
    it('returns appropriate Tailwind classes for known statuses', () => {
      expect(getStatusColor('PENDING')).toContain('amber');
      expect(getStatusColor('ACCEPTED')).toContain('blue');
      expect(getStatusColor('EN_ROUTE')).toContain('indigo');
      expect(getStatusColor('IN_PROGRESS')).toContain('purple');
      expect(getStatusColor('COMPLETED')).toContain('green');
      expect(getStatusColor('CANCELLED')).toContain('red');
      expect(getStatusColor('REVIEWED')).toContain('gray');
    });

    it('returns default gray class for unknown status', () => {
      expect(getStatusColor('UNKNOWN_STATUS')).toBe('bg-gray-100 text-gray-600 border-gray-200');
    });
  });

  describe('getStatusLabel', () => {
    it('returns human-readable label for known statuses', () => {
      expect(getStatusLabel('PENDING')).toBe('Finding Technician');
      expect(getStatusLabel('ACCEPTED')).toBe('Technician Assigned');
      expect(getStatusLabel('EN_ROUTE')).toBe('Technician En Route');
      expect(getStatusLabel('IN_PROGRESS')).toBe('Work In Progress');
      expect(getStatusLabel('COMPLETED')).toBe('Completed');
      expect(getStatusLabel('CANCELLED')).toBe('Cancelled');
      expect(getStatusLabel('REVIEWED')).toBe('Reviewed');
    });

    it('falls back to the raw status string if unknown', () => {
      expect(getStatusLabel('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
    });
  });

  describe('formatDistanceToNow', () => {
    it('returns "just now" for dates within 30 seconds', () => {
      const now = new Date();
      expect(formatDistanceToNow(now)).toBe('just now');
      expect(formatDistanceToNow(new Date(now.getTime() - 10000))).toBe('just now');
    });

    it('returns seconds ago for < 60 seconds', () => {
      const date = new Date(Date.now() - 45000);
      expect(formatDistanceToNow(date)).toBe('45s ago');
    });

    it('returns minutes ago for < 60 minutes', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatDistanceToNow(date)).toBe('5m ago');
    });

    it('returns hours ago for < 24 hours', () => {
      const date = new Date(Date.now() - 3 * 3600 * 1000);
      expect(formatDistanceToNow(date)).toBe('3h ago');
    });

    it('returns days ago for < 30 days', () => {
      const date = new Date(Date.now() - 5 * 86400 * 1000);
      expect(formatDistanceToNow(date)).toBe('5d ago');
    });

    it('returns months ago for < 12 months', () => {
      const date = new Date(Date.now() - 60 * 86400 * 1000);
      expect(formatDistanceToNow(date)).toBe('2mo ago');
    });

    it('returns years ago for >= 365 days', () => {
      const date = new Date(Date.now() - 400 * 86400 * 1000);
      expect(formatDistanceToNow(date)).toBe('1y ago');
    });

    it('returns "recently" on invalid date input', () => {
      expect(formatDistanceToNow('invalid-date-string')).toBe('recently');
    });
  });
});
