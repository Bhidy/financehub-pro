"""
TradingView EGX Client - Enterprise Grade
=========================================
Drop-in primary data source for the Egyptian Exchange (EGX), reverse-engineered
from TradingView's public scanner / symbol / news / symbol-search endpoints.

Design contract:
- `get_egx_stocks()` returns the SAME List[Dict] shape as
  data_pipeline.market_loader.StockAnalysisClient.get_egx_stocks(), so it is a
  literal drop-in primary inside admin.process_egx() (see EGXFeedRouter).
- Every method is sector-aware (a null line item for a bank is valid data, not an
  error), validation-gated, NaN-safe, and raises FeedDegraded (not silent empty)
  when a payload is implausibly small so the router can fall through.

Endpoints (all REST, no auth, 15-min delayed EGX data, EGP-native):
    E1  POST  scanner.tradingview.com/egypt/scan        bulk universe (any columns)
    E2  GET   scanner.tradingview.com/symbol            single-symbol (heavy _h arrays)
    E3  GET   scanner.tradingview.com/egypt/metainfo    field-schema (drift guard)
    E4  GET   news-headlines.tradingview.com/v2/headlines
    E5  GET   symbol-search.tradingview.com/symbol_search/v3/
    E6  GET   s3-symbol-logo.tradingview.com/<logoid>.svg

This module is intentionally dependency-light: httpx only (already a repo dep).
"""

from __future__ import annotations

import asyncio
import logging
import math
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("TradingViewEGX")

# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
SCAN_URL = "https://scanner.tradingview.com/egypt/scan"
SYMBOL_URL = "https://scanner.tradingview.com/symbol"
METAINFO_URL = "https://scanner.tradingview.com/egypt/metainfo"
NEWS_URL = "https://news-headlines.tradingview.com/v2/headlines"
SEARCH_URL = "https://symbol-search.tradingview.com/symbol_search/v3/"
LOGO_BASE = "https://s3-symbol-logo.tradingview.com"

_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
_HEADERS = {"User-Agent": _UA, "Accept": "application/json", "Origin": "https://www.tradingview.com"}

# Sanity bounds (defense layer L2). These catch garbage, NOT legitimate moves.
MIN_UNIVERSE = 200          # < this many EGX rows => degraded, let router fall through
MAX_ABS_CHANGE_PCT = 40.0   # |daily change| beyond this is almost surely bad data
EGX_PREFIX = "EGX:"

# Column set for the price path, mapped 1:1 to the legacy get_egx_stocks() dict.
# NB: NEITHER TradingView yield variant is trustworthy on its own:
#   * bare `dividends_yield` was garbage for BINV (165.099 vs real 2.83%)
#   * `dividends_yield_current` is garbage for ORAS (45.50% vs real ~1.65-3.16%)
# Both are scanned and cross-validated against dividend_amount_recent/close in
# _sane_dividend_yield() — see the June-2026 audit (C-03/C-05 follow-up).
_PRICE_COLS = [
    "name", "description", "close", "change", "change_abs", "volume",
    "open", "high", "low", "market_cap_basic",
    "total_revenue_fy", "net_income_fy", "price_earnings_ttm",
    "dividends_yield_current", "dividends_yield", "dividend_amount_recent",
    "price_book_ratio", "beta_1_year",
    "price_earnings_forward_fy", "float_shares_percent_current",
    "float_shares_outstanding_current", "number_of_shareholders",
    "sector", "time", "last_bar_update_time",
]


class FeedDegraded(Exception):
    """Raised when a TradingView payload is present but implausible (too few rows,
    wrong shape). Signals EGXFeedRouter to try the next source rather than
    publishing a half-empty universe."""


# --------------------------------------------------------------------------- #
# Sanitation helpers (defense layers L2 + L3)
# --------------------------------------------------------------------------- #
def _finite(x: Any) -> Optional[float]:
    """Coerce to a finite float or None. Kills NaN/Inf before they reach Postgres."""
    if x is None:
        return None
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _to_internal_symbol(tv_symbol: str) -> str:
    """'EGX:COMI' -> 'COMI'. Tolerant of already-bare symbols."""
    return tv_symbol.split(":", 1)[1] if ":" in tv_symbol else tv_symbol


