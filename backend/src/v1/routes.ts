import { Router, Request, Response } from 'express';
import { db, CustomerReceiptRecord } from '../db/database.js';
import { firestore } from '../db/firestore.js';
import { BookingService } from '../modules/booking/booking.service.js';
import { MatchingService } from '../modules/matching/matching.service.js';
import { PaymentService } from '../modules/payment/payment.service.js';
import { PricingService } from '../modules/pricing/pricing.service.js';
import { BillingService } from '../modules/billing/billing.service.js';
import { ReceiptService } from '../modules/receipt/receipt.service.js';
import { sendSuccess, sendError, paginate } from '../utils/response.js';
import { openApiSpec } from './openapi.js';
import { verifyAuthToken, requireRole, AuthenticatedRequest, UserRole } from '../middleware/auth.js';
import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { handleCrmConciergeRequest } from '../routes.js';

export const v1Router = Router();

// ==========================================
// 0. OPENAPI & DOCUMENTATION
// ==========================================
v1Router.get('/openapi.json', (req: Request, res: Response) => {
  return res.json(openApiSpec);
});

v1Router.get('/docs', (req: Request, res: Response) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MyUrbanDaily API Documentation — v1</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .topbar { background: #0f172a; padding: 12px 20px; color: #fff; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: space-between; }
    .badge { background: #3b82f6; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 12px; margin-left: 10px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>MyUrbanDaily Unified Mobile & Web API Gateway <span class="badge">v1.0.0</span></div>
    <div style="font-size: 12px; color: #94a3b8;">Single Source of Truth: Google Cloud Firestore</div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  return res.send(swaggerHtml);
});

// ==========================================
// 1. SYSTEM & HEALTH
// ==========================================
v1Router.get('/health', (req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'HEALTHY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'Google Cloud Firestore',
    storage: 'Cloud Storage for Firebase',
    auth: 'Firebase Authentication with Custom Claims',
    geofence_default_meters: parseInt(process.env.DOORSTEP_GEOFENCE_RADIUS_METERS || '150', 10),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// ==========================================
// 2. AUTHENTICATION & RBAC
// ==========================================
v1Router.post('/auth/verify-token', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  return sendSuccess(res, {
    authenticated: true,
    user: req.user,
    role: req.user?.role,
    claims: req.user?.claims
  });
});

v1Router.post('/auth/set-role', verifyAuthToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { uid, role } = req.body;
  const validRoles: UserRole[] = ['customer', 'technician', 'provider', 'admin', 'ops', 'support', 'security_auditor'];
  if (!uid || !role || !validRoles.includes(role)) {
    return sendError(res, 'INVALID_PARAMS', `uid and a valid role (${validRoles.join(', ')}) are required`, 400);
  }

  try {
    await firestore.setCustomClaims(uid, { role });
    const user = db.users.find(u => u.id === uid);
    if (user) {
      user.role = role as any;
      db.persist('users', user.id);
    }

    return sendSuccess(res, {
      uid,
      role,
      message: `Successfully assigned role '${role}' to user ${uid}`
    });
  } catch (err: any) {
    return sendError(res, 'SET_ROLE_FAILED', err?.message || 'Failed to assign custom claims', 500);
  }
});

v1Router.get('/auth/me', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.uid) || req.user;
  return sendSuccess(res, {
    user,
    role: req.user?.role,
    claims: req.user?.claims
  });
});

// Login for demo credential switching & test setups
v1Router.post('/auth/login', async (req: Request, res: Response) => {
  const { phone, role } = req.body;
  if (!phone) {
    return sendError(res, 'MISSING_FIELD', 'Phone number is required', 400);
  }

  let user = db.users.find(u => u.phone === phone);

  if (!user && role) {
    user = {
      id: `usr-${uuidv4().substring(0, 8)}`,
      phone,
      name: role === 'customer' ? 'New Customer' : role === 'provider' || role === 'technician' ? 'New Technician' : 'Admin User',
      role,
      password_hash: 'mock',
      preferred_language: 'en',
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    db.persist('users', user.id);
  }

  if (!user) {
    return sendError(res, 'USER_NOT_FOUND', 'User not found for provided phone', 404);
  }

  let providerProfile = null;
  if (user.role === 'provider' || user.role === 'technician') {
    providerProfile = db.providers.find(p => p.user_id === user?.id) || null;
  }

  return sendSuccess(res, {
    token: `token_${user.id}_${user.role}_${Date.now()}`,
    user,
    provider: providerProfile
  });
});

v1Router.get('/users/me', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.uid);
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
  }
  return sendSuccess(res, { user });
});

