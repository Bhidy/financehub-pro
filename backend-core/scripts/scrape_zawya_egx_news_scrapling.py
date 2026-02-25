#!/usr/bin/env python3
"""
Scrape Egypt stock/index news from Zawya (North Africa) and upsert into market_news.

Captured fields:
- headline (title)
- published_at (date)
- image_url
- article_body (full text)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

import asyncpg
import requests
from scrapling import Selector

try:
    from curl_cffi import requests as curl_requests
except Exception:  # pragma: no cover
    curl_requests = None

from egx_news_shared import (
    ArticleRecord,
    adaptive_sleep_seconds,
    clean_text,
    cutoff_from_days,
    dedupe_keep_order,
    derive_source_section,
    ensure_market_news_schema,
    extract_external_id_from_slug,
    extract_symbol_from_text,
    is_strict_quality_pass,
    load_known_symbols,
    load_runtime_env,
    normalize_image_url,
    parse_datetime_with_formats,
    parse_iso_datetime,
    query_quality_metrics,
    sample_quality_snapshot,
    setup_logging,
    upsert_articles,
    within_cutoff,
)


BASE_SECTION_URL = "https://www.zawya.com/en/economy/north-africa"
SOURCE_NAME = "Zawya"
SOURCE_COUNTRY = "EG"
SOURCE_PREFIX = "zawya"
DEFAULT_DAYS = 30
DEFAULT_MAX_PAGES = 16
DEFAULT_TIMEOUT = 45
DEFAULT_HTML_PROXY_URL = "https://startamarkets.com/api/v1/fetch-html"

BLOCKED_STATUS_CODES = {403, 429, 503}
BLOCKED_TEXT_MARKERS = (
    "access denied",
    "forbidden",
    "captcha",
    "cloudflare",
    "attention required",
    "request unsuccessful",
)
CURL_IMPERSONATION_ORDER = ("chrome124", "chrome120", "safari17_2", "edge101")


EGYPT_MARKERS = (
    "egypt",
    "egyptian",
    "egx",
    "cairo",
    "egp",
)

STOCK_INDEX_MARKERS = (
    "egx",
    "egyptian exchange",
    "stock",
    "stocks",
    "equity",
    "equities",
    "share",
    "shares",
    "dividend",
    "stake",
    "listed",
    "listing",
    "trading",
    "index",
    "indices",
    "ftse",
    "market capitalization",
    "market cap",
    "capital increase",
    "rights issue",
    "ipo",
    "buyback",
)

EXCLUDE_MARKERS = (
    "exchange rate",
    "exchange rates",
    "usd/egp",
    "bond",
    "bonds",
    "gold prices",
    "gold output",
    "silver prices",
    "inflation",
    "consumer prices",
    "gas production",
    "petroleum minister",
    "remittances",
    "investment ministry",
)


logger = logging.getLogger("zawya-egx-news")


@dataclass
class ListingCard:
    url: str
    title: str | None
    image_url: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Zawya Egypt stock/index news and upsert into market_news."
    )
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS, help="Backfill window in days.")
    parser.add_argument(
        "--max-pages",
        type=int,
        default=DEFAULT_MAX_PAGES,
        help="Maximum listing pages to crawl.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="HTTP timeout in seconds per request.",
    )
    parser.add_argument(
        "--base-url",
        default=BASE_SECTION_URL,
        help="Zawya listing section URL.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and validate without writing to DB.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logs.",
    )
    return parser.parse_args()


def build_page_url(base_url: str, page: int) -> str:
    if page <= 1:
        return base_url
    sep = "&" if "?" in base_url else "?"
    return f"{base_url}{sep}page={page}"


def parse_news_article_jsonld(doc: Selector) -> dict[str, Any] | None:
    for script in doc.css('script[type="application/ld+json"]'):
        raw = clean_text(script.get_all_text())
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            continue

        queue: list[Any] = [payload]
        while queue:
            item = queue.pop(0)
            if isinstance(item, dict):
                type_value = item.get("@type")
                if type_value == "NewsArticle" or (
                    isinstance(type_value, list) and "NewsArticle" in type_value
                ):
                    return item
                graph = item.get("@graph")
                if isinstance(graph, list):
                    queue.extend(graph)
            elif isinstance(item, list):
                queue.extend(item)

    return None


def extract_zawya_body(doc: Selector) -> str:
    containers = doc.css(".article-body") or doc.css("article")
    if not containers:
        return ""

    noise_prefixes = (
        "for all the latest headlines",
        "read more:",
        "subscribe to",
    )

    blocks: list[str] = []
    for container in containers:
        paragraphs = container.css("p")
        if paragraphs:
            for p in paragraphs:
                text = clean_text(p.get_all_text())
                if not text:
                    continue
                lowered = text.lower()
                if any(lowered.startswith(prefix) for prefix in noise_prefixes):
                    continue
                blocks.append(text)
        else:
            text = clean_text(container.get_all_text())
            if text:
                blocks.append(text)

    blocks = dedupe_keep_order(blocks)
    blocks = [text for text in blocks if len(text) >= 25]
    return "\n\n".join(blocks).strip()


def article_is_egypt_stock_or_index_news(
    *,
    headline: str,
    body: str,
    url: str,
    symbol: str | None,
) -> bool:
    combined = f"{headline}\n{body}\n{url}".lower()
    has_egypt_marker = any(token in combined for token in EGYPT_MARKERS)
    if not has_egypt_marker:
        return False

    has_stock_marker = any(token in combined for token in STOCK_INDEX_MARKERS)
    has_exclude_marker = any(token in combined for token in EXCLUDE_MARKERS)

    if has_stock_marker and not has_exclude_marker:
        return True

    if symbol and not has_exclude_marker:
        return True

    return False


class ZawyaEgxNewsScraper:
    def __init__(self, timeout: int, html_proxy_url: str | None = None):
        self.timeout = timeout
        self.html_proxy_url = clean_text(html_proxy_url or os.getenv("ZAWYA_HTML_PROXY_URL", "")) or DEFAULT_HTML_PROXY_URL
        self.session = requests.Session()
        self.default_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.alt_headers = {
            **self.default_headers,
            "Accept-Language": "en-US,en;q=0.8,ar;q=0.6",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://www.google.com/",
        }
        self.session.headers.update(self.default_headers)

    @staticmethod
    def _looks_blocked(status: int, html: str | None) -> bool:
        if status in BLOCKED_STATUS_CODES:
            return True
        if status != 200 or not html:
            return False
        sample = html[:2500].lower()
        return any(marker in sample for marker in BLOCKED_TEXT_MARKERS)

    def _build_selector(self, html: str, final_url: str, status: int) -> tuple[Selector | None, int, str]:
        if not html or self._looks_blocked(status, html):
            return None, status, final_url
        return Selector(content=html, url=final_url), status, final_url

    def _fetch_with_requests(self, url: str, *, use_alt_headers: bool) -> tuple[Selector | None, int, str]:
        response = self.session.get(
            url,
            timeout=self.timeout,
            allow_redirects=True,
            headers=self.alt_headers if use_alt_headers else self.default_headers,
        )
        status = int(response.status_code)
        final_url = response.url or url
        selector, status, final_url = self._build_selector(response.text or "", final_url, status)
        if selector is None:
            logger.warning("Fetch blocked/failed (%s): %s", status, url)
        return selector, status, final_url

    def _fetch_with_curl_cffi(self, url: str) -> tuple[Selector | None, int, str]:
        if curl_requests is None:
            return None, 0, url

        last_status = 0
        final_url = url
        for browser in CURL_IMPERSONATION_ORDER:
            kwargs = {
                "timeout": self.timeout,
                "headers": self.alt_headers,
                "impersonate": browser,
                "allow_redirects": True,
            }
            try:
                response = curl_requests.get(url, **kwargs)
            except TypeError:
                kwargs.pop("allow_redirects", None)
                kwargs["follow_redirects"] = True
                try:
                    response = curl_requests.get(url, **kwargs)
                except Exception:
                    continue
            except Exception:
                continue

            status = int(getattr(response, "status_code", 0) or 0)
            final_url = str(getattr(response, "url", url) or url)
            selector, status, final_url = self._build_selector(
                getattr(response, "text", "") or "",
                final_url,
                status,
            )
            if selector is not None:
                logger.info("Recovered fetch via curl_cffi (%s): %s", browser, url)
                return selector, status, final_url
            last_status = status

        return None, last_status, final_url

    def _fetch_with_html_proxy(self, url: str) -> tuple[Selector | None, int, str]:
        if not self.html_proxy_url:
            return None, 0, url

        try:
            response = self.session.get(
                self.html_proxy_url,
                params={"url": url},
                timeout=self.timeout + 20,
                headers=self.alt_headers,
                allow_redirects=True,
            )
            if response.status_code != 200:
                logger.warning(
                    "HTML proxy request failed (%s): %s -> %s",
                    response.status_code,
                    self.html_proxy_url,
                    url,
                )
                return None, int(response.status_code), url

            payload = response.json()
            upstream_status = int(payload.get("status") or 0)
            final_url = clean_text(str(payload.get("final_url") or url)) or url
            html = str(payload.get("html") or "")

            selector, status, final_url = self._build_selector(html, final_url, upstream_status)
            if selector is not None:
                logger.info("Recovered fetch via HTML proxy: %s", url)
                return selector, status, final_url
            return None, upstream_status, final_url
        except Exception as exc:
            logger.warning("HTML proxy fetch failed: %s (%s)", url, exc)
            return None, 0, url

    def fetch(self, url: str) -> tuple[Selector | None, int, str]:
        last_error: Exception | None = None
        last_status = 0
        last_final_url = url

        for attempt in range(1, 4):
            try:
                selector, status, final_url = self._fetch_with_requests(
                    url,
                    use_alt_headers=attempt > 1,
                )
                last_status = status
                last_final_url = final_url
                if selector is not None:
                    return selector, status, final_url
                if status and status not in BLOCKED_STATUS_CODES:
                    break
                if status in BLOCKED_STATUS_CODES:
                    # Domain-level block detected; switch immediately to fallback paths.
                    break
            except Exception as exc:
                last_error = exc
            if attempt < 3 and (not last_status or last_status not in BLOCKED_STATUS_CODES):
                time.sleep(0.8 + (attempt * 0.4))

        selector, status, final_url = self._fetch_with_curl_cffi(url)
        if selector is not None:
            return selector, status, final_url

        selector, status, final_url = self._fetch_with_html_proxy(url)
        if selector is not None:
            return selector, status, final_url

        if status:
            last_status = status
            last_final_url = final_url
        if last_error is not None:
            logger.warning("Fetch error after retries: %s (%s)", url, last_error)
        return None, last_status, last_final_url

    def extract_listing_cards(self, list_url: str) -> list[ListingCard]:
        doc, status, _ = self.fetch(list_url)
        if doc is None or status != 200:
            logger.warning("Listing fetch failed: %s (%s)", list_url, status)
            return []

        cards: list[ListingCard] = []
        for teaser in doc.css("div.teaser.teaser-type-news"):
            title_link = teaser.css("h2.teaser-title a")
            if not title_link:
                continue

            href = (title_link[0].attrib.get("href") or "").strip()
            if not href:
                continue

            full_url = urljoin(str(doc.url), href)
            if "/en/" not in full_url:
                continue

            slug = full_url.rstrip("/").split("/")[-1]
            if not re.search(r"-[a-z0-9]{6,12}$", slug):
                continue

            title = clean_text(title_link[0].get_all_text())
            if not title:
                continue

            image_url = None
            img = teaser.css("div.teaser-image img") or teaser.css("img")
            if img:
                image_url = normalize_image_url(
                    img[0].attrib.get("src") or img[0].attrib.get("data-src")
                )

            cards.append(ListingCard(url=full_url, title=title, image_url=image_url))

        deduped: list[ListingCard] = []
        seen: set[str] = set()
        for card in cards:
            if card.url in seen:
                continue
            seen.add(card.url)
            deduped.append(card)
        return deduped

    def extract_article(self, card: ListingCard, known_symbols: set[str]) -> ArticleRecord | None:
        doc, status, _ = self.fetch(card.url)
        if doc is None or status != 200:
            logger.warning("Article fetch failed: %s (%s)", card.url, status)
            return None

        h1 = doc.css("h1")
        title = clean_text(h1[0].get_all_text()) if h1 else clean_text(card.title)
        if not title:
            logger.debug("Skipping Zawya article with empty title: %s", card.url)
            return None

        jsonld = parse_news_article_jsonld(doc)

        published_raw = None
        published_at = None
        if jsonld:
            published_raw = clean_text(str(jsonld.get("datePublished") or "")) or None
            published_at = parse_iso_datetime(published_raw)

        if published_at is None:
            date_node = doc.css(".article-date")
            published_raw = clean_text(date_node[0].get_all_text()) if date_node else None
            published_at = parse_datetime_with_formats(
                published_raw,
                ("%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y"),
                assume_cairo_tz=True,
            )

        image_url = None
        if jsonld:
            image_value = jsonld.get("image")
            if isinstance(image_value, str):
                image_url = normalize_image_url(image_value)
            elif isinstance(image_value, list) and image_value:
                image_url = normalize_image_url(str(image_value[0]))

        if not image_url:
            og_image = doc.css('meta[property="og:image"]')
            if og_image:
                image_url = normalize_image_url(og_image[0].attrib.get("content"))

        if not image_url:
            main_image = doc.css(".article-body img") or doc.css("article img")
            if main_image:
                image_url = normalize_image_url(
                    main_image[0].attrib.get("src") or main_image[0].attrib.get("data-src")
                )

        if not image_url:
            image_url = card.image_url

        body = extract_zawya_body(doc)
        symbol = extract_symbol_from_text(f"{title}\n{body}", known_symbols)

        source_section = derive_source_section(card.url, SOURCE_PREFIX)

        return ArticleRecord(
            url=card.url,
            headline=title,
            image_url=image_url,
            published_at=published_at,
            published_date_raw=published_raw,
            article_body=body,
            external_id=extract_external_id_from_slug(card.url),
            source=SOURCE_NAME,
            source_section=source_section,
            source_country=SOURCE_COUNTRY,
            symbol=symbol,
        )


async def run(args: argparse.Namespace) -> None:
    load_runtime_env()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Put it in environment or .env.")

    cutoff_utc = cutoff_from_days(args.days)
    logger.info("Cutoff UTC: %s", cutoff_utc.isoformat())

    pool = await asyncpg.create_pool(
        dsn=database_url,
        min_size=1,
        max_size=5,
        ssl="require",
        statement_cache_size=0,
    )

    try:
        async with pool.acquire() as conn:
            await ensure_market_news_schema(conn)
            known_symbols = await load_known_symbols(conn)

        scraper = ZawyaEgxNewsScraper(timeout=args.timeout)

        all_cards: list[ListingCard] = []
        seen_urls: set[str] = set()
        repeated_pages = 0

        for page in range(1, args.max_pages + 1):
            list_url = build_page_url(args.base_url, page)
            cards = scraper.extract_listing_cards(list_url)
            logger.info("Listing page %s -> %s cards", page, len(cards))

            if not cards:
                break

            new_urls = 0
            for card in cards:
                if card.url in seen_urls:
                    continue
                seen_urls.add(card.url)
                all_cards.append(card)
                new_urls += 1

            if new_urls == 0:
                repeated_pages += 1
            else:
                repeated_pages = 0

            # Zawya pagination often repeats the same page after the final page.
            if repeated_pages >= 2:
                logger.info("Stopping listing crawl due to repeated pages.")
                break

            time.sleep(adaptive_sleep_seconds(page))

        logger.info("Collected %s unique listing URLs", len(all_cards))

        article_records: list[ArticleRecord] = []
        skipped_old = 0
        skipped_irrelevant = 0
        skipped_incomplete = 0
        failed_articles = 0

        for idx, card in enumerate(all_cards, start=1):
            record = scraper.extract_article(card, known_symbols)
            if record is None:
                failed_articles += 1
                continue

            if not within_cutoff(record.published_at, cutoff_utc):
                skipped_old += 1
                continue

            if not article_is_egypt_stock_or_index_news(
                headline=record.headline,
                body=record.article_body,
                url=record.url,
                symbol=record.symbol,
            ):
                skipped_irrelevant += 1
                continue

            if not is_strict_quality_pass(record):
                skipped_incomplete += 1
                continue

            article_records.append(record)

            if idx % 15 == 0:
                logger.info("Processed %s/%s article URLs", idx, len(all_cards))

        logger.info(
            "Articles in-window: %s | skipped_old:%s | skipped_irrelevant:%s | "
            "skipped_incomplete:%s | failed:%s",
            len(article_records),
            skipped_old,
            skipped_irrelevant,
            skipped_incomplete,
            failed_articles,
        )

        if args.dry_run:
            metrics = sample_quality_snapshot(article_records)
            logger.info(
                "DRY RUN metrics -> total:%s title:%s date:%s image:%s body:%s",
                metrics["total"],
                metrics["with_title"],
                metrics["with_date"],
                metrics["with_image"],
                metrics["with_body"],
            )
            return

        async with pool.acquire() as conn:
            inserted, updated = await upsert_articles(conn, article_records, known_symbols)
            metrics = await query_quality_metrics(
                conn,
                cutoff_utc=cutoff_utc,
                source_country=SOURCE_COUNTRY,
                source_name=SOURCE_NAME,
            )

            logger.info("DB upsert complete -> inserted:%s updated:%s", inserted, updated)
            logger.info(
                "Coverage last %s days -> total:%s title:%s date:%s image:%s body:%s",
                args.days,
                metrics.get("total", 0),
                metrics.get("with_title", 0),
                metrics.get("with_date", 0),
                metrics.get("with_image", 0),
                metrics.get("with_body", 0),
            )

            sample_rows = await conn.fetch(
                """
                SELECT source_section, url, headline, published_at,
                       LEFT(COALESCE(article_body, ''), 180) AS body_preview,
                       image_url
                FROM market_news
                WHERE source = $1
                  AND source_country = $2
                  AND published_at >= $3
                ORDER BY published_at DESC
                LIMIT 3
                """,
                SOURCE_NAME,
                SOURCE_COUNTRY,
                cutoff_utc,
            )
            logger.info("Sample rows:")
            for row in sample_rows:
                logger.info(
                    "- %s | %s | %s | %s | image:%s | body:%s",
                    row["published_at"],
                    row["source_section"],
                    row["headline"],
                    row["url"],
                    "yes" if row["image_url"] else "no",
                    row["body_preview"],
                )
    finally:
        await pool.close()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
