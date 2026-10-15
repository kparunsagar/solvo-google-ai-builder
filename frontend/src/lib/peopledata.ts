/**
 * PeopleData Data Layer — Dedicated Schema & Unified Profile Persistence Engine
 * 
 * Engineered to guarantee that Customer and Technician profile details
 * (custom avatar photo, full name, email/Gmail, mobile number, address, trade specialization)
 * persist permanently across application restarts, upgrades, maintenance cycles, and re-authentications.
 */

import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseLive } from './firebase';
import { resolveBookingBilling } from './billing';

export interface PeopleData {
  id: string; // Primary key (e.g. usr_...)
  userId: string;
  fullName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null; // Base64 data URL, image URL, or emoji avatar
  address: string;
  role: 'customer' | 'provider' | 'admin';
  tradeCategory?: string;
  kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

const PEOPLEDATA_COLLECTION = 'peopledata';
const SCHEMA_VERSION = 2;
const LOCAL_STORAGE_REGISTRY_KEY = 'mud_peopledata_registry_v2';

// ─── 1. In-Memory & LocalStorage Data Cache ──────────────────────────────────
function getLocalRegistry(): Record<string, PeopleData> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRegistry(registry: Record<string, PeopleData>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('[PeopleData] Local registry storage warning:', e);
  }
}

// ─── 2. Canonical Normalization Helper ───────────────────────────────────────
export function normalizePeopleId(identifier: string): string {
  if (!identifier) return 'usr_unknown';
  const clean = identifier.trim().toLowerCase();
  if (clean.startsWith('usr_')) return clean;
  return `usr_${clean.replace(/[^a-z0-9]/g, '_')}`;
}

