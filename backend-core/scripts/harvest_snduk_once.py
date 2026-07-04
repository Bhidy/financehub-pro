#!/usr/bin/env python3
"""
ONE-TIME competitor gap-fill harvest: snduk.com -> mutual_funds (fill-don't-null).

Pulls FACTUAL fund reference data that is currently NULL in our DB (fees, minimum
investment, inception, risk, fund type) plus new data (distribution platforms,
prospectus URL, alternative names, purchase/redemption frequency, fund manager) and
asset-manager profiles (establishment year, chairman, capital). Deliberately EXCLUDES
editorial copy (descriptions), computed scores, NAV/returns — we compute/own those.

SAFETY
  * matches snduk fund -> our Mubasher-id fund ONLY when both the NAME and the exact
    NAV agree (1:1) — near-certain; name-only matches are skipped, not guessed.
  * fill-don't-null: writes a column ONLY where ours is currently empty; never
    overwrites our data or a future better source (Decypha/prospectus).
  * type-aware: introspects mutual_funds column types and casts accordingly, so a
    type mismatch can never corrupt or crash (per-fund isolation).
  * new tables/columns are self-migrating (IF NOT EXISTS); read-only preflight; the
    whole thing is idempotent (safe to re-run) and one-time by intent.

USAGE  python harvest_snduk_once.py [--dry-run]
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import httpx
except ModuleNotFoundError:  # pragma: no cover
    httpx = None

UA = {"User-Agent": "Mozilla/5.0 (compatible; startamarkets-harvest/1.0)"}
SNDUK_LIST = ("https://snduk.com/api/trpc/funds.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B"
              "%22type%22%3Anull%2C%22country%22%3A%22EG%22%2C%22search%22%3Anull%2C%22minInvestment"
              "%22%3A0%2C%22maxInvestment%22%3A1000000%2C%22minPerformance%22%3A0%2C%22maxPerformance"
              "%22%3A100%2C%22categoryId%22%3Anull%2C%22sortBy%22%3A%22performance%22%2C%22sortDirection"
              "%22%3A%22desc%22%2C%22isActive%22%3Atrue%2C%22limit%22%3A1000%2C%22offset%22%3A0%7D%2C"
              "%22meta%22%3A%7B%22values%22%3A%7B%22type%22%3A%5B%22undefined%22%5D%2C%22search%22%3A"
              "%5B%22undefined%22%5D%2C%22categoryId%22%3A%5B%22undefined%22%5D%7D%2C%22v%22%3A1%7D%7D%7D")
SNDUK_MGRS = ("https://snduk.com/api/trpc/assetManagers.getAllPublic?batch=1&input=%7B%220%22%3A%7B"
              "%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D")
MUB_LIST = "https://english.mubasher.info/api/1/funds?country=eg&size=500"

STOP = set("fund funds investment investments the egypt egyptian first second third fourth mutual "
           "of and for بنك equity money market fixed income no شركة صندوق استثمار الأول".split())


def _toks(s):
    return {t for t in re.sub(r"[^a-z0-9؀-ۿ]+", " ", (s or "").lower()).split()
            if t and t not in STOP and len(t) > 1}


def _name_score(a, b):
    ta, tb = _toks(a), _toks(b)
    return len(ta & tb) / len(ta | tb) if ta and tb else 0.0


def _nav_close(p1, p2):
    try:
        p1, p2 = float(p1), float(p2)
        return p2 > 0 and abs(p1 - p2) / p2 < 0.01
    except (TypeError, ValueError):
        return False


def _num(s):
    try:
        v = float(str(s).replace(",", "").strip())
        return v if v == v else None  # drop NaN
    except (TypeError, ValueError):
        return None


def _lead_int(s):
    m = re.search(r"\d[\d,]*", str(s or ""))
    return int(m.group(0).replace(",", "")) if m else None


def _pdate(s):
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def load_db_url():
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()
    for cand in ("~/Documents/startamarkets/.env", ".env", "../.env", "../../.env"):
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r'\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
                if m:
                    return m.group(1).strip()
    raise SystemExit("FATAL: DATABASE_URL not set")


async def _get_json(c, url):
    r = await c.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


async def _page_trading(c, slug):
    """Parse tradingInfo (fees/frequency) + platforms from a fund page's flight data."""
    try:
        html = (await c.get(f"https://snduk.com/eg/funds/{slug}?lang=en", timeout=30)).text.replace('\\"', '"')
        ti = {}
        m = re.search(r'"tradingInfo":\{"tradingInfo":\{([^}]+)\}', html)
        if m:
            for k, v1, v2 in re.findall(r'"(\w+)":(?:"([^"]*)"|(null|[\d.]+))', "{" + m.group(1) + "}"):
                ti[k] = v1 or v2
        plats = re.findall(r'"platform":\{"id":\d+,"name":"([^"]+)"(?:,"logoUrl":(?:"([^"]*)"|null))?', html)
        return ti, [(n, (lg or None)) for n, lg in plats]
    except Exception:
        return {}, []


