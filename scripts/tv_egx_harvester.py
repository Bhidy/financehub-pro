#!/usr/bin/env python3
"""
TradingView EGX Harvester
=========================
Standalone, idempotent harvester that pulls EGX data from TradingView (via the
never-single-source EGXFeedRouter) and upserts it into Supabase. Every write is
ON CONFLICT DO UPDATE keyed on a natural unique key, so re-running any cycle N
times converges to identical state (zero duplicates by construction).

Usage:
    DATABASE_URL=... python scripts/tv_egx_harvester.py --cycle prices
    DATABASE_URL=... python scripts/tv_egx_harvester.py --cycle all
Cycles: prices | technicals | dividends | estimates | news | statements | symbolmap | all

Failure model (post 2026-06-07 incident — "column \"sector\" does not exist"):
every per-row DB error is routed by CLASS, never blindly dead-lettered:
  * STRUCTURAL (wrong column / missing table / bad SQL / type mismatch) -> a CODE
    BUG, identical for every row. Fail FAST and LOUD on the first row. Never
    dead-letter it 289x; never retry it.
  * TRANSIENT (pooler drop, connection ceiling, statement timeout) -> reconnect
    and retry the whole idempotent cycle with bounded backoff.
  * DATA (one bad value on one row) -> dead-letter that single row and carry on,
    so one poison row never sinks the cycle.
"""
import argparse
import asyncio
import hashlib
import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend-core"))

import asyncpg  # noqa: E402
from data_pipeline.tradingview_client import TradingViewEGXClient, _sane_dividend_yield  # noqa: E402
from data_pipeline.egx_feed_router import EGXFeedRouter  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("TVHarvester")
DATABASE_URL = os.environ.get("DATABASE_URL")

# --- connection hardening --------------------------------------------------- #
# command_timeout bounds every statement so a hung write fails in seconds, not
# minutes (the 2026-06-07 incident wasted 2m21s before failing). statement_cache
# stays disabled for the Supabase transaction-mode pooler (port 6543).
CONNECT_KW = dict(statement_cache_size=0, command_timeout=30)
MAX_CYCLE_ATTEMPTS = 4

# --- error taxonomy --------------------------------------------------------- #
# STRUCTURAL = code/schema mismatch. A bug, identical for every row. Fail fast.
STRUCTURAL_DB_ERRORS = (
    asyncpg.UndefinedColumnError,    # 42703 — e.g. the "sector" vs "sector_name" bug
    asyncpg.UndefinedTableError,     # 42P01
    asyncpg.UndefinedFunctionError,  # 42883
    asyncpg.PostgresSyntaxError,     # 42601
    asyncpg.DatatypeMismatchError,   # 42804
)
# TRANSIENT = infrastructure blip. Reconnect and retry the (idempotent) cycle.
TRANSIENT_DB_ERRORS = (
    asyncpg.PostgresConnectionError,  # 08xxx — connection lost / does-not-exist
    asyncpg.CannotConnectNowError,    # 57P03 — server/pooler starting up
    asyncpg.TooManyConnectionsError,  # 53300 — Supabase pooler connection ceiling
    asyncpg.InterfaceError,           # client-side: "connection is closed"
    ConnectionError, OSError, asyncio.TimeoutError,
)

