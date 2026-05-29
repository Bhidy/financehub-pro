#!/usr/bin/env python3
"""Scrape full Rubix stock profile page (all tabs/cards/sections) and upsert to DB."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import time
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import asyncpg
from dotenv import load_dotenv
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError, async_playwright


LOGIN_URL = "https://rubixegypt.mubashertrade.com/web/login"
DEFAULT_PROFILE_URL = "https://rubixegypt.mubashertrade.com/web/secure/fd-pages/overview?page=1"
TAB_LABELS = ["Overview", "Quote", "Corporate Actions", "News", "Research"]


logger = logging.getLogger("rubix-profile-v2")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Rubix stock profile page (all tabs/cards/sections) into egx_company_profile_v2."
    )
    parser.add_argument("--url", default=DEFAULT_PROFILE_URL, help="Target Rubix stock profile URL.")
    parser.add_argument("--user", default=os.getenv("RUBIX_USER"), help="Rubix username.")
    parser.add_argument("--password", default=os.getenv("RUBIX_PASS"), help="Rubix password.")
    parser.add_argument(
        "--output",
        default="tmp/rubix_company_profile_v2_latest.json",
        help="JSON output path for extracted payload.",
    )
    parser.add_argument("--timeout", type=int, default=45, help="Timeout seconds for page actions.")
    parser.add_argument("--headful", action="store_true", help="Run browser with UI.")
    parser.add_argument("--no-db", action="store_true", help="Skip DB upsert.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logs.")
    return parser.parse_args()


def setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def load_runtime_env() -> None:
    load_dotenv()

    if os.getenv("DATABASE_URL"):
        return

    script_dir = Path(__file__).resolve().parent
    candidates = [
        script_dir / ".." / ".env",
        script_dir / ".." / ".." / ".env",
        script_dir / ".." / ".." / ".env.local",
        script_dir / ".." / ".." / ".." / ".env.local",
    ]
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate.exists():
            load_dotenv(candidate, override=False)
            if os.getenv("DATABASE_URL"):
                return


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def parse_decimal(value: str | None) -> Decimal | None:
    raw = clean_text(value)
    if not raw:
        return None
    normalized = raw.replace(",", "").replace("%", "")
    normalized = normalized.replace("EGP", "").replace("M", "").strip()
    if normalized in {"--", "-", "N/A"}:
        return None
    try:
        return Decimal(normalized)
    except (InvalidOperation, ValueError):
        return None


def parse_ddmmyyyy(value: str | None) -> date | None:
    raw = clean_text(value)
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%d-%m-%Y").date()
    except ValueError:
        return None


async def maybe_login(page: Page, username: str, password: str, timeout_ms: int) -> None:
    """Login only when we are on login page."""
    user_selector = "#form-input-live-u, input[name='username']"
    pass_selector = "#form-input-live-p, input[name='password']"

    user_locator = page.locator(user_selector)
    if "web/login" not in page.url and await user_locator.count() == 0:
        return

    logger.info("Logging in to Rubix...")
    try:
        await page.wait_for_selector(user_selector, timeout=min(timeout_ms, 15000))
    except PlaywrightTimeoutError:
        if "web/login" in page.url:
            raise
        return

    await page.fill(user_selector, username)
    await page.fill(pass_selector, password)
    await page.click("button[type='submit'], #LoginButton")

    try:
        await page.wait_for_url("**/web/secure/**", timeout=timeout_ms)
    except PlaywrightTimeoutError as exc:
        raise RuntimeError("Rubix login did not reach secure page in time.") from exc


async def wait_profile_ready(
    page: Page,
    timeout_ms: int,
    username: str,
    password: str,
) -> None:
    """Wait until Stock Profile header/tabs are present."""
    deadline = time.monotonic() + (timeout_ms / 1000.0)

    while time.monotonic() < deadline:
        if await page.locator(".fd-stock-header .symbol-code").count() > 0:
            await page.wait_for_selector("button[role='tab']", timeout=5000)
            await page.wait_for_timeout(1000)
            return

        if await page.locator("#form-input-live-u, input[name='username']").count() > 0 or "web/login" in page.url:
            await maybe_login(page, username, password, timeout_ms)

        await page.wait_for_timeout(800)

    raise RuntimeError("Stock profile module did not become ready (fd-stock-header not found).")


async def click_tab(page: Page, label: str, timeout_ms: int) -> None:
    locator = page.locator(f"button[role='tab'] span.mdc-tab__text-label:has-text('{label}')")
    if await locator.count() == 0:
        locator = page.locator(f"button[role='tab']:has-text('{label}')")
    if await locator.count() == 0:
        raise RuntimeError(f"Tab not found: {label}")

    await locator.first.click(timeout=timeout_ms)
    await page.wait_for_timeout(1200)


async def extract_header(page: Page) -> dict[str, Any]:
    return await page.evaluate(
        """
        () => {
          const clean = (v) => (v || "").replace(/\\s+/g, " ").trim();
          const pick = (selector) => clean(document.querySelector(selector)?.textContent || "");

          const topBar = clean(document.querySelector(".fixed-width-container-1")?.textContent || "");
          const dateMatch = topBar.match(/\\b\\d{2}-\\d{2}-\\d{4}\\b/);
          const versionMatch = (document.body.textContent || "").match(/Version\\s*:\\s*([0-9.]+)/i);

          return {
            company_name: pick(".fd-stock-header .font-weight-regular"),
            symbol: pick(".fd-stock-header .symbol-code"),
            exchange_code: pick(".fd-stock-header .exchange-code"),
            last_price: pick(".fd-stock-header .symbol-ltp:not(.red-text)"),
            currency: pick(".fd-stock-header .symbol-currency:not(.red-text)"),
            change_percent: pick(".fd-stock-header .symbol-ltp.red-text"),
            change_value: pick(".fd-stock-header .symbol-currency.red-text"),
            best_bid: pick(".fd-stock-header .bullish-card .value"),
            best_ask: pick(".fd-stock-header .bearish-card .value"),
            performance_1w: pick(".fd-stock-header .volume-turnover-trade-container-stock-header .col-4:nth-child(1) .val"),
            performance_1m: pick(".fd-stock-header .volume-turnover-trade-container-stock-header .col-4:nth-child(2) .val"),
            performance_3m: pick(".fd-stock-header .volume-turnover-trade-container-stock-header .col-4:nth-child(3) .val"),
            disclaimer: pick(".fd-stock-header .disclaimer"),
            profile_date_raw: dateMatch ? dateMatch[0] : "",
            app_version: versionMatch ? versionMatch[1] : "",
            header_raw_text: clean(document.querySelector(".fd-stock-header")?.textContent || ""),
          };
        }
        """
    )


async def extract_current_tab(page: Page, tab_label: str) -> dict[str, Any]:
    return await page.evaluate(
        """
        (tabName) => {
          const clean = (v) => (v || "").replace(/\\s+/g, " ").trim();
          const isVisible = (el) => {
            if (!el) return false;
            const st = getComputedStyle(el);
            if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity || "1") === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };

          const root =
            document.querySelector(".stock-profile-perfect-scroll-bar") ||
            document.querySelector("#page-content-wrapper") ||
            document.body;

          const extractTableRows = (scope) => {
            const rows = [];
            scope.querySelectorAll("table tr").forEach((tr) => {
              if (!isVisible(tr)) return;
              const cells = Array.from(tr.querySelectorAll("th,td"))
                .map((cell) => clean(cell.textContent))
                .filter(Boolean);
              if (cells.length) rows.push(cells);
            });
            return rows;
          };

          const cards = [];
          root.querySelectorAll(".card").forEach((card, index) => {
            if (!isVisible(card)) return;
            const title =
              clean(card.querySelector(".card-header, .widget-header, .template-header-title, h1, h2, h3, h4")?.textContent) ||
              `card_${index + 1}`;

            const items = [];
            card.querySelectorAll("li").forEach((li) => {
              if (!isVisible(li)) return;
              const txt = clean(li.textContent);
              if (txt) items.push(txt);
            });

            cards.push({
              title,
              text: clean(card.textContent).slice(0, 16000),
              table_rows: extractTableRows(card),
              list_items: items.slice(0, 300),
            });
          });

          const standaloneTables = [];
          root.querySelectorAll("table").forEach((table, idx) => {
            if (!isVisible(table)) return;
            const rows = extractTableRows(table);
            if (rows.length) {
              standaloneTables.push({
                table_index: idx + 1,
                rows: rows.slice(0, 400),
              });
            }
          });

          return {
            tab: tabName,
            cards,
            standalone_tables: standaloneTables,
            full_text: clean(root.textContent).slice(0, 50000),
          };
        }
        """,
        tab_label,
    )


def validate_payload(payload: dict[str, Any]) -> None:
    header = payload.get("header") or {}
    symbol = clean_text(header.get("symbol"))
    if not symbol:
        raise RuntimeError("Missing symbol in extracted header.")

    tabs = payload.get("tabs") or {}
    missing = [label for label in TAB_LABELS if label.lower().replace(" ", "_") not in tabs]
    if missing:
        raise RuntimeError(f"Missing tabs from extraction: {', '.join(missing)}")

    weak_tabs = []
    for label in TAB_LABELS:
        key = label.lower().replace(" ", "_")
        tab_data = tabs.get(key) or {}
        cards = tab_data.get("cards") or []
        if len(cards) == 0:
            weak_tabs.append(label)

    if weak_tabs:
        raise RuntimeError(f"Tabs extracted with zero cards: {', '.join(weak_tabs)}")


async def ensure_schema(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS egx_company_profile_v2 (
            symbol VARCHAR(16) PRIMARY KEY,
            company_name TEXT,
            exchange_code VARCHAR(16),
            source_url TEXT NOT NULL,
            as_of_date DATE,
            last_price NUMERIC,
            currency VARCHAR(16),
            change_percent NUMERIC,
            change_value NUMERIC,
            best_bid NUMERIC,
            best_ask NUMERIC,
            performance_1w TEXT,
            performance_1m TEXT,
            performance_3m TEXT,
            disclaimer TEXT,
            header_raw TEXT,
            tabs JSONB NOT NULL,
            raw_payload JSONB NOT NULL,
            extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    await conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_egx_company_profile_v2_extracted_at
        ON egx_company_profile_v2 (extracted_at DESC);
        """
    )


