-- ============================================================
-- MIGRATION 004: Enable Row Level Security on ALL Public Tables
-- ============================================================
-- Purpose: Fix 97 Supabase Security Advisor errors (RLS Disabled)
--          + Fix 1 Warning (pg_trgm extension in public schema)
-- 
-- SAFETY: Both backend (asyncpg) and frontend (pg Pool) connect
--         as 'postgres' superuser which BYPASSES RLS entirely.
--         This migration only protects against unauthorized
--         access via Supabase's REST/GraphQL API (anon/authenticated keys).
-- ============================================================

-- ============================================================
-- PART 1: Fix pg_trgm extension warning
-- Move from 'public' schema to 'extensions' schema
-- ============================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop from public and recreate in extensions
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ============================================================
-- PART 2: Enable RLS on ALL 91 public tables
-- ============================================================

-- === PUBLIC MARKET DATA TABLES (read-only for anon/authenticated) ===

ALTER TABLE public.analyst_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividend_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egx_market_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egx_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fair_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ratios_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ratios_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_nav_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.index_constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.index_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_trading ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_15m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_1h ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_1m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_2m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_30m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_5m ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_ohlc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_shareholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_breadth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_ohlc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ohlc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ohlc_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_averages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unresolved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_ohlc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yahoo_cache ENABLE ROW LEVEL SECURITY;

-- === USER-PRIVATE DATA TABLES ===

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- === SYSTEM/ADMIN-ONLY TABLES ===

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: Create RLS Policies
-- ============================================================
-- Strategy:
--   - Public market data: SELECT allowed for anon + authenticated
--   - User-private data: No access via Supabase API (service_role only)
--   - Admin/system data: No access via Supabase API (service_role only)
--
-- The postgres superuser (used by our backend) bypasses all RLS.
-- service_role key also bypasses RLS by default in Supabase.
-- ============================================================

-- === PUBLIC MARKET DATA: Allow SELECT for all API users ===

CREATE POLICY "Public read access" ON public.analyst_ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.balance_sheets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.cashflow_statements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.company_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.corporate_actions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.corporate_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.dividend_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.earnings_calendar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.earnings_estimates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.earnings_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.economic_indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.egx_market_summary FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.egx_watchlist FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.etfs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fair_values FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.financial_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.financial_ratios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.financial_ratios_extended FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.financial_ratios_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.financial_statements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_actions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_aliases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_disclosures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_investments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_nav_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_peers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.fund_statistics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.income_statements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.index_constituents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.index_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.insider_trading FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.insider_transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.institutional_holders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_15m FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_1h FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_1m FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_2m FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_30m FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_5m FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_data FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.intraday_ohlc FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.ipo_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.macro_data FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.macro_insights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.major_shareholders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.market_breadth FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.market_news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.market_tickers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.monthly_ohlc FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.mutual_funds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.nav_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.ohlc_data FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.ohlc_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.order_book_snapshot FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.ownership_breakdown FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.sector_averages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.sector_classification FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.sector_performance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.segment_revenue FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.split_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.stock_statistics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.technical_levels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.ticker_aliases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.unresolved_queries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.valuation_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.volume_statistics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.weekly_ohlc FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.yahoo_cache FOR SELECT TO anon, authenticated USING (true);

-- === USER-PRIVATE DATA: No policies for anon/authenticated ===
-- These tables have RLS enabled but NO permissive policies,
-- which means anon/authenticated users cannot access them at all.
-- Only postgres (superuser) and service_role (bypasses RLS) can access.
-- No policies needed — RLS enabled + no policies = deny all for non-superusers.

-- === SYSTEM/ADMIN TABLES: No policies for anon/authenticated ===
-- Same as above — RLS enabled with no policies = deny all.
-- Only our backend (postgres superuser) can access these.

-- ============================================================
-- VERIFICATION QUERY (run this to confirm)
-- ============================================================
SELECT 
    'RLS Status' as check_type,
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled,
    COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled
FROM pg_tables 
WHERE schemaname = 'public';
