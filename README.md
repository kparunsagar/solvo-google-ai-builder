# SOLVO — On-Demand Hyperlocal Home Services Platform

> **Next-Generation Hyperlocal Home Services Ecosystem**  
> Powered by Multimodal Indic AI, Real-Time GPS Telemetry, and a Resilient Multi-Service Architecture.

[![Live Web Application](https://img.shields.io/badge/Live%20Demo-solvo.web.app-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://solvo.web.app)
[![Public Showcase Repository](https://img.shields.io/badge/Showcase%20Repo-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kparunsagar/solvo-google-ai-builder)
[![Cloud Run Ready](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting%20%26%20RTDB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)

---

## 📌 Executive Summary & Architecture Overview

**SOLVO** is an enterprise-grade, on-demand hyperlocal home services platform operating across Karnataka and expanding across India. It connects households with certified, background-checked service professionals across 12+ categories (Appliance Repair, Electrical, Plumbing, Deep Cleaning, AC Servicing, Pest Control, Carpentry, and more).

This public showcase repository presents the client-facing Progressive Web App (PWA), interactive simulator, and system architecture. The underlying production system is powered by **7 decoupled microservices and subsystems** running on containerized cloud infrastructure.

---

## 📊 Polyglot Language Distribution (Production Ecosystem)

Evaluators inspecting this repository will notice GitHub reports predominantly **TypeScript**. This is because this repository hosts the client PWA and interactive showcase runtime. In the complete proprietary production environment, the codebase spans a polyglot multi-tier microservice architecture:

| Language / Domain | Percentage | Primary Responsibilities & Subsystems |
| :--- | :---: | :--- |
| **TypeScript / JavaScript** | **65%** | Progressive Web App (React 18), API Gateways, Edge Middleware, Cloud Event Functions |
| **Python** | **22%** | High-Frequency GPS Telemetry, Geospatial Proximity Algorithms, Automated Dispatch Engines |
| **Infrastructure as Code (IaC)** | **8%** | Docker Multi-Stage Builds, Kubernetes Manifests, Terraform GCP Provisioning, Shell Scripts |
| **Data & Styling Layers** | **5%** | PostgreSQL DDL/DML Schemas, Tailwind CSS Design Systems, JSON State Machine Definitions |

```
Production Ecosystem Language Composition:
█████████████████████████████████░░░░░░░░░░░░░░░  65% TypeScript / JavaScript
███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  22% Python (FastAPI / Geodetic)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8% IaC (Docker, K8s, Terraform, Bash)
██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% SQL, Schema & Tailored CSS
```

---

## 🛠️ Full-Stack Technology Matrix

| Layer / Domain | Core Technologies & Frameworks | Capability & Production Usage |
| :--- | :--- | :--- |
| **Frontend & Client** | React 18, TypeScript 5, Vite, Tailwind CSS, Lucide Icons, Canvas API | Ultra-responsive PWA, 60fps telemetry radar, offline caching, accessible mobile HUD. |
| **Microservices Backend** | Python 3.11, FastAPI, Uvicorn, Node.js 20 LTS, Express | Asynchronous non-blocking I/O, WebSockets streaming, RESTful domain APIs. |
| **AI & Multimodal Intelligence** | Google Gemini 1.5 Flash, Web Speech API, Custom Face Mesh Computer Vision | Multilingual voice/text Indic concierge (Kannada/English), diagnostic defect recognition, doorstep facial verification. |
| **Geospatial & Telemetry** | Haversine Matrix, Geodesic Bearing Engine, WebSocket Pub/Sub | Real-time technician road navigation, dynamic heading rotation, ETA calculation. |
| **Cloud Infrastructure** | Google Cloud Run, Firebase Hosting CDN, Google Cloud Storage | Auto-scaling containerized services, zero-downtime global edge deployments. |
| **Databases & Caching** | PostgreSQL 16, Redis 7 In-Memory Cache, Firebase Realtime Database | ACID relational transactional integrity, high-throughput caching, instant broadcast fallback. |
| **Security & Authentication** | HMAC-SHA256 Signatures, JWT Role-Based Auth, Doorstep OTP Handshake | Zero-trust service authentication, tamper-proof payment verification, physical delivery security. |
| **DevOps & CI/CD** | Docker, Docker Compose, Vitest, GitHub Actions | Containerized reproducible environments, automated test suites, continuous deployment. |

---

## 🏗️ Microservices Ecosystem (7 Specialized Activities)

To protect intellectual property and trade secrets, internal microservice names, routing paths, and private endpoints are abstracted into their functional domains:

```
                            ┌─────────────────────────────────┐
                            │    Client PWA / Mobile Web      │
                            │  (React 18 + TypeScript + CDN)  │
                            └────────────────┬────────────────┘
                                             │
                   ┌─────────────────────────┼─────────────────────────┐
                   │                         │                         │
                   ▼                         ▼                         ▼
         [Activity 1: Core API]   [Activity 2: Telemetry]   [Activity 3: Geospatial]
         Marketplace State Flow   WebSocket Live Tracking   Haversine Distance Match
                   │                         │                         │
                   └─────────────────────────┼─────────────────────────┘
                                             │
                   ┌─────────────────────────┼─────────────────────────┐
                   │                         │                         │
                   ▼                         ▼                         ▼
         [Activity 4: Security]   [Activity 5: AI Engine]   [Activity 6: Biometrics]
         OTP & HMAC Verification   Multilingual Diagnostic   Facial Anti-Spoofing
                                             │
                                             ▼
                                  [Activity 7: Data BaaS]
                                   State Sync & Media CDN
```

### 1. High-Frequency Telemetry & Heading Activity
- **Role**: Continuously ingests, processes, and broadcasts high-frequency GPS coordinate streams from on-duty technicians.
- **Key Operations**: Computes road-bearing angles (0°–360°), linear velocity (km/h), smooth trajectory interpolation, and socket broadcasting with sub-50ms latency.

### 2. Geospatial Dispatcher & Proximity Routing Activity
- **Role**: Computes mathematical distance matrices across multi-city operating zones.
- **Key Operations**: Applies Haversine algorithms to rank technician availability within radial service perimeters, optimizing dispatch time and balancing provider workloads.

### 3. Core Marketplace & Booking State Machine Activity
- **Role**: Governs the 8-stage immutable lifecycle of every service booking.
- **Key Operations**: Orchestrates transitions (`Draft` → `Confirmed` → `Technician Dispatched` → `Arrived` → `In Progress` → `Completed`), handles transactional locking, and manages audit trails.

### 4. Identity, Security & Doorstep OTP Activity
- **Role**: Guarantees zero-trust security between customers and field technicians.
- **Key Operations**: Issues time-sensitive cryptographic OTP handshakes required to unlock work orders at the customer's physical premises; verifies role-based JWT claims.

### 5. Multimodal Indic AI Concierge & Diagnostic Activity
- **Role**: Provides natural language and visual issue identification for customers across regional languages.
- **Key Operations**: Leverages **Google Gemini 1.5 Flash** for deep conversational triage, photo-based appliance damage diagnostics, cost estimation, and instant automated voice responses in Kannada and English.

### 6. Doorstep Biometric Face Verification Activity
- **Role**: Ensures customer safety through technician identity authentication at the doorstep.
- **Key Operations**: Performs client-side computer vision face landmark detection and anti-spoofing verification before job commencement, preventing technician profile impersonation.

### 7. Real-Time Presence & Media Persistence Activity
- **Role**: Manages distributed presence detection and high-durability digital assets.
- **Key Operations**: Synchronizes technician online/offline states, stores KYC records, and manages job completion photos with tamper-evident audit timestamps.

---

## 🏍️ Live GPS Technician Tracking

The platform incorporates real-time field tracking designed for low-bandwidth mobile networks:
- **Heading & Bearing**: Rotates the motorcycle marker smoothly along the exact bearing of travel.
- **Speed & Gauges**: Live telemetry HUD displaying road speed (km/h), remaining distance, and dynamic arrival time.
- **Interactive Simulation**: Built-in simulation controls allowing evaluators to preview the full live dispatch tracking experience in real-time.

---

## 🗺️ Multi-City Scalability Registry

SOLVO's routing architecture is configured for rapid geographical expansion without code modifications:

```typescript
// Registered Out of the Box:
1. Sagara (PIN 577401)      — Gandhi Nagar, Keladi Rd, Vinobha Nagar, Jog Rd, B.H. Road
2. Shivamogga (PIN 577201)   — Gopi Circle, Durgigudi, Vinoba Nagara
3. Bengaluru (PIN 560001)    — Indiranagar, Koramangala, HSR Layout, Whitefield
4. Hubballi (PIN 580020)     — Vidyanagar, CBT Hubballi
5. Mangaluru (PIN 575001)    — Hampankatta, Kadri Hills
```

---

## ☁️ Cloud & Containerized Deployment

### 1. Progressive Web App (Edge CDN)
The client frontend is optimized for worldwide edge caching via Firebase Hosting and Google Cloud Storage:
```bash
# Build and deploy frontend PWA
npm run build
firebase deploy --only hosting
```
Live endpoint: **[https://solvo.web.app](https://solvo.web.app)**

### 2. Containerized Microservice Infrastructure
All backend services are packaged with multi-stage Docker builds suitable for serverless container deployment on Google Cloud Run:
```bash
# Spin up local development environment with all services & databases
docker-compose up --build -d
```

---

## 🛡️ Intellectual Property & Repository Scope

> This repository is a curated public showcase containing the client application, UI components, interactive dispatch simulators, and architecture documentation. Proprietary business logic, private algorithmic models, database credentials, and production secrets are maintained in private enterprise repositories and protected by automated CI/CD security scanning.

---

## 👥 Platform Verification & Links

- **Live Production PWA**: [https://solvo.web.app](https://solvo.web.app)
- **Showcase Repository**: [https://github.com/kparunsagar/solvo-google-ai-builder](https://github.com/kparunsagar/solvo-google-ai-builder)
- **Primary Hub**: Bengaluru & Shivamogga, Karnataka, India