v1Router.put('/users/profile', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.uid);
  if (!user) {
    return sendError(res, 'USER_NOT_FOUND', 'User not found to update', 404);
  }

  const { name, email, phone, avatar } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (avatar) user.avatar_url = avatar;

  db.persist('users', user.id);
  return sendSuccess(res, { user });
});

// ==========================================
// 3. CATALOG & ESTIMATE BILLING
// ==========================================
v1Router.get('/catalog/categories', (req: Request, res: Response) => {
  const categories = db.service_categories.filter(c => c.is_active);
  return sendSuccess(res, categories);
});

v1Router.get('/catalog/services', (req: Request, res: Response) => {
  const { category_id, search, page, limit } = req.query;
  let items = db.services.filter(s => s.is_active);

  if (category_id) {
    items = items.filter(s => s.category_id === category_id);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    items = items.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  const paginated = paginate(items, page, limit);
  return sendSuccess(res, paginated.data, 200, paginated.pagination);
});

v1Router.get('/catalog/services/:id', (req: Request, res: Response) => {
  const service = db.services.find(s => s.id === req.params.id);
  if (!service) {
    return sendError(res, 'SERVICE_NOT_FOUND', `Service not found with ID ${req.params.id}`, 404);
  }
  return sendSuccess(res, service);
});

// Estimate-Only Billing Calculator: Real bookings derive pricing strictly on server from catalog prices
v1Router.post('/billing/calculate', (req: Request, res: Response) => {
  const { baseLaborRupees, basePrice, partsMaterialsRupees, partsAmount, partsMarkupRate, discountRupees, discount, couponCode, discountBorneBy } = req.body;
  const result = BillingService.calculateBilling({
    baseLaborRupees: baseLaborRupees ?? basePrice ?? 0,
    partsMaterialsRupees: partsMaterialsRupees ?? partsAmount ?? 0,
    partsMarkupRate: partsMarkupRate ?? 0,
    discountRupees: discountRupees ?? discount ?? 0,
    couponCode,
    discountBorneBy
  });
  return sendSuccess(res, result);
});

// ==========================================
// 4. TECHNICIAN MATCHING & DISPATCH
// ==========================================
v1Router.get('/matching/nearby-providers', (req: Request, res: Response) => {
  const { service_id, lat, lng } = req.query;
  if (!service_id || !lat || !lng) {
    return sendError(res, 'MISSING_PARAMS', 'service_id, lat, and lng query parameters are required', 400);
  }

  const service = db.services.find(s => s.id === service_id);
  const categoryId = service?.category_id || String(service_id);
  const matches = MatchingService.findEligibleProviders(
    categoryId,
    parseFloat(String(lat)),
    parseFloat(String(lng))
  );

  return sendSuccess(res, matches);
});

v1Router.get('/providers/me', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const provider = db.providers.find(p => p.user_id === user.uid || p.id === user.uid);
  if (!provider) {
    return sendError(res, 'PROVIDER_NOT_FOUND', 'Provider profile not found for authenticated user', 404);
  }
  return sendSuccess(res, provider);
});

v1Router.put('/providers/availability', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const provider = db.providers.find(p => p.user_id === user.uid || p.id === user.uid);
  if (!provider) {
    return sendError(res, 'PROVIDER_NOT_FOUND', 'Provider profile not found to update', 404);
  }

  // Identity spoofing check
  if (req.body.provider_id && req.body.provider_id !== user.uid && req.body.provider_id !== provider.id && user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access denied: Identity spoofing detected', 403);
  }

  const { is_online, lat, lng } = req.body;
  if (typeof is_online === 'boolean') provider.is_online = is_online;
  if (lat && lng) {
    provider.current_lat = lat;
    provider.current_lng = lng;
  }

  db.persist('providers', provider.id);
  return sendSuccess(res, { provider });
});

