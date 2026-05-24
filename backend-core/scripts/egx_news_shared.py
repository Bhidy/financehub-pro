#!/usr/bin/env python3
"""Shared utilities for EGX news scrapers."""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import asyncpg
from dotenv import load_dotenv


@dataclass
class ArticleRecord:
    url: str
    headline: str
    image_url: str | None
    published_at: datetime | None
    published_date_raw: str | None
    article_body: str
    external_id: str | None
    source: str
    source_section: str
    source_country: str
    content_language: str
    symbol: str | None


def load_runtime_env() -> None:
    """Load .env from common project locations if DATABASE_URL is missing."""
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


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def normalize_image_url(image_url: str | None) -> str | None:
    if not image_url:
        return None
    image_url = clean_text(image_url)
    if not image_url:
        return None
    if image_url.startswith("data:image"):
        return None
    if "facebook.com/tr" in image_url:
        return None
    return image_url


def dedupe_keep_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def get_cairo_tz() -> timezone | ZoneInfo:
    try:
        return ZoneInfo("Africa/Cairo")
    except Exception:
        return timezone.utc


def parse_datetime_with_formats(
    value: str | None,
    formats: Iterable[str],
    *,
    assume_cairo_tz: bool = True,
) -> datetime | None:
    value = clean_text(value)
    if not value:
        return None

    parsed_naive: datetime | None = None
    for fmt in formats:
        try:
            parsed_naive = datetime.strptime(value, fmt)
            break
        except ValueError:
            continue

    if parsed_naive is None:
        return None

    tz = get_cairo_tz() if assume_cairo_tz else timezone.utc
    return parsed_naive.replace(tzinfo=tz).astimezone(timezone.utc)


def parse_iso_datetime(value: str | None) -> datetime | None:
    value = clean_text(value)
    if not value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def extract_symbol_from_text(text: str, known_symbols: set[str]) -> str | None:
    if not text or not known_symbols:
        return None

    # Prefer 3-6 length uppercase tokens to reduce false positives.
    candidates = re.findall(r"\b[A-Z0-9]{3,6}\b", text.upper())
    for token in candidates:
        if token in known_symbols:
            return token

    # Fallback to 2-char symbols if needed.
    small_candidates = re.findall(r"\b[A-Z0-9]{2}\b", text.upper())
    for token in small_candidates:
        if token in known_symbols:
            return token
    return None


def within_cutoff(value: datetime | None, cutoff_utc: datetime) -> bool:
    if value is None:
        return False
    return value >= cutoff_utc


def extract_external_id_from_slug(article_url: str) -> str | None:
    path = urlparse(article_url).path.rstrip("/")
    if not path:
        return None
    slug = path.split("/")[-1]
    if not slug:
        return None
    if "-" in slug:
        tail = slug.split("-")[-1]
        if re.fullmatch(r"[a-z0-9]{6,12}", tail):
            return tail
    return None


def derive_source_section(article_url: str, source_prefix: str) -> str:
    path = urlparse(article_url).path.strip("/")
    if not path:
        return source_prefix
    parts = path.split("/")
    if parts and parts[0] in {"en", "ar"}:
        parts = parts[1:]
    if not parts:
        return source_prefix
    return f"{source_prefix}/{'/'.join(parts[:2])}"


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
            ADD COLUMN IF NOT EXISTS content_language VARCHAR(2) NOT NULL DEFAULT 'en',
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        """
    )
    await conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_market_news_source_section_published
        ON market_news (source_country, source_section, published_at DESC);

        CREATE INDEX IF NOT EXISTS idx_market_news_country_language_published
        ON market_news (source_country, content_language, published_at DESC);
        """
    )
    await conn.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'market_news_content_language_check'
            ) THEN
                ALTER TABLE market_news
                ADD CONSTRAINT market_news_content_language_check
                CHECK (content_language IN ('en', 'ar'));
            END IF;
        END $$;
        """
    )


async def load_known_symbols(conn: asyncpg.Connection) -> set[str]:
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'EGX'")
    return {str(row["symbol"]).upper() for row in rows if row.get("symbol")}


def resolve_symbol_for_db(raw_symbol: str | None, known_symbols: set[str]) -> str | None:
    if not raw_symbol:
        return None

    symbol = raw_symbol.upper().strip()
    if symbol in known_symbols:
        return symbol

    symbol = re.sub(r"_R\d+$", "", symbol)
    symbol = re.sub(r"_.*$", "", symbol)
    if symbol in known_symbols:
        return symbol

    symbol = re.sub(r"[^A-Z0-9]", "", symbol)
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
                article_body, image_url, published_date_raw, source_section, source_country,
                external_id, content_language, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, 0, NOW(),
                $6, $7, $8, $9, $10, $11, $12, NOW()
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
                content_language = EXCLUDED.content_language,
                updated_at = NOW()
            """,
            db_symbol,
            record.headline,
            record.source,
            record.url,
            record.published_at,
            record.article_body,
            record.image_url,
            record.published_date_raw,
            record.source_section,
            record.source_country,
            record.external_id,
            record.content_language,
        )

    return insert_count, update_count


async def query_quality_metrics(
    conn: asyncpg.Connection,
    *,
    cutoff_utc: datetime,
    source_country: str,
    source_name: str | None = None,
    content_language: str | None = None,
) -> dict[str, int]:
    params: list[object] = [source_country.upper(), cutoff_utc]
    predicate = "source_country = $1 AND published_at >= $2"

    if source_name:
        predicate += " AND source = $3"
        params.append(source_name)
    if content_language:
        params.append(content_language)
        predicate += f" AND content_language = ${len(params)}"

    row = await conn.fetchrow(
        f"""
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE headline IS NOT NULL AND LENGTH(TRIM(headline)) > 0)::int AS with_title,
            COUNT(*) FILTER (WHERE published_at IS NOT NULL)::int AS with_date,
            COUNT(*) FILTER (WHERE image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0)::int AS with_image,
            COUNT(*) FILTER (WHERE article_body IS NOT NULL AND LENGTH(TRIM(article_body)) > 0)::int AS with_body
        FROM market_news
        WHERE {predicate}
        """,
        *params,
    )
    return dict(row or {})


def sample_quality_snapshot(records: list[ArticleRecord]) -> dict[str, int]:
    return {
        "total": len(records),
        "with_title": sum(1 for r in records if bool(clean_text(r.headline))),
        "with_date": sum(1 for r in records if r.published_at is not None),
        "with_image": sum(1 for r in records if bool(clean_text(r.image_url))),
        "with_body": sum(1 for r in records if bool(clean_text(r.article_body))),
    }


def is_strict_quality_pass(record: ArticleRecord) -> bool:
    return bool(
        clean_text(record.headline)
        and record.published_at is not None
        and clean_text(record.image_url)
        and clean_text(record.article_body)
    )


def adaptive_sleep_seconds(page: int) -> float:
    # Slight backoff to reduce anti-bot risk during longer crawls.
    return 0.15 if page < 5 else min(0.4, 0.15 + (page - 4) * 0.02)


def cutoff_from_days(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)
