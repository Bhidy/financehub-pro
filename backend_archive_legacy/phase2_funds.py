"""
PHASE 2: MUTUAL FUNDS & ASSET CLASS EXPANSION
Zero-Cost Implementation

Adds:
- Mutual Funds (simulated for demo, structure ready for real scraping)
- ETFs
- Index tracking
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from database import db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [PHASE2] - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("phase2.log"), logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

# Saudi Mutual Funds (Top 20 for demo)
SAUDI_MUTUAL_FUNDS = [
    {"fund_id": "MF001", "name": "Al Rajhi Saudi Equity Fund", "type": "Equity", "manager": "Al Rajhi Capital"},
    {"fund_id": "MF002", "name": "HSBC Saudi Equity Fund", "type": "Equity", "manager": "HSBC Saudi Arabia"},
    {"fund_id": "MF003", "name": "SABB Balanced Fund", "type": "Mixed", "manager": "SABB"},
    {"fund_id": "MF004", "name": "NCB Equity Fund", "type": "Equity", "manager": "NCB Capital"},
    {"fund_id": "MF005", "name": "Riyad REIT Fund", "type": "Real Estate", "manager": "Riyad Capital"},
    {"fund_id": "MF006", "name": "Alahli Saudi Trading Equity", "type": "Equity", "manager": "SNB Capital"},
    {"fund_id": "MF007", "name": "GIB Saudi Riyal Money Market", "type": "Money Market", "manager": "GIB Capital"},
    {"fund_id": "MF008", "name": "Alinma Petrochemical Fund", "type": "Sector", "manager": "Alinma Investment"},
    {"fund_id": "MF009", "name": "Alistithmar Capital Growth", "type": "Equity", "manager": "Alistithmar Capital"},
    {"fund_id": "MF010", "name": "Jadwa Saudi Equity Fund", "type": "Equity", "manager": "Jadwa Investment"},
    {"fund_id": "MF011", "name": "Musharaka REIT Fund", "type": "Real Estate", "manager": "Musharaka Capital"},
    {"fund_id": "MF012", "name": "Saudi Fransi Equity Fund", "type": "Equity", "manager": "Banque Saudi Fransi"},
    {"fund_id": "MF013", "name": "Falcom Saudi Equity Fund", "type": "Equity", "manager": "Falcom Financial"},
    {"fund_id": "MF014", "name": "Albilad Balanced Fund", "type": "Mixed", "manager": "Albilad Capital"},
    {"fund_id": "MF015", "name": "Alawwal Equity Fund", "type": "Equity", "manager": "Alawwal Invest"},
    {"fund_id": "MF016", "name": "Audi Capital Saudi Fund", "type": "Equity", "manager": "Audi Capital"},
    {"fund_id": "MF017", "name": "Aljazira Capital Equity", "type": "Equity", "manager": "Aljazira Capital"},
    {"fund_id": "MF018", "name": "Alkhabeer REIT Fund", "type": "Real Estate", "manager": "Alkhabeer Capital"},
    {"fund_id": "MF019", "name": "Derayah Financial Equity", "type": "Equity", "manager": "Derayah Financial"},
    {"fund_id": "MF020", "name": "Alinma Technology Fund", "type": "Sector", "manager": "Alinma Investment"},
]

# Saudi ETFs
SAUDI_ETFS = [
    {"etf_id": "ETF001", "name": "Falcom Tadawul 30 ETF", "tracking": "MT30 Index"},
    {"etf_id": "ETF002", "name": "HSBC TASI ETF", "tracking": "TASI Index"},
    {"etf_id": "ETF003", "name": "AlAhli Dividend ETF", "tracking": "Dividend Aristocrats"},
    {"etf_id": "ETF004", "name": "Alahli REIT ETF", "tracking": "Real Estate Sector"},
]


async def create_fund_tables():
    """Create database tables for mutual funds and ETFs"""
    logger.info("Creating mutual fund and ETF tables...")
    
    await db.execute("""
        CREATE TABLE IF NOT EXISTS mutual_funds (
            fund_id VARCHAR(20) PRIMARY KEY,
            fund_name VARCHAR(255),
            fund_type VARCHAR(50),
            manager_name VARCHAR(255),
            inception_date DATE,
            currency VARCHAR(10) DEFAULT 'SAR',
            expense_ratio DECIMAL(5,2),
            minimum_investment DECIMAL(18,2),
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    await db.execute("""
        CREATE TABLE IF NOT EXISTS fund_nav_history (
            fund_id VARCHAR(20),
            date DATE,
            nav DECIMAL(10,4),
            aum DECIMAL(18,2),
            units_outstanding BIGINT,
            PRIMARY KEY (fund_id, date)
        );
    """)
    
    await db.execute("""
        CREATE TABLE IF NOT EXISTS etfs (
            etf_id VARCHAR(20) PRIMARY KEY,
            etf_name VARCHAR(255),
            tracking_index VARCHAR(100),
            inception_date DATE,
            expense_ratio DECIMAL(5,2),
            average_spread DECIMAL(6,4),
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    logger.info("✅ Tables created successfully")


async def populate_mutual_funds():
    """Populate mutual funds with historical NAV data"""
    logger.info(f"Populating {len(SAUDI_MUTUAL_FUNDS)} mutual funds...")
    
    for fund in SAUDI_MUTUAL_FUNDS:
        # Insert fund metadata
        await db.execute("""
            INSERT INTO mutual_funds (fund_id, fund_name, fund_type, manager_name, inception_date, expense_ratio, minimum_investment)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (fund_id) DO NOTHING
        """, fund["fund_id"], fund["name"], fund["type"], fund["manager"],
            datetime.now() - timedelta(days=365*5),  # 5 years old
            random.uniform(0.5, 2.5),  # Expense ratio
            random.randint(1000, 10000)  # Minimum investment
        )
        
        # Generate 3 years of daily NAV history
        base_nav = random.uniform(50, 200)
        for days_ago in range(1095, 0, -1):  # 3 years = 1095 days
            date = datetime.now() - timedelta(days=days_ago)
            daily_return = random.uniform(-0.02, 0.02)  # ±2% daily volatility
            base_nav *= (1 + daily_return)
            aum = base_nav * random.randint(10000000, 500000000)  # AUM in SAR
            
            await db.execute("""
                INSERT INTO fund_nav_history (fund_id, date, nav, aum, units_outstanding)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (fund_id, date) DO NOTHING
            """, fund["fund_id"], date.date(), round(base_nav, 4), round(aum, 2), random.randint(1000000, 10000000))
        
        logger.info(f"✅ {fund['name']} - 1,095 NAV records")
    
    logger.info(f"✅ Populated {len(SAUDI_MUTUAL_FUNDS)} mutual funds with 21,900 NAV records")


async def populate_etfs():
    """Populate ETFs"""
    logger.info(f"Populating {len(SAUDI_ETFS)} ETFs...")
    
    for etf in SAUDI_ETFS:
        await db.execute("""
            INSERT INTO etfs (etf_id, etf_name, tracking_index, inception_date, expense_ratio, average_spread)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (etf_id) DO NOTHING
        """, etf["etf_id"], etf["name"], etf["tracking"], 
            datetime.now() - timedelta(days=365*3),  # 3 years old
            random.uniform(0.1, 0.5),  # Lower expense than mutual funds
            random.uniform(0.01, 0.10)  # Spread in %
        )
        
        logger.info(f"✅ {etf['name']}")
    
    logger.info(f"✅ Populated {len(SAUDI_ETFS)} ETFs")


async def phase_2_expansion():
    """
    PHASE 2: Add Mutual Funds and ETFs
    """
    logger.info("🚀 PHASE 2: MUTUAL FUNDS & ETF EXPANSION")
    logger.info("=" * 60)
    
    await db.connect()
    
    # Step 1: Create tables
    await create_fund_tables()
    
    # Step 2: Populate mutual funds
    await populate_mutual_funds()
    
    # Step 3: Populate ETFs
    await populate_etfs()
    
    # Verification
    fund_count = await db.fetch_one("SELECT COUNT(*) as count FROM mutual_funds")
    nav_count = await db.fetch_one("SELECT COUNT(*) as count FROM fund_nav_history")
    etf_count = await db.fetch_one("SELECT COUNT(*) as count FROM etfs")
    
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 2 COMPLETE - SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Mutual Funds:     {fund_count['count']}")
    logger.info(f"NAV Records:      {nav_count['count']:,}")
    logger.info(f"ETFs:             {etf_count['count']}")
    logger.info("=" * 60)
    logger.info("\n🎉 PHASE 2 COMPLETE!")
    logger.info("Next: Run Phase 3 for corporate actions & insider trading")


if __name__ == "__main__":
    asyncio.run(phase_2_expansion())
