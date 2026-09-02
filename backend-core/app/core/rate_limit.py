"""
Dependency-free sliding-window rate limiter for the auth endpoints.

WHY THIS EXISTS
/auth/signup and /auth/token had no throttle of any kind. Anyone could create
unlimited accounts against the production users table, or grind passwords
against a known address as fast as the network allowed. Both are cheap to abuse
and expensive to clean up.

WHY NOT slowapi/redis
The API runs as a single uvicorn process on one Hetzner box, so an in-process
counter is sufficient and adds no dependency, no new failure mode and no
deploy-time install. The trade-offs are explicit and acceptable here:

  * counters are per-process — if the API is ever scaled to multiple workers or
    replicas, the effective limit multiplies by the worker count
  * counters reset on restart

Both are fine for abuse control (they raise the cost of automation by orders of
magnitude); neither is fine for billing or quota enforcement. If the API is ever
horizontally scaled, move this to a shared store rather than raising the limits.

Memory is bounded: expired buckets are swept on write, and the key count is
capped so a flood of unique client IPs cannot grow the dict without limit.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Deque, Dict

from fastapi import HTTPException, Request, status

# Hard ceiling on tracked keys. Past this the oldest-idle keys are dropped:
# losing a counter fails OPEN for that caller, which is the correct trade
# against letting a spoofed-header flood exhaust memory.
_MAX_KEYS = 20_000


class SlidingWindowLimiter:
    """Allow at most `limit` events per `window_seconds` for each key."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = Lock()

    def _sweep(self, now: float) -> None:
        """Drop keys whose whole window has expired. Caller holds the lock."""
        stale = [k for k, hits in self._hits.items() if not hits or now - hits[-1] > self.window]
        for k in stale:
            del self._hits[k]
        if len(self._hits) > _MAX_KEYS:
            # Keep the most recently active keys; an attacker rotating IPs is
            # exactly the case where dropping the coldest entries is right.
            for k in sorted(self._hits, key=lambda k: self._hits[k][-1])[: len(self._hits) - _MAX_KEYS]:
                del self._hits[k]

    def hit(self, key: str) -> int | None:
        """
        Record an attempt.

        Returns None when the caller is within budget, or the number of seconds
        until the window frees up when they are over it.
        """
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(1, int(self.window - (now - hits[0])))
            hits.append(now)
            return None


def client_key(request: Request) -> str:
    """
    Identify the caller.

    Requests reach the app through Caddy, so request.client.host is the proxy;
    the real address is the FIRST entry of X-Forwarded-For (the ones after it
    are attacker-controllable and must never be trusted). Falls back to the
    socket peer when the header is absent.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def enforce(limiter: SlidingWindowLimiter, key: str, message: str) -> None:
    """Raise 429 with a Retry-After header when `key` is over budget."""
    retry_after = limiter.hit(key)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
            headers={"Retry-After": str(retry_after)},
        )
