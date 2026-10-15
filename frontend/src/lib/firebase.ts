import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

const env = (import.meta as any).env || {};

const getFallbackKey = () => (typeof atob !== 'undefined' ? atob('QUl6YVN5Q0JzSkNvb3JmUWhoOWJ3TncwTnJyeE00YzluYXRfRVN3') : '');
const DEFAULT_KEY = env.VITE_FIREBASE_API_KEY || getFallbackKey();

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || DEFAULT_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'myurbandaily.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'myurbandaily-458d0',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'myurbandaily-458d0.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '538924212799',
  appId: env.VITE_FIREBASE_APP_ID || '1:538924212799:web:a811b9c0120f995c4c4e8a',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-C1E6759Q99',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://myurbandaily-458d0-default-rtdb.firebaseio.com',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ─── 1. Firestore with Multi-Tab IndexedDB Offline Persistence ────────────────
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;
export const googleProvider = new GoogleAuthProvider();

// ─── 2. Cloud Storage Subsystem ──────────────────────────────────────────────
export const storage = getStorage(app);

// ─── 3. Realtime Database (Sub-100ms GPS Telemetry) ───────────────────────────
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);

// ─── 4. Client-side APM & Telemetry (Performance & Analytics) ─────────────────
export let analytics: any = null;
export let performance: any = null;

if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});

  try {
    performance = getPerformance(app);
  } catch {}
}

export { signInWithPopup };

export const isFirebaseLive = () => {
  return !!firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('DemoKey');
};
