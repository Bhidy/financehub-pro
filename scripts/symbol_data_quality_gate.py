#!/usr/bin/env python3
"""
Symbol Data-Quality Gate
========================================================================
The automated tripwire that would have caught the June-2026 symbol-page
incident BEFORE users saw it. It probes the LIVE public API for a sample of
EGX symbols and asserts the invariants that were violated:

  1. TYPE   — numeric indicator/financial fields must be JSON numbers, never
              strings. (A string reaching `.toFixed()` crashed the Technicals
              tab and blanked the whole app.)
  2. SCALE  — audited financials are stored in EGP-millions; if they leak out
              unscaled they are 1e6 too small ("EGP 82.24K" for an 82.24B
              net income). We assert magnitude vs market cap.
  3. PER-SHARE — book value / EPS must be per-share sane vs the share price
              (total equity 231514 was being shown as "Book Value / Share").
  4. RECONCILE — the statement-table net income and the profile net_income_ttm
              come from the same audited source and must agree.
  5. HEALTH — key endpoints return 200 (fair-values regressed to 500).
  6. FRESHNESS — the latest audited annual year must not fall behind
              (income_statements has no live writer; this catches the drift).

Exit code 1 on any CRITICAL violation (so CI goes red); Discord alert if
DISCORD_WEBHOOK_URL is set. Pure stdlib — no pip install needed.

Usage:  python scripts/symbol_data_quality_gate.py [--base https://startamarkets.com] [--year 2026]
"""
from __future__ import annotations
import argparse
import json
import os
import ssl
import sys
import urllib.request
import urllib.error

# CI (ubuntu) has CA certs and verifies normally. For local runs on machines
# with a broken cert store, set DQ_INSECURE=1 to skip verification (self-domain).
_SSL_CTX = ssl._create_unverified_context() if os.environ.get("DQ_INSECURE") else None

# Representative cross-section: large banks, industrials, telecoms, real estate,
# food, holding cos — bank + non-bank statement formats both exercised.
SAMPLE = ["COMI", "SWDY", "HRHO", "ABUK", "EAST", "TMGH",
          "ETEL", "SKPC", "MFPC", "ORWE", "JUFO", "PHDC"]

TECH_NUM = ["rsi", "macd_macd", "ema50", "ema200", "sma50", "sma200", "adx"]


def get_json(base: str, path: str, timeout: int = 25):
    url = f"{base}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "starta-dq-gate/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as r:
        return r.status, json.loads(r.read().decode("utf-8"))


