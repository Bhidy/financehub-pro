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
# Maps API metric name -> DB Column.
# TV-ONLY (June-2026 chat realignment): `s` is stock_stats_view (the same
# TradingView-fed view the website reads). Metrics TradingView does not provide
# for EGX (EV/*, ROCE, turnover, D/E, current/quick, Altman, Piotroski, cash,
# 3-month avg volume) were REMOVED — .get() returns None and the filter is
# politely rejected instead of comparing against frozen May-28 values.
# NB units: view margins/ROE/growth are PERCENT values (e.g. 28.2), which is
# what user intents like "ROE above 20" naturally mean.
METRIC_MAP = {
    # Valuation
    "pe": "m.pe_ratio",
    "pe_ratio": "m.pe_ratio",
    "pb": "m.pb_ratio",
    "pb_ratio": "m.pb_ratio",
    "market_cap": "m.market_cap",
    "price": "m.last_price",
    "dividend_yield": "m.dividend_yield",

    # Efficiency & Profitability
    "roe": "s.roe",
    "roa": "s.roa",
    "gross_margin": "s.gross_margin",
    "operating_margin": "s.operating_margin",
    "net_margin": "s.profit_margin",
    "profit_margin": "s.profit_margin",

    # Growth
    "revenue_growth": "s.revenue_growth",
    "profit_growth": "s.profit_growth",
    "eps_growth": "s.eps_growth",
    "sales_growth": "s.revenue_growth",

    # Health/Safety
    "total_debt": "s.total_debt",

    # Technical (TradingView beta is 1Y)
    "rsi": "s.rsi_14",
    "beta": "s.beta_1y",

    # Volume/Liquidity
    "volume": "m.volume",
    "change": "m.change_percent",
    "change_percent": "m.change_percent",

    # Raw Fundamentals (TTM when TradingView provides it, latest FY otherwise)
    "revenue": "COALESCE(s.revenue_ttm, s.revenue_fy)",
    "net_income": "COALESCE(s.net_income_ttm, s.net_income_fy)",
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
        LEFT JOIN stock_stats_view s ON m.symbol = s.symbol
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
        
        # UNITS (June-2026 chat realignment, Codex finding on PR#79):
        # stock_stats_view stores ROE/margins/growth as PERCENT values (28.2),
        # exactly matching user thresholds like "ROE above 20" — so the old
        # fraction scaling (value/100, for the retired stock_statistics table)
        # was REMOVED. Thresholds now pass through unchanged for every metric.
        PERCENTAGE_METRICS = {
            "revenue_growth", "profit_growth", "eps_growth", "sales_growth",
            "gross_margin", "operating_margin", "net_margin", "profit_margin",
            "roe", "roa", "dividend_yield"
        }

        display_value = value  # human-readable value for the criteria summary
        is_pct_metric = metric_key in PERCENTAGE_METRICS  # used for "%"-suffixed display only

        db_col = METRIC_MAP.get(metric_key)
        sql_op = OPERATOR_MAP.get(operator_key)
        
        if db_col and sql_op and value is not None:
            params.append(value)
            sql += f" AND {db_col} {sql_op} ${len(params)}"
            
            # Build description (show the human value: % for ratio metrics)
            op_human = ">" if "gt" in operator_key else "<" if "lt" in operator_key else "="
            _label = str(metric_key).replace('_', ' ')
            _shown = f"{display_value}%" if is_pct_metric else f"{display_value}"
            query_description_parts.append(f"{_label} {op_human} {_shown}")
            
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

    # Rich, accurate summary used verbatim (STRICT_HANDLER_NARRATIVE_INTENTS) so the
    # LLM narrator can't hallucinate "no stocks" over a non-empty result set.
    crit = ", ".join(query_description_parts) if query_description_parts else (sort_by or "market cap")
    _top = stocks[:5]
    if language == 'ar':
        _lines = [f"🔍 وجدت {len(stocks)} سهماً ({crit}):"]
        _lines += [f"• {s.get('name') or s.get('symbol')} ({s.get('symbol')})" for s in _top]
        if len(stocks) > len(_top):
            _lines.append(f"و{len(stocks) - len(_top)} أخرى…")
    else:
        _lines = [f"🔍 Found {len(stocks)} stocks ({crit}):"]
        _lines += [f"• {s.get('name') or s.get('symbol')} ({s.get('symbol')})" for s in _top]
        if len(stocks) > len(_top):
            _lines.append(f"…and {len(stocks) - len(_top)} more.")
    summary_msg = "\n".join(_lines)

    return {
        "success": True,
        "message": summary_msg,
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
