#!/usr/bin/env python3
"""
Refresh EGX company names (EN + AR) in market_tickers from TradingView.

Why name_en: 95% of EGX rows had name_en = the ticker symbol (placeholder), so
the English website / app / AI-chat showed the ticker instead of the company
name. TradingView's scanner returns the real company name in `description`
(the same feed that already powers egx_technicals / egx_dividends).

Why name_ar (added 2026-07-03 after the production audit): name_ar was
previously backfilled from ticker_aliases (fix_arabic_names.py) — a fuzzy
SEARCH table, not an identity source — which joined WRONG companies onto
symbols (EXPA showed "اكسلنس"/Excellence; ARAB showed the unrelated Arab
African International Bank). TradingView serves the same `description`
localized via options.lang=ar, keyed by the SAME symbol row — entity identity
is structural, no join to go wrong. Verified live: EXPA -> "البنك المصري
لتنمية الصادرات", COMI -> "البنك التجاري الدولي".

Idempotent + safe:
  - name_en: only overwrites placeholders / stale values; never blanks.
  - name_ar: overwritten from TradingView when its ar description actually
    contains Arabic script. When TradingView has NO Arabic for a symbol it
    DOES list, name_ar is set to NULL — a missing Arabic name (frontend falls
    back to name_en/symbol) is strictly better than a possibly-wrong company
    identity. The NULL-out pass only runs when Arabic coverage is plausibly
    complete (>= 200 Arabic names), so a degraded TV response can never strip
    the table.
  - Never fabricates: symbols absent from the TradingView response are left
    untouched.

Usage:  python backend-core/scripts/refresh_company_names.py
Env:    DATABASE_URL (falls back to .env at repo root)
"""
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.pg_resilient import connect_resilient  # noqa: E402

import httpx

try:
    import asyncpg  # noqa: F401
except ImportError:
    print("asyncpg required", file=sys.stderr)
    sys.exit(1)

SCAN_URL = "https://scanner.tradingview.com/egypt/scan"
_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
_HEADERS = {"User-Agent": _UA, "Accept": "application/json",
            "Origin": "https://www.tradingview.com"}

_ARABIC_RE = re.compile(r"[؀-ۿ]")

# Below this many Arabic names, assume the localized feed is degraded and do
# NOT null out anything (positive updates only).
MIN_AR_COVERAGE_FOR_NULLOUT = 200


async def fetch_tv_names(lang: str | None = None) -> dict:
    """Return {SYMBOL: description} from TradingView's EGX scanner
    (localized when lang is given)."""
    body = {
        "columns": ["name", "description"],
        "range": [0, 1000],
        "filter": [{"left": "exchange", "operation": "equal", "right": "EGX"}],
    }
    if lang:
        body["options"] = {"lang": lang}
    async with httpx.AsyncClient(timeout=30, headers=_HEADERS) as c:
        r = await c.post(SCAN_URL, json=body)
        r.raise_for_status()
        data = r.json().get("data", [])
    names = {}
    for row in data:
        sym = str(row.get("s", "")).split(":")[-1].strip().upper()
        vals = row.get("d") or []
        desc = (vals[1] if len(vals) > 1 else None)
        if sym and desc and isinstance(desc, str) and desc.strip():
            names[sym] = desc.strip()
    return names


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    # fall back to repo-root .env
    here = os.path.dirname(os.path.abspath(__file__))
    env = os.path.join(here, "..", "..", ".env")
    if os.path.exists(env):
        for line in open(env):
            if line.strip().startswith("DATABASE_URL"):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise RuntimeError("DATABASE_URL not set")


async def main():
    url = _database_url()
    names_en = await fetch_tv_names()
    names_ar_raw = await fetch_tv_names(lang="ar")
    print(f"TradingView returned {len(names_en)} EN / {len(names_ar_raw)} ar-lang EGX names")
    if len(names_en) < 50:
        print("ABORT: implausibly few names from TradingView (feed issue?)", file=sys.stderr)
        sys.exit(1)

    # Keep only genuinely-Arabic values: TV falls back to the English text
    # when a symbol has no Arabic translation — those must become NULL, not
    # be stored as "Arabic" names.
    names_ar = {s: v for s, v in names_ar_raw.items() if _ARABIC_RE.search(v)}
    print(f"Arabic-script names: {len(names_ar)}")

    conn = await connect_resilient(url)
    try:
        updated = 0
        for sym, name in names_en.items():
            # Update only EGX rows whose English name is a placeholder or stale.
            res = await conn.execute(
                """
                UPDATE market_tickers
                SET name_en = $2
                WHERE market_code = 'EGX' AND UPPER(symbol) = $1
                  AND COALESCE(name_en, '') <> $2
                  AND (name_en IS NULL OR name_en = '' OR name_en = symbol
                       OR name_en <> $2)
                """,
                sym, name,
            )
            if res.endswith("1"):
                updated += 1
        print(f"Updated name_en for {updated} EGX tickers")

        # name_ar: authoritative overwrite from the localized description.
        ar_updated = 0
        for sym, name in names_ar.items():
            res = await conn.execute(
                """
                UPDATE market_tickers
                SET name_ar = $2
                WHERE market_code = 'EGX' AND UPPER(symbol) = $1
                  AND COALESCE(name_ar, '') <> $2
                """,
                sym, name,
            )
            if res.endswith("1"):
                ar_updated += 1
        print(f"Updated name_ar for {ar_updated} EGX tickers")

        # NULL out name_ar where TradingView lists the symbol but has no
        # Arabic name — the legacy aliases-derived values there are untrusted
        # (wrong-entity joins). Guarded by a coverage threshold so a degraded
        # localized feed can never mass-strip the table.
        if len(names_ar) >= MIN_AR_COVERAGE_FOR_NULLOUT:
            no_ar = [s for s in names_en.keys() if s not in names_ar]
            nulled = 0
            for sym in no_ar:
                res = await conn.execute(
                    """
                    UPDATE market_tickers
                    SET name_ar = NULL
                    WHERE market_code = 'EGX' AND UPPER(symbol) = $1
                      AND name_ar IS NOT NULL
                    """,
                    sym,
                )
                if res.endswith("1"):
                    nulled += 1
            print(f"Nulled untrusted name_ar for {nulled} tickers without a TV Arabic name")
        else:
            print(f"SKIP null-out pass: Arabic coverage {len(names_ar)} < {MIN_AR_COVERAGE_FOR_NULLOUT}")

        # Validate a sample (EXPA + ARAB were the audit's wrong-entity cases)
        for s in ["COMI", "HRHO", "SWDY", "ETEL", "TMGH", "EXPA", "ARAB"]:
            row = await conn.fetchrow(
                "SELECT name_en, name_ar FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", s)
            if row:
                print(f"  {s}: {row['name_en']} | {row['name_ar']}")

        remaining = await conn.fetchval(
            "SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX' "
            "AND (name_en = symbol OR name_en IS NULL OR name_en = '')")
        print(f"EGX rows still missing a real name_en: {remaining}")
        ar_coverage = await conn.fetchval(
            "SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX' AND name_ar IS NOT NULL")
        print(f"EGX rows with name_ar: {ar_coverage}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