// Server-side job dispatch pool (Identity derived from verified token)
v1Router.get('/dispatch/available-jobs', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'technician' && user.role !== 'provider' && user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', `Role '${user.role}' is not authorized to access technician dispatch`, 403);
  }

  // Identity spoofing check
  const requestedPid = req.query.provider_id || req.query.user_id;
  if (requestedPid && requestedPid !== user.uid && user.role !== 'admin') {
    const provider = db.providers.find(p => p.id === requestedPid);
    if (!provider || provider.user_id !== user.uid) {
      return sendError(res, 'FORBIDDEN', 'Access denied: Identity spoofing detected. You cannot request jobs for another technician ID', 403);
    }
  }

  const pid = user.uid;
  const { trade_category, lat, lng, radius_km } = req.query;
  try {
    const jobs = MatchingService.getAvailableJobsForTechnician({
      providerId: pid,
      providerUserId: pid,
      lat: lat ? parseFloat(String(lat)) : undefined,
      lng: lng ? parseFloat(String(lng)) : undefined,
      tradeCategory: trade_category ? String(trade_category) : undefined,
      radiusKm: radius_km ? parseFloat(String(radius_km)) : undefined
    });
    return sendSuccess(res, jobs);
  } catch (err: any) {
    return sendError(res, 'DISPATCH_ERROR', err?.message || 'Error fetching dispatch jobs', 400);
  }
});

// ==========================================
// 5. BOOKINGS LIFECYCLE (ENFORCED IDENTITY & OWNERSHIP)
// ==========================================

// List Bookings: Automatically filtered by ownership
v1Router.get('/bookings', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, page, limit } = req.query;
  let items = [...db.bookings];

  if (user.role === 'customer') {
    // Customers strictly view their own bookings
    items = items.filter(b => b.customer_id === user.uid);
  } else if (user.role === 'technician' || user.role === 'provider') {
    // Technicians strictly view jobs assigned to them
    items = items.filter(b => b.provider_id === user.uid);
  } else {
    // Staff can filter by query
    if (req.query.customer_id) items = items.filter(b => b.customer_id === req.query.customer_id);
    if (req.query.provider_id) items = items.filter(b => b.provider_id === req.query.provider_id);
  }

  if (status) {
    items = items.filter(b => b.status === status);
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const paginated = paginate(items, page, limit);
  return sendSuccess(res, paginated.data, 200, paginated.pagination);
});

// Get Single Booking: Ownership enforced
v1Router.get('/bookings/:id', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return sendError(res, 'BOOKING_NOT_FOUND', `Booking not found with ID ${req.params.id}`, 404);
  }

  const isOwnerCustomer = booking.customer_id === user.uid;
  const isAssignedTech = booking.provider_id === user.uid;
  const isStaff = user.role === 'admin' || user.role === 'ops' || user.role === 'support';

  if (!isOwnerCustomer && !isAssignedTech && !isStaff) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You do not have permission to view this booking', 403);
  }

  return sendSuccess(res, booking);
});

// Create Booking: Customer identity derived from token
v1Router.post('/bookings', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (req.body.customer_id && req.body.customer_id !== user.uid && user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access denied: Identity spoofing detected. You cannot create a booking on behalf of another customer ID', 403);
  }

  const customerId = user.uid;
  const { service_id, scheduled_type, scheduled_time, address_locality, address_text, address_lat, address_lng, customer_notes, coupon_code } = req.body;
  if (!service_id || !address_locality || !address_text) {
    return sendError(res, 'MISSING_FIELDS', 'service_id, address_locality, and address_text are required', 400);
  }

  try {
    const result = BookingService.createBooking({
      customerId,
      serviceId: service_id,
      scheduledType: scheduled_type || 'instant',
      scheduledTime: scheduled_time,
      addressLocality: address_locality,
      addressText: address_text,
      addressLat: address_lat || 14.1670,
      addressLng: address_lng || 75.0298,
      customerNotes: customer_notes,
      couponCode: coupon_code
    });
    const booking = result.booking;
    db.persist('bookings', booking.id);
    return sendSuccess(res, booking, 201);
  } catch (err: any) {
    return sendError(res, 'BOOKING_CREATION_FAILED', err?.message || 'Failed to create booking', 400);
  }
});

