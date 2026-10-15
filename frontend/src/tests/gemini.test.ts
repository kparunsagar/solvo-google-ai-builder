import { describe, it, expect, beforeEach } from 'vitest';
import {
  diagnoseApplianceImage,
  verifyBiometricFaceKYC,
  parseVoiceBookingIntent,
  getGeminiTelemetry,
  setGeminiApiKey,
  checkCloudRunGateway
} from '../lib/gemini';

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
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = localStorageMock;
}

describe('Google Gemini 1.5 Flash Core Multimodal Engine', () => {
  beforeEach(() => {
    localStorageMock.clear();
    setGeminiApiKey('');
  });

  it('provides comprehensive telemetry adhering to Google AI Studio free tier quota (15 RPM / 1,500 RPD)', () => {
    const telemetry = getGeminiTelemetry();
    expect(telemetry.dailyQuotaLimit).toBe(1500);
    expect(telemetry.minuteQuotaLimit).toBe(15);
    expect(telemetry.activeModel).toBe('gemini-1.5-flash');
    expect(telemetry.isLiveKeyConfigured).toBe(false);
  });

  it('performs multimodal visual appliance diagnostics with transparent parts pricing and labor estimate', async () => {
    const dummyImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
    const result = await diagnoseApplianceImage(dummyImageBase64, 'image/jpeg', 'RO water purifier');

    expect(result.success).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.recommendedLaborPriceINR).toBeGreaterThan(0);
    expect(result.estimatedTotalINR).toBeGreaterThanOrEqual(result.recommendedLaborPriceINR);
    expect(result.requiredParts.length).toBeGreaterThan(0);
    expect(result.requiredParts[0].estimatedPriceINR).toBeGreaterThan(0);
    expect(result.applianceType).toContain('Water Purifier');
  });

  it('diagnoses motor and pump issues with electrical safety warnings', async () => {
    const dummyMotorImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await diagnoseApplianceImage(dummyMotorImage, 'image/png', 'water pump motor');

    expect(result.success).toBe(true);
    expect(result.severity).toBe('HIGH');
    expect(result.applianceType).toContain('Motor');
    expect(result.safetyWarning).toBeDefined();
    expect(result.requiredParts.some(p => p.partName.toLowerCase().includes('capacitor'))).toBe(true);
  });

  it('performs biometric KYC facial verification comparing government KYC ID and doorstep selfie', async () => {
    const kycDoc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...';
    const liveSelfie = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...';

    const result = await verifyBiometricFaceKYC(kycDoc, liveSelfie, 'Ramesh Kumar');

    expect(result.success).toBe(true);
    expect(result.matchConfidence).toBeGreaterThanOrEqual(75);
    expect(result.isMatch).toBe(true);
    expect(result.livenessVerified).toBe(true);
    expect(result.spoofDetected).toBe(false);
    expect(result.auditNotes).toContain('Ramesh Kumar');
  });

  it('parses Indic voice intent (Kannada and English) into structured booking parameters', async () => {
    const kannadaTranscript = 'ನಮ್ಮ ಮನೆಯಲ್ಲಿ ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ';
    const result = await parseVoiceBookingIntent(kannadaTranscript, 'kn-IN');

    expect(result.success).toBe(true);
    expect(result.serviceCategory).toBe('Motor Rewinding & Pump Repair');
    expect(result.serviceId).toBe('cat-motor');
    expect(result.urgency).toBe('HIGH');
  });

  it('correctly tracks API invocation telemetry across calls', async () => {
    await diagnoseApplianceImage('dummy', 'image/jpeg', 'plumbing');
    await parseVoiceBookingIntent('switch sparking', 'en-IN');

    const telemetry = getGeminiTelemetry();
    expect(telemetry.totalCallsToday).toBeGreaterThanOrEqual(2);
    expect(telemetry.requestsThisMinute).toBeGreaterThanOrEqual(2);
  });

  it('checks Google Cloud Run serverless gateway availability with zero latency penalty fallback', async () => {
    const status = await checkCloudRunGateway();
    expect(status).toBeDefined();
    expect(typeof status.isAvailable).toBe('boolean');
    expect(status.latencyMs).toBeDefined();
    expect(status.lastChecked).toBeDefined();
  });
});
