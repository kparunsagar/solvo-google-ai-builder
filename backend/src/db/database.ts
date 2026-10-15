import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: 'customer' | 'provider' | 'technician' | 'admin' | 'ops' | 'support';
  password_hash: string;
  avatar_url?: string;
  preferred_language: 'en' | 'kn';
  created_at: string;
}

export interface ProviderRecord {
  id: string;
  user_id: string;
  bio: string;
  trade_categories: string[]; // e.g. ["plumbing", "electrical"]
  kyc_status: 'pending' | 'verified' | 'rejected' | 'flagged';
  kyc_documents: {
    aadhaar_url?: string;
    trade_license_url?: string;
    photo_url?: string;
  };
  aadhaar_number?: string;
  trade_license_number?: string;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  is_online: boolean;
  current_lat: number;
  current_lng: number;
  last_lat?: number;
  last_lng?: number;
  last_location_updated_at?: string;
  service_radius_km: number;
  bank_account_info?: {
    account_number: string;
    ifsc: string;
    bank_name: string;
  };
  total_earnings: number;
  pending_payout: number;
  created_at: string;
}

export interface CustomerAddressRecord {
  id: string;
  user_id: string;
  label: string;
  locality: string;
  landmark: string;
  full_address: string;
  lat: number;
  lng: number;
  is_default: boolean;
  created_at: string;
}

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  name_kn: string;
  icon: string;
  description: string;
  base_inspection_fee: number;
  is_active: boolean;
  display_order: number;
}