async def upsert_profile(conn: asyncpg.Connection, payload: dict[str, Any], source_url: str) -> None:
    header = payload["header"]
    symbol = clean_text(header.get("symbol")).upper()

    await conn.execute(
        """
        INSERT INTO egx_company_profile_v2 (
            symbol,
            company_name,
            exchange_code,
            source_url,
            as_of_date,
            last_price,
            currency,
            change_percent,
            change_value,
            best_bid,
            best_ask,
            performance_1w,
            performance_1m,
            performance_3m,
            disclaimer,
            header_raw,
            tabs,
            raw_payload,
            extracted_at,
            updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,NOW(),NOW()
        )
        ON CONFLICT (symbol) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            exchange_code = EXCLUDED.exchange_code,
            source_url = EXCLUDED.source_url,
            as_of_date = EXCLUDED.as_of_date,
            last_price = COALESCE(EXCLUDED.last_price, egx_company_profile_v2.last_price),
            currency = COALESCE(EXCLUDED.currency, egx_company_profile_v2.currency),
            change_percent = COALESCE(EXCLUDED.change_percent, egx_company_profile_v2.change_percent),
            change_value = COALESCE(EXCLUDED.change_value, egx_company_profile_v2.change_value),
            best_bid = COALESCE(EXCLUDED.best_bid, egx_company_profile_v2.best_bid),
            best_ask = COALESCE(EXCLUDED.best_ask, egx_company_profile_v2.best_ask),
            performance_1w = COALESCE(EXCLUDED.performance_1w, egx_company_profile_v2.performance_1w),
            performance_1m = COALESCE(EXCLUDED.performance_1m, egx_company_profile_v2.performance_1m),
            performance_3m = COALESCE(EXCLUDED.performance_3m, egx_company_profile_v2.performance_3m),
            disclaimer = COALESCE(EXCLUDED.disclaimer, egx_company_profile_v2.disclaimer),
            header_raw = COALESCE(EXCLUDED.header_raw, egx_company_profile_v2.header_raw),
            tabs = EXCLUDED.tabs,
            raw_payload = EXCLUDED.raw_payload,
            extracted_at = NOW(),
            updated_at = NOW()
        """,
        symbol,
        clean_text(header.get("company_name")),
        clean_text(header.get("exchange_code")),
        source_url,
        parse_ddmmyyyy(header.get("profile_date_raw")),
        parse_decimal(header.get("last_price")),
        clean_text(header.get("currency")),
        parse_decimal(header.get("change_percent")),
        parse_decimal(header.get("change_value")),
        parse_decimal(header.get("best_bid")),
        parse_decimal(header.get("best_ask")),
        clean_text(header.get("performance_1w")),
        clean_text(header.get("performance_1m")),
        clean_text(header.get("performance_3m")),
        clean_text(header.get("disclaimer")),
        clean_text(header.get("header_raw_text")),
        json.dumps(payload.get("tabs") or {}, ensure_ascii=False),
        json.dumps(payload, ensure_ascii=False),
    )


