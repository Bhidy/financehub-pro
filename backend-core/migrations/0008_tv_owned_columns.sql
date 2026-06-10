-- 0008: TradingView-owned ratio/ownership columns + corporate_actions natural key
-- June-2026 symbol-page audit (fabricated-ownership + ratio-rot fixes).
-- Additive + idempotent; safe to run before the writer deploy.

-- market_tickers: columns the TV prices cycle now OWNS (overwrite semantics).
ALTER TABLE market_tickers
  ADD COLUMN IF NOT EXISTS forward_pe NUMERIC,
  ADD COLUMN IF NOT EXISTS float_shares_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS float_shares NUMERIC,
  ADD COLUMN IF NOT EXISTS shareholders_count BIGINT;

-- egx_fundamentals: TRUE trailing-twelve-month fields + TV net margin.
-- The *_ttm outputs of stock_stats_view previously carried FY values (mislabel).
ALTER TABLE egx_fundamentals
  ADD COLUMN IF NOT EXISTS net_margin NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_ttm NUMERIC,
  ADD COLUMN IF NOT EXISTS net_income_ttm NUMERIC,
  ADD COLUMN IF NOT EXISTS eps_diluted_ttm NUMERIC,
  ADD COLUMN IF NOT EXISTS free_cash_flow_ttm NUMERIC;

-- corporate_actions: dedupe then add the natural key so the TV dividends cycle
-- can upsert history idempotently (self-extending history; table was frozen).
DELETE FROM corporate_actions a USING corporate_actions b
  WHERE a.id > b.id AND a.symbol = b.symbol AND a.action_type = b.action_type
    AND a.ex_date IS NOT DISTINCT FROM b.ex_date;
CREATE UNIQUE INDEX IF NOT EXISTS uq_corporate_actions_symbol_type_exdate
  ON corporate_actions(symbol, action_type, ex_date);
