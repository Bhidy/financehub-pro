# EGX News Multi-Source Pipeline Plan

## Objective
Ingest last 30 days of Egypt stock/index news (full article, image, title, date) from:
- Mubasher EGX stocks
- Zawya North Africa (Egypt stock/index subset)
- ArabFinance category 2 (Egypt stock/index subset)

Then publish to `/news` using internal article pages.

## Components
- `scrape_mubasher_egx_news_scrapling.py`
- `scrape_zawya_egx_news_scrapling.py`
- `scrape_arabfinance_egx_news_scrapling.py`
- `scrape_egx_multisource_news.py` (orchestrator)
- `egx_news_shared.py` (shared schema/upsert/quality helpers)

## Scheduler
- Backend scheduler job runs every 2 hours (`minute=5`) via:
  - `SchedulerService.run_egx_multisource_news_job`
  - Calls `backend-core/scripts/scrape_egx_multisource_news.py --days 30`

## Data Quality Rules
Only records are stored when all are present:
- `headline`
- `published_at`
- `image_url`
- `article_body`

Also filtered to Egypt stock/index relevance per source.

## Manual Run Commands
```bash
python3 backend-core/scripts/scrape_egx_multisource_news.py --days 30
python3 backend-core/scripts/scrape_egx_multisource_news.py --days 30 --dry-run
```

## Verification Queries
```sql
SELECT source,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE headline IS NOT NULL AND LENGTH(TRIM(headline)) > 0) AS with_title,
       COUNT(*) FILTER (WHERE published_at IS NOT NULL) AS with_date,
       COUNT(*) FILTER (WHERE image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0) AS with_image,
       COUNT(*) FILTER (WHERE article_body IS NOT NULL AND LENGTH(TRIM(article_body)) > 0) AS with_body
FROM market_news
WHERE source_country='EG'
  AND source IN ('Mubasher','Zawya','ArabFinance')
  AND published_at >= NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY source;
```

## Frontend Consumption
- `/news` now fetches by `source_country=EG` + day window (no single-source restriction).
- `/news/[id]` loads article by id from same EG feed.
- Full article content is rendered internally (no external article redirect).
