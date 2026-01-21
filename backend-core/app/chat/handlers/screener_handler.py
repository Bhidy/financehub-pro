"""
Screener Handler - TOP_GAINERS, TOP_LOSERS, SECTOR_STOCKS, DIVIDEND_LEADERS, SCREENER_PE.
"""

import asyncpg
from typing import Dict, Any, List, Optional


async def handle_top_gainers(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle TOP_GAINERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, market_code
        FROM market_tickers
        WHERE change_percent IS NOT NULL AND change_percent > 0
          AND COALESCE(sector_name, '') NOT ILIKE '%fund%'
          AND COALESCE(sector_name, '') NOT ILIKE '%certificate%'
          AND COALESCE(name_en, '') NOT ILIKE '%fund%'
          AND COALESCE(name_en, '') NOT ILIKE '%certificate%'
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY change_percent DESC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No gainers found today" if language == 'en' else "لا توجد أسهم رابحة اليوم",
            'cards': []
        }
    
    movers = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        movers.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']),
            'volume': int(row['volume']) if row['volume'] else 0,
            'market_code': row['market_code']
        })
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"أعلى {len(movers)} أسهم ارتفاعاً اليوم{market_label}"
    else:
        message = f"Top {len(movers)} Gainers Today{market_label}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Top Gainers' if language == 'en' else 'الأكثر ارتفاعاً',
                'data': {'movers': movers, 'direction': 'up'}
            }
        ],
        'actions': [
            {'label': 'View Losers', 'label_ar': 'الأكثر انخفاضاً', 'action_type': 'query', 'payload': 'Show top losers'},
            {'label': '💰 Dividend Leaders', 'label_ar': '💰 أعلى التوزيعات', 'action_type': 'query', 'payload': 'Show highest dividend stocks'},
            {'label': '🏦 Banking Sector', 'label_ar': '🏦 قطاع البنوك', 'action_type': 'query', 'payload': 'Show banking sector stocks'}
        ]
    }


async def handle_top_losers(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle TOP_LOSERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, change_percent, volume, market_code
        FROM market_tickers
        WHERE change_percent IS NOT NULL AND change_percent < 0
          AND COALESCE(sector_name, '') NOT ILIKE '%fund%'
          AND COALESCE(sector_name, '') NOT ILIKE '%certificate%'
          AND COALESCE(name_en, '') NOT ILIKE '%fund%'
          AND COALESCE(name_en, '') NOT ILIKE '%certificate%'
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY change_percent ASC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No losers found today" if language == 'en' else "لا توجد أسهم خاسرة اليوم",
            'cards': []
        }
    
    movers = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        movers.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']),
            'volume': int(row['volume']) if row['volume'] else 0,
            'market_code': row['market_code']
        })
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"أعلى {len(movers)} أسهم انخفاضاً اليوم{market_label}"
    else:
        message = f"Top {len(movers)} Losers Today{market_label}"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'movers_table',
                'title': 'Top Losers' if language == 'en' else 'الأكثر انخفاضاً',
                'data': {'movers': movers, 'direction': 'down'}
            }
        ],
        'actions': [
            {'label': 'View Gainers', 'label_ar': 'الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': '💰 Dividend Leaders', 'label_ar': '💰 أعلى التوزيعات', 'action_type': 'query', 'payload': 'Show highest dividend stocks'},
            {'label': '📊 Market Summary', 'label_ar': '📊 ملخص السوق', 'action_type': 'query', 'payload': 'Market summary'}
        ]
    }


