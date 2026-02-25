"""
News Handler - deterministic stock news retrieval from market_news.
"""

from __future__ import annotations

import html
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import asyncpg


DEFAULT_NEWS_WINDOW_DAYS = 30
MAX_NEWS_ITEMS = 20
SUMMARY_MAX_CHARS = 320
NARRATIVE_HEADLINES = 3

_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")
_LEADING_CITY_RE = re.compile(r"^\s*(?:cairo|egypt|dubai|riyadh|abu dhabi|kuwait)\s*[-–—:]\s*", re.IGNORECASE)
_LEADING_SOURCE_RE = re.compile(
    r"^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya|reuters|bloomberg)\s*[-–—:]\s*",
    re.IGNORECASE,
)


def _clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    text = html.unescape(str(value))
    text = _TAG_RE.sub(" ", text)
    text = text.replace("\u00a0", " ")
    text = _SPACE_RE.sub(" ", text).strip()
    return text


def _strip_source_prefix(value: Optional[str]) -> str:
    text = _clean_text(value)
    if not text:
        return ""

    # Handle stacked prefixes like: "Cairo - Mubasher: ..."
    for _ in range(3):
        updated = _LEADING_CITY_RE.sub("", text)
        updated = _LEADING_SOURCE_RE.sub("", updated)
        updated = updated.strip(" :-\u2013\u2014\t")
        if updated == text:
            break
        text = updated
    return text


def _clip_text(value: str, max_chars: int) -> str:
    clean = _clean_text(value)
    if len(clean) <= max_chars:
        return clean
    return f"{clean[:max_chars].rstrip()}..."


def _build_item_summary(article_body: Optional[str], headline: str) -> str:
    body = _strip_source_prefix(article_body)
    if body:
        return _clip_text(body, SUMMARY_MAX_CHARS)
    return _clip_text(headline, 180)


def _format_item_date(published_at: Any, published_date_raw: Optional[str]) -> Optional[str]:
    if isinstance(published_at, datetime):
        return published_at.strftime("%Y-%m-%d %H:%M")
    raw = _clean_text(published_date_raw)
    return raw or None


def _to_iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


async def _fetch_market_news_rows(
    conn: asyncpg.Connection,
    *,
    symbol: str,
    limit: int,
    window_days: Optional[int],
) -> List[asyncpg.Record]:
    # Primary query on the canonical market_news schema.
    try:
        return await conn.fetch(
            """
            SELECT
                id,
                headline,
                source,
                url,
                published_at,
                article_body,
                image_url,
                published_date_raw,
                source_country,
                created_at
            FROM market_news
            WHERE symbol = $1
              AND (source_country = 'EG' OR source_country IS NULL)
              AND (
                    $2::int IS NULL
                    OR COALESCE(published_at, created_at) >= NOW() - ($2 * INTERVAL '1 day')
              )
            ORDER BY COALESCE(published_at, created_at) DESC, id DESC
            LIMIT $3
            """,
            symbol,
            window_days,
            limit,
        )
    except Exception:
        # Backward-compatibility fallback for environments where extended columns are missing.
        return await conn.fetch(
            """
            SELECT id, headline, source, url, published_at
            FROM market_news
            WHERE symbol = $1
              AND (
                    $2::int IS NULL
                    OR published_at >= NOW() - ($2 * INTERVAL '1 day')
              )
            ORDER BY published_at DESC NULLS LAST, id DESC
            LIMIT $3
            """,
            symbol,
            window_days,
            limit,
        )


def _build_news_brief(
    *,
    symbol: str,
    name: str,
    items: List[Dict[str, Any]],
    language: str,
    window_days: int,
) -> str:
    if language == "ar":
        lines = [
            f"ملخص أخبار السوق المصري لـ {symbol} ({name})",
            f"النطاق الزمني: آخر {window_days} يوم",
            "",
        ]
        for idx, item in enumerate(items[:NARRATIVE_HEADLINES], start=1):
            lines.append(f"{idx}. {item.get('title', '')}")
            if item.get("summary"):
                lines.append(f"   {item['summary']}")
            if item.get("date"):
                lines.append(f"   تاريخ النشر: {item['date']}")
        lines.extend(["", "افتح أي خبر بالأسفل لقراءة المقال الكامل داخل المنصة."])
        return "\n".join(lines).strip()

    lines = [
        f"Egypt Market News Brief for {symbol} ({name})",
        f"Coverage window: last {window_days} days",
        "",
    ]
    for idx, item in enumerate(items[:NARRATIVE_HEADLINES], start=1):
        lines.append(f"{idx}. {item.get('title', '')}")
        if item.get("summary"):
            lines.append(f"   {item['summary']}")
        if item.get("date"):
            lines.append(f"   Published: {item['date']}")
    lines.extend(["", "Open any headline below to read the full article inside the platform."])
    return "\n".join(lines).strip()


