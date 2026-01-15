"""
AI Analyst Data Access Functions
================================
Provides full access to 19.2 MILLION datapoints for AI Chat Analyst.
These functions are called by the AI service to answer user queries.
"""

from app.db.session import db
from typing import Optional, List, Dict, Any
import json


# ============================================================
# PRICE DATA ACCESS (ALL INTERVALS)
# ============================================================

async def ai_get_price_data(symbol: str, interval: str = '1d', limit: int = 100) -> Optional[Dict]:
    """
    Get price data for any interval.
    AI can query: 1m, 2m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
    """
    # Map interval to table
    table_map = {
        '1m': 'intraday_1m',
        '2m': 'intraday_2m',
        '5m': 'intraday_5m',
        '15m': 'intraday_15m',
        '30m': 'intraday_30m',
        '1h': 'intraday_1h',
        '1d': 'ohlc_data',
        '1wk': 'weekly_ohlc',
        '1mo': 'monthly_ohlc',
    }
    
    table = table_map.get(interval, 'ohlc_data')
    
    if table == 'ohlc_data':
        query = f"""
            SELECT date as timestamp, open, high, low, close, volume
            FROM {table}
            WHERE symbol = $1
            ORDER BY date DESC
            LIMIT $2
        """
    else:
        query = f"""
            SELECT timestamp, open, high, low, close, volume
            FROM {table}
            WHERE symbol = $1
            ORDER BY timestamp DESC
            LIMIT $2
        """
    
    try:
        rows = await db.fetch_all(query, symbol, limit)
        if not rows:
            return None
        
        return {
            'symbol': symbol,
            'interval': interval,
            'data_points': len(rows),
            'data': [dict(r) for r in rows],
            '_source': f'table:{table}'
        }
    except Exception as e:
        return None


async def ai_get_price_summary(symbol: str) -> Optional[Dict]:
    """
    Get summary of all available price data for a symbol.
    Tells AI what data is available.
    """
    tables = [
        ('intraday_1m', '1 minute'),
        ('intraday_5m', '5 minute'),
        ('intraday_1h', '1 hour'),
        ('ohlc_data', 'Daily'),
        ('weekly_ohlc', 'Weekly'),
        ('monthly_ohlc', 'Monthly'),
    ]
    
    summary = {'symbol': symbol, 'intervals': {}}
    
    for table, label in tables:
        try:
            if table == 'ohlc_data':
                query = f"SELECT COUNT(*) as cnt, MIN(date) as min_date, MAX(date) as max_date FROM {table} WHERE symbol = $1"
            else:
                query = f"SELECT COUNT(*) as cnt, MIN(timestamp) as min_date, MAX(timestamp) as max_date FROM {table} WHERE symbol = $1"
            
            row = await db.fetch_one(query, symbol)
            if row and row['cnt'] > 0:
                summary['intervals'][label] = {
                    'records': row['cnt'],
                    'from': str(row['min_date']),
                    'to': str(row['max_date'])
                }
        except:
            pass
    
    return summary


# ============================================================
# FINANCIAL DATA ACCESS
# ============================================================

async def ai_get_financials(symbol: str, period_type: str = 'annual', limit: int = 10) -> Optional[Dict]:
    """
    Get comprehensive financial data.
    period_type: 'annual' or 'quarterly'
    """
    query = """
        SELECT as_of_date, period_type, total_revenue, gross_profit, 
               operating_income, net_income, ebitda, basic_eps,
               total_assets, total_liabilities, total_equity, total_debt,
               cash_and_equivalents, operating_cash_flow, free_cash_flow
        FROM financial_history
        WHERE symbol = $1 AND period_type = $2
        ORDER BY as_of_date DESC
        LIMIT $3
    """
    
    try:
        rows = await db.fetch_all(query, symbol, period_type, limit)
        if not rows:
            return None
        
        return {
            'symbol': symbol,
            'period_type': period_type,
            'periods': len(rows),
            'data': [dict(r) for r in rows],
            '_source': 'table:financial_history'
        }
    except Exception as e:
        return None


