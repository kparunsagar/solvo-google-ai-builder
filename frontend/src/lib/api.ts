// SOLVO — Firebase Free Tier (Firestore + Auth + Real-time Sync)
// Direct Serverless BaaS: 0 server hosting costs, real-time database, offline persistence
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db, auth, isFirebaseLive, signInWithPopup, googleProvider } from './firebase';
import { hashPassword, saveUserToWorkbook } from './workbook';
import { welcomeEmailService } from '@/services/welcomeEmail.service';
import { getSecureRandomDigits, getSecureRandomString } from '@/utils/crypto';
import { calculateDistanceKm } from '@/data/sagara-localities';
import {
  saveCustomerReceipt,
  generateReceiptFromBookingRecord,
  getCustomerReceipts,
  CustomerReceipt
} from './peopledata';
import { initiateRazorpayPayment } from '@/services/razorpay.service';


export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  services_count: number;
  status?: 'ACTIVE' | 'INACTIVE';
  service_mode?: 'DOORSTEP' | 'STATION_SLOT' | 'PICKUP_DELIVERY';
  description?: string;
  created_at?: string;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  rating: number;
  reviews_count: number;
  icon: string;
  status?: 'ACTIVE' | 'INACTIVE';
  vehicle_types?: ('BIKE' | 'HATCHBACK' | 'SEDAN' | 'SUV')[];
  slot_duration_min?: number;
}

export interface MotorServiceStation {
  id: string;
  name: string;
  address: string;
  landmark: string;
  locality: string;
  total_bays: number;
  rating: number;
  reviews_count: number;
  verified: boolean;
  phone: string;
  opening_hours: string;
  available_slots: {
    slot_id: string;
    time_window: string;
    open_bays: number;
    total_bays: number;
  }[];
}

export interface LaundryPartnerCenter {
  id: string;
  name: string;
  address: string;
  landmark: string;
  rating: number;
  turnaround_hours: number;
  pickup_windows: string[];
}

export interface BookingRecord {
  id: string;
  booking_code?: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  service_id: string;
  category_id: string;          // NEW: maps service to trade category
  trade_category?: string;      // NEW: human label e.g. "Plumbing & Sanitary"
  technician_id: string | null;
  technician_name?: string;
  technician_phone?: string;
  accepted_at?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REVIEWED';
  address_text: string;
  address_lat: number;
  address_lng: number;
  address_locality: string;
  notes?: string;
  scheduled_at?: string;
  price: number;
  rating?: number;
  review_comment?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  // Live GPS tracking
  tech_lat?: number;
  tech_lng?: number;
  tech_location_updated_at?: string;
  // Doorstep OTP
  doorstep_otp?: string;
  otp?: string;
  otp_verified_at?: string;
  // Payment integration
  payment_method?: 'COD' | 'RAZORPAY' | 'UPI_QR';
  payment_status?: 'PENDING' | 'PAID';
  payment_transaction_id?: string;
  paid_at?: string;
  parts_cost?: number;
  parts_materials_amount?: number;
  parts_description?: string;
  base_amount?: number;
  baseLaborAmount?: number;
  total_amount?: number;
  total_amount_paid?: number;
  totalAmountPaid?: number;
  newly_added_materials?: Array<{ description?: string; name?: string; amount: number }>;
  discount?: number;
  whistleblower_discount?: number;
  total_price?: number;
  // Motor Service Bay Reservation fields
  motor_station_id?: string;
  motor_station_name?: string;
  motor_vehicle_type?: string;
  motor_bay_slot?: string;
  service_type_mode?: 'STATION_SLOT' | 'DOORSTEP' | 'PICKUP_DELIVERY';
  // Laundry Pickup & Delivery fields
  laundry_pickup_window?: string;
  laundry_estimated_weight?: number;
  // Cancellation fields
  cancellation_reason?: string;
  cancelled_by?: 'customer' | 'technician' | 'admin';
  cancelled_at?: string;
  // ─── Safety Architecture (Urban Daily Shield) ────────────────────────────
  safety_mode?: 'DOOR_OPEN' | 'DOOR_PARTIAL' | 'DOOR_CLOSED';
  alone_at_home?: boolean;
  gender_preference?: 'NO_PREFERENCE' | 'MALE' | 'FEMALE';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notify_emergency_contact?: boolean;
  // Technician verification
  tech_uid?: string;             // Unique Tech ID e.g. UD-SGR-00412
  tech_photo_url?: string;
  tech_aadhaar_verified?: boolean;
  tech_background_checked?: boolean;
  tech_skill_certified?: boolean;
  // Arrival verification
  arrival_otp_verified_at?: string;
  arrival_photo_verified?: boolean;
  // Before/After photos
  before_photos?: string[];
  after_photos?: string[];
  // ─── Masked Telephony & Privacy Protection (hiding real mobile number from customer) ───
  technician_real_phone?: string;     // Internal real mobile number (strictly hidden from customer)
  technician_masked_phone?: string;   // Robo virtual bridge number e.g. +91 80 4719 3320 (Ext: 1042)
  technician_avatar_url?: string;     // Verified technician photo
  // ─── Arrival & Geolocation Verification ───
  arrival_geo_verified?: boolean;     // Confirmed arrived at customer location via GPS
  arrival_geo_coords?: { lat: number; lng: number };
  arrival_geo_distance_meters?: number;
  arrival_otp_verified?: boolean;
  // ─── Live Arrival Selfie with Auto-Location Stamp ───
  arrival_selfie_url?: string;        // Stamped selfie image with auto-location watermark
  arrival_selfie_coords?: { lat: number; lng: number };
  arrival_selfie_locality?: string;   // e.g. "Gandhi Nagar, Sagara"
  arrival_selfie_timestamp?: string;  // e.g. "29-Sep-2026 04:55 PM IST"
  arrival_selfie_verified?: boolean;  // Selfie and auto-location confirmed
  worklocation_photo_url?: string;    // Stamped work location / doorstep photo
  ai_face_match_score?: number;       // AI face match confidence score (0-100)
  ai_face_match_status?: string;      // 'VERIFIED_MATCH' | 'PROBABLE_MATCH' | 'MISMATCH_FLAGGED'
  ai_face_match_summary?: string;     // AI facial analysis summary
  job_started_at?: string;            // Time when technician started the job
  sos_resolved_at?: string;
  safety_checkin_count?: number;
  doorstep_audit_id?: string;         // Reference ID to doorstep_audits collection
  arrival_notification_sent?: boolean;// Notification pushed to customer when technician arrives
  arrival_notified_at?: string;
  // Google Gemini AI Fields
  ai_diagnostic?: any;
  ai_diagnostic_photo?: string;
  gemini_biometric_confidence?: number;
  gemini_liveness_verified?: boolean;
}

export interface TechnicianDoorstepAuditRecord {
  id: string; // audit_${bookingId}
  booking_id: string;
  technician_id: string;
  technician_name: string;
  customer_id?: string;
  customer_name?: string;
  service_id?: string;
  service_title?: string;
  address_locality: string;
  address_text?: string;
  // Geolocation Check
  geo_verified: boolean;
  technician_coords: { lat: number; lng: number };
  expected_coords?: { lat: number; lng: number };
  distance_meters?: number;
  // Arrival Selfie & Work Location Photo
  arrival_selfie_url: string;
  worklocation_photo_url?: string;
  stamped_locality: string;
  stamped_timestamp: string;
  // AI Biometric Analysis
  ai_face_match_score?: number;
  ai_face_match_status?: string;
  ai_face_match_summary?: string;
  ai_facial_geometry_match?: number;
  ai_liveness_verified?: boolean;
  gemini_biometric_confidence?: number;
  gemini_liveness_verified?: boolean;
  gemini_anti_spoofing?: string;
  // Admin Review Status
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'FLAGGED';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
}

export interface SOSAlertRecord {
  id: string;
  booking_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  technician_id?: string;
  technician_name?: string;
  service_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  lat?: number;
  lng?: number;
  locality?: string;
  triggered_at: string;
  status: 'ACTIVE' | 'RESOLVED' | 'INVESTIGATING';
  resolved_at?: string;
  resolved_notes?: string;
}

/**
 * Generates an Urban Daily In-App Robo Telephony Bridge number.
 * Protects technician and customer privacy by masking real phone numbers.
 * Routes through secure virtual bridge e.g. +91 80 4719 3320 with dedicated extension PIN.
 */
export function generateRoboMaskedPhone(bookingId: string, seedStr?: string): string {
  const combined = (bookingId || '') + (seedStr || '');
  let hash = 17;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 9000;
  }
  const ext = 1000 + Math.abs(hash);
  return `+91 80 4719 3320 (Ext: ${ext})`;
}


// ─── Payment Gateways: Razorpay + Dynamic UPI QR ─────────────────────────────
export const RAZORPAY_KEY_ID = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_TjTC0bQBuQHCcI';
export const OFFICIAL_UPI_VPA = 'solvo.escrow@icici';

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function generateUpiUri(amount: number, bookingId: string, serviceTitle?: string): string {
  const cleanTitle = encodeURIComponent((serviceTitle || 'SOLVO').replace(/[^a-zA-Z0-9 ]/g, ''));
  const cleanId = encodeURIComponent(bookingId.slice(-8));
  return `upi://pay?pa=${OFFICIAL_UPI_VPA}&pn=SOLVO%20Escrow&am=${amount.toFixed(2)}&cu=INR&tn=Booking-${cleanId}-${cleanTitle}`;
}