MIGRATE = [
    "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS prospectus_url TEXT",
    "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS alternative_names TEXT",
    "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS fund_manager TEXT",
    "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS purchase_frequency TEXT",
    "ALTER TABLE mutual_funds ADD COLUMN IF NOT EXISTS redemption_frequency TEXT",
    """CREATE TABLE IF NOT EXISTS fund_platforms (
           fund_id TEXT NOT NULL, platform_name TEXT NOT NULL, logo_url TEXT, source TEXT,
           created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (fund_id, platform_name))""",
    """CREATE TABLE IF NOT EXISTS asset_managers (
           snduk_id INTEGER PRIMARY KEY, name TEXT, name_en TEXT, code TEXT,
           establishment_year TEXT, chairman TEXT, capital TEXT, logo_url TEXT,
           total_aum TEXT, fund_count INTEGER, country TEXT, source TEXT,
           updated_at TIMESTAMPTZ DEFAULT NOW())""",
]

# gap-fill target column -> (snduk value extractor from a match dict)
GAPFILL = {
    "fee_management": lambda d: _num(d["sn"].get("managementFee")),
    "fee_subscription": lambda d: _num(d["ti"].get("purchaseFeeValue")),
    "fee_redemption": lambda d: _num(d["ti"].get("redemptionFeeValue")),
    "min_subscription": lambda d: _lead_int(d["sn"].get("minimumInvestment")),
    "inception_date": lambda d: _pdate(d["sn"].get("inceptionDate")),
    "risk_level": lambda d: (d["sn"].get("riskLevel") or None),
    "fund_type": lambda d: (d["sn"].get("type") or None),
    "classification": lambda d: (d["sn"].get("typeNameEn") or None),
}


