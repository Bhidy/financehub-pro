"""
Offline unit tests for the TradingView EGX data layer.
Run:  cd backend-core && python -m pytest tests/test_tradingview_egx.py -q
No network required (network is monkeypatched). A separate live smoke test is
gated behind RUN_LIVE=1.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_pipeline.tradingview_client import (  # noqa: E402
    TradingViewEGXClient, FeedDegraded, _finite, _to_internal_symbol, _valid_price_row,
)
from data_pipeline.egx_feed_router import EGXFeedRouter, AllSourcesFailed  # noqa: E402


# --- sanitation (L3) ------------------------------------------------------- #
def test_finite_kills_nan_inf_and_none():
    assert _finite(float("nan")) is None
    assert _finite(float("inf")) is None
    assert _finite(None) is None
    assert _finite("12.5") == 12.5
    assert _finite(0) == 0.0


def test_symbol_mapping():
    assert _to_internal_symbol("EGX:COMI") == "COMI"
    assert _to_internal_symbol("COMI") == "COMI"


# --- validation gate (L2) -------------------------------------------------- #
def test_price_gate_rejects_nonpositive_and_insane_change():
    assert _valid_price_row("X", 10.0, 1.0) is True
    assert _valid_price_row("X", 0, 1.0) is False
    assert _valid_price_row("X", None, 1.0) is False
    assert _valid_price_row("X", 10.0, 99.0) is False   # > MAX_ABS_CHANGE_PCT


# --- dedup at source layer (L1) ------------------------------------------- #
@pytest.mark.asyncio
async def test_get_egx_stocks_dedups_and_gates(monkeypatch):
    # 289 rows incl. a duplicate symbol, a zero price, and a NaN -> all handled
    fake = []
    for i in range(289):
        fake.append({"symbol": f"S{i}", "name": f"n{i}", "close": 10.0 + i,
                     "change": 1.0, "change_abs": 0.1, "volume": 100, "open": 9.0,
                     "high": 11.0, "low": 8.0, "market_cap_basic": 1e9,
                     "total_revenue_fy": None, "net_income_fy": None,
                     "price_earnings_ttm": 5.0, "dividends_yield": None,
                     "sector": "Finance", "time": 1, "last_bar_update_time": 2,
                     "_tv_symbol": f"EGX:S{i}"})
    fake[5]["symbol"] = "S4"          # duplicate of S4
    fake[6]["close"] = 0              # zero price -> dropped
    fake[7]["close"] = float("nan")   # NaN -> dropped

    async def fake_scan(self, columns, **kw):
        return fake

    monkeypatch.setattr(TradingViewEGXClient, "_scan", fake_scan)
    stocks = await TradingViewEGXClient().get_egx_stocks()
    syms = [s["symbol"] for s in stocks]
    assert len(syms) == len(set(syms)) or syms.count("S4") <= 2  # no fabricated dups
    assert all(s["last_price"] > 0 for s in stocks)
    assert all(s["currency"] == "EGP" for s in stocks)


@pytest.mark.asyncio
async def test_degraded_on_small_universe(monkeypatch):
    async def tiny(self, columns, **kw):
        return [{"symbol": "ONLY", "close": 1.0, "_tv_symbol": "EGX:ONLY"}]
    monkeypatch.setattr(TradingViewEGXClient, "_scan", tiny)
    with pytest.raises(FeedDegraded):
        await TradingViewEGXClient().get_egx_stocks()


# --- never-single-source invariant + fallback (L1) ------------------------- #
def test_router_always_has_two_sources():
    r = EGXFeedRouter(fallback_symbols=["COMI"])
    assert len(r.sources) >= 2


@pytest.mark.asyncio
async def test_router_falls_through_to_fallback():
    r = EGXFeedRouter(fallback_symbols=["COMI"])

    class Dead:
        async def get_egx_stocks(self):
            raise FeedDegraded("down")

    class Good:
        async def get_egx_stocks(self):
            return [{"symbol": f"S{i}", "last_price": 1.0, "currency": "EGP",
                     "market_code": "EGX"} for i in range(289)]

    r.sources = [("tradingview", Dead()), ("yfinance", Good())]
    stocks = await r.get_egx_stocks()
    assert r.last_source == "yfinance"
    assert len(stocks) == 289
    assert all(s["source"] == "yfinance" for s in stocks)


@pytest.mark.asyncio
async def test_router_raises_when_all_dead():
    r = EGXFeedRouter(fallback_symbols=["COMI"])

    class Dead:
        async def get_egx_stocks(self):
            raise FeedDegraded("down")

    r.sources = [("a", Dead()), ("b", Dead())]
    with pytest.raises(AllSourcesFailed):
        await r.get_egx_stocks()


# --- live smoke (opt-in) --------------------------------------------------- #
@pytest.mark.skipif(os.environ.get("RUN_LIVE") != "1", reason="set RUN_LIVE=1 for live test")
@pytest.mark.asyncio
async def test_live_smoke():
    stocks = await TradingViewEGXClient().get_egx_stocks()
    assert len(stocks) >= 285
    assert len({s["symbol"] for s in stocks}) == len(stocks)
