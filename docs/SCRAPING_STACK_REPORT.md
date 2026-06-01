# Scraping Stack Report (EGX News)

Last verified: 2026-03-08 (Africa/Cairo)

## 1) Executive Summary

The project's best installed and production-aligned scraping framework is **Scrapling** with a hybrid stack:
- `scrapling` for DOM selection
- `requests` for HTTP fetch
- `beautifulsoup4` for robust text extraction cleanup
- `asyncpg` for DB upsert into `market_news`
- `curl-cffi` and internal proxy fallback for anti-bot scenarios (notably Zawya)
- `playwright` available for dynamic/browser-heavy future scraping tasks

Current robustness status from live dry-runs:
- **Zawya**: robust and passing strict quality.
- **ArabFinance**: robust and passing strict quality.
- **Mubasher**: scraper code is present, but source returned HTTP 500 during test run, so source reliability is currently unstable.

## 2) Confirmed Installed Stack

Dependencies are declared in:
- `backend-core/requirements.txt`

Key packages:
- `scrapling==0.4`
- `beautifulsoup4`
- `requests`
- `lxml`
- `asyncpg`
- `playwright`
- `curl-cffi`

Important runtime note:
- `python3` runtime has full required modules installed and working.
- The active project runtime is `python3` from `/Users/home/Documents/startamarkets`; do not rely on old workspace virtualenv paths.

## 3) Main Scraper Components

Multi-source orchestrator:
- `backend-core/scripts/scrape_egx_multisource_news.py`

Source scrapers:
- `backend-core/scripts/scrape_mubasher_egx_news_scrapling.py`
- `backend-core/scripts/scrape_zawya_egx_news_scrapling.py`
- `backend-core/scripts/scrape_arabfinance_egx_news_scrapling.py`

Shared schema, quality, and DB upsert:
- `backend-core/scripts/egx_news_shared.py`

## 4) How It Works

1. Orchestrator runs all source scripts sequentially.
2. Each source scraper crawls listing pages, then article pages.
3. Extracted fields per article:
- title (`headline`)
- publication date (`published_at`)
- image (`image_url`)
- full content (`article_body`)
4. EGX relevance filters are applied (Egypt + stock/index intent filters).
5. Strict quality gate keeps only articles with all required fields:
- headline present
- published date present
- image present
- full body present
6. Records are upserted into `market_news` by unique `url`.
7. Coverage/quality metrics are logged after runs.

## 5) Scheduler Wiring

Automated job is already integrated in backend scheduler:
- Job id: `tier4c_egx_multisource_news_2h`
- Frequency: every 2 hours, minute 5 (Cairo timezone)
- Function: `run_egx_multisource_news_job`
- Script called: `backend-core/scripts/scrape_egx_multisource_news.py --days 30`

## 6) Verification Results (2026-03-08)

Dry-run command path used: `python3` (project root)

Results:
- `scrape_zawya_egx_news_scrapling.py --days 3 --max-pages 2 --dry-run`
  - in-window: 15
  - strict quality pass: 15/15 title, 15/15 date, 15/15 image, 15/15 body
- `scrape_arabfinance_egx_news_scrapling.py --days 3 --max-pages 2 --dry-run`
  - in-window: 8
  - strict quality pass: 8/8 title, 8/8 date, 8/8 image, 8/8 body
- `scrape_mubasher_egx_news_scrapling.py --days 3 --max-pages 2 --dry-run`
  - listing fetch returned HTTP 500 from source
  - no in-window records collected in this run

Conclusion:
- Best currently reliable EGX news ingestion path is **Zawya + ArabFinance**.
- Mubasher source should be treated as unstable until endpoint reliability recovers or fallback fetch is added.

## 7) Usage for Future AI Agent Tasks

Will it work in future tasks without re-installation?
- Yes, if the agent uses the same runtime (`python3`) where dependencies are already present.

Do you need to mention the stack each time?
- Not required for installation.
- Recommended for deterministic behavior: explicitly request the existing pipeline script.

Recommended task phrasing:
- "Use existing EGX multi-source scraper pipeline: `backend-core/scripts/scrape_egx_multisource_news.py`."

Recommended commands:
- Dry run:
  - `python3 backend-core/scripts/scrape_egx_multisource_news.py --days 30 --dry-run`
- Live run:
  - `python3 backend-core/scripts/scrape_egx_multisource_news.py --days 30`

If creating a project virtualenv for this repository, install:
- `backend-core/requirements.txt`
- source-specific scraper requirements when a task calls for them
