"""
Statistics Handler - Handles queries about stock statistics (PE, ROE, margins, etc.)
Uses the stock_statistics table for comprehensive metrics.
"""

import asyncpg
from typing import Dict, Any, Optional
import math

def safe_float(val: Any) -> Optional[float]:
    """Safely convert to float, handling None and NaN."""
    if val is None:
        return None
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return None
        return f_val
    except (ValueError, TypeError):
        return None

def _format_number(value: float, decimals: int = 2) -> Optional[str]:
    """Format number with commas."""
    f_val = safe_float(value)
    if f_val is None:
        return None
    return f"{f_val:,.{decimals}f}"


def _format_percent(value: float) -> Optional[str]:
    """Format as percentage."""
    f_val = safe_float(value)
    if f_val is None:
        return None
    return f"{f_val * 100:.2f}%"


async def handle_stock_statistics(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle comprehensive stock statistics query.
    Returns valuation ratios, efficiency metrics, margins, etc.
    """
    # Get statistics from stock_statistics table
    # CRITICAL: Avoid SELECT * to be resilient to missing columns
    # Get statistics - Join with financial_ratios_history for robust deep metrics
    # CRITICAL: Prefer financial_ratios_history for accounting ratios, market_tickers for price ratios
    sql = """
        SELECT 
            ss.pe_ratio as live_pe, ss.pb_ratio as live_pb, ss.ps_ratio as live_ps, 
            ss.beta_5y, ss.rsi_14, ss.ma_50d, ss.ma_200d,
            ss.roce as live_roce, -- Restore ROCE from live stats
            ss.ebitda_margin as live_ebitda_margin, -- Fix missing column in history
            mt.name_en, mt.name_ar, mt.last_price, mt.market_code, mt.currency,
            mt.pe_ratio as mt_pe, mt.pb_ratio as mt_pb, mt.dividend_yield,
            mt.market_cap as live_cap,
            fr.roe, fr.roa, fr.roic,
            fr.gross_margin, fr.operating_margin, fr.net_margin as profit_margin,
            fr.current_ratio, fr.quick_ratio, fr.debt_equity as debt_equity_ratio
        FROM stock_statistics ss
        LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol
        LEFT JOIN LATERAL (
            SELECT * FROM financial_ratios_history 
            WHERE symbol = ss.symbol AND period_type = 'annual' 
            ORDER BY fiscal_year DESC LIMIT 1
        ) fr ON true
        WHERE ss.symbol = $1
    """
    stats_record = await conn.fetchrow(sql, symbol)
    
    if not stats_record:
        # Fallback to market_tickers if no statistics
        ticker = await conn.fetchrow("""
            SELECT symbol, name_en, name_ar, market_code, currency, last_price,
                   pe_ratio, pb_ratio, dividend_yield, market_cap
            FROM market_tickers WHERE symbol = $1
        """, symbol)
        
        if not ticker:
            return {
                'success': False,
                'error': 'symbol_not_found',
                'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}",
                'cards': []
            }
        
        # Return basic data from market_tickers
        name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
        return {
            'success': True,
            'message': f"📊 **{name}** ({symbol}) - Basic Statistics" if language == 'en' else f"📊 **{name}** ({symbol}) - إحصائيات أساسية",
            'cards': [{
                'type': 'stats',
                'title': 'Basic Statistics',
                'data': {
                    'pe_ratio': safe_float(ticker['pe_ratio']),
                    'pb_ratio': safe_float(ticker['pb_ratio']),
                    'dividend_yield': safe_float(ticker['dividend_yield']),
                    'market_cap': int(ticker['market_cap']) if ticker['market_cap'] else None,
                }
            }]
        }
    
    # Safely convert Record to dict to allow .get() access
    stats = dict(stats_record)
    
    name = stats['name_ar'] if language == 'ar' else stats['name_en']
    currency = stats['currency'] or 'EGP'
    
    # helper to coalesce sources (Extended > Live/Stats) for ratios, but Live for Price/Cap
    def get_val(key, fallback_key=None):
        val = stats.get(key)
        if val is not None: return safe_float(val)
        if fallback_key:
            f_val = stats.get(fallback_key)
            if f_val is not None: return safe_float(f_val)
        return None

    # Data Extraction - Use mt_pe/mt_pb as primary for valuation
    pe = get_val('mt_pe', 'live_pe')
    pb = get_val('mt_pb', 'live_pb')
    ps = get_val('live_ps')
    
    # Use History for accounting ratios
    roe = get_val('roe')
    roa = get_val('roa')
    roic = get_val('roic')
    roce = get_val('live_roce') # Use live ROCE since history column was missing
    gm = get_val('gross_margin')
    om = get_val('operating_margin')
    nm = get_val('profit_margin') # Column is profit_margin in history table
    
    curr_r = get_val('current_ratio')
    de = get_val('debt_equity_ratio') # Column is debt_equity_ratio in history table

    # Build comprehensive message (Conditional Line Inclusion)
    lines = [f"📊 **{'إحصائيات شاملة لـ' if language == 'ar' else 'Comprehensive Statistics for'} {name}** ({symbol})\n"]

    # 1. Valuation
    val_lines = []
    pe_str = _format_number(pe)
    pb_str = _format_number(pb)
    ps_str = _format_number(ps)
    
    if pe_str: val_lines.append(f"• {'مضاعف الربحية' if language == 'ar' else 'P/E Ratio'}: {pe_str}")
    if pb_str: val_lines.append(f"• {'مضاعف القيمة الدفترية' if language == 'ar' else 'P/B Ratio'}: {pb_str}")
    if ps_str: val_lines.append(f"• P/S: {ps_str}")
    
    if val_lines:
        lines.append(f"💰 **{'نسب التقييم' if language == 'ar' else 'Valuation Ratios'}:**")
        lines.extend(val_lines)
        lines.append("")

    # 2. Efficiency
    eff_lines = []
    roe_str = _format_percent(roe)
    roa_str = _format_percent(roa)
    roic_str = _format_percent(roic)
    
    if roe_str: eff_lines.append(f"• {'ROE' if language == 'en' else 'العائد على حقوق الملكية'}: {roe_str}")
    if roa_str: eff_lines.append(f"• {'ROA' if language == 'en' else 'العائد على الأصول'}: {roa_str}")
    if roic_str: eff_lines.append(f"• {'ROIC' if language == 'en' else 'ROIC'}: {roic_str}")
    if _format_percent(roce): eff_lines.append(f"• {'ROCE' if language == 'en' else 'العائد على رأس المال'}: {_format_percent(roce)}")
    
    if eff_lines:
        lines.append(f"📈 **{'الكفاءة المالية' if language == 'ar' else 'Financial Efficiency'}:**")
        lines.extend(eff_lines)
        lines.append("")

    # 3. Margins
    marg_lines = []
    gm_str = _format_percent(gm)
    om_str = _format_percent(om)
    nm_str = _format_percent(nm)
    
    if gm_str: marg_lines.append(f"• {'Gross Margin' if language == 'en' else 'هامش الربح الإجمالي'}: {gm_str}")
    if om_str: marg_lines.append(f"• {'Operating Margin' if language == 'en' else 'هامش التشغيل'}: {om_str}")
    if nm_str: marg_lines.append(f"• {'Profit Margin' if language == 'en' else 'هامش صافي الربح'}: {nm_str}")
    
    if marg_lines:
        lines.append(f"💵 **{'الهوامش' if language == 'ar' else 'Margins'}:**")
        lines.extend(marg_lines)
        lines.append("")

    # 4. Health
    health_lines = []
    curr_r_str = _format_number(curr_r)
    de_str = _format_number(de)
    
    if curr_r_str: health_lines.append(f"• {'Current Ratio' if language == 'en' else 'نسبة التداول'}: {curr_r_str}")
    if de_str: health_lines.append(f"• {'Debt/Equity' if language == 'en' else 'الدين/حقوق الملكية'}: {de_str}")
    
    if health_lines:
        lines.append(f"⚖️ **{'الملاءة المالية' if language == 'ar' else 'Financial Health'}:**")
        lines.extend(health_lines)
        lines.append("")
        
    # 5. Technical
    tech_lines = []
    beta_str = _format_number(stats.get('beta_5y'))
    rsi_str = _format_number(stats.get('rsi_14'))
    
    if beta_str: tech_lines.append(f"• {'Beta' if language == 'en' else 'بيتا'} (5Y): {beta_str}")
    if rsi_str: tech_lines.append(f"• RSI (14): {rsi_str}")
    
    if tech_lines:
        lines.append(f"📉 **{'المؤشرات الفنية' if language == 'ar' else 'Technical Indicators'}:**")
        lines.extend(tech_lines)

    message = "\n".join(lines)
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': stats['market_code'],
                    'currency': currency
                }
            },
            {
                'type': 'stats',
                'title': 'Full Statistics' if language == 'en' else 'إحصائيات كاملة',
                'data': {
                    # Valuation
                    'pe_ratio': pe,
                    'pb_ratio': pb,
                    'ps_ratio': ps,
                    'forward_pe': safe_float(stats.get('forward_pe')),
                    'peg_ratio': safe_float(stats.get('peg_ratio')),
                    
                    # Efficiency
                    'roe': roe,
                    'roa': roa,
                    'roic': roic,
                    'roce': roce,
                    
                    # Margins
                    'gross_margin': gm,
                    'operating_margin': om,
                    'profit_margin': nm,
                    'ebitda_margin': safe_float(stats.get('ebitda_margin')) or safe_float(stats.get('live_ebitda_margin')), # Handle fallback keys if needed

                    # Financial Health
                    'current_ratio': curr_r,
                    'quick_ratio': safe_float(stats.get('quick_ratio')),
                    'debt_equity': de,
                    
                    # Technical
                    'beta': safe_float(stats.get('beta_5y')), # Frontend uses 'beta', not 'beta_5y'
                    'rsi_14': safe_float(stats.get('rsi_14')),
                    'ma_50d': safe_float(stats.get('ma_50d')),
                    'ma_200d': safe_float(stats.get('ma_200d')),
                    
                    # Extras
                    'market_cap': safe_float(stats.get('live_cap') or stats.get('market_cap')),
                    'dividend_yield': safe_float(stats.get('dividend_yield')),
                }
            }
        ],
        'actions': [
            {'label': '📈 Chart', 'label_ar': '📈 الرسم البياني', 'action_type': 'query', 'payload': f'Chart {symbol}'},
            {'label': '💰 Dividends', 'label_ar': '💰 التوزيعات', 'action_type': 'query', 'payload': f'{symbol} dividends'},
            {'label': '📋 Financials', 'label_ar': '📋 القوائم المالية', 'action_type': 'query', 'payload': f'{symbol} financials'},
        ]
    }


async def handle_valuation_query(
    conn: asyncpg.Connection,
    symbol: str,
    metric: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle specific valuation metric query like 'What is COMI PE ratio?'"""
    
    # Map common queries to column names
    metric_map = {
        'pe': ('pe_ratio', 'P/E Ratio', 'مضاعف الربحية'),
        'pb': ('pb_ratio', 'P/B Ratio', 'مضاعف القيمة الدفترية'),
        'ps': ('ps_ratio', 'P/S Ratio', 'مضاعف المبيعات'),
        'roe': ('roe', 'Return on Equity', 'العائد على حقوق الملكية'),
        'roa': ('roa', 'Return on Assets', 'العائد على الأصول'),
        'margin': ('profit_margin', 'Profit Margin', 'هامش الربح'),
        'beta': ('beta_5y', 'Beta (5Y)', 'بيتا'),
        'debt': ('debt_equity', 'Debt/Equity', 'الدين/حقوق الملكية'),
    }
    
    metric_key = metric.lower().replace('ratio', '').replace(' ', '').strip()
    
    if metric_key not in metric_map:
        # Default to full statistics
        return await handle_stock_statistics(conn, symbol, language)
    
    col_name, label_en, label_ar = metric_map[metric_key]
    label = label_ar if language == 'ar' else label_en
    
    # Get specific metric
    row = await conn.fetchrow(f"""
        SELECT ss.{col_name}, mt.name_en, mt.name_ar
        FROM stock_statistics ss
        LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol
        WHERE ss.symbol = $1
    """, symbol)
    
    if not row:
        return {
            'success': False,
            'error': 'not_found',
            'message': f"No statistics found for {symbol}" if language == 'en' else f"لا توجد إحصائيات لـ {symbol}",
            'cards': []
        }
    
    name = row['name_ar'] if language == 'ar' else row['name_en']
    value = row[col_name]
    
    if value is None:
        formatted = None
    elif col_name in ['roe', 'roa', 'roic', 'profit_margin', 'gross_margin', 'operating_margin']:
        formatted = f"{value * 100:.2f}%"
    else:
        formatted = f"{value:.2f}"
    
    if formatted:
        message = f"📊 **{name}** ({symbol})\n\n{label}: **{formatted}**"
    else:
        # If specific metric is null, return basic error message
        return {
            'success': True,
            'message': f"Data for {label} is currently unavailable for {name}." if language == 'en' else f"بيانات {label} غير متاحة حالياً لـ {name}.",
            'cards': []
        }
    
    if language == 'ar':
        message = f"📊 **{name}** ({symbol})\n\n{label}: **{formatted}**"
    else:
        message = f"📊 **{name}** ({symbol})\n\n{label}: **{formatted}**"
    
    return {
        'success': True,
        'message': message,
        'cards': [{
            'type': 'metric',
            'title': label,
            'data': {'symbol': symbol, 'metric': col_name, 'value': value}
        }],
        'actions': [
            {'label': 'Full Statistics', 'label_ar': 'إحصائيات كاملة', 'action_type': 'query', 'payload': f'{symbol} statistics'},
        ]
    }
