-- 0009: stock_stats_view — honest TTM/FY split + TV-only lineage (June-2026 audit)
-- Changes vs 0007:
--   * eps_ttm / revenue_ttm / net_income_ttm / fcf_ttm now carry TradingView's
--     REAL TTM fields (egx_fundamentals.*_ttm). Previously they carried FY values
--     under a TTM name -> every "(TTM)" label on the site was a mislabel.
--   * NEW eps_fy / revenue_fy / net_income_fy / fcf_fy / ebitda_fy expose the FY
--     values under their true name (UI falls back to these with an "(FY)" label).
--   * ebitda_ttm output REMOVED (no TTM source; was FY mislabeled).
--   * profit_margin is now TradingView's net_margin (FY) — house computation removed
--     (source-only display policy). gross_margin house-fallback computation removed.
--   * beta_5y output RENAMED beta_1y (market_tickers.beta now carries TV beta_1_year).
--   * NEW forward_pe, float_shares_percent, float_shares, shareholders_count from
--     market_tickers (TV prices cycle).
DROP VIEW IF EXISTS stock_stats_view;
CREATE VIEW stock_stats_view AS
 SELECT mt.symbol,
    mt.market_code,
    mt.name_en,
    mt.name_ar,
    mt.sector_name,
    mt.currency,
    mt.last_price,
    mt.pe_ratio,
    mt.forward_pe,
    mt.pb_ratio,
    mt.dividend_yield,
    mt.market_cap,
    mt.beta AS beta_1y,
    mt.float_shares_percent,
    mt.float_shares,
    mt.shareholders_count,
    t.rsi AS rsi_14,
    t.sma50 AS ma_50d,
    t.sma200 AS ma_200d,
    f.gross_margin,
    f.operating_margin,
    f.net_margin AS profit_margin,
    g.revenue_growth,
    g.profit_growth,
    g.eps_growth,
    f.eps_diluted_ttm AS eps_ttm,
    f.revenue_ttm,
    f.net_income_ttm,
    f.free_cash_flow_ttm AS fcf_ttm,
    COALESCE(f.eps_diluted, ef.eps_diluted) AS eps_fy,
    COALESCE(ef.revenue, f.revenue) AS revenue_fy,
    COALESCE(ef.net_income, f.net_income) AS net_income_fy,
    COALESCE(ef.free_cash_flow, f.free_cash_flow) AS fcf_fy,
    COALESCE(ef.ebitda, f.ebitda) AS ebitda_fy,
    f.roe,
    f.roa,
    COALESCE(ef.total_debt, f.total_debt) AS total_debt,
    f.total_equity AS book_value,
    f.bvps,
    f.shares_outstanding,
    f.operating_income,
    COALESCE(ef.total_assets, f.total_assets) AS total_assets,
    f.total_liabilities,
    COALESCE(f.dps, ef.dps) AS dps,
    'tradingview'::text AS source
   FROM market_tickers mt
     LEFT JOIN egx_fundamentals f ON f.symbol = mt.symbol::text
     LEFT JOIN LATERAL ( SELECT egx_financials.net_income,
            egx_financials.revenue,
            egx_financials.eps_diluted,
            egx_financials.ebitda,
            egx_financials.free_cash_flow,
            egx_financials.total_debt,
            egx_financials.total_assets,
            egx_financials.gross_profit,
            egx_financials.dps
           FROM egx_financials
          WHERE egx_financials.symbol = mt.symbol::text AND egx_financials.period_type = 'annual'::text AND egx_financials.net_income IS NOT NULL
          ORDER BY egx_financials.fiscal_year DESC
         LIMIT 1) ef ON true
     LEFT JOIN LATERAL ( SELECT egx_technicals.rsi,
            egx_technicals.sma50,
            egx_technicals.sma200
           FROM egx_technicals
          WHERE egx_technicals.symbol = mt.symbol::text AND egx_technicals.timeframe = '1D'::text
          ORDER BY egx_technicals.updated_at DESC
         LIMIT 1) t ON true
     LEFT JOIN LATERAL ( SELECT
                CASE
                    WHEN p.revenue > 0::numeric THEN round((c.revenue - p.revenue) / p.revenue * 100::numeric, 2)
                    ELSE NULL::numeric
                END AS revenue_growth,
                CASE
                    WHEN p.net_income > 0::numeric THEN round((c.net_income - p.net_income) / abs(p.net_income) * 100::numeric, 2)
                    ELSE NULL::numeric
                END AS profit_growth,
                CASE
                    WHEN p.eps_diluted > 0::numeric THEN round((c.eps_diluted - p.eps_diluted) / abs(p.eps_diluted) * 100::numeric, 2)
                    ELSE NULL::numeric
                END AS eps_growth
           FROM ( SELECT egx_financials.revenue,
                    egx_financials.net_income,
                    egx_financials.eps_diluted
                   FROM egx_financials
                  WHERE egx_financials.symbol = mt.symbol::text AND egx_financials.period_type = 'annual'::text AND egx_financials.net_income IS NOT NULL
                  ORDER BY egx_financials.fiscal_year DESC
                 LIMIT 1) c
             LEFT JOIN ( SELECT egx_financials.revenue,
                    egx_financials.net_income,
                    egx_financials.eps_diluted
                   FROM egx_financials
                  WHERE egx_financials.symbol = mt.symbol::text AND egx_financials.period_type = 'annual'::text AND egx_financials.net_income IS NOT NULL
                  ORDER BY egx_financials.fiscal_year DESC
                 OFFSET 1
                 LIMIT 1) p ON true) g ON true
  WHERE mt.market_code::text = 'EGX'::text;
