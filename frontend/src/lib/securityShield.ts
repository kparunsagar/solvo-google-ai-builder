/**
 * UrbanAI Ethical Hacker Defense Shield
 * Client-Side Tamper Resistance, Inspect Element Blocker, Anti-Debugging, and XSS Sanitization
 */

export interface SecurityShieldOptions {
  disableRightClick?: boolean;
  disableKeyShortcuts?: boolean;
  enableAntiDebugger?: boolean;
  enableConsoleWarning?: boolean;
  enableClickjackProtection?: boolean;
  enableCspEnforcement?: boolean;
  enablePrototypeProtection?: boolean;
  telemetryEndpoint?: string;
  onSecurityViolation?: (violationType: string, detail: string) => void;
}

const DEFAULT_OPTIONS: SecurityShieldOptions = {
  disableRightClick: true,
  disableKeyShortcuts: true,
  enableAntiDebugger: typeof process !== 'undefined' && (process as any).env?.NODE_ENV === 'production',
  enableConsoleWarning: true,
  enableClickjackProtection: true,
  enableCspEnforcement: true,
  enablePrototypeProtection: true,
  telemetryEndpoint: '/api/security/audit'
};

export class SecurityShield {
  private static instance: SecurityShield | null = null;
  private options: SecurityShieldOptions;
  private antiDebuggerTimer: any = null;
  private devToolsCheckTimer: any = null;
  private isDevToolsOpen: boolean = false;

  constructor(options: SecurityShieldOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public static init(options: SecurityShieldOptions = {}): () => void {
    if (!this.instance) {
      this.instance = new SecurityShield(options);
    }
    return this.instance.bootstrap();
  }

  public bootstrap(): () => void {
    if (typeof window === 'undefined') return () => {};

    const cleanups: (() => void)[] = [];

    // 1. Clickjacking Framebuster
    if (this.options.enableClickjackProtection) {
      this.enforceFramebuster();
    }

    // 2. Prototype Pollution Guard
    if (this.options.enablePrototypeProtection) {
      this.preventPrototypePollution();
    }

    // 3. Right-Click Context Menu Interception
    if (this.options.disableRightClick) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation('RIGHT_CLICK_ATTEMPT', 'User attempted to open inspect context menu');
        return false;
      };
      window.addEventListener('contextmenu', handleContextMenu, true);
      cleanups.push(() => window.removeEventListener('contextmenu', handleContextMenu, true));
    }

