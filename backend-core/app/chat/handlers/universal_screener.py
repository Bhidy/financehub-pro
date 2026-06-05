"""
Universal Screener Handler - The "Hands" of the Enterprise Brain.
=================================================================
Handles dynamic SQL generation for complex queries like:
"Cheap industrial stocks with high growth and safe balance sheet"

Maps Natural Language Filters -> Dynamic SQL with Safety Guardrails.
"""

import logging
import asyncpg
from typing import Dict, Any, List, Optional
from ..schemas import ChatResponse, DataCard, CardType

logger = logging.getLogger(__name__)

# Allowed metrics for dynamic queries (SQL Injection Protection)
# Maps API metric name -> DB Column
METRIC_MAP = {
    # Valuation
    "pe": "m.pe_ratio",
    "pe_ratio": "m.pe_ratio",
    "pb": "m.pb_ratio",
    "pb_ratio": "m.pb_ratio",
    "market_cap": "m.market_cap",
    "price": "m.last_price",
    "ev": "s.enterprise_value",
    "ev_ebitda": "s.ev_ebitda",
    "ev_sales": "s.ev_sales",
    "dividend_yield": "m.dividend_yield",
    
    # Efficiency & Profitability
    "roe": "s.roe",
    "roa": "s.roa",
    "roce": "s.roce",
    "gross_margin": "s.gross_margin",
    "operating_margin": "s.operating_margin",
    "net_margin": "s.profit_margin",
    "profit_margin": "s.profit_margin",
    "asset_turnover": "s.asset_turnover",
    
    # Growth
    "revenue_growth": "s.revenue_growth",
    "profit_growth": "s.profit_growth",
    "eps_growth": "s.eps_growth",
    "sales_growth": "s.revenue_growth",
    
    # Health/Safety
    "debt_equity": "s.debt_equity",
    "total_debt": "s.total_debt",
    "current_ratio": "s.current_ratio",
    "quick_ratio": "s.quick_ratio",
    "z_score": "s.altman_z_score",
    "f_score": "s.piotroski_f_score",
    
    # Technical
    "rsi": "s.rsi_14",
    "beta": "s.beta_5y",
    
    # Volume/Liquidity
    "volume": "m.volume",
    "avg_volume": "m.avg_volume_3m",
    "change": "m.change_percent",
    "change_percent": "m.change_percent",
    
    # Raw Fundamentals
    "revenue": "s.revenue_ttm",
    "net_income": "s.net_income_ttm",
    "cash": "s.total_cash",
    "debt": "s.total_debt"
}

OPERATOR_MAP = {
    "gt": ">",
    "lt": "<",
    "gte": ">=",
    "lte": "<=",
    "eq": "="
}

