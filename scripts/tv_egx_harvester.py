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
from data_pipeline.tradingview_client import TradingViewEGXClient  # noqa: E402
from data_pipeline.egx_feed_router import EGXFeedRouter  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("TVHarvester")
DATABASE_URL = os.environ.get("DATABASE_URL")


async def _symbols(conn) -> list[str]:
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code='EGX' ORDER BY symbol")
    return [r["symbol"] for r in rows]


async def _deadletter(conn, cycle, symbol, payload, error):
    try:
        await conn.execute(
            "INSERT INTO egx_ingest_deadletter(cycle,symbol,payload,error) VALUES($1,$2,$3,$4)",
            cycle, symbol, json.dumps(payload, default=str), str(error)[:500])
    except Exception:
        logger.exception("deadletter write failed")


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
            await conn.execute("""
                INSERT INTO market_tickers (symbol, market_code, name_en, sector, last_price,
                    change, change_percent, volume, market_cap, pe_ratio, dividend_yield, source, updated_at)
                VALUES ($1,'EGX',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
                ON CONFLICT (symbol, market_code) DO UPDATE SET
                    name_en   = COALESCE(EXCLUDED.name_en, market_tickers.name_en),
                    sector    = COALESCE(EXCLUDED.sector,  market_tickers.sector),
                    last_price= EXCLUDED.last_price,
                    change    = EXCLUDED.change,
                    change_percent = EXCLUDED.change_percent,
                    volume    = EXCLUDED.volume,
                    market_cap= COALESCE(EXCLUDED.market_cap, market_tickers.market_cap),
                    pe_ratio  = COALESCE(EXCLUDED.pe_ratio,   market_tickers.pe_ratio),
                    dividend_yield = COALESCE(EXCLUDED.dividend_yield, market_tickers.dividend_yield),
                    source    = EXCLUDED.source,
                    updated_at= now()
            """, s["symbol"], s.get("name_en"), s.get("sector_name"), s["last_price"],
                s.get("change"), s.get("change_percent"), s.get("volume"),
                s.get("market_cap"), s.get("pe_ratio"), s.get("dividend_yield"), s.get("source", src))

            # today's forming candle -> ohlc_data (only if we have a full OHLC from the scanner)
            if s.get("open") and s.get("high") and s.get("low") and s.get("bar_time"):
                from datetime import datetime, timezone
                d = datetime.fromtimestamp(s["bar_time"], tz=timezone.utc).date()
                await conn.execute("""
                    INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume, source)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    ON CONFLICT (symbol, date) DO UPDATE SET
                        open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
                        close=EXCLUDED.close, volume=EXCLUDED.volume, source=EXCLUDED.source
                """, s["symbol"], d, s["open"], s["high"], s["low"], s["last_price"],
                    s.get("volume"), s.get("source", src))
            n += 1
        except Exception as e:  # per-symbol isolation (L4)
            await _deadletter(conn, "prices", s.get("symbol"), s, e)
    logger.info("prices: upserted %d/%d via %s", n, len(stocks), src)
    if n == 0:
        raise SystemExit("FAIL: 0 tickers updated")  # fail-loud (L9)


async def cycle_technicals(conn):
    rows = await TradingViewEGXClient().get_technicals()
    n = 0
    for r in rows:
        try:
            await conn.execute("""
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
            """, r["symbol"], r["timeframe"], r.get("rsi"), r.get("macd_macd"), r.get("macd_signal"),
                r.get("stoch_k"), r.get("stoch_d"), r.get("cci20"), r.get("adx"), r.get("mom"),
                r.get("recommend_all"), r.get("recommend_ma"), r.get("recommend_other"),
                r.get("ema50"), r.get("ema200"), r.get("sma50"), r.get("sma200"))
            n += 1
        except Exception as e:
            await _deadletter(conn, "technicals", r.get("symbol"), r, e)
    logger.info("technicals: upserted %d (symbol,tf) rows", n)


