#!/usr/bin/env python3
"""
Scrape EGX news from Enterprise Egypt using Scrapling and upsert into market_news.
Strict brand anonymity is enforced by regex-cleaning headlines and article bodies before saving.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import re
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import asyncpg
import requests
import urllib3
from scrapling import Selector

# Defensive import path configuration
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from egx_news_shared import (
    ArticleRecord,
    load_runtime_env,
    setup_logging,
    clean_text,
    normalize_image_url,
    within_cutoff,
    ensure_market_news_schema,
    load_known_symbols,
    resolve_symbol_for_db,
    upsert_articles,
    query_quality_metrics,
    cutoff_from_days,
    parse_iso_datetime,
    parse_datetime_with_formats,
    extract_symbol_from_text
)

# Target Feeds
FEEDS_EN = [
    "https://enterpriseam.com/egypt-en/category/business/",
    "https://enterpriseam.com/egypt-en/category/investment/",
    "https://enterpriseam.com/egypt-en/category/ipos/",
    "https://enterpriseam.com/egypt-en/category/ma/",
    "https://enterpriseam.com/egypt-en/category/debt/",
    "https://enterpriseam.com/egypt-en/category/privatization/",
    "https://enterpriseam.com/egypt-en/category/economy/"
]

FEEDS_AR = [
    "https://enterpriseam.com/egypt-ar/%d8%a3%d8%b9%d9%85%d8%a7%d9%84/",
    "https://enterpriseam.com/egypt-ar/category/%D8%A7%D8%B3%D8%AA%D8%AB%D9%85%D8%A7%D8%B1/",
    "https://enterpriseam.com/egypt-ar/category/%D8%B7%D8%B1%D9%88%D8%AD%D8%A7%D8%AA/",
    "https://enterpriseam.com/egypt-ar/category/%D8%AF%D9%85%D8%AC-%D9%88%D8%A7%D8%B3%D8%AA%D8%AD%D9%88%D8%A7%D8%B0/",
    "https://enterpriseam.com/egypt-ar/category/%D8%AF%D9%8A%D9%88%D9%86/",
    "https://enterpriseam.com/egypt-ar/category/%D8%B7%D8%B1%D9%88%D8%AD%D8%A7%D8%AA-%D8%AD%D9%83%D9%88%D9%85%D9%8a%D8%a9/",
    "https://enterpriseam.com/egypt-ar/category/%D8%A7%D9%82%D8%aa%D8%b5%D8%a7%D8%af/"
]

SOURCE_NAME = "Enterprise"
SOURCE_COUNTRY = "EG"
DEFAULT_DAYS = 30
DEFAULT_TIMEOUT = 45

logger = logging.getLogger("enterprise-egx-news")
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Enterprise EGX news and upsert into market_news."
    )
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS, help="Backfill window in days.")
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="HTTP timeout in seconds for each request.",
    )
    parser.add_argument(
        "--language",
        choices=["en", "ar"],
        default="en",
        help="Content language to scrape.",
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


def clean_brand_traces(text: str) -> str:
    """
    Strips out any mentions of the brand name in English and Arabic
    to enforce strict source anonymity.
    """
    if not text:
        return ""
    
    # English brand mentions
    text = re.sub(r"\bEnterprise\s*Egypt\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bEnterprise\s*AM\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bEnterpriseAM\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bEnterprise\b", "", text, flags=re.IGNORECASE)
    
    # Arabic brand mentions
    text = re.sub(r"إنتربرايز\s*مصر", "", text)
    text = re.sub(r"انتربرايز\s*مصر", "", text)
    text = re.sub(r"إنتربرايز", "", text)
    text = re.sub(r"انتربرايز", "", text)
    
    # Clean up double spacing and dangling separators
    text = re.sub(r"\s*-\s*$", "", text).strip()
    text = re.sub(r"^\s*-\s*", "", text).strip()
    return re.sub(r"\s+", " ", text).strip()


def derive_source_section_path(url: str, lang: str) -> str:
    """
    Derives standard section representation from Enterprise URL path
    """
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    parts = path.split("/")
    
    # Remove lang prefix if any from section
    if parts and parts[0] in {"egypt-en", "egypt-ar", "egypt"}:
        parts = parts[1:]
        
    section = "main"
    if parts:
        if parts[0] == "category" and len(parts) > 1:
            section = parts[1]
        else:
            section = parts[0]
            
    suffix = "/ar" if lang == "ar" else ""
    return f"enterprise/{section}{suffix}"


def parse_wordpress_date(dt_str: str | None, raw_text: str | None) -> datetime | None:
    """
    Attempts to parse datetime from Enterprise WordPress articles
    """
    if dt_str:
        parsed = parse_iso_datetime(dt_str)
        if parsed:
            return parsed
            
    if not raw_text:
        return None
        
    # Attempt list of standard formats
    formats = [
        "%d %B %Y",
        "%d %b %Y",
        "%Y-%m-%d",
    ]
    return parse_datetime_with_formats(raw_text, formats, assume_cairo_tz=True)


class EnterpriseNewsScraper:
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

    def fetch(self, url: str) -> Selector | None:
        for attempt in range(1, 4):
            try:
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True,
                    verify=False,
                )
                if response.status_code != 200:
                    logger.warning("Fetch failed (%s): %s", response.status_code, url)
                    return None
                return Selector(content=response.text, url=response.url)
            except Exception as exc:
                if attempt < 3:
                    time.sleep(1)
                    continue
                logger.warning("Fetch error: %s (%s)", url, exc)
        return None

    def extract_listing_urls(self, list_url: str) -> list[str]:
        doc = self.fetch(list_url)
        if not doc:
            return []

        urls: list[str] = []
        # Gather all article links inside WordPress listing grid
        for node in doc.css("article a"):
            href = node.attrib.get("href")
            if not href:
                continue
            full_url = urljoin(str(doc.url), href)
            # WordPress structure for articles contains years: /202...
            # CRITICAL: Filter to only include articles on our target Enterprise domain!
            parsed_url = urlparse(full_url)
            if "/202" in full_url and "enterpriseam.com" in parsed_url.netloc and full_url not in urls:
                urls.append(full_url)
                
        return urls

    def extract_article(self, url: str, section_name: str, lang: str) -> ArticleRecord | None:
        doc = self.fetch(url)
        if not doc:
            return None

        # Headline
        title_node = doc.css("h1")
        title = clean_text(title_node[0].get_all_text()) if title_node else ""
        if not title:
            return None
            
        title = clean_brand_traces(title)

        # Date
        time_tag = doc.css("time")
        published_raw = None
        published_at = None
        if time_tag:
            published_raw = clean_text(time_tag[0].get_all_text())
            dt_attr = time_tag[0].attrib.get("datetime")
            published_at = parse_wordpress_date(dt_attr, published_raw)

        # Main Image
        image_url = None
        og_image = doc.css('meta[property="og:image"]')
        if og_image:
            image_url = normalize_image_url(og_image[0].attrib.get("content"))
        if not image_url:
            main_image = doc.css("article img, .entry-content img")
            if main_image:
                image_url = normalize_image_url(
                    main_image[0].attrib.get("src") or main_image[0].attrib.get("data-src")
                )

        # Article Body Paragraphs
        body_container = doc.css(".entry-content, .post-content, article")
        blocks: list[str] = []
        if body_container:
            for p in body_container[0].css("p"):
                text = clean_text(p.get_all_text())
                if text:
                    cleaned_p = clean_brand_traces(text)
                    if cleaned_p and len(cleaned_p) >= 20:
                        blocks.append(cleaned_p)

        # Deduplicate blocks preserving order
        seen_blocks = set()
        deduped_blocks = []
        for b in blocks:
            if b not in seen_blocks:
                seen_blocks.add(b)
                deduped_blocks.append(b)

        body = "\n\n".join(deduped_blocks).strip()

        # External ID is slug tail or hash of URL
        slug_tail = url.rstrip("/").split("/")[-1]
        external_id = slug_tail[:64]

        return ArticleRecord(
            url=url,
            headline=title,
            image_url=image_url,
            published_at=published_at,
            published_date_raw=published_raw,
            article_body=body,
            external_id=external_id,
            source=SOURCE_NAME,
            source_section=section_name,
            source_country=SOURCE_COUNTRY,
            content_language=lang,
            symbol=None  # Associated dynamically during ingestion
        )


async def run(args: argparse.Namespace) -> None:
    load_runtime_env()
    database_url = os.getenv("DATABASE_URL")
    if not database_url and not args.dry_run:
        raise RuntimeError("DATABASE_URL is not set. Put it in environment or .env.")

    now_utc = datetime.now(timezone.utc)
    cutoff_utc = cutoff_from_days(args.days)
    logger.info("Content Language: %s | Cutoff UTC: %s", args.language, cutoff_utc.isoformat())

    scraper = EnterpriseNewsScraper(timeout=args.timeout, now_utc=now_utc)
    feeds = FEEDS_AR if args.language == "ar" else FEEDS_EN

    all_article_urls: list[tuple[str, str]] = []  # List of (url, section_name)
    seen_urls = set()

    # Phase 1: Collect article listing cards across all categories
    for feed in feeds:
        section_path = derive_source_section_path(feed, args.language)
        logger.info("Scanning listing feed: %s (%s)", feed, section_path)
        urls = scraper.extract_listing_urls(feed)
        for u in urls:
            if u not in seen_urls:
                seen_urls.add(u)
                all_article_urls.append((u, section_path))

    logger.info("Collected %s unique Enterprise article URLs to inspect", len(all_article_urls))

    article_records: list[ArticleRecord] = []
    skipped_old = 0
    failed_articles = 0

    # Phase 2: Follow article urls to extract details
    for idx, (url, section_path) in enumerate(all_article_urls, start=1):
        record = scraper.extract_article(url, section_path, args.language)
        if record is None:
            failed_articles += 1
            continue

        if not within_cutoff(record.published_at, cutoff_utc):
            skipped_old += 1
            continue

        article_records.append(record)
        if idx % 10 == 0:
            logger.info("Parsed details for %s/%s articles", idx, len(all_article_urls))

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
        # Show first item sample for quality audit
        if article_records:
            sample = article_records[0]
            logger.info("=== DRY RUN SAMPLE ARTICLE ===")
            logger.info("URL: %s", sample.url)
            logger.info("Headline: %s", sample.headline)
            logger.info("Date: %s", sample.published_at)
            logger.info("Image: %s", sample.image_url)
            logger.info("Section: %s", sample.source_section)
            logger.info("Body Preview:\n%s", sample.article_body[:300] + "...")
        return

    # Phase 3: DB Upsert and Ticker Association
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
            
            # Dynamically associate tickers
            for record in article_records:
                # Scan both the headline and the body for EGX tickers
                search_text = f"{record.headline} {record.article_body}"
                record.symbol = extract_symbol_from_text(search_text, known_symbols)

            inserted, updated = await upsert_articles(conn, article_records, known_symbols)
            metrics = await query_quality_metrics(
                conn,
                cutoff_utc=cutoff_utc,
                source_country=SOURCE_COUNTRY,
                source_name=SOURCE_NAME,
                content_language=args.language
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
    finally:
        await pool.close()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
