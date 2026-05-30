#!/usr/bin/env python3
"""Run all EGX news scrapers (Mubasher + Zawya + ArabFinance) and report coverage."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import asyncpg

from egx_news_shared import load_runtime_env, setup_logging


logger = logging.getLogger("egx-multisource-news")


@dataclass
class SourceJob:
    name: str
    script_name: str
    language: str


SOURCE_JOBS = [
    SourceJob(name="Mubasher EN", script_name="scrape_mubasher_egx_news_scrapling.py", language="en"),
    SourceJob(name="Zawya EN", script_name="scrape_zawya_egx_news_scrapling.py", language="en"),
    SourceJob(name="ArabFinance EN", script_name="scrape_arabfinance_egx_news_scrapling.py", language="en"),
    SourceJob(name="Enterprise EN", script_name="scrape_enterprise_egx_news_scrapling.py", language="en"),
    SourceJob(name="Mubasher AR", script_name="scrape_mubasher_egx_news_scrapling.py", language="ar"),
    SourceJob(name="ArabFinance AR", script_name="scrape_arabfinance_egx_news_scrapling.py", language="ar"),
    SourceJob(name="Enterprise AR", script_name="scrape_enterprise_egx_news_scrapling.py", language="ar"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run all EGX news source scrapers and aggregate quality metrics."
    )
    parser.add_argument("--days", type=int, default=30, help="Backfill window in days.")
    parser.add_argument(
        "--timeout",
        type=int,
        default=45,
        help="HTTP timeout in seconds for each source script.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run scrapers without DB upsert.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logs.",
    )
    return parser.parse_args()


def run_source_job(job: SourceJob, args: argparse.Namespace, script_dir: str) -> tuple[bool, str]:
    script_path = os.path.join(script_dir, job.script_name)
    command = [
        sys.executable,
        script_path,
        "--days",
        str(args.days),
        "--timeout",
        str(args.timeout),
    ]
    if job.script_name != "scrape_zawya_egx_news_scrapling.py":
        command.extend(["--language", job.language])
    if args.dry_run:
        command.append("--dry-run")
    if args.verbose:
        command.append("--verbose")

    logger.info("Running %s scraper...", job.name)
    proc = subprocess.run(command, capture_output=True, text=True)
    combined_output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")

    if proc.returncode != 0:
        logger.error("%s scraper failed (exit=%s)", job.name, proc.returncode)
        return False, combined_output.strip()

    logger.info("%s scraper succeeded.", job.name)
    return True, combined_output.strip()


async def report_combined_metrics(days: int) -> None:
    load_runtime_env()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL not available; skipping combined coverage query.")
        return

    cutoff_utc = datetime.now(timezone.utc) - timedelta(days=days)

    conn = await asyncpg.connect(dsn=database_url, ssl="require", statement_cache_size=0)
    try:
        source_rows = await conn.fetch(
            """
            SELECT
                source,
                content_language,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE headline IS NOT NULL AND LENGTH(TRIM(headline)) > 0)::int AS with_title,
                COUNT(*) FILTER (WHERE published_at IS NOT NULL)::int AS with_date,
                COUNT(*) FILTER (WHERE image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0)::int AS with_image,
                COUNT(*) FILTER (WHERE article_body IS NOT NULL AND LENGTH(TRIM(article_body)) > 0)::int AS with_body
            FROM market_news
            WHERE source_country = 'EG'
              AND source IN ('Mubasher', 'Zawya', 'ArabFinance')
              AND published_at >= $1
            GROUP BY source, content_language
            ORDER BY content_language, source
            """,
            cutoff_utc,
        )

        total_row = await conn.fetchrow(
            """
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE headline IS NOT NULL AND LENGTH(TRIM(headline)) > 0)::int AS with_title,
                COUNT(*) FILTER (WHERE published_at IS NOT NULL)::int AS with_date,
                COUNT(*) FILTER (WHERE image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0)::int AS with_image,
                COUNT(*) FILTER (WHERE article_body IS NOT NULL AND LENGTH(TRIM(article_body)) > 0)::int AS with_body
            FROM market_news
            WHERE source_country = 'EG'
              AND source IN ('Mubasher', 'Zawya', 'ArabFinance')
              AND published_at >= $1
            """,
            cutoff_utc,
        )

        logger.info("Per-source coverage last %s days:", days)
        for row in source_rows:
            logger.info(
                "%s [%s] -> total:%s title:%s date:%s image:%s body:%s",
                row["source"],
                row["content_language"],
                row["total"],
                row["with_title"],
                row["with_date"],
                row["with_image"],
                row["with_body"],
            )

        if total_row:
            logger.info(
                "Combined coverage last %s days -> total:%s title:%s date:%s image:%s body:%s",
                days,
                total_row["total"],
                total_row["with_title"],
                total_row["with_date"],
                total_row["with_image"],
                total_row["with_body"],
            )
    finally:
        await conn.close()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)

    script_dir = os.path.dirname(os.path.abspath(__file__))

    failures: list[tuple[str, str]] = []
    for job in SOURCE_JOBS:
        ok, output = run_source_job(job, args, script_dir)
        if output:
            # Keep output in logs for audit/debug without flooding line by line.
            logger.info("%s output (tail):\n%s", job.name, output[-2200:])
        if not ok:
            failures.append((job.name, output[-2200:] if output else "No output"))

    if failures:
        for name, tail in failures:
            logger.error("Failure detail [%s]:\n%s", name, tail)
        raise SystemExit(1)

    if not args.dry_run:
        asyncio.run(report_combined_metrics(args.days))


if __name__ == "__main__":
    main()