# --- prices-cycle write SQL (module-level so the QA gate dry-runs the EXACT
#     statements against the live schema — no drift between code and test) ---- #
# NB: market_tickers PRIMARY KEY is (symbol) alone. The conflict target MUST be
# (symbol) — every authoritative writer (market_loader, admin, stockanalysis)
# uses it. The old (symbol, market_code) target failed for symbols stored with a
# NULL market_code: the target found no match, the INSERT fired, and the bare PK
# rejected it (the 72/289 'market_tickers_pkey already exists' failures). We also
# normalise market_code -> 'EGX' on conflict and bump last_updated, mirroring the
# backend writer so freshness monitoring sees harvester writes.
SQL_UPSERT_MARKET_TICKER = """
    INSERT INTO market_tickers (symbol, market_code, name_en, sector_name, last_price,
        change, change_percent, volume, market_cap, pe_ratio, dividend_yield, pb_ratio,
        beta, forward_pe, float_shares_percent, float_shares, shareholders_count, source,
        updated_at, last_updated)
    VALUES ($1,'EGX',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now(), now())
    ON CONFLICT (symbol) DO UPDATE SET
        market_code = EXCLUDED.market_code,
        name_en     = COALESCE(EXCLUDED.name_en,     market_tickers.name_en),
        sector_name = COALESCE(EXCLUDED.sector_name, market_tickers.sector_name),
        last_price  = EXCLUDED.last_price,
        change      = EXCLUDED.change,
        change_percent = EXCLUDED.change_percent,
        volume      = EXCLUDED.volume,
        market_cap  = EXCLUDED.market_cap,
        pe_ratio    = EXCLUDED.pe_ratio,
        dividend_yield = EXCLUDED.dividend_yield,
        pb_ratio    = EXCLUDED.pb_ratio,
        beta        = EXCLUDED.beta,
        forward_pe  = EXCLUDED.forward_pe,
        float_shares_percent = EXCLUDED.float_shares_percent,
        float_shares = EXCLUDED.float_shares,
        shareholders_count = EXCLUDED.shareholders_count,
        source      = EXCLUDED.source,
        updated_at  = now(),
        last_updated = now()
"""
# ^ OVERWRITE SEMANTICS (June-2026 audit): TradingView OWNS every ratio column
# above. When TV has no value the column must become NULL — the old
# COALESCE(EXCLUDED.x, old) kept dead yfinance-era values alive forever under a
# fresh source='tradingview' stamp (102 stale P/Es, 108 wrong P/Bs in prod).
# Never reintroduce COALESCE here for TV-owned data columns (name/sector are
# identity enrichment and stay COALESCE).

SQL_UPSERT_OHLC = """
    INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume, source)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (symbol, date) DO UPDATE SET
        open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
        close=EXCLUDED.close, volume=EXCLUDED.volume, source=EXCLUDED.source
"""

# Remaining cycle write SQL — hoisted to module constants so the QA gate
# (qa/egx_audit.py --suite contract) dry-runs the EXACT statement of EVERY cycle
# against the live schema. Any future column/table/conflict-target drift in any
# cycle is caught pre-harvest instead of silently dead-lettering.
SQL_UPSERT_TECHNICALS = """
    INSERT INTO egx_technicals (symbol,timeframe,rsi,macd_macd,macd_signal,stoch_k,stoch_d,
        cci20,adx,mom,recommend_all,recommend_ma,recommend_other,ema50,ema200,sma50,sma200,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
    ON CONFLICT (symbol,timeframe) DO UPDATE SET
        rsi=EXCLUDED.rsi, macd_macd=EXCLUDED.macd_macd, macd_signal=EXCLUDED.macd_signal,
        stoch_k=EXCLUDED.stoch_k, stoch_d=EXCLUDED.stoch_d, cci20=EXCLUDED.cci20,
        adx=EXCLUDED.adx, mom=EXCLUDED.mom, recommend_all=EXCLUDED.recommend_all,
        recommend_ma=EXCLUDED.recommend_ma, recommend_other=EXCLUDED.recommend_other,
        ema50=EXCLUDED.ema50, ema200=EXCLUDED.ema200, sma50=EXCLUDED.sma50,
        sma200=EXCLUDED.sma200, updated_at=now()
"""

SQL_UPSERT_ESTIMATES = """
    INSERT INTO egx_estimates (symbol,target_average,target_high,target_low,target_median,
        rec_buy,rec_over,rec_hold,rec_under,rec_sell,rec_total,
        eps_fcst_next_fq,rev_fcst_next_fq,eps_fcst_next_fy,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
    ON CONFLICT (symbol) DO UPDATE SET
        target_average=EXCLUDED.target_average, target_high=EXCLUDED.target_high,
        target_low=EXCLUDED.target_low, target_median=EXCLUDED.target_median,
        rec_buy=EXCLUDED.rec_buy, rec_over=EXCLUDED.rec_over, rec_hold=EXCLUDED.rec_hold,
        rec_under=EXCLUDED.rec_under, rec_sell=EXCLUDED.rec_sell, rec_total=EXCLUDED.rec_total,
        eps_fcst_next_fq=EXCLUDED.eps_fcst_next_fq, rev_fcst_next_fq=EXCLUDED.rev_fcst_next_fq,
        eps_fcst_next_fy=EXCLUDED.eps_fcst_next_fy, updated_at=now()
"""

SQL_UPSERT_NEWS = """
    INSERT INTO egx_news (id,content_hash,title,provider,source,published_at,story_path,related_symbols)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, story_path=EXCLUDED.story_path
"""

