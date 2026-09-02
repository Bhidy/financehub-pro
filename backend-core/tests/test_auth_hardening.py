"""
Regression tests for the auth hardening shipped after the registration audit.

Each test pins a defect that was reproduced against production, so a future
refactor cannot quietly restore it.
"""

import time

import pytest
from fastapi import HTTPException

from app.core.identity import normalize_email
from app.core.rate_limit import SlidingWindowLimiter, enforce


# ── Email normalisation ──────────────────────────────────────────────────
# Defect: users.email is a case-SENSITIVE unique column and lookups were exact
# matches, so "QA.Audit@x.com" and "qa.audit@x.com" became two accounts
# (production ids 687 and 688) and the capitalised registrant could not sign in.

def test_normalize_email_lowercases_and_trims():
    assert normalize_email("Ahmed@Gmail.COM") == "ahmed@gmail.com"
    assert normalize_email("  spaced@example.com  ") == "spaced@example.com"
    assert normalize_email("already@lower.com") == "already@lower.com"


def test_normalize_email_is_idempotent():
    once = normalize_email("  Mixed@Case.Com ")
    assert normalize_email(once) == once


# ── Rate limiting ────────────────────────────────────────────────────────
# Defect: /signup and /token had no throttle at all — unlimited account
# creation and unlimited password grinding.

def test_limiter_allows_up_to_the_budget():
    limiter = SlidingWindowLimiter(limit=3, window_seconds=60)
    assert [limiter.hit("k") for _ in range(3)] == [None, None, None]


def test_limiter_blocks_past_the_budget_and_reports_retry_after():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
    limiter.hit("k")
    limiter.hit("k")
    retry_after = limiter.hit("k")
    assert retry_after is not None
    assert 0 < retry_after <= 60


def test_limiter_keys_are_independent():
    """One caller being throttled must never throttle another."""
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert limiter.hit("a") is None
    assert limiter.hit("a") is not None
    assert limiter.hit("b") is None


def test_limiter_window_expires():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=1)
    assert limiter.hit("k") is None
    assert limiter.hit("k") is not None
    time.sleep(1.1)
    assert limiter.hit("k") is None, "budget must free up once the window passes"


def test_enforce_raises_429_with_retry_after_header():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    enforce(limiter, "k", "slow down")
    with pytest.raises(HTTPException) as exc:
        enforce(limiter, "k", "slow down")
    assert exc.value.status_code == 429
    assert exc.value.detail == "slow down"
    assert "Retry-After" in exc.value.headers


# ── Shared-bucket regression ─────────────────────────────────────────────
# Caught in production QA: the API sits behind a server-side proxy, so if the
# real client address is not forwarded, every visitor is keyed identically and
# the per-IP budget silently becomes a GLOBAL one. A 5/hour signup limit then
# locked the whole site out after five requests. These pin the property that
# distinct callers must never share a bucket.

def test_distinct_callers_never_share_a_budget():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
    callers = [f"203.0.113.{n}" for n in range(1, 21)]
    for ip in callers:
        assert limiter.hit(ip) is None, f"{ip} was throttled by another caller's traffic"
        assert limiter.hit(ip) is None


def _limiter_args(name: str) -> dict:
    """
    Read a module-level limiter's constructor kwargs straight from the source.

    Parsed rather than imported so this assertion holds without a database
    driver present — the endpoint module pulls asyncpg, which a pure-logic test
    run should not require.
    """
    import ast
    from pathlib import Path

    src = Path(__file__).resolve().parents[1] / "app/api/v1/endpoints/auth.py"
    tree = ast.parse(src.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == name for t in node.targets
        ):
            return {kw.arg: ast.literal_eval(kw.value) for kw in node.value.keywords}
    raise AssertionError(f"{name} not found in auth.py")


def test_signup_ceiling_sits_far_above_real_volume():
    """
    The global ceiling is a runaway bound, not a daily limit. Everything it
    blocks is a real person who cannot register, so it must stay well clear of
    normal traffic.
    """
    assert _limiter_args("_SIGNUP_GLOBAL_LIMITER")["limit"] >= 300


def test_no_per_ip_budget_survives_in_the_auth_endpoints():
    """
    Per-IP budgets collapse into a per-SITE budget whenever the client address
    does not survive the proxy chain — which took the whole signup flow down
    once. The design must not reintroduce one.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parents[1] / "app/api/v1/endpoints/auth.py").read_text("utf-8")
    assert "client_key" not in src, "auth endpoints must not key a budget on the client address"


def test_successful_logins_never_consume_the_failure_budget():
    """The core property: only failures are charged."""
    limiter = SlidingWindowLimiter(limit=3, window_seconds=900)
    key = "acct:user@example.com"
    for _ in range(50):
        assert limiter.would_block(key) is False  # a correct password, 50 times


def test_repeated_failures_eventually_block_that_account():
    limiter = SlidingWindowLimiter(limit=3, window_seconds=900)
    key = "acct:victim@example.com"
    for _ in range(3):
        assert limiter.would_block(key) is False
        limiter.hit(key)
    assert limiter.would_block(key) is True


def test_one_accounts_failures_never_throttle_another():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=900)
    for _ in range(5):
        limiter.hit("acct:victim@example.com")
    assert limiter.would_block("acct:victim@example.com") is True
    assert limiter.would_block("acct:bystander@example.com") is False


def test_would_block_does_not_consume_budget():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=900)
    for _ in range(10):
        assert limiter.would_block("k") is False
    assert limiter.hit("k") is None, "checking must not have spent the budget"
