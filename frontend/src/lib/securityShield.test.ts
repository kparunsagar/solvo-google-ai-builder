import { describe, it, expect, vi } from 'vitest';
import { xssSanitizer, initSecurityShield, SecurityShield } from './securityShield';

describe('UrbanAI Ethical Hacker Security Shield (securityShield.ts)', () => {
  describe('XSS Sanitizer', () => {
    it('encodes dangerous HTML entities', () => {
      const input = '<script>alert("hacked")</script>';
      const encoded = xssSanitizer.encode(input);
      expect(encoded).not.toContain('<script>');
      expect(encoded).toContain('&lt;script&gt;');
    });

    it('strips malicious script blocks and event handlers', () => {
      const malicious = '<script>fetch("evil.com")</script><img src=x onerror=alert(1)> Safe Text';
      const cleaned = xssSanitizer.clean(malicious);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('onerror=');
      expect(cleaned).toContain('Safe Text');
    });

    it('neutralizes javascript: pseudo-protocol strings', () => {
      const maliciousUrl = 'javascript:document.cookie';
      const cleaned = xssSanitizer.clean(maliciousUrl);
      expect(cleaned).toContain('blocked:');
      expect(cleaned).not.toContain('javascript:');
    });
  });

  describe('Security Shield Initializer', () => {
    it('initializes cleanly without errors in browser/node environment', () => {
      const cleanup = initSecurityShield({
        enableAntiDebugger: false,
        enableConsoleWarning: false,
        enableClickjackProtection: false
      });
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
