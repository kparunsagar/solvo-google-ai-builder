import { app } from '@/lib/firebase';
import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  isSupported
} from 'firebase/remote-config';

export interface RemoteConfigValues {
  emergencyBannerText: string;
  doorstepSlaMinutes: number;
  supportPhone: string;
  codEnabled: boolean;
  maintenanceMode: boolean;
  surgePricingMultiplier: number;
}

const DEFAULT_CONFIG: RemoteConfigValues = {
  emergencyBannerText: '',
  doorstepSlaMinutes: 60,
  supportPhone: '+91 9845001122',
  codEnabled: true,
  maintenanceMode: false,
  surgePricingMultiplier: 1.0
};

class RemoteConfigService {
  private remoteConfig: any = null;
  private values: RemoteConfigValues = { ...DEFAULT_CONFIG };
  private initialized: boolean = false;

  async init(): Promise<RemoteConfigValues> {
    if (typeof window === 'undefined') return this.values;

    try {
      const supported = await isSupported();
      if (!supported) return this.values;

      this.remoteConfig = getRemoteConfig(app);
      this.remoteConfig.settings = {
        minimumFetchIntervalMillis: 60 * 1000, // 1 minute in client
        fetchTimeoutMillis: 10 * 1000
      };

      this.remoteConfig.defaultConfig = {
        emergency_banner_text: DEFAULT_CONFIG.emergencyBannerText,
        doorstep_sla_minutes: DEFAULT_CONFIG.doorstepSlaMinutes,
        support_phone: DEFAULT_CONFIG.supportPhone,
        cod_enabled: DEFAULT_CONFIG.codEnabled,
        maintenance_mode: DEFAULT_CONFIG.maintenanceMode,
        surge_pricing_multiplier: DEFAULT_CONFIG.surgePricingMultiplier
      };

      await fetchAndActivate(this.remoteConfig);

      this.values = {
        emergencyBannerText: getValue(this.remoteConfig, 'emergency_banner_text').asString() || DEFAULT_CONFIG.emergencyBannerText,
        doorstepSlaMinutes: getValue(this.remoteConfig, 'doorstep_sla_minutes').asNumber() || DEFAULT_CONFIG.doorstepSlaMinutes,
        supportPhone: getValue(this.remoteConfig, 'support_phone').asString() || DEFAULT_CONFIG.supportPhone,
        codEnabled: getValue(this.remoteConfig, 'cod_enabled').asBoolean(),
        maintenanceMode: getValue(this.remoteConfig, 'maintenance_mode').asBoolean(),
        surgePricingMultiplier: getValue(this.remoteConfig, 'surge_pricing_multiplier').asNumber() || DEFAULT_CONFIG.surgePricingMultiplier
      };

      this.initialized = true;
    } catch (e) {
      console.warn('[Remote Config] Initialization notice (using safe defaults):', e);
    }
    return this.values;
  }

  getValues(): RemoteConfigValues {
    return this.values;
  }

  get<K extends keyof RemoteConfigValues>(key: K): RemoteConfigValues[K] {
    return this.values[key];
  }
}

export const remoteConfigService = new RemoteConfigService();