SQL_UPSERT_SYMBOL_MAP = """
    INSERT INTO symbol_map (internal_symbol,tv_symbol,yahoo_symbol,isin,logoid,logo_url,is_primary,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7, now())
    ON CONFLICT (internal_symbol) DO UPDATE SET
        tv_symbol=EXCLUDED.tv_symbol, isin=EXCLUDED.isin, logoid=EXCLUDED.logoid,
        logo_url=EXCLUDED.logo_url, is_primary=EXCLUDED.is_primary, updated_at=now()
"""

SQL_UPSERT_SYMBOL_MAP_NO_ISIN = """
    INSERT INTO symbol_map (internal_symbol,tv_symbol,yahoo_symbol,logoid,logo_url,is_primary,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6, now())
    ON CONFLICT (internal_symbol) DO UPDATE SET
        tv_symbol=EXCLUDED.tv_symbol, logoid=EXCLUDED.logoid,
        logo_url=EXCLUDED.logo_url, updated_at=now()
"""

SQL_UPDATE_TICKER_IDENTITY = (
    "UPDATE market_tickers SET isin=$2, logo_url=$3 WHERE symbol=$1 AND market_code='EGX'"
)

SQL_UPSERT_FINANCIALS = """
    INSERT INTO egx_financials (symbol,period_type,fiscal_year,revenue,gross_profit,ebitda,
        net_income,eps_diluted,free_cash_flow,total_assets,total_debt,dps,updated_at)
    VALUES ($1,'annual',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
    ON CONFLICT (symbol,period_type,fiscal_year) DO UPDATE SET
        revenue=EXCLUDED.revenue, gross_profit=EXCLUDED.gross_profit, ebitda=EXCLUDED.ebitda,
        net_income=EXCLUDED.net_income, eps_diluted=EXCLUDED.eps_diluted,
        free_cash_flow=EXCLUDED.free_cash_flow, total_assets=EXCLUDED.total_assets,
        total_debt=EXCLUDED.total_debt, dps=EXCLUDED.dps, updated_at=now()
"""

SQL_UPSERT_DIVIDENDS = """
    INSERT INTO egx_dividends (symbol,div_yield,amount_recent,ex_date_recent,payment_date_recent,
        amount_upcoming,ex_date_upcoming,payment_date_upcoming,frequency,payout_ratio_ttm,continuous_growth,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
    ON CONFLICT (symbol) DO UPDATE SET
        div_yield=EXCLUDED.div_yield, amount_recent=EXCLUDED.amount_recent,
        ex_date_recent=EXCLUDED.ex_date_recent, payment_date_recent=EXCLUDED.payment_date_recent,
        amount_upcoming=EXCLUDED.amount_upcoming, ex_date_upcoming=EXCLUDED.ex_date_upcoming,
        payment_date_upcoming=EXCLUDED.payment_date_upcoming, frequency=EXCLUDED.frequency,
        payout_ratio_ttm=EXCLUDED.payout_ratio_ttm, continuous_growth=EXCLUDED.continuous_growth,
        updated_at=now()
"""

SQL_UPSERT_FUNDAMENTALS = """
    INSERT INTO egx_fundamentals (symbol, fiscal_year, revenue, gross_profit,
        operating_income, ebitda, net_income, total_assets, total_equity,
        total_liabilities, total_debt, free_cash_flow, eps_diluted, bvps,
        shares_outstanding, dps, gross_margin, operating_margin, roe, roa,
        net_margin, revenue_ttm, net_income_ttm, eps_diluted_ttm, free_cash_flow_ttm,
        updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25, now())
    ON CONFLICT (symbol) DO UPDATE SET
        fiscal_year=EXCLUDED.fiscal_year, revenue=EXCLUDED.revenue,
        gross_profit=EXCLUDED.gross_profit, operating_income=EXCLUDED.operating_income,
        ebitda=EXCLUDED.ebitda, net_income=EXCLUDED.net_income,
        total_assets=EXCLUDED.total_assets, total_equity=EXCLUDED.total_equity,
        total_liabilities=EXCLUDED.total_liabilities, total_debt=EXCLUDED.total_debt,
        free_cash_flow=EXCLUDED.free_cash_flow, eps_diluted=EXCLUDED.eps_diluted,
        bvps=EXCLUDED.bvps, shares_outstanding=EXCLUDED.shares_outstanding,
        dps=EXCLUDED.dps, gross_margin=EXCLUDED.gross_margin,
        operating_margin=EXCLUDED.operating_margin, roe=EXCLUDED.roe, roa=EXCLUDED.roa,
        net_margin=EXCLUDED.net_margin, revenue_ttm=EXCLUDED.revenue_ttm,
        net_income_ttm=EXCLUDED.net_income_ttm, eps_diluted_ttm=EXCLUDED.eps_diluted_ttm,
        free_cash_flow_ttm=EXCLUDED.free_cash_flow_ttm,
        updated_at=now()
"""