export interface ServiceRecord {
  id: string;
  category_id: string;
  name: string;
  name_kn: string;
  description: string;
  base_price: number;
  unit: string;
  estimated_duration_mins: number;
  included_tasks: string[];
  excluded_tasks: string[];
  warranty_days: number;
  is_popular: boolean;
  is_active: boolean;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'PROVIDER_MATCHED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'SERVICE_IN_PROGRESS'
  | 'COMPLETED'
  | 'PAYMENT_CONFIRMED'
  | 'REVIEWED'
  | 'CANCELLED';

export interface BookingRecord {
  id: string;
  booking_code: string;
  customer_id: string;
  provider_id?: string;
  service_id: string;
  status: BookingStatus;
  scheduled_type: 'instant' | 'scheduled';
  scheduled_time?: string;
  address_locality: string;
  address_text: string;
  address_lat: number;
  address_lng: number;
  customer_notes?: string;
  otp: string;
  doorstep_otp?: string;
  otp_hash?: string;
  otp_attempts?: number;
  otp_expires_at?: string;
  otp_verified?: boolean;
  arrival_selfie_url?: string;
  worklocation_photo_url?: string;
  arrival_verified_at?: string;
  arrival_lat?: number;
  arrival_lng?: number;
  face_match_status?: 'VERIFIED' | 'QUEUED_FOR_MANUAL_REVIEW' | 'MISMATCH_FLAGGED';
  face_match_score?: number;
  receipt_id?: string;
  warranty_valid_until?: string;
  cancellation_reason?: string;
  settlement_status?: 'captured' | 'pending_customer_confirmation' | 'unverified';
  base_amount: number;
  parts_materials_amount: number;
  platform_commission_amount: number;
  gst_amount: number;
  total_amount: number;
  provider_payout_amount: number;
  base_amount_paise?: number;
  parts_materials_amount_paise?: number;
  platform_commission_paise?: number;
  gst_amount_paise?: number;
  discount_paise?: number;
  total_amount_paise?: number;
  provider_payout_paise?: number;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingEventRecord {
  id: string;
  booking_id: string;
  from_status?: BookingStatus;
  to_status: BookingStatus;
  triggered_by?: string;
  actor_id?: string;
  note?: string;
  metadata?: any;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id?: string;
  amount: number;
  amount_paise?: number;
  idempotency_key?: string;
  currency: string;
  payment_method: 'upi' | 'card' | 'netbanking' | 'cash_on_delivery';
  gateway: 'razorpay' | 'cashfree' | 'cash' | 'upi_qr';
  gateway_order_id: string;
  gateway_payment_id?: string;
  gateway_signature?: string;
  signature_verified: boolean;
  status: 'pending' | 'captured' | 'failed' | 'refunded';
  webhook_payload?: any;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address?: string;
  timestamp: string;
}

export interface CustomerReceiptRecord {
  id: string; // e.g. RCP-MUD-9821
  booking_id: string;
  booking_code?: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address: string;
  technician_name: string;
  technician_phone?: string;
  service_name: string;
  service_category: string;
  items_repaired: string[];
  newly_added_materials: {
    description: string;
    amount: number;
  }[];
  base_labor_amount: number;
  parts_materials_amount: number;
  gst_amount: number;
  total_amount_paid: number;
  base_labor_amount_paise?: number;
  parts_materials_amount_paise?: number;
  gst_amount_paise?: number;
  discount_paise?: number;
  total_amount_paid_paise?: number;
  payment_method: string;
  payment_transaction_id: string;
  paid_at: string;
  warranty_days: number;
  warranty_valid_until: string;
  created_at: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  value: number; // in ₹ or %
  min_order_paise: number;
  max_discount_paise?: number;
  expires_at: string;
  usage_limit: number;
  per_user_limit: number;
  times_used: number;
  is_active: boolean;
  description: string;
}

export interface CouponRedemptionRecord {
  id: string;
  coupon_code: string;
  user_id: string;
  booking_id: string;
  discount_paise: number;
  redeemed_at: string;
}

export interface SettlementLedgerRecord {
  id: string;
  booking_id: string;
  technician_id: string;
  type: 'DEBIT_COMMISSION_AND_GST' | 'CREDIT_PAYOUT' | 'CASH_COLLECTION';
  amount_paise: number;
  currency: string;
  payment_method: 'cash' | 'upi_qr';
  reference_id: string;
  balance_before_paise: number;
  balance_after_paise: number;
  status: 'settled' | 'pending_confirmation' | 'unverified';
  created_at: string;
}

export interface ManualReviewRecord {
  id: string;
  review_type: 'FACE_BIOMETRIC_UNCERTAIN' | 'SUSPICIOUS_GPS' | 'DISPUTED_SETTLEMENT';
  booking_id: string;
  technician_id: string;
  selfie_url?: string;
  kyc_photo_url?: string;
  match_score?: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  flagged_reason: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface IpRateLimitRecord {
  id: string;
  ip: string;
  attempts: number;
  expires_at: number;
  updated_at: string;
}

export interface ProcessedEventRecord {
  id: string;
  event_id: string;
  processed_at: string;
  metadata?: any;
}

export interface DatabaseState {
  users: UserRecord[];
  providers: ProviderRecord[];
  customer_addresses: CustomerAddressRecord[];
  service_categories: CategoryRecord[];
  services: ServiceRecord[];
  bookings: BookingRecord[];
  booking_events: BookingEventRecord[];
  payments: PaymentRecord[];
  reviews: ReviewRecord[];
  audit_logs: AuditLogRecord[];
  receipts: CustomerReceiptRecord[];
  coupons: CouponRecord[];
  coupon_redemptions: CouponRedemptionRecord[];
  settlement_ledger: SettlementLedgerRecord[];
  manual_reviews: ManualReviewRecord[];
  ip_rate_limits: IpRateLimitRecord[];
  processed_events: ProcessedEventRecord[];
}

import { firestore } from './firestore.js';

class Database {
  private state: DatabaseState;
  private isHydrated = false;

  constructor() {
    this.state = {
      users: [],
      providers: [],
      customer_addresses: [],
      service_categories: [],
      services: [],
      bookings: [],
      booking_events: [],
      payments: [],
      reviews: [],
      audit_logs: [],
      receipts: [],
      coupons: [],
      coupon_redemptions: [],
      settlement_ledger: [],
      manual_reviews: [],
      ip_rate_limits: [],
      processed_events: []
    };
  }

  public async init(): Promise<void> {
    if (this.isHydrated) return;
    await this.syncFromFirestore();
    this.isHydrated = true;
  }

