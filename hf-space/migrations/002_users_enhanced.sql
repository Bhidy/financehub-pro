-- ============================================================
-- MIGRATION 002: Enhanced Users & Guest Session Tracking
-- ============================================================
-- Purpose: Add phone field to users, create guest_sessions table
-- for tracking chatbot usage limits (5 questions for guests)
-- ============================================================

-- Ensure users table exists with base fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE
);

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- Guest Session Tracking Table
-- ============================================================
-- Tracks guest usage by device fingerprint to enforce 5-question limit

CREATE TABLE IF NOT EXISTS guest_sessions (
    id SERIAL PRIMARY KEY,
    device_fingerprint VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    question_count INT DEFAULT 0,
    first_question_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_question_at TIMESTAMP WITH TIME ZONE,
    converted_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_fingerprint)
);

-- Index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_guest_sessions_fingerprint ON guest_sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_created ON guest_sessions(created_at);

-- ============================================================
-- Create default admin user (password: Admin123!)
-- ============================================================
-- bcrypt hash for 'Admin123!' with 12 rounds
INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at)
VALUES (
    'admin@finhub.pro',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4FVl.F1eHwE7LPnq',
    'System Admin',
    'admin',
    TRUE,
    NOW()
) ON CONFLICT (email) DO NOTHING;