async def cycle_estimates(conn):
    rows = await TradingViewEGXClient().get_estimates()
    n = 0
    for r in rows:
        try:
            await conn.execute("""
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
            """, r["symbol"], r.get("price_target_average"), r.get("price_target_high"),
                r.get("price_target_low"), r.get("price_target_median"),
                r.get("recommendation_buy"), r.get("recommendation_over"), r.get("recommendation_hold"),
                r.get("recommendation_under"), r.get("recommendation_sell"), r.get("recommendation_total"),
                r.get("earnings_per_share_forecast_next_fq"), r.get("revenue_forecast_next_fq"),
                r.get("earnings_per_share_forecast_next_fy"))
            n += 1
        except Exception as e:
            await _deadletter(conn, "estimates", r.get("symbol"), r, e)
    logger.info("estimates: upserted %d covered names", n)


async def cycle_news(conn):
    items = await TradingViewEGXClient().get_news()
    n = 0
    for it in items:
        try:
            h = hashlib.sha1(f"{it.get('title')}|{it.get('published_at')}|{it.get('provider')}"
                             .encode()).hexdigest()
            await conn.execute("""
                INSERT INTO egx_news (id,content_hash,title,provider,source,published_at,story_path,related_symbols)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, story_path=EXCLUDED.story_path
            """, it["id"], h, it.get("title"), it.get("provider"), it.get("source"),
                it.get("published_at"), it.get("story_path"), json.dumps(it.get("related_symbols")))
            n += 1
        except Exception as e:
            await _deadletter(conn, "news", it.get("id"), it, e)
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
                await conn.execute("""
                    INSERT INTO symbol_map (internal_symbol,tv_symbol,yahoo_symbol,isin,logoid,logo_url,is_primary,updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7, now())
                    ON CONFLICT (internal_symbol) DO UPDATE SET
                        tv_symbol=EXCLUDED.tv_symbol, isin=EXCLUDED.isin, logoid=EXCLUDED.logoid,
                        logo_url=EXCLUDED.logo_url, is_primary=EXCLUDED.is_primary, updated_at=now()
                """, s, idn["tv_symbol"], f"{s}.CA", idn.get("isin"),
                    idn.get("logoid"), idn.get("logo_url"), idn.get("is_primary"))
            except asyncpg.UniqueViolationError:
                # ISIN already claimed by another ticker (dual listing). Map without ISIN.
                collisions += 1
                await conn.execute("""
                    INSERT INTO symbol_map (internal_symbol,tv_symbol,yahoo_symbol,logoid,logo_url,is_primary,updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6, now())
                    ON CONFLICT (internal_symbol) DO UPDATE SET
                        tv_symbol=EXCLUDED.tv_symbol, logoid=EXCLUDED.logoid,
                        logo_url=EXCLUDED.logo_url, updated_at=now()
                """, s, idn["tv_symbol"], f"{s}.CA",
                    idn.get("logoid"), idn.get("logo_url"), idn.get("is_primary"))
                logger.info("symbolmap: ISIN dual-listing for %s — mapped without ISIN", s)
            if s in tracked:
                await conn.execute(
                    "UPDATE market_tickers SET isin=$2, logo_url=$3 WHERE symbol=$1 AND market_code='EGX'",
                    s, idn.get("isin"), idn.get("logo_url"))
            n += 1
        except Exception as e:
            await _deadletter(conn, "symbolmap", s, {}, e)
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
                await _deadletter(conn, "financials", s, {}, e)
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
                    await conn.execute("""
                        INSERT INTO egx_financials (symbol,period_type,fiscal_year,revenue,gross_profit,ebitda,
                            net_income,eps_diluted,free_cash_flow,total_assets,total_debt,dps,updated_at)
                        VALUES ($1,'annual',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
                        ON CONFLICT (symbol,period_type,fiscal_year) DO UPDATE SET
                            revenue=EXCLUDED.revenue, gross_profit=EXCLUDED.gross_profit, ebitda=EXCLUDED.ebitda,
                            net_income=EXCLUDED.net_income, eps_diluted=EXCLUDED.eps_diluted,
                            free_cash_flow=EXCLUDED.free_cash_flow, total_assets=EXCLUDED.total_assets,
                            total_debt=EXCLUDED.total_debt, dps=EXCLUDED.dps, updated_at=now()
                    """, sym, int(yr), g(rev, j), g(gp, j), g(eb, j), g(ni, j), g(eps, j),
                        g(fcf, j), g(ta, j), g(td, j), g(dps, j))
                    total += 1
                except Exception as e:
                    await _deadletter(conn, "financials", sym, {"year": yr}, e)
    logger.info("financials: upserted %d (symbol,year) rows for %d symbols", total, len(syms))


