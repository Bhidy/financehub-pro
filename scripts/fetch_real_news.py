#!/usr/bin/env python3
"""
REAL-TIME NEWS AGGREGATOR
=========================
Fetches real financial news for the Saudi Market (Tadawul) using Google News RSS.
Provides the AI Analyst with up-to-date context.
"""

import asyncio
import asyncpg
import feedparser
import logging
import sys
from datetime import datetime
import time
from email.utils import parsedate_to_datetime

DATABASE_URL = "postgresql://postgres.kgjpkphfjmmiyjsgsaup:DgYNreqd4S7YLF6R@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Search terms to track
SEARCH_TOPICS = [
    "Saudi Stock Market",
    "Tadawul",
    "Saudi Aramco",
    "Al Rajhi Bank",
    "SABIC",
    "Saudi National Bank",
    "Saudi Telecom Company",
    "Riyad Bank",
    "Saudi Electricity",
    "Maaden",
    "Almarai",
    "Jarir Marketing",
    "ACWA Power",
    "Lucid Group Saudi",
    "PIF Saudi",
    "Saudi Vision 2030 Finance"
]

import requests

async def fetch_news_for_topic(topic):
    """Fetch RSS feed for a specific topic from Google News"""
    # Google News RSS URL for Saudi Arabia (English)
    encoded_topic = topic.replace(" ", "%20")
    rss_url = f"https://news.google.com/rss/search?q={encoded_topic}&hl=en-SA&gl=SA&ceid=SA:en"
    
    logger.info(f"Fetching news for: {topic}...")
    
    try:
        # Use requests with headers to emulate a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
        }
        
        # Run synchronous requests in executor
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: requests.get(rss_url, headers=headers, timeout=10))
        
        if response.status_code != 200:
            logger.warning(f"Failed to fetch {topic}: Status {response.status_code}")
            return []
            
        feed = feedparser.parse(response.content)
        articles = []
        
        for entry in feed.entries[:5]:  # Top 5 per topic
            try:
                # Parse date
                pub_date = datetime.now()
                if hasattr(entry, 'published_parsed'):
                     pub_date = datetime.fromtimestamp(time.mktime(entry.published_parsed))
                
                authors = entry.get('source', {}).get('title', 'Google News')
                
                articles.append({
                    'headline': entry.title,
                    'url': entry.link,
                    'source': authors,
                    'published_at': pub_date,
                    'summary': entry.get('summary', ''),
                    'related_symbol': None  # Can implement smarter matching later
                })
            except Exception as e:
                continue
                
        return articles
    except Exception as e:
        logger.error(f"Error fetching topic {topic}: {e}")
        return []

async def resolve_symbols_for_news(conn, articles):
    """Try to tag articles with stock symbols based on content"""
    # Get high-cap stocks for matching
    tickers = await conn.fetch("SELECT symbol, name_en, name_ar FROM market_tickers WHERE last_price > 0")
    
    for article in articles:
        text = (article['headline'] + " " + article['source']).lower()
        
        for row in tickers:
            # Check English name
            if row['name_en'] and len(row['name_en']) > 4 and row['name_en'].lower() in text:
                article['related_symbol'] = row['symbol']
                break
            
            # Check simple symbol match for known large caps
            if row['symbol'] in ['2222', '1120', '2010', '1180'] and row['name_en'].split()[0].lower() in text:
                article['related_symbol'] = row['symbol']
                break
    
    return articles

async def main():
    print()
    print("╔" + "═" * 60 + "╗")
    print("║" + " REAL-TIME FINANCE NEWS AGGREGATOR ".center(60) + "║")
    print("╚" + "═" * 60 + "╝")
    print()
    
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    try:
        all_articles = []
        
        # 1. Fetch news
        for topic in SEARCH_TOPICS:
            articles = await fetch_news_for_topic(topic)
            all_articles.extend(articles)
            await asyncio.sleep(1)  # Be polite to Google
            
        logger.info(f"Fetched {len(all_articles)} total articles")
        
        # 2. Tag with symbols
        async with pool.acquire() as conn:
            tagged_articles = await resolve_symbols_for_news(conn, all_articles)
            
            # 3. Insert into DB
            count = 0
            for article in tagged_articles:
                try:
                    # Simple duplicate check by headline
                    exists = await conn.fetchval(
                        "SELECT id FROM market_news WHERE headline = $1", 
                        article['headline']
                    )
                    
                    if not exists:
                        await conn.execute("""
                            INSERT INTO market_news (symbol, headline, url, source, published_at, sentiment_score)
                            VALUES ($1, $2, $3, $4, $5, 0)
                        """, article['related_symbol'], article['headline'], 
                             article['url'], article['source'], article['published_at'])
                        count += 1
                except Exception as e:
                    logger.error(f"Insert error: {e}")
                    
        print()
        print(f"✅ Successfully added {count} new articles")
        print("📰 AI Analyst now has fresh market context!")
        
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
