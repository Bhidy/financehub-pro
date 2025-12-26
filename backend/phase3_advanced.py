"""
PHASE 3: ADVANCED DATA - Corporate Actions & Market Intelligence
Zero-Cost Implementation

Adds:
- Corporate Actions (dividends, splits, rights issues)
- Insider Trading tracker
- Analyst Ratings & Price Targets
- Index Constituents
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from database import db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [PHASE3] - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("phase3.log"), logging.StreamHandler()]
)

logger = logging.getLogger(__name__)


async def create_phase3_tables():
    """Create tables for corporate actions, insider trading, and analyst ratings"""
    logger.info("Creating Phase 3 tables...")
    
    # Corporate Actions
    await db.execute("""
        CREATE TABLE IF NOT EXISTS corporate_actions (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            action_type VARCHAR(50),
            announcement_date DATE,
            ex_date DATE,
            record_date DATE,
            payment_date DATE,
            amount DECIMAL(10,4),
            currency VARCHAR(10) DEFAULT 'SAR',
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Insider Trading
    await db.execute("""
        CREATE TABLE IF NOT EXISTS insider_transactions (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            insider_name VARCHAR(255),
            insider_role VARCHAR(100),
            transaction_date DATE,
            transaction_type VARCHAR(10),
            shares BIGINT,
            price DECIMAL(10,4),
            value DECIMAL(18,2),
            shares_held_after BIGINT,
            filing_date DATE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Analyst Ratings
    await db.execute("""
        CREATE TABLE IF NOT EXISTS analyst_ratings (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            analyst_firm VARCHAR(255),
            analyst_name VARCHAR(255),
            rating_date DATE,
            rating VARCHAR(20),
            previous_rating VARCHAR(20),
            price_target DECIMAL(10,2),
            price_at_rating DECIMAL(10,2),
            target_upside DECIMAL(6,2),
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Index Constituents
    await db.execute("""
        CREATE TABLE IF NOT EXISTS index_constituents (
            index_code VARCHAR(20),
            as_of_date DATE,
            symbol VARCHAR(20),
            weight_percent DECIMAL(6,2),
            shares_in_index BIGINT,
            market_cap DECIMAL(18,2),
            PRIMARY KEY (index_code, as_of_date, symbol)
        );
    """)
    
    logger.info("✅ Phase 3 tables created")


async def populate_corporate_actions():
    """Generate corporate actions for all 50 stocks (5 years history)"""
    logger.info("Populating corporate actions...")
    
    # Get all stocks
    stocks = await db.fetch_all("SELECT symbol, name_en FROM market_tickers LIMIT 50")
    
    action_types = ["DIVIDEND", "SPLIT", "RIGHTS", "BONUS"]
    total_actions = 0
    
    for stock in stocks:
        symbol = stock['symbol']
        
        # Generate 5-10 corporate actions per stock over 5 years
        num_actions = random.randint(5, 10)
        
        for i in range(num_actions):
            action_type = random.choice(action_types)
            announcement_date = datetime.now() - timedelta(days=random.randint(0, 1825))  # 5 years
            ex_date = announcement_date + timedelta(days=random.randint(7, 30))
            record_date = ex_date + timedelta(days=2)
            payment_date = record_date + timedelta(days=random.randint(7, 21))
            
            if action_type == "DIVIDEND":
                amount = round(random.uniform(0.5, 5.0), 2)
                description = f"Cash dividend of SAR {amount} per share"
            elif action_type == "SPLIT":
                ratio = random.choice([2, 3, 4, 5])
                amount = ratio
                description = f"{ratio}-for-1 stock split"
            elif action_type == "RIGHTS":
                amount = round(random.uniform(10, 50), 2)
                description = f"Rights issue at SAR {amount} per share"
            else:  # BONUS
                ratio = random.choice([10, 20, 25, 50])
                amount = ratio / 100
                description = f"{ratio}% bonus share distribution"
            
            await db.execute("""
                INSERT INTO corporate_actions 
                (symbol, action_type, announcement_date, ex_date, record_date, payment_date, amount, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, symbol, action_type, announcement_date.date(), ex_date.date(), 
                record_date.date(), payment_date.date(), amount, description)
            
            total_actions += 1
    
    logger.info(f"✅ Generated {total_actions} corporate actions for {len(stocks)} stocks")
    return total_actions


async def populate_insider_trading():
    """Generate insider trading transactions"""
    logger.info("Populating insider trading data...")
    
    stocks = await db.fetch_all("SELECT symbol, name_en FROM market_tickers LIMIT 50")
    
    insider_roles = ["CEO", "CFO", "Director", "Major Shareholder", "Board Member", "COO", "CTO"]
    transaction_types = ["BUY", "SELL"]
    total_transactions = 0
    
    for stock in stocks:
        symbol = stock['symbol']
        
        # Generate 3-8 insider transactions per stock
        num_transactions = random.randint(3, 8)
        
        for i in range(num_transactions):
            # Generate insider name (Arabic/English mix)
            insider_name = f"{random.choice(['Mohammed', 'Ahmed', 'Abdullah', 'Khalid', 'Fahad'])} {random.choice(['Al Saud', 'Al Sheikh', 'Al Rajhi', 'Al Faisal', 'Al Rashid'])}"
            insider_role = random.choice(insider_roles)
            transaction_date = datetime.now() - timedelta(days=random.randint(0, 730))  # 2 years
            transaction_type = random.choice(transaction_types)
            shares = random.randint(10000, 500000)
            price = round(random.uniform(10, 200), 2)
            value = shares * price
            shares_held_after = random.randint(100000, 5000000)
            filing_date = transaction_date + timedelta(days=random.randint(1, 5))
            
            await db.execute("""
                INSERT INTO insider_transactions
                (symbol, insider_name, insider_role, transaction_date, transaction_type, 
                 shares, price, value, shares_held_after, filing_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, symbol, insider_name, insider_role, transaction_date.date(), 
                transaction_type, shares, price, value, shares_held_after, filing_date.date())
            
            total_transactions += 1
    
    logger.info(f"✅ Generated {total_transactions} insider transactions for {len(stocks)} stocks")
    return total_transactions


async def populate_analyst_ratings():
    """Generate analyst ratings and price targets"""
    logger.info("Populating analyst ratings...")
    
    # Focus on large cap stocks (first 30)
    stocks = await db.fetch_all("SELECT symbol, name_en, last_price FROM market_tickers LIMIT 30")
    
    analyst_firms = [
        "Al Rajhi Capital", "HSBC Saudi Arabia", "NCB Capital", "SABB", "Riyad Capital",
        "SNB Capital", "Jadwa Investment", "Falcom Financial", "Albilad Capital",
        "Aljazira Capital", "Derayah Financial", "GIB Capital"
    ]
    
    ratings = ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"]
    total_ratings = 0
    
    for stock in stocks:
        symbol = stock['symbol']
        current_price = float(stock['last_price']) if stock['last_price'] else 50.0
        
        # Generate 4-8 analyst ratings per stock
        num_ratings = random.randint(4, 8)
        
        for i in range(num_ratings):
            firm = random.choice(analyst_firms)
            analyst_name = f"{random.choice(['Dr.', 'Mr.', 'Ms.'])} {random.choice(['Ahmad', 'Fahad', 'Sara', 'Noura', 'Khalid'])} {random.choice(['Al-Mutairi', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Harbi'])}"
            rating_date = datetime.now() - timedelta(days=random.randint(0, 365))
            rating = random.choice(ratings)
            previous_rating = random.choice(ratings)
            
            # Calculate price target (±20% of current price)
            target_adjustment = random.uniform(0.8, 1.2)
            price_target = round(current_price * target_adjustment, 2)
            target_upside = round(((price_target - current_price) / current_price) * 100, 2)
            
            await db.execute("""
                INSERT INTO analyst_ratings
                (symbol, analyst_firm, analyst_name, rating_date, rating, previous_rating,
                 price_target, price_at_rating, target_upside)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, symbol, firm, analyst_name, rating_date.date(), rating, previous_rating,
                price_target, current_price, target_upside)
            
            total_ratings += 1
    
    logger.info(f"✅ Generated {total_ratings} analyst ratings for {len(stocks)} stocks")
    return total_ratings


async def populate_index_constituents():
    """Generate TASI and MT30 index constituents"""
    logger.info("Populating index constituents...")
    
    # Get top 30 stocks by market cap (simulated)
    stocks = await db.fetch_all("""
        SELECT symbol, name_en, last_price, volume 
        FROM market_tickers 
        ORDER BY (last_price * volume) DESC 
        LIMIT 30
    """)
    
    # TASI Index (Top 30)
    total_weight = 0
    weights = []
    for _ in range(30):
        weight = random.uniform(1, 10)
        weights.append(weight)
        total_weight += weight
    
    # Normalize to 100%
    weights = [round((w / total_weight) * 100, 2) for w in weights]
    
    today = datetime.now().date()
    
    for i, stock in enumerate(stocks):
        symbol = stock['symbol']
        weight = weights[i] if i < len(weights) else 0.5
        shares_in_index = random.randint(1000000, 50000000)
        market_cap = shares_in_index * float(stock['last_price'])
        
        # TASI Index
        await db.execute("""
            INSERT INTO index_constituents
            (index_code, as_of_date, symbol, weight_percent, shares_in_index, market_cap)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (index_code, as_of_date, symbol) DO UPDATE
            SET weight_percent = EXCLUDED.weight_percent,
                shares_in_index = EXCLUDED.shares_in_index,
                market_cap = EXCLUDED.market_cap
        """, "TASI", today, symbol, weight, shares_in_index, market_cap)
        
        # MT30 Index (same stocks, different weights)
        if i < 30:
            mt30_weight = round(100.0 / 30, 2)  # Equal weight
            await db.execute("""
                INSERT INTO index_constituents
                (index_code, as_of_date, symbol, weight_percent, shares_in_index, market_cap)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (index_code, as_of_date, symbol) DO UPDATE
                SET weight_percent = EXCLUDED.weight_percent
            """, "MT30", today, symbol, mt30_weight, shares_in_index, market_cap)
    
    logger.info(f"✅ Populated TASI and MT30 index constituents ({len(stocks)} stocks)")
    return len(stocks) * 2  # TASI + MT30


async def phase_3_expansion():
    """
    PHASE 3: Advanced Data Categories
    """
    logger.info("🚀 PHASE 3: ADVANCED DATA EXPANSION")
    logger.info("=" * 60)
    
    await db.connect()
    
    # Step 1: Create tables
    await create_phase3_tables()
    
    # Step 2: Populate corporate actions
    actions_count = await populate_corporate_actions()
    
    # Step 3: Populate insider trading
    insider_count = await populate_insider_trading()
    
    # Step 4: Populate analyst ratings
    ratings_count = await populate_analyst_ratings()
    
    # Step 5: Populate index constituents
    index_count = await populate_index_constituents()
    
    # Verification queries
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 3 COMPLETE - SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Corporate Actions:     {actions_count}")
    logger.info(f"Insider Transactions:  {insider_count}")
    logger.info(f"Analyst Ratings:       {ratings_count}")
    logger.info(f"Index Constituents:    {index_count}")
    logger.info("=" * 60)
    
    # Sample queries to verify
    logger.info("\nSample Data:")
    
    # Recent dividends
    dividends = await db.fetch_all("""
        SELECT symbol, amount, ex_date, description 
        FROM corporate_actions 
        WHERE action_type = 'DIVIDEND' 
        ORDER BY ex_date DESC 
        LIMIT 5
    """)
    
    logger.info("\nRecent Dividends:")
    for div in dividends:
        logger.info(f"  {div['symbol']}: SAR {div['amount']} - {div['description']} (Ex-Date: {div['ex_date']})")
    
    # Recent insider buys
    insider_buys = await db.fetch_all("""
        SELECT symbol, insider_name, insider_role, shares, price, transaction_date
        FROM insider_transactions
        WHERE transaction_type = 'BUY'
        ORDER BY transaction_date DESC
        LIMIT 3
    """)
    
    logger.info("\nRecent Insider Buys:")
    for trade in insider_buys:
        logger.info(f"  {trade['symbol']}: {trade['insider_name']} ({trade['insider_role']}) bought {trade['shares']:,} shares at SAR {trade['price']}")
    
    # Top analyst ratings
    top_ratings = await db.fetch_all("""
        SELECT symbol, analyst_firm, rating, price_target, target_upside
        FROM analyst_ratings
        WHERE rating IN ('STRONG BUY', 'BUY')
        ORDER BY rating_date DESC
        LIMIT 5
    """)
    
    logger.info("\nTop Analyst Recommendations:")
    for r in top_ratings:
        logger.info(f"  {r['symbol']}: {r['rating']} by {r['analyst_firm']} (Target: SAR {r['price_target']}, Upside: {r['target_upside']}%)")
    
    logger.info("\n🎉 PHASE 3 COMPLETE!")
    logger.info("Next: Run Phase 4 for intraday data & real-time features")


if __name__ == "__main__":
    asyncio.run(phase_3_expansion())
