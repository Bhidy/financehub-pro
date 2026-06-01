# EGX Mubasher News Scraping Plan (Scrapling)

## Goal
Build and operate a stable pipeline that ingests Mubasher Egypt market news for the last 30 days (rolling), including:
- full article text
- article image URL
- article title
- article publication date

## Scope
- Source section: `https://english.mubasher.info/news/eg/pulse/stocks`
- Target table: `public.market_news`
- Deduplication key: `url` (existing unique constraint)
- Market focus: Egypt stock market (EGX context)

## Implementation
1. Runtime setup:
   - Install dependencies from `scripts/requirements_mubasher_news.txt`
2. Scraper:
   - Script: `backend-core/scripts/scrape_mubasher_egx_news_scrapling.py`
   - Uses `Scrapling Selector` parsing on fetched listing/article pages
   - Paginates `/2`, `/3`, ... until date cutoff reached
3. Extraction:
   - Listing page: article URL + fallback metadata
   - Article page: `h1` title, `time` date, `og:image`, full text paragraphs
4. DB write:
   - Upsert into `market_news` with `ON CONFLICT (url) DO UPDATE`
   - Auto-adds missing columns if absent:
     - `article_body`
     - `image_url`
     - `published_date_raw`
     - `source_section`
     - `source_country`
     - `external_id`
     - `updated_at`
5. QA metrics:
   - Records in last 30 days
   - Completeness rates for title/date/image/body
   - Missing-field audit query

## Runbook
1. Install:
   ```bash
   python3 -m pip install -r scripts/requirements_mubasher_news.txt
   ```
2. Dry run:
   ```bash
   python3 backend-core/scripts/scrape_mubasher_egx_news_scrapling.py --days 30 --dry-run
   ```
3. Live run:
   ```bash
   python3 backend-core/scripts/scrape_mubasher_egx_news_scrapling.py --days 30
   ```

## Scheduling
- Frequency: every 2 hours via APScheduler (`tier4c_egx_mubasher_news_2h`) in `backend-core/app/services/scheduler.py`.
- Suggested command:
  ```bash
  cd /Users/home/Documents/startamarkets && python3 backend-core/scripts/scrape_mubasher_egx_news_scrapling.py --days 30
  ```

## Monitoring & Alerts
- Alert if any of these conditions occur:
  - scraper fails
  - inserted + updated = 0 on two consecutive runs
  - completeness for image/body drops below 95%
  - max `published_at` age exceeds 8 hours

## Recovery Procedure
1. Rerun full backfill:
   - `--days 30 --max-pages 120`
2. If still low coverage:
   - increase timeout
   - rerun with `--verbose`
3. If source HTML changes:
   - update selectors in scraper and re-run backfill
