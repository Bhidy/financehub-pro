#!/usr/bin/env python3
"""
RETIRED / QUARANTINED — DO NOT USE.
===================================
This script is intentionally disabled. It previously wrote **fake, randomly
generated NAVs** into `nav_history` (`random.uniform(-0.005, 0.015)`) "for
demo/filling purposes" and was the only script that stamped
`mutual_funds.last_updated = NOW()`. It was never wired to any scheduler, but
left in place it was a landmine: anyone re-activating it to "fix the timestamp"
would silently poison real fund NAV history with synthetic numbers.

The REAL, production NAV pipeline is:
    backend-core/scripts/funds_nav_updater.py   (Mubasher static-CSV primary,
    idempotent ON CONFLICT upsert, never-false-green), scheduled by
    .github/workflows/funds-nav-update.yml (2x/trading-day on the Hetzner runner).

Freshness is the true `last_nav_date` (MAX(nav_history.date)); the legacy
`last_updated` column is an orphan and must NOT be revived by fake writers.

This stub does NOT connect to any database and does NOT write anything. It exits
non-zero and loudly so a stray caller fails safe instead of corrupting data.
"""
import sys

_MSG = (
    "update_fund_navs.py is RETIRED (it generated fake random NAVs and is quarantined).\n"
    "Use backend-core/scripts/funds_nav_updater.py — the real Mubasher-CSV NAV pipeline "
    "(scheduled by .github/workflows/funds-nav-update.yml). No data was written."
)

if __name__ == "__main__":
    print(f"::error::{_MSG}", file=sys.stderr)
    sys.exit(1)