async def cycle_dividends(conn):
    """Dividend snapshot incl. forward ex-date / payment-date calendar into
    egx_dividends. One row per symbol (upsert by PK)."""
    rows = await TradingViewEGXClient().get_dividends()
    n = 0
    for d in rows:
        try:
            freq = d.get("dividends_frequency")
            freq = str(freq) if freq is not None else None
            await conn.execute("""
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
            """, d["symbol"], d.get("dividends_yield"), d.get("dividend_amount_recent"),
                _i(d.get("dividend_ex_date_recent")), _i(d.get("dividend_payment_date_recent")),
                d.get("dividend_amount_upcoming"), _i(d.get("dividend_ex_date_upcoming")),
                _i(d.get("dividend_payment_date_upcoming")), freq,
                d.get("dividend_payout_ratio_ttm"), d.get("continuous_dividend_growth"))
            n += 1
        except Exception as e:
            await _deadletter(conn, "dividends", d.get("symbol"), d, e)
    logger.info("dividends: upserted %d symbols", n)


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
            await conn.execute("""
                INSERT INTO egx_fundamentals (symbol, fiscal_year, revenue, gross_profit,
                    operating_income, ebitda, net_income, total_assets, total_equity,
                    total_liabilities, total_debt, free_cash_flow, eps_diluted, bvps,
                    shares_outstanding, dps, gross_margin, operating_margin, roe, roa, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
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
                    updated_at=now()
            """, d["symbol"], d.get("fiscal_year"), d.get("revenue"), d.get("gross_profit"),
                d.get("operating_income"), d.get("ebitda"), d.get("net_income"),
                d.get("total_assets"), d.get("total_equity"), d.get("total_liabilities"),
                d.get("total_debt"), d.get("free_cash_flow"), d.get("eps_diluted"),
                d.get("bvps"), d.get("shares_outstanding"), d.get("dps"),
                d.get("gross_margin"), d.get("operating_margin"), d.get("roe"), d.get("roa"))
            # Sync the LATEST-year egx_financials row from the authoritative _fy
            # scalar. TradingView's net_income_fy_h[0] (history-array latest) is
            # unreliable for some names (e.g. SEIGA: _h[0]=827K but scalar=40.25M,
            # the latter matching market cap). The compound cycle runs
            # financials -> fundamentals, so this runs LAST and wins, keeping the
            # Financials-tab latest year consistent with Overview/Ratios.
            if d.get("fiscal_year") is not None:
                await conn.execute("""
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
                """, d["symbol"], d["fiscal_year"], d.get("revenue"), d.get("gross_profit"),
                    d.get("ebitda"), d.get("net_income"), d.get("eps_diluted"), d.get("free_cash_flow"),
                    d.get("total_assets"), d.get("total_debt"), d.get("dps"))
            n += 1
        except Exception as e:
            await _deadletter(conn, "fundamentals", d.get("symbol"), d, e)
    logger.info("fundamentals: upserted %d symbols", n)


CYCLES = {"prices": cycle_prices, "technicals": cycle_technicals, "estimates": cycle_estimates,
          "news": cycle_news, "symbolmap": cycle_symbolmap, "financials": cycle_financials,
          "dividends": cycle_dividends, "fundamentals": cycle_fundamentals}

# Compound cycles: run multiple cycles in sequence within one invocation.
COMPOUND = {"prices_and_technicals": ["prices", "technicals"],
            "financials_and_fundamentals": ["financials", "fundamentals"]}


async def main(cycle: str):
    if not DATABASE_URL:
        sys.exit("DATABASE_URL not set")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        if cycle == "all":
            todo = list(CYCLES)
        elif cycle in COMPOUND:
            todo = COMPOUND[cycle]
        else:
            todo = [cycle]
        for c in todo:
            await CYCLES[c](conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cycle", default="prices",
                    choices=list(CYCLES) + list(COMPOUND) + ["all"])
    asyncio.run(main(ap.parse_args().cycle))
