#!/usr/bin/env python3
"""
Refresh EGX company names in market_tickers from TradingView.

Why: 95% of EGX rows had name_en = the ticker symbol (placeholder), so the
English website / app / AI-chat showed the ticker instead of the company name.
There was no English-name source in the DB. TradingView's scanner returns the
real company name in its `description` column (the same feed that already powers
egx_technicals / egx_dividends), so we use that as the source of truth.

Idempotent + safe:
  - Only writes market_tickers.name_en (never touches name_ar).
  - Only overwrites when the stored name_en is a placeholder (== symbol / NULL /
    empty) OR differs from the fresh TradingView name; never blanks a real name.
  - Never fabricates: if TradingView has no name for a symbol, that row is skipped.

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
    import asyncpg
except ImportError:
    print("asyncpg required", file=sys.stderr)
    sys.exit(1)

SCAN_URL = "https://scanner.tradingview.com/egypt/scan"
_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
_HEADERS = {"User-Agent": _UA, "Accept": "application/json",
            "Origin": "https://www.tradingview.com"}


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


async def fetch_tv_names() -> dict:
    """Return {SYMBOL: company_name} from TradingView's EGX scanner."""
    body = {
        "columns": ["name", "description"],
        "range": [0, 1000],
        "filter": [{"left": "exchange", "operation": "equal", "right": "EGX"}],
    }
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


async def main():
    url = _database_url()
    names = await fetch_tv_names()
    print(f"TradingView returned {len(names)} EGX company names")
    if len(names) < 50:
        print("ABORT: implausibly few names from TradingView (feed issue?)", file=sys.stderr)
        sys.exit(1)

    conn = await connect_resilient(url)
    try:
        updated = 0
        for sym, name in names.items():
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

        # Validate a sample
        for s in ["COMI", "HRHO", "SWDY", "ETEL", "TMGH"]:
            row = await conn.fetchrow(
                "SELECT name_en FROM market_tickers WHERE symbol=$1 AND market_code='EGX'", s)
            print(f"  {s}: {row['name_en'] if row else 'N/A'}")

        remaining = await conn.fetchval(
            "SELECT COUNT(*) FROM market_tickers WHERE market_code='EGX' "
            "AND (name_en = symbol OR name_en IS NULL OR name_en = '')")
        print(f"EGX rows still missing a real name_en: {remaining}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
