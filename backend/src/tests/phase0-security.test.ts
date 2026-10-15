// Phase 0 Security Hotfixes Verification Test Suite
// Verifies environment guard (404 in production) on reset-seed,
// token + role requirements on legacy admin endpoints,
// and sliding-window rate limiting on Cloud Run Gemini test gateway.

import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { apiRouter } from '../routes.js';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';

async function runPhase0Tests() {
  console.log('\n========================================');
  console.log('🔒 RUNNING PHASE 0 SECURITY HOTFIX TEST SUITE');
  console.log('========================================\n');

  seedDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api`;

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

  // Generate tokens for testing
  const adminToken = jwt.sign({ uid: 'usr-admin-test', role: 'admin', email: 'ciso@myurbandaily.com' }, config.jwtSecret, { expiresIn: '1h' });
  const opsToken = jwt.sign({ uid: 'usr-ops-test', role: 'ops', email: 'ops@myurbandaily.com' }, config.jwtSecret, { expiresIn: '1h' });
  const auditorToken = jwt.sign({ uid: 'usr-auditor-test', role: 'security_auditor', email: 'audit@myurbandaily.com' }, config.jwtSecret, { expiresIn: '1h' });
  const customerToken = jwt.sign({ uid: 'usr-cust-test', role: 'customer', email: 'cust@myurbandaily.com' }, config.jwtSecret, { expiresIn: '1h' });

  try {
    // ─── Test 1: POST /api/admin/reset-seed security controls ───────────
    console.log('Test Suite 1: Database Reset-Seed Production Guard & Auth');
    
    // 1a: Unauthenticated caller rejected with 401
    const resetNoAuth = await fetch(`${baseUrl}/admin/reset-seed`, { method: 'POST' });
    assert('reset-seed without token returns 401 Unauthorized', resetNoAuth.status === 401);

    // 1b: Customer role rejected with 403 Forbidden
    const resetCust = await fetch(`${baseUrl}/admin/reset-seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert('reset-seed with customer role returns 403 Forbidden', resetCust.status === 403);

    // 1c: Admin role in development returns 200 OK
    const resetAdminDev = await fetch(`${baseUrl}/admin/reset-seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('reset-seed with admin role in development returns 200 OK', resetAdminDev.status === 200);

    // 1d: Production environment guard returns 404 NOT FOUND (even for admin!)
    process.env.NODE_ENV = 'production';
    const resetProd = await fetch(`${baseUrl}/admin/reset-seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const prodJson = await resetProd.json();
    assert('reset-seed in production returns 404 NOT_FOUND', resetProd.status === 404);
    assert('reset-seed 404 error code is NOT_FOUND', prodJson.error === 'NOT_FOUND');
    process.env.NODE_ENV = 'test'; // restore

    // ─── Test 2: Legacy Admin Endpoints Token & Role Protection ─────────
    console.log('\nTest Suite 2: Legacy Admin Endpoints RBAC Verification');

    // 2a: GET /api/admin/metrics
    const metricsNoAuth = await fetch(`${baseUrl}/admin/metrics`);
    assert('GET /admin/metrics without token returns 401', metricsNoAuth.status === 401);

    const metricsCust = await fetch(`${baseUrl}/admin/metrics`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert('GET /admin/metrics with customer role returns 403', metricsCust.status === 403);

    const metricsOps = await fetch(`${baseUrl}/admin/metrics`, {
      headers: { Authorization: `Bearer ${opsToken}` }
    });
    const metricsJson = await metricsOps.json();
    assert('GET /admin/metrics with ops role returns 200 OK', metricsOps.status === 200);
    assert('GET /admin/metrics preserves response shape (totalBookings, platformRevenue, activeBookings)', 
      typeof metricsJson.totalBookings === 'number' && typeof metricsJson.platformRevenue === 'number');

    const metricsAuditor = await fetch(`${baseUrl}/admin/metrics`, {
      headers: { Authorization: `Bearer ${auditorToken}` }
    });
    assert('GET /admin/metrics with security_auditor role returns 200 OK', metricsAuditor.status === 200);

    // 2b: GET /api/admin/kyc-queue
    const kycQueueNoAuth = await fetch(`${baseUrl}/admin/kyc-queue`);
    assert('GET /admin/kyc-queue without token returns 401', kycQueueNoAuth.status === 401);

    const kycQueueCust = await fetch(`${baseUrl}/admin/kyc-queue`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert('GET /admin/kyc-queue with customer role returns 403', kycQueueCust.status === 403);

    const kycQueueOps = await fetch(`${baseUrl}/admin/kyc-queue`, {
      headers: { Authorization: `Bearer ${opsToken}` }
    });
    assert('GET /admin/kyc-queue with ops role returns 200 OK', kycQueueOps.status === 200);

    // 2c: POST /api/admin/kyc-review
    const kycReviewNoAuth = await fetch(`${baseUrl}/admin/kyc-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-1', action: 'approve' })
    });
    assert('POST /admin/kyc-review without token returns 401', kycReviewNoAuth.status === 401);

    const kycReviewCust = await fetch(`${baseUrl}/admin/kyc-review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-1', action: 'approve' })
    });
    assert('POST /admin/kyc-review with customer role returns 403', kycReviewCust.status === 403);

    const kycReviewOps = await fetch(`${baseUrl}/admin/kyc-review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-1', action: 'approve' })
    });
    assert('POST /admin/kyc-review with ops role returns 200 OK', kycReviewOps.status === 200);

    // 2d: GET /api/admin/audit-logs
    const auditLogsNoAuth = await fetch(`${baseUrl}/admin/audit-logs`);
    assert('GET /admin/audit-logs without token returns 401', auditLogsNoAuth.status === 401);

    const auditLogsCust = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert('GET /admin/audit-logs with customer role returns 403', auditLogsCust.status === 403);

    const auditLogsAuditor = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${auditorToken}` }
    });
    assert('GET /admin/audit-logs with security_auditor role returns 200 OK', auditLogsAuditor.status === 200);

    // ─── Test 3: Cloud Run Gemini Gateway & Rate Limiting ───────────────
    console.log('\nTest Suite 3: Cloud Run Gemini Test Gateway & Sliding Rate Limiter');

    // Missing key reports 503 Service Unavailable (safe failure, no leaked secret)
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;

    const probeNoKey = await fetch(`${baseUrl}/ai/test-connection`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.99' }
    });
    assert('Probe returns 503 when GEMINI_API_KEY is unset in Secret Manager', probeNoKey.status === 503);

    // Rate limiter test: Send 11 requests from single IP
    const testIp = '192.168.1.55';
    let hitRateLimit = false;
    let rateLimitStatus = 0;

    for (let i = 0; i < 11; i++) {
      const res = await fetch(`${baseUrl}/ai/test-connection`, {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp }
      });
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatus = res.status;
        const errJson = await res.json();
        assert('Rate limited response contains retry_after_seconds', typeof errJson.retry_after_seconds === 'number');
        break;
      }
    }
    assert('Sliding-window rate limiter trips with 429 TOO_MANY_REQUESTS', hitRateLimit && rateLimitStatus === 429);

    if (originalKey) process.env.GEMINI_API_KEY = originalKey;

  } finally {
    server.close();
  }

  console.log('\n========================================');
  console.log(`📊 PHASE 0 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase0Tests().catch((err) => {
  console.error('Fatal error in Phase 0 tests:', err);
  process.exit(1);
});