async def ai_get_income_statement(symbol: str, periods: int = 5) -> Optional[Dict]:
    """Simplified income statement for AI analysis"""
    query = """
        SELECT as_of_date, period_type, total_revenue, gross_profit, 
               operating_income, net_income, ebitda, basic_eps
        FROM financial_history
        WHERE symbol = $1
        ORDER BY as_of_date DESC
        LIMIT $2
    """
    
    try:
        rows = await db.fetch_all(query, symbol, periods)
        return {'symbol': symbol, 'income_data': [dict(r) for r in rows]} if rows else None
    except:
        return None


async def ai_get_balance_sheet(symbol: str, periods: int = 5) -> Optional[Dict]:
    """Balance sheet summary for AI analysis"""
    query = """
        SELECT as_of_date, period_type, total_assets, total_liabilities, 
               total_equity, total_debt, cash_and_equivalents
        FROM financial_history
        WHERE symbol = $1
        ORDER BY as_of_date DESC
        LIMIT $2
    """
    
    try:
        rows = await db.fetch_all(query, symbol, periods)
        return {'symbol': symbol, 'balance_data': [dict(r) for r in rows]} if rows else None
    except:
        return None


# ============================================================
# VALUATION HISTORY ACCESS (UNIQUE DATA)
# ============================================================

async def ai_get_valuation_history(symbol: str, limit: int = 20) -> Optional[Dict]:
    """
    Get historical valuation metrics.
    Shows how P/E, P/B, EV/EBITDA changed over time.
    """
    query = """
        SELECT as_of_date, pe_ratio, forward_pe, pb_ratio, ps_ratio,
               peg_ratio, ev_ebitda, market_cap, enterprise_value
        FROM valuation_history
        WHERE symbol = $1
        ORDER BY as_of_date DESC
        LIMIT $2
    """
    
    try:
        rows = await db.fetch_all(query, symbol, limit)
        if not rows:
            return None
        
        return {
            'symbol': symbol,
            'quarters': len(rows),
            'data': [dict(r) for r in rows],
            '_insight': 'Historical valuation allows trend analysis of P/E, P/B over time'
        }
    except Exception as e:
        return None


async def ai_compare_valuations(symbols: List[str]) -> Optional[Dict]:
    """Compare current valuations across multiple stocks"""
    results = {}
    
    for symbol in symbols[:10]:  # Max 10 stocks
        query = """
            SELECT pe_ratio, pb_ratio, ev_ebitda, market_cap
            FROM valuation_history
            WHERE symbol = $1
            ORDER BY as_of_date DESC
            LIMIT 1
        """
        try:
            row = await db.fetch_one(query, symbol)
            if row:
                results[symbol] = dict(row)
        except:
            pass
    
    return {'comparison': results} if results else None


# ============================================================
# CORPORATE EVENTS ACCESS
# ============================================================

async def ai_get_corporate_events(symbol: str, limit: int = 20) -> Optional[Dict]:
    """Get corporate events timeline"""
    query = """
        SELECT event_date, event_type, headline, description
        FROM corporate_events
        WHERE symbol = $1
        ORDER BY event_date DESC
        LIMIT $2
    """
    
    try:
        rows = await db.fetch_all(query, symbol, limit)
        return {'symbol': symbol, 'events': [dict(r) for r in rows]} if rows else None
    except:
        return None


# ============================================================
# DIVIDEND & SPLIT HISTORY
# ============================================================

async def ai_get_dividend_history(symbol: str) -> Optional[Dict]:
    """Get complete dividend history"""
    query = """
        SELECT ex_date, dividend_amount
        FROM dividend_history
        WHERE symbol = $1
        ORDER BY ex_date DESC
    """
    
    try:
        rows = await db.fetch_all(query, symbol)
        if not rows:
            return {'symbol': symbol, 'dividends': [], 'message': 'No dividend history found'}
        
        total_divs = sum(r['dividend_amount'] for r in rows if r['dividend_amount'])
        
        return {
            'symbol': symbol,
            'total_dividends': len(rows),
            'total_paid': float(total_divs),
            'history': [dict(r) for r in rows]
        }
    except:
        return None


async def ai_get_split_history(symbol: str) -> Optional[Dict]:
    """Get stock split history"""
    query = """
        SELECT split_date, split_ratio
        FROM split_history
        WHERE symbol = $1
        ORDER BY split_date DESC
    """
    
    try:
        rows = await db.fetch_all(query, symbol)
        return {'symbol': symbol, 'splits': [dict(r) for r in rows]} if rows else None
    except:
        return None