SQL_SYNC_FINANCIALS_FROM_FUNDAMENTALS = """
    INSERT INTO egx_financials (symbol,period_type,fiscal_year,revenue,gross_profit,
        ebitda,net_income,eps_diluted,free_cash_flow,total_assets,total_debt,dps,updated_at)
    VALUES ($1,'annual',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
    ON CONFLICT (symbol,period_type,fiscal_year) DO UPDATE SET
        revenue=COALESCE(EXCLUDED.revenue, egx_financials.revenue),
        gross_profit=COALESCE(EXCLUDED.gross_profit, egx_financials.gross_profit),
        ebitda=COALESCE(EXCLUDED.ebitda, egx_financials.ebitda),
        net_income=COALESCE(EXCLUDED.net_income, egx_financials.net_income),
        eps_diluted=COALESCE(EXCLUDED.eps_diluted, egx_financials.eps_diluted),
        free_cash_flow=COALESCE(EXCLUDED.free_cash_flow, egx_financials.free_cash_flow),
        total_assets=COALESCE(EXCLUDED.total_assets, egx_financials.total_assets),
        total_debt=COALESCE(EXCLUDED.total_debt, egx_financials.total_debt),
        dps=COALESCE(EXCLUDED.dps, egx_financials.dps), updated_at=now()
"""

SQL_UPSERT_CORPORATE_ACTION = """
    INSERT INTO corporate_actions (symbol, action_type, ex_date, payment_date, amount,
        currency, description)
    VALUES ($1,'Dividend',$2,$3,$4,'EGP',$5)
    ON CONFLICT (symbol, action_type, ex_date) DO UPDATE SET
        payment_date=COALESCE(EXCLUDED.payment_date, corporate_actions.payment_date),
        amount=EXCLUDED.amount, description=EXCLUDED.description
"""

SQL_INSERT_DEADLETTER = (
    "INSERT INTO egx_ingest_deadletter(cycle,symbol,payload,error) VALUES($1,$2,$3,$4)"
)

# Registry of EVERY write statement the harvester issues. The QA write-contract
# gate (qa/egx_audit.py) iterates this and validates each against the live schema,
# so adding a new write means adding it here -> it is covered automatically.
ALL_WRITE_SQL = {
    "market_tickers":            SQL_UPSERT_MARKET_TICKER,
    "ohlc_data":                 SQL_UPSERT_OHLC,
    "egx_technicals":            SQL_UPSERT_TECHNICALS,
    "egx_estimates":             SQL_UPSERT_ESTIMATES,
    "egx_news":                  SQL_UPSERT_NEWS,
    "symbol_map":                SQL_UPSERT_SYMBOL_MAP,
    "symbol_map(no_isin)":       SQL_UPSERT_SYMBOL_MAP_NO_ISIN,
    "market_tickers(identity)":  SQL_UPDATE_TICKER_IDENTITY,
    "egx_financials":            SQL_UPSERT_FINANCIALS,
    "egx_financials(sync)":      SQL_SYNC_FINANCIALS_FROM_FUNDAMENTALS,
    "egx_dividends":             SQL_UPSERT_DIVIDENDS,
    "egx_fundamentals":          SQL_UPSERT_FUNDAMENTALS,
    "corporate_actions":         SQL_UPSERT_CORPORATE_ACTION,
    "egx_ingest_deadletter":     SQL_INSERT_DEADLETTER,
}


async def _symbols(conn) -> list[str]:
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code='EGX' ORDER BY symbol")
    return [r["symbol"] for r in rows]


async def _deadletter(conn, cycle, symbol, payload, error):
    try:
        await conn.execute(SQL_INSERT_DEADLETTER,
            cycle, symbol, json.dumps(payload, default=str), str(error)[:500])
    except Exception:
        logger.exception("deadletter write failed")


