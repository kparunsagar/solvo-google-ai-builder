// Real Curl & HTTP Verification Script for Phase 0 Security Hotfixes
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { apiRouter } from '../src/routes.js';
import { config } from '../src/config.js';
import { seedDatabase } from '../src/db/seed.js';

async function main() {
  seedDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(8088, res));
  const baseUrl = 'http://127.0.0.1:8088/api';

  const adminToken = jwt.sign({ uid: 'usr-admin-1', role: 'admin' }, config.jwtSecret, { expiresIn: '1h' });
  const opsToken = jwt.sign({ uid: 'usr-ops-1', role: 'ops' }, config.jwtSecret, { expiresIn: '1h' });
  const custToken = jwt.sign({ uid: 'usr-cust-1', role: 'customer' }, config.jwtSecret, { expiresIn: '1h' });

  console.log('\n======================================================');
  console.log('⚡ PHASE 0 SECURITY LIVE HTTP VERIFICATION RUNNER');
  console.log('======================================================\n');

  async function test(name: string, path: string, options: RequestInit = {}) {
    console.log(`--- [TEST] ${name} ---`);
    console.log(`> ${options.method || 'GET'} ${path}`);
    if (options.headers) {
      console.log(`> Headers:`, JSON.stringify(options.headers));
    }
    const res = await fetch(`${baseUrl}${path}`, options);
    console.log(`< HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    try {
      console.log(`< Body:`, JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(`< Body:`, text);
    }
    console.log('');
  }

  // 1. Reset seed without token -> 401
  await test('POST /api/admin/reset-seed (No Token)', '/admin/reset-seed', { method: 'POST' });

  // 2. Reset seed with customer token -> 403
  await test('POST /api/admin/reset-seed (Customer Role)', '/admin/reset-seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${custToken}` }
  });

  // 3. Reset seed in production guard -> 404
  process.env.NODE_ENV = 'production';
  await test('POST /api/admin/reset-seed (Production Environment Guard)', '/admin/reset-seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  process.env.NODE_ENV = 'development';

  // 4. Reset seed in dev with admin token -> 200
  await test('POST /api/admin/reset-seed (Admin Role Dev)', '/admin/reset-seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  // 5. GET /api/admin/metrics without token -> 401
  await test('GET /api/admin/metrics (No Token)', '/admin/metrics');

  // 6. GET /api/admin/metrics with customer token -> 403
  await test('GET /api/admin/metrics (Customer Token)', '/admin/metrics', {
    headers: { Authorization: `Bearer ${custToken}` }
  });

  // 7. GET /api/admin/metrics with ops token -> 200
  await test('GET /api/admin/metrics (Ops Token)', '/admin/metrics', {
    headers: { Authorization: `Bearer ${opsToken}` }
  });

  // 8. GET /api/admin/kyc-queue without token -> 401
  await test('GET /api/admin/kyc-queue (No Token)', '/admin/kyc-queue');

  // 9. GET /api/admin/kyc-queue with ops token -> 200
  await test('GET /api/admin/kyc-queue (Ops Token)', '/admin/kyc-queue', {
    headers: { Authorization: `Bearer ${opsToken}` }
  });

  // 10. POST /api/ai/test-connection rate limiting check
  await test('POST /api/ai/test-connection (Health / Connectivity Check)', '/ai/test-connection', {
    method: 'POST'
  });

  server.close();
}

main().catch(console.error);
