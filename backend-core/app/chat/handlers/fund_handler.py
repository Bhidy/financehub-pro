"""
Fund Handlers - Handle mutual fund queries.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
from typing import Dict, Any
import asyncpg


async def handle_fund_nav(conn: asyncpg.Connection, fund_id: str, language: str = "en") -> Dict[str, Any]:
    """Get NAV and details for a specific fund."""
    
    # Try to resolve fund_id from name if not numeric
    if not fund_id.isdigit():
        # Resolve by name with RELEVANCE RANKING. (Was: `LIKE '%term%' LIMIT 1` with no
        # ORDER BY -> arbitrary match among duplicate funds, e.g. "Maashy" could return
        # a wrong fund's NAV. The funds table has numeric Mubasher IDs AND alphanumeric
        # Decypha duplicates for the same fund.) Priority: exact name > prefix > canonical
        # numeric (Mubasher) ID > most NAV history (the real, tradable record).
        term = fund_id.lower().strip()
        row = await conn.fetchrow("""
            SELECT fund_id FROM mutual_funds
            WHERE LOWER(fund_name) LIKE $1 OR LOWER(fund_name_en) LIKE $1
            ORDER BY
                CASE WHEN LOWER(fund_name_en) = $2 OR LOWER(fund_name) = $2 THEN 0
                     WHEN LOWER(fund_name_en) LIKE $3 OR LOWER(fund_name) LIKE $3 THEN 1
                     ELSE 2 END,
                CASE WHEN fund_id ~ '^[0-9]+$' THEN 0 ELSE 1 END,
                (SELECT COUNT(*) FROM nav_history WHERE fund_id = mutual_funds.fund_id) DESC
            LIMIT 1
        """, f"%{term}%", term, f"{term}%")
        if row:
            fund_id = str(row['fund_id'])
        else:
            # Check fund_aliases
            alias_row = await conn.fetchrow("""
                SELECT fund_id FROM fund_aliases
                WHERE alias_text_norm LIKE $1
                ORDER BY priority DESC
                LIMIT 1
            """, f"%{fund_id.lower()}%")
            if alias_row:
                fund_id = str(alias_row['fund_id'])
    
    # Fetch fund data
    fund = await conn.fetchrow("""
        SELECT f.*, 
               (SELECT nav FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1) as latest_nav,
               (SELECT date FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1) as last_update
        FROM mutual_funds f
        WHERE f.fund_id = $1
    """, fund_id)
    
    if not fund:
        return {
            'success': False,
            'message': f"لم أجد صندوق {fund_id}" if language == 'ar' else f"Fund {fund_id} not found",
            'cards': []
        }
    
    fund_dict = dict(fund)
    name = fund_dict.get('fund_name') or fund_dict.get('fund_name_en') or f"Fund {fund_id}"
    nav = fund_dict.get('latest_nav')
    currency = get_ticker_currency(fund_dict)
    aum = fund_dict.get('aum_millions')
    is_shariah = fund_dict.get('is_shariah', False)
    returns_ytd = fund_dict.get('returns_ytd') or fund_dict.get('ytd_return')
    returns_1y = fund_dict.get('returns_1y') or fund_dict.get('one_year_return')
    returns_3m = fund_dict.get('returns_3m') or fund_dict.get('profit_3month')
    manager = fund_dict.get('manager') or fund_dict.get('manager_name')
    
    # Format message
    if language == 'ar':
        msg = f"**{name}**\n\n"
        msg += f"💰 صافي قيمة الأصول: {nav:.2f} {currency}\n" if nav else ""
        msg += f"📊 الأصول تحت الإدارة: {aum:.0f} مليون\n" if aum else ""
        msg += f"☪️ متوافق مع الشريعة\n" if is_shariah else ""
        msg += f"\n📈 العوائد:\n"
        msg += f"  • 3 شهور: {returns_3m:.2f}%\n" if returns_3m else ""
        msg += f"  • سنة: {returns_1y:.2f}%\n" if returns_1y else ""
        msg += f"  • منذ بداية السنة: {returns_ytd:.2f}%\n" if returns_ytd else ""
        msg += f"\n🏢 مدير الصندوق: {manager}" if manager else ""
    else:
        msg = f"**{name}**\n\n"
        msg += f"💰 NAV: {nav:.2f} {currency}\n" if nav else ""
        msg += f"📊 AUM: {aum:.0f}M\n" if aum else ""
        msg += f"☪️ Shariah Compliant\n" if is_shariah else ""
        msg += f"\n📈 Returns:\n"
        msg += f"  • 3M: {returns_3m:.2f}%\n" if returns_3m else ""
        msg += f"  • 1Y: {returns_1y:.2f}%\n" if returns_1y else ""
        msg += f"  • YTD: {returns_ytd:.2f}%\n" if returns_ytd else ""
        msg += f"\n🏢 Manager: {manager}" if manager else ""
    
    return {
        'success': True,
        'message': msg,
        'cards': [{
            'type': 'fund_nav',
            'title': name,
            'data': {
                'fund_id': fund_id,
                'name': name,
                'nav': float(nav) if nav else None,
                'currency': currency,
                'aum_millions': float(aum) if aum else None,
                'is_shariah': is_shariah,
                'returns_ytd': float(returns_ytd) if returns_ytd else None,
                'returns_1y': float(returns_1y) if returns_1y else None,
                'returns_3m': float(returns_3m) if returns_3m else None,
                'manager': manager
            }
        }],
        'actions': [
            {'label': '📈 Performance', 'label_ar': '📈 الأداء', 'action_type': 'query', 'payload': f'fund {fund_id} performance'},
            {'label': '🔍 Compare', 'label_ar': '🔍 مقارنة', 'action_type': 'query', 'payload': 'compare funds'}
        ]
    }



async def handle_fund_search(conn: asyncpg.Connection, shariah: bool = None, category: str = None, language: str = "en") -> Dict[str, Any]:
    """Search and list funds with optional filters."""
    
    try:
        # Fetch all funds
        funds = await conn.fetch("""
            SELECT * FROM mutual_funds 
            WHERE market_code = 'EGX'
        """)
    except Exception as e:
        # Fallback query
        funds = await conn.fetch("SELECT fund_id, fund_name, fund_name_en, is_shariah, fund_type FROM mutual_funds WHERE market_code = 'EGX'")
    
    fund_list = [dict(f) for f in funds]
    
    # Sort by name (Python side to be safe)
    fund_list.sort(key=lambda x: (x.get('fund_name') or x.get('fund_name_en') or '').lower())
    
    # Apply filters
    if shariah:
        fund_list = [f for f in fund_list if f.get('is_shariah')]
    
    if category:
        fund_list = [f for f in fund_list if category.lower() in (f.get('fund_type') or '').lower()]
    
    # Build message
    count = len(fund_list)
    filter_desc = ""
    if shariah:
        filter_desc = "المتوافقة مع الشريعة " if language == 'ar' else "Shariah Compliant "
    elif category:
        filter_desc = f"{category} "
    
    if language == 'ar':
        msg = f"📊 وجدت **{count}** صندوق {filter_desc}\n\n"
    else:
        msg = f"📊 Found **{count}** {filter_desc}funds\n\n"
    
    # List top 10
    for i, f in enumerate(fund_list[:10], 1):
        name = f.get('fund_name') or f.get('fund_name_en') or f"Fund {f.get('fund_id')}"
        
        # Try to get NAV from columns if they exist (Decypha update added them? No, Decypha added 'returns' etc)
        # We skip NAV in list view to be safe for now, or use a separate quick query if really needed.
        # Let's rely on returns which are more relevant for ranking.
        returns_ytd = f.get('returns_ytd') or f.get('ytd_return')
        shariah_badge = " ☪️" if f.get('is_shariah') else ""
        
        msg += f"{i}. **{name}**{shariah_badge}\n"
        
        details = []
        if returns_ytd is not None:
            details.append(f"YTD: {float(returns_ytd):.1f}%")
        
        if details:
            msg += f"   {' | '.join(details)}\n"
        else:
             msg += "\n"
    
    if count > 10:
        remaining = count - 10
        msg += f"\n... و {remaining} صندوق آخر" if language == 'ar' else f"\n... and {remaining} more"
    
    return {
        'success': True,
        'message': msg,
        'cards': [{
            'type': 'fund_list',
            'title': 'الصناديق المتاحة' if language == 'ar' else 'Available Funds',
            'data': {
                'count': count,
                'funds': [{
                    'fund_id': f.get('fund_id'),
                    'name': f.get('fund_name') or f.get('fund_name_en'),
                    'nav': None, # Omitted to prevent errors
                    'returns_ytd': float(f.get('returns_ytd') or 0) if f.get('returns_ytd') is not None else None,
                    'is_shariah': f.get('is_shariah', False)
                } for f in fund_list[:15]]
            }
        }],
        'actions': [
            {'label': '☪️ Shariah Funds', 'label_ar': '☪️ صناديق شرعية', 'action_type': 'query', 'payload': 'shariah funds'},
            {'label': '📈 Top Funds', 'label_ar': '📈 أفضل الصناديق', 'action_type': 'query', 'payload': 'top funds'}
        ]
    }


async def handle_fund_movers(conn: asyncpg.Connection, range_val: str = "YTD", language: str = "en") -> Dict[str, Any]:
    """Get top/bottom performing funds."""
    
    # Fetch fund statistics
    funds = await conn.fetch("""
        SELECT f.*, 
               (SELECT nav FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1) as latest_nav
        FROM mutual_funds f
        WHERE f.market_code = 'EGX'
    """)
    
    fund_list = [dict(f) for f in funds]
    
    # Sort by returns
    def get_return(f):
        if range_val.upper() == "3M":
            val = f.get('returns_3m') or f.get('profit_3month')
        elif range_val.upper() == "1Y":
            val = f.get('returns_1y') or f.get('one_year_return')
        else:  # YTD
            val = f.get('returns_ytd') or f.get('ytd_return')
        try:
            return float(val) if val else -9999
        except Exception:
            return -9999
    
    sorted_funds = sorted(fund_list, key=get_return, reverse=True)
    
    top_5 = sorted_funds[:5]
    bottom_5 = sorted_funds[-5:]
    
    # Build message
    range_label = {"3M": "3 شهور", "1Y": "سنة", "YTD": "منذ بداية السنة"}.get(range_val.upper(), range_val) if language == 'ar' else range_val
    
    if language == 'ar':
        msg = f"📊 **أداء الصناديق** ({range_label})\n\n"
        msg += "🏆 **الأفضل أداءً:**\n"
    else:
        msg = f"📊 **Fund Performance** ({range_val})\n\n"
        msg += "🏆 **Top Performers:**\n"
    
    for i, f in enumerate(top_5, 1):
        name = f.get('fund_name') or f.get('fund_name_en') or f"Fund {f.get('fund_id')}"
        ret = get_return(f)
        if ret > -9999:
            msg += f"{i}. {name}: +{ret:.1f}%\n"
    
    msg += "\n"
    if language == 'ar':
        msg += "📉 **الأسوأ أداءً:**\n"
    else:
        msg += "📉 **Bottom Performers:**\n"
    
    for i, f in enumerate(bottom_5, 1):
        name = f.get('fund_name') or f.get('fund_name_en') or f"Fund {f.get('fund_id')}"
        ret = get_return(f)
        if ret > -9999:
            msg += f"{i}. {name}: {ret:.1f}%\n"
    
    return {
        'success': True,
        'message': msg,
        'cards': [
            {
                'type': 'fund_movers',
                'title': 'الأفضل أداءً' if language == 'ar' else 'Top Performers',
                'data': {
                    'range': range_val,
                    'funds': [{
                        'fund_id': f.get('fund_id'),
                        'name': f.get('fund_name') or f.get('fund_name_en'),
                        'return': get_return(f)
                    } for f in top_5]
                }
            },
            {
                'type': 'fund_movers',
                'title': 'الأسوأ أداءً' if language == 'ar' else 'Bottom Performers',
                'data': {
                    'range': range_val,
                    'funds': [{
                        'fund_id': f.get('fund_id'),
                        'name': f.get('fund_name') or f.get('fund_name_en'),
                        'return': get_return(f)
                    } for f in bottom_5]
                }
            }
        ],
        'actions': [
            {'label': '📅 3M', 'action_type': 'query', 'payload': 'fund movers 3M'},
            {'label': '📅 1Y', 'action_type': 'query', 'payload': 'fund movers 1Y'},
            {'label': '📅 YTD', 'action_type': 'query', 'payload': 'fund movers YTD'}
        ]
    }


async def handle_fund_details(
    conn: asyncpg.Connection,
    fund_id: str,
    intent: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle deep fund queries: RISK, MANAGER, INFO, FEES.
    """
    # 1. Resolve ID (reuse logic from nav)
    # Ideally refactored, but copying resolution logic for safety/speed
    if not fund_id.isdigit():
        row = await conn.fetchrow("""
            SELECT fund_id FROM mutual_funds 
            WHERE LOWER(fund_name) LIKE $1 OR LOWER(fund_name_en) LIKE $1 LIMIT 1
        """, f"%{fund_id.lower()}%")
        if row: fund_id = str(row['fund_id'])
    
    # 2. Fetch specific columns
    fund = await conn.fetchrow("""
        SELECT * FROM mutual_funds WHERE fund_id = $1
    """, fund_id)
    
    if not fund:
         return {
            'success': False,
            'message': f"Fund {fund_id} not found",
            'cards': []
        }
        
    f = dict(fund)
    name = f.get('fund_name') or f.get('fund_name_en')
    
    msg = ""
    cards = []
    
    if intent == "FUND_RISK":
        sharpe = f.get('sharpe_ratio')
        std_dev = f.get('standard_deviation')
        
        if language == 'ar':
            msg = f"⚠️ **مخاطر الصندوق:** {name}\n\n"
            msg += f"📉 الانحراف المعياري: {std_dev}\n" if std_dev else "الانحراف المعياري: غير متاح\n"
            msg += f"📊 نسبة شارب: {sharpe}\n" if sharpe else "نسبة شارب: غير متاح\n"
        else:
            msg = f"⚠️ **Fund Risk Profile:** {name}\n\n"
            msg += f"📉 Standard Deviation: {std_dev}\n" if std_dev else "Standard Deviation: N/A\n"
            msg += f"📊 Sharpe Ratio: {sharpe}\n" if sharpe else "Sharpe Ratio: N/A\n"
            
        cards.append({
            'type': 'stats',
            'title': 'Risk Metrics',
            'data': {'Sharpe': sharpe, 'Std Dev': std_dev}
        })
        
    elif intent == "FUND_MANAGER":
        mgr = f.get('manager_name') or f.get('manager_name_en')
        
        if language == 'ar':
             msg = f"🏢 **مدير الصندوق:** {name}\n\n👤 {mgr}" if mgr else "غير متاح"
        else:
             msg = f"🏢 **Fund Manager:** {name}\n\n👤 {mgr}" if mgr else "N/A"
             
    elif intent == "FUND_FEES":
        fees = f.get('expense_ratio')
        
        if language == 'ar':
            msg = f"💸 **رسوم الصندوق:** {name}\n\nنسبة المصروفات: {fees}%" if fees else "غير متاح"
        else:
            msg = f"💸 **Fund Fees:** {name}\n\nExpense Ratio: {fees}%" if fees else "N/A"

    elif intent == "FUND_INFO":
        strategy = f.get('investment_strategy')
        inception = f.get('inception_date')
        
        if language == 'ar':
             msg = f"ℹ️ **معلومات الصندوق:** {name}\n\n"
             msg += f"📅 تاريخ الإنشاء: {inception}\n"
             msg += f"📝 الاستراتيجية: {strategy}\n"
        else:
             msg = f"ℹ️ **Fund Info:** {name}\n\n"
             msg += f"📅 Inception: {inception}\n"
             msg += f"📝 Strategy: {strategy}\n"

    return {
        'success': True,
        'message': msg,
        'cards': cards,
        'actions': [
             {'label': '💰 NAV', 'action_type': 'query', 'payload': f'NAV {fund_id}'}
        ]
    }