async def _on_write_error(conn, cycle, key, payload, exc):
    """Route a per-row write failure by class. STRUCTURAL and TRANSIENT errors
    are RE-RAISED so they surface (fail-fast bug / reconnect-and-retry); only a
    genuine single-row DATA error is dead-lettered so the cycle survives it."""
    if isinstance(exc, STRUCTURAL_DB_ERRORS):
        logger.error("%s: STRUCTURAL DB error (code/schema bug) on %s -> aborting cycle: %s",
                     cycle, key, exc)
        raise exc
    if isinstance(exc, TRANSIENT_DB_ERRORS):
        raise exc
    await _deadletter(conn, cycle, key, payload, exc)


# --------------------------------------------------------------------------- #
async def cycle_prices(conn):
    """Intraday price + today's OHLC candle. Upserts market_tickers + ohlc_data."""
    syms = await _symbols(conn)
    router = EGXFeedRouter(fallback_symbols=syms)
    stocks = await router.get_egx_stocks()
    src = router.last_source
    n = 0
    for s in stocks:
        try:
            sh_count = s.get("shareholders_count")
            await conn.execute(SQL_UPSERT_MARKET_TICKER,
                s["symbol"], s.get("name_en"), s.get("sector_name"), s["last_price"],
                s.get("change"), s.get("change_percent"), s.get("volume"),
                s.get("market_cap"), s.get("pe_ratio"), s.get("dividend_yield"),
                s.get("pb_ratio"), s.get("beta"), s.get("forward_pe"),
                s.get("float_shares_percent"), s.get("float_shares"),
                int(sh_count) if sh_count is not None else None,
                s.get("source", src))

            # today's forming candle -> ohlc_data (only if we have a full OHLC from the scanner)
            if s.get("open") and s.get("high") and s.get("low") and s.get("bar_time"):
                from datetime import datetime, timezone
                d = datetime.fromtimestamp(s["bar_time"], tz=timezone.utc).date()
                await conn.execute(SQL_UPSERT_OHLC,
                    s["symbol"], d, s["open"], s["high"], s["low"], s["last_price"],
                    s.get("volume"), s.get("source", src))
            n += 1
        except Exception as e:  # per-symbol isolation (L4) + error taxonomy
            await _on_write_error(conn, "prices", s.get("symbol"), s, e)
    logger.info("prices: upserted %d/%d via %s", n, len(stocks), src)
    if n == 0:
        raise SystemExit("FAIL: 0 tickers updated")  # fail-loud (L9)

    # Fetch EGX30 index level from TradingView and store in market_tickers so the
    # market-summary API can read a real index value (instead of computing a wrong VWAP).
    # Non-fatal: a failure here skips the index row but the main ticker upsert already succeeded.
    try:
        idx_rows = await TradingViewEGXClient()._scan(
            ["close", "change", "change_abs", "volume"],
            tickers=["EGX:EGX30"])
        if idx_rows:
            ix = idx_rows[0]
            await conn.execute(SQL_UPSERT_MARKET_TICKER,
                "EGX30", "EGX 30 Index", "Index",  # symbol, name_en, sector_name
                _finite(ix.get("close")),            # last_price
                _finite(ix.get("change_abs")),       # change (absolute pts)
                _finite(ix.get("change")),           # change_percent
                int(_finite(ix.get("volume")) or 0), # volume
                None, None, None,                    # market_cap, pe_ratio, dividend_yield
                None, None, None, None, None, None,  # pb, beta, fwd_pe, float%, float, holders
                "tradingview")
            logger.info("prices: EGX30 index upserted: %.2f (%.2f%%)",
                        _finite(ix.get("close")) or 0, _finite(ix.get("change")) or 0)
    except Exception as e:
        logger.warning("prices: EGX30 index fetch skipped: %s", e)


async def cycle_technicals(conn):
    rows = await TradingViewEGXClient().get_technicals()
    n = 0
    for r in rows:
        try:
            await conn.execute(SQL_UPSERT_TECHNICALS,
                r["symbol"], r["timeframe"], r.get("rsi"), r.get("macd_macd"), r.get("macd_signal"),
                r.get("stoch_k"), r.get("stoch_d"), r.get("cci20"), r.get("adx"), r.get("mom"),
                r.get("recommend_all"), r.get("recommend_ma"), r.get("recommend_other"),
                r.get("ema50"), r.get("ema200"), r.get("sma50"), r.get("sma200"))
            n += 1
        except Exception as e:
            await _on_write_error(conn, "technicals", r.get("symbol"), r, e)
    logger.info("technicals: upserted %d (symbol,tf) rows", n)