    // 4. Developer Tools Keyboard Shortcuts Interception
    if (this.options.disableKeyShortcuts) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        // F12 Developer Tools
        if (e.key === 'F12' || e.keyCode === 123) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('DEVTOOLS_KEY_F12', 'F12 Developer Tools key press intercepted');
          return false;
        }

        // Ctrl+Shift+I or Cmd+Option+I (Inspect Element)
        if (metaOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('DEVTOOLS_KEY_INSPECT', 'Inspect Element shortcut intercepted');
          return false;
        }

        // Ctrl+Shift+J or Cmd+Option+J (Console)
        if (metaOrCtrl && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('DEVTOOLS_KEY_CONSOLE', 'Console shortcut intercepted');
          return false;
        }

        // Ctrl+Shift+C or Cmd+Option+C (Inspect Element Picker)
        if (metaOrCtrl && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('DEVTOOLS_KEY_PICKER', 'Element picker shortcut intercepted');
          return false;
        }

        // Ctrl+U or Cmd+U (View Page Source)
        if (metaOrCtrl && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('VIEW_SOURCE_ATTEMPT', 'View Page Source shortcut intercepted');
          return false;
        }

        // Ctrl+S or Cmd+S (Save Page Source)
        if (metaOrCtrl && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
          e.preventDefault();
          e.stopPropagation();
          this.reportViolation('SAVE_SOURCE_ATTEMPT', 'Save Page shortcut intercepted');
          return false;
        }
      };

      window.addEventListener('keydown', handleKeyDown, true);
      cleanups.push(() => window.removeEventListener('keydown', handleKeyDown, true));
    }

    // 5. Console Warning & Honeypot
    if (this.options.enableConsoleWarning) {
      this.injectConsoleWarning();
    }

    // 6. Anti-Debugger Loop (in production)
    if (this.options.enableAntiDebugger) {
      this.startAntiDebugger();
      cleanups.push(() => this.stopAntiDebugger());
    }

    // 7. DevTools Viewport Dimension Delta Watcher
    this.startDevToolsWatcher();
    cleanups.push(() => this.stopDevToolsWatcher());

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }

  /**
   * High-Impact Console Warning
   */
  public injectConsoleWarning(): void {
    try {
      if (typeof console !== 'undefined' && console.clear) {
        console.clear();
      }
      const titleStyle = 'color: #ef4444; font-size: 26px; font-weight: 900; -webkit-text-stroke: 1px black;';
      const bodyStyle = 'color: #f59e0b; font-size: 13px; font-weight: 700; line-height: 1.5;';
      const legalStyle = 'color: #94a3b8; font-size: 11px; font-weight: 500;';

      console.log('%c⚠️ STOP! ETHICAL HACKER SECURITY SHIELD', titleStyle);
      console.log(
        '%cSOLVO runs active client-side tamper detection. Opening developer tools, modifying application state, or running arbitrary scripts is strictly prohibited.',
        bodyStyle
      );
      console.log(
        '%cPursuant to Section 66 of the Information Technology Act 2000 & Digital Personal Data Protection Act (DPDPA 2023), unauthorized system inspection, tampering, or extraction of customer personal records is punishable by law. Security incidents are logged with IP & device fingerprint.',
        legalStyle
      );
    } catch {}
  }

  /**
   * Framebuster Protection
   */
  private enforceFramebuster(): void {
    try {
      if (window.top && window.self !== window.top) {
        console.warn('[Security Shield] Clickjacking attempt detected! Breaking out of unauthorized frame.');
        if (document.documentElement) {
          document.documentElement.style.display = 'none';
        }
        window.top.location = window.self.location.href;
      }
    } catch {
      if (document.documentElement) {
        document.documentElement.style.display = 'none';
      }
      try {
        window.top!.location = window.self.location.href;
      } catch {}
    }
  }

  /**
   * Prototype Pollution Protection
   */
  private preventPrototypePollution(): void {
    try {
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
    } catch {}
  }

  /**
   * Anti-Debugger Timing Loop
   */
  private startAntiDebugger(): void {
    if (this.antiDebuggerTimer) return;

    this.antiDebuggerTimer = setInterval(() => {
      const startTime = performance.now();
      try {
        const trap = new Function('debugger');
        trap();
      } catch {}
      const endTime = performance.now();

      if (endTime - startTime > 100) {
        this.reportViolation('ACTIVE_DEBUGGER_PAUSE', 'Execution paused at developer tools breakpoint');
      }
    }, 2000);
  }

  private stopAntiDebugger(): void {
    if (this.antiDebuggerTimer) {
      clearInterval(this.antiDebuggerTimer);
      this.antiDebuggerTimer = null;
    }
  }

  /**
   * Dimension Delta Watcher (Detects Docked DevTools)
   */
  private startDevToolsWatcher(): void {
    if (typeof window === 'undefined') return;

    const threshold = 160;
    this.devToolsCheckTimer = setInterval(() => {
      const widthDelta = window.outerWidth - window.innerWidth > threshold;
      const heightDelta = window.outerHeight - window.innerHeight > threshold;

      if (widthDelta || heightDelta) {
        if (!this.isDevToolsOpen) {
          this.isDevToolsOpen = true;
          this.reportViolation('DEVTOOLS_DOCK_OPENED', 'Developer Tools inspection window detected');
        }
      } else {
        this.isDevToolsOpen = false;
      }
    }, 1500);
  }

  private stopDevToolsWatcher(): void {
    if (this.devToolsCheckTimer) {
      clearInterval(this.devToolsCheckTimer);
      this.devToolsCheckTimer = null;
    }
  }

  private reportViolation(type: string, detail: string): void {
    if (this.options.onSecurityViolation) {
      this.options.onSecurityViolation(type, detail);
    }

    // Transmit telemetry
    if (typeof fetch !== 'undefined' && this.options.telemetryEndpoint) {
      const payload = {
        type,
        detail,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      };
      fetch(this.options.telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }
}

// ─── XSS Sanitization Utilities ──────────────────────────────────────────────
export const xssSanitizer = {
  /**
   * HTML Entity Encode characters
   */
  encode(str: string): string {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Strip executable scripts, event handlers, and pseudo-protocols
   */
  clean(input: string): string {
    if (typeof input !== 'string') return '';
    let clean = input;
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<\/?(iframe|embed|object|frameset|frame|link|style)\b[^>]*>/gi, '');
    clean = clean.replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    clean = clean.replace(/(javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, 'blocked:');
    return clean.trim();
  }
};

export function initSecurityShield(options: SecurityShieldOptions = {}): () => void {
  return SecurityShield.init(options);
}
