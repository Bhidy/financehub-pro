
import asyncio
import os
import asyncpg
from datetime import date, datetime, timedelta

# Sample Data for Flagship Stocks
STOCKS = {
    'COMI': {
        'price': 85.50, 'sector': 'Financial Services',
        'fair_value': [
            {'model': 'DCF Growth (5Y)', 'value': 102.40, 'upside': 19.7},
            {'model': 'P/E Multiplier', 'value': 94.20, 'upside': 10.1},
            {'model': 'Dividend Discount', 'value': 88.00, 'upside': 2.9}
        ],
        'technicals': {
            'rsi': 62.5, 'macd_line': 1.25, 'macd_sig': 0.95, 'macd_hist': 0.30,
            'pivot': 84.80,
            'support': [82.50, 80.00, 78.50],
            'resistance': [87.00, 89.50, 92.00],
            'sma_50': 81.20, 'sma_200': 76.40
        },
        'shareholders': [
            {'name': 'National Bank of Egypt', 'name_en': 'National Bank of Egypt', 'pct': 18.5, 'shares': 500000000},
            {'name': 'BlackRock Inc.', 'name_en': 'BlackRock Inc.', 'pct': 5.2, 'shares': 140000000},
            {'name': 'Vanguard Group', 'name_en': 'Vanguard Group', 'pct': 3.1, 'shares': 83000000}
        ],
        'health': {
            'debt_equity': 1.2, 'current': 1.5, 'int_cov': 8.5,
            'roe': 22.4, 'roa': 3.1, 'net_margin': 28.5,
            'pe': 8.5, 'pb': 1.8, 'ev_ebitda': 6.2
        }
    },
    'SWDY': {
        'price': 34.20, 'sector': 'Industrials',
        'fair_value': [
            {'model': 'DCF Growth (10Y)', 'value': 45.00, 'upside': 31.5},
            {'model': 'P/E Multiplier', 'value': 38.50, 'upside': 12.6},
            {'model': 'Graham Number', 'value': 42.10, 'upside': 23.1}
        ],
        'technicals': {
            'rsi': 45.2, 'macd_line': -0.15, 'macd_sig': -0.10, 'macd_hist': -0.05,
            'pivot': 34.50,
            'support': [32.80, 31.50, 30.00],
            'resistance': [35.40, 36.80, 38.00],
            'sma_50': 35.10, 'sma_200': 32.50
        },
        'shareholders': [
            {'name': 'Ahmed El Sewedy', 'name_en': 'Ahmed El Sewedy', 'pct': 25.4, 'shares': 540000000},
            {'name': 'Sadiq El Sewedy', 'name_en': 'Sadiq El Sewedy', 'pct': 25.4, 'shares': 540000000},
            {'name': 'Norges Bank', 'name_en': 'Norges Bank', 'pct': 2.1, 'shares': 44000000}
        ],
        'health': {
            'debt_equity': 0.8, 'current': 1.8, 'int_cov': 12.4,
            'roe': 18.5, 'roa': 9.2, 'net_margin': 14.5,
            'pe': 9.8, 'pb': 2.1, 'ev_ebitda': 7.4
        }
    },
    '2222': {
        'price': 28.50, 'sector': 'Energy',
        'fair_value': [
            {'model': 'DCF Growth', 'value': 32.40, 'upside': 13.6},
            {'model': 'Dividend Yield Model', 'value': 30.00, 'upside': 5.2}
        ],
        'technicals': {
            'rsi': 55.0, 'macd_line': 0.5, 'macd_sig': 0.4, 'macd_hist': 0.1,
            'pivot': 28.2,
            'support': [27.5, 26.8, 26.0],
            'resistance': [29.0, 29.8, 30.5],
            'sma_50': 27.8, 'sma_200': 31.2
        },
         'shareholders': [
            {'name': 'PIF', 'name_en': 'Public Investment Fund', 'pct': 8.0, 'shares': 16000000000},
            {'name': 'Government', 'name_en': 'Government of Saudi Arabia', 'pct': 82.0, 'shares': 164000000000}
        ],
        'health': {
            'debt_equity': 0.3, 'current': 2.1, 'int_cov': 25.0,
            'roe': 28.5, 'roa': 14.2, 'net_margin': 22.5,
            'pe': 15.4, 'pb': 4.2, 'ev_ebitda': 8.5
        }
    }
}

async def populate():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("Set DATABASE_URL")
        return

    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    print("Connected to DB...")

    today = date.today()

    for sym, data in STOCKS.items():
        print(f"Processing {sym}...")
        
        # 1. Technicals
        t = data['technicals']
        await conn.execute("""
            INSERT INTO technical_levels (
                symbol, calc_date, rsi_14, macd_line, macd_signal, macd_histogram,
                pivot_point, support_1, support_2, support_3,
                resistance_1, resistance_2, resistance_3,
                sma_50, sma_200
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (symbol, calc_date) DO UPDATE SET
                rsi_14 = EXCLUDED.rsi_14,
                pivot_point = EXCLUDED.pivot_point
        """, sym, today, t['rsi'], t['macd_line'], t['macd_sig'], t['macd_hist'],
             t['pivot'], t['support'][0], t['support'][1], t['support'][2],
             t['resistance'][0], t['resistance'][1], t['resistance'][2],
             t['sma_50'], t['sma_200'])

        # 2. Fair Values
        for fv in data['fair_value']:
            await conn.execute("""
                INSERT INTO fair_values (
                    symbol, valuation_model, valuation_date, fair_value, current_price, upside_percent
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (symbol, valuation_model, valuation_date) DO UPDATE SET
                    fair_value = EXCLUDED.fair_value
            """, sym, fv['model'], today, fv['value'], data['price'], fv['upside'])

        # 3. Financial Health
        h = data['health']
        await conn.execute("""
            INSERT INTO financial_ratios_extended (
                symbol, fiscal_year, period_type,
                pe_ratio, pb_ratio, ev_ebitda,
                debt_to_equity, current_ratio, interest_coverage,
                roe, roa, net_margin
            ) VALUES ($1, $2, 'FY', $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (symbol, fiscal_year, period_type) DO UPDATE SET
                pe_ratio = EXCLUDED.pe_ratio
        """, sym, 2024, h['pe'], h['pb'], h['ev_ebitda'], 
             h['debt_equity'], h['current'], h['int_cov'],
             h['roe'], h['roa'], h['net_margin'])
        
        # 4. Shareholders
        for sh in data['shareholders']:
             await conn.execute("""
                INSERT INTO major_shareholders (
                    symbol, shareholder_name, shareholder_name_en, ownership_percent, shares_held, as_of_date
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (symbol, shareholder_name, as_of_date) DO NOTHING
            """, sym, sh['name'], sh['name_en'], sh['pct'], sh['shares'], today)

    print("Done! Expert data populated.")
    await conn.close()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(populate())