async def run(dry_run=False):
    from data_pipeline.pg_resilient import connect_resilient, database_is_read_only

    if httpx is None:
        raise SystemExit("FATAL: httpx not installed")
    async with httpx.AsyncClient(headers=UA, follow_redirects=True) as c:
        sn = (await _get_json(c, SNDUK_LIST))[0]["result"]["data"]["json"]["funds"]
        mub = (await _get_json(c, MUB_LIST))["rows"]
        mgrs = (await _get_json(c, SNDUK_MGRS))[0]["result"]["data"]["json"]["managers"]

        # match snduk -> mubasher (1:1, NAV-corroborated only)
        cand = []
        for f in sn:
            for r in mub:
                ns = _name_score(f.get("nameEn"), r.get("name"))
                if ns >= 0.4 and _nav_close(f.get("currentPrice"), r.get("price")):
                    cand.append((ns, f, str(r["fundId"])))
        cand.sort(key=lambda x: -x[0])
        used_sn, used_mub, pairs = set(), set(), []
        for ns, f, fid in cand:
            if f["id"] in used_sn or fid in used_mub:
                continue
            used_sn.add(f["id"]); used_mub.add(fid); pairs.append((f, fid))
        print(f"[harvest] snduk={len(sn)} matched(NAV+name,1:1)={len(pairs)}", flush=True)

        # fetch tradingInfo + platforms for matched funds
        sem = asyncio.Semaphore(8)
        async def ti_for(f):
            async with sem:
                return f["id"], await _page_trading(c, f["customSlug"])
        timap = dict(await asyncio.gather(*[ti_for(f) for f, _ in pairs]))

    conn = await connect_resilient(load_db_url())
    try:
        if await database_is_read_only(conn):
            print("[skip] database is READ-ONLY — resumes when writable. Not an error.", flush=True)
            return 0
        if not dry_run:
            for stmt in MIGRATE:
                await conn.execute(stmt)

        # column types for type-aware, fill-don't-null gap-fill
        types = {r["column_name"]: r["data_type"] for r in await conn.fetch(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='mutual_funds'")}

        stats = {"funds_matched": len(pairs), "cols_filled": 0, "platforms": 0,
                 "managers": 0, "new_cols": 0, "skipped_present": 0, "failures": []}

        for f, fid in pairs:
            ctx = {"sn": f, "ti": timap.get(f["id"], ({}, []))[0]}
            plats = timap.get(f["id"], ({}, []))[1]
            # 1) fill-don't-null the existing factual columns (type-aware)
            for col, extract in GAPFILL.items():
                if col not in types:
                    continue
                val = extract(ctx)
                if val is None:
                    continue
                try:
                    if dry_run:
                        stats["cols_filled"] += 1; continue
                    res = await conn.execute(
                        f"UPDATE mutual_funds SET {col} = $2 WHERE fund_id = $1 "
                        f"AND ({col} IS NULL" + (f" OR {col}::text = ''" if types[col] in ("text", "character varying") else "") + ")",
                        fid, val)
                    if res.endswith("1"):
                        stats["cols_filled"] += 1
                    else:
                        stats["skipped_present"] += 1
                except Exception as e:  # noqa: BLE001 - per-column isolation, never corrupt
                    stats["failures"].append(f"{fid}.{col}:{type(e).__name__}")
            # 2) new text columns (added by MIGRATE) fill-don't-null
            newvals = {
                "prospectus_url": f.get("prospectusUrl") or None,
                "alternative_names": "; ".join(f.get("alternativeNames") or []) or None,
                "fund_manager": f.get("fundManager") or None,
                "purchase_frequency": ctx["ti"].get("purchaseFrequency"),
                "redemption_frequency": ctx["ti"].get("redemptionFrequency"),
            }
            for col, val in newvals.items():
                if not val or dry_run:
                    continue
                try:
                    r = await conn.execute(
                        f"UPDATE mutual_funds SET {col} = $2 WHERE fund_id = $1 AND COALESCE({col},'')=''", fid, val)
                    if r.endswith("1"):
                        stats["new_cols"] += 1
                except Exception as e:  # noqa: BLE001
                    stats["failures"].append(f"{fid}.{col}:{type(e).__name__}")
            # 3) distribution platforms (new table, idempotent)
            for name, logo in plats:
                if dry_run:
                    stats["platforms"] += 1; continue
                try:
                    await conn.execute(
                        "INSERT INTO fund_platforms (fund_id, platform_name, logo_url, source) "
                        "VALUES ($1,$2,$3,'snduk') ON CONFLICT (fund_id, platform_name) DO NOTHING",
                        fid, name, logo)
                    stats["platforms"] += 1
                except Exception as e:  # noqa: BLE001
                    stats["failures"].append(f"plat:{fid}:{type(e).__name__}")

        # 4) asset-manager profiles (new table, idempotent)
        for m in mgrs:
            if dry_run:
                stats["managers"] += 1; continue
            try:
                await conn.execute(
                    """INSERT INTO asset_managers
                       (snduk_id,name,name_en,code,establishment_year,chairman,capital,logo_url,
                        total_aum,fund_count,country,source,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'snduk',NOW())
                       ON CONFLICT (snduk_id) DO UPDATE SET
                         establishment_year=COALESCE(NULLIF(asset_managers.establishment_year,''),EXCLUDED.establishment_year),
                         chairman=COALESCE(NULLIF(asset_managers.chairman,''),EXCLUDED.chairman),
                         capital=COALESCE(NULLIF(asset_managers.capital,''),EXCLUDED.capital),
                         logo_url=COALESCE(NULLIF(asset_managers.logo_url,''),EXCLUDED.logo_url),
                         updated_at=NOW()""",
                    int(m["id"]), m.get("name"), m.get("nameEn"), m.get("code"),
                    m.get("establishmentYear"), m.get("chairman"), m.get("capital"),
                    m.get("logoUrl"), str(m.get("totalAUM") or ""),
                    _lead_int(m.get("fundCount")), m.get("country"))
                stats["managers"] += 1
            except Exception as e:  # noqa: BLE001
                stats["failures"].append(f"mgr:{m.get('id')}:{type(e).__name__}")

        import json as _json
        print("[harvest] RESULT " + _json.dumps(stats, default=str), flush=True)
        if stats["funds_matched"] < 30:
            print(f"::error::harvest matched only {stats['funds_matched']} funds (<30) — treating as failure.",
                  flush=True)
            return 2
        return 0
    finally:
        await conn.close()


def main():
    ap = argparse.ArgumentParser(description="One-time snduk fund-metadata gap-fill harvest")
    ap.add_argument("--dry-run", action="store_true", help="extract+match+migrate-plan only, no writes")
    args = ap.parse_args()
    sys.exit(asyncio.run(run(dry_run=args.dry_run)))


if __name__ == "__main__":
    main()