async def connect_db(database_url: str) -> asyncpg.Connection:
    try:
        return await asyncpg.connect(dsn=database_url, ssl="require", statement_cache_size=0)
    except Exception:
        return await asyncpg.connect(dsn=database_url, statement_cache_size=0)


async def run_scrape(args: argparse.Namespace) -> dict[str, Any]:
    timeout_ms = max(args.timeout, 10) * 1000

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headful)
        context = await browser.new_context(viewport={"width": 1760, "height": 1200})
        page = await context.new_page()

        try:
            logger.info("Opening target URL: %s", args.url)
            await page.goto(args.url, wait_until="domcontentloaded", timeout=timeout_ms)

            await maybe_login(page, args.user, args.password, timeout_ms)
            await wait_profile_ready(page, timeout_ms, args.user, args.password)

            header = await extract_header(page)
            tabs: dict[str, Any] = {}

            for tab in TAB_LABELS:
                await click_tab(page, tab, timeout_ms)
                key = tab.lower().replace(" ", "_")
                tabs[key] = await extract_current_tab(page, tab)
                logger.info("Extracted tab: %s (%s cards)", tab, len(tabs[key].get("cards") or []))

            payload: dict[str, Any] = {
                "source": "Rubix",
                "source_url": args.url,
                "extracted_at_utc": datetime.now(timezone.utc).isoformat(),
                "page_url_after_login": page.url,
                "header": header,
                "tabs": tabs,
            }
            validate_payload(payload)
            return payload
        finally:
            await context.close()
            await browser.close()


async def main_async() -> None:
    args = parse_args()
    setup_logging(args.verbose)
    load_runtime_env()

    if not args.user or not args.password:
        raise SystemExit("Rubix credentials missing. Set RUBIX_USER/RUBIX_PASS or pass --user/--password.")

    payload = await run_scrape(args)
    symbol = clean_text(payload.get("header", {}).get("symbol")).upper()

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Saved extraction JSON: %s", output_path)

    if not args.no_db:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise SystemExit("DATABASE_URL not found. Use --no-db or set DATABASE_URL.")

        conn = await connect_db(database_url)
        try:
            await ensure_schema(conn)
            await upsert_profile(conn, payload, args.url)
            logger.info("DB upsert complete for symbol=%s", symbol)
        finally:
            await conn.close()

    tab_counts = {
        key: len((tab_data or {}).get("cards") or [])
        for key, tab_data in (payload.get("tabs") or {}).items()
    }
    print(
        json.dumps(
            {
                "status": "ok",
                "symbol": symbol,
                "url": payload.get("page_url_after_login"),
                "tab_card_counts": tab_counts,
                "output_file": str(output_path),
                "db_upserted": not args.no_db,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
