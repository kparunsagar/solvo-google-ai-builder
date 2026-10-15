// Firebase Realtime Database & Firestore Adapter for MyUrbanDaily Free Tier
// Supports official Google Firebase project keys via environment variables or default free-tier project.

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  databaseURL: string;
  storageBucket: string;
}

import { firebaseConfig, rtdb } from '@/lib/firebase';
import { ref as dbRef, onValue, set, onDisconnect } from 'firebase/database';

const env = (import.meta as any).env || {};

export const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'myurbandaily-458d0',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://myurbandaily-458d0-default-rtdb.firebaseio.com',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || 'myurbandaily-458d0.firebasestorage.app'
};

export const isFirebaseConfigured = (): boolean => {
  return !!FIREBASE_CONFIG.projectId && !FIREBASE_CONFIG.apiKey.includes('MockKey');
};

export const firebaseService = {
  // Sync booking record to Firebase Realtime Database
  async syncBooking(booking: any): Promise<boolean> {
    try {
      if (!isFirebaseConfigured()) {
        // Persist locally for instant zero-config testing
        localStorage.setItem(`firebase_booking_${booking.id}`, JSON.stringify(booking));
        return true;
      }

      const url = FIREBASE_CONFIG.apiKey
        ? `${FIREBASE_CONFIG.databaseURL}/bookings/${booking.id}.json?auth=${FIREBASE_CONFIG.apiKey}`
        : `${FIREBASE_CONFIG.databaseURL}/bookings/${booking.id}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...booking,
          last_synced_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('[Firebase RTDB] Network sync failed, falling back to local store:', err);
      localStorage.setItem(`firebase_booking_${booking.id}`, JSON.stringify(booking));
      return false;
    }
  },

  // Broadcast technician GPS coordinate telemetry
  async updateTelemetry(bookingId: string, coords: { lat: number; lng: number; speedKmh: number; heading: number }): Promise<void> {
    try {
      const url = FIREBASE_CONFIG.apiKey
        ? `${FIREBASE_CONFIG.databaseURL}/live_tracking/${bookingId}.json?auth=${FIREBASE_CONFIG.apiKey}`
        : `${FIREBASE_CONFIG.databaseURL}/live_tracking/${bookingId}.json`;
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...coords,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      // Non-blocking telemetry sync
    }
  },

  // Subscribe to live telemetry stream
  async getLiveTelemetry(bookingId: string): Promise<any> {
    try {
      if (!isFirebaseConfigured()) {
        const stored = localStorage.getItem(`firebase_telemetry_${bookingId}`);
        return stored ? JSON.parse(stored) : null;
      }

      const url = `${FIREBASE_CONFIG.databaseURL}/live_tracking/${bookingId}.json`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      return null;
    }
    return null;
  },

  // ─── Realtime Presence & Connection Health (.info/connected) ───────────────
  /**
   * Listen to Firebase Realtime Database connection state
   */
  listenConnectionState(callback: (connected: boolean) => void): (() => void) | null {
    try {
      const connectedRef = dbRef(rtdb, '.info/connected');
      return onValue(connectedRef, (snap) => {
        callback(snap.val() === true);
      });
    } catch {
      // Offline fallback
      callback(typeof navigator !== 'undefined' ? navigator.onLine : true);
      return null;
    }
  },

  /**
   * Manage Technician online availability with automatic disconnect cleanup
   */
  async setTechnicianPresence(providerId: string, isOnline: boolean): Promise<void> {
    try {
      const presenceRef = dbRef(rtdb, `presence/${providerId}`);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Presence timeout')), 1500));

      if (isOnline) {
        await Promise.race([
          set(presenceRef, {
            isOnline: true,
            lastSeen: new Date().toISOString()
          }),
          timeoutPromise
        ]);
        // On abrupt disconnect, automatically set offline
        onDisconnect(presenceRef).set({
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      } else {
        await Promise.race([
          set(presenceRef, {
            isOnline: false,
            lastSeen: new Date().toISOString()
          }),
          timeoutPromise
        ]);
      }
    } catch (err) {
      console.warn('[Firebase Presence] Notice:', err);
    }
  }
};
