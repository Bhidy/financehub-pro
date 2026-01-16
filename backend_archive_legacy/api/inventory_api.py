"""
DATABASE INVENTORY API
Provides comprehensive stats for the Command Center dashboard
"""

from fastapi import APIRouter
import asyncpg
from datetime import datetime

router = APIRouter()

DB_DSN = "postgresql://home@localhost/mubasher_db"

@router.get("/api/inventory")
async def get_inventory():
    """Get comprehensive database inventory statistics"""
    conn = await asyncpg.connect(DB_DSN)
    
    try:
        inventory = {
            "generated_at": datetime.now().isoformat(),
            "sections": {}
        }
        
        # 1. STOCKS OVERVIEW
        stock_count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
        stocks_with_data = await conn.fetchval("""
            SELECT COUNT(DISTINCT symbol) FROM ohlc_data
        """)
        inventory["sections"]["stocks"] = {
            "title": "Stock Tickers",
            "icon": "📈",
            "total": stock_count,
            "with_data": stocks_with_data,
            "coverage": round((stocks_with_data / stock_count * 100) if stock_count else 0, 1)
        }
        
        # 2. OHLC HISTORY
        ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data")
        ohlc_range = await conn.fetchrow("SELECT MIN(date), MAX(date) FROM ohlc_data")
        inventory["sections"]["ohlc_history"] = {
            "title": "Historical OHLC",
            "icon": "📊",
            "total_rows": ohlc_count,
            "date_range": {
                "from": str(ohlc_range[0]) if ohlc_range else None,
                "to": str(ohlc_range[1]) if ohlc_range else None
            },
            "data_points": ohlc_count * 5  # OHLCV
        }
        
        # 3. INTRADAY DATA
        intra_count = await conn.fetchval("SELECT COUNT(*) FROM intraday_data")
        intra_symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM intraday_data")
        inventory["sections"]["intraday"] = {
            "title": "Intraday Data",
            "icon": "⏱️",
            "total_rows": intra_count,
            "unique_symbols": intra_symbols,
            "data_points": intra_count * 5
        }
        
        # 4. FINANCIAL STATEMENTS
        stmt_count = await conn.fetchval("SELECT COUNT(*) FROM financial_statements")
        stmt_breakdown = await conn.fetch("""
            SELECT period_type, COUNT(*) as cnt 
            FROM financial_statements 
            GROUP BY period_type ORDER BY period_type
        """)
        inventory["sections"]["financials"] = {
            "title": "Financial Statements",
            "icon": "📑",
            "total_rows": stmt_count,
            "breakdown": {r['period_type']: r['cnt'] for r in stmt_breakdown},
            "data_points": stmt_count * 10
        }
        
        # 5. MUTUAL FUNDS
        fund_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
        funds_with_metrics = await conn.fetchval("""
            SELECT COUNT(*) FROM mutual_funds WHERE sharpe_ratio IS NOT NULL
        """)
        inventory["sections"]["mutual_funds"] = {
            "title": "Mutual Funds",
            "icon": "💼",
            "total": fund_count,
            "with_risk_metrics": funds_with_metrics,
            "coverage": round((funds_with_metrics / fund_count * 100) if fund_count else 0, 1)
        }
        
        # 6. NAV HISTORY
        nav_count = await conn.fetchval("SELECT COUNT(*) FROM nav_history")
        nav_range = await conn.fetchrow("SELECT MIN(date), MAX(date) FROM nav_history")
        inventory["sections"]["nav_history"] = {
            "title": "Fund NAV History",
            "icon": "📈",
            "total_rows": nav_count,
            "date_range": {
                "from": str(nav_range[0]) if nav_range else None,
                "to": str(nav_range[1]) if nav_range else None
            },
            "data_points": nav_count * 2
        }
        
        # 7. MAJOR SHAREHOLDERS
        sh_count = await conn.fetchval("SELECT COUNT(*) FROM major_shareholders")
        sh_symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM major_shareholders")
        inventory["sections"]["shareholders"] = {
            "title": "Major Shareholders",
            "icon": "👥",
            "total_rows": sh_count,
            "unique_stocks": sh_symbols
        }
        
        # 8. EARNINGS CALENDAR
        earn_count = await conn.fetchval("SELECT COUNT(*) FROM earnings_calendar")
        earn_symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM earnings_calendar")
        inventory["sections"]["earnings"] = {
            "title": "Earnings Calendar",
            "icon": "📅",
            "total_rows": earn_count,
            "unique_stocks": earn_symbols
        }
        
        # 9. CORPORATE ACTIONS
        try:
            corp_count = await conn.fetchval("SELECT COUNT(*) FROM corporate_actions")
            inventory["sections"]["corporate_actions"] = {
                "title": "Corporate Actions",
                "icon": "📋",
                "total_rows": corp_count
            }
        except:
            inventory["sections"]["corporate_actions"] = {"title": "Corporate Actions", "icon": "📋", "total_rows": 0}
        
        # 10. FINANCIAL RATIOS
        try:
            ratio_count = await conn.fetchval("SELECT COUNT(*) FROM financial_ratios")
            inventory["sections"]["ratios"] = {
                "title": "Financial Ratios",
                "icon": "📐",
                "total_rows": ratio_count
            }
        except:
            inventory["sections"]["ratios"] = {"title": "Financial Ratios", "icon": "📐", "total_rows": 0}
        
        # 11. SECTOR CLASSIFICATION
        try:
            sector_count = await conn.fetchval("SELECT COUNT(*) FROM sector_classification")
            inventory["sections"]["sectors"] = {
                "title": "Sector Classification",
                "icon": "🏭",
                "total_rows": sector_count
            }
        except:
            inventory["sections"]["sectors"] = {"title": "Sector Classification", "icon": "🏭", "total_rows": 0}
        
        # 12. FAIR VALUES
        try:
            fv_count = await conn.fetchval("SELECT COUNT(*) FROM fair_values")
            inventory["sections"]["fair_values"] = {
                "title": "Fair Values",
                "icon": "💰",
                "total_rows": fv_count
            }
        except:
            inventory["sections"]["fair_values"] = {"title": "Fair Values", "icon": "💰", "total_rows": 0}
        
        # AGGREGATE METRICS
        total_data_points = (
            inventory["sections"]["ohlc_history"]["data_points"] +
            inventory["sections"]["intraday"]["data_points"] +
            inventory["sections"]["financials"]["data_points"] +
            inventory["sections"]["nav_history"]["data_points"] +
            inventory["sections"]["shareholders"]["total_rows"] * 3 +
            inventory["sections"]["earnings"]["total_rows"] * 5
        )
        
        inventory["aggregate"] = {
            "total_data_points": total_data_points,
            "total_stocks": stock_count,
            "total_funds": fund_count,
            "total_tables": 12,
            "database_health": "EXCELLENT" if total_data_points > 2000000 else "GOOD"
        }
        
        return inventory
        
    finally:
        await conn.close()
