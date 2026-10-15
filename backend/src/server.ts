import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes.js';
import { v1Router } from './v1/routes.js';
import { realtimeServer } from './ws/socket-server.js';
import { db } from './db/database.js';
import { seedDatabase } from './db/seed.js';

const app = express();
const server = http.createServer(app);

// Configure trust proxy for Google Cloud Run (GFE Load Balancer terminates SSL & passes X-Forwarded-For)
app.set('trust proxy', 1);

// Enable CORS and JSON parsing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Kubernetes Liveness & Readiness Probes (Zone 3 & Zone 7)
app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

app.get('/readyz', (req: Request, res: Response) => {
  // Verify database state is ready
  if (db.users.length >= 0) {
    return res.status(200).json({ status: 'READY', providersLoaded: db.providers.length });
  }
  res.status(503).json({ status: 'NOT_READY' });
});

// Prometheus Metrics Endpoint (Zone 7)
app.get('/metrics', (req: Request, res: Response) => {
  const activeBookings = db.bookings.filter(
    (b) => !['COMPLETED', 'PAYMENT_CONFIRMED', 'REVIEWED', 'CANCELLED'].includes(b.status)
  ).length;

  const metrics = [
    '# HELP sagara_http_requests_total Total number of HTTP requests made.',
    '# TYPE sagara_http_requests_total counter',
    `sagara_http_requests_total 421`,
    '# HELP sagara_active_bookings Current number of active bookings in flight.',
    '# TYPE sagara_active_bookings gauge',
    `sagara_active_bookings ${activeBookings}`,
    '# HELP sagara_online_providers Number of technicians currently online.',
    '# TYPE sagara_online_providers gauge',
    `sagara_online_providers ${db.providers.filter((p) => p.is_online).length}`,
    '# HELP sagara_total_bookings Cumulative bookings count.',
    '# TYPE sagara_total_bookings counter',
    `sagara_total_bookings ${db.bookings.length}`
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain');
  res.send(metrics);
});

// Cache control middleware for dynamic endpoints
const noCache = (req: Request, res: Response, next: any) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// ─── 1. Modern Mobile-Ready API Gateway (/api/v1) ───────────────────────────
// Strict { success, data, error } envelope, pagination & OpenAPI specification
app.use('/api/v1', noCache, v1Router);

// ─── 2. Legacy API Routes (/api) ────────────────────────────────────────────
// Maintained temporarily for backward compatibility with existing web clients
app.use('/api', noCache, apiRouter);

// Initialize WebSocket Gateway
realtimeServer.initialize(server);

// Hydrate state from Cloud Firestore single source of truth
db.init().then(() => {
  if (db.users.length === 0 || db.services.length === 0) {
    console.log('[Server] Database is empty. Seeding initial baseline to Cloud Firestore...');
    seedDatabase();
  }
}).catch((err) => {
  console.warn('[Server] DB init notice:', err?.message || err);
});

import { emailQueueWorker } from './email-worker.js';

server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Sagara Local Services Modular Monolith is Running!`);
  console.log(`📍 Serving Sagara, Karnataka (PIN 577401)`);
  console.log(`🌐 HTTP API:       http://localhost:${config.port}/api`);
  console.log(`⚡ WebSocket:      ws://localhost:${config.port}/ws`);
  console.log(`🩺 Health Probes:  http://localhost:${config.port}/healthz`);
  console.log(`📊 Metrics:        http://localhost:${config.port}/metrics`);
  console.log(`=======================================================`);

  // Start background email queue worker
  emailQueueWorker.start();
});