async def handle_news(
    conn: asyncpg.Connection,
    symbol: str,
    limit: int = 10,
    language: str = "en",
) -> Dict[str, Any]:
    """Handle stock news requests from market_news with deterministic summaries."""
    normalized_symbol = str(symbol).upper().strip()
    capped_limit = max(1, min(int(limit or 10), MAX_NEWS_ITEMS))

    ticker = await conn.fetchrow(
        "SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1",
        normalized_symbol,
    )
    if not ticker:
        return {
            "success": False,
            "message": f"Symbol {normalized_symbol} not found.",
            "cards": [],
            "actions": [],
        }

    name = ticker["name_ar"] if language == "ar" else ticker["name_en"]
    rows = await _fetch_market_news_rows(
        conn,
        symbol=normalized_symbol,
        limit=capped_limit,
        window_days=DEFAULT_NEWS_WINDOW_DAYS,
    )

    # Graceful fallback: if strict 30D window has no rows, surface latest available.
    if not rows:
        rows = await _fetch_market_news_rows(
            conn,
            symbol=normalized_symbol,
            limit=capped_limit,
            window_days=None,
        )

    if not rows:
        msg = (
            f"No recent Egypt market news found for {name} ({normalized_symbol})."
            if language == "en"
            else f"لا توجد أخبار حديثة للسوق المصري لـ {name} ({normalized_symbol})."
        )
        return {
            "success": True,
            "message": msg,
            "conversational_text": msg,
            "cards": [],
            "actions": _get_fallback_actions(normalized_symbol),
            "meta": {
                "news_window_days": DEFAULT_NEWS_WINDOW_DAYS,
                "news_count": 0,
                "symbol": normalized_symbol,
            },
        }

    news_items: List[Dict[str, Any]] = []
    with_image = 0
    with_body = 0

    for row in rows:
        raw_headline = row.get("headline")
        title = _strip_source_prefix(raw_headline) or _clean_text(raw_headline) or "Untitled Article"
        summary = _build_item_summary(row.get("article_body"), title)
        date_label = _format_item_date(row.get("published_at"), row.get("published_date_raw"))
        article_id = row.get("id")
        internal_path = f"/news/{article_id}" if article_id else "/news"
        image_url = _clean_text(row.get("image_url")) or None

        if image_url:
            with_image += 1
        if _clean_text(row.get("article_body")):
            with_body += 1

        news_items.append(
            {
                "id": article_id,
                "title": title,
                "date": date_label,
                "summary": summary,
                "url": internal_path,
                "internal_path": internal_path,
                "image_url": image_url,
                "published_at": _to_iso(row.get("published_at")),
            }
        )

    conversational_text = _build_news_brief(
        symbol=normalized_symbol,
        name=name,
        items=news_items,
        language=language,
        window_days=DEFAULT_NEWS_WINDOW_DAYS,
    )
    msg = (
        f"Egypt Market News for {name} ({normalized_symbol})"
        if language == "en"
        else f"أخبار السوق المصري لـ {name} ({normalized_symbol})"
    )

    return {
        "success": True,
        "message": msg,
        "conversational_text": conversational_text,
        "cards": [
            {
                "type": "stock_header",
                "data": {
                    "symbol": normalized_symbol,
                    "name": name,
                    "currency": ticker["currency"],
                },
            },
            {
                "type": "news_list",
                "title": "Egypt Market News" if language == "en" else "أخبار السوق المصري",
                "data": {
                    "items": news_items,
                    "window_days": DEFAULT_NEWS_WINDOW_DAYS,
                    "coverage": {
                        "total": len(news_items),
                        "with_image": with_image,
                        "with_body": with_body,
                    },
                },
            },
        ],
        "actions": _get_fallback_actions(normalized_symbol),
        "meta": {
            "news_window_days": DEFAULT_NEWS_WINDOW_DAYS,
            "news_count": len(news_items),
            "with_image": with_image,
            "with_body": with_body,
            "symbol": normalized_symbol,
        },
    }


def _get_fallback_actions(symbol: str) -> List[Dict[str, Any]]:
    """Return standard actions when no news is found."""
    return [
        {
            "label": "📈 Chart",
            "label_ar": "📈 الرسم البياني",
            "action_type": "query",
            "payload": f"Chart {symbol}",
        },
        {
            "label": "💰 Financials",
            "label_ar": "💰 القوائم المالية",
            "action_type": "query",
            "payload": f"{symbol} financials",
        },
        {
            "label": "💵 Dividends",
            "label_ar": "💵 التوزيعات",
            "action_type": "query",
            "payload": f"{symbol} dividends",
        },
    ]