# Cross-validation bounds for the two TV dividend-yield variants.
# implied = most-recent dividend amount / price. An annual total can be a few
# payments (EGX names pay 1-4x/yr) and the recent payment can itself be a
# special, so any yield outside [implied/3, implied*4.5] is treated as corrupt.
# Survey 2026-06-12 over all 289 EGX symbols: 4 wild disagreements —
#   BINV ttm=173.14 (bad) / current=2.83  (good, == implied)
#   ORAS current=45.50 (bad) / ttm=3.16   (good; implied 1.65)
#   MBSC ttm=7.35   (bad) / current=2.21  (good, == implied)
#   EGS385S1C012 ttm=0 (bad) / current=7.78 (good, == implied)
_DY_LOW_FACTOR = 1.0 / 3.0
_DY_HIGH_FACTOR = 4.5


def _sane_dividend_yield(current: Any, ttm: Any, amount: Any, close: Any) -> Optional[float]:
    """Pick a dividend yield (%) that survives cross-validation against the
    most-recent dividend amount. Falls back to the directly computed
    recent-payment yield when both TV variants fail; keeps the legacy
    preference (current, then ttm) when no amount exists to validate with."""
    current, ttm = _finite(current), _finite(ttm)
    amount, close = _finite(amount), _finite(close)
    if amount is None or amount <= 0 or close is None or close <= 0:
        return current if current is not None else ttm
    implied = amount / close * 100.0
    for cand in (current, ttm):
        if cand is not None and implied * _DY_LOW_FACTOR <= cand <= implied * _DY_HIGH_FACTOR:
            return cand
    return round(implied, 4)


def _valid_price_row(symbol: str, price: Optional[float], change_pct: Optional[float]) -> bool:
    """L2 gate: a row is publishable only if it has a strictly positive price and a
    sane change. We never zero-out or fabricate a live stock."""
    if price is None or price <= 0:
        return False
    if change_pct is not None and abs(change_pct) > MAX_ABS_CHANGE_PCT:
        logger.warning("Rejecting %s: implausible change %% %.2f", symbol, change_pct)
        return False
    return True


