#!/usr/bin/env python3
"""
Scrape EGX news from Mubasher using Scrapling and upsert into market_news.

Extracted fields:
- headline (title)
- published_at (article date)
- image_url
- article_body (full text paragraphs)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import asyncpg
from dotenv import load_dotenv
import requests
import urllib3
from scrapling import Selector


BASE_SECTION_URL = "https://english.mubasher.info/news/eg/pulse/stocks"
SOURCE_NAME = "Mubasher"
SOURCE_COUNTRY = "EG"
SOURCE_SECTION = "eg/pulse/stocks"
DEFAULT_DAYS = 30
DEFAULT_MAX_PAGES = 60
DEFAULT_TIMEOUT = 45


logger = logging.getLogger("mubasher-egx-news")
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


@dataclass
class ListingCard:
    url: str
    title: str | None
    image_url: str | None
    listing_date_text: str | None
    listing_date_utc: datetime | None


@dataclass
class ArticleRecord:
    url: str
    headline: str
    image_url: str | None
    published_at: datetime | None
    published_date_raw: str | None
    article_body: str
    external_id: str | None
    source_section: str
    source_country: str
    symbol: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Mubasher EGX news and upsert into market_news."
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
        help="HTTP timeout in seconds for each request.",
    )
    parser.add_argument(
        "--base-url",
        default=BASE_SECTION_URL,
        help="Mubasher listing section URL.",
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


def load_runtime_env() -> None:
    load_dotenv()
    if os.getenv("DATABASE_URL"):
        return

    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "..", ".env"),
        os.path.join(script_dir, "..", "backend-core", ".env"),
        os.path.join(script_dir, "..", "..", ".env"),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            load_dotenv(candidate, override=False)
            if os.getenv("DATABASE_URL"):
                return


def setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    # Keep third-party scraper logs concise in normal runs.
    logging.getLogger("scrapling").setLevel(logging.WARNING if not verbose else logging.INFO)


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def normalize_image_url(image_url: str | None) -> str | None:
    if not image_url:
        return None
    image_url = image_url.strip()
    if not image_url:
        return None
    if image_url.startswith("data:image"):
        return None
    if "facebook.com/tr" in image_url:
        return None
    return image_url


def get_cairo_tz() -> timezone | ZoneInfo:
    try:
        return ZoneInfo("Africa/Cairo")
    except Exception:
        return timezone.utc


def parse_listing_datetime_to_utc(value: str | None, now_utc: datetime) -> datetime | None:
    """
    Listing pages expose dates like: '24 February 04:24 PM' (no year).
    Infer the year from current date and map to Cairo time.
    """
    value = clean_text(value)
    if not value:
        return None

    cairo_tz = get_cairo_tz()
    local_now = now_utc.astimezone(cairo_tz)

    parsed_naive = None
    for fmt in ("%d %B %I:%M %p", "%d %b %I:%M %p", "%d %B %H:%M", "%d %b %H:%M"):
        try:
            # Parse with an explicit year to avoid ambiguous-day warnings.
            parsed_naive = datetime.strptime(f"{value} {local_now.year}", f"{fmt} %Y")
            break
        except ValueError:
            continue

    if parsed_naive is None:
        return None

    candidate = parsed_naive.replace(year=local_now.year, tzinfo=cairo_tz)

    # If inferred date appears too far in the future, it likely belongs to previous year.
    if candidate > local_now + timedelta(days=2):
        candidate = candidate.replace(year=candidate.year - 1)

    return candidate.astimezone(timezone.utc)


def parse_article_datetime_to_utc(value: str | None, now_utc: datetime) -> datetime | None:
    """
    Article pages usually expose dates like: '24 February 2026 04:24 PM'.
    """
    value = clean_text(value)
    if not value:
        return None

    cairo_tz = get_cairo_tz()
    parsed_naive = None

    for fmt in (
        "%d %B %Y %I:%M %p",
        "%d %b %Y %I:%M %p",
        "%d %B %Y %H:%M",
        "%d %b %Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            parsed_naive = datetime.strptime(value, fmt)
            break
        except ValueError:
            continue

    if parsed_naive is None:
        # Fallback to listing-like format without year.
        return parse_listing_datetime_to_utc(value, now_utc)

    return parsed_naive.replace(tzinfo=cairo_tz).astimezone(timezone.utc)


def extract_external_id(article_url: str) -> str | None:
    match = re.search(r"/news/(\d{4,})/", article_url)
    return match.group(1) if match else None


def extract_symbol_from_article(article_doc) -> str | None:
    for link_node in article_doc.css('a[href*="/markets/EGX/stocks/"]'):
        href = (link_node.attrib.get("href") or "").strip()
        if not href:
            continue
        # Examples:
        # /markets/EGX/stocks/EXPA_r1
        # /markets/EGX/stocks/EXPA
        token = href.rstrip("/").split("/")[-1].upper()
        token = re.sub(r"_R\d+$", "", token)
        token = re.sub(r"_.*$", "", token)
        token = re.sub(r"[^A-Z0-9]", "", token)
        if token:
            return token
    return None


def dedupe_keep_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def extract_article_body(article_doc) -> str:
    candidates = (
        article_doc.css(".article__content-text")
        or article_doc.css(".mi-article__content")
        or article_doc.css(".mi-article__body")
    )
    if not candidates:
        return ""

    noise_prefixes = (
        "this news story is part of mubasher exclusive services",
        "before it's here it's on decypha",
    )

    blocks: list[str] = []

    for container in candidates:
        paragraphs = container.css("p")
        if paragraphs:
            for p in paragraphs:
                text = clean_text(p.get_all_text())
                if not text:
                    continue
                lowered = text.lower()
                if any(lowered.startswith(prefix) for prefix in noise_prefixes):
                    continue
                if lowered in ("click here", "learn more"):
                    continue
                blocks.append(text)
        else:
            text = clean_text(container.get_all_text())
            if text:
                blocks.append(text)

    blocks = dedupe_keep_order(blocks)

    # Keep a strong body signal only.
    blocks = [
        text
        for text in blocks
        if len(text) >= 25 and not re.fullmatch(r"[A-Z0-9_]{2,12}", text)
    ]

    return "\n\n".join(blocks).strip()


class MubasherEgxNewsScraper:
    def __init__(self, timeout: int, now_utc: datetime):
        self.timeout = timeout
        self.now_utc = now_utc
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
        # `verify=False` is required in this environment due cert chain issues.
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True,
                    verify=False,
                )
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
        for node in doc.css(".mi-article-media-block"):
            title_node = node.css("a.mi-article-media-block__title")
            image_anchor = node.css("a.mi-article-media-block__image-url")
            date_node = node.css(".mi-article-media-block__date")
            image_node = node.css(".mi-article-media-block__image img") or node.css("img")

            href = None
            if title_node and title_node[0].attrib.get("href"):
                href = title_node[0].attrib.get("href")
            elif image_anchor and image_anchor[0].attrib.get("href"):
                href = image_anchor[0].attrib.get("href")

            if not href:
                continue

            full_url = urljoin(str(doc.url), href)
            if "/news/" not in full_url:
                continue

            title = clean_text(title_node[0].text) if title_node else None
            listing_date_text = clean_text(date_node[0].text) if date_node else None
            image_url = None
            if image_node:
                image_url = normalize_image_url(
                    image_node[0].attrib.get("src") or image_node[0].attrib.get("data-src")
                )

            cards.append(
                ListingCard(
                    url=full_url,
                    title=title,
                    image_url=image_url,
                    listing_date_text=listing_date_text,
                    listing_date_utc=parse_listing_datetime_to_utc(listing_date_text, self.now_utc),
                )
            )

        # Dedupe by URL preserving order.
        deduped: list[ListingCard] = []
        seen: set[str] = set()
        for card in cards:
            if card.url in seen:
                continue
            seen.add(card.url)
            deduped.append(card)
        return deduped

    def extract_article(self, card: ListingCard) -> ArticleRecord | None:
        doc, status, _ = self.fetch(card.url)
        if doc is None or status != 200:
            logger.warning("Article fetch failed: %s (%s)", card.url, status)
            return None

        title_node = doc.css("h1")
        title = clean_text(title_node[0].text) if title_node else clean_text(card.title)
        if not title:
            logger.debug("Skipping article with empty title: %s", card.url)
            return None

        time_node = doc.css("time")
        published_raw = clean_text(time_node[0].text) if time_node else card.listing_date_text
        published_at = parse_article_datetime_to_utc(published_raw, self.now_utc)

        image_meta = doc.css('meta[property="og:image"]')
        image_url = None
        if image_meta:
            image_url = normalize_image_url(image_meta[0].attrib.get("content"))
        if not image_url:
            main_image = doc.css(".mi-article__main-image img") or doc.css("article img")
            if main_image:
                image_url = normalize_image_url(
                    main_image[0].attrib.get("src") or main_image[0].attrib.get("data-src")
                )
        if not image_url:
            image_url = card.image_url

        body = extract_article_body(doc)

        return ArticleRecord(
            url=card.url,
            headline=title,
            image_url=image_url,
            published_at=published_at,
            published_date_raw=published_raw or None,
            article_body=body,
            external_id=extract_external_id(card.url),
            source_section=SOURCE_SECTION,
            source_country=SOURCE_COUNTRY,
            symbol=extract_symbol_from_article(doc),
        )


async def ensure_market_news_schema(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        ALTER TABLE market_news
            ADD COLUMN IF NOT EXISTS article_body TEXT,
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS published_date_raw TEXT,
            ADD COLUMN IF NOT EXISTS source_section VARCHAR(100),
            ADD COLUMN IF NOT EXISTS source_country VARCHAR(10),
            ADD COLUMN IF NOT EXISTS external_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        """
    )
    await conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_market_news_source_section_published
        ON market_news (source_country, source_section, published_at DESC);
        """
    )


async def load_known_symbols(conn: asyncpg.Connection) -> set[str]:
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'EGX'")
    return {str(row["symbol"]).upper() for row in rows}


def resolve_symbol_for_db(raw_symbol: str | None, known_symbols: set[str]) -> str | None:
    if not raw_symbol:
        return None
    symbol = raw_symbol.upper().strip()
    if symbol in known_symbols:
        return symbol

    # Common mapping fallback, e.g. symbols that may carry suffixes.
    symbol = re.sub(r"_R\d+$", "", symbol)
    symbol = re.sub(r"_.*$", "", symbol)
    if symbol in known_symbols:
        return symbol

    return None


async def upsert_articles(
    conn: asyncpg.Connection,
    records: list[ArticleRecord],
    known_symbols: set[str],
) -> tuple[int, int]:
    if not records:
        return 0, 0

    urls = [record.url for record in records]
    existing_rows = await conn.fetch("SELECT url FROM market_news WHERE url = ANY($1::text[])", urls)
    existing_urls = {row["url"] for row in existing_rows}

    insert_count = 0
    update_count = 0

    for record in records:
        db_symbol = resolve_symbol_for_db(record.symbol, known_symbols)

        if record.url in existing_urls:
            update_count += 1
        else:
            insert_count += 1

        await conn.execute(
            """
            INSERT INTO market_news (
                symbol, headline, source, url, published_at, sentiment_score, created_at,
                article_body, image_url, published_date_raw, source_section, source_country, external_id, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, 0, NOW(),
                $6, $7, $8, $9, $10, $11, NOW()
            )
            ON CONFLICT (url) DO UPDATE SET
                symbol = COALESCE(EXCLUDED.symbol, market_news.symbol),
                headline = EXCLUDED.headline,
                source = EXCLUDED.source,
                published_at = COALESCE(EXCLUDED.published_at, market_news.published_at),
                article_body = COALESCE(NULLIF(EXCLUDED.article_body, ''), market_news.article_body),
                image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), market_news.image_url),
                published_date_raw = COALESCE(EXCLUDED.published_date_raw, market_news.published_date_raw),
                source_section = EXCLUDED.source_section,
                source_country = EXCLUDED.source_country,
                external_id = COALESCE(EXCLUDED.external_id, market_news.external_id),
                updated_at = NOW()
            """,
            db_symbol,
            record.headline,
            SOURCE_NAME,
            record.url,
            record.published_at,
            record.article_body,
            record.image_url,
            record.published_date_raw,
            record.source_section,
            record.source_country,
            record.external_id,
        )

    return insert_count, update_count


async def query_quality_metrics(
    conn: asyncpg.Connection, cutoff_utc: datetime
) -> dict[str, int]:
    row = await conn.fetchrow(
        """
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE headline IS NOT NULL AND LENGTH(TRIM(headline)) > 0)::int AS with_title,
            COUNT(*) FILTER (WHERE published_at IS NOT NULL)::int AS with_date,
            COUNT(*) FILTER (WHERE image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0)::int AS with_image,
            COUNT(*) FILTER (WHERE article_body IS NOT NULL AND LENGTH(TRIM(article_body)) > 0)::int AS with_body
        FROM market_news
        WHERE source = $1
          AND source_country = $2
          AND source_section = $3
          AND published_at >= $4
        """,
        SOURCE_NAME,
        SOURCE_COUNTRY,
        SOURCE_SECTION,
        cutoff_utc,
    )
    return dict(row or {})


def within_cutoff(value: datetime | None, cutoff_utc: datetime) -> bool:
    if value is None:
        return False
    return value >= cutoff_utc


async def run(args: argparse.Namespace) -> None:
    load_runtime_env()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Put it in environment or .env.")

    now_utc = datetime.now(timezone.utc)
    cutoff_utc = now_utc - timedelta(days=args.days)
    logger.info("Cutoff UTC: %s", cutoff_utc.isoformat())

    scraper = MubasherEgxNewsScraper(timeout=args.timeout, now_utc=now_utc)

    all_cards: list[ListingCard] = []
    seen_urls: set[str] = set()
    reached_cutoff = False

    for page in range(1, args.max_pages + 1):
        list_url = args.base_url if page == 1 else f"{args.base_url}/{page}"
        cards = scraper.extract_listing_cards(list_url)
        logger.info("Listing page %s -> %s cards", page, len(cards))

        if not cards:
            break

        oldest_on_page = None
        for card in cards:
            if card.url in seen_urls:
                continue
            seen_urls.add(card.url)
            all_cards.append(card)
            if card.listing_date_utc and (oldest_on_page is None or card.listing_date_utc < oldest_on_page):
                oldest_on_page = card.listing_date_utc

        if oldest_on_page and oldest_on_page < cutoff_utc:
            reached_cutoff = True
            # We intentionally include this page to avoid dropping boundary records.
            break

    logger.info("Collected %s unique listing URLs", len(all_cards))
    if reached_cutoff:
        logger.info("Listing crawl stopped after reaching cutoff window.")

    article_records: list[ArticleRecord] = []
    skipped_old = 0
    failed_articles = 0

    for idx, card in enumerate(all_cards, start=1):
        record = scraper.extract_article(card)
        if record is None:
            failed_articles += 1
            continue

        if not within_cutoff(record.published_at, cutoff_utc):
            skipped_old += 1
            continue

        if not record.article_body:
            logger.debug("Empty article body for %s", record.url)

        article_records.append(record)
        if idx % 20 == 0:
            logger.info("Processed %s/%s article URLs", idx, len(all_cards))

    logger.info(
        "Articles in-window: %s | skipped_old: %s | failed: %s",
        len(article_records),
        skipped_old,
        failed_articles,
    )

    if args.dry_run:
        with_title = sum(1 for r in article_records if r.headline)
        with_date = sum(1 for r in article_records if r.published_at)
        with_image = sum(1 for r in article_records if r.image_url)
        with_body = sum(1 for r in article_records if r.article_body)
        logger.info(
            "DRY RUN metrics -> title:%s date:%s image:%s body:%s total:%s",
            with_title,
            with_date,
            with_image,
            with_body,
            len(article_records),
        )
        return

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
            inserted, updated = await upsert_articles(conn, article_records, known_symbols)
            metrics = await query_quality_metrics(conn, cutoff_utc)

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