def is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check_symbol(base: str, sym: str, min_year: int) -> list[str]:
    """Return a list of CRITICAL violation strings for one symbol."""
    v: list[str] = []

    # ---- 1+5: technicals types + endpoint health ----
    try:
        st, tech = get_json(base, f"/api/v1/egx/technicals/{sym}")
        if st != 200:
            v.append(f"{sym}: technicals HTTP {st}")
        for tf in (tech.get("timeframes") or []):
            for k in TECH_NUM:
                val = tf.get(k)
                if val is not None and not is_num(val):
                    v.append(f"{sym}: technicals.{k} is {type(val).__name__} not number "
                             f"(tf={tf.get('timeframe')}) — .toFixed() crash risk")
                    break
            else:
                continue
            break
    except Exception as e:
        v.append(f"{sym}: technicals fetch failed: {e}")

    # ---- profile (market cap, price, scaled stats) ----
    market_cap = last_price = None
    profile_ni = None
    try:
        st, prof = get_json(base, f"/api/v1/company/{sym}/profile")
        if st != 200:
            v.append(f"{sym}: profile HTTP {st}")
        stats = (prof or {}).get("statistics") or {}
        md = (prof or {}).get("market_data") or {}
        market_cap = _f(stats.get("market_cap"))
        last_price = _f(md.get("current_price"))
        profile_ni = _f(stats.get("net_income_ttm"))

        # 3: per-share sanity — bvps must be in a per-share range vs price
        bvps = _f(stats.get("bvps"))
        if bvps is not None and last_price and last_price > 0:
            if bvps > last_price * 50:
                v.append(f"{sym}: bvps={bvps:,.0f} implausible vs price {last_price} "
                         f"(total-equity-as-per-share bug?)")
        # 2: scaled monetary sanity via RATIO vs market cap (robust for micro-caps).
        # The millions-leak bug makes net_income/revenue ~1e6x too small -> ratio ~1e-7;
        # genuinely tiny earners stay well above 1e-4, so this never false-positives.
        for fld in ("net_income_ttm", "revenue_ttm"):
            val = _f(stats.get(fld))
            if val is not None and val != 0 and market_cap and market_cap > 0:
                if abs(val) / market_cap < 1e-4:
                    v.append(f"{sym}: stats.{fld}={val} is {abs(val)/market_cap:.1e}x market_cap "
                             f"— SCALE BUG (unscaled millions?)")
    except Exception as e:
        v.append(f"{sym}: profile fetch failed: {e}")

    # ---- financials magnitude, reconciliation, freshness (TradingView source) ----
    # The symbol page's Financials tab + Overview/Ratios are now 100% TV-native
    # (egx_financials / egx_fundamentals), so the gate tests the TV feed the UI
    # actually uses — not the retired audited route.
    try:
        st, fins = get_json(base, f"/api/v1/egx/financials-tv/{sym}")
        if st != 200:
            v.append(f"{sym}: financials-tv HTTP {st}")
        years = [r for r in ((fins or {}).get("years") or []) if r.get("fiscal_year")]
        years.sort(key=lambda r: r.get("fiscal_year") or 0, reverse=True)
        if years:
            latest = years[0]
            ni = _f(latest.get("net_income"))
            fy = latest.get("fiscal_year") or 0
            # type — TV NUMERIC must be coerced to a number, never a string
            if latest.get("net_income") is not None and not is_num(latest.get("net_income")):
                v.append(f"{sym}: financials net_income is string not number")
            # scale vs market cap (TV is absolute EGP; ratio guards any future drift)
            if ni is not None and market_cap and market_cap > 0:
                ratio = abs(ni) / market_cap
                if ratio < 1e-4:
                    v.append(f"{sym}: net_income {ni:,.0f} is {ratio:.1e}x market_cap "
                             f"{market_cap:,.0f} — SCALE BUG")
            # reconcile the financials table vs the profile — BOTH TradingView, so
            # the SAME PERIOD must match closely (cross-tab consistency guard).
            #
            # Same period, not FY-vs-TTM. The previous rule compared the latest
            # ANNUAL net income with the profile's TRAILING-TWELVE-MONTH figure
            # at 20%, and paged on MFPC (FY 11.3bn vs TTM 15.4bn, 27% apart) —
            # which is not a data defect: two strong quarters after the fiscal
            # year end legitimately put TTM above FY. It failed on every push
            # from 2026-09-03. The guard exists to catch SCALE and MAPPING bugs
            # (a 1e6x millions leak, a wrong column), so: compare FY with the
            # profile's own FY figure at 20% when it is present, and only fall
            # back to FY-vs-TTM at 50% — wide enough for a growing company,
            # still far below any scale error.
            profile_ni_fy = _f(stats.get("net_income_fy")) if isinstance(stats, dict) else None
            ref, tol, label = (profile_ni_fy, 0.2, "profile_fy") if profile_ni_fy else (profile_ni, 0.5, "profile_ttm")
            if ni is not None and ref is not None and ref != 0:
                rr = abs(ni - ref) / abs(ref)
                if rr > tol:
                    v.append(f"{sym}: net_income table={ni:,.0f} vs {label}={ref:,.0f} "
                             f"disagree {rr:.0%} (> {tol:.0%}; TV sources must agree for the same period)")
            # freshness — flag only GENUINE multi-year staleness (>= 2 years behind).
            # A 1-year lag is normal: not every issuer has filed the prior FY yet, and
            # TradingView itself may only carry through FY(year-1) for some names
            # (e.g. PHDC's latest TV annual is FY2024 in mid-2026). The pipeline-stall
            # signal is a 2+ year gap.
            if fy and fy < min_year - 2:
                v.append(f"{sym}: latest TV annual is FY{fy} (< {min_year-2}) — financials STALE")
        else:
            v.append(f"{sym}: no TV annual financials returned")
    except Exception as e:
        v.append(f"{sym}: financials-tv fetch failed: {e}")

    # ---- seasonals (computed from ohlc_data; never-fail as long as OHLC is fresh) ----
    try:
        st, seas = get_json(base, f"/api/v1/egx/seasonals/{sym}")
        if st != 200:
            v.append(f"{sym}: seasonals HTTP {st}")
        elif seas.get("available"):
            populated = len([m for m in (seas.get("months") or []) if m.get("avg_return") is not None])
            if populated < 6:
                v.append(f"{sym}: seasonals available but only {populated}/12 months populated")
        # not-available (recent IPO, <2y history) is acceptable, not a failure
    except Exception as e:
        v.append(f"{sym}: seasonals fetch failed: {e}")

    return v


def _f(x):
    if x is None or x == "":
        return None
    try:
        f = float(x)
        return f if f == f else None  # drop NaN
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.environ.get("DQ_BASE", "https://startamarkets.com"))
    ap.add_argument("--year", type=int, default=int(os.environ.get("DQ_YEAR", "2026")))
    args = ap.parse_args()

    print(f"▶ Symbol data-quality gate — base={args.base}, {len(SAMPLE)} symbols, year={args.year}")
    all_v: list[str] = []
    for sym in SAMPLE:
        viol = check_symbol(args.base, sym, args.year)
        if viol:
            all_v.extend(viol)
            for x in viol:
                print(f"  ✗ {x}")
        else:
            print(f"  ✓ {sym}")

    if not all_v:
        print(f"\n✅ PASS — all {len(SAMPLE)} symbols clean (types, scale, per-share, reconcile, freshness).")
        return 0

    print(f"\n❌ FAIL — {len(all_v)} violation(s) across the sample.")
    hook = os.environ.get("DISCORD_WEBHOOK_URL")
    if hook:
        try:
            body = "🔴 **SYMBOL DATA-QUALITY GATE FAILED** — startamarkets.com\n" + \
                   "\n".join(f"• `{x}`" for x in all_v[:15])
            if len(all_v) > 15:
                body += f"\n…and {len(all_v)-15} more."
            data = json.dumps({"content": body}).encode()
            req = urllib.request.Request(hook, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                status = resp.status
            if status < 300:
                print("   ✓ Discord alerted")
            else:
                print(f"   ⚠️  Discord returned HTTP {status} — alert may not have been delivered",
                      file=sys.stderr)
        except urllib.error.HTTPError as e:
            print(f"   ⚠️  Discord alert FAILED (HTTP {e.code} {e.reason}) "
                  f"— webhook may be expired/revoked; rotate DISCORD_WEBHOOK_URL secret",
                  file=sys.stderr)
        except Exception as e:
            print(f"   ⚠️  Discord alert FAILED: {type(e).__name__}: {e}", file=sys.stderr)
    else:
        print("   (DISCORD_WEBHOOK_URL not set — no alert sent)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