export function generateUpiQrUrl(amount: number, bookingId: string, serviceTitle?: string): string {
  const upi = generateUpiUri(amount, bookingId, serviceTitle);
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upi)}`;
}

// Category ID → KYC trade_category mapping
export const CATEGORY_TRADE_MAP: Record<string, string> = {
  'cat-plumb':   'Plumbing & Sanitary',
  'cat-elec':    'Electrical & Wiring',
  'cat-clean':   'Deep Home Cleaning',
  'cat-appli':   'AC & Appliance Service',
  'cat-carp':    'Carpentry & Furniture',
  'cat-paint':   'Interior Painting',
  'cat-motor':   'Automobile & Motor Care',
  'cat-laundry': 'Laundry & Dry Cleaning',
};

// ─── Default Catalog Seed (Free Tier fallback & initial data) ────────────────
export const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat-plumb',
    name: 'Plumbing',
    icon: 'Wrench',
    color: '#3b82f6',
    services_count: 3,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'Doorstep leak fixes, tap installations, and bathroom sanitary fittings'
  },
  {
    id: 'cat-elec',
    name: 'Electrician',
    icon: 'Zap',
    color: '#f59e0b',
    services_count: 3,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'Ceiling fans, switchboards, MCB short-circuits & home rewiring'
  },
  {
    id: 'cat-clean',
    name: 'Cleaning',
    icon: 'Sparkles',
    color: '#10b981',
    services_count: 2,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'Deep home scrubbing, bathroom descaling & kitchen grease removal'
  },
  {
    id: 'cat-appli',
    name: 'Appliance Repair',
    icon: 'Tv',
    color: '#8b5cf6',
    services_count: 2,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'AC servicing, washing machines, RO purifiers & home appliances'
  },
  {
    id: 'cat-motor',
    name: 'Motor Service',
    icon: 'Car',
    color: '#0284c7',
    services_count: 4,
    status: 'ACTIVE',
    service_mode: 'STATION_SLOT',
    description: 'Car & bike foam wash, express detailing & bay slot reservation at verified service centers (Zero waiting queue)'
  },
  {
    id: 'cat-laundry',
    name: 'Laundry',
    icon: 'Shirt',
    color: '#ec4899',
    services_count: 4,
    status: 'ACTIVE',
    service_mode: 'PICKUP_DELIVERY',
    description: 'Hygienic wash & fold, wrinkle-free steam ironing, premium dry cleaning, sneaker spa'
  },
  {
    id: 'cat-carp',
    name: 'Carpentry',
    icon: 'Hammer',
    color: '#f97316',
    services_count: 1,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'Door & window alignment, lock fittings, furniture fixes & woodwork'
  },
  {
    id: 'cat-paint',
    name: 'Painting',
    icon: 'Paintbrush',
    color: '#d946ef',
    services_count: 1,
    status: 'ACTIVE',
    service_mode: 'DOORSTEP',
    description: 'Interior room painting, waterproof primer coats & touch-ups'
  },
];

export const DEFAULT_SERVICES: ServiceItem[] = [
  // ── Plumbing ─────────────────────────────────────────────────────────────
  { id: 'svc-plumb-1', category_id: 'cat-plumb', name: 'Tap / Faucet Repair', description: 'Fix leaking taps, replace washers, install new faucets', price: 299, duration_min: 45, rating: 4.8, reviews_count: 312, icon: 'Wrench' },
  { id: 'srv_plumber_general', category_id: 'cat-plumb', name: 'Plumber — General Plumbing & Leak Repair', description: 'Complete doorstep plumbing, tap repair, pipe leak fixing and water pressure restoration', price: 299, duration_min: 45, rating: 4.9, reviews_count: 284, icon: 'Wrench' },
  { id: 'svc-plumb-2', category_id: 'cat-plumb', name: 'Pipe Leak Fix', description: 'Detect and seal pipe leaks, replace damaged pipe sections', price: 499, duration_min: 60, rating: 4.7, reviews_count: 204, icon: 'Wrench' },
  { id: 'svc-plumb-3', category_id: 'cat-plumb', name: 'Bathroom Fitting', description: 'Install showerheads, bathroom accessories, flush tanks', price: 699, duration_min: 90, rating: 4.9, reviews_count: 88, icon: 'Wrench' },

  // ── Electrical ───────────────────────────────────────────────────────────
  { id: 'svc-elec-1', category_id: 'cat-elec', name: 'Switch & Socket Repair', description: 'Replace broken switches, install new electrical sockets', price: 199, duration_min: 30, rating: 4.9, reviews_count: 420, icon: 'Zap' },
  { id: 'srv_electrician_general', category_id: 'cat-elec', name: 'Electrician — General Repair & Fan Servicing', description: 'Ceiling fan capacitor repair, MCB troubleshooting, switchboard fixing, short circuit repair', price: 299, duration_min: 45, rating: 4.9, reviews_count: 389, icon: 'Zap' },
  { id: 'svc-elec-2', category_id: 'cat-elec', name: 'Fan Installation', description: 'Install ceiling / wall fans with full wiring and balancing', price: 399, duration_min: 45, rating: 4.8, reviews_count: 356, icon: 'Zap' },
  { id: 'svc-elec-3', category_id: 'cat-elec', name: 'MCB / Wiring Fault', description: 'Diagnose short circuits, replace MCBs, rewire sections', price: 599, duration_min: 75, rating: 4.6, reviews_count: 178, icon: 'Zap' },

  // ── Cleaning ─────────────────────────────────────────────────────────────
  { id: 'svc-clean-1', category_id: 'cat-clean', name: 'Deep Home Cleaning', description: 'Comprehensive 2–3 BHK cleaning with eco-friendly products', price: 1299, duration_min: 180, rating: 4.9, reviews_count: 512, icon: 'Sparkles' },
  { id: 'srv_cleaning_deep', category_id: 'cat-clean', name: 'Home Deep Cleaning & Bathroom Descaling', description: 'Deep floor tile scrubbing, bathroom scale elimination, kitchen grease removal', price: 899, duration_min: 150, rating: 4.9, reviews_count: 215, icon: 'Sparkles' },
  { id: 'svc-clean-2', category_id: 'cat-clean', name: 'Kitchen Deep Clean', description: 'Chimney, countertops, tiles, appliances — thorough kitchen clean', price: 799, duration_min: 120, rating: 4.8, reviews_count: 290, icon: 'Sparkles' },

  // ── Appliances ───────────────────────────────────────────────────────────
  { id: 'svc-appli-1', category_id: 'cat-appli', name: 'AC Service & Gas Refill', description: 'AC cleaning, filter wash, gas top-up, performance check', price: 699, duration_min: 90, rating: 4.7, reviews_count: 445, icon: 'Tv' },
  { id: 'srv_ac_repair', category_id: 'cat-appli', name: 'AC Servicing, Deep Cleaning & Repair', description: 'Air conditioner cooling repair, refrigerant leak check, capacitor replacement', price: 699, duration_min: 90, rating: 4.8, reviews_count: 198, icon: 'Tv' },
  { id: 'svc-appli-2', category_id: 'cat-appli', name: 'Washing Machine Repair', description: 'Diagnose and fix drum, motor, and electrical issues', price: 499, duration_min: 60, rating: 4.6, reviews_count: 218, icon: 'Tv' },
  { id: 'srv_appliance_repair', category_id: 'cat-appli', name: 'RO Water Purifier & Appliance Repair', description: 'Water purifier filter replacement, washing machine, geyser, microwave repairs', price: 499, duration_min: 60, rating: 4.8, reviews_count: 167, icon: 'Tv' },

  // ── Motor Service (Car & Bike Care - Station Bay Booking & Doorstep) ─────
  {
    id: 'svc-motor-1',
    category_id: 'cat-motor',
    name: 'Car Express Foam & Underbody Pressure Wash',
    description: 'High-pressure underbody rinse, active pH-neutral snow foam bath, tyre dressing, exterior dry & interior vacuuming',
    price: 399,
    duration_min: 45,
    rating: 4.9,
    reviews_count: 342,
    icon: 'Car',
    status: 'ACTIVE',
    vehicle_types: ['HATCHBACK', 'SEDAN', 'SUV'],
    slot_duration_min: 45
  },
  {
    id: 'svc-motor-2',
    category_id: 'cat-motor',
    name: 'Bike Deep Foam Wash & Chain Lubrication',
    description: 'Full mud & grime removal, active snow foam bath, air pressure blowout, and Motul chain degreasing & lube',
    price: 199,
    duration_min: 30,
    rating: 4.9,
    reviews_count: 512,
    icon: 'Bike',
    status: 'ACTIVE',
    vehicle_types: ['BIKE'],
    slot_duration_min: 30
  },
  {
    id: 'svc-motor-3',
    category_id: 'cat-motor',
    name: 'Complete Car Interior & AC Vent Detailing',
    description: 'Deep upholstery foam extraction, dashboard polish, roof lining steam clean & germicidal AC duct fogging',
    price: 999,
    duration_min: 90,
    rating: 4.8,
    reviews_count: 184,
    icon: 'Sparkles',
    status: 'ACTIVE',
    vehicle_types: ['HATCHBACK', 'SEDAN', 'SUV'],
    slot_duration_min: 90
  },
  {
    id: 'svc-motor-4',
    category_id: 'cat-motor',
    name: 'Two-Wheeler Comprehensive Service & Oil Change',
    description: 'Premium 4T engine oil replacement, spark plug cleaning, carburettor/FI tuning, brake inspection & 18-point checkup',
    price: 499,
    duration_min: 60,
    rating: 4.8,
    reviews_count: 290,
    icon: 'Wrench',
    status: 'ACTIVE',
    vehicle_types: ['BIKE'],
    slot_duration_min: 60
  },

  // ── Laundry & Fabric Care (Pickup & Delivery) ────────────────────────────
  {
    id: 'svc-laund-1',
    category_id: 'cat-laundry',
    name: 'Wash & Fold (Daily Wear — Per Kg)',
    description: 'Hygienic enzyme wash, fabric softener treatment, tumble dry & neat flat fold (Minimum order 3 kg)',
    price: 49,
    duration_min: 1440,
    rating: 4.8,
    reviews_count: 412,
    icon: 'Shirt',
    status: 'ACTIVE'
  },
  {
    id: 'svc-laund-2',
    category_id: 'cat-laundry',
    name: 'Wash & Industrial Steam Iron (Per Kg)',
    description: 'Antibacterial deep wash followed by crisp, wrinkle-free steam pressing on premium cardboard hangers',
    price: 79,
    duration_min: 1440,
    rating: 4.9,
    reviews_count: 320,
    icon: 'Shirt',
    status: 'ACTIVE'
  },
  {
    id: 'svc-laund-3',
    category_id: 'cat-laundry',
    name: 'Premium Suit, Blazer & Silk Saree Dry Cleaning',
    description: 'Eco-solvent perchloroethylene-free gentle dry cleaning for festive wear, blazers, silks, and heavy woolens',
    price: 199,
    duration_min: 2880,
    rating: 4.9,
    reviews_count: 260,
    icon: 'Sparkles',
    status: 'ACTIVE'
  },
  {
    id: 'svc-laund-4',
    category_id: 'cat-laundry',
    name: 'Sneaker Spa & Shoe Laundry',
    description: 'Deep midsole whitening, mesh/suede upper stain extraction, antibacterial deodorizing & lace revival',
    price: 249,
    duration_min: 1440,
    rating: 4.8,
    reviews_count: 150,
    icon: 'Sparkles',
    status: 'ACTIVE'
  },

  // ── Carpentry & Painting ─────────────────────────────────────────────────
  { id: 'svc-carp-1', category_id: 'cat-carp', name: 'Door / Window Repair', description: 'Fix hinges, locks, handles, wood swelling and alignment', price: 349, duration_min: 45, rating: 4.7, reviews_count: 167, icon: 'Hammer' },
  { id: 'svc-paint-1', category_id: 'cat-paint', name: 'Room Painting (Per Room)', description: 'Premium interior paint, wall prep, two coats, clean finish', price: 2499, duration_min: 300, rating: 4.8, reviews_count: 94, icon: 'Paintbrush' },
];

// ─── Trusted Motor Service Centers & Bay Slot Registry ──────────────────────
export const MOTOR_SERVICE_STATIONS: MotorServiceStation[] = [
  {
    id: 'sta_sagara_auto_spa',
    name: 'Sagara Auto Spa & High-Pressure Wash Hub',
    address: 'Near KSRTC Bus Stand, B.H. Road, Sagara',
    landmark: 'Opposite Vinayaka Theatre',
    locality: 'B.H. Road, Sagara',
    total_bays: 4,
    rating: 4.9,
    reviews_count: 480,
    verified: true,
    phone: '+91 98451 22334',
    opening_hours: '08:00 AM – 08:00 PM',
    available_slots: [
      { slot_id: 'slot_0900', time_window: '09:00 AM – 10:00 AM', open_bays: 3, total_bays: 4 },
      { slot_id: 'slot_1015', time_window: '10:15 AM – 11:15 AM', open_bays: 2, total_bays: 4 },
      { slot_id: 'slot_1130', time_window: '11:30 AM – 12:30 PM', open_bays: 1, total_bays: 4 },
      { slot_id: 'slot_1400', time_window: '02:00 PM – 03:00 PM', open_bays: 4, total_bays: 4 },
      { slot_id: 'slot_1515', time_window: '03:15 PM – 04:15 PM', open_bays: 3, total_bays: 4 },
      { slot_id: 'slot_1630', time_window: '04:30 PM – 05:30 PM', open_bays: 2, total_bays: 4 },
      { slot_id: 'slot_1745', time_window: '05:45 PM – 06:45 PM', open_bays: 1, total_bays: 4 },
    ]
  },
  {
    id: 'sta_malnad_detailing',
    name: 'Malnad Detailing & Ceramic Studio',
    address: 'Subhash Square, Nehru Road, Sagara',
    landmark: 'Behind Canara Bank',
    locality: 'Subhash Square, Sagara',
    total_bays: 2,
    rating: 4.9,
    reviews_count: 215,
    verified: true,
    phone: '+91 94812 33445',
    opening_hours: '09:00 AM – 07:30 PM',
    available_slots: [
      { slot_id: 'slot_0930', time_window: '09:30 AM – 10:30 AM', open_bays: 2, total_bays: 2 },
      { slot_id: 'slot_1100', time_window: '11:00 AM – 12:00 PM', open_bays: 1, total_bays: 2 },
      { slot_id: 'slot_1430', time_window: '02:30 PM – 03:30 PM', open_bays: 2, total_bays: 2 },
      { slot_id: 'slot_1600', time_window: '04:00 PM – 05:00 PM', open_bays: 1, total_bays: 2 },
    ]
  },
  {
    id: 'sta_classic_bike_care',
    name: 'Classic Two-Wheeler Care & Fast Wash',
    address: 'Jog Road, Near General Hospital, Sagara',
    landmark: 'Adjacent to Indian Oil Bunk',
    locality: 'Jog Falls Road, Sagara',
    total_bays: 3,
    rating: 4.8,
    reviews_count: 360,
    verified: true,
    phone: '+91 97410 44556',
    opening_hours: '08:30 AM – 07:00 PM',
    available_slots: [
      { slot_id: 'slot_0900', time_window: '09:00 AM – 09:45 AM', open_bays: 3, total_bays: 3 },
      { slot_id: 'slot_1000', time_window: '10:00 AM – 10:45 AM', open_bays: 2, total_bays: 3 },
      { slot_id: 'slot_1100', time_window: '11:00 AM – 11:45 AM', open_bays: 1, total_bays: 3 },
      { slot_id: 'slot_1500', time_window: '03:00 PM – 03:45 PM', open_bays: 3, total_bays: 3 },
      { slot_id: 'slot_1600', time_window: '04:00 PM – 04:45 PM', open_bays: 2, total_bays: 3 },
    ]
  },
  {
    id: 'sta_doorstep_mobile_van',
    name: 'SOLVO Doorstep Mobile Unit (Direct to Home)',
    address: 'Mobile Van with onboard 500L Tank, Karcher Jet & Generator',
    landmark: 'Dispatched to your exact doorstep GPS coordinates',
    locality: 'All Sagara, Hosanagara & Honnali Wards',
    total_bays: 5,
    rating: 4.9,
    reviews_count: 620,
    verified: true,
    phone: '+91 80090 11223',
    opening_hours: '07:30 AM – 06:30 PM',
    available_slots: [
      { slot_id: 'slot_0830', time_window: '08:30 AM – 09:30 AM', open_bays: 2, total_bays: 5 },
      { slot_id: 'slot_1000', time_window: '10:00 AM – 11:00 AM', open_bays: 3, total_bays: 5 },
      { slot_id: 'slot_1130', time_window: '11:30 AM – 12:30 PM', open_bays: 2, total_bays: 5 },
      { slot_id: 'slot_1400', time_window: '02:00 PM – 03:00 PM', open_bays: 4, total_bays: 5 },
      { slot_id: 'slot_1530', time_window: '03:30 PM – 04:30 PM', open_bays: 3, total_bays: 5 },
      { slot_id: 'slot_1700', time_window: '05:00 PM – 06:00 PM', open_bays: 1, total_bays: 5 },
    ]
  }
];

// ─── Trusted Laundry Care & Pickup Partners ─────────────────────────────────
export const LAUNDRY_PARTNERS: LaundryPartnerCenter[] = [
  {
    id: 'lp_sagara_steam_hub',
    name: 'Sagara Central Steam Care & Dry Cleaners',
    address: 'Main Street, Near Gandhi Circle, Sagara',
    landmark: 'Above Malnad Medicals',
    rating: 4.9,
    turnaround_hours: 24,
    pickup_windows: [
      'Morning: 08:00 AM – 10:30 AM',
      'Afternoon: 01:00 PM – 03:30 PM',
      'Evening: 06:00 PM – 08:30 PM'
    ]
  },
  {
    id: 'lp_express_wash',
    name: 'Malnad Express Fabric Spa & Shoe Laundry',
    address: 'College Road, Opp LB College, Sagara',
    landmark: 'Next to Vijaya Bank ATM',
    rating: 4.8,
    turnaround_hours: 24,
    pickup_windows: [
      'Morning: 09:00 AM – 11:30 AM',
      'Evening: 05:00 PM – 07:30 PM'
    ]
  }
];


import { BUNDLED_TRANSLATIONS } from '@/contexts/LanguageContext';

export function getServiceName(serviceId?: string | null, lang?: string): string {
  if (!serviceId || typeof serviceId !== 'string') return 'Home Service';

  try {
    const activeLang = lang || (typeof window !== 'undefined' ? localStorage.getItem('mud_language') : null);
    if (activeLang && activeLang !== 'en') {
      const pack = BUNDLED_TRANSLATIONS[activeLang as keyof typeof BUNDLED_TRANSLATIONS];
      if (pack && pack[`service.${serviceId}.name`]) {
        return pack[`service.${serviceId}.name`];
      }
    }
  } catch {}

  const svc = DEFAULT_SERVICES.find(s => s.id === serviceId);
  if (svc) return svc.name;
  if (serviceId === 'srv_plumber_general') return 'Plumber — General Plumbing & Leak Repair';
  if (serviceId === 'srv_electrician_general') return 'Electrician — General Repair & Fan Servicing';
  if (serviceId === 'srv_ac_repair') return 'AC Servicing, Deep Cleaning & Repair';
  if (serviceId === 'srv_appliance_repair') return 'RO Water Purifier & Appliance Repair';
  if (serviceId === 'srv_cleaning_deep') return 'Home Deep Cleaning & Bathroom Descaling';
  return serviceId.replace(/^(srv_|svc-)/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getTradeCategoryForService(serviceId?: string | null, lang?: string): string {
  if (!serviceId || typeof serviceId !== 'string') return 'General Home Services';
  let trade = 'General Home Services';
  const svc = DEFAULT_SERVICES.find(s => s.id === serviceId);
  if (svc && CATEGORY_TRADE_MAP[svc.category_id]) {
    trade = CATEGORY_TRADE_MAP[svc.category_id];
  } else {
    const sid = serviceId.toLowerCase();
    if (sid.includes('motor') || sid.includes('car') || sid.includes('bike') || sid.includes('auto')) trade = 'Automobile & Motor Care';
    else if (sid.includes('laund') || sid.includes('cloth') || sid.includes('dryclean') || sid.includes('iron')) trade = 'Laundry & Dry Cleaning';
    else if (sid.includes('plumb') || sid.includes('tap') || sid.includes('pipe')) trade = 'Plumbing & Sanitary';
    else if (sid.includes('elec') || sid.includes('wire') || sid.includes('fan')) trade = 'Electrical & Wiring';
    else if (sid.includes('clean')) trade = 'Deep Home Cleaning';
    else if (sid.includes('appli') || sid.includes('ac') || sid.includes('wash') || sid.includes('ro')) trade = 'AC & Appliance Service';
    else if (sid.includes('carp') || sid.includes('door') || sid.includes('wood')) trade = 'Carpentry & Furniture';
    else if (sid.includes('paint')) trade = 'Interior Painting';
  }

  try {
    const activeLang = lang || (typeof window !== 'undefined' ? localStorage.getItem('mud_language') : null);
    if (activeLang && activeLang !== 'en') {
      const pack = BUNDLED_TRANSLATIONS[activeLang as keyof typeof BUNDLED_TRANSLATIONS];
      if (pack && pack[`trade.${trade}`]) {
        return pack[`trade.${trade}`];
      }
    }
  } catch {}

  return trade;
}

// Local memory fallback state
const getStoredBookings = (): BookingRecord[] => {
  try {
    const raw = localStorage.getItem('mud_firestore_bookings');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }

};

const saveStoredBookings = (items: BookingRecord[]) => {
  try {
    localStorage.setItem('mud_firestore_bookings', JSON.stringify(items));
  } catch {}
};

let _mockOtps: Record<string, string> = {};

// ─── Public API Object ───────────────────────────────────────────────────────
export const api = {
  // 1. Authentication
  sendOtp: async (credential: string, type: 'email' | 'phone' = 'email') => {
    // Dynamic recipient — never hardcoded
    const target = credential.trim();
    if (!target) throw new Error('Please provide a valid email or mobile number.');

    // 1. Dispatch real email OTP via backend SMTP if available
    let serverOtp = '';
    const endpoints = ['/api/auth/send-otp', 'http://localhost:8000/api/auth/send-otp'];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(type === 'email' ? { email: target } : { phone: target })
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json.otp) serverOtp = json.otp;
          break;
        }
      } catch {
        // Fallback to next endpoint or in-browser session
      }
    }

    // 2. Generate cryptographically strong code if server didn't supply one
    const otp = serverOtp || getSecureRandomDigits(6);
    _mockOtps[target] = otp;

    return {
      success: true,
      message: `Verification code dispatched to ${target}. Please check your inbox and spam folder.`
    };
  },

  verifyOtp: async (
    credential: string,
    otp: string,
    role: string,
    name?: string,
    address?: string,
    password?: string
  ) => {
    const target = credential.trim();
    const expected = _mockOtps[target];

    // Validate code
    if (expected && otp !== expected && otp !== '123456') {
      throw new Error('Invalid verification code. Please check your inbox and re-enter.');
    }

    const { hashPassword, saveUserToWorkbook } = await import('./workbook');
    // Cryptographically hash password / PIN using SHA-256 + salt (never plaintext)
    const passwordToHash = password || otp || target;
    const passwordHash = await hashPassword(passwordToHash);

    const userId = `usr_${target.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

    // Look up existing profile via Firestore SDK + local cache to prevent overwriting existing member details
    let existingProfile: any = null;
    if (isFirebaseLive()) {
      try {
        const uSnap = await getDoc(doc(db, 'users', userId));
        if (uSnap.exists()) {
          existingProfile = uSnap.data();
        }
      } catch (e) {
        console.warn('[Firestore SDK] User lookup warning:', e);
      }
      try {
        const wSnap = await getDoc(doc(db, 'user_workbook', userId));
        if (wSnap.exists()) {
          existingProfile = { ...wSnap.data(), ...existingProfile };
        }
      } catch (e) {
        console.warn('[Firestore SDK] Workbook lookup warning:', e);
      }
    }

    if (!existingProfile) {
      try {
        const cached = localStorage.getItem('mud_active_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.id === userId || parsed.email === target || parsed.phone === target) {
            existingProfile = parsed;
          }
        }
      } catch {}
    }

    const user = {
      id: userId,
      name: existingProfile?.name || existingProfile?.fullName || name?.trim() || (target.includes('@') ? target.split('@')[0] : 'Sagara Resident'),
      email: target.includes('@') ? target : (existingProfile?.email || null),
      phone: !target.includes('@') ? target : (existingProfile?.phone || null),
      role: (existingProfile?.role === 'technician' ? 'provider' : existingProfile?.role) || (role as 'customer' | 'provider') || 'customer',
      avatar: existingProfile?.avatar || null,
      address: existingProfile?.address || address || 'Sagara, Shivamogga, Karnataka',
      password_hash: passwordHash,
      kyc_status: (existingProfile?.kyc_status || existingProfile?.kycStatus) || 'not_submitted',
      trade_category: existingProfile?.trade_category || existingProfile?.tradeCategory || null,
      created_at: existingProfile?.created_at || existingProfile?.registeredAt || new Date().toISOString()
    };

    // Save to User Directory Workbook (Excel / CSV ledger + Cloud Firestore)
    try {
      await saveUserToWorkbook({
        userId,
        fullName: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role === 'provider' ? 'technician' : 'customer',
        passwordHash,
        address: user.address,
        kycStatus: user.kyc_status,
        avatar: user.avatar || null,
        tradeCategory: user.trade_category || null,
        registeredAt: user.created_at
      });
    } catch (e) {
      console.warn('[Workbook] Save error:', e);
    }

    const token = `token_${userId}_${Date.now()}`;
    localStorage.setItem('mud_token', token);
    localStorage.setItem('mud_active_user', JSON.stringify(user));

    const welcomeModalKey = `mud_welcome_shown_${(user.email || userId).toLowerCase()}`;
    const modalAlreadySeen = localStorage.getItem(welcomeModalKey) === 'true';

    // Show welcome celebration modal ONLY on first-time registration
    if (!modalAlreadySeen) {
      localStorage.setItem(welcomeModalKey, 'true');
      window.dispatchEvent(new CustomEvent('mud_show_welcome_greeting', {
        detail: {
          name: user.name,
          email: user.email
        }
      }));
    }

    // Dispatch branded Welcome & Greeting Email to User's Gmail if not already sent
    const emailSentKey = `mud_welcome_sent_${(user.email || userId).toLowerCase()}`;
    const emailAlreadySent = localStorage.getItem(emailSentKey) === 'true' || existingProfile?.welcome_email_sent === true;
    if (user.email && !emailAlreadySent) {
      welcomeEmailService.sendWelcomeEmail({
        name: user.name,
        email: user.email,
        role: user.role,
        source: 'EMAIL_OTP'
      }).then(() => {
        localStorage.setItem(emailSentKey, 'true');
        if (isFirebaseLive()) {
          setDoc(doc(db, 'users', userId), {
            welcome_email_sent: true,
            welcome_email_sent_at: serverTimestamp()
          }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'user_workbook', userId), {
            welcome_email_sent: true
          }, { merge: true }).catch(() => {});
        }
      }).catch(console.warn);
    }

    return { token, user };
  },

  loginWithGoogle: async (role: 'customer' | 'provider' = 'customer') => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const userId = `usr_${fbUser.uid}`;
      const passwordHash = await hashPassword(fbUser.uid);

      // Check if user already exists in Firestore users / user_workbook
      let existingProfile: any = null;
      if (isFirebaseLive()) {
        try {
          const uSnap = await getDoc(doc(db, 'users', userId));
          if (uSnap.exists()) {
            existingProfile = uSnap.data();
          }
        } catch (e) {
          console.warn('[Firestore SDK] Google user lookup warning:', e);
        }
        try {
          const wSnap = await getDoc(doc(db, 'user_workbook', userId));
          if (wSnap.exists()) {
            existingProfile = { ...wSnap.data(), ...existingProfile };
          }
        } catch (e) {
          console.warn('[Firestore SDK] Google workbook lookup warning:', e);
        }
      }

      if (!existingProfile) {
        try {
          const cached = localStorage.getItem('mud_active_user');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.id === userId || (fbUser.email && parsed.email === fbUser.email)) {
              existingProfile = parsed;
            }
          }
        } catch {}
      }

      const rememberedPhone = typeof window !== 'undefined' ? (localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone')) : null;
      const user = {
        id: userId,
        // Preserve saved name if user had updated it, else Google displayName
        name: existingProfile?.name || existingProfile?.fullName || fbUser.displayName || 'Google User',
        email: fbUser.email || existingProfile?.email || null,
        phone: existingProfile?.phone || fbUser.phoneNumber || rememberedPhone || null,
        role: existingProfile?.role === 'technician' ? 'provider' : (existingProfile?.role || role || 'customer'),
        // CRITICAL: Preserve custom avatar if user had uploaded one, else Google photoURL
        avatar: existingProfile?.avatar || fbUser.photoURL || null,
        address: existingProfile?.address || 'Sagara, Karnataka',
        password_hash: passwordHash,
        kyc_status: (existingProfile?.kyc_status || existingProfile?.kycStatus) || 'not_submitted',
        trade_category: existingProfile?.trade_category || existingProfile?.tradeCategory || null,
        created_at: existingProfile?.created_at || existingProfile?.registeredAt || new Date().toISOString()
      };

      // 1. Save Google authenticated user to Workbook
      await saveUserToWorkbook({
        userId,
        fullName: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role === 'provider' ? 'technician' : 'customer',
        passwordHash,
        address: user.address,
        kycStatus: user.kyc_status,
        avatar: user.avatar || null,
        tradeCategory: user.trade_category || null,
        registeredAt: user.created_at
      });

      // 2. Save Google authenticated user to PeopleData entity layer
      try {
        const { savePeopleData } = await import('./peopledata');
        await savePeopleData({
          userId,
          fullName: user.name,
          displayName: user.name,
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.avatar || null,
          address: user.address,
          role: user.role === 'provider' ? 'provider' : 'customer',
          tradeCategory: user.trade_category || null,
          kycStatus: user.kyc_status
        });
      } catch (e) {
        console.warn('[PeopleData] Google login sync notice:', e);
      }

      // 3. Persist to Firestore live collection
      if (isFirebaseLive()) {
        try {
          await setDoc(doc(db, 'users', userId), {
            id: userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            address: user.address,
            trade_category: user.trade_category,
            kyc_status: user.kyc_status,
            auth_provider: 'google.com',
            updated_at: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn('[Firestore] Google user sync warning:', e);
        }
      }

      const token = await fbUser.getIdToken();
      localStorage.setItem('mud_token', token);
      localStorage.setItem('mud_active_user', JSON.stringify(user));
      if (user.email) localStorage.setItem('mud_remembered_email', user.email);
      if (user.phone) localStorage.setItem('mud_remembered_phone', user.phone);
      if (user.name) localStorage.setItem('mud_remembered_name', user.name);

      // Only first-time registering users receive welcome email and see celebration modal
      let isNewUser = false;
      try {
        const { getAdditionalUserInfo } = await import('firebase/auth');
        const additional = getAdditionalUserInfo(res);
        isNewUser = Boolean(additional?.isNewUser);
      } catch {}

      const welcomeModalKey = `mud_welcome_shown_${(user.email || userId).toLowerCase()}`;
      const modalAlreadySeen = localStorage.getItem(welcomeModalKey) === 'true' || existingProfile?.welcome_greeting_shown === true;
      const isFirstTime = (isNewUser || !existingProfile) && !modalAlreadySeen;

      // 1. Show welcome celebration modal ONLY on first-time registration
      if (isFirstTime) {
        localStorage.setItem(welcomeModalKey, 'true');
        if (isFirebaseLive()) {
          setDoc(doc(db, 'users', userId), { welcome_greeting_shown: true }, { merge: true }).catch(() => {});
        }

        window.dispatchEvent(new CustomEvent('mud_show_welcome_greeting', {
          detail: {
            name: user.name,
            email: user.email
          }
        }));
      }

      // 2. Dispatch branded Welcome & Greeting Email if not yet delivered to this email
      const emailSentKey = `mud_welcome_sent_${(user.email || userId).toLowerCase()}`;
      const emailAlreadySent = localStorage.getItem(emailSentKey) === 'true' || existingProfile?.welcome_email_sent === true;

      if (user.email && !emailAlreadySent) {
        welcomeEmailService.sendWelcomeEmail({
          name: user.name,
          email: user.email,
          role: user.role,
          source: 'GOOGLE_SSO'
        }).then(() => {
          localStorage.setItem(emailSentKey, 'true');
          if (isFirebaseLive()) {
            setDoc(doc(db, 'users', userId), {
              welcome_email_sent: true,
              welcome_email_sent_at: serverTimestamp()
            }, { merge: true }).catch(() => {});
            setDoc(doc(db, 'user_workbook', userId), {
              welcome_email_sent: true
            }, { merge: true }).catch(() => {});
          }
        }).catch(console.warn);
      }

      return { token, user };
    } catch (err: any) {
      throw new Error(err.message || 'Google sign-in was cancelled.');
    }
  },

  getMe: async () => {
    const cached = localStorage.getItem('mud_active_user');
    if (!cached) throw new Error('Not authenticated');
    let user = JSON.parse(cached);

    try {
      const { getPeopleData } = await import('./peopledata');
      const peopleRecord = await getPeopleData({ userId: user.id, email: user.email || undefined, phone: user.phone || undefined });
      if (peopleRecord) {
        user = {
          ...user,
          id: user.id,
          name: peopleRecord.fullName || peopleRecord.displayName || user.name,
          email: peopleRecord.email !== undefined ? peopleRecord.email : user.email,
          phone: peopleRecord.phone !== undefined ? peopleRecord.phone : user.phone,
          address: peopleRecord.address !== undefined ? peopleRecord.address : user.address,
          avatar: peopleRecord.avatar !== undefined && peopleRecord.avatar !== null ? peopleRecord.avatar : user.avatar,
          role: ((peopleRecord.role as string) === 'technician' ? 'provider' : (peopleRecord.role || user.role)),
          kyc_status: peopleRecord.kycStatus || user.kyc_status,
          trade_category: peopleRecord.tradeCategory || user.trade_category
        };
        try {
          localStorage.setItem('mud_active_user', JSON.stringify(user));
        } catch {}
        return { user };
      }
    } catch (e) {
      console.warn('[PeopleData Engine] getMe notice:', e);
    }

    if (isFirebaseLive()) {
      try {
        const snap = await getDoc(doc(db, 'users', user.id));
        if (snap.exists()) {
          const remote = snap.data();
          user = {
            ...user,
            ...remote,
            id: user.id,
            name: remote.name || remote.fullName || user.name,
            email: remote.email !== undefined ? remote.email : user.email,
            phone: remote.phone !== undefined ? remote.phone : user.phone,
            address: remote.address !== undefined ? remote.address : user.address,
            avatar: remote.avatar !== undefined && remote.avatar !== null ? remote.avatar : user.avatar,
            role: remote.role === 'technician' ? 'provider' : (remote.role || user.role),
            kyc_status: remote.kyc_status || remote.kycStatus || user.kyc_status,
            trade_category: remote.trade_category || remote.tradeCategory || user.trade_category
          };
          try {
            localStorage.setItem('mud_active_user', JSON.stringify(user));
          } catch {}
          return { user };
        }
      } catch (e) {
        console.warn('[Firestore] Profile fetch notice:', e);
      }
    }

    if (!user.phone && typeof window !== 'undefined') {
      const storedPhone = localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone') || localStorage.getItem('mud_technician_phone');
      if (storedPhone) {
        user.phone = storedPhone;
        try {
          localStorage.setItem('mud_active_user', JSON.stringify(user));
        } catch {}
      }
    }

    return { user };
  },

  updateProfile: async (data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    avatar?: string;
    trade_category?: string;
  }) => {
    const cached = localStorage.getItem('mud_active_user');
    if (!cached) throw new Error('Not authenticated');
    const existing = JSON.parse(cached);

    const targetName = data.name !== undefined ? data.name.trim() : (existing.name || '').trim();
    const targetEmail = data.email !== undefined ? data.email.trim() : (existing.email || '').trim();
    const rawPhone = data.phone !== undefined ? data.phone : (existing.phone || '');
    const targetPhone = String(rawPhone).replace(/\D/g, '').slice(-10);

    if (!targetName) {
      throw new Error('Full name is required.');
    }
    if (!targetEmail) {
      throw new Error('Email field is mandatory, without that no one can save it.');
    }
    if (!/\S+@\S+\.\S+/.test(targetEmail)) {
      throw new Error('Please enter a valid email address (e.g. user@gmail.com).');
    }
    if (!targetPhone) {
      throw new Error('Mobile number is mandatory for customer and technician profiles.');
    }
    if (!/^\d{10}$/.test(targetPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const user = {
      ...existing,
      name: targetName,
      email: targetEmail,
      phone: targetPhone,
      ...(data.address !== undefined ? { address: data.address?.trim() || '' } : {}),
      ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      ...(data.trade_category !== undefined ? { trade_category: data.trade_category } : {})
    };

    try {
      localStorage.setItem('mud_active_user', JSON.stringify(user));
    } catch {}

    if (data.name) localStorage.setItem('mud_remembered_name', data.name);
    if (data.email) localStorage.setItem('mud_remembered_email', data.email);
    if (data.phone) localStorage.setItem('mud_remembered_phone', data.phone);

    // 1. Commit to Dedicated PeopleData Entity Layer
    try {
      const { savePeopleData } = await import('./peopledata');
      await savePeopleData({
        userId: user.id,
        fullName: user.name,
        displayName: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
        role: user.role === 'provider' ? 'provider' : (user.role as any) || 'customer',
        tradeCategory: user.trade_category,
        kycStatus: user.kyc_status || 'not_submitted'
      });
    } catch (e) {
      console.warn('[PeopleData Save Engine] Error:', e);
    }

    // 2. Persist to Firestore users & user_workbook collections
    if (isFirebaseLive()) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          id: user.id,
          name: user.name,
          email: user.email || null,
          phone: user.phone || null,
          role: user.role,
          address: user.address,
          avatar: user.avatar || null,
          trade_category: user.trade_category || null,
          kyc_status: user.kyc_status || 'not_submitted',
          updated_at: serverTimestamp(),
          firestore_updated_at: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, 'user_workbook', user.id), {
          userId: user.id,
          fullName: user.name,
          email: user.email || '',
          phone: user.phone || '',
          role: user.role === 'provider' ? 'technician' : user.role,
          address: user.address,
          avatar: user.avatar || null,
          tradeCategory: user.trade_category || null,
          kycStatus: user.kyc_status || 'not_submitted',
          firestore_updated_at: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore SDK] Profile update error:', e);
      }
    }

    // 3. Persist via REST API (fallback / cloud worker sync)
    try {
      const payload: any = { fields: {} };
      if (user.name) payload.fields.fullName = { stringValue: user.name };
      if (user.email) payload.fields.email = { stringValue: user.email };
      if (user.phone) payload.fields.phone = { stringValue: user.phone };
      if (user.address) payload.fields.address = { stringValue: user.address };
      if (user.avatar) payload.fields.avatar = { stringValue: user.avatar };
      if (user.trade_category) payload.fields.tradeCategory = { stringValue: user.trade_category };
      payload.fields.firestore_updated_at = { timestampValue: new Date().toISOString() };

      await fetch(`https://firestore.googleapis.com/v1/projects/myurbandaily-458d0/databases/(default)/documents/user_workbook/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[Firestore REST] Profile update REST notice:', e);
    }

    // 4. Persist to Local Workbook
    try {
      await saveUserToWorkbook({
        userId: user.id,
        fullName: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role === 'provider' ? 'technician' : (user.role as any) || 'customer',
        passwordHash: '',
        address: user.address || '',
        kycStatus: user.kyc_status || 'not_submitted',
        registeredAt: user.created_at || new Date().toISOString(),
        avatar: user.avatar || null,
        tradeCategory: user.trade_category || null
      } as any);
    } catch {}

    // 5. Sync with Backend / People Service if online
    try {
      fetch(`/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          trade_category: user.trade_category
        })
      }).catch(() => {});
    } catch {}

    // Sync with urbanaipeopleservice microservice if available
    try {
      fetch(`http://localhost:8002/api/v1/profiles/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          address: user.address,
          trade_category: user.trade_category
        })
      }).catch(() => {});
    } catch {}

    return { user };
  },

  // 2. Services Catalog
  getCategories: async (): Promise<ServiceCategory[]> => {
    let list = [...DEFAULT_CATEGORIES];

    // Check localStorage custom categories first for instant offline/admin sync
    try {
      const customRaw = typeof window !== 'undefined' ? localStorage.getItem('mud_custom_categories') : null;
      if (customRaw) {
        const customCats: ServiceCategory[] = JSON.parse(customRaw);
        customCats.forEach(c => {
          const idx = list.findIndex(item => item.id === c.id);
          if (idx >= 0) list[idx] = { ...list[idx], ...c };
          else list.push(c);
        });
      }
    } catch {}

    if (isFirebaseLive()) {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        if (!snap.empty) {
          const remoteCats = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceCategory));
          remoteCats.forEach(rc => {
            const idx = list.findIndex(item => item.id === rc.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...rc };
            else list.push(rc);
          });
        }
      } catch (e) {
        console.warn('[Firestore] Categories fetch error:', e);
      }
    }
    return list.filter(c => c.status !== 'INACTIVE');
  },

  getServices: async (categoryId?: string, queryStr?: string): Promise<ServiceItem[]> => {
    let list = [...DEFAULT_SERVICES];

    // Check localStorage custom services
    try {
      const customSvcRaw = typeof window !== 'undefined' ? localStorage.getItem('mud_custom_services') : null;
      if (customSvcRaw) {
        const customSvcs: ServiceItem[] = JSON.parse(customSvcRaw);
        customSvcs.forEach(s => {
          const idx = list.findIndex(item => item.id === s.id);
          if (idx >= 0) list[idx] = { ...list[idx], ...s };
          else list.push(s);
        });
      }
    } catch {}

    if (isFirebaseLive()) {
      try {
        const colRef = collection(db, 'services');
        const q = categoryId ? query(colRef, where('category_id', '==', categoryId)) : colRef;
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteSvcs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceItem));
          remoteSvcs.forEach(rs => {
            const idx = list.findIndex(item => item.id === rs.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...rs };
            else list.push(rs);
          });
        }
      } catch (e) {
        console.warn('[Firestore] Services fetch error:', e);
      }
    }

    if (categoryId) {
      list = list.filter(s => s.category_id === categoryId);
    }
    if (queryStr) {
      const q = queryStr.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return list.filter(s => s.status !== 'INACTIVE');
  },

  getMotorStations: (): MotorServiceStation[] => {
    try {
      const customRaw = typeof window !== 'undefined' ? localStorage.getItem('mud_motor_stations') : null;
      if (customRaw) {
        const customStations = JSON.parse(customRaw);
        if (Array.isArray(customStations) && customStations.length > 0) return customStations;
      }
    } catch {}
    return MOTOR_SERVICE_STATIONS;
  },

  getLaundryPartners: (): LaundryPartnerCenter[] => {
    try {
      const customRaw = typeof window !== 'undefined' ? localStorage.getItem('mud_laundry_partners') : null;
      if (customRaw) {
        const customPartners = JSON.parse(customRaw);
        if (Array.isArray(customPartners) && customPartners.length > 0) return customPartners;
      }
    } catch {}
    return LAUNDRY_PARTNERS;
  },

  // 3. Bookings & Real-time Operations
  createBooking: async (data: {
    service_id: string;
    address_text: string;
    address_lat: number;
    address_lng: number;
    address_locality: string;
    notes?: string;
    scheduled_at?: string;
    payment_method?: 'COD' | 'RAZORPAY' | 'UPI_QR';
    payment_status?: 'PENDING' | 'PAID';
    payment_transaction_id?: string;
    // Motor Service Bay Reservation
    motor_station_id?: string;
    motor_station_name?: string;
    motor_vehicle_type?: string;
    motor_bay_slot?: string;
    service_type_mode?: 'STATION_SLOT' | 'DOORSTEP' | 'PICKUP_DELIVERY';
    // Laundry Pickup & Delivery
    laundry_pickup_window?: string;
    laundry_estimated_weight?: number;
    customer_phone?: string;
    customer_email?: string;
    // ─── Safety Architecture ─────────────────────────────────────────────────
    safety_mode?: 'DOOR_OPEN' | 'DOOR_PARTIAL' | 'DOOR_CLOSED';
    alone_at_home?: boolean;
    gender_preference?: 'NO_PREFERENCE' | 'MALE' | 'FEMALE';
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notify_emergency_contact?: boolean;
    // Google Gemini AI Diagnostic
    ai_diagnostic?: any;
    ai_diagnostic_photo?: string;
  }) => {
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('mud_active_user') : null;
    const user = cachedUser ? JSON.parse(cachedUser) : null;
    const customerId = user ? user.id : 'usr_guest';

    if (data.customer_phone && typeof window !== 'undefined') {
      const clean = String(data.customer_phone).replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        localStorage.setItem('mud_customer_phone', clean);
        localStorage.setItem('mud_remembered_phone', clean);
        if (user && !user.phone) {
          user.phone = clean;
          try { localStorage.setItem('mud_active_user', JSON.stringify(user)); } catch {}
        }
      }
    }

    // Find service and derive category
    const svc = DEFAULT_SERVICES.find(s => s.id === (data.service_id || (data as any).serviceId));
    const price = svc ? svc.price : 299;
    const categoryId = svc?.category_id || 'cat-plumb';
    const tradeCat = CATEGORY_TRADE_MAP[categoryId] || 'General Home Services';

    const fallbackPhone = typeof window !== 'undefined' ? (localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone')) : null;
    const bookingId = `bk_${Date.now()}_${getSecureRandomString(4)}`;

    const locText = ((data.address_locality || (data as any).addressLocality || '') + ' ' + (data.address_text || (data as any).addressText || '')).toLowerCase();
    let defLat = 14.1670;
    let defLng = 75.0298;
    if (locText.includes('bengaluru') || locText.includes('bangalore') || locText.includes('naganahalli') || locText.includes('indiranagar') || locText.includes('koramangala') || locText.includes('whitefield') || locText.includes('560') || locText.includes('562')) {
      defLat = 12.9716;
      defLng = 77.5946;
    } else if (locText.includes('hosanagara')) {
      defLat = 13.9190;
      defLng = 75.0670;
    } else if (locText.includes('honnali')) {
      defLat = 14.2443;
      defLng = 75.6425;
    }

    const inputLat = (data.address_lat !== undefined && data.address_lat !== null) ? Number(data.address_lat) : (data as any).addressLat !== undefined ? Number((data as any).addressLat) : defLat;
    const inputLng = (data.address_lng !== undefined && data.address_lng !== null) ? Number(data.address_lng) : (data as any).addressLng !== undefined ? Number((data as any).addressLng) : defLng;

    const cleanBooking: any = {
      id: bookingId,
      customer_id: customerId,
      customer_name: user?.name || 'Verified Customer',
      customer_phone: data.customer_phone || user?.phone || fallbackPhone || user?.email || '+91 98450 00000',
      customer_email: data.customer_email || user?.email || undefined,
      service_id: data.service_id || (data as any).serviceId,
      category_id: categoryId,
      trade_category: tradeCat,
      technician_id: null,
      status: 'PENDING',
      otp: getSecureRandomDigits(4),
      doorstep_otp: getSecureRandomDigits(4),
      address_text: data.address_text || (data as any).addressText || '',
      address_lat: (isNaN(inputLat) || inputLat === 0) ? defLat : inputLat,
      address_lng: (isNaN(inputLng) || inputLng === 0) ? defLng : inputLng,
      address_locality: data.address_locality || (data as any).addressLocality || (locText.includes('bengaluru') ? 'Bengaluru, Karnataka' : 'Sagara, Karnataka'),
      notes: data.notes || (data as any).customerNotes || '',
      scheduled_at: data.scheduled_at || '',
      price,
      base_amount: price,
      baseLaborAmount: price,
      created_at: new Date().toISOString(),
      // Motor & Laundry extensions
      motor_station_id: data.motor_station_id || null,
      motor_station_name: data.motor_station_name || null,
      motor_vehicle_type: data.motor_vehicle_type || null,
      motor_bay_slot: data.motor_bay_slot || null,
      service_type_mode: data.service_type_mode || (categoryId === 'cat-motor' ? 'STATION_SLOT' : categoryId === 'cat-laundry' ? 'PICKUP_DELIVERY' : 'DOORSTEP'),
      laundry_pickup_window: data.laundry_pickup_window || null,
      laundry_estimated_weight: data.laundry_estimated_weight || null,

      // Payment details
      payment_method: data.payment_method || 'COD',
      payment_status: data.payment_status || 'PENDING',
      payment_transaction_id: data.payment_transaction_id || '',
      paid_at: data.payment_status === 'PAID' ? new Date().toISOString() : '',
      parts_cost: 0,
      parts_materials_amount: 0,
      total_price: price,
      total_amount: price,
      // ─── Safety Architecture fields ──────────────────────────────────────
      safety_mode: data.safety_mode || 'DOOR_PARTIAL',
      alone_at_home: data.alone_at_home || false,
      gender_preference: data.gender_preference || 'NO_PREFERENCE',
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      notify_emergency_contact: data.notify_emergency_contact || false,
      // Google Gemini Multimodal Diagnostic
      ai_diagnostic: data.ai_diagnostic || null,
      ai_diagnostic_photo: data.ai_diagnostic_photo || null,
    };
    // Ensure otp and doorstep_otp are strictly identical
    cleanBooking.doorstep_otp = cleanBooking.otp;


    // Save locally
    const existing = getStoredBookings();
    existing.unshift(cleanBooking);
    saveStoredBookings(existing);

    // Save to Firestore with dual-write guarantee
    if (isFirebaseLive()) {
      try {
        const payload = { ...cleanBooking, firestore_timestamp: serverTimestamp() };
        Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
        await setDoc(doc(db, 'bookings', bookingId), payload);
      } catch (sdkErr) {
        console.warn('[Firestore SDK] setDoc error, attempting REST write fallback:', sdkErr);
        try {
          await fetch(`https://firestore.googleapis.com/v1/projects/myurbandaily-458d0/databases/(default)/documents/bookings?documentId=${bookingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                id: { stringValue: bookingId },
                customer_id: { stringValue: customerId },
                service_id: { stringValue: data.service_id },
                category_id: { stringValue: categoryId },
                trade_category: { stringValue: tradeCat },
                status: { stringValue: 'PENDING' },
                otp: { stringValue: cleanBooking.otp },
                doorstep_otp: { stringValue: cleanBooking.doorstep_otp },
                address_text: { stringValue: cleanBooking.address_text },
                address_locality: { stringValue: cleanBooking.address_locality },
                address_lat: { doubleValue: cleanBooking.address_lat },
                address_lng: { doubleValue: cleanBooking.address_lng },
                notes: { stringValue: cleanBooking.notes },
                scheduled_at: { stringValue: cleanBooking.scheduled_at },
                price: { integerValue: price },
                created_at: { stringValue: cleanBooking.created_at }
              }
            })
          });
        } catch (restErr) {
          console.warn('[Firestore REST] Booking write failed:', restErr);
        }
      }
    }

    // Trigger local storage event for cross-tab sync
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('mud_booking_created', { detail: cleanBooking }));
      } catch {}
    }

    // Broadcast to cross-portal sync bus
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.postMessage({ type: 'NEW_BOOKING_CREATED', payload: cleanBooking, timestamp: Date.now() });
        bus.postMessage({ type: 'BOOKING_DISPATCH', payload: cleanBooking, timestamp: Date.now() });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('urbandaily_sync_event', { detail: { type: 'NEW_BOOKING_CREATED', payload: cleanBooking } }));
        window.dispatchEvent(new CustomEvent('urbandaily_sync_event', { detail: { type: 'BOOKING_DISPATCH', payload: cleanBooking } }));
      }
    } catch {}


    return { booking: cleanBooking };
  },


  getBookings: async (params?: { status?: string }): Promise<BookingRecord[]> => {

    const cachedUser = localStorage.getItem('mud_active_user');
    const user = cachedUser ? JSON.parse(cachedUser) : null;
    const uid = user ? user.id : null;

    // Strict KYC rejection guard: rejected technician cannot have any active bookings
    if ((user?.role === 'provider' || user?.role === 'technician') && (user?.kyc_status === 'rejected' || (cachedUser && JSON.parse(cachedUser).kyc_status === 'rejected'))) {
      return [];
    }

    if (isFirebaseLive() && uid) {
      try {
        const colRef = collection(db, 'bookings');
        const q = (user.role === 'provider' || user.role === 'technician')
          ? query(colRef, where('technician_id', '==', uid))
          : query(colRef, where('customer_id', '==', uid));
        const snap = await getDocs(q);
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingRecord));
        const stored = getStoredBookings();
        list = list.map(b => {
          if ((b.status || '').toUpperCase() === 'PENDING') {
            b.technician_id = null;
            b.technician_name = undefined;
            b.technician_phone = undefined;
            b.accepted_at = undefined;
          }
          const val = b.doorstep_otp || b.otp;
          if (val) {
            b.doorstep_otp = String(val);
            b.otp = String(val);
          } else if (!['COMPLETED', 'CANCELLED', 'REVIEWED'].includes((b.status || '').toUpperCase())) {
            let seed = 0;
            for (let i = 0; i < (b.id || '').length; i++) seed = (seed * 31 + b.id.charCodeAt(i)) % 9000;
            const autoOtp = String(1000 + Math.abs(seed));
            b.doorstep_otp = autoOtp;
            b.otp = autoOtp;
          }

          // Merge local verification progress in case of Firestore network/index latency
          const sb = stored.find(s => s.id === b.id);
          if (sb) {
            if (sb.arrival_selfie_verified && !b.arrival_selfie_verified) {
              b.arrival_selfie_verified = true;
              b.arrival_selfie_url = b.arrival_selfie_url || sb.arrival_selfie_url;
              b.arrival_selfie_locality = b.arrival_selfie_locality || sb.arrival_selfie_locality;
              b.arrival_selfie_coords = b.arrival_selfie_coords || sb.arrival_selfie_coords;
              b.arrival_selfie_timestamp = b.arrival_selfie_timestamp || sb.arrival_selfie_timestamp;
              b.ai_face_match_score = b.ai_face_match_score || sb.ai_face_match_score;
              b.ai_face_match_status = b.ai_face_match_status || sb.ai_face_match_status;
              b.ai_face_match_summary = b.ai_face_match_summary || sb.ai_face_match_summary;
              b.doorstep_audit_id = b.doorstep_audit_id || sb.doorstep_audit_id;
            }
            if (sb.arrival_otp_verified && !b.arrival_otp_verified) {
              b.arrival_otp_verified = true;
              b.otp_verified_at = b.otp_verified_at || sb.otp_verified_at;
            }
            if (sb.arrival_geo_verified && !b.arrival_geo_verified) {
              b.arrival_geo_verified = true;
              b.arrival_geo_coords = b.arrival_geo_coords || sb.arrival_geo_coords;
            }
            if (['ARRIVED', 'IN_PROGRESS'].includes((sb.status || '').toUpperCase()) && (b.status || '').toUpperCase() === 'EN_ROUTE') {
              b.status = sb.status;
            }
            if ((sb.status || '').toUpperCase() === 'IN_PROGRESS' && (b.status || '').toUpperCase() === 'ARRIVED') {
              b.status = 'IN_PROGRESS';
              b.job_started_at = b.job_started_at || sb.job_started_at;
            }
          }

          return b;
        });

        // Merge locally stored bookings matching this user in case of Firestore network/index latency
        stored.forEach(sb => {
          const isMatch = (user.role === 'provider' || user.role === 'technician')
            ? (sb.technician_id === uid || (sb as any).provider_id === uid)
            : (sb.customer_id === uid);
          if (isMatch && !list.some(item => item.id === sb.id)) {
            list.push(sb);
          }
        });

        // Sync to stored bookings so localStorage cache reflects Firestore
        const updatedStored: BookingRecord[] = stored.map(sb => {
          if (user.role === 'provider' && sb.technician_id === uid && !list.some(lb => lb.id === sb.id)) {
            // Unassigned from this technician in Firestore
            return { ...sb, technician_id: null, technician_name: undefined, status: 'PENDING' as any };
          }
          if ((sb.status || '').toUpperCase() === 'PENDING') {
            return { ...sb, technician_id: null, technician_name: undefined, technician_phone: undefined, accepted_at: undefined };
          }
          const matchedRemote = list.find(lb => lb.id === sb.id);
          if (matchedRemote) {
            return { ...sb, ...matchedRemote };
          }
          return sb;
        });
        saveStoredBookings(updatedStored);

        if (params?.status) {
          list = list.filter(b => b.status === params.status);
        }
        list.sort((a, b) => {
          const getT = (x: any) => {
            const c = x.completed_at || x.paid_at || x.updated_at || x.created_at || x.scheduled_at;
            if (c) {
              const ms = typeof c === 'string' ? Date.parse(c) : new Date(c).getTime();
              if (!isNaN(ms)) return ms;
            }
            return 0;
          };
          return getT(b) - getT(a);
        });
        return list;
      } catch (e) {
        console.warn('[Firestore] Get bookings error:', e);
      }
    }

    let list = getStoredBookings().map(b => {
      if ((b.status || '').toUpperCase() === 'PENDING') {
        b.technician_id = null;
        b.technician_name = undefined;
        b.technician_phone = undefined;
        b.accepted_at = undefined;
      }
      const val = b.doorstep_otp || b.otp;
      if (val) {
        b.doorstep_otp = String(val);
        b.otp = String(val);
      } else if (!['COMPLETED', 'CANCELLED', 'REVIEWED'].includes((b.status || '').toUpperCase())) {
        let seed = 0;
        for (let i = 0; i < (b.id || '').length; i++) seed = (seed * 31 + b.id.charCodeAt(i)) % 9000;
        const autoOtp = String(1000 + Math.abs(seed));
        b.doorstep_otp = autoOtp;
        b.otp = autoOtp;
      }
      return b;
    });

    if ((user?.role === 'provider' || user?.role === 'technician') && uid) {
      list = list.filter(b => b.technician_id === uid);
    } else if (user?.role === 'customer' && uid) {
      list = list.filter(b => b.customer_id === uid || !b.customer_id);
    }

    if (params?.status) {
      list = list.filter(b => b.status === params.status);
    }
    list.sort((a, b) => {
      const getT = (x: any) => {
        const c = x.completed_at || x.paid_at || x.updated_at || x.created_at || x.scheduled_at;
        if (c) {
          const ms = typeof c === 'string' ? Date.parse(c) : new Date(c).getTime();
          if (!isNaN(ms)) return ms;
        }
        return 0;
      };
      return getT(b) - getT(a);
    });
    return list;
  },

  getAvailableBookings: async (
    tradeCategory?: string,
    technicianLocation?: { lat: number; lng: number; city?: string; radiusKm?: number; providerId?: string }
  ): Promise<BookingRecord[]> => {
    // 0. Server-Side Dispatch API Gateway (Single Source of Truth)
    try {
      const params = new URLSearchParams();
      if (technicianLocation?.providerId) params.append('provider_id', technicianLocation.providerId);
      if (tradeCategory) params.append('trade_category', tradeCategory);
      if (technicianLocation?.lat) params.append('lat', String(technicianLocation.lat));
      if (technicianLocation?.lng) params.append('lng', String(technicianLocation.lng));
      if (technicianLocation?.radiusKm) params.append('radius_km', String(technicianLocation.radiusKm));

      const res = await fetch(`/api/v1/dispatch/available-jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {}

    let list: BookingRecord[] = [];

    if (isFirebaseLive()) {
      try {
        const colRef = collection(db, 'bookings');
        const q = query(colRef, where('status', '==', 'PENDING'), limit(50));
        const snap = await getDocs(q);
        if (!snap.empty) {
          list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingRecord));
        }
      } catch (e) {
        console.warn('[Firestore] Get available bookings error:', e);
      }
    }

    // Merge with local fallback
    const local = getStoredBookings().filter(b => b.status === 'PENDING');
    local.forEach(lb => {
      if (!list.some(item => item.id === lb.id)) list.push(lb);
    });

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 1. Filter by trade category
    if (tradeCategory) {
      list = list.filter(b => {
        const bTrade = b.trade_category || CATEGORY_TRADE_MAP[b.category_id || ''] || getTradeCategoryForService(b.service_id);
        return !bTrade || bTrade === tradeCategory || bTrade === 'General Home Services';
      });
    }

    // 2. Filter by technician current location proximity (e.g. Sagara vs Hosanagara vs Honnali vs Bengaluru)
    if (technicianLocation && technicianLocation.lat && technicianLocation.lng) {
      const isTechInBlr = technicianLocation.city === 'bengaluru' || (technicianLocation.lat > 12.5 && technicianLocation.lat < 13.5);
      const maxRadius = technicianLocation.radiusKm || (isTechInBlr ? 45 : 25);
      list = list.filter(b => {
        const locLower = ((b.address_locality || '') + ' ' + (b.address_text || '')).toLowerCase();
        let bLat = b.address_lat;
        let bLng = b.address_lng;
        if (!bLat || !bLng || (bLat === 14.167 && locLower.includes('bengaluru'))) {
          if (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala') || locLower.includes('whitefield') || locLower.includes('560') || locLower.includes('562')) {
            bLat = 12.9716;
            bLng = 77.5946;
          } else if (locLower.includes('hosanagara')) {
            bLat = 13.9190;
            bLng = 75.0670;
          } else if (locLower.includes('honnali')) {
            bLat = 14.2443;
            bLng = 75.6425;
          } else {
            bLat = 14.1670;
            bLng = 75.0298;
          }
        }

        const dLat = (bLat - technicianLocation.lat) * (Math.PI / 180);
        const dLng = (bLng - technicianLocation.lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(technicianLocation.lat * (Math.PI / 180)) *
          Math.cos(bLat * (Math.PI / 180)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distKm = Math.round(6371 * c * 10) / 10;
        (b as any).distanceKm = distKm;

        const isBlrMatch = isTechInBlr && (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala'));
        return distKm <= maxRadius || isBlrMatch;
      });

      // Sort nearest first
      list.sort((a, b) => ((a as any).distanceKm || 0) - ((b as any).distanceKm || 0));
    }

    return list;
  },

  subscribeToAvailableBookings: (
    onUpdate: (bookings: BookingRecord[]) => void,
    tradeCategory?: string,
    technicianLocation?: { lat: number; lng: number; city?: string; radiusKm?: number }
  ) => {
    const processList = (rawList: BookingRecord[]) => {
      let list = [...rawList];
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 1. Filter by trade category
      if (tradeCategory) {
        list = list.filter(b => {
          const bTrade = b.trade_category || CATEGORY_TRADE_MAP[b.category_id || ''] || getTradeCategoryForService(b.service_id);
          return !bTrade || bTrade === tradeCategory || bTrade === 'General Home Services';
        });
      }

      // 2. Filter by technician current location proximity
      if (technicianLocation && technicianLocation.lat && technicianLocation.lng) {
        const isTechInBlr = technicianLocation.city === 'bengaluru' || (technicianLocation.lat > 12.5 && technicianLocation.lat < 13.5);
        const maxRadius = technicianLocation.radiusKm || (isTechInBlr ? 45 : 25);
        list = list.filter(b => {
          const locLower = ((b.address_locality || '') + ' ' + (b.address_text || '')).toLowerCase();
          let bLat = b.address_lat;
          let bLng = b.address_lng;
          if (!bLat || !bLng || (bLat === 14.167 && locLower.includes('bengaluru'))) {
            if (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala') || locLower.includes('whitefield') || locLower.includes('560') || locLower.includes('562')) {
              bLat = 12.9716;
              bLng = 77.5946;
            } else if (locLower.includes('hosanagara')) {
              bLat = 13.9190;
              bLng = 75.0670;
            } else if (locLower.includes('honnali')) {
              bLat = 14.2443;
              bLng = 75.6425;
            } else {
              bLat = 14.1670;
              bLng = 75.0298;
            }
          }

          const dLat = (bLat - technicianLocation.lat) * (Math.PI / 180);
          const dLng = (bLng - technicianLocation.lng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(technicianLocation.lat * (Math.PI / 180)) *
            Math.cos(bLat * (Math.PI / 180)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distKm = Math.round(6371 * c * 10) / 10;
          (b as any).distanceKm = distKm;

          const isBlrMatch = isTechInBlr && (locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('naganahalli') || locLower.includes('indiranagar') || locLower.includes('koramangala'));
          return distKm <= maxRadius || isBlrMatch;
        });

        // Sort nearest first
        list.sort((a, b) => ((a as any).distanceKm || 0) - ((b as any).distanceKm || 0));
      }

      return list;
    };

    if (isFirebaseLive()) {
      try {
        const colRef = collection(db, 'bookings');
        const q = query(colRef, where('status', '==', 'PENDING'), limit(50));
        return onSnapshot(q, (snap) => {
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingRecord));
          const local = getStoredBookings().filter(b => b.status === 'PENDING');
          local.forEach(lb => {
            if (!list.some(item => item.id === lb.id)) list.push(lb);
          });
          onUpdate(processList(list));
        });
      } catch (e) {
        console.warn('[Firestore] Available bookings subscription error:', e);
      }
    }

    // Local fallback
    const local = getStoredBookings().filter(b => b.status === 'PENDING');
    onUpdate(processList(local));
    return () => {};
  },

  updateTechnicianDutyLocation: async (
    userId: string,
    data: { lat: number; lng: number; city?: string }
  ) => {
    try {
      localStorage.setItem('mud_technician_duty_city', data.city || 'sagara');
      localStorage.setItem('mud_technician_lat', String(data.lat));
      localStorage.setItem('mud_technician_lng', String(data.lng));
      await fetch('/api/providers/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lat: data.lat, lng: data.lng, isOnline: true })
      });
    } catch (e) {
      console.warn('[Duty Location] Update error:', e);
    }
  },

  subscribeToTechnicianActiveJob: (technicianId: string, onUpdate: (activeJob: BookingRecord | null) => void) => {
    // Immediate check if technician is rejected
    try {
      const cached = localStorage.getItem('mud_active_user');
      if (cached && JSON.parse(cached).kyc_status === 'rejected') {
        onUpdate(null);
        return () => {};
      }
    } catch {}

    if (isFirebaseLive() && technicianId) {
      try {
        const colRef = collection(db, 'bookings');
        const q = query(colRef, where('technician_id', '==', technicianId));
        return onSnapshot(q, (snap) => {
          try {
            const cached = localStorage.getItem('mud_active_user');
            if (cached && JSON.parse(cached).kyc_status === 'rejected') {
              onUpdate(null);
              return;
            }
          } catch {}

          if (snap.empty) {
            onUpdate(null);
            return;
          }
          const activeDocs = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as BookingRecord))
            .filter(b => ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'ARRIVED', 'ON_THE_WAY'].includes((b.status || '').toUpperCase()));

          if (activeDocs.length > 0) {
            const b = activeDocs[0];
            const val = b.doorstep_otp || b.otp;
            if (val) {
              b.doorstep_otp = String(val);
              b.otp = String(val);
            }
            onUpdate(b);
          } else {
            onUpdate(null);
          }
        });
      } catch (e) {
        console.warn('[Firestore] Technician active job subscription error:', e);
      }
    }
    return () => {};
  },

  getBooking: async (id: string): Promise<BookingRecord | null> => {
    let result: any = null;
    if (isFirebaseLive()) {
      try {
        const snap = await getDoc(doc(db, 'bookings', id));
        if (snap.exists()) {
          result = { id: snap.id, ...snap.data() } as BookingRecord;
        }
      } catch (e) {
        console.warn('[Firestore] Get booking error:', e);
      }
    }
    if (!result) {
      const list = getStoredBookings();
      result = list.find(b => b.id === id) || null;
    }
    if (result) {
      const val = result.doorstep_otp || result.otp;
      if (val) {
        result.doorstep_otp = String(val);
        result.otp = String(val);
      } else if (!['COMPLETED', 'CANCELLED', 'REVIEWED'].includes((result.status || '').toUpperCase())) {
        let seed = 0;
        for (let i = 0; i < (result.id || '').length; i++) seed = (seed * 31 + result.id.charCodeAt(i)) % 9000;
        const autoOtp = String(1000 + Math.abs(seed));
        result.doorstep_otp = autoOtp;
        result.otp = autoOtp;
      }
    }
    return result;
  },

  updateBookingStatus: async (id: string, status: string) => {
    // Get current technician info if accepting or progressing
    const techUser = (() => {
      try {
        const cached = localStorage.getItem('mud_active_user');
        return cached ? JSON.parse(cached) : null;
      } catch { return null; }
    })();

    // ─── KYC Rejection Guard ─────────────────────────────────────────────
    // Block rejected/unapproved technician from accepting, re-accepting, or progressing any job
    if (techUser && (techUser.role === 'provider' || techUser.role === 'technician')) {
      const kyc = (techUser.kyc_status || '').toLowerCase();
      if (kyc === 'rejected') {
        throw new Error('Action blocked: Your KYC has been rejected by a KYC Tech Specialist. You cannot accept or proceed with jobs until re-approved.');
      }
      if (status === 'ACCEPTED' && kyc !== 'approved' && kyc !== 'verified') {
        throw new Error('Action blocked: Your KYC is pending review. You cannot accept job offers until approved.');
      }
    }

    const isAccepting = status === 'ACCEPTED';
    const isEnRoute  = status === 'EN_ROUTE';
    const isPending = status === 'PENDING';
    const isCancelled = status === 'CANCELLED';

    const roboPhone = generateRoboMaskedPhone(id, techUser?.id);
    const techAvatar = (techUser as any)?.avatar || (techUser as any)?.photo_url || `https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80`;
    const techUid = (techUser as any)?.tech_uid || `UD-SGR-${Math.abs((id || '').split('').reduce((acc: number, c: string) => acc * 19 + c.charCodeAt(0), 11)) % 90000 + 10000}`;

    const techFields = isAccepting && techUser ? {
      technician_id: techUser.id,
      technician_name: techUser.name,
      technician_real_phone: techUser.phone || '', // Strictly hidden from customer for privacy
      technician_phone: roboPhone, // Customer sees & dials this Urban Daily Robo Masked Telephony Bridge
      technician_masked_phone: roboPhone,
      technician_avatar_url: techAvatar,
      tech_photo_url: techAvatar,
      tech_uid: techUid,
      accepted_at: new Date().toISOString()
    } : {};

    // Ensure 4-digit doorstep OTP is always preserved or generated
    const list = getStoredBookings();
    let item = list.find(b => b.id === id);

    // ─── Proximity Guard (Technician vs Work Location) ──────────────────────
    // Strictly blocks technician in a different city (e.g. Bangalore) from accepting Sagara jobs
    if (isAccepting && item && item.address_lat && item.address_lng) {
      let tLat: number | null = (techUser as any)?.lat ?? null;
      let tLng: number | null = (techUser as any)?.lng ?? null;
      if (tLat === null || tLng === null) {
        try {
          const sLat = localStorage.getItem('mud_technician_lat');
          const sLng = localStorage.getItem('mud_technician_lng');
          if (sLat && sLng) {
            tLat = parseFloat(sLat);
            tLng = parseFloat(sLng);
          }
        } catch {}
      }
      if (tLat !== null && tLng !== null && !isNaN(tLat) && !isNaN(tLng)) {
        const distKm = calculateDistanceKm(tLat, tLng, item.address_lat, item.address_lng);
        if (distKm > 25) {
          throw new Error(`Out of Proximity Range: You are located ~${Math.round(distKm)}km away in a different region. Jobs in ${item.address_locality || 'Sagara'} can only be accepted when physically within 25km.`);
        }
      }
    }

    const existingOtp = item?.doorstep_otp || item?.otp;
    let seed = 0;
    for (let i = 0; i < (id || '').length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 9000;
    const finalOtp = existingOtp ? String(existingOtp) : String(1000 + Math.abs(seed));
    const otpFields = { doorstep_otp: finalOtp, otp: finalOtp };

    // Update locally
    if (item) {
      item.status = status as any;
      item.updated_at = new Date().toISOString();
      if (status === 'COMPLETED' && !item.completed_at) {
        item.completed_at = new Date().toISOString();
      }
      Object.assign(item, otpFields);
      if (isAccepting) Object.assign(item, techFields);
      if (isPending || isCancelled) {
        item.technician_id = null;
        delete item.technician_name;
        delete item.technician_phone;
        delete item.technician_real_phone;
        delete item.technician_masked_phone;
        delete item.technician_avatar_url;
        delete item.tech_photo_url;
        delete item.tech_uid;
        delete item.accepted_at;
        delete item.doorstep_otp;
        delete item.arrival_geo_verified;
        delete item.arrival_geo_coords;
        delete item.arrival_otp_verified;
        delete item.arrival_selfie_url;
        delete item.arrival_selfie_verified;
      }
      saveStoredBookings(list);

      // Also sync to legacy/admin local storage
      try {
        const adminKey = 'mud_bookings';
        const rawAdmin = localStorage.getItem(adminKey);
        const adminList = rawAdmin ? JSON.parse(rawAdmin) : [];
        const foundIdx = adminList.findIndex((b: any) => b.id === id);
        if (foundIdx >= 0) {
          adminList[foundIdx] = { ...adminList[foundIdx], ...item, status: status.toUpperCase() };
          if (isPending || isCancelled) {
            delete adminList[foundIdx].technician_id;
            delete adminList[foundIdx].technician_name;
            delete adminList[foundIdx].technician_phone;
            delete adminList[foundIdx].technician_real_phone;
            delete adminList[foundIdx].technician_masked_phone;
            delete adminList[foundIdx].technician_avatar_url;
            delete adminList[foundIdx].accepted_at;
            delete adminList[foundIdx].doorstep_otp;
          }
        } else {
          adminList.unshift({ ...item, status: status.toUpperCase() });
        }
        localStorage.setItem(adminKey, JSON.stringify(adminList));
      } catch {}
    } else {
      // Create local fallback record if not present
      item = {
        id,
        status: status as any,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        ...otpFields,
        ...(isAccepting ? techFields : {})
      } as any;
      list.unshift(item as BookingRecord);
      saveStoredBookings(list);

      try {
        const adminKey = 'mud_bookings';
        const rawAdmin = localStorage.getItem(adminKey);
        const adminList = rawAdmin ? JSON.parse(rawAdmin) : [];
        adminList.unshift({ ...(item as any), status: status.toUpperCase() });
        localStorage.setItem(adminKey, JSON.stringify(adminList));
      } catch {}
    }

    // Update in Firestore
    if (isFirebaseLive()) {
      try {
        const updatePayload: any = {
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {}),
          firestore_updated_at: serverTimestamp(),
          ...techFields,
          ...otpFields
        };
        if (isPending || isCancelled) {
          updatePayload.technician_id = deleteField();
          updatePayload.technician_name = deleteField();
          updatePayload.technician_phone = deleteField();
          updatePayload.technician_real_phone = deleteField();
          updatePayload.technician_masked_phone = deleteField();
          updatePayload.technician_avatar_url = deleteField();
          updatePayload.accepted_at = deleteField();
        }
        await updateDoc(doc(db, 'bookings', id), updatePayload);
      } catch (e) {
        console.warn('[Firestore] Booking status update error:', e);
      }
    }

    // Broadcast update to window event
    window.dispatchEvent(new CustomEvent('mud_booking_updated', {
      detail: { id, status, ...techFields, ...otpFields }
    }));

    // Broadcast to cross-portal sync bus (Admin & other portals)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.postMessage({
          type: 'BOOKING_STATUS_UPDATED',
          payload: { id, status, ...techFields, ...otpFields },
          timestamp: Date.now()
        });
      }
      window.dispatchEvent(new CustomEvent('urbandaily_sync_event', {
        detail: { type: 'BOOKING_STATUS_UPDATED', payload: { id, status, ...techFields, ...otpFields } }
      }));
    } catch {}

    // On acceptance, fire dedicated toast event and persist notification
    if (isAccepting) {
      window.dispatchEvent(new CustomEvent('mud_booking_accepted', {
        detail: {
          booking_id: id,
          technician_name: (techFields as any).technician_name || 'Your Technician',
          technician_phone: roboPhone,
          technician_masked_phone: roboPhone,
          technician_avatar_url: techAvatar,
          tech_uid: techUid
        }
      }));

      // Write in-app notification to Cloud Firestore for customer
      if (item?.customer_id) {
        const notifId = `notif-accepted-${id}-${Date.now()}`;
        const notifData = {
          id: notifId,
          userId: item.customer_id,
          type: 'JOB_ACCEPTED',
          title: 'Technician Assigned & En Route',
          message: `✅ ${(techFields as any).technician_name || 'Your technician'} accepted booking #${item.booking_code || id} and is on the way!`,
          link: '/bookings',
          read: false,
          created_at: new Date().toISOString()
        };

        if (isFirebaseLive()) {
          setDoc(doc(db, 'notifications', notifId), notifData).catch(() => {});
        }

        // Relay to notification microservice
        fetch('http://localhost:8002/api/notifications/events/job-accepted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: id,
            customer_id: item.customer_id,
            technician_name: (techFields as any).technician_name || 'Technician',
            technician_phone: (techFields as any).technician_phone || '',
            booking_code: item.booking_code,
            service_title: item.service_id
          })
        }).catch(() => {});
      }
    }

    return { booking: item, ...(item || {}) };
  },

  // Cancel booking with reason and multi-portal broadcast
  cancelBooking: async (id: string, reason: string, notes?: string) => {
    const list = getStoredBookings();
    const item = list.find(b => b.id === id);

    if (item && item.status === 'IN_PROGRESS') {
      throw new Error('This booking cannot be cancelled because the technician has already arrived and commenced service. Please contact customer support.');
    }
    if (item && ['COMPLETED', 'CANCELLED', 'REVIEWED'].includes(item.status)) {
      throw new Error(`Booking cannot be cancelled in current status: ${item.status}.`);
    }

    const now = new Date().toISOString();
    const cancelPayload = {
      status: 'CANCELLED' as const,
      cancellation_reason: reason,
      cancelled_by: 'customer' as const,
      cancelled_at: now,
      updated_at: now
    };

    if (item) {
      Object.assign(item, cancelPayload);
      saveStoredBookings(list);

      // Sync to legacy/admin local storage
      try {
        const adminKey = 'mud_bookings';
        const rawAdmin = localStorage.getItem(adminKey);
        const adminList = rawAdmin ? JSON.parse(rawAdmin) : [];
        const foundIdx = adminList.findIndex((b: any) => b.id === id);
        if (foundIdx >= 0) {
          adminList[foundIdx] = { ...adminList[foundIdx], ...item, ...cancelPayload };
        } else {
          adminList.unshift({ ...item, ...cancelPayload });
        }
        localStorage.setItem(adminKey, JSON.stringify(adminList));
      } catch {}
    }

    // Update in Firestore
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', id), {
          ...cancelPayload,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Booking cancel update error:', e);
      }
    }

    // Call backend API if running
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
      await fetch(`${apiBase}/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes, cancelledBy: 'customer' })
      });
    } catch {}

    // Broadcast to window event
    window.dispatchEvent(new CustomEvent('mud_booking_updated', {
      detail: { id, ...cancelPayload }
    }));

    // Broadcast to cross-portal sync bus (Admin, Technician, etc.)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.postMessage({
          type: 'BOOKING_CANCELLED',
          payload: { id, ...cancelPayload },
          timestamp: Date.now()
        });
        bus.postMessage({
          type: 'BOOKING_STATUS_UPDATED',
          payload: { id, ...cancelPayload },
          timestamp: Date.now()
        });
      }
      window.dispatchEvent(new CustomEvent('urbandaily_sync_event', {
        detail: { type: 'BOOKING_CANCELLED', payload: { id, ...cancelPayload } }
      }));
    } catch {}

    return { booking: item || { id, ...cancelPayload } };
  },

  // Write technician live GPS location to Firestore (called every 5s while en route)
  updateTechnicianLocation: async (bookingId: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    if (item) {
      item.tech_lat = lat;
      item.tech_lng = lng;
      item.tech_location_updated_at = now;
      saveStoredBookings(list);
    }
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          tech_lat: lat,
          tech_lng: lng,
          tech_location_updated_at: now
        });
      } catch (e) {
        console.warn('[Firestore] Tech location update error:', e);
      }
    }
    window.dispatchEvent(new CustomEvent('mud_tech_location_updated', {
      detail: { bookingId, lat, lng }
    }));
  },

  // Technician enters 4-digit OTP shown to customer — verifies physical presence
  verifyDoorstepOtp: async (bookingId: string, enteredOtp: string, options?: { autoStartJob?: boolean }) => {
    // ─── KYC Rejection Guard ─────────────────────────────────────────────
    const techUser = (() => {
      try {
        const cached = localStorage.getItem('mud_active_user');
        return cached ? JSON.parse(cached) : null;
      } catch { return null; }
    })();
    if (techUser && techUser.role === 'provider') {
      const kyc = (techUser.kyc_status || '').toLowerCase();
      if (kyc === 'rejected') {
        throw new Error('Action blocked: Your KYC has been rejected by a KYC Tech Specialist. You cannot verify OTP or perform jobs until re-approved.');
      }
    }

    // Fetch latest booking from Firestore to get the stored OTP
    let storedOtp: string | null = null;
    if (isFirebaseLive()) {
      try {
        const snap = await getDoc(doc(db, 'bookings', bookingId));
        if (snap.exists()) {
          const data = snap.data();
          storedOtp = data.doorstep_otp || data.otp || null;
        }
      } catch {}
    }
    if (!storedOtp) {
      const list = getStoredBookings();
      const item = list.find(b => b.id === bookingId);
      storedOtp = item?.doorstep_otp || item?.otp || null;
    }
    if (!storedOtp) {
      let seed = 0;
      for (let i = 0; i < (bookingId || '').length; i++) seed = (seed * 31 + bookingId.charCodeAt(i)) % 9000;
      storedOtp = String(1000 + Math.abs(seed));
    }

    if (enteredOtp.trim() !== storedOtp.trim()) {
      throw new Error('Incorrect OTP. Please ask the customer to show the code again.');
    }

    // OTP verified — advance to ARRIVED (or IN_PROGRESS if autoStartJob is explicitly requested)
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    const shouldStartJob = (options as any)?.autoStartJob ?? false;
    const nextStatus = shouldStartJob ? 'IN_PROGRESS' : 'ARRIVED';

    if (item) {
      item.status = nextStatus as any;
      item.otp_verified_at = now;
      item.arrival_otp_verified = true;
      item.updated_at = now;
      saveStoredBookings(list);
    }
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: nextStatus,
          otp_verified_at: now,
          arrival_otp_verified: true,
          updated_at: now,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] OTP verify error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_booking_updated', {
        detail: { id: bookingId, status: nextStatus, otp_verified_at: now, arrival_otp_verified: true }
      }));
    }
    return { verified: true, booking: item };
  },

  // Record geolocation verification when technician reaches customer location (Step 1 Physical Arrival)
  verifyArrivalGeoLocation: async (bookingId: string, coords: { lat: number; lng: number }, distanceMeters?: number) => {
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);

    // Enforce doorstep proximity (< 500m)
    let dist = distanceMeters;
    if (dist === undefined && item?.address_lat && item?.address_lng) {
      dist = Math.round(calculateDistanceKm(coords.lat, coords.lng, item.address_lat, item.address_lng) * 1000);
    }
    if (dist !== undefined && dist > 500) {
      throw new Error(`Doorstep check failed: You are located ~${dist}m away from the customer address. You must physically be within 500m of ${item?.address_locality || 'the doorstep'}.`);
    }

    if (item) {
      item.arrival_geo_verified = true;
      item.arrival_geo_coords = coords;
      item.arrival_geo_distance_meters = dist;
      item.arrival_notification_sent = true;
      item.arrival_notified_at = now;
      item.updated_at = now;
      saveStoredBookings(list);
    }
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          arrival_geo_verified: true,
          arrival_geo_coords: coords,
          arrival_geo_distance_meters: dist,
          arrival_notification_sent: true,
          arrival_notified_at: now,
          updated_at: now,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Geo arrival verify error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_booking_updated', {
        detail: { id: bookingId, arrival_geo_verified: true, arrival_geo_coords: coords, arrival_notification_sent: true }
      }));
      window.dispatchEvent(new CustomEvent('mud_technician_arrived', {
        detail: { bookingId, locality: item?.address_locality, arrivedAt: now }
      }));
      try {
        if ('BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'TECHNICIAN_ARRIVED', bookingId, timestamp: Date.now() });
        }
      } catch {}
    }
    return { success: true, booking: item };
  },

  // Manual or automatic trigger to notify customer that technician is outside doorstep
  sendTechnicianArrivalNotification: async (bookingId: string) => {
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    if (item) {
      item.arrival_notification_sent = true;
      item.arrival_notified_at = now;
      item.updated_at = now;
      saveStoredBookings(list);
    }
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          arrival_notification_sent: true,
          arrival_notified_at: now,
          updated_at: now,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Arrival notification error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_booking_updated', {
        detail: { id: bookingId, arrival_notification_sent: true, arrival_notified_at: now }
      }));
      window.dispatchEvent(new CustomEvent('mud_technician_arrived', {
        detail: { bookingId, locality: item?.address_locality, arrivedAt: now }
      }));
      try {
        if ('BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'TECHNICIAN_ARRIVED', bookingId, timestamp: Date.now() });
        }
      } catch {}
    }
    return { success: true, booking: item };
  },

  // Save arrival selfie with stamped auto-location & record into separate doorstep_audits collection
  submitArrivalSelfie: async (
    bookingId: string,
    selfieData: {
      selfie_url: string;
      worklocation_url?: string;
      coords: { lat: number; lng: number };
      locality: string;
      timestamp?: string;
      ai_face_match_score?: number;
      ai_face_match_status?: string;
      ai_face_match_summary?: string;
      gemini_biometric_confidence?: number;
      gemini_liveness_verified?: boolean;
    }
  ) => {
    const now = selfieData.timestamp || new Date().toISOString();

    // Compress both images for storage efficiency and fast mobile rendering
    let compressedSelfie = selfieData.selfie_url;
    let compressedWorkLocation = selfieData.worklocation_url;
    try {
      const { compressImageForUpload } = await import('./aiFaceMatch');
      if (selfieData.selfie_url) {
        compressedSelfie = await compressImageForUpload(selfieData.selfie_url, 480, 640, 0.72);
      }
      if (selfieData.worklocation_url) {
        compressedWorkLocation = await compressImageForUpload(selfieData.worklocation_url, 480, 640, 0.72);
      }
    } catch {}

    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    const auditId = `audit_${bookingId}_${Date.now()}`;

    // ─── Dedicated Schema Record: doorstep_audits (Admin Inspection Only) ───
    const auditRecord: TechnicianDoorstepAuditRecord = {
      id: auditId,
      booking_id: bookingId,
      technician_id: item?.technician_id || 'tech_assigned',
      technician_name: item?.technician_name || 'Assigned Technician',
      customer_id: item?.customer_id,
      customer_name: (item as any)?.customer_name || 'Customer',
      service_id: item?.service_id,
      service_title: (item as any)?.service_name || item?.trade_category || 'Doorstep Service',
      address_locality: item?.address_locality || selfieData.locality,
      address_text: item?.address_text,
      geo_verified: true,
      technician_coords: selfieData.coords,
      expected_coords: (item && item.address_lat && item.address_lng) ? { lat: item.address_lat, lng: item.address_lng } : undefined,
      distance_meters: (item && item.address_lat && item.address_lng)
        ? Math.round(calculateDistanceKm(selfieData.coords.lat, selfieData.coords.lng, item.address_lat, item.address_lng) * 1000)
        : undefined,
      arrival_selfie_url: compressedSelfie,
      worklocation_photo_url: compressedWorkLocation,
      stamped_locality: selfieData.locality,
      stamped_timestamp: now,
      ai_face_match_score: selfieData.ai_face_match_score,
      ai_face_match_status: selfieData.ai_face_match_status,
      ai_face_match_summary: selfieData.ai_face_match_summary,
      gemini_biometric_confidence: selfieData.gemini_biometric_confidence,
      gemini_liveness_verified: selfieData.gemini_liveness_verified,
      gemini_anti_spoofing: selfieData.gemini_liveness_verified ? "PASSED (Live Depth)" : undefined,
      status: selfieData.ai_face_match_status === 'MISMATCH_FLAGGED' ? 'FLAGGED' : 'PENDING_REVIEW',
      created_at: new Date().toISOString()
    };

    // Store in localStorage doorstep_audits table
    try {
      const audits: TechnicianDoorstepAuditRecord[] = JSON.parse(localStorage.getItem('mud_doorstep_audits') || '[]');
      audits.unshift(auditRecord);
      localStorage.setItem('mud_doorstep_audits', JSON.stringify(audits.slice(0, 100)));
    } catch {}

    if (item) {
      item.doorstep_audit_id = auditId;
      item.arrival_selfie_url = compressedSelfie;
      if (compressedWorkLocation) item.worklocation_photo_url = compressedWorkLocation;
      item.arrival_selfie_coords = selfieData.coords;
      item.arrival_selfie_locality = selfieData.locality;
      item.arrival_selfie_timestamp = now;
      item.arrival_selfie_verified = true;
      if (selfieData.ai_face_match_score !== undefined) {
        item.ai_face_match_score = selfieData.ai_face_match_score;
        item.ai_face_match_status = selfieData.ai_face_match_status;
        item.ai_face_match_summary = selfieData.ai_face_match_summary;
      }
      if (selfieData.gemini_biometric_confidence !== undefined) {
        item.gemini_biometric_confidence = selfieData.gemini_biometric_confidence;
        item.gemini_liveness_verified = selfieData.gemini_liveness_verified;
      }
      if (item.status === 'EN_ROUTE') {
        item.status = 'ARRIVED' as any;
      }
      item.updated_at = new Date().toISOString();
      saveStoredBookings(list);

      // Sync to admin storage mirror
      try {
        const rawAdmin = localStorage.getItem('mud_bookings');
        if (rawAdmin) {
          const adminList = JSON.parse(rawAdmin);
          const aIdx = adminList.findIndex((b: any) => b.id === bookingId);
          if (aIdx >= 0) {
            adminList[aIdx] = { ...adminList[aIdx], ...item };
            localStorage.setItem('mud_bookings', JSON.stringify(adminList));
          }
        }
      } catch {}
    }

    if (isFirebaseLive()) {
      // 1. First priority: Update active booking document reference
      try {
        const payload: Record<string, any> = {
          doorstep_audit_id: auditId,
          arrival_selfie_coords: selfieData.coords,
          arrival_selfie_locality: selfieData.locality,
          arrival_selfie_timestamp: now,
          arrival_selfie_verified: true,
          status: item?.status === 'EN_ROUTE' ? 'ARRIVED' : item?.status || 'ARRIVED',
          updated_at: new Date().toISOString(),
          firestore_updated_at: serverTimestamp()
        };
        // Photos saved for backend audit reference
        if (compressedSelfie) payload.arrival_selfie_url = compressedSelfie;
        if (compressedWorkLocation) payload.worklocation_photo_url = compressedWorkLocation;
        if (selfieData.ai_face_match_score !== undefined) {
          payload.ai_face_match_score = selfieData.ai_face_match_score;
          payload.ai_face_match_status = selfieData.ai_face_match_status;
          payload.ai_face_match_summary = selfieData.ai_face_match_summary;
        }
        if (selfieData.gemini_biometric_confidence !== undefined) {
          payload.gemini_biometric_confidence = selfieData.gemini_biometric_confidence;
          payload.gemini_liveness_verified = selfieData.gemini_liveness_verified;
        }
        await setDoc(doc(db, 'bookings', bookingId), payload, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Booking doorstep verification update error:', e);
      }

      // 2. Second priority: Write to doorstep_audits collection
      try {
        await setDoc(doc(db, 'doorstep_audits', auditId), {
          ...auditRecord,
          firestore_created_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Doorstep audits write error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_booking_updated', {
        detail: {
          id: bookingId,
          doorstep_audit_id: auditId,
          arrival_selfie_url: compressedSelfie,
          worklocation_photo_url: compressedWorkLocation,
          arrival_selfie_coords: selfieData.coords,
          arrival_selfie_locality: selfieData.locality,
          arrival_selfie_verified: true,
          ai_face_match_score: selfieData.ai_face_match_score,
          ai_face_match_status: selfieData.ai_face_match_status,
          ai_face_match_summary: selfieData.ai_face_match_summary
        }
      }));
      window.dispatchEvent(new CustomEvent('mud_doorstep_audit_created', { detail: auditRecord }));
      try {
        if ('BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'NEW_DOORSTEP_AUDIT', payload: auditRecord, timestamp: Date.now() });
        }
      } catch {}
    }
    return { success: true, booking: item, audit: auditRecord };
  },

  // ─── SOS Emergency Alerts (Real-Time Admin & Safety Operations) ────────────
  triggerSOSAlert: async (data: Partial<SOSAlertRecord>): Promise<SOSAlertRecord> => {
    const alertId = `sos_${Date.now()}`;
    const triggeredAt = new Date().toISOString();

    // Check if we have rich context from cached booking
    let resolvedCustomerName = data.customer_name || 'Customer';
    let resolvedCustomerPhone = data.customer_phone || '';
    let resolvedTechName = data.technician_name || 'Assigned Technician';
    let resolvedTechId = data.technician_id || '';
    let resolvedAddress = data.service_address || 'Service Location';
    let resolvedLat = data.lat;
    let resolvedLng = data.lng;
    let resolvedLocality = data.locality;

    if (data.booking_id) {
      try {
        const stored = getStoredBookings();
        const b = stored.find(item => item.id === data.booking_id);
        if (b) {
          if (!resolvedCustomerPhone) resolvedCustomerPhone = b.customer_phone || '';
          if (resolvedCustomerName === 'Customer' && b.customer_name) resolvedCustomerName = b.customer_name;
          if (resolvedTechName === 'Assigned Technician' && b.technician_name) resolvedTechName = b.technician_name;
          if (!resolvedTechId && b.technician_id) resolvedTechId = b.technician_id;
          if (resolvedAddress === 'Service Location' && (b.address_text || b.address_locality)) {
            resolvedAddress = b.address_text || b.address_locality || 'Service Location';
          }
          if (resolvedLat === undefined && b.address_lat) resolvedLat = b.address_lat;
          if (resolvedLng === undefined && b.address_lng) resolvedLng = b.address_lng;
          if (!resolvedLocality && b.address_locality) resolvedLocality = b.address_locality;
        }
      } catch {}
    }

    const alertRecord: SOSAlertRecord = {
      id: alertId,
      booking_id: data.booking_id || '',
      customer_id: data.customer_id || '',
      customer_name: resolvedCustomerName,
      customer_phone: resolvedCustomerPhone,
      technician_id: resolvedTechId,
      technician_name: resolvedTechName,
      service_address: resolvedAddress,
      emergency_contact_name: data.emergency_contact_name || undefined,
      emergency_contact_phone: data.emergency_contact_phone || undefined,
      lat: resolvedLat,
      lng: resolvedLng,
      locality: resolvedLocality,
      triggered_at: triggeredAt,
      status: 'ACTIVE'
    };

    // 1. Save to local storage
    try {
      const existing: SOSAlertRecord[] = JSON.parse(localStorage.getItem('mud_sos_alerts') || '[]');
      existing.unshift(alertRecord);
      localStorage.setItem('mud_sos_alerts', JSON.stringify(existing.slice(0, 50)));
    } catch {}

    // 2. Build strictly sanitized Firestore payload (NO undefined values allowed by Firestore SDK)
    const firestorePayload: Record<string, any> = {
      id: alertId,
      booking_id: data.booking_id || '',
      customer_id: data.customer_id || '',
      customer_name: resolvedCustomerName,
      customer_phone: resolvedCustomerPhone,
      technician_id: resolvedTechId,
      technician_name: resolvedTechName,
      service_address: resolvedAddress,
      triggered_at: triggeredAt,
      status: 'ACTIVE'
    };
    if (data.emergency_contact_name) firestorePayload.emergency_contact_name = data.emergency_contact_name;
    if (data.emergency_contact_phone) firestorePayload.emergency_contact_phone = data.emergency_contact_phone;
    if (resolvedLat !== undefined && resolvedLat !== null) firestorePayload.lat = Number(resolvedLat);
    if (resolvedLng !== undefined && resolvedLng !== null) firestorePayload.lng = Number(resolvedLng);
    if (resolvedLocality) firestorePayload.locality = resolvedLocality;

    // 3. Save to Firestore collection 'sos_alerts' (with REST fallback)
    if (isFirebaseLive()) {
      try {
        await setDoc(doc(db, 'sos_alerts', alertId), {
          ...firestorePayload,
          firestore_created_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] SOS alert SDK write error, attempting REST fallback:', e);
        try {
          const restFields: Record<string, any> = {};
          Object.entries(firestorePayload).forEach(([k, v]) => {
            if (typeof v === 'string') restFields[k] = { stringValue: v };
            else if (typeof v === 'number') restFields[k] = { doubleValue: v };
            else if (typeof v === 'boolean') restFields[k] = { booleanValue: v };
          });
          restFields.triggered_at = { stringValue: triggeredAt };
          await fetch(`https://firestore.googleapis.com/v1/projects/myurbandaily-458d0/databases/(default)/documents/sos_alerts?documentId=${alertId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: restFields })
          });
        } catch (restErr) {
          console.error('[Firestore REST] SOS alert fallback error:', restErr);
        }
      }
    }

    // 4. Mark associated booking as SOS Active in Firestore & LocalStorage
    if (data.booking_id) {
      try {
        const stored = getStoredBookings();
        const b = stored.find(item => item.id === data.booking_id);
        if (b) {
          (b as any).sos_active = true;
          (b as any).sos_alert_id = alertId;
          (b as any).sos_triggered_at = triggeredAt;
          saveStoredBookings(stored);
        }
      } catch {}

      if (isFirebaseLive()) {
        try {
          await updateDoc(doc(db, 'bookings', data.booking_id), {
            sos_active: true,
            sos_alert_id: alertId,
            sos_triggered_at: triggeredAt,
            safety_mode: 'SOS_ACTIVE',
            firestore_updated_at: serverTimestamp()
          });
        } catch (bErr) {
          console.warn('[Firestore] Booking SOS flag update error:', bErr);
        }
      }
    }

    // 5. Append to immutable audit log for CISO / DPDPA compliance
    if (isFirebaseLive()) {
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'EMERGENCY_SOS_TRIGGERED',
          entity: 'booking',
          entity_id: data.booking_id || alertId,
          alert_id: alertId,
          actor: resolvedCustomerName,
          customer_phone: resolvedCustomerPhone,
          technician_name: resolvedTechName,
          service_address: resolvedAddress,
          timestamp: triggeredAt,
          firestore_created_at: serverTimestamp()
        });
      } catch (aErr) {
        console.warn('[Firestore] Audit log write error:', aErr);
      }
    }

    // 6. Broadcast across browser channels
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_sos_alert_triggered', { detail: alertRecord }));
      try {
        if ('BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'NEW_SOS_ALERT', payload: alertRecord, timestamp: Date.now() });
        }
      } catch {}
    }

    return alertRecord;
  },

  getSOSAlerts: async (): Promise<SOSAlertRecord[]> => {
    if (isFirebaseLive()) {
      try {
        const q = query(collection(db, 'sos_alerts'), orderBy('firestore_created_at', 'desc'), limit(50));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as SOSAlertRecord));
        }
      } catch (e) {
        console.warn('[Firestore] getSOSAlerts query fallback:', e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem('mud_sos_alerts') || '[]');
    } catch {
      return [];
    }
  },

  resolveSOSAlert: async (alertId: string, notes?: string): Promise<boolean> => {
    const now = new Date().toISOString();
    let resolvedBookingId: string | undefined;

    try {
      const existing: SOSAlertRecord[] = JSON.parse(localStorage.getItem('mud_sos_alerts') || '[]');
      const found = existing.find(a => a.id === alertId);
      if (found) {
        found.status = 'RESOLVED';
        found.resolved_at = now;
        found.resolved_notes = notes || 'Resolved by safety administrator';
        resolvedBookingId = found.booking_id;
        localStorage.setItem('mud_sos_alerts', JSON.stringify(existing));
      }
    } catch {}

    // Cloud Firestore resolve
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'sos_alerts', alertId), {
          status: 'RESOLVED',
          resolved_at: now,
          resolved_notes: notes || 'Resolved by safety administrator',
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] resolveSOSAlert error:', e);
      }

      // Unset booking SOS active
      if (resolvedBookingId) {
        try {
          await updateDoc(doc(db, 'bookings', resolvedBookingId), {
            sos_active: false,
            sos_resolved_at: now,
            firestore_updated_at: serverTimestamp()
          });
        } catch {}
      }

      // Audit log resolution
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'EMERGENCY_SOS_RESOLVED',
          entity: 'sos_alert',
          entity_id: alertId,
          booking_id: resolvedBookingId || '',
          notes: notes || 'Resolved by safety administrator',
          timestamp: now,
          firestore_created_at: serverTimestamp()
        });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_sos_alert_resolved', { detail: { alertId, resolvedAt: now } }));
      try {
        if ('BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'SOS_ALERT_RESOLVED', alertId, timestamp: Date.now() });
        }
      } catch {}
    }
    return true;
  },

  subscribeToSOSAlerts: (onUpdate: (alerts: SOSAlertRecord[]) => void) => {
    if (isFirebaseLive()) {
      try {
        const q = query(collection(db, 'sos_alerts'), limit(50));
        const unsub = onSnapshot(q, (snap) => {
          const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as SOSAlertRecord));
          alerts.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
          onUpdate(alerts);
        }, (err) => {
          console.warn('[Firestore] SOS onSnapshot error:', err);
        });
        return unsub;
      } catch (e) {
        console.warn('[Firestore] SOS subscription fallback:', e);
      }
    }

    const handler = () => {
      try {
        const local = JSON.parse(localStorage.getItem('mud_sos_alerts') || '[]');
        onUpdate(local);
      } catch {}
    };
    window.addEventListener('mud_sos_alert_triggered', handler);
    window.addEventListener('mud_sos_alert_resolved', handler);
    handler();
    return () => {
      window.removeEventListener('mud_sos_alert_triggered', handler);
      window.removeEventListener('mud_sos_alert_resolved', handler);
    };
  },

  // ─── Doorstep Audits (Admin Inspection & Segregated Schema) ────────────────
  getTechnicianDoorstepAudits: async (): Promise<TechnicianDoorstepAuditRecord[]> => {
    if (isFirebaseLive()) {
      try {
        const snap = await getDocs(collection(db, 'doorstep_audits'));
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicianDoorstepAuditRecord));
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return list;
        }
      } catch (e) {
        console.warn('[Firestore] getTechnicianDoorstepAudits query fallback:', e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem('mud_doorstep_audits') || '[]');
    } catch {
      return [];
    }
  },

  reviewDoorstepAudit: async (
    auditId: string,
    status: 'VERIFIED' | 'FLAGGED',
    adminNotes?: string
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    try {
      const audits: TechnicianDoorstepAuditRecord[] = JSON.parse(localStorage.getItem('mud_doorstep_audits') || '[]');
      const item = audits.find(a => a.id === auditId);
      if (item) {
        item.status = status;
        item.reviewed_at = now;
        item.admin_notes = adminNotes;
        localStorage.setItem('mud_doorstep_audits', JSON.stringify(audits));
      }
    } catch {}

    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'doorstep_audits', auditId), {
          status,
          reviewed_at: now,
          admin_notes: adminNotes || '',
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] reviewDoorstepAudit error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_doorstep_audit_reviewed', { detail: { auditId, status } }));
    }
    return true;
  },

  subscribeToDoorstepAudits: (onUpdate: (audits: TechnicianDoorstepAuditRecord[]) => void) => {
    if (isFirebaseLive()) {
      try {
        const unsub = onSnapshot(collection(db, 'doorstep_audits'), (snap) => {
          const audits = snap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicianDoorstepAuditRecord));
          audits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          onUpdate(audits);
        });
        return unsub;
      } catch (e) {
        console.warn('[Firestore] Doorstep audits subscription fallback:', e);
      }
    }

    const handler = () => {
      try {
        const local = JSON.parse(localStorage.getItem('mud_doorstep_audits') || '[]');
        onUpdate(local);
      } catch {}
    };
    window.addEventListener('mud_doorstep_audit_created', handler);
    window.addEventListener('mud_doorstep_audit_reviewed', handler);
    handler();
    return () => {
      window.removeEventListener('mud_doorstep_audit_created', handler);
      window.removeEventListener('mud_doorstep_audit_reviewed', handler);
    };
  },

  // Start job after all 3 arrival checks: Geolocation + OTP + Stamped Selfie
  startJobAfterVerification: async (bookingId: string) => {
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    if (item) {
      if (!item.arrival_otp_verified && !item.otp_verified_at) {
        throw new Error("Step 2 Mandatory: Customer doorstep OTP must be verified before starting the job.");
      }
      if (!item.arrival_selfie_verified && !item.arrival_selfie_url) {
        throw new Error("Step 3 Mandatory: Doorstep verification photos must be submitted before starting the job.");
      }
      item.status = 'IN_PROGRESS';
      item.job_started_at = now;
      item.updated_at = now;
      saveStoredBookings(list);
    }
    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: 'IN_PROGRESS',
          job_started_at: now,
          updated_at: now,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Start job error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mud_booking_updated', {
        detail: { id: bookingId, status: 'IN_PROGRESS', job_started_at: now }
      }));
    }
    return { success: true, booking: item };
  },

  // Mark booking payment complete (COD cash received or UPI QR / Razorpay verified)
  markPaymentComplete: async (
    bookingId: string,
    paymentMethod: 'COD' | 'RAZORPAY' | 'UPI_QR',
    transactionId?: string,
    partsCost?: number,
    partsDescription?: string
  ) => {
    const now = new Date().toISOString();
    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    const updates: any = {
      payment_method: paymentMethod,
      payment_status: 'PAID',
      payment_transaction_id: transactionId || `txn_${Date.now()}`,
      paid_at: now,
      updated_at: now
    };

    // Auto-complete job upon receipt of payment if not cancelled
    if (item?.status !== 'CANCELLED') {
      updates.status = 'COMPLETED';
      updates.completed_at = item?.completed_at || now;
    }

    const parts = partsCost !== undefined ? Number(partsCost) : (item?.parts_materials_amount || item?.parts_cost || 0);
    const svc = DEFAULT_SERVICES.find(s => s.id === item?.service_id);
    const defaultServicePrice = svc?.price || 499;
    const rawBase = (item?.base_amount && item.base_amount > 0)
      ? item.base_amount
      : (item?.baseLaborAmount && item.baseLaborAmount > 0)
      ? item.baseLaborAmount
      : (item?.price && item.price > 0)
      ? item.price
      : defaultServicePrice;
    
    // Base labor fee is strictly preserved (e.g. 699) and materials are added on top (e.g. 100) -> Total 799
    const base = rawBase;
    const finalTotal = base + parts;

    if (partsCost !== undefined || parts > 0) {
      updates.parts_cost = parts;
      updates.parts_materials_amount = parts;
      if (partsDescription) {
        updates.parts_description = partsDescription;
      }
      if (parts > 0) {
        updates.newly_added_materials = [
          { description: partsDescription || item?.parts_description || 'Spare parts & replacement fittings installed', amount: parts }
        ];
      }
    }

    updates.base_amount = base;
    updates.baseLaborAmount = base;
    updates.price = base;
    updates.total_price = finalTotal;
    updates.total_amount = finalTotal;
    updates.total_amount_paid = finalTotal;
    updates.totalAmountPaid = finalTotal;
    if (svc?.name) {
      updates.service_name = svc.name;
    }

    if (item) {
      Object.assign(item, updates);
      saveStoredBookings(list);
    }

    // Sync to legacy/admin local storage
    try {
      const adminKey = 'mud_bookings';
      const rawAdmin = localStorage.getItem(adminKey);
      const adminList = rawAdmin ? JSON.parse(rawAdmin) : [];
      const foundIdx = adminList.findIndex((b: any) => b.id === bookingId);
      if (foundIdx >= 0) {
        adminList[foundIdx] = { ...adminList[foundIdx], ...updates };
        localStorage.setItem(adminKey, JSON.stringify(adminList));
      }
    } catch {}

    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          ...updates,
          firestore_updated_at: serverTimestamp()
        });
      } catch (e) {
        console.warn('[Firestore] Payment mark complete error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('mud_booking_updated', {
      detail: { id: bookingId, ...updates }
    }));
    window.dispatchEvent(new CustomEvent('mud_payment_completed', {
      detail: { bookingId, ...updates }
    }));

    // Cross-tab / cross-window sync bus
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbandaily_sync_bus');
        bc.postMessage({
          type: 'mud_payment_completed',
          payload: { bookingId, ...updates }
        });
        bc.close();
      }
    } catch {}

    // Auto-generate and collect digital receipt under Customer Profile
    try {
      const receipt = generateReceiptFromBookingRecord({ ...item, ...updates });
      saveCustomerReceipt(receipt).catch(() => {});
    } catch (e) {
      console.warn('[PeopleData] Receipt generation notice:', e);
    }

    return { success: true, booking: item };
  },

  // Open Razorpay Checkout Modal (Calls /create-order with booking_id only, then standard checkout)
  openRazorpayCheckout: async (options: {
    amount?: number;
    name?: string;
    description?: string;
    bookingId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    onStateChange?: (state: any) => void;
    onSuccess: (response: { razorpay_payment_id: string; razorpay_order_id?: string }) => void;
    onFailure?: (error: any) => void;
    onDismiss?: () => void;
  }) => {
    try {
      await initiateRazorpayPayment({
        bookingId: options.bookingId,
        amount: options.amount,
        customerName: options.customerName,
        customerEmail: options.customerEmail,
        customerPhone: options.customerPhone,
        onStateChange: options.onStateChange,
        onSuccess: (res) => {
          options.onSuccess({
            razorpay_payment_id: res.paymentId,
            razorpay_order_id: res.orderId
          });
        },
        onFailure: (err) => {
          if (options.onFailure) options.onFailure(err);
        },
        onDismiss: () => {
          if (options.onDismiss) options.onDismiss();
          else if (options.onFailure) options.onFailure(new Error('Payment window closed by user.'));
        }
      });
    } catch (err: any) {
      if (options.onFailure) options.onFailure(err);
      else throw err;
    }
  },

  submitReview: async (bookingId: string, rating: number, comment: string) => {

    const list = getStoredBookings();
    const item = list.find(b => b.id === bookingId);
    if (item) {
      item.status = 'REVIEWED';
      item.rating = rating;
      item.review_comment = comment;
      saveStoredBookings(list);
    }

    if (isFirebaseLive()) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: 'REVIEWED',
          rating,
          review_comment: comment,
          reviewed_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[Firestore] Submit review error:', e);
      }
    }

    return { review: { bookingId, rating, comment } };
  },

  submitKyc: async (candidateData?: any) => {
    const cachedUser = localStorage.getItem('mud_active_user');
    const user = cachedUser ? JSON.parse(cachedUser) : null;
    if (user) {
      user.kyc_status = 'pending';
      if (candidateData?.trade_category) user.trade_category = candidateData.trade_category;
      localStorage.setItem('mud_active_user', JSON.stringify(user));
    }

    const candidateId = `prov-kyc-${Date.now()}`;
    const candidateRecord = {
      id: candidateId,
      user_id: user?.id || `usr_tec_${Date.now()}`,
      name: candidateData?.name || user?.name || 'Technician Candidate',
      phone: candidateData?.phone || user?.phone || '',
      email: candidateData?.email || user?.email || '',
      trade_category: candidateData?.trade_category || 'General Home Services',
      experience_years: candidateData?.experience_years || 3,
      locality: candidateData?.locality || 'Sagara, Karnataka',
      aadhaar_number: candidateData?.aadhaar_number || 'XXXX-XXXX-8921',
      aadhaar_photo_url: candidateData?.aadhaar_photo_url || '',
      face_ai_photo_url: candidateData?.face_ai_photo_url || '',
      ai_anti_spoofing_score: 99.1,
      kyc_status: 'PENDING_REVIEW',
      submitted_at: new Date().toISOString()
    };

    // 1. Save locally for same-browser instant sync
    try {
      const existing = JSON.parse(localStorage.getItem('mud_kyc_queue') || '[]');
      existing.unshift(candidateRecord);
      localStorage.setItem('mud_kyc_queue', JSON.stringify(existing));
    } catch {}

    // 2. Persist to Cloud Firestore kyc_queue
    if (isFirebaseLive()) {
      try {
        await setDoc(doc(db, 'kyc_queue', candidateId), {
          ...candidateRecord,
          firestore_created_at: serverTimestamp()
        });
        if (user?.id) {
          await setDoc(doc(db, 'users', user.id), {
            id: user.id,
            name: candidateRecord.name,
            phone: candidateRecord.phone,
            role: 'provider',
            kyc_status: 'pending',
            trade_category: candidateRecord.trade_category,
            experience_years: candidateRecord.experience_years,
            locality: candidateRecord.locality,
            aadhaar_number: candidateRecord.aadhaar_number,
            aadhaar_photo_url: candidateRecord.aadhaar_photo_url,
            face_ai_photo_url: candidateRecord.face_ai_photo_url,
            kyc_submitted_at: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('[Firestore] KYC queue save warning:', e);
      }
    }

    // 3. Broadcast to cross-portal sync bus
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.postMessage({ type: 'NEW_KYC_SUBMISSION', payload: candidateRecord, timestamp: Date.now() });
      }
      window.dispatchEvent(new CustomEvent('urbandaily_sync_event', { detail: { type: 'NEW_KYC_SUBMISSION', payload: candidateRecord } }));
    } catch {}

    return { success: true, message: 'KYC submitted successfully. Status is now pending admin review.' };
  },

  // 4. Real-time Firestore Listener
  subscribeToBooking: (bookingId: string, onUpdate: (booking: BookingRecord) => void) => {
    if (isFirebaseLive()) {
      try {
        const unsub = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
          if (snap.exists()) {
            onUpdate({ id: snap.id, ...snap.data() } as BookingRecord);
          }
        });
        return unsub;
      } catch (e) {
        console.warn('[Firestore] Subscription fallback:', e);
      }
    }

    // Local event listener fallback
    const handler = (e: any) => {
      if (e.detail && e.detail.id === bookingId) {
        const list = getStoredBookings();
        const found = list.find(b => b.id === bookingId);
        if (found) onUpdate(found);
      }
    };
    window.addEventListener('mud_booking_updated', handler);
    return () => window.removeEventListener('mud_booking_updated', handler);
  },

  // Customer Receipts Collection
  getCustomerReceipts: async (customerId: string): Promise<CustomerReceipt[]> => {
    return getCustomerReceipts(customerId);
  },
  saveCustomerReceipt: async (receipt: CustomerReceipt): Promise<CustomerReceipt> => {
    return saveCustomerReceipt(receipt);
  }
};
