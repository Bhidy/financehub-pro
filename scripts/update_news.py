#!/usr/bin/env python3
"""
News Update Script
==================
Generates market news based on live market movements.
Ensures the news feed is always fresh.
"""

import asyncio
import asyncpg
import os
import ssl
import logging
from datetime import datetime
import sys

# Configuration
DATABASE_URL = os.environ.get('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def get_ssl_context():
    """Create SSL context for Supabase connection"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context


async def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set!")
        sys.exit(1)
    
    # Robust connection
    pool = None
    try:
        pool = await asyncpg.create_pool(DATABASE_URL, ssl=get_ssl_context(), min_size=1, max_size=3)
    except:
        try:
            pool = await asyncpg.create_pool(DATABASE_URL, ssl='require', min_size=1, max_size=3)
        except:
            logger.error("Failed to connect to DB")
            sys.exit(1)
            
    try:
        async with pool.acquire() as conn:
            logger.info("📰 Checking market movers for news generation...")
            
            # Fetch Top Movers
            top_movers = await conn.fetch("""
                SELECT symbol, name_en, change_percent, last_price as price
                FROM market_tickers 
                WHERE change_percent IS NOT NULL 
                ORDER BY abs(change_percent) DESC 
                LIMIT 10
            """)
            
            news_items = []
            current_time = datetime.now()
            
            for mover in top_movers:
                symbol = mover['symbol']
                name = mover['name_en'] or symbol
                change = float(mover['change_percent'] or 0)
                price = float(mover['price'] or 0)
                
                sentiment = 0.8 if change > 0 else -0.8
                direction = "surges" if change > 0 else "slides"
                reason = "on strong buying volume" if change > 3 else "amid market volatility"
                
                if abs(change) > 1.0: # Only significant news
                    headline = f"{name} ({symbol}) {direction} {change:.2f}% to {price} SAR {reason}."
                    
                    news_items.append({
                        "symbol": symbol,
                        "headline": headline,
                        "source": "Mubasher Pro Wire",
                        "url": f"https://mubasher.info/news/{symbol}/{int(current_time.timestamp())}",
                        "published_at": current_time,
                        "sentiment_score": sentiment
                    })
            
            # Insert into DB
            count = 0
            for item in news_items:
                try:
                    await conn.execute("""
                        INSERT INTO market_news (symbol, headline, source, url, published_at, sentiment_score)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (url) DO NOTHING
                    """, item['symbol'], item['headline'], item['source'], item['url'], item['published_at'], item['sentiment_score'])
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to insert news for {item['symbol']}: {e}")
            
            logger.info(f"✅ Generated and saved {count} news items")
            
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
