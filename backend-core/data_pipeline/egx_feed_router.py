"""
EGX Feed Router - the never-single-source core
==============================================
Single source of truth for "give me EGX stocks / chart bars", with an ordered,
fail-loud fallback chain. This is the architectural guarantee that a TradingView
outage, block, or schema change degrades silently to yfinance instead of taking
the platform down (the exact failure mode that previously caused an outage).

Invariant enforced by tests/QA: the source list ALWAYS has >= 2 independent
providers. Never collapse this to a single source.

    EGXFeedRouter.get_egx_stocks():
        1) TradingViewEGXClient   (primary  - sub-second, 289, EGP)
        2) YFinanceEGXClient      (fallback - always works, .CA suffix)

    ChartBarRouter.get_daily_bars():
        1) TVChartWSClient        (primary  - deep, clean history) [Phase 6]
        2) YFinanceChartClient    (fallback - always works)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from data_pipeline.tradingview_client import TradingViewEGXClient, FeedDegraded

logger = logging.getLogger("EGXFeedRouter")

MIN_USABLE = 200  # a published universe must have at least this many rows


class AllSourcesFailed(Exception):
    """Every source in the chain failed. admin.process_egx() already fails the
    step on 0 tickers; this makes the all-dead case explicit and loud."""


# --------------------------------------------------------------------------- #
# Fallback source: yfinance (.CA) — self-contained so the router is standalone
# --------------------------------------------------------------------------- #
class YFinanceEGXClient:
    """Batched yfinance(.CA) EGX price client. Mirrors the get_egx_stocks() dict
    shape. Imported lazily so the module loads even where yfinance is absent."""

    name = "yfinance"

    def __init__(self, symbols: List[str] | None = None):
        self._symbols = symbols  # internal symbols; if None, caller must set

    async def get_egx_stocks(self) -> List[Dict[str, Any]]:
        import asyncio
        import yfinance as yf

        if not self._symbols:
            raise FeedDegraded("yfinance fallback needs a symbol universe")

        def _download() -> List[Dict[str, Any]]:
            tickers = [f"{s}.CA" for s in self._symbols]
            data = yf.download(tickers, period="5d", group_by="ticker",
                               progress=False, threads=True)
            out: List[Dict[str, Any]] = []
            for s in self._symbols:
                try:
                    df = data[f"{s}.CA"].dropna()
                    if df.empty:
                        continue
                    last = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) > 1 else last
                    close = float(last["Close"])
                    pchg = (close - float(prev["Close"])) / float(prev["Close"]) * 100 \
                        if float(prev["Close"]) else 0.0
                    out.append({
                        "symbol": s, "name_en": None,
                        "last_price": close,
                        "change": close - float(prev["Close"]),
                        "change_percent": pchg,
                        "volume": int(last.get("Volume") or 0),
                        "open": float(last["Open"]), "high": float(last["High"]),
                        "low": float(last["Low"]),
                        "market_cap": None, "revenue": None, "net_income": None,
                        "pe_ratio": None, "dividend_yield": None,
                        "sector_name": None, "market_code": "EGX", "currency": "EGP",
                    })
                except Exception:  # per-symbol isolation (L4)
                    continue
            return out

        return await asyncio.get_running_loop().run_in_executor(None, _download)


# --------------------------------------------------------------------------- #
# Router
# --------------------------------------------------------------------------- #
class EGXFeedRouter:
    """Ordered fallback over EGX price sources. Reports which source served the
    request so `market_tickers.source` and telemetry stay honest."""

    def __init__(self, fallback_symbols: List[str] | None = None):
        self.sources: List[Tuple[str, Any]] = [
            ("tradingview", TradingViewEGXClient()),
            ("yfinance", YFinanceEGXClient(symbols=fallback_symbols)),
        ]
        assert len(self.sources) >= 2, "INVARIANT: never single-source EGX"
        self.last_source: str | None = None

    async def get_egx_stocks(self) -> List[Dict[str, Any]]:
        errors: List[str] = []
        for name, client in self.sources:
            try:
                stocks = await client.get_egx_stocks()
                if stocks and len(stocks) >= MIN_USABLE:
                    self.last_source = name
                    for s in stocks:
                        s.setdefault("source", name)
                    logger.info("EGX feed served by '%s' (%d rows)", name, len(stocks))
                    return stocks
                errors.append(f"{name}: only {len(stocks) if stocks else 0} rows")
            except FeedDegraded as e:
                errors.append(f"{name}: degraded ({e})")
                logger.warning("EGX source '%s' degraded: %s", name, e)
            except Exception as e:  # noqa: BLE001 - last-resort guard
                errors.append(f"{name}: {type(e).__name__}: {e}")
                logger.warning("EGX source '%s' failed: %s", name, e)
        logger.error("ALL EGX sources failed: %s", errors)
        raise AllSourcesFailed("; ".join(errors))


class ChartBarRouter:
    """Ordered fallback for historical/intraday OHLCV bars.
    Primary (TV websocket) is wired in Phase 6; until then it raises and the
    router transparently serves yfinance — so charts work from day one."""

    def __init__(self):
        self.sources: List[Tuple[str, Any]] = [
            ("tv_ws", _TVChartWSPlaceholder()),
            ("yfinance", _YFinanceChartClient()),
        ]
        assert len(self.sources) >= 2, "INVARIANT: never single-source charts"
        self.last_source: str | None = None

    async def get_daily_bars(self, symbol: str, lookback: int = 5000) -> List[Dict[str, Any]]:
        errors: List[str] = []
        for name, client in self.sources:
            try:
                bars = await client.get_daily_bars(symbol, lookback)
                if bars:
                    self.last_source = name
                    for b in bars:
                        b.setdefault("source", name)
                    return bars
                errors.append(f"{name}: 0 bars")
            except NotImplementedError:
                errors.append(f"{name}: not yet wired (Phase 6)")
            except Exception as e:  # noqa: BLE001
                errors.append(f"{name}: {e}")
        raise AllSourcesFailed(f"chart bars {symbol}: " + "; ".join(errors))


class _TVChartWSPlaceholder:
    """Phase 6 will replace this with the authenticated socket.io harvester."""
    async def get_daily_bars(self, symbol: str, lookback: int) -> List[Dict[str, Any]]:
        raise NotImplementedError("TV websocket harvester ships in Phase 6")


class _YFinanceChartClient:
    async def get_daily_bars(self, symbol: str, lookback: int) -> List[Dict[str, Any]]:
        import asyncio
        import yfinance as yf

        def _dl() -> List[Dict[str, Any]]:
            df = yf.Ticker(f"{symbol}.CA").history(period="max", auto_adjust=False)
            out = []
            for ts, r in df.tail(lookback).iterrows():
                out.append({"symbol": symbol, "date": ts.date().isoformat(),
                            "open": float(r["Open"]), "high": float(r["High"]),
                            "low": float(r["Low"]), "close": float(r["Close"]),
                            "volume": int(r["Volume"])})
            return out

        return await asyncio.get_running_loop().run_in_executor(None, _dl)


# --------------------------------------------------------------------------- #
# KSA (Saudi Tadawul) Feed Router — mirrors EGXFeedRouter
# Invariant: always >= 2 sources (TradingView primary → yfinance .SR fallback)
# --------------------------------------------------------------------------- #
class YFinanceKSAClient:
    """Batched yfinance(.SR) Saudi price client. Mirrors the get_ksa_stocks() dict shape."""

    name = "yfinance"

    def __init__(self, symbols: List[str] | None = None):
        self._symbols = symbols

    async def get_ksa_stocks(self) -> List[Dict[str, Any]]:
        import asyncio
        import yfinance as yf

        if not self._symbols:
            raise FeedDegraded("yfinance KSA fallback needs a symbol universe")

        def _download() -> List[Dict[str, Any]]:
            tickers = [f"{s}.SR" for s in self._symbols]
            data = yf.download(tickers, period="5d", group_by="ticker",
                               progress=False, threads=True)
            out: List[Dict[str, Any]] = []
            for s in self._symbols:
                try:
                    df = data[f"{s}.SR"].dropna()
                    if df.empty:
                        continue
                    last = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) > 1 else last
                    close = float(last["Close"])
                    pchg = (close - float(prev["Close"])) / float(prev["Close"]) * 100 \
                        if float(prev["Close"]) else 0.0
                    out.append({
                        "symbol": s, "name_en": None,
                        "last_price": close,
                        "change": close - float(prev["Close"]),
                        "change_percent": pchg,
                        "volume": int(last.get("Volume") or 0),
                        "open": float(last["Open"]), "high": float(last["High"]),
                        "low": float(last["Low"]),
                        "market_cap": None, "revenue": None, "net_income": None,
                        "pe_ratio": None, "dividend_yield": None,
                        "sector_name": None, "market_code": "KSA", "currency": "SAR",
                    })
                except Exception:  # per-symbol isolation
                    continue
            return out

        return await asyncio.get_running_loop().run_in_executor(None, _download)


class KSAFeedRouter:
    """Ordered fallback over Saudi price sources: TradingView → yfinance(.SR).
    Mirrors EGXFeedRouter — INVARIANT: always >= 2 independent providers."""

    def __init__(self, fallback_symbols: List[str] | None = None):
        from data_pipeline.tradingview_client import TradingViewKSAClient
        self.sources: List[Tuple[str, Any]] = [
            ("tradingview", TradingViewKSAClient()),
            ("yfinance", YFinanceKSAClient(symbols=fallback_symbols)),
        ]
        assert len(self.sources) >= 2, "INVARIANT: never single-source KSA"
        self.last_source: str | None = None

    async def get_ksa_stocks(self) -> List[Dict[str, Any]]:
        errors: List[str] = []
        for name, client in self.sources:
            try:
                stocks = await client.get_ksa_stocks()
                if stocks and len(stocks) >= 10:
                    self.last_source = name
                    for s in stocks:
                        s.setdefault("source", name)
                    logger.info("KSA feed served by '%s' (%d rows)", name, len(stocks))
                    return stocks
                errors.append(f"{name}: only {len(stocks) if stocks else 0} rows")
            except FeedDegraded as e:
                errors.append(f"{name}: degraded ({e})")
                logger.warning("KSA source '%s' degraded: %s", name, e)
            except Exception as e:  # noqa: BLE001
                errors.append(f"{name}: {type(e).__name__}: {e}")
                logger.warning("KSA source '%s' failed: %s", name, e)
        logger.error("ALL KSA sources failed: %s", errors)
        raise AllSourcesFailed("; ".join(errors))
