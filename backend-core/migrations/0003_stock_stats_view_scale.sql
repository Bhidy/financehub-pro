-- 0003_stock_stats_view_scale.sql
-- ============================================================================
-- FIX: stock_stats_view emitted audited monetary fields in EGP-MILLIONS
-- (income_statements / balance_sheets are stored in millions), but every
-- consumer renders them as absolute EGP -> "EGP 82.24K" instead of "EGP 82.24B",
-- and exposed total_equity mislabeled as "Book Value / Share" (231514 vs ~68.5).
--
-- This rebuild:
--   * scales the monetary OUTPUT columns to ABSOLUTE EGP (x 1,000,000):
--       net_income_ttm, total_debt, book_value
--   * adds a TRUE per-share book value `bvps` = total_equity / shares
--       (both in millions -> ratio is scale-invariant, yields ~68.5 for COMI)
--   * adds `shares_outstanding` in ABSOLUTE share count (x 1,000,000)
--   * leaves ratios unchanged (roe/roa/margins/growth are scale-invariant and
--     are computed from the RAW millions values, so they stay correct)
--   * keeps EVERY pre-existing column name (only adds bvps + shares_outstanding)
--     so all 3 consumers (company/profile, egx/statistics, ratios) keep working.
-- Uses DROP + CREATE (column types/positions change, which CREATE OR REPLACE
-- forbids). Run inside a transaction so consumers never see a missing view.
-- ============================================================================

DROP VIEW IF EXISTS stock_stats_view;
CREATE VIEW stock_stats_view AS
SELECT
    mt.symbol,
    mt.market_code,
    mt.name_en,
    mt.name_ar,
    mt.sector_name,
    mt.currency,
    mt.last_price,
    mt.pe_ratio,
    mt.pb_ratio,
    mt.dividend_yield,
    mt.market_cap,
    mt.beta AS beta_5y,
    t.rsi AS rsi_14,
    t.sma50 AS ma_50d,
    t.sma200 AS ma_200d,
    i.gross_margin,
    i.operating_margin,
    i.net_margin AS profit_margin,
    i.revenue_growth,
    i.net_income_growth AS profit_growth,
    i.eps_growth,
    i.eps AS eps_ttm,
    -- monetary -> absolute EGP
    (i.revenue * 1000000::numeric) AS revenue_ttm,
    (i.net_income * 1000000::numeric) AS net_income_ttm,
    -- ratios computed from RAW millions values (scale cancels) -> unchanged
    CASE WHEN b.total_equity > 0::numeric
         THEN round(i.net_income / b.total_equity * 100::numeric, 2)
         ELSE NULL::numeric END AS roe,
    CASE WHEN b.total_assets > 0::numeric
         THEN round(i.net_income / b.total_assets * 100::numeric, 2)
         ELSE NULL::numeric END AS roa,
    (b.total_debt * 1000000::numeric) AS total_debt,
    (b.total_equity * 1000000::numeric) AS book_value,
    -- TRUE per-share book value (millions / millions = correct per-share EGP)
    CASE WHEN i.shares_outstanding > 0::numeric
         THEN round(b.total_equity / i.shares_outstanding, 4)
         ELSE NULL::numeric END AS bvps,
    -- absolute share count
    (i.shares_outstanding * 1000000::numeric) AS shares_outstanding,
    'tradingview+yahoo'::text AS source
FROM market_tickers mt
LEFT JOIN LATERAL (
    SELECT rsi, sma50, sma200
    FROM egx_technicals
    WHERE symbol = mt.symbol::text AND timeframe = '1D'::text
    ORDER BY updated_at DESC
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT gross_margin, operating_margin, net_margin, revenue_growth,
           net_income_growth, eps_growth, eps, revenue, net_income, shares_outstanding
    FROM income_statements
    WHERE symbol::text = mt.symbol::text AND period_type::text = 'annual'::text
    ORDER BY fiscal_year DESC
    LIMIT 1
) i ON true
LEFT JOIN LATERAL (
    SELECT total_equity, total_assets, total_debt
    FROM balance_sheets
    WHERE symbol::text = mt.symbol::text AND period_type::text = 'annual'::text
    ORDER BY fiscal_year DESC
    LIMIT 1
) b ON true
WHERE mt.market_code::text = 'EGX'::text;
