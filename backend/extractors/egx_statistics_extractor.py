"""
EGX FUND STATISTICS EXTRACTOR
==============================
Extracts Gainers/Losers data and Reports from funds-statistics page.
"""

import tls_client
import time
import re
import asyncio
import asyncpg
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

def create_session():
    return tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)

def get_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://english.mubasher.info/countries/eg/funds",
    }

def parse_percentage(text):
    """Parse percentage from text like '12.34%' or '-5.67%'"""
    if not text:
        return None
    text = text.strip().replace(',', '').replace('%', '')
    try:
        return float(text)
    except ValueError:
        return None

def scrape_statistics_page():
    """Scrape the funds-statistics page for gainers/losers and reports."""
    session = create_session()
    url = "https://english.mubasher.info/countries/eg/funds-statistics"
    
    logger.info(f"Fetching: {url}")
    
    try:
        resp = session.get(url, headers=get_headers())
        if resp.status_code != 200:
            logger.error(f"Failed to fetch page: {resp.status_code}")
            return None, None
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Find all section headers
        statistics = {
            'gainers_3m': [],
            'losers_3m': [],
            'gainers_1y': [],
            'losers_1y': [],
        }
        reports = []
        
        # Find tables by looking for section headers
        sections = soup.find_all(['h2', 'h3', 'h4'])
        
        for section in sections:
            section_text = section.get_text().lower().strip()
            table = section.find_next('table')
            
            if not table:
                continue
            
            rows = table.find_all('tr')[1:]  # Skip header
            
            category = None
            if 'gainer' in section_text and 'three' in section_text or 'gainer' in section_text and '3' in section_text:
                category = 'gainers_3m'
            elif 'loser' in section_text and 'three' in section_text or 'loser' in section_text and '3' in section_text:
                category = 'losers_3m'
            elif 'gainer' in section_text and 'year' in section_text:
                category = 'gainers_1y'
            elif 'loser' in section_text and 'year' in section_text:
                category = 'losers_1y'
            elif 'report' in section_text:
                # Parse reports
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 3:
                        name = cells[0].get_text().strip()
                        date = cells[1].get_text().strip()
                        link_el = cells[2].find('a')
                        link = link_el.get('href', '') if link_el else ''
                        if name and link:
                            reports.append({
                                'name': name,
                                'date': date,
                                'url': link if link.startswith('http') else f"https://english.mubasher.info{link}"
                            })
                continue
            
            if category:
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 5:
                        # Extract fund link to get fund_id
                        fund_link = cells[0].find('a')
                        fund_id = None
                        if fund_link:
                            href = fund_link.get('href', '')
                            match = re.search(r'/funds/(\d+)', href)
                            if match:
                                fund_id = match.group(1)
                        
                        fund_name = cells[0].get_text().strip()
                        symbol = cells[2].get_text().strip() if len(cells) > 2 else None
                        classification = cells[4].get_text().strip() if len(cells) > 4 else None
                        
                        # Find the profit/loss cell (usually has % sign)
                        profit = None
                        for cell in cells:
                            text = cell.get_text()
                            if '%' in text or any(c.isdigit() for c in text):
                                parsed = parse_percentage(text)
                                if parsed is not None and abs(parsed) < 10000:
                                    profit = parsed
                                    break
                        
                        if fund_id:
                            statistics[category].append({
                                'fund_id': fund_id,
                                'fund_name': fund_name,
                                'symbol': symbol,
                                'classification': classification,
                                'performance': profit,
                                'rank': len(statistics[category]) + 1,
                            })
        
        # Log findings
        for cat, items in statistics.items():
            logger.info(f"  {cat}: {len(items)} funds")
        logger.info(f"  Reports: {len(reports)}")
        
        return statistics, reports
        
    except Exception as e:
        logger.error(f"Error scraping statistics: {e}")
        return None, None

async def setup_database():
    """Create necessary tables if they don't exist."""
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Create fund_statistics table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS fund_statistics (
            id SERIAL PRIMARY KEY,
            market_code VARCHAR(10) NOT NULL,
            category VARCHAR(20) NOT NULL,
            fund_id VARCHAR(20) NOT NULL,
            fund_name TEXT,
            symbol VARCHAR(50),
            classification VARCHAR(100),
            performance DECIMAL(10, 4),
            rank INTEGER,
            last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(market_code, category, fund_id)
        )
    """)
    
    # Create fund_reports table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS fund_reports (
            id SERIAL PRIMARY KEY,
            market_code VARCHAR(10) NOT NULL,
            report_name TEXT NOT NULL,
            report_date VARCHAR(50),
            report_url TEXT NOT NULL,
            last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(market_code, report_url)
        )
    """)
    
    logger.info("✅ Database tables created/verified")
    await conn.close()

async def save_statistics(statistics, reports):
    """Save statistics and reports to database."""
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Clear old EGX statistics
    await conn.execute("DELETE FROM fund_statistics WHERE market_code = 'EGX'")
    await conn.execute("DELETE FROM fund_reports WHERE market_code = 'EGX'")
    
    # Insert statistics
    stats_count = 0
    for category, funds in statistics.items():
        for fund in funds:
            try:
                await conn.execute("""
                    INSERT INTO fund_statistics 
                    (market_code, category, fund_id, fund_name, symbol, classification, performance, rank)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (market_code, category, fund_id) DO UPDATE SET
                        fund_name = EXCLUDED.fund_name,
                        symbol = EXCLUDED.symbol,
                        classification = EXCLUDED.classification,
                        performance = EXCLUDED.performance,
                        rank = EXCLUDED.rank,
                        last_updated = CURRENT_TIMESTAMP
                """, 'EGX', category, fund['fund_id'], fund['fund_name'], 
                    fund['symbol'], fund['classification'], fund['performance'], fund['rank'])
                stats_count += 1
            except Exception as e:
                logger.error(f"Error inserting stat: {e}")
    
    # Insert reports
    reports_count = 0
    for report in reports:
        try:
            await conn.execute("""
                INSERT INTO fund_reports (market_code, report_name, report_date, report_url)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (market_code, report_url) DO UPDATE SET
                    report_name = EXCLUDED.report_name,
                    report_date = EXCLUDED.report_date,
                    last_updated = CURRENT_TIMESTAMP
            """, 'EGX', report['name'], report['date'], report['url'])
            reports_count += 1
        except Exception as e:
            logger.error(f"Error inserting report: {e}")
    
    logger.info(f"📊 Saved {stats_count} statistics, {reports_count} reports")
    await conn.close()

def run():
    # Setup database
    asyncio.run(setup_database())
    
    # Scrape data
    statistics, reports = scrape_statistics_page()
    
    if statistics:
        asyncio.run(save_statistics(statistics, reports or []))
    
    logger.info("✅ Statistics extraction complete")

if __name__ == "__main__":
    run()
