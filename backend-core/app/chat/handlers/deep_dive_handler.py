
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


def _is_bank_like_sector(raw_sector: Optional[str]) -> bool:
    if not raw_sector:
        return False
    sector = str(raw_sector).strip().lower()
    return (
        "bank" in sector
        or "financial" in sector
        or "بنوك" in sector
        or "مصارف" in sector
        or "خدمات مالية" in sector
    )


async def handle_deep_safety(conn: asyncpg.Connection, symbol: str, market: str, lang: str = 'en') -> ChatResponse:
    """Analyze Financial Safety (Altman Z-Score, Piotroski F-Score)."""
    
    # 1. Fetch Deep Data
    row = await conn.fetchrow("""
        SELECT 
            s.altman_z_score, s.piotroski_f_score, s.debt_equity, s.current_ratio, 
            s.interest_coverage, s.quick_ratio, s.debt_ebitda,
            m.name_en, m.name_ar, m.currency, m.sector_name
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Stock not found.", meta={'intent': 'DEEP_SAFETY', 'confidence': 1.0, 'entities': {}})

    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    currency = row['currency']
    

    # All ratios come from stock_statistics (TTM) — no annual history needed
    z_score = float(row['altman_z_score']) if row['altman_z_score'] is not None else None
    f_score = int(row['piotroski_f_score']) if row['piotroski_f_score'] is not None else None
    current_ratio = float(row['current_ratio']) if row['current_ratio'] else None
    quick_ratio = float(row['quick_ratio']) if row['quick_ratio'] else None
    int_cov = row['interest_coverage']
    debt_ebitda = row['debt_ebitda']

    is_bank_sector = _is_bank_like_sector(row.get("sector_name"))
    safety_status = "Unknown"
    if is_bank_sector:
        # Altman Z is not a bank-valid framework.
        z_score = None
        safety_status = "Not Applicable for Banks ⚪"
    elif z_score is not None:
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
        if is_bank_sector:
            msg += "**Altman Z-Score**: Not Applicable for Banks (use capital adequacy, NPL quality, provisioning, and liquidity structure)\n"
        else:
            msg += f"**Altman Z-Score**: {z_score if z_score is not None else 'N/A'} ({safety_status})\n"
        msg += f"**Piotroski F-Score**: {f_score if f_score is not None else 'N/A'}/9\n"
    else:
        msg = f"🛡️ **تحليل المخاطر لـ {symbol}**\n\n"
        if is_bank_sector:
            msg += "**مؤشر ألتمان**: غير مناسب للبنوك (الأفضل التركيز على كفاية رأس المال وجودة الأصول والمخصصات والسيولة)\n"
        else:
            msg += f"**مؤشر ألتمان**: {z_score if z_score is not None else 'N/A'} ({safety_status})\n"
        msg += f"**مؤشر بيوتروسكي**: {f_score if f_score is not None else 'N/A'}/9\n"

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
    chart = None
    if row['debt_equity'] is not None:
        de_ratio = float(row['debt_equity'])
        chart = ChartPayload(
            type=ChartType.DONUT,
            symbol=symbol,
            title="Capital Structure (Debt vs Equity)" if lang == 'en' else "هيكل رأس المال (الديون مقابل حقوق الملكية)",
            data=[
                {"label": "Debt" if lang == 'en' else "الديون", "value": de_ratio},
                {"label": "Equity" if lang == 'en' else "حقوق الملكية", "value": 1.0}
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
        return ChatResponse(message_text="Data not found.", meta={'intent': 'UNKNOWN', 'confidence': 1.0})

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
        return ChatResponse(message_text="Data not found.", meta={'intent': 'UNKNOWN', 'confidence': 1.0})
        
    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    # All efficiency ratios come from stock_statistics (TTM) directly
    roce = float(row['roce']) if row['roce'] is not None else None
    roe = float(row['roe']) if row['roe'] else None
    roic = float(row['roic']) if row['roic'] else None
    asset_to = row['asset_turnover'] if row['asset_turnover'] else None
    inv_to = row['inventory_turnover'] if row['inventory_turnover'] else None

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
            s.revenue_ttm, s.net_income_ttm, s.eps_ttm,
            m.name_en, m.name_ar, m.currency
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE s.symbol = $1 AND s.market_code = $2
    """, symbol, market)
    
    if not row:
        return ChatResponse(message_text="Data not found.", meta={'intent': 'UNKNOWN', 'confidence': 1.0})
        
    name = row['name_ar'] if lang == 'ar' and row['name_ar'] else row['name_en']
    currency = row['currency']
    
    
    # Revenue and profit growth from stock_statistics. These are stored as
    # FRACTIONS (0.1202 = 12.02%); convert to percent for the verdict thresholds
    # and display below.
    rev_growth = float(row['revenue_growth']) * 100 if row['revenue_growth'] is not None else None
    prof_growth = float(row['profit_growth']) * 100 if row['profit_growth'] is not None else None

    reg_peg = float(row['peg_ratio']) if row['peg_ratio'] is not None else None

    growth_verdict = "Unknown"
    if rev_growth is not None and prof_growth is not None:
        if rev_growth > 20 and prof_growth > 20: growth_verdict = "Hyper Growth 🚀"
        elif rev_growth > 10: growth_verdict = "Steady Growth 🌿"
        elif rev_growth < 0: growth_verdict = "Declining 📉"
        else: growth_verdict = "Stagnant 🐢"

    rev_str = f"{rev_growth:.2f}" if rev_growth is not None else "N/A"
    prof_str = f"{prof_growth:.2f}" if prof_growth is not None else "N/A"

    msg = f"🌱 **Growth Engine: {symbol}**\n\n"
    if lang == 'en':
        msg += f"**Verdict**: {growth_verdict}\n"
        msg += f"**Revenue Growth**: {rev_str}% (Y/Y)\n"
        msg += f"**Profit Growth**: {prof_str}% (Y/Y)\n"
        msg += f"**PEG Ratio**: {reg_peg or 'N/A'}\n"
    else:
        msg += f"**التقييم**: {growth_verdict}\n"
        msg += f"**نمو الإيرادات**: {rev_str}% (سنوي)\n"
        msg += f"**نمو الأرباح**: {prof_str}% (سنوي)\n"
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
                "EPS Growth": f"{float(row['eps_growth']) * 100:.2f}%" if row['eps_growth'] is not None else "N/A",
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
            {"label": "Net Income", "value": float(row['net_income_ttm'] or 0)}
        ],
        range="1Y"
    )
    
    return ChatResponse(message_text=msg, cards=[card], chart=chart, meta={'intent': 'DEEP_GROWTH', 'confidence': 1.0})
