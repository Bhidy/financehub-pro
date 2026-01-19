
from typing import Dict, Any, List, Optional
import asyncpg
from ..schemas import ChatResponse, Card, CardType, ChartPayload, ChartType

# Helper functions
def format_currency(val: float, currency: str) -> str:
    if not val: return "N/A"
    return f"{currency} {val:,.2f}"

def format_number(val: float) -> str:
    if not val: return "N/A"
    return f"{val:,.2f}"


async def handle_deep_safety(conn: asyncpg.Connection, symbol: str, market: str, lang: str = 'en') -> ChatResponse:
    """Analyze Financial Safety (Altman Z-Score, Piotroski F-Score)."""
    
    # 1. Fetch Deep Data
    row = await conn.fetchrow("""
        SELECT 
            s.altman_z_score, s.piotroski_f_score, s.debt_equity, s.current_ratio, 
            s.interest_coverage, s.quick_ratio, s.debt_ebitda,
            m.name_en, m.name_ar, m.currency
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Stock not found.", meta={'intent': 'DEEP_SAFETY', 'confidence': 1.0, 'entities': {}})

    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    currency = row['currency']
    
    
    # 2. Fetch Robust Ratios from History (if available) - Fallback/Primary Source
    ratios = await conn.fetchrow("""
        SELECT current_ratio, quick_ratio, debt_equity
        FROM financial_ratios_history
        WHERE symbol = $1 AND period_type = 'annual'
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)
    
    # 3. Logic: Interpret Z-Score
    z_score = float(row['altman_z_score']) if row['altman_z_score'] is not None else None
    f_score = int(row['piotroski_f_score']) if row['piotroski_f_score'] is not None else None
    
    safety_status = "Unknown"
    if z_score is not None:
        if z_score > 2.99:
            safety_status = "Safe Zone 🟢"
        elif z_score > 1.81:
            safety_status = "Grey Zone 🟡"
        else:
            safety_status = "Distress Zone 🔴"
    else:
        safety_status = "Data Unavailable ⚪"

    msg = f"🛡️ **Safety Analysis for {symbol}**\n\n"
    if lang == 'en':
        msg += f"**Altman Z-Score**: {z_score if z_score is not None else 'N/A'} ({safety_status})\n"
        msg += f"**Piotroski F-Score**: {f_score if f_score is not None else 'N/A'}/9\n"
    else:
        msg = f"🛡️ **تحليل المخاطر لـ {symbol}**\n\n"
        msg += f"**مؤشر ألتمان**: {z_score if z_score is not None else 'N/A'} ({safety_status})\n"
        msg += f"**مؤشر بيوتروسكي**: {f_score if f_score is not None else 'N/A'}/9\n"

    # Merge Data sources
    current_ratio = float(ratios['current_ratio']) if ratios and ratios['current_ratio'] else (row['current_ratio'] or None)
    quick_ratio = float(ratios['quick_ratio']) if ratios and ratios['quick_ratio'] else (row['quick_ratio'] or None)
    int_cov = row['interest_coverage'] # Only in stock_statistics
    debt_ebitda = row['debt_ebitda'] # Only in stock_statistics

    # 4. Ultra Premium Card
    card = Card(
        type=CardType.DEEP_HEALTH,
        title=f"🛡️ {name} Safety Profile",
        data={
            "symbol": symbol,
            "z_score": z_score,
            "f_score": f_score,
            "status": safety_status,
            "metrics": {
                "Current Ratio": current_ratio,
                "Quick Ratio": quick_ratio,
                "Interest Cov": int_cov,
                "Debt/EBITDA": debt_ebitda
            }
        }
    )
    
    # Donut Chart: Debt vs Equity (Approximate using D/E Ratio)
    de_ratio = float(row['debt_equity']) if row['debt_equity'] else 0.5
    debt_part = de_ratio
    equity_part = 1.0
    
    chart = ChartPayload(
        type=ChartType.DONUT,
        symbol=symbol,
        title="Capital Structure (Debt vs Equity)",
        data=[
            {"label": "Debt", "value": debt_part},
            {"label": "Equity", "value": equity_part}
        ],
        range="1Y"
    )
    
    return ChatResponse(
        message_text=msg,
        cards=[card],
        chart=chart,
        meta={'intent': 'DEEP_SAFETY', 'confidence': 1.0, 'entities': {'symbol': symbol}}
    )

