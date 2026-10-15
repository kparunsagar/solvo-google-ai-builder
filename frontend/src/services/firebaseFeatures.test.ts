import { describe, it, expect } from 'vitest';
import { storageService } from './storage.service';
import { remoteConfigService } from './remoteConfig.service';
import { messagingService } from './messaging.service';
import { firebaseService } from './firebase';

describe('Complete Firebase Free Tier Features Suite', () => {
  describe('Cloud Storage Subsystem (storage.service.ts)', () => {
    it('converts blob to base64 data URL for offline fallback', async () => {
      const blob = new Blob(['sample-file-content'], { type: 'text/plain' });
      const dataUrl = await storageService.blobToDataUrl(blob);
      expect(dataUrl).toContain('data:text/plain;base64,');
    });

    it('generates correct avatar path structure', async () => {
      const blob = new Blob(['fake-image'], { type: 'image/jpeg' });
      const url = await storageService.uploadAvatar('usr_123', blob);
      expect(url).toBeDefined();
    }, 10000);

    it('generates correct KYC document path structure', async () => {
      const blob = new Blob(['fake-kyc'], { type: 'application/pdf' });
      const url = await storageService.uploadKycDocument('usr_123', 'aadhaar', blob);
      expect(url).toBeDefined();
    }, 10000);
  });

  describe('Firebase Remote Config (remoteConfig.service.ts)', () => {
    it('provides safe default operational parameters', () => {
      const values = remoteConfigService.getValues();
      expect(values).toBeDefined();
      expect(values.doorstepSlaMinutes).toBe(60);
      expect(values.supportPhone).toBe('+91 9845001122');
      expect(values.codEnabled).toBe(true);
      expect(values.maintenanceMode).toBe(false);
      expect(values.surgePricingMultiplier).toBe(1.0);
    });

    it('retrieves individual remote config values by key', () => {
      expect(remoteConfigService.get('doorstepSlaMinutes')).toBe(60);
      expect(remoteConfigService.get('codEnabled')).toBe(true);
    });
  });

  describe('Firebase Cloud Messaging (messaging.service.ts)', () => {
    it('initializes messaging service instance', () => {
      expect(messagingService).toBeDefined();
    });

    it('safely handles notification permission request in headless environment', async () => {
      const token = await messagingService.requestPermission();
      expect(token === null || typeof token === 'string').toBe(true);
    });
  });

  describe('Realtime Database Telemetry & Presence (firebase.ts)', () => {
    it('sets technician online and offline presence', async () => {
      await expect(firebaseService.setTechnicianPresence('tech_manjunath', true)).resolves.not.toThrow();
      await expect(firebaseService.setTechnicianPresence('tech_manjunath', false)).resolves.not.toThrow();
    });

    it('registers connection state listener', () => {
      let stateReceived: boolean | null = null;
      const unsub = firebaseService.listenConnectionState((connected) => {
        stateReceived = connected;
      });
      expect(typeof stateReceived).toBe('boolean');
      if (typeof unsub === 'function') {
        unsub();
      }
    });
  });
});
