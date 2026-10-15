import { app } from '@/lib/firebase';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

class MessagingService {
  private messaging: any = null;
  private token: string | null = null;
  private supported: boolean = false;

  async init(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      this.supported = await isSupported();
      if (this.supported) {
        this.messaging = getMessaging(app);
        return true;
      }
    } catch (e) {
      console.warn('[FCM] Messaging initialization warning:', e);
    }
    return false;
  }

  /**
   * Request browser notification permission and generate device FCM registration token
   */
  async requestPermission(): Promise<string | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.info('[FCM] Notification permission denied or dismissed');
        return null;
      }

      if (!this.messaging) {
        const ok = await this.init();
        if (!ok || !this.messaging) return null;
      }

      // Register service worker if needed
      let swReg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined);
      }

      const token = await getToken(this.messaging, {
        serviceWorkerRegistration: swReg
      });

      this.token = token;
      if (token) {
        localStorage.setItem('mud_fcm_token', token);
      }
      return token;
    } catch (err) {
      console.warn('[FCM] Error obtaining device push token:', err);
      return null;
    }
  }

  /**
   * Listen for real-time foreground push notifications
   */
  onForeground(callback: (payload: PushNotificationPayload) => void): (() => void) | null {
    if (!this.messaging) return null;

    try {
      return onMessage(this.messaging, (msg) => {
        const payload: PushNotificationPayload = {
          title: msg.notification?.title || msg.data?.title || 'SOLVO Service Alert',
          body: msg.notification?.body || msg.data?.body || '',
          icon: msg.notification?.icon || '/favicon.svg',
          data: msg.data
        };
        callback(payload);
      });
    } catch (err) {
      console.warn('[FCM] onMessage registration error:', err);
      return null;
    }
  }

  /**
   * Safe in-app / system notification dispatch
   */
  notify(title: string, options?: NotificationOptions): void {
    if (typeof window === 'undefined') return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options
        });
        return;
      } catch {}
    }

    // In-app fallback event
    window.dispatchEvent(new CustomEvent('mud_inapp_alert', {
      detail: { title, body: options?.body || '' }
    }));
  }
}

export const messagingService = new MessagingService();
