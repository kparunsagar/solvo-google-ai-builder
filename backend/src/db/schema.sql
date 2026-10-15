-- Sagara Local Services Marketplace — Production PostgreSQL Schema (Zone 4)
-- Tailored for Sagara, Karnataka (577401)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Customers, Providers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'provider', 'admin')),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    preferred_language VARCHAR(5) DEFAULT 'en' CHECK (preferred_language IN ('en', 'kn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Providers KYC & Operational Profile
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    trade_categories JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["plumbing", "electrical"]
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'suspended')),
    kyc_documents JSONB DEFAULT '{}'::jsonb, -- Aadhaar, Trade License, Bank Passbook URLs
    aadhaar_number VARCHAR(20),
    trade_license_number VARCHAR(50),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_reviews INT DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    current_lat NUMERIC(9, 6) DEFAULT 14.1670,
    current_lng NUMERIC(9, 6) DEFAULT 75.0298,
    service_radius_km INT DEFAULT 15,
    bank_account_info JSONB DEFAULT '{}'::jsonb,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00,
    pending_payout NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Saved Addresses (Sagara Localities)
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home', -- Home, Shop, Office
    locality VARCHAR(100) NOT NULL, -- Gandhi Nagar, Keladi Rd, Vinobha Nagar, etc.
    landmark VARCHAR(255),
    full_address TEXT NOT NULL,
    lat NUMERIC(9, 6) NOT NULL DEFAULT 14.1670,
    lng NUMERIC(9, 6) NOT NULL DEFAULT 75.0298,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Categories (Plumbing, Electrical, Cleaning, Appliance, Carpentry, Painting, etc.)
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_kn VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    description TEXT,
    base_inspection_fee NUMERIC(10, 2) NOT NULL DEFAULT 149.00,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0
);

-- Services Catalog
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_kn VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'job', -- 'job', 'hour', 'point'
    estimated_duration_mins INT DEFAULT 60,
    included_tasks JSONB DEFAULT '[]'::jsonb,
    excluded_tasks JSONB DEFAULT '[]'::jsonb,
    warranty_days INT DEFAULT 30,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Real-Time Bookings (8-Stage Lifecycle)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED' CHECK (
        status IN (
            'REQUESTED',
            'PROVIDER_MATCHED',
            'ACCEPTED',
            'ON_THE_WAY',
            'ARRIVED',
            'SERVICE_IN_PROGRESS',
            'COMPLETED',
            'PAYMENT_CONFIRMED',
            'REVIEWED',
            'CANCELLED'
        )
    ),
    scheduled_type VARCHAR(20) DEFAULT 'instant' CHECK (scheduled_type IN ('instant', 'scheduled')),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    address_locality VARCHAR(100) NOT NULL,
    address_text TEXT NOT NULL,
    address_lat NUMERIC(9, 6) NOT NULL,
    address_lng NUMERIC(9, 6) NOT NULL,
    customer_notes TEXT,
    otp VARCHAR(6) NOT NULL, -- 4-digit OTP shown to customer, verified by provider on arrival
    cancellation_reason TEXT,
    base_amount NUMERIC(10, 2) NOT NULL,
    parts_materials_amount NUMERIC(10, 2) DEFAULT 0.00,
    platform_commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    provider_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Booking Lifecycle Audit Trail (Status Events)
CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    triggered_by UUID REFERENCES users(id),
    note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions & Webhook Verification Ledger
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(30) DEFAULT 'upi', -- upi, card, netbanking, cash_on_delivery
    gateway VARCHAR(30) DEFAULT 'razorpay',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    signature_verified BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
    webhook_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Reviews & Ratings
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags JSONB DEFAULT '[]'::jsonb, -- e.g. ["Punctual", "Cleaned up", "Polite", "Expert"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tamper-Evident Admin & Security Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_role VARCHAR(20),
    action VARCHAR(100) NOT NULL, -- KYC_APPROVED, PRICING_UPDATED, REFUND_ISSUED, etc.
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_providers_kyc ON providers(kyc_status);
CREATE INDEX IF NOT EXISTS idx_providers_available ON providers(is_available, is_online);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at DESC);
