#!/usr/bin/env python3
"""
Insert extracted EGX watchlist data into database.
"""

import asyncio
import asyncpg
import os
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require')

# Extracted data from Rubix Mubasher
STOCKS_DATA = [
    {"symbol":"JUFO","desc":"Juhayna","last":"26.86","change":"0.86","pct":"3.31","bid":"26.85","ask":"26.86","bidQty":"214","askQty":"3,300","volume":"4,319,481","trades":"4650"},
    {"symbol":"ELEC","desc":"Electro Cable","last":"3.00","change":"-0.17","pct":"-5.36","bid":"2.99","ask":"3.02","bidQty":"2,251","askQty":"800","volume":"54,793,412","trades":"4389"},
    {"symbol":"KRDI","desc":"Al Khair River For Development Agricultural Investment","last":"0.669","change":"0.038","pct":"6.02","bid":"0.664","ask":"0.669","bidQty":"52,942","askQty":"48,100","volume":"237,341,887","trades":"4286"},
    {"symbol":"ETEL","desc":"Telecom Egypt","last":"68.72","change":"3.47","pct":"5.32","bid":"68.72","ask":"69.51","bidQty":"1,090","askQty":"5","volume":"3,159,769","trades":"3892"},
    {"symbol":"ABUK","desc":"Abou Kir Fertilizers","last":"52.23","change":"1.73","pct":"3.43","bid":"52.10","ask":"52.23","bidQty":"55","askQty":"500","volume":"2,821,271","trades":"3598"},
    {"symbol":"EGAL","desc":"Egypt Aluminum","last":"255.01","change":"-16.00","pct":"-5.90","bid":"255.01","ask":"260.00","bidQty":"2,343","askQty":"350","volume":"395,118","trades":"3494"},
    {"symbol":"PHDC","desc":"PHDC","last":"8.20","change":"-0.17","pct":"-2.03","bid":"8.18","ask":"8.20","bidQty":"1,653","askQty":"10,499","volume":"7,044,647","trades":"3316"},
    {"symbol":"LUTS","desc":"Lotus For Agricultural Investments And Development","last":"0.644","change":"0.014","pct":"2.22","bid":"0.643","ask":"0.650","bidQty":"107,954","askQty":"83,977","volume":"144,693,486","trades":"3182"},
    {"symbol":"ATQA","desc":"Ataqa","last":"10.03","change":"-0.14","pct":"-1.38","bid":"10.02","ask":"10.20","bidQty":"1,000","askQty":"12,000","volume":"10,352,149","trades":"2960"},
    {"symbol":"ORAS","desc":"Orascom Construction","last":"420.01","change":"-10.24","pct":"-2.38","bid":"420.01","ask":"423.00","bidQty":"1,488","askQty":"50","volume":"351,253","trades":"2895"},
    {"symbol":"COMI","desc":"CIB","last":"104.30","change":"1.29","pct":"1.25","bid":"104.30","ask":"105.49","bidQty":"3,188","askQty":"455","volume":"3,729,539","trades":"2886"},
    {"symbol":"MFPC","desc":"MOPCO","last":"30.22","change":"0.22","pct":"0.73","bid":"30.10","ask":"30.27","bidQty":"2,569","askQty":"100","volume":"912,579","trades":"2672"},
    {"symbol":"HRHO","desc":"EFG Holding","last":"25.61","change":"0.88","pct":"3.56","bid":"25.61","ask":"25.70","bidQty":"7,746","askQty":"2,157","volume":"7,508,541","trades":"2551"},
    {"symbol":"SVCE","desc":"South Valley Cement","last":"9.33","change":"-0.32","pct":"-3.32","bid":"9.33","ask":"9.36","bidQty":"1,640","askQty":"4,018","volume":"9,381,856","trades":"2490"},
    {"symbol":"ANFI","desc":"Alexandria National Company for Financial Investment","last":"92.51","change":"6.52","pct":"7.58","bid":"99.00","ask":"92.99","bidQty":"312","askQty":"5","volume":"652,744","trades":"2449"},
    {"symbol":"FWRY","desc":"Fawry","last":"15.70","change":"0","pct":"0","bid":"15.68","ask":"15.80","bidQty":"441","askQty":"13,658","volume":"4,750,445","trades":"2419"},
    {"symbol":"TMGH","desc":"TMG Holding","last":"77.72","change":"-0.13","pct":"-0.17","bid":"77.70","ask":"77.98","bidQty":"30","askQty":"400","volume":"1,687,188","trades":"2378"},
    {"symbol":"ACAMD","desc":"Arab Co. for Asset Management And Development","last":"1.85","change":"-0.11","pct":"-5.61","bid":"1.85","ask":"1.91","bidQty":"344,705","askQty":"1,044","volume":"59,678,130","trades":"2372"},
    {"symbol":"SIPC","desc":"Sabaa","last":"3.71","change":"-0.27","pct":"-6.78","bid":"3.70","ask":"3.83","bidQty":"8,248","askQty":"1,111","volume":"17,123,560","trades":"2237"},
    {"symbol":"PRMH","desc":"Prime Holding","last":"1.800","change":"0.140","pct":"8.43","bid":"1.790","ask":"1.850","bidQty":"102,961","askQty":"8,000","volume":"55,159,954","trades":"2145"},
    {"symbol":"AIFI","desc":"Atlas","last":"2.10","change":"-0.15","pct":"-6.67","bid":"2.10","ask":"2.11","bidQty":"32,551","askQty":"351","volume":"15,418,243","trades":"2089"},
    {"symbol":"SWDY","desc":"Elsewedy Electric","last":"80.50","change":"1.54","pct":"1.95","bid":"80.40","ask":"80.50","bidQty":"1,039","askQty":"825","volume":"803,940","trades":"1981"},
    {"symbol":"BTFH","desc":"Beltone Holding","last":"3.14","change":"-0.12","pct":"-3.68","bid":"3.13","ask":"3.20","bidQty":"32,875","askQty":"55,600","volume":"49,720,166","trades":"1717"},
    {"symbol":"ADIB","desc":"Abu Dhabi Islamic Bank","last":"29.77","change":"1.03","pct":"3.58","bid":"29.38","ask":"29.77","bidQty":"400","askQty":"884","volume":"2,629,806","trades":"1713"},
    {"symbol":"EFID","desc":"Edita","last":"28.50","change":"-0.10","pct":"-0.35","bid":"28.45","ask":"28.50","bidQty":"440","askQty":"6,900","volume":"4,197,101","trades":"1636"},
    {"symbol":"RREI","desc":"ALICO","last":"3.12","change":"-0.02","pct":"-0.64","bid":"3.12","ask":"3.15","bidQty":"21,487","askQty":"13,000","volume":"19,277,082","trades":"1586"},
    {"symbol":"ORHD","desc":"Orascom Development Egypt","last":"23.30","change":"-0.49","pct":"-2.06","bid":"23.28","ask":"23.50","bidQty":"800","askQty":"1,640","volume":"3,026,754","trades":"1508"},
    {"symbol":"MPCI","desc":"Memphis Pharmaceutical","last":"148.97","change":"-2.03","pct":"-1.34","bid":"148.90","ask":"148.97","bidQty":"208","askQty":"59","volume":"219,736","trades":"1498"},
    {"symbol":"OBRI","desc":"El Obour Real Estate Investment","last":"41.00","change":"-1.22","pct":"-2.89","bid":"40.60","ask":"42.67","bidQty":"20","askQty":"300","volume":"783,426","trades":"1449"},
    {"symbol":"TANM","desc":"Tanmiya for Real Estate Investment","last":"5.08","change":"0.23","pct":"4.74","bid":"5.03","ask":"5.12","bidQty":"12,000","askQty":"23,000","volume":"7,691,172","trades":"1433"},
    {"symbol":"UNIP","desc":"Unipack","last":"0.308","change":"0.008","pct":"2.67","bid":"0.308","ask":"0.309","bidQty":"451,648","askQty":"873,250","volume":"113,352,410","trades":"1391"},
    {"symbol":"MPCO","desc":"Mansourah Poultry","last":"1.700","change":"-0.020","pct":"-1.16","bid":"1.700","ask":"1.710","bidQty":"22,434","askQty":"10,000","volume":"23,498,480","trades":"1379"},
    {"symbol":"RAYA","desc":"Raya","last":"3.70","change":"-0.09","pct":"-2.37","bid":"3.70","ask":"3.71","bidQty":"5,944","askQty":"10,000","volume":"22,009,420","trades":"1329"},
    {"symbol":"ARAB","desc":"ARAB Developers Holding","last":"0.210","change":"0","pct":"0","bid":"0.209","ask":"0.213","bidQty":"2,794,366","askQty":"145,000","volume":"294,363,719","trades":"1305"},
    {"symbol":"EFIH","desc":"E-finance","last":"19.25","change":"0.35","pct":"1.85","bid":"19.20","ask":"19.25","bidQty":"115","askQty":"852","volume":"2,800,504","trades":"1293"},
    {"symbol":"ZEOT","desc":"Extracted Oils","last":"8.66","change":"-0.39","pct":"-4.31","bid":"8.66","ask":"8.86","bidQty":"44,413","askQty":"791","volume":"2,621,129","trades":"1253"}
]


