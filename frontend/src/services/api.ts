// Hybrid API Client: Automatically switches between Live Backend & Offline Demo State
// When hosted on Netlify / static cloud without an active backend URL, it provides seamless full offline demo!
import { firebaseService } from './firebase';
import { getSecureRandomDigits } from '@/utils/crypto';

const IS_REMOTE_HOSTED = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

const REMOTE_BACKEND_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const BASE_URL = REMOTE_BACKEND_URL ? `${REMOTE_BACKEND_URL}/api` : '/api';

// Initial Mock Seed State for Netlify / Static preview
let mockState: any = {
  users: [
    {
      id: 'usr-cust-1',
      phone: '9845123456',
      name: 'Ramesh Hegde',
      role: 'customer',
      preferred_language: 'kn'
    },
    {
      id: 'usr-prov-1',
      phone: '9844011223',
      name: 'Manjunath K (Verified Pro)',
      role: 'provider',
      preferred_language: 'kn'
    },
    {
      id: 'usr-prov-2',
      phone: '9448022334',
      name: 'Suresh Bhat (Wireman)',
      role: 'provider',
      preferred_language: 'kn'
    },
    {
      id: 'usr-admin-1',
      phone: '9880000001',
      name: 'Sagara Admin Desk',
      role: 'admin',
      preferred_language: 'en'
    }
  ],
  providers: [
    {
      id: 'prov-1',
      user_id: 'usr-prov-1',
      rating: 4.92,
      total_reviews: 134,
      is_online: true,
      is_available: true,
      kyc_status: 'verified',
      total_earnings: 42800,
      pending_payout: 3450,
      trade_categories: ['cat-plumbing'],
      aadhaar_number: 'XXXX-XXXX-4821',
      bank_account_info: { bank_name: 'Karnataka Bank Sagara' }
    },
    {
      id: 'prov-2',
      user_id: 'usr-prov-2',
      rating: 4.86,
      total_reviews: 98,
      is_online: true,
      is_available: true,
      kyc_status: 'verified',
      total_earnings: 38200,
      pending_payout: 2890,
      trade_categories: ['cat-electrical'],
      aadhaar_number: 'XXXX-XXXX-6192',
      bank_account_info: { bank_name: 'SBI Sagara' }
    }
  ],
  categories: [
    {
      id: 'cat-plumbing',
      slug: 'plumbing',
      name: 'Plumbing Services',
      name_kn: 'ಪ್ಲಂಬಿಂಗ್ ಸೇವೆಗಳು',
      icon: 'Wrench',
      base_inspection_fee: 149
    },
    {
      id: 'cat-electrical',
      slug: 'electrical',
      name: 'Electrical Works',
      name_kn: 'ವಿದ್ಯುತ್ ಕಾಮಗಾರಿ',
      icon: 'Zap',
      base_inspection_fee: 149
    },
    {
      id: 'cat-cleaning',
      slug: 'cleaning',
      name: 'Deep Cleaning',
      name_kn: 'ಮನೆ ಆಳವಾದ ಸ್ವಚ್ಛತೆ',
      icon: 'Sparkles',
      base_inspection_fee: 299
    },
    {
      id: 'cat-appliance',
      slug: 'appliance',
      name: 'Appliance Repair',
      name_kn: 'ಗೃಹೋಪಯೋಗಿ ವಸ್ತುಗಳ ದುರಸ್ತಿ',
      icon: 'Tv',
      base_inspection_fee: 199
    },
    {
      id: 'cat-carpentry',
      slug: 'carpentry',
      name: 'Carpentry & Woodwork',
      name_kn: 'ಬಡಗಿ / ಮರಗೆಲಸ',
      icon: 'Hammer',
      base_inspection_fee: 149
    },
    {
      id: 'cat-painting',
      slug: 'painting',
      name: 'Painting & Waterproofing',
      name_kn: 'ಪೇಂಟಿಂಗ್ ಮತ್ತು ವಾಟರ್‌ಪ್ರೂಫಿಂಗ್',
      icon: 'Paintbrush',
      base_inspection_fee: 249
    }
  ],
  services: [
    {
      id: 'srv-plumb-tap',
      category_id: 'cat-plumbing',
      name: 'Tap / Mixer Repair & Replacement',
      name_kn: 'ನಲ್ಲಿ / ಮಿಕ್ಸರ್ ದುರಸ್ತಿ ಮತ್ತು ಬದಲಿ',
      description: 'Fix leaking taps, bib taps, shower mixer valves or install new brass fittings',
      base_price: 199,
      estimated_duration_mins: 45,
      warranty_days: 30,
      included_tasks: ['Fault inspection', 'Washer / cartridge change', 'Teflon sealing', 'Leak check']
    },
    {
      id: 'srv-plumb-leak',
      category_id: 'cat-plumbing',
      name: 'Concealed Pipe Leakage Detection & Fix',
      name_kn: 'ಒಳಪೈಪ್ ಸೋರಿಕೆ ಪತ್ತೆ ಮತ್ತು ಪರಿಹಾರ',
      description: 'Thorough diagnosis of wall seepage and rapid PVC/CPVC joint replacement',
      base_price: 349,
      estimated_duration_mins: 90,
      warranty_days: 60,
      included_tasks: ['Acoustic leak test', 'PVC pipe joint cutting', 'Flow pressure test']
    },
    {
      id: 'srv-elec-fan',
      category_id: 'cat-electrical',
      name: 'Ceiling Fan Repair or Installation',
      name_kn: 'ಸೀಲಿಂಗ್ ಫ್ಯಾನ್ ದುರಸ್ತಿ ಅಥವಾ ಅಳವಡಿಕೆ',
      description: 'Capacitor replacement, blade balancing, noise elimination and anchor mounting',
      base_price: 199,
      estimated_duration_mins: 40,
      warranty_days: 30,
      included_tasks: ['Capacitor testing', 'Blade balancing', 'Motor winding check']
    },
    {
      id: 'srv-clean-bath',
      category_id: 'cat-cleaning',
      name: 'Intense Bathroom Deep Scrub & Descaling',
      name_kn: 'ಸ್ನಾನಗೃಹ ಆಳವಾದ ಸ್ವಚ್ಛತೆ',
      description: 'Acid-free tile stain descaling, commode sanitizing, tap shine buffing',
      base_price: 399,
      estimated_duration_mins: 90,
      warranty_days: 15,
      included_tasks: ['Grout scrubbing', 'Chrome descaling', 'Drain treatment']
    }
  ],
  bookings: [
    {
      id: 'book-demo-1',
      booking_code: 'SGR-8492',
      customer_id: 'usr-cust-1',
      provider_id: 'usr-prov-1',
      service_id: 'srv-plumb-tap',
      status: 'ON_THE_WAY',
      address_locality: 'Gandhi Nagar, Sagara',
      address_text: 'House 42/B, Near Rotary Circle, Sagara (577401)',
      address_lat: 14.1670,
      address_lng: 75.0298,
      otp: '4821',
      base_amount: 199,
      parts_materials_amount: 0,
      platform_commission_amount: 30,
      gst_amount: 5,
      total_amount: 204,
      provider_payout_amount: 199,
      created_at: new Date().toISOString()
    }
  ],
  audit_logs: [
    {
      id: 'log-1',
      action: 'PLATFORM_INITIALIZED',
      actor_role: 'system',
      entity_type: 'marketplace',
      details: { center: 'Sagara, Karnataka', active_wards: 8 },
      timestamp: new Date().toISOString()
    }
  ]
};

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // If running locally with an active Express server, query it
  if (!IS_REMOTE_HOSTED || REMOTE_BACKEND_URL) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn(`[API] Server unavailable, switching to local state for: ${endpoint}`);
    }
  }

  // Fallback Mock State Controller for seamless Netlify Preview
  return handleMockRequest(endpoint, options) as T;
}