// Accept Booking: Technician identity derived from token
v1Router.post('/bookings/:id/accept', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'technician' && user.role !== 'provider' && user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Only verified technicians can accept service bookings', 403);
  }

  if (req.body.provider_id && req.body.provider_id !== user.uid && user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access denied: Identity spoofing detected. You cannot accept on behalf of another technician ID', 403);
  }

  const providerUserId = user.uid;
  try {
    const booking = await BookingService.acceptBooking(req.params.id, providerUserId);
    db.persist('bookings', booking.id);
    return sendSuccess(res, booking);
  } catch (err: any) {
    return sendError(res, 'ACCEPT_FAILED', err?.message || 'Failed to accept booking', 400);
  }
});

// On The Way: Ownership enforced
v1Router.post('/bookings/:id/on-the-way', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  try {
    const updated = BookingService.markOnTheWay(req.params.id, user.uid);
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'STATUS_UPDATE_FAILED', err?.message || 'Failed to update status', 400);
  }
});

// Arrived: Ownership enforced
v1Router.post('/bookings/:id/arrived', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  const { otp } = req.body;
  if (!otp) return sendError(res, 'MISSING_OTP', 'Customer arrival OTP is required', 400);

  try {
    const updated = BookingService.markArrived(req.params.id, user.uid, otp);
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ARRIVAL_FAILED', err?.message || 'Failed to confirm arrival', 400);
  }
});

// Strict Doorstep Arrival Gate: Enforces OTP HMAC, 150m geofence, Cloud Storage photos, and server-side biometrics
v1Router.post('/bookings/:id/verify-arrival', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  const { otp, arrival_selfie_url, worklocation_photo_url, lat, lng, is_mock_location } = req.body;
  try {
    const updated = await BookingService.verifyArrivalAndStartService({
      bookingId: req.params.id,
      providerUserId: user.uid,
      otp: otp || '',
      arrivalSelfieUrl: arrival_selfie_url,
      worklocationPhotoUrl: worklocation_photo_url,
      technicianLat: lat !== undefined ? parseFloat(lat) : undefined,
      technicianLng: lng !== undefined ? parseFloat(lng) : undefined,
      isMockLocation: is_mock_location === true || is_mock_location === 'true',
      ipAddress: req.ip
    });
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'GATE_VERIFICATION_FAILED', err?.message || 'Doorstep gate verification failed', 400);
  }
});

// Start Service: Ownership enforced
v1Router.post('/bookings/:id/start-service', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  const { otp, arrival_selfie_url, worklocation_photo_url, lat, lng, is_mock_location } = req.body;
  try {
    let updated: any;
    if (arrival_selfie_url || worklocation_photo_url || otp) {
      updated = await BookingService.verifyArrivalAndStartService({
        bookingId: req.params.id,
        providerUserId: user.uid,
        otp: otp || '',
        arrivalSelfieUrl: arrival_selfie_url,
        worklocationPhotoUrl: worklocation_photo_url,
        technicianLat: lat !== undefined ? parseFloat(lat) : undefined,
        technicianLng: lng !== undefined ? parseFloat(lng) : undefined,
        isMockLocation: is_mock_location === true || is_mock_location === 'true',
        ipAddress: req.ip
      });
    } else {
      updated = BookingService.startService(req.params.id, user.uid);
    }
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'START_SERVICE_FAILED', err?.message || 'Failed to start service', 400);
  }
});

// Add Spare Parts: Recalculates server-side billing in integer paise
v1Router.post('/bookings/:id/add-parts', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  const { parts_materials_amount, note, markup_rate } = req.body;
  if (parts_materials_amount === undefined) {
    return sendError(res, 'MISSING_FIELDS', 'parts_materials_amount is required', 400);
  }

  try {
    const updated = BookingService.addPartsAmount(
      req.params.id,
      user.uid,
      parseFloat(parts_materials_amount) || 0,
      note || 'Spare parts',
      markup_rate ? parseFloat(markup_rate) : 0
    );
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ADD_PARTS_FAILED', err?.message || 'Failed to record parts', 400);
  }
});

