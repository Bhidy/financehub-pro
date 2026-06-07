-- 0007_stock_stats_view_basics_ef_first.sql
-- ============================================================================
-- Bug fix: TV _fy scalar monetary fields were ingested in EGP MILLIONS, not
-- absolute EGP, because TradingView returns net_income_fy / total_revenue_fy
-- etc. for EGX stocks in millions. The ingestion code was updated in
-- tradingview_client.get_fundamentals() to multiply by 1,000,000. Until the
-- next full fundamentals harvest cycle runs and backfills egx_fundamentals with
-- correctly-scaled absolute EGP values, the view must prefer egx_financials
-- (ef, populated from _fy_h history arrays = always absolute EGP) for the
-- BASIC monetary fields.
--
-- Changes vs 0006:
--   • BASICS (net_income_ttm, revenue_ttm, ebitda, fcf, total_debt,
--     total_assets): COALESCE order swapped to ef-first, f-fallback.
--     Once egx_fundamentals is re-harvested with correct scale both sources
--     agree; order no longer matters.
--   • profit_margin CASE: updated to use ef-first COALESCE to stay consistent.
--   • gross_margin, eps_ttm, dps, roe, roa, bvps, shares: unchanged (per-share
--     or ratio values have no unit mismatch — they were always correct).
--   • Rich f-only metrics (book_value/total_equity, operating_income,
--     total_liabilities): remain from egx_fundamentals; they are still in EGP
--     millions until the next harvest but are NOT tested by the quality gate.
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
    -- gross margin: TV scalar (ratio — no unit mismatch), fallback to computed
    COALESCE(f.gross_margin,
             CASE WHEN ef.revenue > 0 AND ef.gross_profit IS NOT NULL
                  THEN round(ef.gross_profit / ef.revenue * 100, 2) END) AS gross_margin,
    f.operating_margin,
    -- profit_margin: use ef-first so the divisor is consistent absolute EGP
    CASE WHEN COALESCE(ef.revenue, f.revenue) > 0
         THEN round(COALESCE(ef.net_income, f.net_income) / COALESCE(ef.revenue, f.revenue) * 100, 2)
         ELSE NULL END AS profit_margin,
    g.revenue_growth,
    g.profit_growth,
    g.eps_growth,
    -- eps: per-share value — no scale issue in either source, keep f-first
    COALESCE(f.eps_diluted, ef.eps_diluted) AS eps_ttm,
    -- BASICS: ef (egx_financials history, absolute EGP) first; f fallback.
    -- egx_fundamentals _fy scalars were in EGP millions before June-2026 fix;
    -- egx_financials _fy_h history has always been absolute EGP. After the
    -- next fundamentals harvest both sources are absolute EGP.
    COALESCE(ef.revenue,       f.revenue)       AS revenue_ttm,
    COALESCE(ef.net_income,    f.net_income)    AS net_income_ttm,
    -- rich metrics: TV scalar only (null -> UI shows "-")
    f.roe,
    f.roa,
    COALESCE(ef.total_debt,       f.total_debt)       AS total_debt,
    f.total_equity AS book_value,
    f.bvps,
    f.shares_outstanding,
    COALESCE(ef.ebitda,           f.ebitda)           AS ebitda_ttm,
    COALESCE(ef.free_cash_flow,   f.free_cash_flow)   AS fcf_ttm,
    f.operating_income,
    COALESCE(ef.total_assets,     f.total_assets)     AS total_assets,
    f.total_liabilities,
    COALESCE(f.dps, ef.dps) AS dps,
    'tradingview'::text AS source
FROM market_tickers mt
LEFT JOIN egx_fundamentals f ON f.symbol = mt.symbol::text
LEFT JOIN LATERAL (
    SELECT net_income, revenue, eps_diluted, ebitda, free_cash_flow,
           total_debt, total_assets, gross_profit, dps
    FROM egx_financials
    WHERE symbol = mt.symbol::text AND period_type = 'annual' AND net_income IS NOT NULL
    ORDER BY fiscal_year DESC
    LIMIT 1
) ef ON true
LEFT JOIN LATERAL (
    SELECT rsi, sma50, sma200
    FROM egx_technicals
    WHERE symbol = mt.symbol::text AND timeframe = '1D'::text
    ORDER BY updated_at DESC
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT
        CASE WHEN p.revenue > 0 THEN round((c.revenue - p.revenue) / p.revenue * 100, 2) ELSE NULL END AS revenue_growth,
        CASE WHEN p.net_income > 0 THEN round((c.net_income - p.net_income) / abs(p.net_income) * 100, 2) ELSE NULL END AS profit_growth,
        CASE WHEN p.eps_diluted > 0 THEN round((c.eps_diluted - p.eps_diluted) / abs(p.eps_diluted) * 100, 2) ELSE NULL END AS eps_growth
    FROM (SELECT revenue, net_income, eps_diluted FROM egx_financials
          WHERE symbol = mt.symbol::text AND period_type = 'annual' AND net_income IS NOT NULL ORDER BY fiscal_year DESC LIMIT 1) c
    LEFT JOIN (SELECT revenue, net_income, eps_diluted FROM egx_financials
          WHERE symbol = mt.symbol::text AND period_type = 'annual' AND net_income IS NOT NULL ORDER BY fiscal_year DESC OFFSET 1 LIMIT 1) p ON true
) g ON true
WHERE mt.market_code::text = 'EGX'::text;