function handleMockRequest(endpoint: string, options: RequestInit): any {
  const url = new URL(endpoint, 'http://dummy.local');
  const path = url.pathname;
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : {};

  if (path === '/auth/send-otp') {
    const dynamicOtp = getSecureRandomDigits(4);
    return { success: true, otp: dynamicOtp, expiresInSeconds: 300 };
  }

  if (path === '/auth/verify-otp') {
    return { success: true, verified: true };
  }

  if (path === '/auth/send-email-otp') {
    const dynamicOtp = getSecureRandomDigits(6);
    return { success: true, otp: dynamicOtp, expiresInSeconds: 300 };
  }

  if (path === '/auth/login-with-email-otp') {
    const user = mockState.users.find((u: any) => u.email && u.email.toLowerCase() === (body.email || '').toLowerCase());
    if (!user) {
      // Allow seamless guest/new-user provisioning
      const fallbackRole = body.role || 'customer';
      const createdUser = {
        id: `usr-${fallbackRole}-${Date.now().toString().slice(-4)}`,
        name: body.email.split('@')[0],
        email: body.email,
        phone: '9845001122',
        role: fallbackRole,
        locality: 'Gandhi Nagar, Sagara'
      };
      mockState.users.push(createdUser);
      return {
        success: true,
        isNewUser: false,
        token: `token_${createdUser.id}_${Date.now()}`,
        user: createdUser,
        provider: fallbackRole === 'provider' ? mockState.providers[0] : null
      };
    }
    const prov = mockState.providers.find((p: any) => p.user_id === user.id);
    return {
      success: true,
      isNewUser: false,
      token: `token_${user.id}_${Date.now()}`,
      user,
      provider: prov
    };
  }

  if (path === '/auth/login-with-phone-otp') {
    const user = mockState.users.find((u: any) => u.phone === body.phone);
    if (!user) {
      return { success: false, isNewUser: true, phone: body.phone, message: 'New user detected' };
    }
    const prov = mockState.providers.find((p: any) => p.user_id === user.id);
    return {
      success: true,
      isNewUser: false,
      token: `token_${user.id}_${Date.now()}`,
      user,
      provider: prov
    };
  }

  if (path === '/auth/login-with-credentials') {
    const identifier = body.identifier || '';
    const user = mockState.users.find((u: any) =>
      u.phone === identifier ||
      u.username === identifier ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    ) || mockState.users[0];
    const prov = mockState.providers.find((p: any) => p.user_id === user?.id);
    return {
      success: true,
      token: `token_${user.id}_${Date.now()}`,
      user,
      provider: prov
    };
  }

  if (path === '/auth/register-with-credentials') {
    const newUser = {
      id: `usr-${body.role || 'cust'}-${Date.now().toString().slice(-4)}`,
      name: body.name || body.username || 'Sagara Resident',
      phone: body.phone,
      email: body.email,
      role: body.role || 'customer',
      locality: body.locality || 'Gandhi Nagar, Sagara',
      preferred_language: 'en'
    };
    mockState.users.push(newUser);
    return {
      success: true,
      token: `token_${newUser.id}_${Date.now()}`,
      user: newUser
    };
  }

  if (path === '/auth/users') {
    return { users: mockState.users, providers: mockState.providers };
  }

  if (path === '/catalog/categories') {
    return mockState.categories;
  }

  if (path === '/catalog/services') {
    const categoryId = url.searchParams.get('categoryId');
    if (categoryId) {
      return mockState.services.filter((s: any) => s.category_id === categoryId);
    }
    return mockState.services;
  }

  if (path === '/bookings' && method === 'GET') {
    return mockState.bookings.map((b: any) => {
      const service = mockState.services.find((s: any) => s.id === b.service_id);
      const provider = mockState.users.find((u: any) => u.id === b.provider_id);
      const providerProfile = mockState.providers.find((p: any) => p.user_id === b.provider_id);
      return {
        ...b,
        service,
        provider: provider ? { ...provider, profile: providerProfile } : null
      };
    });
  }

  if (path === '/bookings' && method === 'POST') {
    const srv = mockState.services.find((s: any) => s.id === body.serviceId) || mockState.services[0];
    const baseAmount = srv?.base_price || 199;
    const partsAmount = 0;
    // Strict 15% portal fee commission (GST 18% inclusive)
    const platformCommission = Math.round(baseAmount * 0.15);
    const gst = Math.round(platformCommission * 0.18);
    const totalAmount = baseAmount + partsAmount;
    const providerPayout = baseAmount - platformCommission;

    const newBooking = {
      id: `book-${Date.now().toString().slice(-6)}`,
      booking_code: `SGR-${getSecureRandomDigits(4)}`,
      customer_id: body.customerId,
      provider_id: 'usr-prov-1',
      service_id: body.serviceId,
      status: 'ON_THE_WAY',
      address_locality: body.addressLocality,
      address_text: body.addressText,
      address_lat: body.addressLat || 14.1670,
      address_lng: body.addressLng || 75.0298,
      otp: getSecureRandomDigits(4),
      base_amount: baseAmount,
      parts_materials_amount: partsAmount,
      platform_commission_amount: platformCommission,
      gst_amount: gst,
      total_amount: totalAmount,
      provider_payout_amount: providerPayout,
      created_at: new Date().toISOString()
    };
    mockState.bookings.unshift(newBooking);
    firebaseService.syncBooking(newBooking);
    return { booking: newBooking };
  }

  if (path.includes('/add-parts')) {
    const b = mockState.bookings[0];
    if (b) {
      const parts = Number(body.partsAmount) || 0;
      b.parts_materials_amount = parts;
      b.parts_description = body.partsDescription || 'Replacement spare materials & components';
      const commission = Math.round(b.base_amount * 0.15);
      const gst = Math.round(commission * 0.18);
      b.platform_commission_amount = commission;
      b.gst_amount = gst;
      b.total_amount = b.base_amount + parts;
      b.provider_payout_amount = (b.base_amount - commission) + parts;
      firebaseService.syncBooking(b);
    }
    return b;
  }

  if (path.includes('/arrived')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'ARRIVED';
    return b;
  }

  if (path.includes('/start-service')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'SERVICE_IN_PROGRESS';
    return b;
  }

  if (path.includes('/complete')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'COMPLETED';
    return b;
  }

  if (path.includes('/payments/razorpay/create-order')) {
    const b = mockState.bookings[0];
    const base = b ? b.base_amount : 500;
    const parts = b ? (b.parts_materials_amount || 0) : 0;
    const commission = Math.round(base * 0.20);
    const gst = Math.round(commission * 0.18);
    const total = base + parts;
    return {
      order_id: `order_rzp_${Date.now()}`,
      gateway: 'razorpay',
      amount: total,
      currency: 'INR',
      key_id: (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_TjTC0bQBuQHCcI',
      split: {
        base_amount: base,
        parts_amount: parts,
        subtotal: base + parts,
        platform_commission_rate: 0.20,
        platform_commission_amount: commission,
        gst_rate: 0.18,
        gst_amount: gst,
        total_customer_payable: total,
        provider_payout_amount: (base - commission) + parts
      },
      status: 'created'
    };
  }

  if (path.includes('/payments/doorstep-qr')) {
    const b = mockState.bookings[0];
    const amount = b ? b.total_amount : 500;
    const upiUri = `upi://pay?pa=solvo.escrow@icici&pn=SOLVO%20Escrow&am=${amount}&cu=INR&tr=SOLVO-${b?.id || 'bk'}`;
    return {
      upi_uri: upiUri,
      booking_id: b?.id || 'bk',
      amount,
      vpa: 'solvo.escrow@icici',
      merchant_name: 'SOLVO Escrow',
      reference_id: `SOLVO-${b?.id || 'bk'}`,
      split_info: {
        platform_commission_amount: Math.round((b?.base_amount || 500) * 0.20),
        provider_payout_amount: Math.round((b?.base_amount || 500) * 0.80)
      }
    };
  }

  if (path.includes('/payments/collect-cash')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'PAYMENT_CONFIRMED';
    return { success: true, booking: b, message: 'Cash payment confirmed. 30-Day Warranty activated.' };
  }

  if (path.includes('/simulate-verified-checkout')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'PAYMENT_CONFIRMED';
    return { booking: b, simulationInfo: { hmacSignatureVerified: true, gatewayPaymentId: `pay_${Date.now()}` } };
  }

  if (path.includes('/review')) {
    const b = mockState.bookings[0];
    if (b) b.status = 'REVIEWED';
    return b;
  }

  if (path === '/admin/metrics') {
    return {
      totalGMV: 42800,
      platformRevenue: 6420,
      activeBookings: mockState.bookings.length,
      onlineProviders: 4,
      totalProviders: 5
    };
  }

  if (path === '/admin/kyc-queue') {
    return [];
  }

  if (path === '/admin/audit-logs') {
    return mockState.audit_logs;
  }

  if (path.includes('/providers/me')) {
    const prov = mockState.providers[0];
    const user = mockState.users.find((u: any) => u.id === prov.user_id);
    return { ...prov, user, bookingsCount: 14 };
  }

  return { success: true };
}

export const api = {
  getUsers: () => fetchApi<any>('/auth/users'),
  getCategories: () => fetchApi<any[]>('/catalog/categories'),
  getServices: (categoryId?: string) =>
    fetchApi<any[]>(`/catalog/services${categoryId ? `?categoryId=${categoryId}` : ''}`),
  createBooking: (data: any) =>
    fetchApi<any>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBookings: (params: any = {}) => fetchApi<any[]>('/bookings'),
  acceptBooking: (id: string, providerUserId: string) =>
    fetchApi<any>(`/bookings/${id}/accept`, { method: 'POST', body: JSON.stringify({ providerUserId }) }),
  markOnTheWay: (id: string, providerUserId: string) =>
    fetchApi<any>(`/bookings/${id}/on-the-way`, { method: 'POST', body: JSON.stringify({ providerUserId }) }),
  markArrived: (id: string, providerUserId: string, otp: string) =>
    fetchApi<any>(`/bookings/${id}/arrived`, { method: 'POST', body: JSON.stringify({ providerUserId, otp }) }),
  startService: (id: string, providerUserId: string) =>
    fetchApi<any>(`/bookings/${id}/start-service`, { method: 'POST', body: JSON.stringify({ providerUserId }) }),
  addParts: (id: string, providerUserId: string, partsAmount: number, partsDescription: string) =>
    fetchApi<any>(`/bookings/${id}/add-parts`, { method: 'POST', body: JSON.stringify({ providerUserId, partsAmount, partsDescription }) }),
  completeService: (id: string, providerUserId: string) =>
    fetchApi<any>(`/bookings/${id}/complete`, { method: 'POST', body: JSON.stringify({ providerUserId }) }),
  submitReview: (id: string, data: any) =>
    fetchApi<any>(`/bookings/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  simulateVerifiedCheckout: (bookingId: string, paymentMethod: string) =>
    fetchApi<any>('/payments/simulate-verified-checkout', { method: 'POST', body: JSON.stringify({ bookingId, paymentMethod }) }),
  getProviderProfile: (userId: string) => fetchApi<any>(`/providers/me?userId=${userId}`),
  updateAvailability: (data: any) => fetchApi<any>('/providers/availability', { method: 'PUT', body: JSON.stringify(data) }),
  getAdminMetrics: () => fetchApi<any>('/admin/metrics'),
  getKycQueue: () => fetchApi<any[]>('/admin/kyc-queue'),
  reviewKyc: (data: any) => fetchApi<any>('/admin/kyc-review', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: () => fetchApi<any[]>('/admin/audit-logs'),
  resetSeed: () => fetchApi<any>('/admin/reset-seed', { method: 'POST' }),
  sendEmailOtp: (email: string) => fetchApi<any>('/auth/send-email-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  registerWithCredentials: (data: any) => fetchApi<any>('/auth/register-with-credentials', { method: 'POST', body: JSON.stringify(data) }),
  loginWithCredentials: (data: any) => fetchApi<any>('/auth/login-with-credentials', { method: 'POST', body: JSON.stringify(data) }),
  loginWithPhoneOtp: (phone: string, otp: string) => fetchApi<any>('/auth/login-with-phone-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
  loginWithEmailOtp: (email: string, otp: string, role?: string) => fetchApi<any>('/auth/login-with-email-otp', { method: 'POST', body: JSON.stringify({ email, otp, role }) }),
  registerTechnicianKyc: (data: any) => fetchApi<any>('/provider/register-kyc', { method: 'POST', body: JSON.stringify(data) }),
  createRazorpayOrder: (bookingId: string, paymentMethod?: string) =>
    fetchApi<any>('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify({ bookingId, paymentMethod }) }),
  verifyRazorpayPayment: (orderId: string, paymentId: string, signature: string, bookingId: string) =>
    fetchApi<any>('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature, booking_id: bookingId }) }),
  getDoorstepQr: (bookingId: string) =>
    fetchApi<any>('/payments/doorstep-qr', { method: 'POST', body: JSON.stringify({ bookingId }) }),
  collectCash: (bookingId: string, technicianId?: string) =>
    fetchApi<any>('/payments/collect-cash', { method: 'POST', body: JSON.stringify({ bookingId, technicianId }) }),
  reportBypass: (data: { bookingId: string; customerId?: string; technicianId?: string; reason?: string; upiIdOffered?: string }) =>
    fetchApi<any>('/payments/fraud/report-bypass', { method: 'POST', body: JSON.stringify(data) }),
  analyzeCancellation: (data: { bookingId: string; technicianId: string; timeSpentMinutes: number; otpVerified: boolean }) =>
    fetchApi<any>('/payments/fraud/analyze-cancellation', { method: 'POST', body: JSON.stringify(data) }),
  getCustomerReceipts: (customerId: string) =>
    fetchApi<any[]>(`/customers/${customerId}/receipts`),
  saveCustomerReceipt: (receipt: any) =>
    fetchApi<any>(`/customers/${receipt.customerId || receipt.customer_id}/receipts`, { method: 'POST', body: JSON.stringify(receipt) })
};