def parse_decimal(val):
    if not val or val in ['--', '-', 'N/A', '']:
        return None
    try:
        return Decimal(str(val).replace(',', '').strip())
    except:
        return None


def parse_int(val):
    if not val or val in ['--', '-', 'N/A', '']:
        return None
    try:
        return int(float(str(val).replace(',', '').strip()))
    except:
        return None


async def main():
    print("🚀 Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("✅ Connected!")
    
    saved = 0
    for stock in STOCKS_DATA:
        try:
            await conn.execute('''
                INSERT INTO egx_watchlist (
                    symbol, description, last_price, change, change_percent,
                    bid, ask, bid_qty, ask_qty, volume, trades, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    description = EXCLUDED.description,
                    last_price = EXCLUDED.last_price,
                    change = EXCLUDED.change,
                    change_percent = EXCLUDED.change_percent,
                    bid = EXCLUDED.bid,
                    ask = EXCLUDED.ask,
                    bid_qty = EXCLUDED.bid_qty,
                    ask_qty = EXCLUDED.ask_qty,
                    volume = EXCLUDED.volume,
                    trades = EXCLUDED.trades,
                    updated_at = NOW()
            ''',
                stock['symbol'],
                stock.get('desc'),
                parse_decimal(stock.get('last')),
                parse_decimal(stock.get('change')),
                parse_decimal(stock.get('pct')),
                parse_decimal(stock.get('bid')),
                parse_decimal(stock.get('ask')),
                parse_int(stock.get('bidQty')),
                parse_int(stock.get('askQty')),
                parse_int(stock.get('volume')),
                parse_int(stock.get('trades'))
            )
            saved += 1
            print(f"✅ {stock['symbol']}: {stock.get('last')} ({stock.get('pct')}%)")
        except Exception as e:
            print(f"❌ {stock['symbol']}: {e}")
    
    await conn.close()
    print(f"\n🎉 Saved {saved}/{len(STOCKS_DATA)} stocks to egx_watchlist!")


if __name__ == "__main__":
    asyncio.run(main())
