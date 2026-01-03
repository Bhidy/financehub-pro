"""
EGX ENTERPRISE DATA EXTRACTOR - COMPLETE FINANCIAL DATA
=========================================================
Extracts ALL available data from StockAnalysis.com for Egyptian stocks:

1. OVERVIEW: Current price, market cap, key metrics
2. FINANCIALS: Income Statement, Balance Sheet, Cash Flow, Ratios (5 years annual + quarterly)
3. STATISTICS: 100+ metrics (valuation, margins, growth, returns)
4. DIVIDENDS: All historical dividend payments
5. HISTORY: Full OHLCV price history (Max available)
6. PROFILE: Company description, CEO, industry, employees

Data Source: StockAnalysis.com (S&P Global Market Intelligence)
"""

import asyncio
import asyncpg
import os
import sys
import json
import logging
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/egx_enterprise_extraction.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('EGXEnterprise')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is required")

# API Headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
}


class StockAnalysisEnterpriseClient:
    """
    Enterprise client for extracting ALL available data from StockAnalysis.com
    """
    
    BASE_URL = "https://stockanalysis.com"
    
    def __init__(self, rate_limit: float = 1.0):
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.last_request = 0
    
    def _throttle(self):
        """Rate limiting"""
        elapsed = time.time() - self.last_request
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self.last_request = time.time()
    
    def _get(self, url: str, retries: int = 3) -> Optional[requests.Response]:
        """GET request with retry logic"""
        for attempt in range(retries):
            try:
                self._throttle()
                response = self.session.get(url, timeout=30)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429:
                    wait = 60 * (attempt + 1)
                    logger.warning(f"Rate limited, waiting {wait}s...")
                    time.sleep(wait)
            except Exception as e:
                logger.error(f"Request error: {e}")
                time.sleep(5 * (attempt + 1))
        return None
    
    def _extract_next_data(self, html: str) -> Dict:
        """Extract __NEXT_DATA__ from HTML page"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if script:
                data = json.loads(script.string)
                return data.get('props', {}).get('pageProps', {})
        except Exception as e:
            logger.error(f"Error parsing __NEXT_DATA__: {e}")
        return {}
    
    def get_egx_stocks(self) -> List[Dict]:
        """Get all EGX stocks from screener API"""
        url = (f"{self.BASE_URL}/api/screener/a/f?"
               f"m=marketCap&s=desc&"
               f"c=s,n,marketCap,price,change,volume,revenue,netIncome,peRatio,dividendYield,sector&"
               f"f=exchangeCode-is-EGX,subtype-is-stock&i=symbols")
        
        response = self._get(url)
        if not response:
            return []
        
        try:
            data = response.json()
            stocks = []
            if 'data' in data and 'data' in data['data']:
                for row in data['data']['data']:
                    symbol_raw = row.get('s', '')
                    symbol = symbol_raw.split('/')[-1] if '/' in symbol_raw else symbol_raw
                    
                    stocks.append({
                        'symbol': symbol,
                        'name_en': row.get('n', ''),
                        'market_cap': row.get('marketCap'),
                        'last_price': row.get('price'),
                        'change_percent': row.get('change'),
                        'volume': row.get('volume'),
                        'revenue': row.get('revenue'),
                        'net_income': row.get('netIncome'),
                        'pe_ratio': row.get('peRatio'),
                        'dividend_yield': row.get('dividendYield'),
                        'sector_name': row.get('sector', ''),
                        'market_code': 'EGX',
                        'currency': 'EGP'
                    })
            
            logger.info(f"Fetched {len(stocks)} EGX stocks")
            return stocks
        except Exception as e:
            logger.error(f"Error parsing stocks: {e}")
            return []
    
    def get_full_history(self, symbol: str) -> List[Dict]:
        """Get FULL historical OHLCV data (not just 6 months)"""
        # Use the API with type=full to get maximum history
        url = f"{self.BASE_URL}/api/symbol/a/EGX-{symbol.upper()}/history?type=full"
        
        response = self._get(url)
        if not response:
            return []
        
        try:
            data = response.json()
            history = []
            
            if 'data' in data and 'data' in data['data']:
                for row in data['data']['data']:
                    history.append({
                        'symbol': symbol,
                        'date': row.get('t'),
                        'open': row.get('o'),
                        'high': row.get('h'),
                        'low': row.get('l'),
                        'close': row.get('c'),
                        'adj_close': row.get('a'),
                        'volume': row.get('v'),
                        'change_percent': row.get('ch')
                    })
            
            logger.info(f"{symbol}: {len(history)} OHLC records (full history)")
            return history
        except Exception as e:
            logger.error(f"Error parsing history for {symbol}: {e}")
            return []
    
    def _parse_svelte_financials(self, json_data: Dict) -> List[Dict]:
        """Parse SvelteKit __data.json response for financials"""
        try:
            nodes = json_data.get('nodes', [])
            target_node = None
            for node in nodes:
                data_pool = node.get('data', [])
                if isinstance(data_pool, list) and len(data_pool) > 0:
                    if isinstance(data_pool[0], dict) and 'financialData' in data_pool[0]:
                        target_node = node
                        break
            
            if not target_node:
                return []
                
            data_pool = target_node['data']
            schema = data_pool[0]
            fin_idx = schema['financialData']
            # Access the financial schema map from the pool using the index
            fin_schema = data_pool[fin_idx]
            
            # Find date column index
            date_idx = fin_schema.get('datekey', fin_schema.get('date'))
            if not date_idx:
                return []
                
            # Resolve dates list
            date_indices = data_pool[date_idx]
            dates = [data_pool[i] for i in date_indices]
            
            rows = []
            for i in range(len(dates)):
                row = {'date': dates[i]}
                for k, idx in fin_schema.items():
                    if k in ['datekey', 'class', 'map']: continue
                    
                    # Resolve column values
                    col_indices = data_pool[idx]
                    if isinstance(col_indices, list) and i < len(col_indices):
                        val_idx = col_indices[i]
                        if isinstance(val_idx, int) and 0 <= val_idx < len(data_pool):
                            row[k] = data_pool[val_idx]
                rows.append(row)
            return rows
        except Exception as e:
            logger.error(f"Svelte parsing error: {e}")
            return []

    def get_financials(self, symbol: str, statement_type: str = 'income-statement', 
                       period: str = 'annual') -> Dict:
        """Get financial statements (income, balance sheet, cash flow, ratios)"""
        # Try SvelteKit Data Endpoint first (International/New format)
        url = f"{self.BASE_URL}/quote/egx/{symbol.lower()}/financials/{statement_type}/__data.json"
        if period == 'quarterly':
            url += "?p=quarterly"
            
        response = self._get(url)
        if response and response.status_code == 200:
            rows = self._parse_svelte_financials(response.json())
            if rows:
                return {
                    'symbol': symbol,
                    'statement_type': statement_type,
                    'period': period,
                    'data': rows,
                    'source': 'svelte'
                }

        # Fallback to Next.js (Legacy/US)
        url = f"{self.BASE_URL}/quote/egx/{symbol.lower()}/financials/{statement_type}/"
        if period == 'quarterly':
            url += "?p=quarterly"
        
        response = self._get(url)
        if not response:
            return {}
        
        page_data = self._extract_next_data(response.text)
        financials = page_data.get('data', {})
        if not financials:
            financials = page_data.get('financials', {})
        
        # If financials is just list of rows, wrap it
        if isinstance(financials, list):
             return {'symbol': symbol, 'data': financials}

        return {
            'symbol': symbol,
            'statement_type': statement_type,
            'period': period,
            'data': financials.get('data', []),
            'raw_page': page_data 
        }
    
    def get_statistics(self, symbol: str) -> Dict:
        """Get all statistics and ratios"""
        url = f"{self.BASE_URL}/quote/egx/{symbol.lower()}/statistics/"
        
        response = self._get(url)
        if not response:
            return {}
        
        return self._extract_next_data(response.text)
    
    def get_dividends(self, symbol: str) -> List[Dict]:
        """Get dividend history"""
        url = f"{self.BASE_URL}/quote/egx/{symbol.lower()}/dividend/"
        
        response = self._get(url)
        if not response:
            return []
        
        page_data = self._extract_next_data(response.text)
        
        dividends = []
        div_data = page_data.get('data', {}).get('dividends', [])
        if not div_data:
            div_data = page_data.get('dividends', [])
        
        for div in div_data:
            dividends.append({
                'symbol': symbol,
                'ex_date': div.get('exDate'),
                'payment_date': div.get('payDate'),
                'record_date': div.get('recordDate'),
                'amount': div.get('amount'),
                'dividend_yield': div.get('yield')
            })
        
        return dividends
    
    def get_profile(self, symbol: str) -> Dict:
        """Get company profile"""
        url = f"{self.BASE_URL}/quote/egx/{symbol.lower()}/company/"
        
        response = self._get(url)
        if not response:
            return {}
        
        page_data = self._extract_next_data(response.text)
        
        info = page_data.get('info', {})
        company = page_data.get('company', {})
        
        return {
            'symbol': symbol,
            'description': company.get('description') or info.get('description'),
            'website': company.get('website') or info.get('website'),
            'industry': info.get('industry'),
            'sector': info.get('sector'),
            'employees': company.get('employees'),
            'ceo': company.get('ceo'),
            'founded': company.get('founded'),
            'headquarters': company.get('headquarters'),
            'raw_data': {**info, **company}
        }


class EGXEnterpriseLoader:
    """
    Enterprise database loader for all EGX data
    """
    
    def __init__(self):
        self.client = StockAnalysisEnterpriseClient(rate_limit=1.5)
        self.conn: Optional[asyncpg.Connection] = None
        self.stats = {
            'tickers': 0,
            'ohlc_records': 0,
            'financials': 0,
            'dividends': 0,
            'profiles': 0,
            'statistics': 0,
            'errors': 0
        }
    
    async def connect(self):
        """Connect to database"""
        logger.info("Connecting to database...")
        self.conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        logger.info("✅ Connected")
    
    async def close(self):
        """Close connection"""
        if self.conn:
            await self.conn.close()
            logger.info("Database connection closed")
    
    async def setup_schema(self):
        """Create all required tables"""
        logger.info("Setting up enterprise schema...")
        
        await self.conn.execute("""
            -- Ensure market_tickers has all columns
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS market_cap DECIMAL(18, 2);
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS pe_ratio DECIMAL(10, 4);
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(8, 4);
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS revenue DECIMAL(18, 4);
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS net_income DECIMAL(18, 4);
            ALTER TABLE market_tickers ADD COLUMN IF NOT EXISTS industry TEXT;
            
            -- Ensure ohlc_data has all columns
            ALTER TABLE ohlc_data ADD COLUMN IF NOT EXISTS adj_close DECIMAL(12, 4);
            ALTER TABLE ohlc_data ADD COLUMN IF NOT EXISTS change_percent DECIMAL(8, 4);

            -- Ensure company_profiles has all columns (if table existed but partial)
            CREATE TABLE IF NOT EXISTS company_profiles (symbol VARCHAR(20) PRIMARY KEY);
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS website VARCHAR(255);
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry TEXT;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS sector TEXT;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS employees INT;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS ceo VARCHAR(255);
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS founded VARCHAR(50);
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS headquarters TEXT;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS raw_data JSONB;
            ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
            
            -- Financial statements table with expanded fields
            CREATE TABLE IF NOT EXISTS financial_statements (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                statement_type VARCHAR(30) NOT NULL,
                period_type VARCHAR(10) NOT NULL,
                fiscal_year INT,
                fiscal_quarter INT,
                end_date DATE,
                -- Income Statement
                revenue DECIMAL(18, 2),
                gross_profit DECIMAL(18, 2),
                operating_income DECIMAL(18, 2),
                net_income DECIMAL(18, 2),
                eps DECIMAL(10, 4),
                eps_diluted DECIMAL(10, 4),
                interest_income DECIMAL(18, 2),
                interest_expense DECIMAL(18, 2),
                -- Balance Sheet
                total_assets DECIMAL(18, 2),
                total_liabilities DECIMAL(18, 2),
                total_equity DECIMAL(18, 2),
                cash_and_equivalents DECIMAL(18, 2),
                total_debt DECIMAL(18, 2),
                -- Cash Flow
                operating_cashflow DECIMAL(18, 2),
                investing_cashflow DECIMAL(18, 2),
                financing_cashflow DECIMAL(18, 2),
                free_cashflow DECIMAL(18, 2),
                capex DECIMAL(18, 2),
                -- Raw JSON for all fields
                raw_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(symbol, statement_type, period_type, fiscal_year, fiscal_quarter)
            );
            
            -- Company profiles
            CREATE TABLE IF NOT EXISTS company_profiles (
                symbol VARCHAR(20) PRIMARY KEY,
                description TEXT,
                website VARCHAR(255),
                industry TEXT,
                sector TEXT,
                employees INT,
                ceo VARCHAR(255),
                founded VARCHAR(50),
                headquarters TEXT,
                raw_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Dividend history
            CREATE TABLE IF NOT EXISTS dividend_history (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                ex_date DATE,
                payment_date DATE,
                record_date DATE,
                amount DECIMAL(12, 4),
                currency VARCHAR(5) DEFAULT 'EGP',
                dividend_type VARCHAR(20) DEFAULT 'CASH',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(symbol, ex_date)
            );
            
            -- Statistics/Ratios history
            CREATE TABLE IF NOT EXISTS stock_statistics (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                date DATE DEFAULT CURRENT_DATE,
                -- Valuation
                pe_ratio DECIMAL(10, 4),
                forward_pe DECIMAL(10, 4),
                pb_ratio DECIMAL(10, 4),
                ps_ratio DECIMAL(10, 4),
                ev_ebitda DECIMAL(10, 4),
                ev_revenue DECIMAL(10, 4),
                -- Margins
                gross_margin DECIMAL(8, 4),
                operating_margin DECIMAL(8, 4),
                net_margin DECIMAL(8, 4),
                -- Returns
                roe DECIMAL(8, 4),
                roa DECIMAL(8, 4),
                roic DECIMAL(8, 4),
                -- Liquidity
                current_ratio DECIMAL(8, 4),
                quick_ratio DECIMAL(8, 4),
                -- Debt
                debt_to_equity DECIMAL(10, 4),
                debt_to_assets DECIMAL(8, 4),
                -- Growth
                revenue_growth DECIMAL(8, 4),
                earnings_growth DECIMAL(8, 4),
                -- Raw JSON
                raw_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(symbol, date)
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_financials_symbol ON financial_statements(symbol);
            CREATE INDEX IF NOT EXISTS idx_dividends_symbol ON dividend_history(symbol);
            CREATE INDEX IF NOT EXISTS idx_statistics_symbol ON stock_statistics(symbol);
        """)
        
        logger.info("✅ Enterprise schema ready")
    
    async def upsert_ticker(self, stock: Dict):
        """Insert or update ticker"""
        await self.conn.execute("""
            INSERT INTO market_tickers (
                symbol, name_en, sector_name, market_code, currency,
                market_cap, last_price, change_percent, volume,
                pe_ratio, dividend_yield, revenue, net_income, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            ON CONFLICT (symbol) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                sector_name = EXCLUDED.sector_name,
                market_code = EXCLUDED.market_code,
                market_cap = EXCLUDED.market_cap,
                last_price = EXCLUDED.last_price,
                change_percent = EXCLUDED.change_percent,
                volume = EXCLUDED.volume,
                pe_ratio = EXCLUDED.pe_ratio,
                dividend_yield = EXCLUDED.dividend_yield,
                revenue = EXCLUDED.revenue,
                net_income = EXCLUDED.net_income,
                last_updated = NOW()
        """,
            stock['symbol'],
            stock['name_en'],
            stock.get('sector_name'),
            stock['market_code'],
            stock['currency'],
            stock.get('market_cap'),
            stock.get('last_price'),
            stock.get('change_percent'),
            int(stock.get('volume') or 0),
            stock.get('pe_ratio'),
            stock.get('dividend_yield'),
            stock.get('revenue'),
            stock.get('net_income')
        )
        self.stats['tickers'] += 1
    
    async def upsert_ohlc(self, record: Dict) -> bool:
        """Insert OHLC record, return True if new"""
        try:
            date_val = record['date']
            if isinstance(date_val, str):
                date_val = datetime.strptime(date_val, '%Y-%m-%d').date()
            
            result = await self.conn.execute("""
                INSERT INTO ohlc_data (symbol, date, open, high, low, close, adj_close, volume, change_percent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (symbol, date) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    adj_close = EXCLUDED.adj_close,
                    volume = EXCLUDED.volume,
                    change_percent = EXCLUDED.change_percent
            """,
                record['symbol'],
                date_val,
                record.get('open'),
                record.get('high'),
                record.get('low'),
                record.get('close'),
                record.get('adj_close'),
                record.get('volume'),
                record.get('change_percent')
            )
            
            self.stats['ohlc_records'] += 1
            return True
        except Exception as e:
            self.stats['errors'] += 1
            return False
    
    async def upsert_profile(self, profile: Dict):
        """Insert or update company profile"""
        if not profile.get('symbol'):
            return
        
        try:
            await self.conn.execute("""
                INSERT INTO company_profiles (
                    symbol, description, website, industry, sector,
                    employees, ceo, founded, headquarters, raw_data, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    description = EXCLUDED.description,
                    website = EXCLUDED.website,
                    industry = EXCLUDED.industry,
                    sector = EXCLUDED.sector,
                    employees = EXCLUDED.employees,
                    ceo = EXCLUDED.ceo,
                    founded = EXCLUDED.founded,
                    headquarters = EXCLUDED.headquarters,
                    raw_data = EXCLUDED.raw_data,
                    updated_at = NOW()
            """,
                profile['symbol'],
                profile.get('description'),
                profile.get('website'),
                profile.get('industry'),
                profile.get('sector'),
                int(profile['employees']) if profile.get('employees') and str(profile['employees']).isdigit() else None,
                profile.get('ceo'),
                profile.get('founded'),
                profile.get('headquarters'),
                json.dumps(profile.get('raw_data', {}))
            )
            self.stats['profiles'] += 1
        except Exception as e:
            logger.error(f"Profile error {profile.get('symbol')}: {e}")
            self.stats['errors'] += 1
    
    async def upsert_dividend(self, div: Dict):
        """Insert dividend record"""
        if not div.get('ex_date'):
            return
        
        try:
            ex_date = div['ex_date']
            if isinstance(ex_date, str):
                ex_date = datetime.strptime(ex_date, '%Y-%m-%d').date()
            
            await self.conn.execute("""
                INSERT INTO dividend_history (symbol, ex_date, payment_date, record_date, amount)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (symbol, ex_date) DO UPDATE SET
                    payment_date = EXCLUDED.payment_date,
                    record_date = EXCLUDED.record_date,
                    amount = EXCLUDED.amount
            """,
                div['symbol'],
                ex_date,
                datetime.strptime(div['payment_date'], '%Y-%m-%d').date() if div.get('payment_date') else None,
                datetime.strptime(div['record_date'], '%Y-%m-%d').date() if div.get('record_date') else None,
                div.get('amount')
            )
            self.stats['dividends'] += 1
        except Exception as e:
            self.stats['errors'] += 1
    
    async def upsert_statistics(self, symbol: str, stats: Dict):
        """Insert statistics"""
        if not stats:
            return
            
        try:
            await self.conn.execute("""
                INSERT INTO stock_statistics (
                    symbol, date,
                    pe_ratio, pb_ratio, ps_ratio, ev_ebitda, ev_revenue,
                    gross_margin, operating_margin, net_margin,
                    roe, roa, roic,
                    current_ratio, quick_ratio,
                    debt_to_equity, debt_to_assets,
                    revenue_growth, earnings_growth,
                    raw_data
                ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT (symbol, date) DO UPDATE SET
                    pe_ratio = EXCLUDED.pe_ratio,
                    pb_ratio = EXCLUDED.pb_ratio,
                    raw_data = EXCLUDED.raw_data
            """,
                symbol,
                stats.get('peRatio'),
                stats.get('pbRatio'),
                stats.get('psRatio'),
                stats.get('evEbitda'),
                stats.get('evRevenue'),
                stats.get('grossMargin'),
                stats.get('operatingMargin'),
                stats.get('netMargin'),
                stats.get('roe'),
                stats.get('roa'),
                stats.get('roic'),
                stats.get('currentRatio'),
                stats.get('quickRatio'),
                stats.get('debtToEquity'),
                stats.get('debtToAssets'),
                stats.get('revenueGrowth'),
                stats.get('earningsGrowth'),
                json.dumps(stats)
            )
            self.stats['statistics'] += 1
        except Exception as e:
            self.stats['errors'] += 1

    async def upsert_financials(self, financials: Dict):
        """Insert financial statements"""
        if not financials or not financials.get('data'):
            return
            
        symbol = financials['symbol']
        stmt_type = financials['statement_type']
        period = financials['period']
        
        try:
            for row in financials['data']:
                date_str = row.get('date') or row.get('endDate')
                if not date_str or date_str == 'TTM':
                    continue
                
                try:
                    end_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    continue
                    
                # Extract year/quarter
                year = end_date.year if end_date else None
                quarter = (end_date.month - 1) // 3 + 1 if end_date else None
                
                await self.conn.execute("""
                    INSERT INTO financial_statements (
                        symbol, statement_type, period_type,
                        fiscal_year, fiscal_quarter, end_date,
                        revenue, net_income, eps,
                        total_assets, total_liabilities, total_equity,
                        operating_cashflow, free_cashflow,
                        raw_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (symbol, statement_type, period_type, fiscal_year, fiscal_quarter) DO UPDATE SET
                        revenue = EXCLUDED.revenue,
                        net_income = EXCLUDED.net_income,
                        raw_data = EXCLUDED.raw_data
                """,
                    symbol, stmt_type, period,
                    year, quarter, end_date,
                    row.get('revenue'),
                    row.get('netIncome'),
                    row.get('eps'),
                    row.get('totalAssets'),
                    row.get('totalLiabilities'),
                    row.get('totalEquity'),
                    row.get('operatingCashFlow'),
                    row.get('freeCashFlow'),
                    json.dumps(row)
                )
            self.stats['financials'] += 1
        except Exception as e:
            logger.error(f"Financials error {symbol}: {e}")
            self.stats['errors'] += 1

    async def is_processed(self, symbol: str) -> bool:
        """Check if stock is already deeply processed"""
        # We consider it processed if it has Financial Statements (the deepest level)
        try:
            exists = await self.conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM financial_statements WHERE symbol = $1)", symbol
            )
            return exists
        except Exception:
            return False

    async def run_full_extraction(self):
        """Run complete data extraction for all EGX stocks"""
        logger.info("=" * 70)
        logger.info("🏆 EGX ENTERPRISE DATA EXTRACTION (RESTARTED)")
        logger.info("=" * 70)
        
        await self.connect()
        await self.setup_schema()
        
        start_time = time.time()
        
        # Phase 1: Get all tickers
        logger.info("\n📊 PHASE 1: Loading stock universe...")
        stocks = self.client.get_egx_stocks()
        
        for stock in stocks:
            await self.upsert_ticker(stock)
        
        logger.info(f"✅ {len(stocks)} tickers loaded")
        
        logger.info("\n🚀 PHASE 2: Deep Extraction (OHLC, Profile, Financials, Stats, Divs)...")
        
        for i, stock in enumerate(stocks, 1):
            symbol = stock['symbol']
            
            # Smart Resume Check
            if await self.is_processed(symbol):
                logger.info(f"[{i}/{len(stocks)}] Skipping {symbol} (Already processed)")
                continue

            logger.info(f"[{i}/{len(stocks)}] Processing {symbol}...")
            
            # 1. OHLC
            logger.info(f"   > {symbol}: Fetching OHLC...")
            history = self.client.get_full_history(symbol)
            for record in history:
                await self.upsert_ohlc(record)
            
            # 2. Profile
            logger.info(f"   > {symbol}: Fetching Profile...")
            profile = self.client.get_profile(symbol)
            if profile:
                await self.upsert_profile(profile)
            
            # 3. Dividends
            logger.info(f"   > {symbol}: Fetching Dividends...")
            dividends = self.client.get_dividends(symbol)
            for div in dividends:
                await self.upsert_dividend(div)

            # 4. Statistics
            logger.info(f"   > {symbol}: Fetching Statistics...")
            stats = self.client.get_statistics(symbol)
            if stats:
                await self.upsert_statistics(symbol, stats)
                
            # 5. Financials (Annual + Quarterly for Income, Balance, Cash Flow)
            logger.info(f"   > {symbol}: Fetching Financials...")
            statements = ['income-statement', 'balance-sheet', 'cash-flow-statement', 'ratios']
            periods = ['annual', 'quarterly']
            
            for stmt in statements:
                for per in periods:
                    fin_data = self.client.get_financials(symbol, stmt, per)
                    if fin_data:
                        await self.upsert_financials(fin_data)
            
            logger.info(f"   ✅ Done: OHLC({len(history)}), Divs({len(dividends)}), Fin(Checked)")
        
        # Summary
        elapsed = time.time() - start_time
        await self.close()
        
        logger.info("\n" + "=" * 70)
        logger.info("📊 EXTRACTION SUMMARY")
        logger.info("=" * 70)
        logger.info(f"🏦 Tickers: {self.stats['tickers']}")
        logger.info(f"📈 OHLC Records: {self.stats['ohlc_records']}")
        logger.info(f"🏢 Profiles: {self.stats['profiles']}")
        logger.info(f"💰 Dividends: {self.stats['dividends']}")
        logger.info(f"❌ Errors: {self.stats['errors']}")
        logger.info(f"⏱️ Duration: {elapsed/60:.1f} minutes")
        logger.info("=" * 70)


async def main():
    os.makedirs('logs', exist_ok=True)
    loader = EGXEnterpriseLoader()
    await loader.run_full_extraction()


if __name__ == "__main__":
    asyncio.run(main())
