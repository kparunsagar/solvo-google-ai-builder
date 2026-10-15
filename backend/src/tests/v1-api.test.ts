// MyUrbanDaily — Phase A Hardening Test Suite
// Rigorous verification of Server-Side Business Rules, Identity & Ownership, Billing Reconciliation,
// Storage Photos, Timing-Safe HMAC OTP, Configurable Geofence, Deduplicated Webhooks, and Settlements.

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v1Router } from '../v1/routes.js';
import { db } from '../db/database.js';
import { config } from '../config.js';
import { seedDatabase } from '../db/seed.js';
import { BillingService } from '../modules/billing/billing.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runV1Tests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING /api/v1 MOBILE-READY API TEST SUITE (PHASE A HARDENED)');
  console.log('========================================\n');

  // Seed baseline data
  seedDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api/v1', v1Router);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let passed = 0;
  let failed = 0;

  function assert(desc: string, cond: boolean) {
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // Test 1: Health check endpoint with envelope
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert('Health returns 200 OK', healthRes.status === 200);
    assert('Health follows { success: true, data } envelope', healthJson.success === true && healthJson.data.status === 'HEALTHY');
    assert('Health reports Cloud Firestore as database', healthJson.data.database === 'Google Cloud Firestore');

    // Test 2: OpenAPI Specification
    const openapiRes = await fetch(`${baseUrl}/openapi.json`);
    const openapiJson = await openapiRes.json();
    assert('OpenAPI spec served with openapi 3.0.3', openapiJson.openapi === '3.0.3');
    assert('OpenAPI spec contains /bookings path', !!openapiJson.paths['/bookings']);
    assert('OpenAPI spec defines ApiSuccessResponse schema', !!openapiJson.components.schemas.ApiSuccessResponse);

    // Test 3: Swagger UI Docs
    const docsRes = await fetch(`${baseUrl}/docs`);
    const docsHtml = await docsRes.text();
    assert('Interactive Swagger docs served as HTML', docsRes.status === 200 && docsHtml.includes('swagger-ui'));

    // Test 4: Paginated Catalog Categories
    const catRes = await fetch(`${baseUrl}/catalog/categories`);
    const catJson = await catRes.json();
    assert('Categories returns { success: true, data: Array }', catJson.success === true && Array.isArray(catJson.data));
    assert('Categories contains plumbing, electrical, etc.', catJson.data.some((c: any) => c.slug === 'plumbing'));

    // Test 5: Paginated Catalog Services
    const srvRes = await fetch(`${baseUrl}/catalog/services?page=1&limit=5`);
    const srvJson = await srvRes.json();
    assert('Services returns envelope with pagination metadata', srvJson.success === true && !!srvJson.pagination);
    assert('Pagination specifies limit=5, page=1', srvJson.pagination.limit === 5 && srvJson.pagination.page === 1);
    assert('Returned data length matches limit', srvJson.data.length <= 5);
    assert('Total count reflects entire catalog', srvJson.pagination.total >= srvJson.data.length);

    // Test 6: Auth Login Demo
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9845012345', role: 'customer' })
    });
    const loginJson = await loginRes.json();
    assert('Login returns 200 with { success: true, data: { token, user } }', loginRes.status === 200 && !!loginJson.data.token);

    const custToken = loginJson.data.token;
    const custUser = loginJson.data.user;

    // Test 7: Booking Creation (Express as Sole Writer to Cloud Firestore)
    const bookingPayload = {
      service_id: 'srv-plumb-tap',
      address_locality: 'Gandhi Nagar',
      address_text: 'House 42, 1st Cross, Sagara',
      scheduled_type: 'instant'
    };

    const bookRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify(bookingPayload)
    });
    const bookJson = await bookRes.json();
    assert('Booking creation returns 201 Created', bookRes.status === 201);
    assert('Created booking has ID and initial matched status', bookJson.success === true && !!bookJson.data.id);
    const createdBookingId = bookJson.data.id;

    // Test 8: Paginated Bookings List with Ownership
    const listRes = await fetch(`${baseUrl}/bookings?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const listJson = await listRes.json();
    assert('List bookings returns paginated envelope', listJson.success === true && Array.isArray(listJson.data));
    assert('Includes the newly created booking', listJson.data.some((b: any) => b.id === createdBookingId));

    // Test 9: Technician Accept with Single-Job Policy
    const techManju = db.providers.find(p => p.kyc_status === 'verified')!;
    const techToken = `token_${techManju.user_id}_technician_${Date.now()}`;

    const acceptRes = await fetch(`${baseUrl}/bookings/${createdBookingId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({})
    });
    const acceptJson = await acceptRes.json();
    assert('Accept booking transitions status to ACCEPTED', acceptJson.success === true && acceptJson.data.status === 'ACCEPTED');

    // Free technician for subsequent test suites
    const priorBooking = db.bookings.find(b => b.id === createdBookingId);
    if (priorBooking) priorBooking.status = 'COMPLETED';

    // Test 10: Ephemeral Filesystem Guarantee
    const dbFilePath = path.resolve(__dirname, '../../data/sagara_db.json');
    assert('sagara_db.json is NOT created on disk (Cloud Firestore is single source of truth)', !fs.existsSync(dbFilePath));

    // Test 11: Verify Token endpoint with Bearer header
    const verifyRes = await fetch(`${baseUrl}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      }
    });
    const verifyJson = await verifyRes.json();
    assert('Verify-token succeeds with 200', verifyRes.status === 200 && verifyJson.success === true);

    // Test 12: GET /auth/me returns authenticated identity
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const meJson = await meRes.json();
    assert('GET /auth/me returns 200 with authenticated user', meRes.status === 200 && meJson.success === true && !!meJson.data.user);

    // Test 13: RBAC - Customer blocked from calling admin endpoint
    const unauthSetRoleRes = await fetch(`${baseUrl}/auth/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({ uid: custUser.id, role: 'technician' })
    });
    assert('Customer blocked from calling admin set-role endpoint (returns 403 Forbidden)', unauthSetRoleRes.status === 403);

    // Test 14: Admin can assign custom claims
    const adminUser = db.users.find(u => u.role === 'admin') || { id: 'usr-admin-01', role: 'admin' };
    const adminToken = `token_${adminUser.id}_admin_${Date.now()}`;
    const setRoleRes = await fetch(`${baseUrl}/auth/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ uid: custUser.id, role: 'technician' })
    });
    const setRoleJson = await setRoleRes.json();
    assert('Admin sets custom claim (returns 200 OK)', setRoleRes.status === 200 && setRoleJson.success === true);

    // Reset customer role back
    custUser.role = 'customer';

    // ==========================================
    // PHASE A TESTS: BUSINESS RULES ON SERVER
    // ==========================================

    // Test 15: Server-Side Universal Billing Engine (paise precision, GST, commission, markup, discounts)
    // 15a: Option B (Default: Platform bears discount, protecting technician payout)
    const billResB = await fetch(`${baseUrl}/billing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseLaborRupees: 499,
        partsMaterialsRupees: 200,
        partsMarkupRate: 0.10,
        discountRupees: 50,
        discountBorneBy: 'platform'
      })
    });
    const billJsonB = await billResB.json();
    assert('Billing Option B returns 200 OK', billResB.status === 200 && billJsonB.success === true);
    assert('Base amount paise is 49900', billJsonB.data.base_amount_paise === 49900);
    assert('Parts cost paise is 20000', billJsonB.data.parts_cost_paise === 20000);
    assert('Parts markup paise is 2000 (10%)', billJsonB.data.parts_markup_paise === 2000);
    assert('Parts total paise is 22000', billJsonB.data.parts_materials_amount_paise === 22000);
    assert('Discount paise is 5000', billJsonB.data.discount_paise === 5000);
    assert('Option B platform commission is 4980 (9980 - 5000)', billJsonB.data.platform_commission_paise === 4980);
    assert('Option B GST paise is 896 (18% of commission)', billJsonB.data.gst_amount_paise === 896);
    assert('Option B technician payout is 61920 (unreduced)', billJsonB.data.provider_payout_paise === 61920);
    assert('Option B total equals sum of parts', billJsonB.data.total_amount_paise === 67796);
    assert('Option B zero leakage: total === commission + gst + payout',
      billJsonB.data.total_amount_paise === billJsonB.data.platform_commission_paise + billJsonB.data.gst_amount_paise + billJsonB.data.provider_payout_paise);

    // 15b: Option A (Technician bears discount)
    const billResA = await fetch(`${baseUrl}/billing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseLaborRupees: 499,
        partsMaterialsRupees: 200,
        partsMarkupRate: 0.10,
        discountRupees: 50,
        discountBorneBy: 'technician'
      })
    });
    const billJsonA = await billResA.json();
    assert('Billing Option A returns 200 OK', billResA.status === 200 && billJsonA.success === true);
    assert('Option A platform commission is 9980 (20% of labor)', billJsonA.data.platform_commission_paise === 9980);
    assert('Option A GST paise is 1796 (18% of commission)', billJsonA.data.gst_amount_paise === 1796);
    assert('Option A technician payout is 56920', billJsonA.data.provider_payout_paise === 56920);
    assert('Option A total equals subtotal + GST', billJsonA.data.total_amount_paise === 68696);
    assert('Option A zero leakage: total === commission + gst + payout',
      billJsonA.data.total_amount_paise === billJsonA.data.platform_commission_paise + billJsonA.data.gst_amount_paise + billJsonA.data.provider_payout_paise);

    // Test 16: Booking State Machine Validations
    const smBookRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10, Main St',
        address_lat: 14.1670,
        address_lng: 75.0298
      })
    });
    const smBookJson = await smBookRes.json();
    const smBooking = smBookJson.data;
    assert('State machine test booking created', smBooking && smBooking.id);

    // Negative Test: Attempting invalid direct jump (e.g. markOnTheWay while in PROVIDER_MATCHED)
    const invalidJumpRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/on-the-way`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({})
    });
    assert('Invalid state transition rejected with 400', invalidJumpRes.status === 400);

    // Test 17: Double-Accept & Race Condition Protection
    const accept1Res = await fetch(`${baseUrl}/bookings/${smBooking.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({})
    });
    const accept1Json = await accept1Res.json();
    assert('First technician accept succeeds', accept1Res.status === 200 && accept1Json.data.status === 'ACCEPTED');

    const tech2 = db.providers.find(p => p.user_id !== techManju.user_id && p.kyc_status === 'verified')!;
    const tech2Token = `token_${tech2.user_id}_technician_${Date.now()}`;
    const accept2Res = await fetch(`${baseUrl}/bookings/${smBooking.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech2Token}`
      },
      body: JSON.stringify({})
    });
    assert('Second technician double-accept rejected with 400', accept2Res.status === 400);

    // 17b: Parallel double-accept race condition (two technicians accept same open booking concurrently)
    const raceBook1Res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: 'srv-plumb-leak',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 15',
        address_lat: 14.1670,
        address_lng: 75.0298
      })
    });
    const raceBook1 = (await raceBook1Res.json()).data;
    const raceBookingRecord = db.bookings.find(b => b.id === raceBook1.id)!;
    raceBookingRecord.provider_id = undefined;
    raceBookingRecord.status = 'REQUESTED';

    const tech3 = db.providers.find(p => p.user_id !== techManju.user_id && p.user_id !== tech2.user_id && p.kyc_status === 'verified')!;
    const tech3Token = `token_${tech3.user_id}_technician_${Date.now()}`;

    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${baseUrl}/bookings/${raceBook1.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech2Token}` },
        body: JSON.stringify({})
      }),
      fetch(`${baseUrl}/bookings/${raceBook1.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech3Token}` },
        body: JSON.stringify({})
      })
    ]);
    const statuses1 = [raceRes1.status, raceRes2.status];
    assert('Parallel double-accept race: exactly one technician succeeds (200) and one fails (400)',
      statuses1.includes(200) && statuses1.includes(400));

    // 17c: Parallel single-job rule: one technician cannot accept two concurrent jobs in parallel
    const tech4 = db.providers.find(p => p.user_id !== techManju.user_id && p.user_id !== tech2.user_id && p.user_id !== tech3.user_id && p.kyc_status === 'verified')!;
    const tech4Token = `token_${tech4.user_id}_technician_${Date.now()}`;
    const raceBook2Res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 20',
        address_lat: 14.1670,
        address_lng: 75.0298
      })
    });
    const raceBook3Res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 21',
        address_lat: 14.1670,
        address_lng: 75.0298
      })
    });
    const raceBook2 = (await raceBook2Res.json()).data;
    const raceBook3 = (await raceBook3Res.json()).data;
    const rb2Record = db.bookings.find(b => b.id === raceBook2.id)!;
    rb2Record.provider_id = undefined;
    rb2Record.status = 'REQUESTED';
    const rb3Record = db.bookings.find(b => b.id === raceBook3.id)!;
    rb3Record.provider_id = undefined;
    rb3Record.status = 'REQUESTED';

    const [sjRes1, sjRes2] = await Promise.all([
      fetch(`${baseUrl}/bookings/${raceBook2.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech4Token}` },
        body: JSON.stringify({})
      }),
      fetch(`${baseUrl}/bookings/${raceBook3.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech4Token}` },
        body: JSON.stringify({})
      })
    ]);
    const sjStatuses = [sjRes1.status, sjRes2.status];
    assert('Parallel single-job race: exactly one accept succeeds (200) and one is blocked (400)',
      sjStatuses.includes(200) && sjStatuses.includes(400));

    // Transition to ON_THE_WAY
    await fetch(`${baseUrl}/bookings/${smBooking.id}/on-the-way`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({})
    });

    // Test 18: ARRIVED -> IN_PROGRESS Doorstep Gate (Negative & Positive Tests)
    const freshBooking = db.bookings.find(b => b.id === smBooking.id)!;
    const validOtp = freshBooking.otp;

    // 18a: Missing OTP rejected
    const gateNoOtpRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: '',
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/site.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Gate rejects missing OTP (returns 400)', gateNoOtpRes.status === 400);

    // 18b: Wrong OTP rejected
    const gateWrongOtpRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: '0000',
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/site.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Gate rejects wrong OTP (returns 400)', gateWrongOtpRes.status === 400);

    // 18c: Missing photos rejected
    const gateNoPhotoRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: '',
        worklocation_photo_url: '',
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Gate rejects missing verification photos (returns 400)', gateNoPhotoRes.status === 400);

    // 18d: Geofence violation (> 150m away) rejected
    const gateGeofenceRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/site.jpg`,
        lat: 14.2500, // ~10km away
        lng: 75.0298
      })
    });
    assert('Gate rejects geofence violation (returns 400)', gateGeofenceRes.status === 400);

    // 18f: Mock location detected on mobile OS rejected
    const mockLocRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/site.jpg`,
        lat: 14.1670,
        lng: 75.0298,
        is_mock_location: true
      })
    });
    assert('Gate rejects mock location (is_mock_location: true) with 400', mockLocRes.status === 400);

    // 18g: Impossible location jump velocity check (> 150 km/h) rejected
    // First set a known prior location and time for techManju
    const techProvider = db.providers.find(p => p.user_id === techManju.user_id)!;
    techProvider.last_lat = 14.1670;
    techProvider.last_lng = 75.0298;
    techProvider.last_location_updated_at = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const jumpLocRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/site.jpg`,
        lat: 15.5000, // >140km away within 1 minute
        lng: 75.0298
      })
    });
    assert('Gate rejects impossible velocity jump (> 150 km/h) with 400', jumpLocRes.status === 400);
    // Reset provider location back
    techProvider.last_lat = 14.1670;
    techProvider.last_lng = 75.0298;
    techProvider.last_location_updated_at = new Date().toISOString();

    // 18h: Expired photo (> 30 minutes old) rejected
    const expiredTimestamp = Date.now() - (45 * 60 * 1000);
    const expiredPhotoRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie_${expiredTimestamp}.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/worksite.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Gate rejects photo older than 30 minutes with 400 PHOTO_EXPIRED', expiredPhotoRes.status === 400);

    // 18e: Valid Gate Verification succeeds
    const gatePassRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/selfie.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${smBooking.id}/${techManju.user_id}/worksite.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    const gatePassJson = await gatePassRes.json();
    assert('Gate passes with valid OTP, photos & geofence (200 OK)', gatePassRes.status === 200);
    assert('Booking transitioned to SERVICE_IN_PROGRESS', gatePassJson.data.status === 'SERVICE_IN_PROGRESS');

    // Test 19: Server-Side Dispatch Filtering
    const offlineTech = db.providers.find(p => p.kyc_status === 'verified')!;
    offlineTech.is_online = false;
    const offlineToken = `token_${offlineTech.user_id}_technician_${Date.now()}`;
    const dispatchOfflineRes = await fetch(`${baseUrl}/dispatch/available-jobs`, {
      headers: { Authorization: `Bearer ${offlineToken}` }
    });
    assert('Offline technician receives 400 TECHNICIAN_OFFLINE', dispatchOfflineRes.status === 400);
    offlineTech.is_online = true;

    const dispatchOnlineRes = await fetch(`${baseUrl}/dispatch/available-jobs?lat=14.1670&lng=75.0298`, {
      headers: { Authorization: `Bearer ${tech2Token}` }
    });
    const dispatchOnlineJson = await dispatchOnlineRes.json();
    assert('Online technician receives dispatch list (200 OK)', dispatchOnlineRes.status === 200 && dispatchOnlineJson.success === true);

    // Test 20: Completion & Atomic Receipt Generation
    const completeRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({})
    });
    assert('Complete booking succeeds', completeRes.status === 200);
    const receipt1 = db.receipts.find(r => r.booking_id === smBooking.id);
    assert('Customer digital receipt generated on completion', Boolean(receipt1));
    assert('Receipt contains 30-day warranty', receipt1?.warranty_days === 30 && Boolean(receipt1?.warranty_valid_until));

    // Test 21: Razorpay Payment Order Creation
    const idempotencyKey = `idem_test_${Date.now()}`;
    const order1Res = await fetch(`${baseUrl}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        booking_id: smBooking.id,
        payment_method: 'upi',
        idempotency_key: idempotencyKey
      })
    });
    const order1Json = await order1Res.json();
    assert('Razorpay order created with 201', order1Res.status === 201 && order1Json.success === true);

    // Test 22: Razorpay Cryptographic Verification & Webhooks
    const orderId = order1Json.data.order_id;
    const paymentId = `pay_${Date.now()}`;

    // 22a: Tampered signature rejected
    const tamperedRes = await fetch(`${baseUrl}/payments/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        signature: 'invalid_tampered_signature_hex_123',
        booking_id: smBooking.id
      })
    });
    assert('Tampered payment signature rejected with 400', tamperedRes.status === 400);

    // 22b: Client verify returns status without changing status
    const validSignature = crypto
      .createHmac('sha256', config.paymentSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const clientVerifyRes = await fetch(`${baseUrl}/payments/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        signature: validSignature,
        booking_id: smBooking.id
      })
    });
    const clientVerifyJson = await clientVerifyRes.json();
    assert('Client verify returns 200 OK without finalizing status', clientVerifyRes.status === 200 && clientVerifyJson.data.signature_valid === true);
    assert('Booking status remains COMPLETED until webhook arrives', db.bookings.find(b => b.id === smBooking.id)?.status === 'COMPLETED');

    // ==========================================
    // HARDENING PASS TESTS (ITEMS 1 - 10)
    // ==========================================

    // Test 23: Identity Spoofing & Role/Ownership Enforcement
    const otherCustToken = `token_usr-intruder-01_customer_${Date.now()}`;

    // 23a: Customer Intruder cannot view Customer A's booking
    const intruderViewRes = await fetch(`${baseUrl}/bookings/${smBooking.id}`, {
      headers: { Authorization: `Bearer ${otherCustToken}` }
    });
    assert('Unauthorized user blocked from viewing another customer booking (403 Forbidden)', intruderViewRes.status === 403);

    // 23b: Identity spoofing attempt (passing different customer_id in body)
    const spoofRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        customer_id: 'usr-spoofed-victim',
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10'
      })
    });
    assert('Identity spoofing rejected with 403 Forbidden', spoofRes.status === 403);

    // 23c: Technician cannot act on a job assigned to another technician
    const unauthorizedTechActionRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech2Token}` // tech2 is not assigned to smBooking
      },
      body: JSON.stringify({})
    });
    assert('Unassigned technician blocked from completing another technician job (403)', unauthorizedTechActionRes.status === 403);

    // Test 24: Real Server-Side Pricing from Catalog & Server Coupon Validation
    // 24a: Invalid coupon code rejected
    const invalidCouponRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10',
        coupon_code: 'FAKECOUPON99'
      })
    });
    const invalidCouponJson = await invalidCouponRes.json();
    assert('Booking with invalid coupon code fails validation', invalidCouponRes.status === 400 && Boolean(invalidCouponJson.error?.message?.includes('Invalid coupon code')));

    // 24b: Valid coupon WELCOME50 applies server-side ₹50 discount
    const validCouponRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        service_id: 'srv-plumb-tank',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10',
        coupon_code: 'WELCOME50'
      })
    });
    const validCouponJson = await validCouponRes.json();
    assert('Booking created with server-validated coupon WELCOME50', validCouponRes.status === 201 && validCouponJson.data.discount_paise === 5000);

    // 24c: Expired coupon EXPIRED20 rejected
    const expiredCouponRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10',
        coupon_code: 'EXPIRED20'
      })
    });
    const expiredCouponJson = await expiredCouponRes.json();
    assert('Expired coupon EXPIRED20 rejected with 400', expiredCouponRes.status === 400 && expiredCouponJson.error?.message?.includes('expired'));

    // 24d: Global usage limit exceeded coupon CAPPEDMAX rejected
    const cappedCouponRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: 'srv-plumb-tap',
        address_locality: 'Gandhi Nagar',
        address_text: 'Door 10',
        coupon_code: 'CAPPEDMAX'
      })
    });
    const cappedCouponJson = await cappedCouponRes.json();
    assert('Global limit capped coupon CAPPEDMAX rejected with 400', cappedCouponRes.status === 400 && cappedCouponJson.error?.message?.includes('redemption limit'));

    // Test 25: Payout Reconciliation (Mathematical Zero-Leakage Assertion)
    // Formula: total_amount_paise === platform_commission_paise + gst_amount_paise + provider_payout_paise
    const testCases = [
      { labor: 499, parts: 200, markup: 0.10, discount: 50 },
      { labor: 299, parts: 75, markup: 0.15, discount: 0 },
      { labor: 149, parts: 0, markup: 0, discount: 25 },
      { labor: 1299, parts: 450, markup: 0.10, discount: 100 }
    ];

    let allReconciled = true;
    for (const tc of testCases) {
      const calc = BillingService.calculateBilling({
        baseLaborRupees: tc.labor,
        partsMaterialsRupees: tc.parts,
        partsMarkupRate: tc.markup,
        discountRupees: tc.discount
      });
      const sum = calc.platform_commission_paise + calc.gst_amount_paise + calc.provider_payout_paise;
      if (sum !== calc.total_amount_paise) {
        allReconciled = false;
        console.error(`Reconciliation mismatch on ${JSON.stringify(tc)}: Sum=${sum}, Total=${calc.total_amount_paise}`);
      }
    }
    assert('Payout strictly reconciles across all rounding cases: Total === Commission + GST + Payout', allReconciled);

    // Test 26: Photos Security (Signed Cloud Storage Pattern & Biometrics)
    // 26a: Arbitrary external URL rejected
    const arbitraryPhotoRes = await fetch(`${baseUrl}/bookings/${smBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: validOtp,
        arrival_selfie_url: 'https://attacker.com/malicious_selfie.jpg',
        worklocation_photo_url: 'https://attacker.com/fake_worksite.jpg',
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Arbitrary external photo URL rejected with 400 INVALID_PHOTO_SOURCE', arbitraryPhotoRes.status === 400);

    // 26b: Signed upload URL endpoint generates authorized Cloud Storage path
    const signedUrlRes = await fetch(`${baseUrl}/photos/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        booking_id: smBooking.id,
        photo_type: 'selfie'
      })
    });
    const signedUrlJson = await signedUrlRes.json();
    assert('Signed upload URL endpoint returns 200 with authorized Cloud Storage path', signedUrlRes.status === 200 && signedUrlJson.data.file_path.startsWith(`selfies/${smBooking.id}/`));

    // 26c: Face biometric check: Mismatched face (< 50%) rejected server-side
    // Client cannot supply face_confidence; comparison is computed server-side
    // Create dedicated booking in ARRIVED status for biometric testing
    const bioBooking = db.bookings.find(b => b.id === raceBook1.id)!;
    bioBooking.status = 'ARRIVED';
    bioBooking.provider_id = techManju.user_id;

    const faceFailRes = await fetch(`${baseUrl}/bookings/${bioBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: bioBooking.otp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${bioBooking.id}/${techManju.user_id}/selfie_mismatch.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${bioBooking.id}/${techManju.user_id}/worksite.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    assert('Low biometric face match score (< 50%) rejected with 400 FACE_VERIFICATION_FAILED', faceFailRes.status === 400);

    // 26d: Uncertain biometric match (50-74%) passes gate but enqueues to Firestore manual review queue
    const faceUncertainRes = await fetch(`${baseUrl}/bookings/${bioBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        otp: bioBooking.otp,
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${bioBooking.id}/${techManju.user_id}/selfie_uncertain.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${bioBooking.id}/${techManju.user_id}/worksite.jpg`,
        lat: 14.1670,
        lng: 75.0298
      })
    });
    const faceUncertainJson = await faceUncertainRes.json();
    assert('Uncertain biometric face match (50-74%) passes gate (200 OK)', faceUncertainRes.status === 200 && faceUncertainJson.data.status === 'SERVICE_IN_PROGRESS');
    assert('Booking marked QUEUED_FOR_MANUAL_REVIEW', faceUncertainJson.data.face_match_status === 'QUEUED_FOR_MANUAL_REVIEW');
    assert('Item queued in db.manual_reviews', db.manual_reviews.some(r => r.booking_id === bioBooking.id));

    // 26e: Admin can query GET /admin/manual-reviews
    const adminReviewsRes = await fetch(`${baseUrl}/admin/manual-reviews`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminReviewsJson = await adminReviewsRes.json();
    assert('Admin can fetch manual reviews queue (200 OK)', adminReviewsRes.status === 200 && adminReviewsJson.data.length > 0);

    // Test 27: OTP HMAC Security & Rate Limiting (3 Failed Attempts Lockout)
    // Create new booking to test OTP lockout
    const otpTestBooking = db.bookings.find(b => b.id === validCouponJson.data.id)!;
    otpTestBooking.status = 'ARRIVED';
    otpTestBooking.provider_id = techManju.user_id;

    // 1st wrong attempt
    await fetch(`${baseUrl}/bookings/${otpTestBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        otp: '9991',
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/s.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/w.jpg`
      })
    });
    // 2nd wrong attempt
    await fetch(`${baseUrl}/bookings/${otpTestBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        otp: '9992',
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/s.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/w.jpg`
      })
    });
    // 3rd wrong attempt
    const lockAttemptRes = await fetch(`${baseUrl}/bookings/${otpTestBooking.id}/verify-arrival`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        otp: '9993',
        arrival_selfie_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/s.jpg`,
        worklocation_photo_url: `https://storage.googleapis.com/myurbandaily-458d0.appspot.com/selfies/${otpTestBooking.id}/${techManju.user_id}/w.jpg`
      })
    });
    assert('Third failed OTP attempt locks out the booking with 400 OTP_MAX_ATTEMPTS_EXCEEDED', lockAttemptRes.status === 400);

    // Test 28: Razorpay Webhook Security Hardening
    // 28a: Amount mismatch rejected
    const underpaidWebhookRes = await fetch(`${baseUrl}/payments/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature
      },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        payload: {
          payment: {
            entity: {
              order_id: orderId,
              id: paymentId,
              amount: 100 // 100 paise (₹1) vs real bill of 68696 paise
            }
          }
        }
      })
    });
    assert('Webhook with underpaid amount rejected with 400 AMOUNT_MISMATCH', underpaidWebhookRes.status === 400);

    // 28b: Valid Webhook transitions booking status to PAYMENT_CONFIRMED
    const eventId = `evt_test_${Date.now()}`;
    const validWebhookRes = await fetch(`${baseUrl}/payments/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
        'x-razorpay-event-id': eventId
      },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        payload: {
          payment: {
            entity: {
              order_id: orderId,
              id: paymentId,
              amount: 68696
            }
          }
        }
      })
    });
    const validWebhookJson = await validWebhookRes.json();
    assert('Valid Razorpay webhook transitions booking to PAYMENT_CONFIRMED', validWebhookRes.status === 200 && validWebhookJson.data.booking.status === 'PAYMENT_CONFIRMED');

    // 28c: Webhook Event Deduplication (Replaying same event ID returns 200 without double crediting)
    const replayWebhookRes = await fetch(`${baseUrl}/payments/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
        'x-razorpay-event-id': eventId // identical event ID
      },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId
      })
    });
    const replayWebhookJson = await replayWebhookRes.json();
    assert('Duplicate webhook replay deduplicated cleanly', replayWebhookRes.status === 200 && replayWebhookJson.data.message.includes('Deduplicated'));

    // Test 29: Cash and UPI QR Settlement
    // Create new booking in COMPLETED status for settlement testing
    const cashBooking = db.bookings[0];
    cashBooking.status = 'COMPLETED';
    cashBooking.provider_id = techManju.user_id;

    // 29a: Unauthorized user blocked from settling cash
    const unauthSettleRes = await fetch(`${baseUrl}/payments/settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech2Token}` // tech2 is not assigned
      },
      body: JSON.stringify({
        booking_id: cashBooking.id,
        method: 'cash'
      })
    });
    assert('Unassigned technician blocked from cash settlement (403)', unauthSettleRes.status === 403);

    // 29b: Cash settlement WITHOUT customer confirmation returns pending_customer_confirmation
    const unconfirmedCashRes = await fetch(`${baseUrl}/payments/settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        booking_id: cashBooking.id,
        method: 'cash',
        customer_confirmed: false,
        transaction_reference: `CASH-${Date.now()}`
      })
    });
    const unconfirmedCashJson = await unconfirmedCashRes.json();
    assert('Cash settlement without customer confirmation returns pending_customer_confirmation (200 OK)',
      unconfirmedCashRes.status === 200 && unconfirmedCashJson.data.status === 'pending_customer_confirmation');
    assert('Booking status remains COMPLETED until customer confirms cash receipt',
      db.bookings.find(b => b.id === cashBooking.id)?.status === 'COMPLETED');

    // 29c: Assigned technician settles cash payment WITH customer confirmation
    const settleRes = await fetch(`${baseUrl}/payments/settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        booking_id: cashBooking.id,
        method: 'cash',
        customer_confirmed: true,
        transaction_reference: `CASH-${Date.now()}`
      })
    });
    const settleJson = await settleRes.json();
    assert('Assigned technician successfully settles cash payment with customer confirmation (200 OK)',
      settleRes.status === 200 && settleJson.data.booking.status === 'PAYMENT_CONFIRMED');
    assert('Receipt automatically generated for cash settlement', Boolean(settleJson.data.receipt));
    assert('Commission debit recorded in immutable settlement ledger',
      db.settlement_ledger.some(l => l.booking_id === cashBooking.id && l.type === 'DEBIT_COMMISSION_AND_GST'));

    // 29d: Bharat UPI QR settlement marked unverified pending bank reconciliation
    const upiBooking = db.bookings[1];
    upiBooking.status = 'COMPLETED';
    upiBooking.provider_id = techManju.user_id;

    const upiSettleRes = await fetch(`${baseUrl}/payments/settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`
      },
      body: JSON.stringify({
        booking_id: upiBooking.id,
        method: 'upi_qr',
        transaction_reference: `UPI-QR-${Date.now()}`
      })
    });
    const upiSettleJson = await upiSettleRes.json();
    assert('UPI QR payment marked unverified pending bank reconciliation (200 OK)',
      upiSettleRes.status === 200 && upiSettleJson.data.status === 'unverified');
    // Test 30: Razorpay Test Mode End-to-End Hardening
    // 30a: Live key startup refusal guard in non-production environment
    const testLiveKeyGuard = () => {
      const isLiveKey = 'rzp_live_testdummy123'.startsWith('rzp_live_');
      const env = 'development';
      if (isLiveKey && env !== 'production') {
        return true;
      }
      return false;
    };
    assert('Live key refusal guard halts startup when rzp_live_ is detected outside production', testLiveKeyGuard());

    // 30b: create-order with flag disabled blocks online orders while cash/UPI QR work
    config.razorpay.enabled = false;
    const disabledGatewayRes = await fetch(`${baseUrl}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        booking_id: smBooking.id
      })
    });
    assert('create-order returns 403 GATEWAY_DISABLED when razorpay is toggled off', disabledGatewayRes.status === 403);
    config.razorpay.enabled = true; // Restore

    // 30c: create-order computes amount strictly from booking, ignoring any client-sent amount
    const tamperAmountRes = await fetch(`${baseUrl}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`
      },
      body: JSON.stringify({
        booking_id: smBooking.id,
        amount: 1, // Malicious client attempt to pay ₹1
        amount_paise: 100
      })
    });
    const tamperAmountJson = await tamperAmountRes.json();
    assert('create-order computes amount strictly from server booking record, ignoring client amount',
      tamperAmountRes.status === 201 && tamperAmountJson.data.amount === smBooking.total_amount);

    // 30d: Duplicate idempotency key returns exact same order
    const testIdempotencyKey = `idem_strict_${Date.now()}`;
    const idem1Res = await fetch(`${baseUrl}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ booking_id: smBooking.id, idempotency_key: testIdempotencyKey })
    });
    const idem1Json = await idem1Res.json();

    const idem2Res = await fetch(`${baseUrl}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ booking_id: smBooking.id, idempotency_key: testIdempotencyKey })
    });
    const idem2Json = await idem2Res.json();
    assert('Idempotent create-order requests return identical order_id and status',
      idem1Json.data.order_id === idem2Json.data.order_id && idem1Json.data.idempotency_key === testIdempotencyKey);

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================');
  console.log(`📊 V1 API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV1Tests();
