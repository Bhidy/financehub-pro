"""
Regression tests for the auth hardening shipped after the registration audit.

Each test pins a defect that was reproduced against production, so a future
refactor cannot quietly restore it.
"""

import time

import pytest
from fastapi import HTTPException

from app.core.identity import normalize_email
from app.core.rate_limit import SlidingWindowLimiter, client_key, enforce


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


# ── Caller identification ────────────────────────────────────────────────
# The app sits behind Caddy, so request.client.host is the proxy. Only the
# FIRST X-Forwarded-For entry is meaningful; later entries are caller-supplied
# and trusting them would let an attacker mint a fresh budget per request.

class _FakeClient:
    def __init__(self, host):
        self.host = host


class _FakeRequest:
    def __init__(self, headers=None, host="10.0.0.1"):
        self.headers = headers or {}
        self.client = _FakeClient(host) if host else None


def test_client_key_prefers_first_forwarded_for_entry():
    req = _FakeRequest({"x-forwarded-for": "203.0.113.7, 198.51.100.2, 192.0.2.9"})
    assert client_key(req) == "203.0.113.7"


def test_client_key_ignores_spoofed_trailing_entries():
    """A caller appending their own entries must not change their identity."""
    a = client_key(_FakeRequest({"x-forwarded-for": "203.0.113.7"}))
    b = client_key(_FakeRequest({"x-forwarded-for": "203.0.113.7, evil-1"}))
    c = client_key(_FakeRequest({"x-forwarded-for": "203.0.113.7, evil-2"}))
    assert a == b == c


def test_client_key_falls_back_to_socket_peer():
    assert client_key(_FakeRequest({}, host="198.51.100.44")) == "198.51.100.44"


def test_client_key_handles_missing_client():
    assert client_key(_FakeRequest({}, host=None)) == "unknown"


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


def test_proxy_style_forwarded_chain_keys_on_the_visitor_not_the_proxy():
    """
    The proxy sends the visitor's address; the edge appends its own. Two
    visitors arriving through the SAME proxy must key differently.
    """
    proxy = "76.76.21.9"  # stands in for the serverless egress address
    a = client_key(_FakeRequest({"x-forwarded-for": f"203.0.113.5, {proxy}"}))
    b = client_key(_FakeRequest({"x-forwarded-for": f"203.0.113.6, {proxy}"}))
    assert a != b, "two visitors behind one proxy must not share a rate-limit bucket"
    assert a == "203.0.113.5" and b == "203.0.113.6"


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


def test_global_backstop_sits_far_above_per_caller_budget():
    """
    The backstop must never be the limit a normal day hits — otherwise it
    recreates the site-wide lockout it exists to prevent.
    """
    per_ip = _limiter_args("_SIGNUP_IP_LIMITER")
    backstop = _limiter_args("_SIGNUP_GLOBAL_LIMITER")
    assert backstop["limit"] >= per_ip["limit"] * 20


def test_signup_budget_is_humane_for_a_shared_address():
    """
    Households, offices and mobile carriers put many real people behind one
    address. A budget in the low single digits turns that into a support ticket.
    """
    assert _limiter_args("_SIGNUP_IP_LIMITER")["limit"] >= 10
