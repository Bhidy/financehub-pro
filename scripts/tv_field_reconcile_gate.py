#!/usr/bin/env python3
"""
TV FIELD RECONCILE GATE — full-universe, field-by-field reconciliation of the
LIVE public symbol-page data against TradingView (the mandated single source).

Born from the June-2026 audit that found, invisible to all existing monitors:
  * P/B wrong for 108/215 stocks (stale yfinance under source='tradingview')
  * dividend yield junk for 152 stocks (wrong TV column harvested)
  * stale P/E shown for 102 stocks where TV has none (no NULL-overwrite)
  * every "(TTM)" metric actually showing FY values (semantic drift)
The class this kills: "we differ from the source" — which scale/type/internal
checks can never see. Compares EVERY symbol x EVERY key field, nightly.

Checks per symbol (prod /egx/statistics + /tickers vs TV /scan):
  price, market_cap, pe_ratio, forward_pe, pb_ratio, dividend_yield, beta,
  eps_ttm, revenue_ttm, net_income_ttm, eps_fy, revenue_fy, net_income_fy,
  total_debt, shares_outstanding, bvps, float_shares_percent, float_shares.

Verdict rules (per field, over the prod∩TV universe):
  * MISMATCH  — both sides have a value, relative deviation > TOL (1%)
  * GHOST     — prod shows a value where TV has none (must be NULL-overwritten)
  RED (exit 1 + Discord) if any field has > MAX_BAD mismatches or ghosts.
  Infra failure (API/TV unreachable) is RED too — a blind gate must not be green.

Pure stdlib. Discord alert when DISCORD_WEBHOOK_URL is set.
Local macOS runs may need DQ_INSECURE=1 (system cert store gap).
"""
from __future__ import annotations

import concurrent.futures
import json
import math
import os
import ssl
import sys
import urllib.request

PROD = os.environ.get("RECONCILE_BASE", "https://startamarkets.com/api/v1")
TV_URL = "https://scanner.tradingview.com/egypt/scan"
TOL = float(os.environ.get("RECONCILE_TOL", "0.01"))      # 1% relative
MAX_BAD = int(os.environ.get("RECONCILE_MAX_BAD", "2"))   # per-field allowance (cycle-timing noise)
TIMEOUT = 30

_CTX = ssl._create_unverified_context() if os.environ.get("DQ_INSECURE") == "1" else None

TV_COLS = [
    "name", "close", "market_cap_basic", "price_earnings_ttm", "price_earnings_forward_fy",
    "price_book_ratio", "dividends_yield_current", "beta_1_year",
    "earnings_per_share_diluted_ttm", "total_revenue_ttm", "net_income_ttm",
    "earnings_per_share_diluted_fy", "total_revenue_fy", "net_income_fy",
    "total_debt_fy", "total_shares_outstanding_current", "book_value_per_share_fy",
    "float_shares_percent_current", "float_shares_outstanding_current",
]

# (label, prod statistics key, tv column)
CHECKS = [
    ("price",            "last_price",           "close"),
    ("market_cap",       "market_cap",           "market_cap_basic"),
    ("pe_ratio",         "pe_ratio",             "price_earnings_ttm"),
    ("forward_pe",       "forward_pe",           "price_earnings_forward_fy"),
    ("pb_ratio",         "pb_ratio",             "price_book_ratio"),
    ("dividend_yield",   "dividend_yield",       "dividends_yield_current"),
    ("beta_1y",          "beta_1y",              "beta_1_year"),
    ("eps_ttm",          "eps_ttm",              "earnings_per_share_diluted_ttm"),
    ("revenue_ttm",      "revenue_ttm",          "total_revenue_ttm"),
    ("net_income_ttm",   "net_income_ttm",       "net_income_ttm"),
    ("eps_fy",           "eps_fy",               "earnings_per_share_diluted_fy"),
    ("revenue_fy",       "revenue_fy",           "total_revenue_fy"),
    ("net_income_fy",    "net_income_fy",        "net_income_fy"),
    ("total_debt",       "total_debt",           "total_debt_fy"),
    ("shares_out",       "shares_outstanding",   "total_shares_outstanding_current"),
    ("bvps",             "bvps",                 "book_value_per_share_fy"),
    ("float_pct",        "float_shares_percent", "float_shares_percent_current"),
    ("float_shares",     "float_shares",         "float_shares_outstanding_current"),
]
# Fields where FY-vs-TTM revisions / annual-lag are expected between weekly
# harvests: ghosts are still violations, but value mismatches use a wider net
# (the weekly fundamentals cycle refreshes them; price-cycle fields are tight).
WEEKLY_FIELDS = {"eps_ttm", "revenue_ttm", "net_income_ttm", "eps_fy", "revenue_fy",
                 "net_income_fy", "total_debt", "bvps", "shares_out", "forward_pe"}
WEEKLY_TOL = float(os.environ.get("RECONCILE_WEEKLY_TOL", "0.05"))  # 5%
# FY fields are legitimately backed by TradingView's `_fy_h` HISTORY ARRAYS for
# ~70 symbols whose current-year scalar is null (egx_financials latest annual row
# — still 100% TV data; it feeds the Financials tab). A prod value where only the
# TV *scalar* is null is therefore NOT a ghost for these fields; the mismatch
# check (both sides present) still applies and stays strict.
HISTORY_BACKED = {"eps_fy", "revenue_fy", "net_income_fy", "total_debt", "bvps"}