async def handle_sector_stocks(
    conn: asyncpg.Connection,
    sector: str,
    limit: int = 20,
    language: str = 'en',
    market_code: Optional[str] = None
) -> Dict[str, Any]:
    """Handle SECTOR_STOCKS intent."""
    
    
    # SECTOR MAPPING: Expand broad categories to specific keywords found in EGX/StockAnalysis data
    sector_lower = sector.lower()
    search_terms = [f"%{sector_lower}%"]
    
    # Industries to EXCLUDE from banking results (Investment holdings, brokers, insurance)
    # These match %invest%, %finan%, etc. but are NOT actual banks
    excluded_industries = []
    
    # Special flag for banking - also search by company name
    search_by_name = False
    name_terms = []
    
    if sector_lower in ['bank', 'banks', 'banking'] or 'bank' in sector_lower:
        # For banking sector: ONLY match actual banks
        # Search in sector/industry AND in company name (many EGX stocks have NULL sector)
        search_terms = ["%bank%"]
        search_by_name = True
        name_terms = ["%bank%"]
        # Exclude investment holdings, brokers, and insurance companies
        excluded_industries = [
            'investors, not elsewhere classified',  # Real Estate/Investment Holdings like TMGH
            'security and commodity brokers, dealers, exchanges, and services',  # Brokers like HRHO
            'security brokers, dealers, and flotation companies',  # More brokers
            'insurance carriers',  # Insurance companies
        ]
    elif "insur" in sector_lower:
        # Insurance sector - be specific
        search_terms = ["%insur%"]
    elif "broker" in sector_lower or "investment" in sector_lower:
        # Investment/Broker sector - be specific
        search_terms = ["%broker%", "%invest%", "%security%"]
    elif "finan" in sector_lower:
        # General Financial Services - broader match but exclude pure banks
        search_terms = ["%finan%"]
    elif "tech" in sector_lower:
        search_terms.extend(["%comput%", "%softw%", "%tech%"])
    elif "consumer" in sector_lower:
        search_terms.extend(["%textile%", "%apparel%", "%retail%", "%food%", "%bever%"])
    elif "indust" in sector_lower:
        search_terms.extend(["%construct%", "%build%", "%cement%", "%steel%", "%metal%"])
    elif "basic" in sector_lower or "material" in sector_lower:
        search_terms.extend(["%chem%", "%mine%", "%mining%", "%steel%", "%metal%"])
    elif "health" in sector_lower:
        search_terms.extend(["%pharm%", "%medic%", "%health%"])
    elif "real" in sector_lower or "estate" in sector_lower or "property" in sector_lower:
        search_terms.extend(["%real estate%", "%property%", "%housing%", "%development%"])

    # Build SQL with optional industry exclusions and name search
    if search_by_name:
        # For banking: search sector/industry OR company name
        sql = """
            SELECT symbol, name_en, name_ar, last_price, change_percent, market_cap, sector_name
            FROM market_tickers
            WHERE (
                LOWER(sector_name) LIKE ANY($1) 
                OR LOWER(industry) LIKE ANY($1)
                OR LOWER(name_en) LIKE ANY($2)
            )
        """
        params: List = [search_terms, name_terms]
    else:
        sql = """
            SELECT symbol, name_en, name_ar, last_price, change_percent, market_cap, sector_name
            FROM market_tickers
            WHERE (LOWER(sector_name) LIKE ANY($1) OR LOWER(industry) LIKE ANY($1))
        """
        params: List = [search_terms]
    
    # Add industry exclusions if specified (for banking sector)
    if excluded_industries:
        params.append(excluded_industries)
        sql += f" AND LOWER(COALESCE(industry, '')) != ALL(${len(params)})"
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
        
    params.append(limit)
    sql += f" ORDER BY market_cap DESC NULLS LAST LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': False,
            'error': 'sector_not_found',
            'message': f"No stocks found in sector: {sector}" if language == 'en' else f"لم يتم العثور على أسهم في قطاع: {sector}"
        }
    
    stocks = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        # Map change_percent to value for the frontend card
        stocks.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'change_percent': float(row['change_percent']) if row['change_percent'] is not None else 0,
            'market_cap': int(row['market_cap']) if row['market_cap'] else 0,
            'value': float(row['last_price']) if row['last_price'] else 0,
            'metric': 'last_price'
        })
    
    # Use the requested sector name for the title if generic, or the first match
    sector_display = sector.title()
    
    market_label = f" ({market_code})" if market_code else ""
    if language == 'ar':
        message = f"أسهم قطاع {sector_display}{market_label} ({len(stocks)} سهم)"
    else:
        message = f"{sector_display} Sector Stocks{market_label} ({len(stocks)} stocks)"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'sector_list',
                'title': sector_display,
                'data': {'stocks': stocks, 'sector': sector_display, 'metric': 'Price'}
            }
        ],
        'actions': [
            {'label': '🟢 Top Gainers', 'label_ar': '🟢 الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': '🔴 Top Losers', 'label_ar': '🔴 الأكثر انخفاضاً', 'action_type': 'query', 'payload': 'Show top losers'},
            {'label': '💰 Dividend Leaders', 'label_ar': '💰 أعلى التوزيعات', 'action_type': 'query', 'payload': 'Show highest dividend stocks'},
        ]
    }


async def handle_dividend_leaders(
    conn: asyncpg.Connection,
    market_code: Optional[str] = None,
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle DIVIDEND_LEADERS intent."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, dividend_yield, market_code
        FROM market_tickers
        WHERE dividend_yield IS NOT NULL AND dividend_yield > 0
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY dividend_yield DESC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No dividend stocks found" if language == 'en' else "لم يتم العثور على أسهم توزيعات",
            'cards': []
        }
    
    leaders = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        yield_val = float(row['dividend_yield'])
        leaders.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'dividend_yield': yield_val,
            'value': yield_val,  # Map for ScreenerResultsCard
            'market_code': row['market_code']
        })
    
    if language == 'ar':
        message = f"أعلى {len(leaders)} أسهم في عائد التوزيعات"
    else:
        message = f"Top {len(leaders)} Dividend Yielding Stocks"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'screener_results',
                'title': 'Dividend Leaders' if language == 'en' else 'أعلى التوزيعات',
                'data': {'stocks': leaders, 'metric': 'dividend_yield'}
            }
        ],
        'actions': [
            {'label': '🟢 Top Gainers', 'label_ar': '🟢 الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': '🔴 Top Losers', 'label_ar': '🔴 الأكثر انخفاضاً', 'action_type': 'query', 'payload': 'Show top losers'},
            {'label': '🏦 Banking Sector', 'label_ar': '🏦 قطاع البنوك', 'action_type': 'query', 'payload': 'Show banking sector stocks'},
        ]
    }


