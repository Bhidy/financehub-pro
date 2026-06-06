-- 0006_stock_stats_view_coalesce.sql
-- ============================================================================
-- Maximise TradingView coverage without leaving the TV ecosystem.
--
-- egx_fundamentals (TV _fy scalars) has the RICH metrics (ROE, BVPS, equity,
-- operating income/margin, shares) but the scalar is null for ~84 thinly-covered
-- EGX names. egx_financials (TV _h history) has the BASIC metrics (net income,
-- revenue, eps, ebitda, fcf, total debt, total assets, gross profit, dps) for
-- ~209 names. This view COALESCEs the two TV sources:
--   * basics  -> COALESCE(scalar, latest-non-null history)  => ~209 coverage
--   * rich    -> scalar only (roe/roa/bvps/equity/operating/shares)  => ~125
-- Everything is TradingView, absolute EGP, fresh weekly. The Financials tab and
-- Overview/Ratios stay consistent because cycle_fundamentals also syncs the
-- latest egx_financials row from the scalar (scalar wins where present).
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
    -- gross margin: TV scalar, else computed from history
    COALESCE(f.gross_margin,
             CASE WHEN ef.revenue > 0 AND ef.gross_profit IS NOT NULL
                  THEN round(ef.gross_profit / ef.revenue * 100, 2) END) AS gross_margin,
    f.operating_margin,
    CASE WHEN COALESCE(f.revenue, ef.revenue) > 0
         THEN round(COALESCE(f.net_income, ef.net_income) / COALESCE(f.revenue, ef.revenue) * 100, 2)
         ELSE NULL END AS profit_margin,
    g.revenue_growth,
    g.profit_growth,
    g.eps_growth,
    -- basics: prefer TV scalar, fall back to latest-non-null TV history
    COALESCE(f.eps_diluted, ef.eps_diluted) AS eps_ttm,
    COALESCE(f.revenue, ef.revenue) AS revenue_ttm,
    COALESCE(f.net_income, ef.net_income) AS net_income_ttm,
    -- rich metrics: TV scalar only (null -> UI shows "-")
    f.roe,
    f.roa,
    COALESCE(f.total_debt, ef.total_debt) AS total_debt,
    f.total_equity AS book_value,
    f.bvps,
    f.shares_outstanding,
    COALESCE(f.ebitda, ef.ebitda) AS ebitda_ttm,
    COALESCE(f.free_cash_flow, ef.free_cash_flow) AS fcf_ttm,
    f.operating_income,
    COALESCE(f.total_assets, ef.total_assets) AS total_assets,
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