async def handle_deep_valuation(conn: asyncpg.Connection, symbol: str, market: str, lang: str = 'en') -> ChatResponse:
    """Analyze Deep Valuation (EV/EBIT, P/TBV, PEG)."""
    row = await conn.fetchrow("""
        SELECT 
            s.ev_ebit, s.p_tbv, s.p_ocf, s.peg_ratio, s.pe_ratio, s.forward_pe,
            s.ev_sales, s.pb_ratio, s.enterprise_value,
            m.name_en, m.name_ar, m.currency
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Data not found.", meta={})

    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    
    # Fetch Supplementary Ratios from Tickers/History
    # financial_ratios_history doesn't have PE/PB usually, rely on market_tickers or stock_statistics
    
    # Logic
    ev_ebit = float(row['ev_ebit']) if row['ev_ebit'] is not None else None
    
    # Robust Value Extraction (From stats table itself mostly)
    pe_ratio = float(row['pe_ratio']) if row['pe_ratio'] is not None else None
    peg_ratio = float(row['peg_ratio']) if row['peg_ratio'] is not None else None
    pb_ratio = float(row['pb_ratio']) if row['pb_ratio'] is not None else None
    
    verdict = "Fairly Valued"
    if ev_ebit and ev_ebit < 10: verdict = "Undervalued 🟢"
    elif ev_ebit and ev_ebit > 25: verdict = "Overvalued 🔴"
    
    msg = f"💎 **Valuation Deep Dive: {symbol}**\n\n"
    if lang == 'en':
        msg += f"**Verdict**: {verdict}\n"
        msg += f"**EV / EBIT**: {ev_ebit if ev_ebit is not None else 'N/A'}\n"
    else:
        msg = f"💎 **التقييم العميق لـ {symbol}**\n\n"
        msg += f"**التقييم**: {verdict}\n"
        msg += f"**قيمة المنشأة / الربح التشغيلي**: {ev_ebit if ev_ebit is not None else 'N/A'}\n"

    card = Card(
        type=CardType.DEEP_VALUATION,
        title=f"💎 {name} Valuation Matrix",
        data={
            "symbol": symbol,
            "verdict": verdict,
            "multiples": {
                "EV/EBIT": row['ev_ebit'],
                "P/TBV": row['p_tbv'],
                "P/OCF": row['p_ocf'],
                "PEG": peg_ratio,
                "P/E": pe_ratio,
                "Fwd P/E": row['forward_pe']
            }
        }
    )
    
    # Bar Chart: Relative Valuation
    chart = ChartPayload(
        type=ChartType.BAR,
        symbol=symbol,
        title="Valuation Multiples",
        data=[
            {"label": "P/E", "value": float(pe_ratio or 0)},
            {"label": "EV/EBIT", "value": ev_ebit or 0},
            {"label": "P/B", "value": float(pb_ratio or 0)}
        ],
        range="1Y"
    )
    
    return ChatResponse(message_text=msg, cards=[card], chart=chart, meta={'intent': 'DEEP_VALUATION', 'confidence': 1.0})

async def handle_deep_efficiency(conn: asyncpg.Connection, symbol: str, market: str, lang: str = 'en') -> ChatResponse:
    """Analyze Efficiency (ROCE, Asset Turnover)."""
    row = await conn.fetchrow("""
        SELECT 
            s.roce, s.asset_turnover, s.inventory_turnover, s.roic, s.roe, s.roa,
            m.name_en, m.name_ar
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Data not found.", meta={})
        
    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    # Fetch Supplementary Ratios
    ratios = await conn.fetchrow("""
        SELECT roe, roa, roic, asset_turnover, inventory_turnover
        FROM financial_ratios_history
        WHERE symbol = $1 AND period_type = 'annual'
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)

    roce = float(row['roce']) if row['roce'] is not None else None
    roe = float(ratios['roe']) if ratios and ratios['roe'] else (row['roe'] or None)
    roic = float(ratios['roic']) if ratios and ratios['roic'] else (row['roic'] or None)
    asset_to = ratios['asset_turnover'] if ratios and ratios['asset_turnover'] else (row['asset_turnover'] or None)
    inv_to = ratios['inventory_turnover'] if ratios and ratios['inventory_turnover'] else (row['inventory_turnover'] or None)

    msg = f"⚡ **Efficiency Engine: {symbol}**\n\n"
    if lang == 'en':
        msg += f"**ROCE**: {roce:.2f}%\n" if roce is not None else "**ROCE**: N/A\n"
        msg += f"**Asset Turnover**: {asset_to or 'N/A'}x\n"
    else:
        msg += f"**العائد على رأس المال**: {roce:.2f}%\n" if roce is not None else "**العائد على رأس المال**: N/A\n"
        msg += f"**دوران الأصول**: {asset_to or 'N/A'}x\n"

    card = Card(
        type=CardType.DEEP_EFFICIENCY,
        title=f"⚡ {name} Operational Efficiency",
        data={
            "symbol": symbol,
            "roce": roce,
            "metrics": {
                "Asset Turnover": asset_to,
                "Inv Turnover": inv_to,
                "ROIC": roic,
                "ROE": roe
            }
        }
    )
    
    # Column Chart: Returns Comparison
    chart = ChartPayload(
        type=ChartType.COLUMN,
        symbol=symbol,
        title="Efficiency Returns (%)",
        data=[
            {"label": "ROE", "value": float(roe or 0)},
            {"label": "ROCE", "value": float(roce or 0)},
            {"label": "ROIC", "value": float(roic or 0)}
        ],
        range="1Y"
    )
    
    return ChatResponse(message_text=msg, cards=[card], chart=chart, meta={'intent': 'DEEP_EFFICIENCY', 'confidence': 1.0})

async def handle_deep_growth(conn: asyncpg.Connection, symbol: str, market: str, lang: str = 'en') -> ChatResponse:
    """Analyze Growth (CAGR, Future Potential)."""
    row = await conn.fetchrow("""
        SELECT 
            s.revenue_growth, s.profit_growth, s.eps_growth, s.peg_ratio,
            s.revenue_ttm, s.net_income, s.eps,
            m.name_en, m.name_ar, m.currency
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Data not found.", meta={})
        
    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    currency = row['currency']
    
    
    # Fetch Supplementary Ratios
    ratios = await conn.fetchrow("""
        SELECT revenue_growth, net_income_growth
        FROM financial_ratios_history
        WHERE symbol = $1 AND period_type = 'annual'
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)

    rev_growth = float(row['revenue_growth']) if row['revenue_growth'] is not None else None
    if rev_growth is None and ratios:
         rev_growth = float(ratios['revenue_growth']) if ratios['revenue_growth'] else None
    
    prof_growth = float(row['profit_growth']) if row['profit_growth'] is not None else None
    if prof_growth is None and ratios:
         prof_growth = float(ratios['net_income_growth']) if ratios['net_income_growth'] else None

    reg_peg = float(row['peg_ratio']) if row['peg_ratio'] is not None else None

    growth_verdict = "Unknown"
    if rev_growth is not None and prof_growth is not None:
        if rev_growth > 20 and prof_growth > 20: growth_verdict = "Hyper Growth 🚀"
        elif rev_growth > 10: growth_verdict = "Steady Growth 🌿"
        elif rev_growth < 0: growth_verdict = "Declining 📉"
        else: growth_verdict = "Stagnant 🐢"

    msg = f"🌱 **Growth Engine: {symbol}**\n\n"
    if lang == 'en':
        msg += f"**Verdict**: {growth_verdict}\n"
        msg += f"**Revenue Growth**: {rev_growth if rev_growth is not None else 'N/A'}% (Y/Y)\n"
        msg += f"**Profit Growth**: {prof_growth if prof_growth is not None else 'N/A'}% (Y/Y)\n"
        msg += f"**PEG Ratio**: {reg_peg or 'N/A'}\n"
    else:
        msg += f"**التقييم**: {growth_verdict}\n"
        msg += f"**نمو الإيرادات**: {rev_growth if rev_growth is not None else 'N/A'}% (سنوي)\n"
        msg += f"**نمو الأرباح**: {prof_growth if prof_growth is not None else 'N/A'}% (سنوي)\n"
        msg += f"**مضاعف النمو (PEG)**: {reg_peg or 'N/A'}\n"

    card = Card(
        type=CardType.DEEP_GROWTH,
        title=f"🌱 {name} Growth Machine",
        data={
            "symbol": symbol,
            "verdict": growth_verdict,
            "metrics": {
                "Revenue Growth": f"{rev_growth:.2f}%" if rev_growth is not None else "N/A",
                "Profit Growth": f"{prof_growth:.2f}%" if prof_growth is not None else "N/A",
                "EPS Growth": f"{row['eps_growth']}%" if row['eps_growth'] is not None else "N/A",
                "PEG Ratio": reg_peg
            }
        }
    )
    
    # Area Chart: Financial Trend (Simulated for now, usually needs history)
    # Using TTM vs implicit previous to show slope
    chart = ChartPayload(
        type=ChartType.AREA,
        symbol=symbol,
        title="Growth Trajectory",
        data=[
            {"label": "Revenue", "value": float(row['revenue_ttm'] or 0)},
            {"label": "Net Income", "value": float(row['net_income'] or 0)}
        ],
        range="1Y"
    )
    
    return ChatResponse(message_text=msg, cards=[card], chart=chart, meta={'intent': 'DEEP_GROWTH', 'confidence': 1.0})