async def handle_screener_pe(
    conn: asyncpg.Connection,
    threshold: float,
    market_code: Optional[str] = None,
    limit: int = 20,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle SCREENER_PE intent - stocks with PE below threshold."""
    
    sql = """
        SELECT symbol, name_en, name_ar, last_price, pe_ratio, market_cap, market_code
        FROM market_tickers
        WHERE pe_ratio IS NOT NULL AND pe_ratio > 0 AND pe_ratio < $1
    """
    params = [threshold]
    
    if market_code:
        params.append(market_code)
        sql += f" AND market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY pe_ratio ASC LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': f"No stocks found with PE below {threshold}" if language == 'en' else f"لم يتم العثور على أسهم بمضاعف ربحية أقل من {threshold}",
            'cards': []
        }
    
    stocks = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        pe_val = float(row['pe_ratio'])
        stocks.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'pe_ratio': pe_val,
            'value': pe_val,  # Map for ScreenerResultsCard
            'market_cap': int(row['market_cap']) if row['market_cap'] else 0,
            'market_code': row['market_code']
        })
    
    if language == 'ar':
        message = f"أسهم بمضاعف ربحية أقل من {threshold} ({len(stocks)} سهم)"
    else:
        message = f"Stocks with PE below {threshold} ({len(stocks)} found)"
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'screener_results',
                'title': f'PE < {threshold}',
                'data': {'stocks': stocks, 'metric': 'pe_ratio', 'threshold': threshold}
            }
        ]
    }


async def handle_deep_screener(
    conn: asyncpg.Connection,
    metric: str,
    direction: str = 'desc',
    limit: int = 10,
    market_code: Optional[str] = None,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle deep statistics screening (ROE, Margins, EV, etc.)
    Joins market_tickers with stock_statistics.
    """
    
    # Whitelist metrics to prevent injection
    VALID_METRICS = {
        'roe': 's.roe',
        'roa': 's.roa',
        'gross_margin': 's.gross_margin',
        'operating_margin': 's.operating_margin',
        'profit_margin': 's.profit_margin',
        'ev_ebitda': 's.ev_ebitda',
        'enterprise_value': 's.enterprise_value',
        'total_debt': 's.total_debt',
        'debt_equity': 's.debt_equity',
        'beta_5y': 's.beta_5y',
        'rsi_14': 's.rsi_14',
        'revenue_ttm': 's.revenue_ttm',
        'net_income_ttm': 's.net_income_ttm',
        'pe_ratio': 'm.pe_ratio',
        # Phase 5 Metrics
        'altman_z_score': 's.altman_z_score',
        'piotroski_f_score': 's.piotroski_f_score',
        'ev_ebit': 's.ev_ebit',
        'debt_ebitda': 's.debt_ebitda',
        # Phase 6 Metrics
        'p_ocf': 's.p_ocf',
        'roce': 's.roce',
        'asset_turnover': 's.asset_turnover',
        'inventory_turnover': 's.inventory_turnover',
        'earnings_yield': 's.earnings_yield',
        'fcf_yield': 's.fcf_yield',
        # Growth Metrics
        'revenue_growth': 's.revenue_growth',
        'profit_growth': 's.profit_growth',
        'eps_growth': 's.eps_growth'
    }
    
    db_col = VALID_METRICS.get(metric)
    if not db_col:
        return {'success': False, 'message': 'Invalid metric'}

    order_sql = "DESC" if direction.lower() == 'desc' else "ASC"
    
    sql = f"""
        SELECT m.symbol, m.name_en, m.name_ar, m.last_price, {db_col} as value, m.market_code
        FROM market_tickers m
        LEFT JOIN stock_statistics s ON m.symbol = s.symbol
        WHERE {db_col} IS NOT NULL 
    """
    params = []
    
    if market_code:
        params.append(market_code)
        sql += f" AND m.market_code = ${len(params)}"
    
    params.append(limit)
    sql += f" ORDER BY {db_col} {order_sql} NULLS LAST LIMIT ${len(params)}"
    
    rows = await conn.fetch(sql, *params)
    
    if not rows:
        return {
            'success': True,
            'message': "No stocks found matching criteria",
            'cards': []
        }
    
    results = []
    for row in rows:
        name = row['name_ar'] if language == 'ar' else row['name_en']
        val = float(row['value'])
        # Format percentages if needed (roe, margins are decimals usually)
        # But for response mapping simpliciy we send raw float
        results.append({
            'symbol': row['symbol'],
            'name': name,
            'price': float(row['last_price']) if row['last_price'] else 0,
            'value': val,
            'market_code': row['market_code']
        })
    
    lbl = metric.replace('_', ' ').title()
    if language == 'ar':
        message = f"أفضل الأسهم حسب {lbl}"
    else:
        message = f"Top Stocks by {lbl}"
        
    return {
        'success': True,
        'message': message,
        'cards': [{
            'type': 'screener_results',
            'title': lbl,
            'data': {'stocks': results, 'metric': metric}
        }]
    }
