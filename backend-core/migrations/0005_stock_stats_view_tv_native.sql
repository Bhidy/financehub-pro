-- 0005_stock_stats_view_tv_native.sql
-- ============================================================================
-- Repoint stock_stats_view to be 100% TradingView-native.
--
-- Previously it derived monetary metrics from income_statements / balance_sheets
-- (audited, EGP-millions, NO live writer -> would go stale, and net income was on
-- a different basis than the TradingView financials shown elsewhere, causing the
-- page to contradict itself). Now every financial metric comes from
-- egx_fundamentals (TradingView latest-annual, ABSOLUTE EGP, refreshed weekly) +
-- market_tickers + egx_technicals, with YoY growth computed from egx_financials.
--
-- Net effect: Overview/Ratios are TradingView-sourced, internally consistent with
-- the Financials tab, fresh forever, and need NO x1e6 scaling (TV is absolute).
-- Column names are unchanged so all 3 consumers keep working; book_value is
-- absolute total equity, bvps is per-share. Banks legitimately have NULL
-- gross_margin/ebitda (sector-structural).
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
    f.gross_margin,
    f.operating_margin,
    CASE WHEN f.revenue > 0 THEN round(f.net_income / f.revenue * 100, 2) ELSE NULL END AS profit_margin,
    g.revenue_growth,
    g.profit_growth,
    g.eps_growth,
    f.eps_diluted AS eps_ttm,
    f.revenue AS revenue_ttm,
    f.net_income AS net_income_ttm,
    f.roe,
    f.roa,
    f.total_debt,
    f.total_equity AS book_value,
    f.bvps,
    f.shares_outstanding,
    f.ebitda AS ebitda_ttm,
    f.free_cash_flow AS fcf_ttm,
    f.operating_income,
    f.total_assets,
    f.total_liabilities,
    f.dps,
    'tradingview'::text AS source
FROM market_tickers mt
LEFT JOIN egx_fundamentals f ON f.symbol = mt.symbol::text
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
          WHERE symbol = mt.symbol::text AND period_type = 'annual' ORDER BY fiscal_year DESC LIMIT 1) c
    LEFT JOIN (SELECT revenue, net_income, eps_diluted FROM egx_financials
          WHERE symbol = mt.symbol::text AND period_type = 'annual' ORDER BY fiscal_year DESC OFFSET 1 LIMIT 1) p ON true
) g ON true
WHERE mt.market_code::text = 'EGX'::text;
