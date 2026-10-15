import React, { useEffect } from 'react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, isFirebaseLive } from '@/lib/firebase';

type WsMessage = {
  type: string;
  [key: string]: any;
};

type SocketContextType = {
  subscribe: (handler: (msg: WsMessage) => void) => () => void;
  send: (msg: WsMessage) => void;
};

const SocketContext = React.createContext<SocketContextType | null>(null);
const subscribers = new Set<(msg: WsMessage) => void>();

export function SocketProvider({
  children,
  token,
}: {
  children: React.ReactNode;
  token: string | null;
}) {
  useEffect(() => {
    // 1. Firebase Firestore real-time live updates (Free Tier)
    let unsubscribeFirestore: (() => void) | null = null;
    let isInitialSnapshot = true;
    if (isFirebaseLive()) {
      try {
        const q = query(collection(db, 'bookings'), orderBy('created_at', 'desc'), limit(20));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          if (isInitialSnapshot) {
            isInitialSnapshot = false;
            // On initial load, only emit BOOKING_CREATED for genuine fresh bookings created in the last 90 seconds
            snapshot.docChanges().forEach((change) => {
              const data = { id: change.doc.id, ...change.doc.data() };
              const ageMs = Date.now() - new Date((data as any).created_at || 0).getTime();
              if (change.type === 'added' && ageMs < 90000 && (data as any).status === 'PENDING') {
                subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: data }));
              }
            });
            return;
          }
          snapshot.docChanges().forEach((change) => {
            const data = { id: change.doc.id, ...change.doc.data() };
            if (change.type === 'added') {
              subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: data }));
            } else if (change.type === 'modified') {
              subscribers.forEach((fn) => fn({ type: 'BOOKING_UPDATED', booking: data }));
            }
          });
        });
      } catch (err) {
        console.warn('[Firestore Live] Realtime snapshot listener error:', err);
      }
    }

    // 2. BroadcastChannel for instant cross-tab & cross-window synchronization (0ms latency)
    let bus: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'NEW_BOOKING_CREATED' && payload) {
            subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: payload }));
          } else if ((type === 'BOOKING_UPDATED' || type === 'BOOKING_STATUS_UPDATED') && payload) {
            subscribers.forEach((fn) => fn({ type: 'BOOKING_UPDATED', booking: payload }));
          }
        };
      }
    } catch {}

    // 3. Storage event listener for cross-tab localStorage updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mud_bookings' && e.newValue) {
        try {
          const list = JSON.parse(e.newValue);
          if (Array.isArray(list) && list.length > 0) {
            const newest = list[0];
            const ageMs = Date.now() - new Date(newest.created_at || 0).getTime();
            if (newest.status === 'PENDING' && ageMs < 60000) {
              subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: newest }));
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Window CustomEvent listener for instant zero-latency in-browser sync
    const handleCreated = (e: any) => {
      subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: e.detail }));
    };
    const handleUpdated = (e: any) => {
      subscribers.forEach((fn) => fn({ type: 'BOOKING_UPDATED', booking: e.detail }));
    };
    const handleSyncEvent = (e: any) => {
      const { type, payload } = e.detail || {};
      if (type === 'NEW_BOOKING_CREATED' && payload) {
        subscribers.forEach((fn) => fn({ type: 'BOOKING_CREATED', booking: payload }));
      } else if (type === 'BOOKING_UPDATED' && payload) {
        subscribers.forEach((fn) => fn({ type: 'BOOKING_UPDATED', booking: payload }));
      }
    };

    window.addEventListener('mud_booking_created', handleCreated);
    window.addEventListener('mud_booking_updated', handleUpdated);
    window.addEventListener('urbandaily_sync_event', handleSyncEvent);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      bus?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mud_booking_created', handleCreated);
      window.removeEventListener('mud_booking_updated', handleUpdated);
      window.removeEventListener('urbandaily_sync_event', handleSyncEvent);
    };
  }, [token]);

  const subscribe = (handler: (msg: WsMessage) => void) => {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  };

  const send = (msg: WsMessage) => {
    subscribers.forEach((fn) => fn(msg));
  };

  return (
    <SocketContext.Provider value={{ subscribe, send }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = React.useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}
