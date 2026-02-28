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
    # UNIFIED TTM DATA SOURCE: All KPIs come from stock_statistics (TTM) — no more annual mix
    sql = """
        SELECT 
            -- TTM Valuation (stock_statistics - always current/TTM-based)
            ss.pe_ratio AS live_pe, ss.pb_ratio AS live_pb, ss.ps_ratio AS live_ps,
            ss.forward_pe, ss.peg_ratio, ss.ev_ebitda, ss.ev_sales,
            ss.beta_5y, ss.rsi_14, ss.ma_50d, ss.ma_200d,
            -- TTM Profitability (stock_statistics - TTM)
            ss.roe, ss.roa, ss.roic, ss.roce AS live_roce,
            ss.gross_margin, ss.operating_margin, ss.profit_margin,
            ss.ebitda_margin AS live_ebitda_margin, ss.fcf_margin,
            -- TTM Financial Health (stock_statistics)
            ss.current_ratio, ss.quick_ratio,
            ss.debt_equity AS debt_equity_ratio,
            ss.interest_coverage, ss.altman_z_score, ss.piotroski_f_score,
            -- TTM Absolute Figures
            ss.revenue_ttm, ss.net_income_ttm, ss.ebitda_ttm, ss.ocf_ttm, ss.fcf_ttm,
            ss.eps_ttm, ss.book_value, ss.bvps,
            ss.revenue_growth, ss.eps_growth,
            ss.payout_ratio,
            -- Market data (live from market_tickers)
            mt.name_en, mt.name_ar, mt.last_price, mt.market_code, mt.currency, mt.sector_name,
            mt.pe_ratio AS mt_pe, mt.pb_ratio AS mt_pb,
            COALESCE(mt.dividend_yield, ss.dividend_yield) AS dividend_yield,
            mt.market_cap AS live_cap, mt.logo_url,
            -- Live sector averages for context (show stock vs sector)
            sa.avg_sector_pe, sa.avg_sector_pb
        FROM stock_statistics ss
        LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol AND mt.market_code = 'EGX'
        LEFT JOIN LATERAL (
            SELECT
                AVG(m2.pe_ratio) FILTER (WHERE m2.pe_ratio > 0 AND m2.pe_ratio < 100) AS avg_sector_pe,
                AVG(COALESCE(m2.pb_ratio, s2.pb_ratio)) FILTER (WHERE COALESCE(m2.pb_ratio, s2.pb_ratio) > 0) AS avg_sector_pb
            FROM market_tickers m2
            LEFT JOIN stock_statistics s2 ON m2.symbol = s2.symbol AND m2.market_code = s2.market_code
            WHERE m2.sector_name = mt.sector_name AND m2.market_code = 'EGX'
        ) sa ON true
        WHERE ss.symbol = $1
    """
    stats_record = await conn.fetchrow(sql, symbol)
    
    if not stats_record:
        # Fallback to market_tickers if no statistics
        ticker = await conn.fetchrow("""
            SELECT symbol, name_en, name_ar, market_code, currency, last_price, sector_name,
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
            'cards': [
                {
                    'type': 'stock_header',
                    'data': {
                        'symbol': symbol,
                        'name': name,
                        'market_code': ticker['market_code'],
                        'currency': ticker['currency'] or 'EGP',
                        'sector': ticker.get('sector_name')
                    }
                },
                {
                    'type': 'stats',
                    'title': 'Basic Statistics',
                    'data': {
                        'pe_ratio': safe_float(ticker['pe_ratio']),
                        'pb_ratio': safe_float(ticker['pb_ratio']),
                        'dividend_yield': safe_float(ticker['dividend_yield']),
                        'market_cap': int(ticker['market_cap']) if ticker['market_cap'] else None,
                    }
                }
            ]
        }
    
    # Safely convert Record to dict to allow .get() access
    stats = dict(stats_record)
    
    name = stats['name_ar'] if language == 'ar' else stats['name_en']
    currency = stats['currency'] or 'EGP'
    
    # helper using new unified TTM column names
    def get_val(key, fallback_key=None):
        val = stats.get(key)
        if val is not None: return safe_float(val)
        if fallback_key:
            f_val = stats.get(fallback_key)
            if f_val is not None: return safe_float(f_val)
        return None

    # Valuation: prefer mt_pe (live quote-based) then live_pe (stock_statistics)
    pe = get_val('mt_pe', 'live_pe')
    pb = get_val('mt_pb', 'live_pb')
    ps = get_val('live_ps')
    # Sector context for displaying "P/E 11.4x vs sector avg 18.2x"
    sector_avg_pe = safe_float(stats.get('avg_sector_pe'))
    sector_avg_pb = safe_float(stats.get('avg_sector_pb'))

    # TTM accounting ratios — directly from stock_statistics (unified TTM source)
    roe  = get_val('roe')
    roa  = get_val('roa')
    roic = get_val('roic')
    roce = get_val('live_roce')
    gm   = get_val('gross_margin')
    om   = get_val('operating_margin')
    nm   = get_val('profit_margin')
    curr_r = get_val('current_ratio')
    de   = get_val('debt_equity_ratio')

    # Build comprehensive message (Conditional Line Inclusion)
    lines = [f"📊 **{'إحصائيات شاملة لـ' if language == 'ar' else 'Comprehensive Statistics for'} {name}** ({symbol})\n"]

    # Valuation with live sector context
    val_lines = []
    pe_str = _format_number(pe)
    pb_str = _format_number(pb)
    ps_str = _format_number(ps)

    if pe_str:
        if sector_avg_pe and pe and sector_avg_pe > 0:
            discount = round((1 - pe / sector_avg_pe) * 100)
            relation = f"({abs(discount)}% discount vs sector)" if discount > 5 else (f"({abs(discount)}% premium vs sector)" if discount < -5 else "(inline with sector)")
            val_lines.append(f"• {'مضاعف الربحية' if language == 'ar' else 'P/E Ratio'}: {pe_str}x — sector avg {sector_avg_pe:.1f}x {relation}")
        else:
            val_lines.append(f"• {'مضاعف الربحية' if language == 'ar' else 'P/E Ratio'}: {pe_str}x")
    if pb_str:
        if sector_avg_pb and pb and sector_avg_pb > 0:
            pb_discount = round((1 - pb / sector_avg_pb) * 100)
            pb_relation = f"({abs(pb_discount)}% discount)" if pb_discount > 5 else (f"({abs(pb_discount)}% premium)" if pb_discount < -5 else "(inline with sector)")
            val_lines.append(f"• {'مضاعف القيمة الدفترية' if language == 'ar' else 'P/B Ratio'}: {pb_str}x — sector avg {sector_avg_pb:.2f}x {pb_relation}")
        else:
            val_lines.append(f"• {'مضاعف القيمة الدفترية' if language == 'ar' else 'P/B Ratio'}: {pb_str}x")
    if ps_str: val_lines.append(f"• P/S: {ps_str}x")
    
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
        
    # 5. Market Metrics
    tech_lines = []
    beta_str = _format_number(stats.get('beta_5y'))
    rsi_str = _format_number(stats.get('rsi_14'))
    
    if beta_str: tech_lines.append(f"• {'Beta' if language == 'en' else 'بيتا'} (5Y): {beta_str}")
    if rsi_str: tech_lines.append(f"• RSI (14): {rsi_str}")
    
    if tech_lines:
        lines.append(f"📉 **{'مؤشرات التداول' if language == 'ar' else 'Market Indicators'}:**")
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
                    'currency': currency,
                    'sector': stats.get('sector_name')
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
            {'label': '💎 Deep Valuation', 'label_ar': '💎 تقييم معمق', 'action_type': 'query', 'payload': f'Deep valuation analysis of {symbol} — is it cheap or expensive?'},
            {'label': '🛡️ Safety Score', 'label_ar': '🛡️ درجة الأمان', 'action_type': 'query', 'payload': f'Show {symbol} financial safety score and health metrics'},
            {'label': '⚖️ Peer Comparison', 'label_ar': '⚖️ مقارنة بالأقران', 'action_type': 'query', 'payload': f'Compare {symbol} key ratios against sector peers'},
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
