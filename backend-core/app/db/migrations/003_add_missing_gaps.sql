-- Migration: Add Missing Gap Analysis Fields
-- Description: Adds Tangible Book Value, Minority Interest, and Deferred Tax Assets to Balance Sheets
-- Date: 2026-01-26

ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS tangible_book_value DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS minority_interest DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS deferred_tax_assets DECIMAL(20, 2);

-- Verification logic (commented out for execution)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'balance_sheets' AND column_name IN ('tangible_book_value', 'minority_interest', 'deferred_tax_assets');
