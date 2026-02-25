#!/usr/bin/env python3
"""
Scrape Egypt stock/index news from ArabFinance category feed and upsert into market_news.

Captured fields:
- headline (title)
- published_at (date)
- image_url
- article_body (full text)
"""

from __future__ import annotations

import argparse
import asyncio
import html as ihtml
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urljoin, urlparse

import asyncpg
import requests
from scrapling import Selector

from egx_news_shared import (
    ArticleRecord,
    adaptive_sleep_seconds,
    clean_text,
    cutoff_from_days,
    dedupe_keep_order,
    ensure_market_news_schema,
    extract_symbol_from_text,
    is_strict_quality_pass,
    load_known_symbols,
    load_runtime_env,
    normalize_image_url,
    parse_datetime_with_formats,
    query_quality_metrics,
    sample_quality_snapshot,
    setup_logging,
    upsert_articles,
    within_cutoff,
)


BASE_SECTION_URL = "https://www.arabfinance.com/en/news/newssinglecategory/2"
SOURCE_NAME = "ArabFinance"
SOURCE_COUNTRY = "EG"
SOURCE_SECTION = "arabfinance/news/newssinglecategory/2"
DEFAULT_DAYS = 30
DEFAULT_MAX_PAGES = 35
DEFAULT_TIMEOUT = 45


EGYPT_MARKERS = (
    "egypt",
    "egyptian",
    "egx",
    "cairo",
    "egp",
    "cbe",
)

MARKET_MARKERS = (
    "egx",
    "stock",
    "stocks",
    "equity",
    "equities",
    "share",
    "shares",
    "dividend",
    "capital increase",
    "capital hike",
    "rights issue",
    "ipo",
    "listing",
    "listed",
    "stake",
    "trading",
    "index",
    "indices",
    "ftse",
    "board approves",
    "egm",
    "agm",
    "acquisition",
    "merger",
    "buyback",
    "profit",
    "profits",
    "earnings",
    "net income",
)

EXCLUDE_MARKERS = (
    "exchange rate",
    "exchange rates",
    "usd/egp",
    "gold prices",
    "silver prices",
    "bullion",
    "inflation",
    "petroleum",
    "gas production",
    "remittances",
)


logger = logging.getLogger("arabfinance-egx-news")


@dataclass
class ListingCard:
    url: str
    title: str | None
    image_url: str | None
    listing_date_text: str | None
    listing_date_utc: datetime | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape ArabFinance Egypt stock/index news and upsert into market_news."
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
        help="ArabFinance listing section URL.",
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


def parse_arabfinance_datetime(value: str | None) -> datetime | None:
    value = clean_text(value)
    if not value:
        return None

    value = re.sub(r"^updated\s+", "", value, flags=re.IGNORECASE)
    parsed = parse_datetime_with_formats(
        value,
        (
            "%m/%d/%Y %I:%M:%S %p",
            "%m/%d/%Y %H:%M:%S",
            "%m/%d/%Y %I:%M %p",
        ),
        assume_cairo_tz=True,
    )
    return parsed


def extract_node_text(node) -> str:
    if node is None:
        return ""

    text = clean_text(getattr(node, "text", ""))
    if text:
        return text

    text = clean_text(node.get_all_text())
    if text:
        return text

    raw = str(node)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return clean_text(ihtml.unescape(raw))


def extract_arabfinance_body(doc: Selector) -> str:
    container = doc.css("div.row.m-0.details")
    if not container:
        return ""

    root = container[0]
    paragraphs = root.css("p")

    noise_prefixes = (
        "for all the latest",
        "to trade and invest",
        "click here",
    )

    blocks: list[str] = []
    if paragraphs:
        for p in paragraphs:
            text = extract_node_text(p)
            if not text:
                continue
            lowered = text.lower()
            if any(lowered.startswith(prefix) for prefix in noise_prefixes):
                continue
            blocks.append(text)
    else:
        text = extract_node_text(root)
        if text:
            blocks.append(text)

    blocks = dedupe_keep_order(blocks)
    blocks = [text for text in blocks if len(text) >= 25]
    return "\n\n".join(blocks).strip()


def extract_arabfinance_external_id(article_url: str) -> str | None:
    path = urlparse(article_url).path.rstrip("/")
    if not path:
        return None
    slug = path.split("/")[-1]
    if not slug:
        return None
    return slug[:64]


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

    has_market_marker = any(token in combined for token in MARKET_MARKERS)
    has_exclude_marker = any(token in combined for token in EXCLUDE_MARKERS)

    if symbol:
        return True

    if has_market_marker:
        return True

    if has_exclude_marker:
        return False

    return False


