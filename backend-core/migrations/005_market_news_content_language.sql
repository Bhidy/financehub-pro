ALTER TABLE market_news
    ADD COLUMN IF NOT EXISTS content_language VARCHAR(2) NOT NULL DEFAULT 'en';

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

CREATE INDEX IF NOT EXISTS idx_market_news_country_language_published
    ON market_news (source_country, content_language, published_at DESC);