async def cycle_estimates(conn):
    rows = await TradingViewEGXClient().get_estimates()
    n = 0
    for r in rows:
        try:
            await conn.execute(SQL_UPSERT_ESTIMATES,
                r["symbol"], r.get("price_target_average"), r.get("price_target_high"),
                r.get("price_target_low"), r.get("price_target_median"),
                r.get("recommendation_buy"), r.get("recommendation_over"), r.get("recommendation_hold"),
                r.get("recommendation_under"), r.get("recommendation_sell"), r.get("recommendation_total"),
                r.get("earnings_per_share_forecast_next_fq"), r.get("revenue_forecast_next_fq"),
                r.get("earnings_per_share_forecast_next_fy"))
            n += 1
        except Exception as e:
            await _on_write_error(conn, "estimates", r.get("symbol"), r, e)
    logger.info("estimates: upserted %d covered names", n)


async def cycle_news(conn):
    items = await TradingViewEGXClient().get_news()
    n = 0
    for it in items:
        try:
            h = hashlib.sha1(f"{it.get('title')}|{it.get('published_at')}|{it.get('provider')}"
                             .encode()).hexdigest()
            await conn.execute(SQL_UPSERT_NEWS,
                it["id"], h, it.get("title"), it.get("provider"), it.get("source"),
                it.get("published_at"), it.get("story_path"), json.dumps(it.get("related_symbols")))
            n += 1
        except Exception as e:
            await _on_write_error(conn, "news", it.get("id"), it, e)
    logger.info("news: upserted %d items", n)


async def cycle_symbolmap(conn):
    """Build the full-universe identity table. Covers BOTH our tracked symbols and
    TradingView's full EGX universe, so every technicals/estimates row maps. ISIN
    dual-listings (two tickers, one ISIN) are expected EGX behaviour and are logged,
    not dead-lettered."""
    client = TradingViewEGXClient()
    tracked = set(await _symbols(conn))
    tv_syms = {s["symbol"] for s in await client.get_egx_stocks()}
    universe = sorted(tracked | tv_syms)
    n, collisions = 0, 0
    for s in universe:
        try:
            idn = await client.search_identity(s)
            if not idn:
                continue
            try:
                await conn.execute(SQL_UPSERT_SYMBOL_MAP,
                    s, idn["tv_symbol"], f"{s}.CA", idn.get("isin"),
                    idn.get("logoid"), idn.get("logo_url"), idn.get("is_primary"))
            except asyncpg.UniqueViolationError:
                # ISIN already claimed by another ticker (dual listing). Map without ISIN.
                collisions += 1
                await conn.execute(SQL_UPSERT_SYMBOL_MAP_NO_ISIN,
                    s, idn["tv_symbol"], f"{s}.CA",
                    idn.get("logoid"), idn.get("logo_url"), idn.get("is_primary"))
                logger.info("symbolmap: ISIN dual-listing for %s — mapped without ISIN", s)
            if s in tracked:
                await conn.execute(SQL_UPDATE_TICKER_IDENTITY,
                    s, idn.get("isin"), idn.get("logo_url"))
            n += 1
        except Exception as e:
            await _on_write_error(conn, "symbolmap", s, {}, e)
    logger.info("symbolmap: mapped %d/%d (tracked=%d, tv=%d, ISIN dual-listings=%d)",
                n, len(universe), len(tracked), len(tv_syms), collisions)


