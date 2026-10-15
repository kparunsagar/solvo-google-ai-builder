import { describe, it, expect } from 'vitest';
import { firebaseConfig, isFirebaseLive, storage, rtdb } from './firebase';

describe('Firebase Configuration & Utilities (firebase.ts)', () => {
  it('exports a valid firebaseConfig structure', () => {
    expect(firebaseConfig).toBeDefined();
    expect(typeof firebaseConfig).toBe('object');
    expect(firebaseConfig).toHaveProperty('apiKey');
    expect(firebaseConfig).toHaveProperty('authDomain');
    expect(firebaseConfig).toHaveProperty('projectId');
    expect(firebaseConfig).toHaveProperty('databaseURL');
  });

  it('determines if Firebase is live based on apiKey', () => {
    const isLive = isFirebaseLive();
    expect(typeof isLive).toBe('boolean');
    expect(isLive).toBe(true);
  });

  it('initializes Cloud Storage and Realtime Database instances', () => {
    expect(storage).toBeDefined();
    expect(rtdb).toBeDefined();
  });
});