class ArabFinanceEgxNewsScraper:
    def __init__(self, timeout: int):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )

    def fetch(self, url: str) -> tuple[Selector | None, int, str]:
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
                status = int(response.status_code)
                final_url = response.url or url
                if status != 200:
                    logger.warning("Fetch failed (%s): %s", status, url)
                    return None, status, final_url
                selector = Selector(content=response.text, url=final_url)
                return selector, status, final_url
            except Exception as exc:
                last_error = exc
                if attempt < 3:
                    time.sleep(1)
                    continue
        logger.warning("Fetch error after retries: %s (%s)", url, last_error)
        return None, 0, url

    def extract_listing_cards(self, list_url: str) -> list[ListingCard]:
        doc, status, _ = self.fetch(list_url)
        if doc is None or status != 200:
            logger.warning("Listing fetch failed: %s (%s)", list_url, status)
            return []

        cards: list[ListingCard] = []
        item_nodes = doc.css("div.row.m-0.news-single-category > div")
        for item in item_nodes:
            link = item.css('a[href*="/en/news/newdetails/"]')
            if not link:
                continue

            href = (link[0].attrib.get("href") or "").strip()
            if not href:
                continue

            full_url = urljoin(str(doc.url), href)
            if "/en/news/newdetails/" not in full_url:
                continue

            title_node = item.css("div.news-thumb a.py-2")
            img_node = item.css("img")
            date_node = item.css("span.news-list-date")

            title = extract_node_text(title_node[0]) if title_node else None
            if not title and img_node:
                title = clean_text(img_node[0].attrib.get("title") or img_node[0].attrib.get("alt"))

            image_url = None
            if img_node:
                image_url = normalize_image_url(
                    urljoin(str(doc.url), img_node[0].attrib.get("src") or "")
                )

            listing_date_text = extract_node_text(date_node[0]) if date_node else None
            listing_date_utc = parse_arabfinance_datetime(listing_date_text)

            cards.append(
                ListingCard(
                    url=full_url,
                    title=title,
                    image_url=image_url,
                    listing_date_text=listing_date_text,
                    listing_date_utc=listing_date_utc,
                )
            )

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
        title = extract_node_text(h1[0]) if h1 else clean_text(card.title)
        if not title:
            logger.debug("Skipping ArabFinance article with empty title: %s", card.url)
            return None

        date_node = doc.css("div.row.py-4 span.news-list-date")
        published_raw = extract_node_text(date_node[0]) if date_node else card.listing_date_text
        published_at = parse_arabfinance_datetime(published_raw)

        if published_at is None:
            # Fallback: parse timestamp directly from node markup if text extraction is empty.
            raw_markup = str(date_node[0]) if date_node else ""
            match = re.search(
                r"Updated\s+\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*[AP]M",
                raw_markup,
                flags=re.IGNORECASE,
            )
            if match:
                published_raw = clean_text(match.group(0))
                published_at = parse_arabfinance_datetime(published_raw)

        image_url = None
        main_image = doc.css("div.row.py-4 img.shadow-sm.rounded") or doc.css("main img")
        if main_image:
            image_url = normalize_image_url(
                urljoin(str(doc.url), main_image[0].attrib.get("src") or "")
            )

        if not image_url:
            og_image = doc.css('meta[property="og:image"]')
            if og_image:
                image_url = normalize_image_url(
                    urljoin(str(doc.url), og_image[0].attrib.get("content") or "")
                )

        if not image_url:
            image_url = card.image_url

        body = extract_arabfinance_body(doc)
        symbol = extract_symbol_from_text(f"{title}\n{body}", known_symbols)

        return ArticleRecord(
            url=card.url,
            headline=title,
            image_url=image_url,
            published_at=published_at,
            published_date_raw=published_raw,
            article_body=body,
            external_id=extract_arabfinance_external_id(card.url),
            source=SOURCE_NAME,
            source_section=SOURCE_SECTION,
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

        scraper = ArabFinanceEgxNewsScraper(timeout=args.timeout)

        all_cards: list[ListingCard] = []
        seen_urls: set[str] = set()

        for page in range(1, args.max_pages + 1):
            list_url = build_page_url(args.base_url, page)
            cards = scraper.extract_listing_cards(list_url)
            logger.info("Listing page %s -> %s cards", page, len(cards))

            if not cards:
                break

            oldest_on_page = None
            new_urls = 0

            for card in cards:
                if card.url in seen_urls:
                    continue
                seen_urls.add(card.url)
                all_cards.append(card)
                new_urls += 1

                if card.listing_date_utc and (oldest_on_page is None or card.listing_date_utc < oldest_on_page):
                    oldest_on_page = card.listing_date_utc

            if new_urls == 0:
                logger.info("Stopping listing crawl due to repeated page content.")
                break

            # Listing has article timestamp; include boundary page then stop.
            if oldest_on_page and oldest_on_page < cutoff_utc:
                logger.info("Listing crawl reached cutoff at page %s.", page)
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

            if idx % 20 == 0:
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
                SELECT url, headline, published_at, image_url,
                       LEFT(COALESCE(article_body, ''), 180) AS body_preview
                FROM market_news
                WHERE source = $1
                  AND source_country = $2
                  AND source_section = $3
                  AND published_at >= $4
                ORDER BY published_at DESC
                LIMIT 3
                """,
                SOURCE_NAME,
                SOURCE_COUNTRY,
                SOURCE_SECTION,
                cutoff_utc,
            )
            logger.info("Sample rows:")
            for row in sample_rows:
                logger.info(
                    "- %s | %s | %s | image:%s | body:%s",
                    row["published_at"],
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
