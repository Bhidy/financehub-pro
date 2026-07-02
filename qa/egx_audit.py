#!/usr/bin/env python3
"""
EGX Data Audit Harness  (Plan Phase 7 / section 14)
===================================================
Aggressive, automated, repeatable QA + institutional audit. Gates every
promotion to primary. ANY single RED => non-zero exit => no-go.

Three audit families:
  14.1  data-quality   (completeness, zero-dup, sanity, integrity, freshness)
  14.2  resilience     (fault injection -> assert graceful degradation)
  14.3  reconciliation (TV vs yfinance / DB cross-check)

Usage:
    DATABASE_URL=... python qa/egx_audit.py                 # full
    python qa/egx_audit.py --suite resilience               # no DB needed
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend-core"))
from data_pipeline.tradingview_client import TradingViewEGXClient, FeedDegraded  # noqa: E402
from data_pipeline.egx_feed_router import EGXFeedRouter, AllSourcesFailed  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL")
RED = "\033[91mRED\033[0m"
GREEN = "\033[92mGREEN\033[0m"
SKIP = "\033[93mSKIP\033[0m"
results: list[tuple[str, bool, str]] = []
skipped: list[tuple[str, str]] = []


def check(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    print(f"  [{GREEN if ok else RED}] {name}{('  - ' + detail) if detail else ''}")


def skip(name: str, detail: str = ""):
    """Neutral outcome: a check could NOT run for a transient, not-our-fault
    reason (e.g. the DB is read-only during a Supabase platform incident). NOT
    counted as RED — it must not turn a platform incident into a NO-GO gate that
    blocks PRs and spams failures. The schema-drift gate that CAN run read-only
    (statement parse-validation) still runs and still gates."""
    skipped.append((name, detail))
    print(f"  [{SKIP}] {name}{('  - ' + detail) if detail else ''}")


# --------------------------------------------------------------------------- #
# 14.2  RESILIENCE / CHAOS (no DB required) — prove "never fail"
# --------------------------------------------------------------------------- #
async def suite_resilience():
    print("\n14.2 RESILIENCE / CHAOS")

    # invariant: router always >= 2 sources
    r = EGXFeedRouter(fallback_symbols=["COMI"])
    check("never-single-source invariant (>=2 providers)", len(r.sources) >= 2,
          f"{[n for n,_ in r.sources]}")

    # kill primary -> assert fallback path is reached (mock TV to raise)
    class _DeadTV:
        async def get_egx_stocks(self):
            raise FeedDegraded("simulated TV outage")

    class _GoodFallback:
        name = "yfinance"
        async def get_egx_stocks(self):
            return [{"symbol": f"S{i}", "last_price": 1.0, "market_code": "EGX",
                     "currency": "EGP"} for i in range(289)]

    r.sources = [("tradingview", _DeadTV()), ("yfinance", _GoodFallback())]
    try:
        stocks = await r.get_egx_stocks()
        check("primary down -> serves fallback", r.last_source == "yfinance" and len(stocks) == 289,
              f"source={r.last_source}, rows={len(stocks)}")
        check("fallback rows source-tagged", all(s.get("source") == "yfinance" for s in stocks))
    except Exception as e:  # noqa: BLE001
        check("primary down -> serves fallback", False, str(e))

    # kill ALL sources -> assert loud AllSourcesFailed (never silent)
    r.sources = [("tradingview", _DeadTV()), ("yfinance", _DeadTV())]
    try:
        await r.get_egx_stocks()
        check("all sources dead -> raises loudly (no silent empty)", False, "did not raise")
    except AllSourcesFailed:
        check("all sources dead -> raises loudly (no silent empty)", True)
    except Exception as e:  # noqa: BLE001
        check("all sources dead -> raises loudly (no silent empty)", False, type(e).__name__)

    # poison payload -> degraded too-small universe rejected
    class _TinyTV:
        async def get_egx_stocks(self):
            return [{"symbol": "ONLY", "last_price": 1.0, "market_code": "EGX", "currency": "EGP"}]
    r.sources = [("tradingview", _TinyTV()), ("yfinance", _GoodFallback())]
    stocks = await r.get_egx_stocks()
    check("under-sized primary payload -> falls through", r.last_source == "yfinance",
          f"source={r.last_source}")


def _load_harvester():
    """Import scripts/tv_egx_harvester.py as a module (no DB connection at import)."""
    import importlib.util
    path = os.path.join(os.path.dirname(__file__), "..", "scripts", "tv_egx_harvester.py")
    spec = importlib.util.spec_from_file_location("tvh", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# --------------------------------------------------------------------------- #
# 14.2b WRITE-PATH ERROR TAXONOMY (no DB) — guards the 2026-06-07 incident:
#   a schema/code bug ('column "sector" does not exist') must FAIL FAST, never be
#   silently dead-lettered 289x, never be retried. Transient infra -> retry.
# --------------------------------------------------------------------------- #
async def suite_write_resilience():
    print("\n14.2b WRITE-PATH ERROR TAXONOMY")
    import asyncpg as pg
    tvh = _load_harvester()

    check("structural errors classified fatal (UndefinedColumn/Table/Syntax)",
          issubclass(pg.UndefinedColumnError, tvh.STRUCTURAL_DB_ERRORS)
          and issubclass(pg.UndefinedTableError, tvh.STRUCTURAL_DB_ERRORS)
          and issubclass(pg.PostgresSyntaxError, tvh.STRUCTURAL_DB_ERRORS))
    check("transient errors classified retryable (Conn/TooManyConns/Timeout)",
          issubclass(pg.ConnectionDoesNotExistError, tvh.TRANSIENT_DB_ERRORS)
          and issubclass(pg.TooManyConnectionsError, tvh.TRANSIENT_DB_ERRORS)
          and issubclass(pg.CannotConnectNowError, tvh.TRANSIENT_DB_ERRORS))

    # route real exception instances through the live handler
    dl = []
    async def _fake_dl(conn, cyc, key, payload, err):
        dl.append((cyc, key))
    tvh._deadletter = _fake_dl

    # 1) STRUCTURAL (the incident) -> re-raised, NEVER dead-lettered
    raised = None
    try:
        await tvh._on_write_error(None, "prices", "COMI", {},
                                  pg.UndefinedColumnError('column "sector" of relation "market_tickers" does not exist'))
    except pg.UndefinedColumnError:
        raised = True
    check("schema/code bug -> fails fast (raised, never dead-lettered)", raised and dl == [],
          f"raised={raised}, deadletters={dl}")

    # 2) TRANSIENT -> re-raised (so the cycle loop reconnects+retries)
    raised2 = None
    try:
        await tvh._on_write_error(None, "prices", "COMI", {}, pg.TooManyConnectionsError("pooler full"))
    except pg.TooManyConnectionsError:
        raised2 = True
    check("transient infra error -> raised for reconnect+retry", raised2 and dl == [],
          f"raised={raised2}, deadletters={dl}")

    # 3) READ-ONLY (platform incident) -> re-raised, NEVER dead-lettered (the
    #    dead-letter INSERT would itself fail read-only). _run_cycle catches it and
    #    skips the whole cycle cleanly instead of exiting RED.
    raised3 = None
    try:
        await tvh._on_write_error(None, "prices", "COMI", {},
                                  pg.ReadOnlySQLTransactionError("cannot execute INSERT in a read-only transaction"))
    except pg.ReadOnlySQLTransactionError:
        raised3 = True
    check("read-only DB -> re-raised for clean skip (never dead-lettered)",
          raised3 and dl == [], f"raised={raised3}, deadletters={dl}")

    # 4) genuine single-row DATA error -> dead-lettered, cycle survives
    await tvh._on_write_error(None, "prices", "XYZ", {}, ValueError("bad numeric for one row"))
    check("single bad row -> dead-lettered, cycle survives", dl == [("prices", "XYZ")], f"{dl}")


# --------------------------------------------------------------------------- #
# 14.1c WRITE CONTRACT (requires DB) — dry-run the harvester's EXACT write SQL
#   against the LIVE schema inside a rolled-back transaction. Zero data impact.
#   This is the gate that catches column/table drift BEFORE a live harvest.
# --------------------------------------------------------------------------- #
async def suite_write_contract():
    if not DATABASE_URL:
        print("\n14.1c WRITE CONTRACT: skipped (no DATABASE_URL)")
        return
    import asyncpg
    from datetime import date
    tvh = _load_harvester()
    print("\n14.1c WRITE CONTRACT (every write statement vs live schema)")
    try:
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0, command_timeout=20)
    except (asyncpg.CannotConnectNowError, asyncpg.PostgresConnectionError,
            OSError, asyncio.TimeoutError) as e:
        skip("write-contract suite (DB unreachable — transient infra)", type(e).__name__)
        return
    try:
        # (a) parse-validate EVERY write statement of EVERY cycle against the live
        #     schema: catches missing/renamed columns, dropped tables, syntax drift
        #     (the 'sector' incident class). Parse-only — no execute, no data.
        bad = []
        for label, sql in tvh.ALL_WRITE_SQL.items():
            try:
                await conn.prepare(sql)
            except Exception as e:  # noqa: BLE001
                bad.append(f"{label}: {type(e).__name__}: {str(e).splitlines()[0]}")
        check(f"all {len(tvh.ALL_WRITE_SQL)} write statements parse vs live schema",
              not bad, " | ".join(bad))

        # (b) market_tickers conflict semantics — the PK-vs-target dup-key bug only
        #     shows at runtime, so execute both paths in a rolled-back tx.
        tr = conn.transaction()
        await tr.start()
        try:
            probe = "__QAPROBE__"  # synthetic; <= market_tickers.symbol varchar(20); rolled back
            # INSERT path: validates columns/types/lengths against the live schema.
            await conn.execute(tvh.SQL_UPSERT_MARKET_TICKER,
                probe, "QA Probe", "QA Sector", 1.0, 0.0, 0.0, 0,
                None, None, None,                  # market_cap, pe_ratio, dividend_yield
                None, None, None, None, None, None,  # pb, beta, fwd_pe, float%, float, holders
                None, None,                        # high_52w, low_52w
                "qa")
            await conn.execute(tvh.SQL_UPSERT_OHLC,
                probe, date(2000, 1, 1), 1.0, 1.0, 1.0, 1.0, 0, "qa")
            check("prices-cycle SQL matches market_tickers + ohlc_data schema", True)

            # CONFLICT path: a pre-existing row under a NULL market_code must still
            # UPDATE — guards the 2026-06-07 72-row 'market_tickers_pkey already
            # exists' failure caused by an ON CONFLICT target not matching the PK.
            probe2 = "__QAPROBE2__"
            await conn.execute(
                "INSERT INTO market_tickers (symbol, market_code, last_price) VALUES ($1, NULL, 1.0)", probe2)
            await conn.execute(tvh.SQL_UPSERT_MARKET_TICKER,
                probe2, "QA Probe", "QA Sector", 2.0, 0.0, 0.0, 0, None, None, None,
                None, None, None, None, None, None, None, None, "qa")
            check("upsert over NULL-market_code row UPDATEs (no dup-key)", True)
        except asyncpg.ReadOnlySQLTransactionError:
            # DB is read-only (Supabase platform incident/standby). The execute-
            # probe can't run, but that is NOT schema drift — the parse-validation
            # above ("all N write statements parse vs live schema") DID run (PREPARE
            # works read-only) and still gates drift. Skip, don't fail the gate.
            skip("prices-cycle execute-probe (DB read-only — platform incident)",
                 "parse-validation still gated schema drift; execute-probe re-runs when writable")
        except Exception as e:  # noqa: BLE001 — any structural mismatch is a No-Go
            check("prices-cycle SQL matches market_tickers + ohlc_data schema", False,
                  f"{type(e).__name__}: {e}")
        finally:
            await tr.rollback()  # never persist the probe row
    finally:
        await conn.close()


# --------------------------------------------------------------------------- #
# 14.1 / live: validate the real TV client's own gates
# --------------------------------------------------------------------------- #
async def suite_live():
    print("\n14.1b LIVE SOURCE INTEGRITY (TradingView)")
    c = TradingViewEGXClient()
    stocks = await c.get_egx_stocks()
    check("universe >= 285", len({s['symbol'] for s in stocks}) >= 285, f"{len(stocks)}")
    check("zero duplicate symbols (source layer)",
          len({s['symbol'] for s in stocks}) == len(stocks))
    check("all prices > 0", all(s['last_price'] > 0 for s in stocks))
    check("no NaN/Inf leaked", all(
        s['last_price'] == s['last_price'] and abs(s['last_price']) != float('inf') for s in stocks))
    check("all EGP", all(s['currency'] == 'EGP' for s in stocks))
    check("change% within sanity (|x|<=40)",
          all(s.get('change_percent') is None or abs(s['change_percent']) <= 40 for s in stocks))


# --------------------------------------------------------------------------- #
# 14.1  DATA-QUALITY (requires DATABASE_URL)
# --------------------------------------------------------------------------- #
async def suite_dataquality():
    if not DATABASE_URL:
        print("\n14.1 DATA-QUALITY: skipped (no DATABASE_URL)")
        return
    import asyncpg
    print("\n14.1 DATA-QUALITY (Supabase)")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        dup_tables = [
            ("market_tickers", "symbol, market_code"),
            ("ohlc_data", "symbol, date"),
            ("egx_technicals", "symbol, timeframe"),
            ("egx_estimates", "symbol"),
        ]
        for tbl, key in dup_tables:
            try:
                row = await conn.fetchrow(
                    f"SELECT COUNT(*) c FROM (SELECT {key} FROM {tbl} GROUP BY {key} "
                    f"HAVING COUNT(*)>1) d")
                check(f"zero duplicates: {tbl}", row["c"] == 0, f"{row['c']} dup keys")
            except Exception as e:  # table may not exist yet pre-migration
                check(f"zero duplicates: {tbl}", False, f"table check failed: {e}")

        bad = await conn.fetchrow(
            "SELECT COUNT(*) c FROM market_tickers WHERE market_code='EGX' "
            "AND (last_price<=0 OR last_price IS NULL)")
        check("market_tickers: no non-positive prices", bad["c"] == 0, f"{bad['c']}")

        orphans = await conn.fetchrow(
            "SELECT COUNT(*) c FROM egx_technicals t LEFT JOIN symbol_map m "
            "ON t.symbol=m.internal_symbol WHERE m.internal_symbol IS NULL")
        check("referential integrity: technicals -> symbol_map", orphans["c"] == 0, f"{orphans['c']}")

        dl = await conn.fetchrow("SELECT COUNT(*) c FROM egx_ingest_deadletter "
                                 "WHERE created_at > now() - interval '1 day'")
        check("dead-letter queue empty (24h)", dl["c"] == 0, f"{dl['c']} failed rows")
    finally:
        await conn.close()


async def main(suite: str):
    print("=" * 60)
    print("EGX DATA AUDIT  -  institutional go/no-go gate")
    print("=" * 60)
    if suite in ("all", "resilience", "contract"):
        await suite_write_resilience()      # no-DB write-path error taxonomy
    if suite in ("all", "resilience"):
        await suite_resilience()
    if suite in ("all", "contract", "dataquality"):
        await suite_write_contract()        # DB dry-run: SQL vs live schema
    if suite in ("all", "live"):
        await suite_live()
    if suite in ("all", "dataquality"):
        await suite_dataquality()

    reds = [r for r in results if not r[1]]
    print("\n" + "=" * 60)
    summary = f"RESULT: {len(results)-len(reds)}/{len(results)} GREEN"
    if skipped:
        summary += f", {len(skipped)} SKIPPED (transient infra — not a schema failure)"
    print(summary)
    if reds:
        print(f"NO-GO  - {len(reds)} RED:")
        for n, _, d in reds:
            print(f"   - {n} {d}")
        sys.exit(1)
    if skipped:
        print("Skipped (could not run — transient, not-our-fault; did NOT gate):")
        for n, d in skipped:
            print(f"   ~ {n}{('  - ' + d) if d else ''}")
        print("GO  - all runnable checks GREEN (see skips above)")
    else:
        print("GO  - all checks GREEN")
    sys.exit(0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--suite", default="all",
                    choices=["all", "resilience", "live", "dataquality", "contract"])
    asyncio.run(main(ap.parse_args().suite))