// Complete Booking: Ownership enforced
v1Router.post('/bookings/:id/complete', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You are not the assigned technician for this booking', 403);
  }

  try {
    const updated = BookingService.completeService(req.params.id, user.uid);
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'COMPLETE_FAILED', err?.message || 'Failed to complete booking', 400);
  }
});

// Customer Review: Customer ownership enforced
v1Router.post('/bookings/:id/review', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.customer_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You can only review bookings placed by your account', 403);
  }

  const { rating, comment, tags } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return sendError(res, 'INVALID_RATING', 'Rating must be an integer between 1 and 5', 400);
  }
  try {
    const review = BookingService.submitReview({
      bookingId: req.params.id,
      customerId: user.uid,
      rating: parseInt(rating, 10),
      comment: comment || '',
      tags: tags || []
    });
    db.persist('bookings', req.params.id);
    return sendSuccess(res, review);
  } catch (err: any) {
    return sendError(res, 'REVIEW_FAILED', err?.message || 'Failed to review booking', 400);
  }
});

// Cancel Booking: Ownership enforced
v1Router.post('/bookings/:id/cancel', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  const isCustomer = user.role === 'customer' && booking.customer_id === user.uid;
  const isAssignedTech = (user.role === 'technician' || user.role === 'provider') && booking.provider_id === user.uid;
  const isStaff = user.role === 'admin' || user.role === 'ops';

  if (!isCustomer && !isAssignedTech && !isStaff) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You cannot cancel a booking that does not belong to you', 403);
  }

  const { reason, notes } = req.body;
  try {
    const updated = BookingService.cancelBooking({
      bookingId: req.params.id,
      cancelledBy: user.uid,
      reason: reason || 'Customer request',
      notes
    });
    db.persist('bookings', updated.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'CANCEL_FAILED', err?.message || 'Failed to cancel booking', 400);
  }
});

// ==========================================
// 6. PHOTOS & SIGNED UPLOAD URLS
// ==========================================
v1Router.post('/photos/signed-upload-url', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { booking_id, photo_type } = req.body;
  if (!booking_id || !photo_type) {
    return sendError(res, 'MISSING_FIELDS', 'booking_id and photo_type (selfie | worksite) are required', 400);
  }

  const booking = db.bookings.find(b => b.id === booking_id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Only assigned technician can generate photo upload URLs for this booking', 403);
  }

  const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'myurbandaily-458d0.appspot.com';
  const timestamp = Date.now();
  const filePath = `selfies/${booking_id}/${user.uid}/${photo_type}_${timestamp}.jpg`;
  const uploadUrl = `https://storage.googleapis.com/${bucket}/${filePath}`;

  return sendSuccess(res, {
    upload_url: uploadUrl,
    file_path: filePath,
    bucket,
    expires_in_seconds: 900,
    content_type_allowed: ['image/jpeg', 'image/png', 'image/webp'],
    max_size_bytes: 5 * 1024 * 1024
  });
});

// ==========================================
// 7. CUSTOMER RECEIPTS
// ==========================================
v1Router.get('/customers/:id/receipts', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'customer' && user.uid !== req.params.id) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You can only view your own receipts', 403);
  }

  const { page, limit } = req.query;
  const receipts = db.receipts.filter(r => r.customer_id === req.params.id || r.customer_email === req.params.id);
  const paginated = paginate(receipts, page, limit);
  return sendSuccess(res, paginated.data, 200, paginated.pagination);
});

v1Router.get('/receipts/:id', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const receipt = db.receipts.find(r => r.id === req.params.id || r.booking_id === req.params.id);
  if (!receipt) {
    return sendError(res, 'RECEIPT_NOT_FOUND', `Receipt not found for ${req.params.id}`, 404);
  }

  const booking = db.bookings.find(b => b.id === receipt.booking_id);
  const isOwner = receipt.customer_id === user.uid;
  const isTech = booking?.provider_id === user.uid;
  const isStaff = user.role === 'admin' || user.role === 'ops';

  if (!isOwner && !isTech && !isStaff) {
    return sendError(res, 'FORBIDDEN', 'Access denied: You do not have permission to view this receipt', 403);
  }

  return sendSuccess(res, receipt);
});

