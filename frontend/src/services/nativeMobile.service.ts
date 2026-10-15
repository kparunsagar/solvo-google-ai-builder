// SOLVO — Enterprise Native Mobile Hardware & Platform Service
// Seamlessly bridges React Vite web frontend with Android (Google Play) & iOS (App Store)

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';

export interface NativePlatformInfo {
  isNative: boolean;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
}

export const nativeMobileService = {
  /**
   * Returns true if running inside Android APK/AAB or iOS IPA wrapper
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Returns current active platform
   */
  getPlatform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  },

  /**
   * Initialize native mobile features (Status Bar, Splash Screen, Back Button, Deep Links)
   */
  async initialize(): Promise<void> {
    if (!this.isNative()) {
      return;
    }

    console.log(`[NativeMobile] Initializing native runtime for platform: ${this.getPlatform()}`);

    try {
      // 1. Status Bar Styling
      await StatusBar.setStyle({ style: Style.Dark });
      if (this.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#1e3a8a' });
      }
    } catch (e) {
      console.warn('[NativeMobile] StatusBar setup note:', e);
    }

    try {
      // 2. Hide Splash Screen after React has rendered
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (e) {
      console.warn('[NativeMobile] SplashScreen note:', e);
    }

    try {
      // 3. Android Hardware Back Button Handling
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.location.pathname !== '/' && window.location.pathname !== '') {
          window.history.back();
        } else {
          // At root page: minimize / exit cleanly
          App.exitApp();
        }
      });
    } catch (e) {
      console.warn('[NativeMobile] BackButton listener note:', e);
    }

    try {
      // 4. Native Deep Linking (solvo://, myurbandaily:// or https://solvo.web.app)
      App.addListener('appUrlOpen', (event) => {
        console.log('[NativeMobile] Deep Link opened:', event.url);
        try {
          const url = new URL(event.url);
          const route = url.pathname + url.search;
          if (route && window.location.pathname !== route) {
            window.location.href = route;
          }
        } catch {
          const path = event.url.replace(/^(?:solvo|myurbandaily):\/\//, '/');
          if (path && window.location.pathname !== path) {
            window.location.href = path;
          }
        }
      });
    } catch (e) {
      console.warn('[NativeMobile] DeepLink listener note:', e);
    }
  },

  /**
   * Request and register for Native Push Notifications (FCM / APNs)
   */
  async registerPushNotifications(onTokenReceived?: (token: string) => void): Promise<boolean> {
    if (!this.isNative()) {
      return false;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[NativeMobile] Push notification permission not granted:', permStatus.receive);
        return false;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('[NativeMobile] FCM Registration Token:', token.value);
        if (onTokenReceived) {
          onTokenReceived(token.value);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[NativeMobile] Push registration error:', err.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NativeMobile] Push notification received in foreground:', notification);
      });

      return true;
    } catch (err) {
      console.warn('[NativeMobile] Push notification init note:', err);
      return false;
    }
  },

  /**
   * Get high-accuracy GPS coordinates via native hardware bridge
   */
  async getNativeCurrentPosition(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
    if (!this.isNative()) {
      return null;
    }

    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      };
    } catch (err) {
      console.warn('[NativeMobile] Native geolocation fallback:', err);
      return null;
    }
  }
};