# ============================================================
# EARNINGS HISTORY
# ============================================================

async def ai_get_earnings_history(symbol: str, limit: int = 10) -> Optional[Dict]:
    """Get earnings history with surprises"""
    query = """
        SELECT earnings_date, eps_estimate, eps_actual, surprise_percent
        FROM earnings_history
        WHERE symbol = $1
        ORDER BY earnings_date DESC
        LIMIT $2
    """
    
    try:
        rows = await db.fetch_all(query, symbol, limit)
        if not rows:
            return None
        
        # Calculate beat rate
        beats = sum(1 for r in rows if r['surprise_percent'] and r['surprise_percent'] > 0)
        beat_rate = (beats / len(rows)) * 100 if rows else 0
        
        return {
            'symbol': symbol,
            'earnings_count': len(rows),
            'beat_rate': f"{beat_rate:.0f}%",
            'history': [dict(r) for r in rows]
        }
    except:
        return None


# ============================================================
# COMPREHENSIVE DATA STATISTICS
# ============================================================

async def ai_get_data_statistics() -> Dict:
    """
    Get statistics about all available data.
    Helps AI understand what data is available to answer questions.
    """
    stats = {
        'total_datapoints': 0,
        'tables': {}
    }
    
    table_queries = [
        ('ohlc_data', 'Daily price history', 'SELECT COUNT(*) as cnt FROM ohlc_data'),
        ('intraday_1m', '1-minute intraday', 'SELECT COUNT(*) as cnt FROM intraday_1m'),
        ('intraday_5m', '5-minute intraday', 'SELECT COUNT(*) as cnt FROM intraday_5m'),
        ('intraday_1h', '1-hour intraday', 'SELECT COUNT(*) as cnt FROM intraday_1h'),
        ('financial_history', 'Financial statements', 'SELECT COUNT(*) as cnt FROM financial_history'),
        ('valuation_history', 'Valuation metrics', 'SELECT COUNT(*) as cnt FROM valuation_history'),
        ('corporate_events', 'Corporate events', 'SELECT COUNT(*) as cnt FROM corporate_events'),
        ('dividend_history', 'Dividend history', 'SELECT COUNT(*) as cnt FROM dividend_history'),
        ('earnings_history', 'Earnings history', 'SELECT COUNT(*) as cnt FROM earnings_history'),
        ('market_tickers', 'Stock tickers', 'SELECT COUNT(*) as cnt FROM market_tickers'),
    ]
    
    for table, desc, query in table_queries:
        try:
            row = await db.fetch_one(query)
            count = row['cnt'] if row else 0
            stats['tables'][table] = {'description': desc, 'records': count}
            stats['total_datapoints'] += count
        except:
            stats['tables'][table] = {'description': desc, 'records': 0}
    
    stats['total_million'] = f"{stats['total_datapoints'] / 1_000_000:.2f}M"
    
    return stats


async def ai_can_answer(question: str) -> Dict:
    """
    Tell AI what data is available to answer a question.
    Returns available data types for the mentioned symbols.
    """
    import re
    
    # Extract 4-digit symbols
    symbols = re.findall(r'\b\d{4}\b', question)
    
    if not symbols:
        return {'message': 'No stock symbols detected in question'}
    
    available_data = {}
    
    for symbol in symbols[:5]:
        symbol_data = {'available': []}
        
        # Check each data type
        checks = [
            ('ohlc_data', 'Daily prices', f"SELECT COUNT(*) as cnt FROM ohlc_data WHERE symbol = '{symbol}'"),
            ('financial_history', 'Financial statements', f"SELECT COUNT(*) as cnt FROM financial_history WHERE symbol = '{symbol}'"),
            ('valuation_history', 'Valuation history', f"SELECT COUNT(*) as cnt FROM valuation_history WHERE symbol = '{symbol}'"),
            ('dividend_history', 'Dividends', f"SELECT COUNT(*) as cnt FROM dividend_history WHERE symbol = '{symbol}'"),
        ]
        
        for table, desc, query in checks:
            try:
                row = await db.fetch_one(query)
                if row and row['cnt'] > 0:
                    symbol_data['available'].append(f"{desc} ({row['cnt']} records)")
            except:
                pass
        
        available_data[symbol] = symbol_data
    
    return {'symbols': available_data}