// ==========================================
// 8. PAYMENTS, SETTLEMENTS & RAZORPAY
// ==========================================

// Create Razorpay Order
v1Router.post('/payments/razorpay/create-order', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (config.razorpay && !config.razorpay.enabled) {
    return sendError(res, 'GATEWAY_DISABLED', 'Razorpay checkout is currently disabled. Please pay via Cash or UPI QR.', 403);
  }

  const booking_id = req.body.booking_id || req.body.bookingId;
  const payment_method = req.body.payment_method || req.body.paymentMethod || 'upi';
  const idempotency_key = req.body.idempotency_key || req.body.idempotencyKey;

  if (!booking_id) {
    return sendError(res, 'MISSING_BOOKING_ID', 'booking_id is required', 400);
  }
  const booking = db.bookings.find(b => b.id === booking_id);
  if (!booking) {
    return sendError(res, 'BOOKING_NOT_FOUND', `Booking ${booking_id} not found`, 404);
  }

  if (user.role === 'customer' && booking.customer_id !== user.uid && booking.customer_id !== 'usr_guest') {
    return sendError(res, 'FORBIDDEN', 'Access denied: You can only create payment orders for your own bookings', 403);
  }

  try {
    const payment = PaymentService.createPaymentOrder(booking, payment_method, idempotency_key);
    return sendSuccess(res, {
      order_id: payment.gateway_order_id,
      payment_id: payment.id,
      gateway: payment.gateway,
      amount: payment.amount,
      amount_paise: payment.amount_paise,
      currency: payment.currency,
      key_id: config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_sagara_577401',
      status: payment.status,
      idempotency_key: payment.idempotency_key
    }, 201);
  } catch (err: any) {
    return sendError(res, 'ORDER_CREATION_FAILED', err?.message || 'Failed to create payment order', 400);
  }
});

// Client Verify Endpoint (Returns status check only; does NOT transition payment status)
v1Router.post('/payments/razorpay/verify', (req: Request, res: Response) => {
  const { order_id, payment_id, signature, booking_id } = req.body;
  if (!order_id || !payment_id || !signature) {
    return sendError(res, 'MISSING_PAYMENT_FIELDS', 'order_id, payment_id, and signature are required', 400);
  }

  const expectedKeySig = PaymentService.generateSignature(order_id, payment_id, PaymentService.getKeySecret());
  const isValid = PaymentService.timingSafeCompare(signature, expectedKeySig);

  if (!isValid) {
    return sendError(res, 'PAYMENT_VERIFICATION_FAILED', 'Invalid signature. Payment verification check failed.', 400);
  }

  const payment = db.payments.find(p => p.gateway_order_id === order_id);
  const booking = db.bookings.find(b => b.id === (booking_id || payment?.booking_id));

  return sendSuccess(res, {
    order_id,
    payment_id,
    signature_valid: true,
    payment_status: payment?.status || 'pending',
    booking_status: booking?.status || 'COMPLETED',
    note: 'Payment status is finalized strictly upon receipt of verified Razorpay webhook'
  });
});

// Server-to-Server Webhook: Only verified webhooks transition booking status
v1Router.post('/payments/razorpay/webhook', async (req: Request, res: Response) => {
  const signature = (req.headers['x-razorpay-signature'] as string) || req.body?.signature;
  const eventId = (req.headers['x-razorpay-event-id'] as string) || req.body?.event_id || req.body?.id;
  const paymentEntity = req.body?.payload?.payment?.entity || req.body;
  const orderId = paymentEntity?.order_id || req.body?.order_id;
  const paymentId = paymentEntity?.id || req.body?.payment_id;
  const paidAmountPaise = paymentEntity?.amount;

  if (!orderId || !paymentId || !signature) {
    return sendError(res, 'INVALID_WEBHOOK_PAYLOAD', 'order_id, payment_id, and signature are required', 400);
  }

  const result = await PaymentService.processWebhook({
    orderId,
    gatewayPaymentId: paymentId,
    signature,
    rawPayload: req.body,
    ipAddress: req.ip,
    eventId,
    paidAmountPaise
  });

  if (!result.success) {
    return sendError(res, 'WEBHOOK_VERIFICATION_FAILED', result.message, 400);
  }

  return sendSuccess(res, {
    message: result.message,
    booking: result.booking,
    payment: result.payment,
    receipt: result.receipt
  });
});