  public async syncFromFirestore(): Promise<void> {
    try {
      console.log('[DB] Hydrating state from Cloud Firestore single source of truth...');
      const [users, providers, categories, services, bookings, receipts, coupons] = await Promise.all([
        firestore.getCollection('users'),
        firestore.getCollection('providers'),
        firestore.getCollection('service_categories'),
        firestore.getCollection('services'),
        firestore.getCollection('bookings'),
        firestore.getCollection('receipts'),
        firestore.getCollection('coupons')
      ]);

      if (users.length > 0) this.state.users = users;
      if (providers.length > 0) this.state.providers = providers;
      if (categories.length > 0) this.state.service_categories = categories;
      if (services.length > 0) this.state.services = services;
      if (bookings.length > 0) this.state.bookings = bookings;
      if (receipts.length > 0) this.state.receipts = receipts;
      if (coupons.length > 0) this.state.coupons = coupons;

      console.log(`[DB] Hydrated from Firestore: ${this.state.bookings.length} bookings, ${this.state.services.length} services, ${this.state.providers.length} providers.`);
    } catch (err: any) {
      console.warn('[DB] Cloud Firestore hydration notice (using clean memory baseline):', err?.message || err);
    }
  }

  public persist(collection?: keyof DatabaseState, docId?: string): void {
    // Cloud Firestore is the single source of truth (Express is the sole authorized writer)
    try {
      if (collection && docId) {
        const list = (this.state[collection] as any[]) || [];
        const item = list.find((x: any) => x.id === docId);
        if (item) {
          firestore.setDoc(collection, docId, item).catch(err => {
            console.warn(`[DB] Async Firestore persist error on ${collection}/${docId}:`, err?.message || err);
          });
        }
        return;
      }

      // Persist active collections to Cloud Firestore
      for (const b of this.state.bookings) {
        firestore.setDoc('bookings', b.id, b).catch(() => {});
      }
      for (const u of this.state.users) {
        firestore.setDoc('users', u.id, u).catch(() => {});
      }
      for (const p of this.state.providers) {
        firestore.setDoc('providers', p.id, p).catch(() => {});
      }
      for (const r of this.state.receipts) {
        firestore.setDoc('receipts', r.id, r).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[DB] Firestore persist notice:', err?.message || err);
    }
  }

  // Generic query helpers
  public get users() { return this.state.users; }
  public get providers() { return this.state.providers; }
  public get customer_addresses() { return this.state.customer_addresses; }
  public get service_categories() { return this.state.service_categories; }
  public get services() { return this.state.services; }
  public get bookings() { return this.state.bookings; }
  public get booking_events() { return this.state.booking_events; }
  public get payments() { return this.state.payments; }
  public get reviews() { return this.state.reviews; }
  public get audit_logs() { return this.state.audit_logs; }
  public get receipts() {
    if (!this.state.receipts) this.state.receipts = [];
    return this.state.receipts;
  }
  public get coupons() {
    if (!this.state.coupons) this.state.coupons = [];
    return this.state.coupons;
  }
  public get coupon_redemptions() {
    if (!this.state.coupon_redemptions) this.state.coupon_redemptions = [];
    return this.state.coupon_redemptions;
  }
  public get settlement_ledger() {
    if (!this.state.settlement_ledger) this.state.settlement_ledger = [];
    return this.state.settlement_ledger;
  }
  public get manual_reviews() {
    if (!this.state.manual_reviews) this.state.manual_reviews = [];
    return this.state.manual_reviews;
  }
  public get ip_rate_limits() {
    if (!this.state.ip_rate_limits) this.state.ip_rate_limits = [];
    return this.state.ip_rate_limits;
  }
  public get processed_events() {
    if (!this.state.processed_events) this.state.processed_events = [];
    return this.state.processed_events;
  }

  public reset(newState: DatabaseState) {
    if (!newState.receipts) newState.receipts = [];
    if (!newState.coupons) newState.coupons = [];
    if (!newState.coupon_redemptions) newState.coupon_redemptions = [];
    if (!newState.settlement_ledger) newState.settlement_ledger = [];
    if (!newState.manual_reviews) newState.manual_reviews = [];
    if (!newState.ip_rate_limits) newState.ip_rate_limits = [];
    if (!newState.processed_events) newState.processed_events = [];
    this.state = newState;
    this.persist();
  }
}

export const db = new Database();