async def cycle_financials(conn):
    """20-year annual statement history from TV `_h` arrays into egx_financials.
    Explodes each symbol's aligned arrays into per-(symbol,year) rows. Sector-aware
    nulls preserved (a bank's EBITDA stays NULL)."""
    client = TradingViewEGXClient()
    syms = await _symbols(conn)
    total = 0
    # batch the per-symbol _h pull to keep payloads sane
    for i in range(0, len(syms), 40):
        batch = syms[i:i + 40]
        try:
            rows = await client.get_statements(batch)
        except Exception as e:
            for s in batch:
                await _deadletter(conn, "financials", s, {}, e)  # TV-fetch failure (not a DB write)
            continue
        for d in rows:
            sym = d.get("symbol")
            years = d.get("fiscal_period_fy_h") or []
            def col(name):
                v = d.get(name)
                return v if isinstance(v, list) else []
            rev, gp, eb = col("total_revenue_fy_h"), col("gross_profit_fy_h"), col("ebitda_fy_h")
            ni, eps, fcf = col("net_income_fy_h"), col("earnings_per_share_diluted_fy_h"), col("free_cash_flow_fy_h")
            ta, td, dps = col("total_assets_fy_h"), col("total_debt_fy_h"), col("dps_common_stock_prim_issue_fy_h")
            g = lambda arr, j: (arr[j] if j < len(arr) else None)
            for j, yr in enumerate(years):
                try:
                    await conn.execute(SQL_UPSERT_FINANCIALS,
                        sym, int(yr), g(rev, j), g(gp, j), g(eb, j), g(ni, j), g(eps, j),
                        g(fcf, j), g(ta, j), g(td, j), g(dps, j))
                    total += 1
                except Exception as e:
                    await _on_write_error(conn, "financials", sym, {"year": yr}, e)
    logger.info("financials: upserted %d (symbol,year) rows for %d symbols", total, len(syms))


async def cycle_dividends(conn):
    """Dividend snapshot incl. forward ex-date / payment-date calendar into
    egx_dividends. One row per symbol (upsert by PK)."""
    from datetime import datetime, timezone
    rows = await TradingViewEGXClient().get_dividends()
    n = 0
    ca = 0
    for d in rows:
        try:
            freq = d.get("dividends_frequency")
            freq = str(freq) if freq is not None else None
            await conn.execute(SQL_UPSERT_DIVIDENDS,
                d["symbol"],
                # Cross-validated yield — raw dividends_yield_current was corrupt
                # for ORAS (45.5% vs real ~1.65%); see _sane_dividend_yield().
                _sane_dividend_yield(d.get("dividends_yield_current"), d.get("dividends_yield"),
                                     d.get("dividend_amount_recent"), d.get("close")),
                d.get("dividend_amount_recent"),
                _i(d.get("dividend_ex_date_recent")), _i(d.get("dividend_payment_date_recent")),
                d.get("dividend_amount_upcoming"), _i(d.get("dividend_ex_date_upcoming")),
                _i(d.get("dividend_payment_date_upcoming")), freq,
                d.get("dividend_payout_ratio_ttm"), d.get("continuous_dividend_growth"))
            n += 1
            # Self-extending dividend HISTORY: mirror the TV snapshot (recent +
            # upcoming) into corporate_actions so the history list keeps growing
            # from TradingView and can never freeze again (June-2026 audit: the
            # table was stale since March; 2026 dividends were missing from the
            # Dividends & Actions list while the TV panel above showed them).
            for amt_k, ex_k, pay_k in (
                    ("dividend_amount_recent", "dividend_ex_date_recent", "dividend_payment_date_recent"),
                    ("dividend_amount_upcoming", "dividend_ex_date_upcoming", "dividend_payment_date_upcoming")):
                amt, ex = d.get(amt_k), _i(d.get(ex_k))
                if amt is None or not ex:
                    continue
                ex_date = datetime.fromtimestamp(ex, tz=timezone.utc).date()
                pay = _i(d.get(pay_k))
                pay_date = datetime.fromtimestamp(pay, tz=timezone.utc).date() if pay else None
                await conn.execute(SQL_UPSERT_CORPORATE_ACTION,
                    d["symbol"], ex_date, pay_date, round(float(amt), 6),
                    f"Cash Dividend of {float(amt):.6f} EGP")
                ca += 1
        except Exception as e:
            await _on_write_error(conn, "dividends", d.get("symbol"), d, e)
    logger.info("dividends: upserted %d symbols, %d corporate_actions rows", n, ca)


def _i(v):
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


