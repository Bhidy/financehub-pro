"""
Statistics Handler - Handles queries about stock statistics (PE, ROE, margins, etc.)
Uses the stock_statistics table for comprehensive metrics.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
from typing import Dict, Any, Optional
import math


SECTOR_METRIC_CONFIG = {
    "pe_ratio": {
        "expression": "COALESCE(mt.pe_ratio, ss.pe_ratio)",
        "label_en": "P/E",
        "label_ar": "مكرر الربحية",
        "unit": "x",
        "filter_sql": "COALESCE(mt.pe_ratio, ss.pe_ratio) > 0 AND COALESCE(mt.pe_ratio, ss.pe_ratio) < 100",
        "format_kind": "multiple",
    },
    "pb_ratio": {
        "expression": "COALESCE(mt.pb_ratio, ss.pb_ratio)",
        "label_en": "P/B",
        "label_ar": "مضاعف القيمة الدفترية",
        "unit": "x",
        "filter_sql": "COALESCE(mt.pb_ratio, ss.pb_ratio) > 0 AND COALESCE(mt.pb_ratio, ss.pb_ratio) < 20",
        "format_kind": "multiple",
    },
    "ev_ebitda": {
        "expression": "ss.ev_ebitda",
        "label_en": "EV/EBITDA",
        "label_ar": "EV/EBITDA",
        "unit": "x",
        "filter_sql": "ss.ev_ebitda > 0 AND ss.ev_ebitda < 50",
        "format_kind": "multiple",
    },
    "roe": {
        "expression": "ss.roe",
        "label_en": "ROE",
        "label_ar": "العائد على حقوق الملكية",
        "unit": "%",
        "filter_sql": "ss.roe > -1 AND ss.roe < 5",
        "format_kind": "decimal_percent",
    },
    "roa": {
        "expression": "ss.roa",
        "label_en": "ROA",
        "label_ar": "العائد على الأصول",
        "unit": "%",
        "filter_sql": "ss.roa > -1 AND ss.roa < 2",
        "format_kind": "decimal_percent",
    },
    "debt_equity": {
        "expression": "ss.debt_equity",
        "label_en": "Debt/Equity",
        "label_ar": "الدين إلى حقوق الملكية",
        "unit": "x",
        "filter_sql": "ss.debt_equity >= 0 AND ss.debt_equity < 20",
        "format_kind": "multiple",
    },
    "current_ratio": {
        "expression": "ss.current_ratio",
        "label_en": "Current Ratio",
        "label_ar": "نسبة التداول",
        "unit": "x",
        "filter_sql": "ss.current_ratio > 0 AND ss.current_ratio < 20",
        "format_kind": "multiple",
    },
}

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


def _normalize_sector_metric(metric: Optional[str]) -> Optional[str]:
    text = str(metric or "").strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "pe": "pe_ratio",
        "p/e": "pe_ratio",
        "pe_ratio": "pe_ratio",
        "price_to_earnings": "pe_ratio",
        "pb": "pb_ratio",
        "p/b": "pb_ratio",
        "pb_ratio": "pb_ratio",
        "price_to_book": "pb_ratio",
        "ev_ebitda": "ev_ebitda",
        "ev/ebitda": "ev_ebitda",
        "roe": "roe",
        "roa": "roa",
        "debt_equity": "debt_equity",
        "debt_to_equity": "debt_equity",
        "current_ratio": "current_ratio",
    }
    return mapping.get(text)


def _format_sector_metric_value(value: Any, format_kind: str, unit: str) -> Optional[str]:
    f_val = safe_float(value)
    if f_val is None:
        return None

    if format_kind == "decimal_percent":
        return f"{f_val * 100:.1f}%"

    decimals = 2 if unit == "x" else 1
    return f"{f_val:.{decimals}f}{unit}"


async def handle_sector_metric_average(
    conn: asyncpg.Connection,
    sector: str,
    metric: str,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Return a sector-level benchmark for a requested metric.

    This is for prompts like "What is the average P/E for the food and beverage sector?"
    and must stay separate from single-stock statistics flows.
    """
    metric_key = _normalize_sector_metric(metric)
    config = SECTOR_METRIC_CONFIG.get(metric_key or "")

    if not sector or not config:
        return {
            "success": False,
            "error": "sector_metric_not_supported",
            "message": (
                "I need both a valid sector and metric to calculate a sector benchmark."
                if language == "en"
                else "أحتاج إلى قطاع ومقياس صالحين لحساب مرجع القطاع."
            ),
            "cards": [],
        }

    sql = f"""
        WITH sector_universe AS (
            SELECT COUNT(*)::int AS total_companies
            FROM market_tickers mt
            WHERE mt.market_code = 'EGX'
              AND mt.sector_name = $1
        ),
        sector_metrics AS (
            SELECT
                mt.symbol,
                mt.name_en,
                mt.name_ar,
                ({config["expression"]})::double precision AS metric_value
            FROM market_tickers mt
            LEFT JOIN stock_statistics ss
                ON mt.symbol = ss.symbol
               AND mt.market_code = ss.market_code
            WHERE mt.market_code = 'EGX'
              AND mt.sector_name = $1
              AND {config["filter_sql"]}
        )
        SELECT
            u.total_companies,
            COUNT(sm.symbol)::int AS covered_companies,
            AVG(sm.metric_value) AS average_value,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sm.metric_value) AS median_value,
            MIN(sm.metric_value) AS min_value,
            MAX(sm.metric_value) AS max_value
        FROM sector_universe u
        LEFT JOIN sector_metrics sm ON true
        GROUP BY u.total_companies
    """
    row = await conn.fetchrow(sql, sector)

    if not row or not row["covered_companies"]:
        metric_label = config["label_ar"] if language == "ar" else config["label_en"]
        return {
            "success": True,
            "message": (
                f"I couldn't find enough usable {metric_label} data for the {sector} sector yet."
                if language == "en"
                else f"لا توجد بيانات كافية حالياً عن {metric_label} لقطاع {sector}."
            ),
            "cards": [],
            "source_tables": ["market_tickers", "stock_statistics"],
        }

    label = config["label_ar"] if language == "ar" else config["label_en"]
    avg_display = _format_sector_metric_value(row["average_value"], config["format_kind"], config["unit"])
    median_display = _format_sector_metric_value(row["median_value"], config["format_kind"], config["unit"])
    min_display = _format_sector_metric_value(row["min_value"], config["format_kind"], config["unit"])
    max_display = _format_sector_metric_value(row["max_value"], config["format_kind"], config["unit"])
    covered = int(row["covered_companies"] or 0)
    total = int(row["total_companies"] or covered)

    if language == "ar":
        message = (
            f"متوسط {label} لقطاع **{sector}** يبلغ **{avg_display}** "
            f"استناداً إلى **{covered}** شركة من أصل **{total}** شركة EGX لديها بيانات قابلة للاستخدام.\n\n"
            f"الوسيط يبلغ **{median_display}**، وهو المرجع الأكثر صلابة في التحليل لأن اسماً أو اسمين مرتفعي المضاعف "
            f"قد يرفعان المتوسط الحسابي بشكل مضلل."
        )
        title = f"مرجع القطاع: {label}"
        methodology = "المرجع المفضل"
        coverage_label = "التغطية"
        range_label = "النطاق"
        average_label = f"متوسط {label}"
        median_label = f"وسيط {label}"
        methodology_value = "الوسيط"
    else:
        message = (
            f"The **{sector}** sector is trading at an arithmetic average **{label}** of **{avg_display}**, "
            f"based on **{covered}** out of **{total}** EGX names with usable data.\n\n"
            f"The median is **{median_display}**, which is the more reliable valuation benchmark because one or two "
            f"high-multiple names can skew the simple average."
        )
        title = f"{sector} {label} Benchmark"
        methodology = "Preferred benchmark"
        coverage_label = "Coverage"
        range_label = "Range"
        average_label = f"Average {label}"
        median_label = f"Median {label}"
        methodology_value = "Median"

    return {
        "success": True,
        "message": message,
        "conversational_text": message,
        "cards": [
            {
                "type": "metric",
                "title": title,
                "data": {
                    average_label: avg_display,
                    median_label: median_display,
                    coverage_label: f"{covered}/{total}",
                    range_label: f"{min_display} - {max_display}",
                    methodology: methodology_value,
                },
            }
        ],
        "key_insight": (
            f"For sector valuation work, anchor on the median {label}, not just the arithmetic average."
            if language == "en"
            else f"في تقييم القطاع، اعتمد على وسيط {label} وليس المتوسط الحسابي فقط."
        ),
        "follow_up_prompt": (
            f"Want me to rank the cheapest names in {sector}, or compare this sector's valuation with another EGX sector?"
            if language == "en"
            else f"هل تريد ترتيب أرخص أسهم {sector} أو مقارنة تقييم هذا القطاع بقطاع آخر في EGX؟"
        ),
        "actions": [
            {
                "label": (
                    f"Cheapest {sector} stocks"
                    if language == "en"
                    else f"أرخص أسهم {sector}"
                ),
                "label_ar": f"أرخص أسهم {sector}",
                "action_type": "query",
                "payload": f"Show the most undervalued stocks in {sector}",
            },
            {
                "label": (
                    f"Compare {sector} valuation to the market"
                    if language == "en"
                    else f"قارن تقييم {sector} بالسوق"
                ),
                "label_ar": f"قارن تقييم {sector} بالسوق",
                "action_type": "query",
                "payload": f"How does the {sector} sector valuation compare to the overall market?",
            },
        ],
        "source_tables": ["market_tickers", "stock_statistics"],
    }


