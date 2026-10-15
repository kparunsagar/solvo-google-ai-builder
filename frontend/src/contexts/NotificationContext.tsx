import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db, isFirebaseLive } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getSecureRandomString } from '@/utils/crypto';

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'SUPPORT_REPLY'
    | 'JOB_ACCEPTED'
    | 'JOB_EN_ROUTE'
    | 'JOB_COMPLETED'
    | 'JOB_CANCELLED'
    | 'KYC_APPROVED'
    | 'KYC_REJECTED'
    | 'NEW_JOB_OFFER'
    | 'TICKET_CREATED';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  activeToast: AppNotification | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
  } catch {}
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const storageKey = user ? `mud_notifications_${user.id}` : 'mud_notifications_guest';

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  }, [storageKey]);

  const saveNotifications = useCallback((list: AppNotification[]) => {
    setNotifications(list);
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {}
  }, [storageKey]);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${getSecureRandomString(4)}`,
      read: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => {
      // Avoid exact duplicates within 10 seconds
      const exists = prev.some(
        n => n.type === newNotif.type && n.title === newNotif.title && n.message === newNotif.message &&
             (Date.now() - new Date(n.created_at).getTime() < 10000)
      );
      if (exists) return prev;
      const updated = [newNotif, ...prev].slice(0, 50); // Keep max 50
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveToast(newNotif);
    playNotificationChime();

    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
    }, 6000);
  }, [storageKey]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (isFirebaseLive()) {
      try {
        updateDoc(doc(db, 'notifications', id), { read: true }).catch(() => {});
      } catch {}
    }
  }, [storageKey]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (isFirebaseLive() && user?.id) {
      notifications.forEach(n => {
        if (!n.read) {
          try {
            updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {});
          } catch {}
        }
      });
    }
  }, [storageKey, user?.id, notifications]);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (isFirebaseLive()) {
      try {
        deleteDoc(doc(db, 'notifications', id)).catch(() => {});
      } catch {}
    }
  }, [storageKey]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // ─── Real-Time Event Listeners for Multi-Channel Sync ────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    // 1. Cloud Firestore /notifications Collection Real-Time Listener
    if (isFirebaseLive() && user?.id) {
      try {
        const notifCol = collection(db, 'notifications');
        const q = query(notifCol, where('userId', '==', user.id));
        const unsubNotif = onSnapshot(q, (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data() as any;
              const notif: AppNotification = {
                id: change.doc.id,
                userId: data.userId || user.id,
                type: data.type || 'SUPPORT_REPLY',
                title: data.title || 'Notification',
                message: data.message || '',
                link: data.link || '',
                read: Boolean(data.read),
                created_at: data.created_at || new Date().toISOString()
              };

              setNotifications(prev => {
                if (prev.some(n => n.id === notif.id)) {
                  return prev.map(n => n.id === notif.id ? notif : n);
                }
                if (!notif.read) {
                  setActiveToast(notif);
                  playNotificationChime();
                  setTimeout(() => {
                    setActiveToast(curr => (curr?.id === notif.id ? null : curr));
                  }, 6000);
                }
                const updated = [notif, ...prev].slice(0, 50);
                try {
                  localStorage.setItem(storageKey, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            } else if (change.type === 'modified') {
              const data = change.doc.data() as any;
              setNotifications(prev => prev.map(n => n.id === change.doc.id ? { ...n, read: Boolean(data.read) } : n));
            } else if (change.type === 'removed') {
              setNotifications(prev => prev.filter(n => n.id !== change.doc.id));
            }
          });
        });
        unsubs.push(unsubNotif);
      } catch (err) {
        console.warn('[NotificationContext] Firestore notifications listener error:', err);
      }
    }

    // 2. Real-time direct Firestore trigger for support_tickets
    if (isFirebaseLive() && user?.id) {
      try {
        const ticketCol = collection(db, 'support_tickets');
        const qTicket = query(ticketCol, where('user_id', '==', user.id));
        const unsubTicket = onSnapshot(qTicket, (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'modified' || change.type === 'added') {
              const t = change.doc.data() as any;
              if (t.unread_user && t.admin_response) {
                const notifId = `notif-ticket-${change.doc.id}-${t.messages?.length || 1}`;
                setNotifications(prev => {
                  if (prev.some(n => n.id === notifId)) return prev;
                  const newNotif: AppNotification = {
                    id: notifId,
                    userId: user.id,
                    type: 'SUPPORT_REPLY',
                    title: `Support Reply on ${t.ticket_code || 'Ticket'}`,
                    message: `${t.assigned_to || 'Operations Support'}: ${t.admin_response}`,
                    link: user.role === 'provider' ? `/technician?tab=tickets&ticketId=${change.doc.id}` : `/bookings?tab=tickets&ticketId=${change.doc.id}`,
                    read: false,
                    created_at: t.updated_at || new Date().toISOString()
                  };
                  setActiveToast(newNotif);
                  playNotificationChime();
                  setTimeout(() => {
                    setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
                  }, 6000);
                  const updated = [newNotif, ...prev].slice(0, 50);
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
              }
            }
          });
        });
        unsubs.push(unsubTicket);
      } catch (err) {
        console.warn('[NotificationContext] Firestore ticket listener error:', err);
      }
    }

    // 3. For customers: listen to bookings where technician is assigned
    if (isFirebaseLive() && user?.id && user.role === 'customer') {
      try {
        const bookCol = collection(db, 'bookings');
        const qBook = query(bookCol, where('customer_id', '==', user.id));
        const unsubBook = onSnapshot(qBook, (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const b = change.doc.data() as any;
              if (b.technician_id && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')) {
                const notifId = `notif-book-accepted-${change.doc.id}`;
                setNotifications(prev => {
                  if (prev.some(n => n.id === notifId)) return prev;
                  const newNotif: AppNotification = {
                    id: notifId,
                    userId: user.id,
                    type: 'JOB_ACCEPTED',
                    title: 'Technician Assigned & En Route',
                    message: `✅ ${b.technician_name || 'Your technician'} accepted booking #${b.booking_code || change.doc.id} and is on the way!`,
                    link: '/bookings',
                    read: false,
                    created_at: b.accepted_at || new Date().toISOString()
                  };
                  setActiveToast(newNotif);
                  playNotificationChime();
                  setTimeout(() => {
                    setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
                  }, 6000);
                  const updated = [newNotif, ...prev].slice(0, 50);
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
              }
            }
          });
        });
        unsubs.push(unsubBook);
      } catch (err) {
        console.warn('[NotificationContext] Firestore bookings listener error:', err);
      }
    }

    // 4. For technicians: listen to KYC status changes
    if (isFirebaseLive() && user?.id && user.role === 'provider') {
      try {
        const unsubUser = onSnapshot(doc(db, 'users', user.id), (snap) => {
          if (snap.exists()) {
            const uData = snap.data() as any;
            if (uData.kyc_status && uData.kyc_status !== 'not_submitted' && uData.kyc_status !== 'pending') {
              const notifId = `notif-kyc-${user.id}-${uData.kyc_status}`;
              setNotifications(prev => {
                if (prev.some(n => n.id === notifId)) return prev;
                const isApproved = uData.kyc_status === 'approved' || uData.kyc_status === 'APPROVED';
                const newNotif: AppNotification = {
                  id: notifId,
                  userId: user.id,
                  type: isApproved ? 'KYC_APPROVED' : 'KYC_REJECTED',
                  title: isApproved ? '🎉 KYC Approved!' : '⚠️ KYC Verification Notice',
                  message: isApproved
                    ? 'Your documents have been verified by Operations. You can now accept customer jobs!'
                    : (uData.rejection_reason || 'Your verification requires document recapture. Check your workbench.'),
                  link: '/technician',
                  read: false,
                  created_at: uData.kyc_reviewed_at || new Date().toISOString()
                };
                setActiveToast(newNotif);
                playNotificationChime();
                setTimeout(() => {
                  setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
                }, 6000);
                const updated = [newNotif, ...prev].slice(0, 50);
                try {
                  localStorage.setItem(storageKey, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }
        });
        unsubs.push(unsubUser);
      } catch (err) {
        console.warn('[NotificationContext] Firestore user KYC listener error:', err);
      }
    }

    // 5. BroadcastChannel listener for same-browser tabs
    let bus: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.onmessage = (evt) => {
          const { type, payload } = evt.data || {};
          if (!type || !payload) return;

          // Ticket Reply from Support Specialist
          if (type === 'SUPPORT_TICKET_REPLY' || type === 'SUPPORT_TICKET_UPDATED') {
            const ticket = payload.ticket || payload;
            const isMyTicket =
              (ticket.user_id && ticket.user_id === user.id) ||
              (user.phone && ticket.user_phone && ticket.user_phone.includes(user.phone)) ||
              (user.email && ticket.user_email && ticket.user_email.toLowerCase() === user.email.toLowerCase());

            if (isMyTicket && payload.message) {
              addNotification({
                userId: user.id,
                type: 'SUPPORT_REPLY',
                title: `Support Reply on ${ticket.ticket_code || 'Ticket'}`,
                message: `${payload.sender_name || 'Support Specialist'}: ${payload.message}`,
                link: user.role === 'provider' ? `/technician?tab=tickets&ticketId=${ticket.id}` : `/bookings?tab=tickets&ticketId=${ticket.id}`
              });
            }
          }

          // KYC Approval or Rejection (for Technician)
          if (type === 'KYC_STATUS_UPDATED' && user.role === 'provider') {
            const isMe = (payload.userId && payload.userId === user.id) || (payload.providerId && payload.providerId.includes(user.id));
            if (isMe) {
              if (payload.decision === 'approved') {
                addNotification({
                  userId: user.id,
                  type: 'KYC_APPROVED',
                  title: '🎉 KYC Approved!',
                  message: 'Your documents have been verified by Operations. You can now accept customer jobs.',
                  link: '/technician'
                });
              } else if (payload.decision === 'rejected') {
                addNotification({
                  userId: user.id,
                  type: 'KYC_REJECTED',
                  title: '⚠️ KYC Verification Notice',
                  message: 'Your verification requires biometric / document recapture. Review instructions in your workbench.',
                  link: '/technician'
                });
              }
            }
          }

          // Booking Assigned / Accepted (for Customer)
          if (type === 'BOOKING_ACCEPTED' && user.role === 'customer') {
            const b = payload.booking || payload;
            if (b.customer_id === user.id || (user.phone && b.customer_phone?.includes(user.phone))) {
              addNotification({
                userId: user.id,
                type: 'JOB_ACCEPTED',
                title: 'Technician Assigned',
                message: `✅ ${b.technician_name || 'Your technician'} has accepted booking ${b.booking_code || b.id} and is en route!`,
                link: '/bookings'
              });
            }
          }

          // Booking Cancelled
          if (type === 'BOOKING_CANCELLED') {
            const b = payload.booking || payload;
            if (user.role === 'provider' && (b.technician_id === user.id || b.technician_phone?.includes(user.phone || ''))) {
              addNotification({
                userId: user.id,
                type: 'JOB_CANCELLED',
                title: 'Job Order Cancelled',
                message: `Customer cancelled booking ${b.booking_code || b.id}. Reason: ${payload.reason || 'Customer request'}`,
                link: '/technician'
              });
            } else if (user.role === 'customer' && b.customer_id === user.id) {
              addNotification({
                userId: user.id,
                type: 'JOB_CANCELLED',
                title: 'Booking Cancelled',
                message: `Booking ${b.booking_code || b.id} has been cancelled successfully.`,
                link: '/bookings'
              });
            }
          }
        };
      }
    } catch {}

    // 6. Custom window events
    const handleWindowBookingAccepted = (e: any) => {
      if (user.role === 'customer') {
        const detail = e.detail || {};
        addNotification({
          userId: user.id,
          type: 'JOB_ACCEPTED',
          title: 'Technician Assigned',
          message: `✅ ${detail.technician_name || 'Your technician'} has accepted your booking and is on the way!`,
          link: '/bookings'
        });
      }
    };

    const handleWindowBookingCancelled = (e: any) => {
      const detail = e.detail || {};
      if (user.role === 'provider' && detail.id) {
        addNotification({
          userId: user.id,
          type: 'JOB_CANCELLED',
          title: 'Job Order Cancelled',
          message: `Booking ${detail.booking_code || detail.id} was cancelled by customer.`,
          link: '/technician'
        });
      }
    };

    window.addEventListener('mud_booking_accepted', handleWindowBookingAccepted);
    window.addEventListener('mud_booking_cancelled', handleWindowBookingCancelled);

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch {}
      });
      bus?.close();
      window.removeEventListener('mud_booking_accepted', handleWindowBookingAccepted);
      window.removeEventListener('mud_booking_cancelled', handleWindowBookingCancelled);
    };
  }, [user, addNotification, storageKey]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        activeToast,
        dismissToast
      }}
    >
      {children}

      {/* Global Interactive Notification Toast */}
      {activeToast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            maxWidth: 420,
            width: '92%',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor:
                activeToast.type === 'SUPPORT_REPLY'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : activeToast.type === 'JOB_ACCEPTED' || activeToast.type === 'KYC_APPROVED'
                  ? 'rgba(74, 222, 128, 0.2)'
                  : activeToast.type === 'KYC_REJECTED' || activeToast.type === 'JOB_CANCELLED'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(168, 85, 247, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0
            }}
          >
            {activeToast.type === 'SUPPORT_REPLY'
              ? '🎧'
              : activeToast.type === 'JOB_ACCEPTED' || activeToast.type === 'KYC_APPROVED'
              ? '✅'
              : activeToast.type === 'KYC_REJECTED' || activeToast.type === 'JOB_CANCELLED'
              ? '⚠️'
              : '⚡'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                {activeToast.title}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Just now</span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4, wordBreak: 'break-word' }}>
              {activeToast.message}
            </p>
            {activeToast.link && (
              <a
                href={activeToast.link}
                onClick={() => {
                  markAsRead(activeToast.id);
                  dismissToast();
                }}
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  textDecoration: 'underline'
                }}
              >
                View Details →
              </a>
            )}
          </div>

          <button
            onClick={dismissToast}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              flexShrink: 0
            }}
          >
            ✕
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