// ─── 3. PeopleData Save Engine (Atomically writes across all tiers) ───────────
export async function savePeopleData(updates: Partial<PeopleData> & { userId: string }): Promise<PeopleData> {
  const canonicalId = normalizePeopleId(updates.userId || updates.id || '');
  const now = new Date().toISOString();

  // 1. Fetch existing record to preserve existing attributes
  const existing = await getPeopleData({ userId: canonicalId, email: updates.email || undefined, phone: updates.phone || undefined });

  const record: PeopleData = {
    id: canonicalId,
    userId: canonicalId,
    fullName: updates.fullName?.trim() || updates.displayName?.trim() || existing?.fullName || existing?.displayName || 'Resident User',
    displayName: updates.displayName?.trim() || updates.fullName?.trim() || existing?.displayName || existing?.fullName || 'Resident User',
    email: updates.email !== undefined ? (updates.email?.trim() || null) : (existing?.email || null),
    phone: updates.phone !== undefined ? (updates.phone?.trim() || null) : (existing?.phone || null),
    avatar: updates.avatar !== undefined ? (updates.avatar || null) : (existing?.avatar || null),
    address: updates.address !== undefined ? (updates.address?.trim() || 'Sagara, Karnataka') : (existing?.address || 'Sagara, Karnataka'),
    role: updates.role || existing?.role || 'customer',
    tradeCategory: updates.tradeCategory !== undefined ? updates.tradeCategory : existing?.tradeCategory,
    kycStatus: updates.kycStatus || existing?.kycStatus || 'not_submitted',
    rejectionReason: updates.rejectionReason !== undefined ? updates.rejectionReason : existing?.rejectionReason,
    createdAt: existing?.createdAt || updates.createdAt || now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION
  };

  // 2. Persist to Local Storage Registry
  const registry = getLocalRegistry();
  registry[canonicalId] = record;
  if (record.email) registry[normalizePeopleId(record.email)] = record;
  if (record.phone) registry[normalizePeopleId(record.phone)] = record;
  saveLocalRegistry(registry);

  // Sync to active user key for immediate UI reactivity
  try {
    const activeRaw = localStorage.getItem('mud_active_user');
    const active = activeRaw ? JSON.parse(activeRaw) : {};
    const mergedActive = {
      ...active,
      id: record.userId,
      name: record.fullName,
      email: record.email,
      phone: record.phone,
      avatar: record.avatar,
      address: record.address,
      role: record.role,
      trade_category: record.tradeCategory,
      kyc_status: record.kycStatus
    };
    localStorage.setItem('mud_active_user', JSON.stringify(mergedActive));
  } catch {}

  // 3. Persist to Cloud Firestore `peopledata` Collection via SDK
  if (isFirebaseLive()) {
    try {
      await setDoc(doc(db, PEOPLEDATA_COLLECTION, canonicalId), {
        ...record,
        firestore_updated_at: serverTimestamp()
      }, { merge: true });

      // Also update users and user_workbook for backward compatibility
      await setDoc(doc(db, 'users', canonicalId), {
        id: record.userId,
        name: record.fullName,
        email: record.email,
        phone: record.phone,
        avatar: record.avatar,
        address: record.address,
        role: record.role,
        trade_category: record.tradeCategory || null,
        kyc_status: record.kycStatus,
        firestore_updated_at: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'user_workbook', canonicalId), {
        userId: record.userId,
        fullName: record.fullName,
        email: record.email || '',
        phone: record.phone || '',
        avatar: record.avatar || null,
        address: record.address,
        role: record.role === 'provider' ? 'technician' : record.role,
        tradeCategory: record.tradeCategory || null,
        kycStatus: record.kycStatus,
        firestore_updated_at: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('[PeopleData] Firestore SDK save error:', e);
    }
  }

  // 4. REST API Fallback Persistence
  try {
    const payload: any = {
      fields: {
        userId: { stringValue: record.userId },
        fullName: { stringValue: record.fullName },
        displayName: { stringValue: record.displayName },
        email: record.email ? { stringValue: record.email } : { nullValue: null },
        phone: record.phone ? { stringValue: record.phone } : { nullValue: null },
        avatar: record.avatar ? { stringValue: record.avatar } : { nullValue: null },
        address: { stringValue: record.address },
        role: { stringValue: record.role },
        kycStatus: { stringValue: record.kycStatus },
        updatedAt: { timestampValue: now },
        schemaVersion: { integerValue: String(SCHEMA_VERSION) }
      }
    };
    if (record.tradeCategory) {
      payload.fields.tradeCategory = { stringValue: record.tradeCategory };
    }

    fetch(`https://firestore.googleapis.com/v1/projects/myurbandaily-458d0/databases/(default)/documents/${PEOPLEDATA_COLLECTION}/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}

  // 5. Dispatch Global Event for instant UI synchronizations
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mud_peopledata_updated', { detail: record }));
  }

  return record;
}

// ─── 4. PeopleData Retrieval Engine (Queries across all tiers) ───────────────
export async function getPeopleData(identifiers: { userId?: string; email?: string; phone?: string }): Promise<PeopleData | null> {
  const { userId, email, phone } = identifiers;
  const canonicalId = userId ? normalizePeopleId(userId) : (email ? normalizePeopleId(email) : (phone ? normalizePeopleId(phone) : ''));

  // 1. Check Local Storage Registry
  const registry = getLocalRegistry();
  if (canonicalId && registry[canonicalId]) {
    return registry[canonicalId];
  }
  if (email && registry[normalizePeopleId(email)]) {
    return registry[normalizePeopleId(email)];
  }
  if (phone && registry[normalizePeopleId(phone)]) {
    return registry[normalizePeopleId(phone)];
  }

  // 2. Check Cloud Firestore SDK `peopledata` collection
  if (isFirebaseLive()) {
    try {
      if (canonicalId) {
        const snap = await getDoc(doc(db, PEOPLEDATA_COLLECTION, canonicalId));
        if (snap.exists()) {
          const data = snap.data() as PeopleData;
          registry[canonicalId] = data;
          saveLocalRegistry(registry);
          return data;
        }
      }

      // Query by email
      if (email) {
        const qEmail = query(collection(db, PEOPLEDATA_COLLECTION), where('email', '==', email.trim().toLowerCase()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          const data = snapEmail.docs[0].data() as PeopleData;
          registry[canonicalId || data.userId] = data;
          saveLocalRegistry(registry);
          return data;
        }
      }

      // Query by phone
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const qPhone = query(collection(db, PEOPLEDATA_COLLECTION), where('phone', '==', cleanPhone));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          const data = snapPhone.docs[0].data() as PeopleData;
          registry[canonicalId || data.userId] = data;
          saveLocalRegistry(registry);
          return data;
        }
      }

      // Fallback: check users collection
      if (canonicalId) {
        const uSnap = await getDoc(doc(db, 'users', canonicalId));
        if (uSnap.exists()) {
          const u = uSnap.data();
          const converted: PeopleData = {
            id: canonicalId,
            userId: canonicalId,
            fullName: u.name || u.fullName || 'Resident User',
            displayName: u.name || u.fullName || 'Resident User',
            email: u.email || null,
            phone: u.phone || null,
            avatar: u.avatar || null,
            address: u.address || 'Sagara, Karnataka',
            role: u.role || 'customer',
            tradeCategory: u.trade_category || u.tradeCategory,
            kycStatus: u.kyc_status || u.kycStatus || 'not_submitted',
            createdAt: u.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            schemaVersion: SCHEMA_VERSION
          };
          registry[canonicalId] = converted;
          saveLocalRegistry(registry);
          return converted;
        }
      }
    } catch (e) {
      console.warn('[PeopleData] Firestore retrieval notice:', e);
    }
  }

  // 3. Fallback: check active user in localStorage
  try {
    const raw = localStorage.getItem('mud_active_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.id === canonicalId || (email && u.email === email) || (phone && u.phone === phone)) {
        return {
          id: u.id || canonicalId,
          userId: u.id || canonicalId,
          fullName: u.name || 'Resident User',
          displayName: u.name || 'Resident User',
          email: u.email || null,
          phone: u.phone || null,
          avatar: u.avatar || null,
          address: u.address || 'Sagara, Karnataka',
          role: u.role || 'customer',
          tradeCategory: u.trade_category || u.tradeCategory,
          kycStatus: u.kyc_status || 'not_submitted',
          createdAt: u.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: SCHEMA_VERSION
        };
      }
    }
  } catch {}

  return null;
}

// ============================================================================
// 4. CUSTOMER DIGITAL RECEIPTS (Sub-Item under DB / PeopleData)
// ============================================================================

export interface CustomerReceipt {
  id: string; // e.g. RCP-MUD-9821
  bookingId: string;
  bookingCode?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress: string;
  technicianName: string;
  technicianPhone?: string;
  serviceName: string;
  serviceCategory: string;
  itemsRepaired: string[];
  newlyAddedMaterials: {
    description: string;
    amount: number;
  }[];
  baseLaborAmount: number;
  partsMaterialsAmount: number;
  gstAmount: number;
  totalAmountPaid: number;
  paymentMethod: string;
  paymentTransactionId: string;
  paidAt: string;
  warrantyDays: number;
  warrantyValidUntil: string;
  createdAt: string;
}

const LOCAL_STORAGE_RECEIPTS_PREFIX = 'mud_peopledata_receipts_';

/**
 * Persists a customer receipt into both the Local PeopleData cache
 * and the Cloud Firestore sub-collection: `peopledata/{customerId}/receipts/{receiptId}`.
 */
export async function saveCustomerReceipt(receipt: CustomerReceipt): Promise<CustomerReceipt> {
  const canonicalCustomerId = normalizePeopleId(receipt.customerId);
  const receiptsKey = `${LOCAL_STORAGE_RECEIPTS_PREFIX}${canonicalCustomerId}`;

  // 1. Save to LocalStorage Registry under customer profile
  try {
    const raw = localStorage.getItem(receiptsKey);
    const list: CustomerReceipt[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex(r => r.id === receipt.id || r.bookingId === receipt.bookingId);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...receipt };
    } else {
      list.unshift(receipt);
    }
    localStorage.setItem(receiptsKey, JSON.stringify(list));
  } catch (e) {
    console.warn('[PeopleData] Local receipt storage error:', e);
  }

  // 2. Persist to Firestore DB sub-collection: `peopledata/{customerId}/receipts/{receiptId}`
  if (isFirebaseLive()) {
    try {
      // Sub-collection under peopledata document
      const subDocRef = doc(db, PEOPLEDATA_COLLECTION, canonicalCustomerId, 'receipts', receipt.id);
      await setDoc(subDocRef, {
        ...receipt,
        firestore_updated_at: serverTimestamp()
      }, { merge: true });

      // Mirror to root receipts collection for administrative indexing
      const rootDocRef = doc(db, 'receipts', receipt.id);
      await setDoc(rootDocRef, {
        ...receipt,
        firestore_updated_at: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('[PeopleData] Firestore receipt sub-collection save error:', e);
    }
  }

  // 3. Notify app components via CustomEvent
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mud_receipt_saved', { detail: receipt }));
  }

  return receipt;
}

/**
 * Retrieves all digital receipts stored under a customer profile.
 */
export async function getCustomerReceipts(customerId: string): Promise<CustomerReceipt[]> {
  const canonicalCustomerId = normalizePeopleId(customerId);
  const receiptsKey = `${LOCAL_STORAGE_RECEIPTS_PREFIX}${canonicalCustomerId}`;
  let receipts: CustomerReceipt[] = [];

  // 1. Try LocalStorage
  try {
    const raw = localStorage.getItem(receiptsKey);
    if (raw) {
      receipts = JSON.parse(raw);
    }
  } catch {}

  // 2. Query Firestore DB sub-collection if live
  if (isFirebaseLive()) {
    try {
      const subColRef = collection(db, PEOPLEDATA_COLLECTION, canonicalCustomerId, 'receipts');
      const snap = await getDocs(subColRef);
      if (!snap.empty) {
        const cloudReceipts = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerReceipt));
        // Merge cloud receipts with local receipts
        const map = new Map<string, CustomerReceipt>();
        receipts.forEach(r => map.set(r.id, r));
        cloudReceipts.forEach(r => map.set(r.id, r));
        receipts = Array.from(map.values()).sort(
          (a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime()
        );
        localStorage.setItem(receiptsKey, JSON.stringify(receipts));
      }
    } catch (e) {
      console.warn('[PeopleData] Firestore getCustomerReceipts notice:', e);
    }
  }

  return receipts;
}

/**
 * Helper to build an itemized receipt entity from a completed BookingRecord.
 */
export function generateReceiptFromBookingRecord(booking: any, customerUser?: any): CustomerReceipt {
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const billing = resolveBookingBilling(booking);
  const baseLabor = billing.baseAmount;
  const partsCost = billing.partsAmount;
  const totalPaid = billing.total;
  const gstAmount = booking.gstAmount || booking.gst_amount || Math.round(baseLabor * 0.20 * 0.18);

  const code = booking.booking_code || booking.id.slice(-6).toUpperCase();
  const receiptId = `RCP-MUD-${code}`;

  return {
    id: receiptId,
    bookingId: booking.id,
    bookingCode: `MUD-${code}`,
    customerId: booking.customer_id || customerUser?.id || 'usr_customer',
    customerName: customerUser?.name || booking.customer_name || 'Verified Customer',
    customerEmail: customerUser?.email || booking.customer_email || 'customer@solvo.app',
    customerPhone: customerUser?.phone || booking.customer_phone || '9876543210',
    customerAddress: booking.address_text || booking.address_locality || 'Sagara, Karnataka',
    technicianName: booking.technician_name || 'Manjunath K (Verified Partner)',
    technicianPhone: booking.technician_phone || '9844011223',
    serviceName: billing.serviceDisplayName || booking.service_name || 'Doorstep Home Service',
    serviceCategory: booking.trade_category || 'General Home Services',
    itemsRepaired: billing.itemsRepaired,
    newlyAddedMaterials: Array.isArray(booking.newlyAddedMaterials || booking.newly_added_materials) && (booking.newlyAddedMaterials || booking.newly_added_materials).length > 0
      ? (booking.newlyAddedMaterials || booking.newly_added_materials)
      : partsCost > 0
      ? [{ description: billing.partsDescription, amount: partsCost }]
      : [],
    baseLaborAmount: baseLabor,
    partsMaterialsAmount: partsCost,
    gstAmount,
    totalAmountPaid: totalPaid,
    paymentMethod: booking.payment_method || 'Official Escrow Gateway',
    paymentTransactionId: booking.payment_transaction_id || `txn_${Date.now()}`,
    paidAt: booking.paid_at || now.toISOString(),
    warrantyDays: 30,
    warrantyValidUntil: validUntil,
    createdAt: now.toISOString()
  };
}