async def cycle_fundamentals(conn):
    """Latest-annual TV fundamentals snapshot (equity, operating income/margin,
    ROE/ROA, BVPS, shares, liabilities, …) into egx_fundamentals — one row per
    symbol. This is the TV-native source for the symbol page's Overview/Ratios
    metrics, replacing the stale audited income_statements/balance_sheets feed.
    All values are ABSOLUTE EGP (no millions scaling)."""
    rows = await TradingViewEGXClient().get_fundamentals()
    n = 0
    for d in rows:
        try:
            await conn.execute(SQL_UPSERT_FUNDAMENTALS,
                d["symbol"], d.get("fiscal_year"), d.get("revenue"), d.get("gross_profit"),
                d.get("operating_income"), d.get("ebitda"), d.get("net_income"),
                d.get("total_assets"), d.get("total_equity"), d.get("total_liabilities"),
                d.get("total_debt"), d.get("free_cash_flow"), d.get("eps_diluted"),
                d.get("bvps"), d.get("shares_outstanding"), d.get("dps"),
                d.get("gross_margin"), d.get("operating_margin"), d.get("roe"), d.get("roa"),
                d.get("net_margin"), d.get("revenue_ttm"), d.get("net_income_ttm"),
                d.get("eps_diluted_ttm"), d.get("free_cash_flow_ttm"))
            # Sync the LATEST-year egx_financials row from the authoritative _fy
            # scalar. TradingView's net_income_fy_h[0] (history-array latest) is
            # unreliable for some names (e.g. SEIGA: _h[0]=827K but scalar=40.25M,
            # the latter matching market cap). The compound cycle runs
            # financials -> fundamentals, so this runs LAST and wins, keeping the
            # Financials-tab latest year consistent with Overview/Ratios.
            if d.get("fiscal_year") is not None:
                await conn.execute(SQL_SYNC_FINANCIALS_FROM_FUNDAMENTALS,
                    d["symbol"], d["fiscal_year"], d.get("revenue"), d.get("gross_profit"),
                    d.get("ebitda"), d.get("net_income"), d.get("eps_diluted"), d.get("free_cash_flow"),
                    d.get("total_assets"), d.get("total_debt"), d.get("dps"))
            n += 1
        except Exception as e:
            await _on_write_error(conn, "fundamentals", d.get("symbol"), d, e)
    logger.info("fundamentals: upserted %d symbols", n)


CYCLES = {"prices": cycle_prices, "technicals": cycle_technicals, "estimates": cycle_estimates,
          "news": cycle_news, "symbolmap": cycle_symbolmap, "financials": cycle_financials,
          "dividends": cycle_dividends, "fundamentals": cycle_fundamentals}

# Compound cycles: run multiple cycles in sequence within one invocation.
COMPOUND = {"prices_and_technicals": ["prices", "technicals"],
            "financials_and_fundamentals": ["financials", "fundamentals"]}


async def _run_cycle(name, fn):
    """Run one cycle on a fresh, time-bounded connection. TRANSIENT infra errors
    -> reconnect and retry the (idempotent) cycle with bounded backoff. STRUCTURAL
    and DATA-level outcomes surface to the caller (fail-fast / loud)."""
    last = None
    for attempt in range(1, MAX_CYCLE_ATTEMPTS + 1):
        conn = None
        try:
            conn = await asyncpg.connect(DATABASE_URL, **CONNECT_KW)
            await fn(conn)
            return
        except TRANSIENT_DB_ERRORS as e:
            last = e
            wait = min(2 ** attempt, 30)
            logger.warning("%s: transient DB error %s: %s (attempt %d/%d) — reconnecting in %ds",
                           name, type(e).__name__, e, attempt, MAX_CYCLE_ATTEMPTS, wait)
            await asyncio.sleep(wait)
        finally:
            if conn is not None:
                try:
                    await conn.close(timeout=5)
                except Exception:
                    pass
    raise SystemExit(f"FAIL: cycle '{name}' could not reach DB after {MAX_CYCLE_ATTEMPTS} "
                     f"attempts; last error {type(last).__name__}: {last}")


async def main(cycle: str):
    if not DATABASE_URL:
        sys.exit("DATABASE_URL not set")
    if cycle == "all":
        todo = list(CYCLES)
    elif cycle in COMPOUND:
        todo = COMPOUND[cycle]
    else:
        todo = [cycle]
    # Cycle isolation: one cycle's failure must NOT skip its siblings (a prices
    # blip used to silently kill the technicals write in the same window).
    failed = []
    for c in todo:
        try:
            await _run_cycle(c, CYCLES[c])
        except (Exception, SystemExit) as e:
            logger.error("cycle '%s' FAILED: %s", c, e)
            failed.append(f"{c}: {e}")
    if failed:
        sys.exit("FAIL: " + " | ".join(failed))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cycle", default="prices",
                    choices=list(CYCLES) + list(COMPOUND) + ["all"])
    asyncio.run(main(ap.parse_args().cycle))