// Cash and UPI QR Settlement Endpoint (Technician / Staff only)
v1Router.post('/payments/settlement', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { booking_id, method, transaction_reference, amount_paise, customer_confirmed } = req.body;
  if (!booking_id || !method) {
    return sendError(res, 'MISSING_FIELDS', 'booking_id and method (cash | upi_qr) are required', 400);
  }

  if (method !== 'cash' && method !== 'upi_qr') {
    return sendError(res, 'INVALID_METHOD', "method must be 'cash' or 'upi_qr'", 400);
  }

  const booking = db.bookings.find(b => b.id === booking_id);
  if (!booking) return sendError(res, 'BOOKING_NOT_FOUND', 'Booking not found', 404);

  if (user.role !== 'admin' && booking.provider_id !== user.uid) {
    return sendError(res, 'FORBIDDEN', 'Only assigned technician can settle payment for this booking', 403);
  }

  try {
    const result = await PaymentService.settleCashOrQrPayment({
      bookingId: booking_id,
      providerUserId: user.uid,
      method,
      transactionReference: transaction_reference,
      amountPaise: amount_paise ? parseInt(amount_paise, 10) : undefined,
      customerConfirmed: customer_confirmed === true || customer_confirmed === 'true',
      ipAddress: req.ip
    });
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'SETTLEMENT_FAILED', err?.message || 'Failed to settle payment', 400);
  }
});

// Manual Reviews Queue: Ops/Admin investigation for uncertain biometric or GPS flags
v1Router.get('/admin/manual-reviews', verifyAuthToken, requireRole(['admin', 'ops']), (req: Request, res: Response) => {
  const { page, limit, status } = req.query;
  let items = [...db.manual_reviews];
  if (status) items = items.filter(r => r.status === status);
  const paginated = paginate(items, page, limit);
  return sendSuccess(res, paginated.data, 200, paginated.pagination);
});

// ==========================================
// 9. ADMIN METRICS & AUDIT LOGS
// ==========================================
v1Router.get('/admin/metrics', verifyAuthToken, requireRole(['admin', 'ops']), (req: Request, res: Response) => {
  const totalBookings = db.bookings.length;
  const completed = db.bookings.filter(b => ['COMPLETED', 'PAYMENT_CONFIRMED', 'REVIEWED'].includes(b.status)).length;
  const cancelled = db.bookings.filter(b => b.status === 'CANCELLED').length;
  const active = totalBookings - completed - cancelled;
  const totalRevenue = db.bookings
    .filter(b => ['COMPLETED', 'PAYMENT_CONFIRMED', 'REVIEWED'].includes(b.status))
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return sendSuccess(res, {
    totalBookings,
    activeBookings: active,
    completedBookings: completed,
    cancelledBookings: cancelled,
    totalRevenue,
    onlineTechnicians: db.providers.filter(p => p.is_online).length,
    registeredUsers: db.users.length
  });
});

v1Router.get('/admin/audit-logs', verifyAuthToken, requireRole(['admin']), (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const paginated = paginate(db.audit_logs, page, limit);
  return sendSuccess(res, paginated.data, 200, paginated.pagination);
});

// ==========================================
// 10. CUSTOMER RELATIONSHIP MANAGER (CRM) CONCIERGE
// ==========================================
v1Router.post('/crm/customer-concierge', (req: Request, res: Response) => {
  const result = handleCrmConciergeRequest(req.body);
  return sendSuccess(res, result);
});

v1Router.get('/crm/interactions', (req: Request, res: Response) => {
  return sendSuccess(res, (db as any).crm_interactions || []);
});

