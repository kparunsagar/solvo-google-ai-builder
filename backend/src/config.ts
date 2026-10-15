import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'sagara_urban_secret_super_secure_key_2026',
  jwtExpiresIn: '7d',
  
  // Regional Geographic Anchors (Sagara, Hosanagara, Honnali)
  regionalCenters: {
    sagara: {
      lat: 14.1670,
      lng: 75.0298,
      name: 'Sagara, Karnataka',
      pincode: '577401'
    },
    hosanagara: {
      lat: 13.9190,
      lng: 75.0670,
      name: 'Hosanagara, Karnataka',
      pincode: '577418'
    },
    honnali: {
      lat: 14.2443,
      lng: 75.6425,
      name: 'Honnali, Karnataka',
      pincode: '577217'
    }
  },
  sagaraCenter: {
    lat: 14.1670,
    lng: 75.0298,
    name: 'Sagara Town Central, Karnataka'
  },
  defaultSearchRadiusKm: 20, // 20 km coverage radius per regional hub

  // Pricing & Marketplace Policies
  platformCommissionRate: 0.20, // 20% marketplace platform commission
  gstRate: 0.18, // 18% GST standard for service aggregators
  discountBorneBy: ((process.env.DISCOUNT_BORNE_BY as 'platform' | 'technician') || 'platform'), // Option B by default

  // Geofence & Velocity Verification Policies
  geofenceRadiusMeters: parseInt(process.env.DOORSTEP_GEOFENCE_RADIUS_METERS || '150', 10),
  maxSpeedKmH: 150, // Maximum reasonable vehicle speed (rejects teleports > 150 km/h)

  // Payment Gateway configuration (Razorpay / Cashfree HMAC verification)
  paymentSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'rzp_sec_sagara_live_mock_577401',

  // Razorpay Gateway Settings & Flag
  razorpay: {
    enabled: process.env.RAZORPAY_ENABLED !== 'false',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'rzp_sec_sagara_live_mock_577401',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'rzp_sec_sagara_live_mock_577401'
  },

  // Real-time timeouts
  providerAcceptTimeoutSecs: 60,

  nodeEnv: process.env.NODE_ENV || 'development'
};

// ─── Security Startup Guard: Refuse to start with live keys unless NODE_ENV=production ───
const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
const rawKeySec = process.env.RAZORPAY_KEY_SECRET || '';
const rawWebhookSec = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const isLiveKey = rawKeyId.startsWith('rzp_live_') || rawKeySec.startsWith('rzp_live_') || rawWebhookSec.startsWith('rzp_live_');

if (isLiveKey && config.nodeEnv !== 'production') {
  throw new Error('[FATAL SECURITY ERROR] Live Razorpay key detected in non-production environment. Refusing to start with live keys unless NODE_ENV=production.');
}