# --------------------------------------------------------------------------- #
# Client
# --------------------------------------------------------------------------- #
class TradingViewEGXClient:
    """Async TradingView client for the EGX market."""

    def __init__(self, timeout: float = 20.0, retries: int = 3):
        self._timeout = timeout
        self._retries = retries

    # --- low-level transport with retry/backoff (defense layer L7) ---------- #
    async def _request(self, method: str, url: str, **kw) -> httpx.Response:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout, headers=_HEADERS) as c:
                    resp = await c.request(method, url, **kw)
                if resp.status_code == 200:
                    return resp
                logger.warning("TV %s %s -> HTTP %s (attempt %d/%d)",
                               method, url.split("/")[-1], resp.status_code, attempt, self._retries)
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp)
            except (httpx.HTTPError, asyncio.TimeoutError) as e:  # transient
                last_exc = e
                logger.warning("TV %s %s failed: %s (attempt %d/%d)",
                               method, url.split("/")[-1], e, attempt, self._retries)
            if attempt < self._retries:
                await asyncio.sleep(0.4 * (2 ** (attempt - 1)))  # 0.4, 0.8, 1.6s
        raise FeedDegraded(f"TV request exhausted retries: {last_exc}")

    async def _scan(self, columns: List[str], *, tickers: Optional[List[str]] = None,
                    rng: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """POST /egypt/scan -> list of {symbol, <col>: value, ...} dicts (col-aligned)."""
        body: Dict[str, Any] = {"columns": columns}
        if tickers:
            body["symbols"] = {"tickers": tickers}
        else:
            body["range"] = rng or [0, 300]
        resp = await self._request("POST", SCAN_URL, json=body)
        try:
            payload = resp.json()
        except ValueError as e:
            raise FeedDegraded(f"TV scan returned non-JSON: {e}")
        rows = payload.get("data") or []
        out: List[Dict[str, Any]] = []
        for r in rows:
            d = dict(zip(columns, r.get("d", [])))
            d["_tv_symbol"] = r.get("s", "")
            d["symbol"] = _to_internal_symbol(r.get("s", ""))
            out.append(d)
        return out

    # ------------------------------------------------------------------ #
    # E1: PRICE PATH — the drop-in for StockAnalysisClient.get_egx_stocks
    # ------------------------------------------------------------------ #
    async def get_egx_stocks(self) -> List[Dict[str, Any]]:
        """Bulk price/overview for all EGX stocks. Returns the legacy dict shape
        (plus harmless extra keys). Raises FeedDegraded on an implausible payload."""
        rows = await self._scan(_PRICE_COLS, rng=[0, 300])
        if len(rows) < MIN_UNIVERSE:
            raise FeedDegraded(f"TV returned only {len(rows)} EGX rows (< {MIN_UNIVERSE})")

        stocks: List[Dict[str, Any]] = []
        for d in rows:
            symbol = d["symbol"]
            price = _finite(d.get("close"))
            change_pct = _finite(d.get("change"))
            if not _valid_price_row(symbol, price, change_pct):
                continue
            stocks.append({
                "symbol": symbol,
                # TV "description" = the company's display name ("Madinet Masr for
                # Housing & Development"); TV "name" is just the ticker ("MASR").
                "name_en": d.get("description") or d.get("name") or "",
                "market_cap": _finite(d.get("market_cap_basic")),
                "last_price": price,
                "change": _finite(d.get("change_abs")),
                "change_percent": change_pct,
                "volume": int(_finite(d.get("volume")) or 0),
                "open": _finite(d.get("open")),
                "high": _finite(d.get("high")),
                "low": _finite(d.get("low")),
                "revenue": _finite(d.get("total_revenue_fy")),
                "net_income": _finite(d.get("net_income_fy")),
                "pe_ratio": _finite(d.get("price_earnings_ttm")),
                "dividend_yield": _sane_dividend_yield(
                    d.get("dividends_yield_current"), d.get("dividends_yield"),
                    d.get("dividend_amount_recent"), price),
                "pb_ratio": _finite(d.get("price_book_ratio")),
                "beta": _finite(d.get("beta_1_year")),
                "forward_pe": _finite(d.get("price_earnings_forward_fy")),
                "float_shares_percent": _finite(d.get("float_shares_percent_current")),
                "float_shares": _finite(d.get("float_shares_outstanding_current")),
                "shareholders_count": _finite(d.get("number_of_shareholders")),
                "sector_name": d.get("sector") or "",
                "market_code": "EGX",
                "currency": "EGP",
                # extras (ignored by the legacy consumer, used by the new ohlc upsert)
                "bar_time": d.get("time"),
                "last_bar_update_time": d.get("last_bar_update_time"),
            })
        if len(stocks) < MIN_UNIVERSE:
            raise FeedDegraded(f"TV had {len(rows)} rows but only {len(stocks)} usable prices")
        logger.info("TradingView EGX price feed: %d/%d usable", len(stocks), len(rows))
        return stocks

    # ------------------------------------------------------------------ #
    # E1: TECHNICALS — multi-timeframe gauge + core indicators
    # ------------------------------------------------------------------ #
    async def get_technicals(self, timeframes: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """One row per (symbol, timeframe). TF '' == daily (1D)."""
        timeframes = timeframes or ["", "|60", "|240", "|1W"]
        base = ["RSI", "MACD.macd", "MACD.signal", "Stoch.K", "Stoch.D", "CCI20",
                "ADX", "Mom", "Recommend.All", "Recommend.MA", "Recommend.Other",
                "EMA50", "EMA200", "SMA50", "SMA200"]
        cols = ["name"] + [f"{b}{tf}" for tf in timeframes for b in base]
        rows = await self._scan(cols, rng=[0, 300])
        out: List[Dict[str, Any]] = []
        for d in rows:
            for tf in timeframes:
                label = tf.lstrip("|") or "1D"
                rec = {"symbol": d["symbol"], "timeframe": label}
                present = False
                for b in base:
                    v = _finite(d.get(f"{b}{tf}"))
                    rec[b.replace(".", "_").lower()] = v
                    present = present or v is not None
                if present:
                    out.append(rec)
        logger.info("TradingView EGX technicals: %d (symbol,tf) rows", len(out))
        return out

    # ------------------------------------------------------------------ #
    # E1/E2: STATEMENTS — 20yr/32q deep-history arrays (sector-aware)
    # ------------------------------------------------------------------ #
    async def get_statements(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Deep `_h` history arrays per symbol. Null line items are kept as None
        (sector-structural, e.g. bank EBITDA) — never coerced."""
        cols = ["name", "fiscal_period_fy_h",
                "total_revenue_fy_h", "gross_profit_fy_h", "ebitda_fy_h",
                "net_income_fy_h", "earnings_per_share_diluted_fy_h",
                "free_cash_flow_fy_h", "total_assets_fy_h", "total_debt_fy_h",
                "dps_common_stock_prim_issue_fy_h",
                "total_revenue_fq_h", "net_income_fq_h", "total_assets_fq_h"]
        tv_tickers = [t if t.startswith(EGX_PREFIX) else EGX_PREFIX + t for t in tickers]
        rows = await self._scan(cols, tickers=tv_tickers)
        for d in rows:
            d.pop("_tv_symbol", None)
        return rows

    # ------------------------------------------------------------------ #
    # E1: FUNDAMENTALS SNAPSHOT — latest-FY scalars (equity, ROE, BVPS, …)
    # TradingView is a COMPLETE fundamentals source. The deep `_h` arrays omit
    # several rich latest-annual figures (total_equity, operating income/margin,
    # ROE/ROA, BVPS, shares, total liabilities); this captures them so the
    # platform can be 100% TV-native and never depend on the dead audited
    # scraper.
    #
    # UNIT CONTRACT (verified June 2026 — corrected after post-harvest telemetry):
    # TradingView's scanner returns monetary aggregate _fy scalars for EGX stocks
    # in ABSOLUTE EGP (e.g. net_income_fy=61_634_295_000 means EGP ~61.6 billion).
    # This was confirmed by comparing the _fy scalar to the _fy_h history-array
    # value for the same fiscal year: they are identical, and _fy_h is documented
    # as absolute EGP everywhere. No scaling is applied.
    # Per-share values (eps, bvps, dps) and ratios (margins, ROE, ROA) are in
    # native per-share EGP / percentage — also no scaling needed.
    # Banks legitimately return null gross_profit/ebitda (sector-structural).
    # ------------------------------------------------------------------ #
    async def get_fundamentals(self) -> List[Dict[str, Any]]:
        cols = ["name", "fiscal_period_fy",
                "total_revenue_fy", "gross_profit_fy", "oper_income_fy", "ebitda_fy",
                "net_income_fy", "total_assets_fy", "total_equity_fy",
                "total_liabilities_fy", "total_debt_fy", "free_cash_flow_fy",
                "earnings_per_share_diluted_fy", "book_value_per_share_fy",
                "total_shares_outstanding_current", "dps_common_stock_prim_issue_fy",
                "gross_margin_fy", "operating_margin_fy",
                "return_on_equity_fy", "return_on_assets_fy",
                # True trailing-twelve-month fields (the UI labels say "TTM" —
                # they must carry TV's real TTM values, not FY mislabeled as TTM)
                "total_revenue_ttm", "net_income_ttm",
                "earnings_per_share_diluted_ttm", "free_cash_flow_ttm",
                "net_margin_fy"]
        rows = await self._scan(cols, rng=[0, 300])

        out: List[Dict[str, Any]] = []
        for d in rows:
            sym = d.get("symbol")
            fy = d.get("fiscal_period_fy")
            if not sym or fy is None:
                continue
            out.append({
                "symbol": sym,
                "fiscal_year": int(fy),
                # Monetary aggregates — TV returns ABSOLUTE EGP, store as-is
                "revenue": _finite(d.get("total_revenue_fy")),
                "gross_profit": _finite(d.get("gross_profit_fy")),
                "operating_income": _finite(d.get("oper_income_fy")),
                "ebitda": _finite(d.get("ebitda_fy")),
                "net_income": _finite(d.get("net_income_fy")),
                "total_assets": _finite(d.get("total_assets_fy")),
                "total_equity": _finite(d.get("total_equity_fy")),
                "total_liabilities": _finite(d.get("total_liabilities_fy")),
                "total_debt": _finite(d.get("total_debt_fy")),
                "free_cash_flow": _finite(d.get("free_cash_flow_fy")),
                # Per-share values — already in EGP per share, no scaling
                "eps_diluted": _finite(d.get("earnings_per_share_diluted_fy")),
                "bvps": _finite(d.get("book_value_per_share_fy")),
                "shares_outstanding": _finite(d.get("total_shares_outstanding_current")),
                "dps": _finite(d.get("dps_common_stock_prim_issue_fy")),
                # Ratios and margins — unitless percentages, no scaling
                "gross_margin": _finite(d.get("gross_margin_fy")),
                "operating_margin": _finite(d.get("operating_margin_fy")),
                "roe": _finite(d.get("return_on_equity_fy")),
                "roa": _finite(d.get("return_on_assets_fy")),
                "net_margin": _finite(d.get("net_margin_fy")),
                # True TTM (same /scan endpoint -> native absolute EGP, no scaling)
                "revenue_ttm": _finite(d.get("total_revenue_ttm")),
                "net_income_ttm": _finite(d.get("net_income_ttm")),
                "eps_diluted_ttm": _finite(d.get("earnings_per_share_diluted_ttm")),
                "free_cash_flow_ttm": _finite(d.get("free_cash_flow_ttm")),
            })
        return out

    # ------------------------------------------------------------------ #
    # E1: DIVIDENDS + FORWARD CALENDAR
    # ------------------------------------------------------------------ #
    async def get_dividends(self) -> List[Dict[str, Any]]:
        cols = ["name", "close", "dividends_yield_current", "dividends_yield",
                "dividend_amount_recent",
                "dividend_ex_date_recent", "dividend_payment_date_recent",
                "dividend_amount_upcoming", "dividend_ex_date_upcoming",
                "dividend_payment_date_upcoming", "dividends_frequency",
                "dividend_payout_ratio_ttm", "continuous_dividend_growth"]
        return await self._scan(cols, rng=[0, 300])

    # ------------------------------------------------------------------ #
    # E1: ANALYST ESTIMATES / FORECASTS (covered names only)
    # ------------------------------------------------------------------ #
    async def get_estimates(self) -> List[Dict[str, Any]]:
        cols = ["name", "price_target_average", "price_target_high",
                "price_target_low", "price_target_median",
                "recommendation_buy", "recommendation_over", "recommendation_hold",
                "recommendation_under", "recommendation_sell", "recommendation_total",
                "earnings_per_share_forecast_next_fq", "revenue_forecast_next_fq",
                "earnings_per_share_forecast_next_fy"]
        rows = await self._scan(cols, rng=[0, 300])
        # keep only rows that actually have analyst coverage
        return [r for r in rows if _finite(r.get("price_target_average")) is not None
                or _finite(r.get("recommendation_total"))]

    # ------------------------------------------------------------------ #
    # E4: NEWS
    # ------------------------------------------------------------------ #
    async def get_news(self, symbol: str = "EGX:EGX30") -> List[Dict[str, Any]]:
        tv = symbol if symbol.startswith(EGX_PREFIX) else EGX_PREFIX + symbol
        resp = await self._request("GET", NEWS_URL, params={
            "client": "overview", "lang": "en", "symbol": tv})
        items = resp.json().get("items", []) or []
        out = []
        for it in items:
            out.append({
                "id": it.get("id"),
                "title": it.get("title"),
                "provider": it.get("provider"),
                "source": it.get("source"),
                "published_at": it.get("published"),
                "story_path": it.get("storyPath"),
                "related_symbols": [s.get("symbol") for s in it.get("relatedSymbols", [])],
            })
        return out

    # ------------------------------------------------------------------ #
    # E5/E6: IDENTITY (ISIN, logoid) + LOGO URL
    # ------------------------------------------------------------------ #
    async def search_identity(self, symbol: str) -> Optional[Dict[str, Any]]:
        resp = await self._request("GET", SEARCH_URL, params={
            "text": _to_internal_symbol(symbol), "exchange": "EGX",
            "lang": "en", "search_type": "stocks"})
        syms = resp.json().get("symbols", []) or []
        if not syms:
            return None
        s = syms[0]
        logoid = s.get("logoid")
        return {
            "internal_symbol": _to_internal_symbol(symbol),
            "tv_symbol": EGX_PREFIX + _to_internal_symbol(symbol),
            "isin": s.get("isin"),
            "logoid": logoid,
            "logo_url": f"{LOGO_BASE}/{logoid}.svg" if logoid else None,
            "is_primary": s.get("is_primary_listing"),
            "currency": s.get("currency_code"),
        }

    @staticmethod
    def logo_url(logoid: str, big: bool = False) -> str:
        return f"{LOGO_BASE}/{logoid}{'--big' if big else ''}.svg"


# --------------------------------------------------------------------------- #
# Saudi (Tadawul/TASI) endpoints + client
# --------------------------------------------------------------------------- #
KSA_SCAN_URL = "https://scanner.tradingview.com/ksa/scan"
KSA_PREFIX = "TADAWUL:"
MIN_KSA_UNIVERSE = 50  # active Saudi names; floor well below real ~200 for safety

_KSA_PRICE_COLS = [
    "name", "description", "close", "change", "change_abs", "volume",
    "open", "high", "low", "market_cap_basic",
    "total_revenue_fy", "net_income_fy", "price_earnings_ttm",
    "dividends_yield_current", "dividends_yield", "dividend_amount_recent",
    "price_book_ratio", "beta_1_year",
    "sector", "time", "last_bar_update_time",
]


def _to_ksa_symbol(tv_symbol: str) -> str:
    """'TADAWUL:1120' -> '1120'. Tolerant of already-bare symbols."""
    return tv_symbol.split(":", 1)[1] if ":" in tv_symbol else tv_symbol


class TradingViewKSAClient:
    """Async TradingView client for the Saudi Tadawul market.
    Same design contract as TradingViewEGXClient — drop-in primary for KSAFeedRouter."""

    def __init__(self, timeout: float = 20.0, retries: int = 3):
        self._timeout = timeout
        self._retries = retries

    async def _request(self, method: str, url: str, **kw) -> httpx.Response:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout, headers=_HEADERS) as c:
                    resp = await c.request(method, url, **kw)
                if resp.status_code == 200:
                    return resp
                logger.warning("TV KSA %s -> HTTP %s (attempt %d/%d)",
                               url.split("/")[-1], resp.status_code, attempt, self._retries)
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp)
            except (httpx.HTTPError, asyncio.TimeoutError) as e:
                last_exc = e
                logger.warning("TV KSA request failed: %s (attempt %d/%d)", e, attempt, self._retries)
            if attempt < self._retries:
                await asyncio.sleep(0.4 * (2 ** (attempt - 1)))
        raise FeedDegraded(f"TV KSA request exhausted retries: {last_exc}")

    async def _scan(self, columns: List[str], *, rng: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        body: Dict[str, Any] = {"columns": columns, "range": rng or [0, 500]}
        resp = await self._request("POST", KSA_SCAN_URL, json=body)
        try:
            payload = resp.json()
        except ValueError as e:
            raise FeedDegraded(f"TV KSA scan returned non-JSON: {e}")
        rows = payload.get("data") or []
        out: List[Dict[str, Any]] = []
        for r in rows:
            d = dict(zip(columns, r.get("d", [])))
            d["_tv_symbol"] = r.get("s", "")
            d["symbol"] = _to_ksa_symbol(r.get("s", ""))
            out.append(d)
        return out

    async def get_ksa_stocks(self) -> List[Dict[str, Any]]:
        """Bulk price/overview for all Saudi stocks. Same dict shape as get_egx_stocks()
        but currency=SAR and market_code='KSA'. Raises FeedDegraded on implausible payload."""
        rows = await self._scan(_KSA_PRICE_COLS, rng=[0, 500])
        if len(rows) < MIN_KSA_UNIVERSE:
            raise FeedDegraded(f"TV KSA returned only {len(rows)} rows (< {MIN_KSA_UNIVERSE})")

        stocks: List[Dict[str, Any]] = []
        for d in rows:
            symbol = d["symbol"]
            price = _finite(d.get("close"))
            change_pct = _finite(d.get("change"))
            if not _valid_price_row(symbol, price, change_pct):
                continue
            stocks.append({
                "symbol": symbol,
                "name_en": d.get("description") or d.get("name") or "",
                "market_cap": _finite(d.get("market_cap_basic")),
                "last_price": price,
                "change": _finite(d.get("change_abs")),
                "change_percent": change_pct,
                "volume": int(_finite(d.get("volume")) or 0),
                "open": _finite(d.get("open")),
                "high": _finite(d.get("high")),
                "low": _finite(d.get("low")),
                "revenue": _finite(d.get("total_revenue_fy")),
                "net_income": _finite(d.get("net_income_fy")),
                "pe_ratio": _finite(d.get("price_earnings_ttm")),
                "dividend_yield": _sane_dividend_yield(
                    d.get("dividends_yield_current"), d.get("dividends_yield"),
                    d.get("dividend_amount_recent"), price),
                "pb_ratio": _finite(d.get("price_book_ratio")),
                "beta": _finite(d.get("beta_1_year")),
                "sector_name": d.get("sector") or "",
                "market_code": "KSA",
                "currency": "SAR",
                "bar_time": d.get("time"),
                "last_bar_update_time": d.get("last_bar_update_time"),
            })
        if len(stocks) < MIN_KSA_UNIVERSE:
            raise FeedDegraded(f"TV KSA had {len(rows)} rows but only {len(stocks)} usable prices")
        logger.info("TradingView KSA price feed: %d/%d usable", len(stocks), len(rows))
        return stocks