async def handle_universal_screener(
    conn: asyncpg.Connection,
    intent: Any,
    entities: Dict[str, Any],
    language: str
) -> Dict[str, Any]:
    """
    Execute a dynamic screener query based on extracted filters.
    """
    
    # Default parameters
    limit = entities.get('limit', 10)
    market_code = entities.get('market_code', 'EGX')
    filters = entities.get('filters', [])
    sort_by = entities.get('sort_by')
    sector = entities.get('sector')
    
    # Base Query
    # Always join market_tickers (m) and stock_statistics (s)
    # We SELECT essential columns plus whatever dynamic metrics are needed
    select_cols = [
        "m.symbol", "m.name_en", "m.name_ar", "m.last_price", 
        "m.change_percent", "m.market_cap", "m.sector_name", "m.market_code"
    ]
    
    # Identify extra columns needed for Filtering or Sorting
    extra_cols = set()
    
    # Add sort column if valid
    sort_db_col = None
    if sort_by:
        sort_db_col = METRIC_MAP.get(sort_by)
        if sort_db_col:
            extra_cols.add(f"{sort_db_col} as sort_value")
            
    # Add filter columns (if we want to return them, though WHERE doesn't strictly need SELECT)
    # But useful for debugging/proving the filter worked
    for f in filters:
        m_key = f.get('metric')
        col = METRIC_MAP.get(m_key)
        if col:
             # We assume logic doesn't need to return every filter column, 
             # but we MUST return the SORT column to display it.
             pass

    select_clause = ", ".join(select_cols + list(extra_cols))
    
    sql = f"""
        SELECT {select_clause}
        FROM market_tickers m
        LEFT JOIN stock_statistics s ON m.symbol = s.symbol
        WHERE m.market_code = $1
    """
    params = [market_code]
    
    # Apply Sector Filter
    if sector:
        # ROBUST SECTOR MATCHING (Enterprise)
        # 1. Explicit Mappings for common mismatches
        SECTOR_ALIASES = {
            "industrial": "Basic Resources", # Common mapping in EGX
            "industrials": "Basic Resources",
            "medical": "Healthcare",
            "finance": "Financial Services",
            "construction": "Construction & Materials"
        }
        
        # Check alias (case-insensitive)
        alias_target = SECTOR_ALIASES.get(sector.lower().split()[0])
        if alias_target:
            sector = alias_target
            
        # 2. Token-Based Fuzzy Match
        # Split into significant tokens: "Industrial Goods & Services" -> ["Industrial", "Goods", "Services"]
        clean_sector = sector.replace("&", " ").replace(",", " ").replace(" and ", " ")
        tokens = [t for t in clean_sector.split() if len(t) > 2 and t.lower() not in ["the", "for", "and"]]
        
        if tokens:
            # Construct: sector ILIKE '%Token1%' AND sector ILIKE '%Token2%' ...
            for token in tokens:
                params.append(f"%{token}%")
                sql += f" AND m.sector_name ILIKE ${len(params)}"
        else:
            # Fallback for short words
            params.append(f"%{sector}%")
            sql += f" AND m.sector_name ILIKE ${len(params)}"
        
    # Apply Dynamic Filters
    query_description_parts = []
    
    for f in filters:
        metric_key = f.get('metric')
        operator_key = f.get('operator')
        value = f.get('value')
        
        # PERCENTAGE SCALING FIX (Enterprise)
        # If user says "10% margin", Claude sends 10. DB likely stores 0.10.
        # We auto-scale if value is > 1.0 for percentage fields.
        # Columns stored as FRACTIONS (0.20 = 20%): a user threshold like "20" must be
        # scaled to 0.20. dividend_yield / change_percent / change are stored as PERCENT
        # in the DB, so they are intentionally EXCLUDED (scaling them broke yield/change
        # screens — e.g. "yield > 5" became 0.05 and matched everything).
        PERCENTAGE_METRICS = {
            "revenue_growth", "profit_growth", "eps_growth", "sales_growth",
            "gross_margin", "operating_margin", "net_margin", "profit_margin",
            "roe", "roa", "roce", "roic"
        }
        
        if metric_key in PERCENTAGE_METRICS and isinstance(value, (int, float)) and abs(value) > 1.0:
            original_val = value
            value = value / 100.0
            # logger.info(f"Scaled {metric_key}: {original_val} -> {value}")
        
        db_col = METRIC_MAP.get(metric_key)
        sql_op = OPERATOR_MAP.get(operator_key)
        
        if db_col and sql_op and value is not None:
            params.append(value)
            sql += f" AND {db_col} {sql_op} ${len(params)}"
            
            # Build description
            op_human = ">" if "gt" in operator_key else "<" if "lt" in operator_key else "="
            query_description_parts.append(f"{metric_key} {op_human} {value}")
            
    # Apply Sorting
    order_clause = "ORDER BY m.market_cap DESC"  # Default
    
    if sort_db_col:
        # Determine direction (Prompt usually sends direction)
        direction = entities.get('direction', 'desc').lower()
        dir_sql = "ASC" if direction == "asc" else "DESC"
        order_clause = f"ORDER BY sort_value {dir_sql} NULLS LAST"
            
    sql += f" {order_clause}"
    
    # Apply Limit
    params.append(limit)
    sql += f" LIMIT ${len(params)}"
    
    # Execute
    try:
        rows = await conn.fetch(sql, *params)
    except Exception as e:
        logger.error(f"Universal Screener Query Error: {e}")
        return {
            "success": False,
            "error": "query_failed",
            "message": "Sorry, I couldn't execute that specific search."
        }
        
    if not rows:
        msg = "No stocks found matching your criteria." if language == 'en' else "لم يتم العثور على أسهم تطابق معاييرك."
        title = "Screener Results" if language == "en" else "نتائج البحث"
        return {
            "success": True,
            "message": msg,
            "cards": [
                {
                    "type": CardType.SCREENER_RESULTS,
                    "title": title,
                    "data": {
                        "stocks": [],
                        "metric": sort_by or "market_cap",
                        "empty_state": msg,
                    },
                }
            ],
        }

    # Format Results
    stocks = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        
        # Determine "primary metric" to show in card
        # If we sorted by something, show that.
        # Otherwise show market cap or price
        metric_val = 0
        if sort_db_col and 'sort_value' in row:
             metric_val = row['sort_value']
        
        stocks.append({
            "symbol": row['symbol'],
            "name": name,
            "price": float(row['last_price'] or 0),
            "change_percent": float(row['change_percent'] or 0),
            "market_cap": float(row['market_cap'] or 0),
            "value": float(metric_val or 0), # Generic value field for card
            "metric_value": float(metric_val or 0), 
            "metric_label": sort_by or "Price",
            "sector": row['sector_name']  # Added for debugging & UI
        })
        
    title = f"Screener Results"
    if sector:
        title = f"{sector}"
    if sort_by:
        title += f" by {sort_by.replace('_', ' ').title()}"
    
    if language == 'ar':
        title = "نتائج البحث"
        if sector:
            title = f"أسهم {sector}"

    return {
        "success": True,
        "message": f"Found {len(stocks)} stocks.",
        "cards": [
            {
                "type": CardType.SCREENER_RESULTS, # Uses existing ScreenerResults card
                "title": title,
                "data": {
                    "stocks": stocks,
                    "metric": sort_by or "market_cap"
                }
            }
        ],
        "meta": {
             "query_summary": ", ".join(query_description_parts)
        }
    }
