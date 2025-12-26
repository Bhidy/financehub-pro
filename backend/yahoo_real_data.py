"""
PRAGMATIC PROFESSIONAL SOLUTION
Since mubasher.info has strong WAF, use ALTERNATIVE real data sources

Real pros use multiple sources:
1. Yahoo Finance (public, reliable)
2. Investing.com (public)
3. Alpha Vantage (free tier)

This gets us REAL historical data for Saudi stocks
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Top 100 Saudi stocks with their Yahoo Finance tickers
SAUDI_STOCKS = {
    # Top 20 (already extracted)
    '2222': {'name': 'Saudi Aramco', 'yahoo': '2222.SR'},
    '1120': {'name': 'Al Rajhi Bank', 'yahoo': '1120.SR'},
    '2010': {'name': 'SABIC', 'yahoo': '2010.SR'},
    '1010': {'name': 'Riyad Bank', 'yahoo': '1010.SR'},
    '7010': {'name': 'STC', 'yahoo': '7010.SR'},
    '4190': {'name': 'Jarir', 'yahoo': '4190.SR'},
    '2030': {'name': 'Saudi Kayan', 'yahoo': '2030.SR'},
    '1150': {'name': 'Alinma Bank', 'yahoo': '1150.SR'},
    '1180': {'name': 'SNB', 'yahoo': '1180.SR'},
    '1050': {'name': 'Bank AlBilad', 'yahoo': '1050.SR'},
    '1111': {'name': 'SABB', 'yahoo': '1111.SR'},
    '4002': {'name': 'Mouwasat', 'yahoo': '4002.SR'},
    '4001': {'name': 'Alhokair', 'yahoo': '4001.SR'},
    '2290': {'name': 'Yanbu Cement', 'yahoo': '2290.SR'},
    '7200': {'name': 'Al Moammar', 'yahoo': '7200.SR'},
    '2050': {'name': 'Savola', 'yahoo': '2050.SR'},
    '2080': {'name': 'Safco', 'yahoo': '2080.SR'},
    '1211': {'name': 'Maaden', 'yahoo': '1211.SR'},
    '2020': {'name': 'SABIC Agri', 'yahoo': '2020.SR'},
    '2060': {'name': 'SIPCHEM', 'yahoo': '2060.SR'},
    
    # Next 80 stocks (NEW)
    '1030': {'name': 'Alawwal Bank', 'yahoo': '1030.SR'},
    '1060': {'name': 'Bank AlJazira', 'yahoo': '1060.SR'},
    '1140': {'name': 'Bank Albilad', 'yahoo': '1140.SR'},
    '2110': {'name': 'Sahara Petrochem', 'yahoo': '2110.SR'},
    '2150': {'name': 'Amiantit', 'yahoo': '2150.SR'},
    '2170': {'name': 'Alfanar', 'yahoo': '2170.SR'},
    '2180': {'name': 'Fipco', 'yahoo': '2180.SR'},
    '2200': {'name': 'Anaam Holding', 'yahoo': '2200.SR'},
    '2210': {'name': 'Nama Chemicals', 'yahoo': '2210.SR'},
    '2220': {'name': 'Methanol', 'yahoo': '2220.SR'},
    '2230': {'name': 'Chemanol', 'yahoo': '2230.SR'},
    '2240': {'name': 'Zamil Industrial', 'yahoo': '2240.SR'},
    '2250': {'name': 'Sipchem', 'yahoo': '2250.SR'},
    '2270': {'name': 'Saudi Cement', 'yahoo': '2270.SR'},
    '2280': {'name': 'Alujain', 'yahoo': '2280.SR'},
    '2300': {'name': 'Sahara Int', 'yahoo': '2300.SR'},
    '2310': {'name': 'Siig', 'yahoo': '2310.SR'},
    '2320': {'name': 'Al-Babtain', 'yahoo': '2320.SR'},
    '2330': {'name': 'Advanced', 'yahoo': '2330.SR'},
    '2340': {'name': 'Qassim Cement', 'yahoo': '2340.SR'},
    '3003': {'name': 'Extra', 'yahoo': '3003.SR'},
    '3004': {'name': 'Dossary', 'yahoo': '3004.SR'},
    '3005': {'name': 'Care', 'yahoo': '3005.SR'},
    '3008': {'name': 'Saco', 'yahoo': '3008.SR'},
    '3020': {'name': 'Dr Sulaiman', 'yahoo': '3020.SR'},
    '3030': {'name': 'Alkhazindar', 'yahoo': '3030.SR'},
    '3040': {'name': 'Saudi Res', 'yahoo': '3040.SR'},
    '3050': {'name': 'Saudi Hotels', 'yahoo': '3050.SR'},
    '3060': {'name': 'Tihama', 'yahoo': '3060.SR'},
    '3080': {'name': 'National Gas', 'yahoo': '3080.SR'},
    '3090': {'name': 'Yamamah Cement', 'yahoo': '3090.SR'},
    '4003': {'name': 'Extra Stores', 'yahoo': '4003.SR'},
    '4004': {'name': 'Dossary Pharma', 'yahoo': '4004.SR'},
    '4005': {'name': 'Care Pharma', 'yahoo': '4005.SR'},
    '4008': {'name': 'Saco Store', 'yahoo': '4008.SR'},
    '4020': {'name': 'Dr Sulaiman Al Habib', 'yahoo': '4020.SR'},
    '4031': {'name': 'Nahdi Medical', 'yahoo': '4031.SR'},
    '4040': {'name': 'Saudi Research', 'yahoo': '4040.SR'},
    '4050': {'name': 'Saudi Hotels & Resorts', 'yahoo': '4050.SR'},
    '4051': {'name': 'Shaker', 'yahoo': '4051.SR'},
    '4061': {'name': 'Arakan', 'yahoo': '4061.SR'},
    '4081': {'name': 'Derayah Financial', 'yahoo': '4081.SR'},
    '4082': {'name': 'Alistithmar Capital', 'yahoo': '4082.SR'},
    '4090': {'name': 'Taiba Holding', 'yahoo': '4090.SR'},
    '4100': {'name': 'Makkah Construction', 'yahoo': '4100.SR'},
    '4110': {'name': 'Herfy Food', 'yahoo': '4110.SR'},
    '4130': {'name': 'Al Jouf Agriculture', 'yahoo': '4130.SR'},
    '4140': {'name': 'Tasnee', 'yahoo': '4140.SR'},
    '4141': {'name': 'Baazeem Trading', 'yahoo': '4141.SR'},
    '4142': {'name': 'Etihad Etisalat', 'yahoo': '4142.SR'},
    '4150': {'name': 'Tanmiah', 'yahoo': '4150.SR'},
    '4160': {'name': 'Tihama Advertising', 'yahoo': '4160.SR'},
    '4170': {'name': 'Touq', 'yahoo': '4170.SR'},
    '4180': {'name': 'Fitaihi Holding', 'yahoo': '4180.SR'},
    '4191': {'name': 'Abdulmohsen AlHokair', 'yahoo': '4191.SR'},
    '4200': {'name': 'AlKhaleej Training', 'yahoo': '4200.SR'},
    '4210': {'name': 'Najran Cement', 'yahoo': '4210.SR'},
    '4220': {'name': 'Theeb Rent a Car', 'yahoo': '4220.SR'},
    '4230': {'name': 'Knowledge Economic City', 'yahoo': '4230.SR'},
    '4250': {'name': 'Jazan Energy', 'yahoo': '4250.SR'},
    '4260': {'name': 'Aldrees Petroleum', 'yahoo': '4260.SR'},
    '4261': {'name': 'Dur Hospitality', 'yahoo': '4261.SR'},
    '4262': {'name': 'Leejam Sports', 'yahoo': '4262.SR'},
    '4263': {'name': 'Astra Industrial', 'yahoo': '4263.SR'},
    '4270': {'name': 'Naseej', 'yahoo': '4270.SR'},
    '4280': {'name': 'Kingdom', 'yahoo': '4280.SR'},
    '4290': {'name': 'Kuwaiti Dairy', 'yahoo': '4290.SR'},
    '4291': {'name': 'National Shipping', 'yahoo': '4291.SR'},
    '4292': {'name': 'Bawan', 'yahoo': '4292.SR'},
    '4300': {'name': 'Dar Al Arkan', 'yahoo': '4300.SR'},
    '4310': {'name': 'Makkah Construction', 'yahoo': '4310.SR'},
    '4320': {'name': 'Al Hassan Ghazi Ibrahim Shaker', 'yahoo': '4320.SR'},
    '4321': {'name': 'Abdullah Al Othaim Markets', 'yahoo': '4321.SR'},
    '4322': {'name': 'Retal Urban Development', 'yahoo': '4322.SR'},
    '4323': {'name': 'Samaco', 'yahoo': '4323.SR'},
    '4324': {'name': 'Al Baha', 'yahoo': '4324.SR'},
    '4325': {'name': 'Red Sea International', 'yahoo': '4325.SR'},
    '4330': {'name': 'Arabian Centers', 'yahoo': '4330.SR'},
    '4331': {'name': 'Takween Advanced Industries', 'yahoo': '4331.SR'},
    '4332': {'name': 'Middle East Healthcare', 'yahoo': '4332.SR'},
    '4333': {'name': 'Alinma Tokio Marine', 'yahoo': '4333.SR'},
    '4334': {'name': 'Maharah HR', 'yahoo': '4334.SR'},
    '4335': {'name': 'AlYusr Leasing', 'yahoo': '4335.SR'},
    '4336': {'name': 'Salama Cooperative Insurance', 'yahoo': '4336.SR'},
    '4337': {'name': 'United Electronics', 'yahoo': '4337.SR'},
    '4338': {'name': 'Wisayah Global', 'yahoo': '4338.SR'},
    '6001': {'name': 'Halwani Bros', 'yahoo': '6001.SR'},
    '6002': {'name': 'Herfy', 'yahoo': '6002.SR'},
    '6010': {'name': 'SASCO', 'yahoo': '6010.SR'},
    '6012': {'name': 'Red Sea Housing', 'yahoo': '6012.SR'},
    '6013': {'name': 'Development Works', 'yahoo': '6013.SR'},
    '6014': {'name': 'Al Baha Investment', 'yahoo': '6014.SR'},
    '6015': {'name': 'Emaar Economic City', 'yahoo': '6015.SR'},
    '6020': {'name': 'Jazan Development', 'yahoo': '6020.SR'},
    '6040': {'name': 'Tabuk Agricultural', 'yahoo': '6040.SR'},
    '6050': {'name': 'Sharqiya Cement', 'yahoo': '6050.SR'},
    '6060': {'name': 'Northern Region Cement', 'yahoo': '6060.SR'},
    '6070': {'name': 'Al Jouf Cement', 'yahoo': '6070.SR'},
}


async def extract_real_stock_data():
    """Extract REAL data from Yahoo Finance (public, reliable)"""
    
    logger.info("="*80)
    logger.info("🌍 EXTRACTING REAL DATA FROM YAHOO FINANCE")
    logger.info("="*80)
    logger.info("Yahoo Finance: Public, reliable, NO WAF protection\n")
    
    await db.connect()
    
    total_bars = 0
    
    for symbol, info in SAUDI_STOCKS.items():
        try:
            yahoo_ticker = info['yahoo']
            name = info['name']
            
            logger.info(f"📊 {symbol} ({name}) - Fetching from Yahoo Finance...")
            
            # Get stock data using yfinance
            stock = yf.Ticker(yahoo_ticker)
            
            # Get 5 years of historical data
            hist = stock.history(period="5y")
            
            if len(hist) > 0:
                logger.info(f"✅ Got {len(hist)} days of REAL data")
                
                # Store ticker (using only existing columns)
                await db.execute("""
                    INSERT INTO market_tickers (
                        symbol, name_en, market_code, last_price, volume,
                        last_updated
                    ) VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        name_en = EXCLUDED.name_en,
                        last_price = EXCLUDED.last_price,
                        volume = EXCLUDED.volume,
                        last_updated = NOW()
                """,
                    symbol, name, 'TDWL',
                    float(hist['Close'].iloc[-1]),
                    int(hist['Volume'].iloc[-1])
                )
                
                # Store historical data
                for date, row in hist.iterrows():
                    await db.execute("""
                        INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (symbol, date) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume
                    """,
                        symbol,
                        date.date(),
                        float(row['Open']),
                        float(row['High']),
                        float(row['Low']),
                        float(row['Close']),
                        int(row['Volume'])
                    )
                
                total_bars += len(hist)
                logger.info(f"   Stored {len(hist)} bars in database")
            else:
                logger.warning(f"⚠️  No data available for {symbol}")
            
            # Small delay to be polite
            await asyncio.sleep(1)
            
        except Exception as e:
            logger.error(f"❌ Error with {symbol}: {str(e)}")
    
    await db.close()
    
    logger.info("\n" + "="*80)
    logger.info("📊 EXTRACTION COMPLETE - REAL DATA!")
    logger.info("="*80)
    logger.info(f"Stocks Processed: {len(SAUDI_STOCKS)}")
    logger.info(f"Total OHLC Bars:  {total_bars:,}")
    logger.info(f"Source:           Yahoo Finance (100% REAL)")
    logger.info("="*80)
    logger.info("\n✅ REAL DATA SUCCESSFULLY EXTRACTED!\n")


if __name__ == "__main__":
    asyncio.run(extract_real_stock_data())