def http_json(url: str, data=None):
    req = urllib.request.Request(
        url, data=json.dumps(data).encode() if data else None,
        headers={"Content-Type": "application/json", "User-Agent": "starta-reconcile-gate/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=_CTX) as r:
        return json.loads(r.read().decode())


def f(x):
    try:
        if x is None:
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def discord(title: str, lines: list[str], color: int):
    hook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not hook:
        print("   (DISCORD_WEBHOOK_URL not set — no alert sent)")
        return
    body = json.dumps({"embeds": [{"title": title, "description": "\n".join(lines)[:3900],
                                   "color": color}]}).encode()
    try:
        req = urllib.request.Request(hook, data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=15, context=_CTX)
    except Exception as e:  # alerting must never mask the gate result
        print(f"   (Discord alert failed: {e})")


def main() -> int:
    # 1) TradingView ground truth (one call, full universe)
    tv_rows = http_json(TV_URL, {"columns": TV_COLS, "range": [0, 400]})["data"]
    tv = {r["s"].split(":")[1]: dict(zip(TV_COLS, r["d"])) for r in tv_rows}
    print(f"TV universe: {len(tv)}")

    # 2) prod universe
    tickers = http_json(f"{PROD}/tickers?market=EGX")
    items = tickers if isinstance(tickers, list) else tickers.get("tickers") or tickers.get("data") or []
    prod_syms = sorted({t["symbol"] for t in items if isinstance(t, dict) and t.get("symbol")} & set(tv))
    print(f"prod∩TV universe: {len(prod_syms)}")
    if len(prod_syms) < 150:
        print(f"RED: comparable universe collapsed to {len(prod_syms)} (<150) — feed or API broken")
        discord("🟥 TV reconcile gate: universe collapsed",
                [f"prod∩TV = {len(prod_syms)} symbols (<150)"], 0xE74C3C)
        return 1

    # 3) per-symbol statistics
    def fetch(sym):
        try:
            return sym, http_json(f"{PROD}/egx/statistics/{sym}")
        except Exception as e:
            return sym, {"_error": str(e)[:80]}
    stats = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for sym, s in ex.map(fetch, prod_syms):
            stats[sym] = s
    errors = [s for s, v in stats.items() if "_error" in v]
    if len(errors) > len(prod_syms) * 0.05:
        print(f"RED: {len(errors)} statistics fetches failed (>{len(prod_syms) * 0.05:.0f})")
        discord("🟥 TV reconcile gate: statistics endpoint failing",
                [f"{len(errors)}/{len(prod_syms)} fetch errors, e.g. {errors[:5]}"], 0xE74C3C)
        return 1

    # 4) reconcile
    bad_fields: list[str] = []
    report: list[str] = []
    for label, pkey, tcol in CHECKS:
        tol = WEEKLY_TOL if label in WEEKLY_FIELDS else TOL
        mism, ghosts, ok = [], [], 0
        for sym in prod_syms:
            s = stats.get(sym) or {}
            if "_error" in s:
                continue
            p, t = f(s.get(pkey)), f(tv[sym].get(tcol))
            if p is None:
                continue                      # prod hides it — never a lie
            if t is None:
                if label not in HISTORY_BACKED:
                    ghosts.append(sym)        # prod shows what TV doesn't have
                continue                      # history-backed: scalar-null is uncheckable here
            if t == 0:
                ok += 1 if abs(p) < 1e-9 else 0
                continue
            if abs(p - t) / abs(t) <= tol:
                ok += 1
            else:
                mism.append((sym, p, t))
        line = f"{label:<16} ok={ok:<4} mismatch={len(mism):<4} ghost={len(ghosts):<4}"
        if len(mism) > MAX_BAD or len(ghosts) > MAX_BAD:
            bad_fields.append(label)
            ex_m = ", ".join(f"{s}({p:.4g} vs {t:.4g})" for s, p, t in mism[:3])
            ex_g = ", ".join(ghosts[:3])
            line += f"  <-- RED  e.g. {ex_m or ex_g}"
        print(line)
        report.append(line)

    if bad_fields:
        print(f"\nRED: fields out of reconciliation: {', '.join(bad_fields)}")
        discord(f"🟥 TV reconcile gate: {len(bad_fields)} field(s) diverge from TradingView",
                [l for l in report if "RED" in l] + [f"universe={len(prod_syms)}, tol={TOL:.0%}/{WEEKLY_TOL:.0%}"],
                0xE74C3C)
        return 1

    print(f"\nGREEN: all {len(CHECKS)} fields reconcile with TradingView across {len(prod_syms)} symbols")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # a blind gate must not be green
        print(f"RED (infra): {type(e).__name__}: {e}")
        discord("🟥 TV reconcile gate: infrastructure failure", [f"{type(e).__name__}: {e}"], 0xE74C3C)
        sys.exit(1)
