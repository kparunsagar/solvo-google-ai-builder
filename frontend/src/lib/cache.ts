import { auth } from './firebase';

export interface ClearCacheOptions {
  reload?: boolean;
  preserveLanguage?: boolean;
  redirectUrl?: string;
}

/**
 * Performs a comprehensive, end-to-end cache clear across:
 * 1. Firebase Auth session (signOut)
 * 2. LocalStorage (clears all session, booking, and offline data; optionally preserves language)
 * 3. SessionStorage
 * 4. CacheStorage (Service Worker caches via window.caches)
 * 5. Service Worker Registrations (unregisters old workers to fetch fresh app bundle)
 * 6. IndexedDB (clears Firebase and offline cache stores)
 */
export async function clearAppCache(options: ClearCacheOptions = { reload: true, preserveLanguage: true }): Promise<void> {
  try {
    // 1. Preserve language preference if requested
    let savedLanguage: string | null = null;
    if (options.preserveLanguage !== false && typeof localStorage !== 'undefined') {
      try {
        savedLanguage = localStorage.getItem('mud_language');
      } catch {}
    }

    // 2. Sign out Firebase Auth
    try {
      if (auth && typeof auth.signOut === 'function') {
        await auth.signOut();
      }
    } catch (e) {
      console.warn('[CacheManager] Firebase signOut notice:', e);
    }

    // 3. Clear localStorage completely
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
        if (savedLanguage) {
          localStorage.setItem('mud_language', savedLanguage);
        }
      } catch (e) {
        console.warn('[CacheManager] localStorage clear notice:', e);
      }
    }

    // 4. Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('[CacheManager] sessionStorage clear notice:', e);
      }
    }

    // 5. Clear Browser CacheStorage (Service Worker offline assets)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      } catch (e) {
        console.warn('[CacheManager] CacheStorage clear notice:', e);
      }
    }

    // 6. Unregister active Service Workers so new bundle loads immediately
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e) {
        console.warn('[CacheManager] ServiceWorker unregister notice:', e);
      }
    }

    // 7. Clear IndexedDB offline cache databases if accessible
    if (typeof window !== 'undefined' && 'indexedDB' in window && typeof indexedDB.databases === 'function') {
      try {
        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
          if (
            dbInfo.name &&
            (dbInfo.name.includes('firebase') || dbInfo.name.includes('firestore') || dbInfo.name.includes('mud'))
          ) {
            try {
              indexedDB.deleteDatabase(dbInfo.name);
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[CacheManager] IndexedDB cleanup notice:', e);
      }
    }

    // 8. Redirect or Reload
    if (options.redirectUrl && typeof window !== 'undefined') {
      window.location.href = options.redirectUrl;
    } else if (options.reload !== false && typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (err) {
    console.error('[CacheManager] Unexpected error clearing app cache:', err);
    if (options.reload !== false && typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