async def handle_stock_statistics(
    conn: asyncpg.Connection,
    symbol: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle comprehensive stock statistics query.
    Returns valuation ratios, efficiency metrics, margins, etc.
    """
    # TV-ONLY SOURCE (June-2026 chat realignment): stock_stats_view — the SAME
    # TradingView-fed view the website /symbol page reads. The old stock_statistics
    # table narrated frozen May-28 values for margins/ROE/payout.
    # UNITS: the view stores percentages; this handler's formatters expect
    # FRACTIONS (they multiply by 100), so percent fields are divided by 100 here.
    # Fields TradingView does not provide (P/S, PEG, EV/*, ROIC/ROCE, current/quick,
    # D/E, interest coverage, Altman/Piotroski, EBITDA-TTM, OCF, payout) are NULL —
    # the message builder and stats card silently skip nulls.
    sql = """
        SELECT
            ss.pe_ratio AS live_pe, ss.pb_ratio AS live_pb, NULL::numeric AS live_ps,
            ss.forward_pe, NULL::numeric AS peg_ratio, NULL::numeric AS ev_ebitda, NULL::numeric AS ev_sales,
            ss.beta_1y, ss.rsi_14, ss.ma_50d, ss.ma_200d,
            ss.roe / 100 AS roe, ss.roa / 100 AS roa, NULL::numeric AS roic, NULL::numeric AS live_roce,
            ss.gross_margin / 100 AS gross_margin, ss.operating_margin / 100 AS operating_margin,
            ss.profit_margin / 100 AS profit_margin,
            NULL::numeric AS live_ebitda_margin, NULL::numeric AS fcf_margin,
            NULL::numeric AS current_ratio, NULL::numeric AS quick_ratio,
            NULL::numeric AS debt_equity_ratio,
            NULL::numeric AS interest_coverage, NULL::numeric AS altman_z_score, NULL::numeric AS piotroski_f_score,
            ss.revenue_ttm, ss.net_income_ttm, NULL::numeric AS ebitda_ttm, NULL::numeric AS ocf_ttm, ss.fcf_ttm,
            ss.eps_ttm, ss.book_value, ss.bvps,
            ss.revenue_growth / 100 AS revenue_growth, ss.eps_growth / 100 AS eps_growth,
            NULL::numeric AS payout_ratio,
            -- Market data (live from market_tickers)
            mt.name_en, mt.name_ar, mt.last_price, mt.market_code, mt.currency, mt.sector_name,
            mt.pe_ratio AS mt_pe, mt.pb_ratio AS mt_pb,
            ss.dividend_yield,
            mt.market_cap AS live_cap, mt.logo_url,
            -- Live sector averages for context (show stock vs sector)
            sa.avg_sector_pe, sa.avg_sector_pb
        FROM stock_stats_view ss
        LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol AND mt.market_code = 'EGX'
        LEFT JOIN LATERAL (
            SELECT
                AVG(m2.pe_ratio) FILTER (WHERE m2.pe_ratio > 0 AND m2.pe_ratio < 100) AS avg_sector_pe,
                AVG(m2.pb_ratio) FILTER (WHERE m2.pb_ratio > 0) AS avg_sector_pb
            FROM market_tickers m2
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
                        'currency': get_ticker_currency(ticker),
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
    currency = get_ticker_currency(stats)
    
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
    beta_str = _format_number(stats.get('beta_1y'))
    rsi_str = _format_number(stats.get('rsi_14'))

    if beta_str: tech_lines.append(f"• {'Beta' if language == 'en' else 'بيتا'} (1Y): {beta_str}")
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
                    'beta': safe_float(stats.get('beta_1y')), # Frontend uses 'beta'; TV beta is 1Y
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
    
    # Map common queries to stock_stats_view columns (TradingView-fed).
    # P/S and Debt/Equity were dropped — TradingView does not provide them for
    # EGX; unknown metrics fall through to the full-statistics answer.
    metric_map = {
        'pe': ('pe_ratio', 'P/E Ratio', 'مضاعف الربحية'),
        'pb': ('pb_ratio', 'P/B Ratio', 'مضاعف القيمة الدفترية'),
        'roe': ('roe', 'Return on Equity', 'العائد على حقوق الملكية'),
        'roa': ('roa', 'Return on Assets', 'العائد على الأصول'),
        'margin': ('profit_margin', 'Profit Margin', 'هامش الربح'),
        'beta': ('beta_1y', 'Beta (1Y)', 'بيتا (سنة)'),
    }
    
    metric_key = metric.lower().replace('ratio', '').replace(' ', '').strip()
    
    if metric_key not in metric_map:
        # Default to full statistics
        return await handle_stock_statistics(conn, symbol, language)
    
    col_name, label_en, label_ar = metric_map[metric_key]
    label = label_ar if language == 'ar' else label_en
    
    # Get specific metric from the TradingView-fed view
    row = await conn.fetchrow(f"""
        SELECT ss.{col_name}, mt.name_en, mt.name_ar
        FROM stock_stats_view ss
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
    elif col_name in ['roe', 'roa', 'profit_margin', 'gross_margin', 'operating_margin']:
        # stock_stats_view stores these as PERCENT values already (TradingView)
        formatted = f"{float(value):.2f}%"
    else:
        formatted = f"{float(value):.2f}"
    
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
