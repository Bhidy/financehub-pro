"""
Starta Newsletter Email Templates
==================================
Ultra-premium HTML email templates matching Starta branding:
- Deep Navy header (#0B1121)
- Midnight Teal accents (#13B8A6)
- Inter font family
- 600px max-width responsive layout
- Bullish green (#22C55E) / Bearish red (#EF4444)
"""

from datetime import datetime
from typing import List, Dict, Optional


# ============================================================
# DESIGN TOKENS
# ============================================================

COLORS = {
    "navy": "#0B1121",
    "navy_light": "#1E293B",
    "teal": "#13B8A6",
    "teal_dark": "#0D9488",
    "teal_subtle": "rgba(19,184,166,0.08)",
    "green": "#22C55E",
    "red": "#EF4444",
    "white": "#FFFFFF",
    "surface": "#F8FAFC",
    "border": "#E2E8F0",
    "text_primary": "#1E293B",
    "text_secondary": "#64748B",
    "text_muted": "#94A3B8",
}


def _base_wrapper(content: str, unsubscribe_url: str, preview_text: str = "") -> str:
    """Wrap email content in the Starta branded shell."""
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>Starta Markets</title>
<!--[if mso]><style>table,td {{font-family: Arial, sans-serif !important;}}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: {COLORS['text_primary']}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
  table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
  img {{ border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
  a {{ color: {COLORS['teal']}; text-decoration: none; }}
  .mono {{ font-family: 'JetBrains Mono', 'Courier New', monospace; }}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
<!-- Preview text (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preview_text}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:{COLORS['white']};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<!-- ============ HEADER ============ -->
<tr>
<td style="background:linear-gradient(135deg, {COLORS['navy']} 0%, {COLORS['navy_light']} 100%);padding:28px 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <!-- Logo -->
      <div style="font-size:28px;font-weight:800;color:{COLORS['white']};letter-spacing:-0.5px;">
        <span style="color:{COLORS['teal']};">⚡</span> Starta
      </div>
      <div style="font-size:11px;font-weight:500;color:{COLORS['text_muted']};text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">Markets Intelligence</div>
    </td>
    <td align="right" style="vertical-align:top;">
      <div style="font-size:11px;color:{COLORS['text_muted']};text-align:right;">{datetime.now().strftime('%B %d, %Y')}</div>
    </td>
  </tr>
  </table>
  <!-- Teal accent line -->
  <div style="height:3px;background:linear-gradient(90deg, {COLORS['teal']}, {COLORS['teal_dark']}, transparent);border-radius:2px;margin-top:16px;"></div>
</td>
</tr>

<!-- ============ CONTENT ============ -->
{content}

<!-- ============ FOOTER ============ -->
<tr>
<td style="background:{COLORS['navy']};padding:24px 32px;text-align:center;">
  <div style="font-size:13px;font-weight:600;color:{COLORS['white']};margin-bottom:8px;">
    <span style="color:{COLORS['teal']};">⚡</span> Starta Markets
  </div>
  <div style="font-size:11px;color:{COLORS['text_muted']};line-height:1.6;">
    AI-Powered Egyptian Stock Market Intelligence<br/>
    You're receiving this because you have an account on startamarkets.com
  </div>
  <div style="margin-top:12px;">
    <a href="{unsubscribe_url}" style="font-size:11px;color:{COLORS['text_muted']};text-decoration:underline;">Unsubscribe</a>
    <span style="color:{COLORS['text_muted']};margin:0 8px;">•</span>
    <a href="https://startamarkets.com" style="font-size:11px;color:{COLORS['teal']};text-decoration:none;">Visit Starta</a>
  </div>
</td>
</tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
</body>
</html>"""


def _section_title(icon: str, title: str) -> str:
    """Render a section title with icon."""
    return f"""
<tr>
<td style="padding:24px 32px 12px;">
  <div style="font-size:16px;font-weight:700;color:{COLORS['text_primary']};">
    {icon} {title}
  </div>
</td>
</tr>"""


def _data_row(label: str, value: str, change: Optional[str] = None, is_alt: bool = False) -> str:
    """Render a single data row for stock tables."""
    bg = COLORS['surface'] if is_alt else COLORS['white']
    change_html = ""
    if change is not None:
        try:
            val = float(change.replace('%', '').replace('+', ''))
            color = COLORS['green'] if val >= 0 else COLORS['red']
            change_html = f'<td style="padding:10px 0;text-align:right;font-size:14px;font-weight:600;color:{color};font-family:\'JetBrains Mono\',monospace;">{change}</td>'
        except ValueError:
            change_html = f'<td style="padding:10px 0;text-align:right;font-size:14px;color:{COLORS["text_secondary"]};">{change}</td>'
    return f"""<tr style="background:{bg};">
  <td style="padding:10px 0;font-size:14px;font-weight:500;color:{COLORS['text_primary']};">{label}</td>
  <td style="padding:10px 0;text-align:right;font-size:14px;font-weight:600;color:{COLORS['text_primary']};font-family:'JetBrains Mono',monospace;">{value}</td>
  {change_html}
</tr>"""


def _cta_button(text: str, url: str) -> str:
    """Render a full-width CTA button."""
    return f"""
<tr>
<td style="padding:24px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="background:linear-gradient(135deg, {COLORS['teal']} 0%, {COLORS['teal_dark']} 100%);border-radius:12px;padding:16px 32px;">
      <a href="{url}" style="display:block;font-size:15px;font-weight:700;color:{COLORS['white']};text-decoration:none;letter-spacing:0.3px;">{text}</a>
    </td>
  </tr>
  </table>
</td>
</tr>"""


def _card(content_html: str) -> str:
    """Wrap content in a card with subtle border."""
    return f"""
<tr>
<td style="padding:0 32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{COLORS['white']};border:1px solid {COLORS['border']};border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;">
    {content_html}
  </td></tr>
  </table>
</td>
</tr>"""


def _divider() -> str:
    return f"""
<tr>
<td style="padding:0 32px;">
  <div style="height:1px;background:{COLORS['border']};"></div>
</td>
</tr>"""


# ============================================================
# WEEKLY MARKET PULSE TEMPLATE
# ============================================================

def build_weekly_pulse(
    user_name: str,
    egx30_value: float,
    egx30_change_pct: float,
    top_gainers: List[Dict],
    top_losers: List[Dict],
    trending_stocks: List[Dict],
    tip_of_week: str,
    unsubscribe_url: str,
) -> str:
    """Build the Weekly Market Pulse email HTML."""
    
    # EGX30 direction
    egx_color = COLORS['green'] if egx30_change_pct >= 0 else COLORS['red']
    egx_sign = "+" if egx30_change_pct >= 0 else ""
    egx_arrow = "▲" if egx30_change_pct >= 0 else "▼"
    
    # Hero section
    hero = f"""
<tr>
<td style="padding:28px 32px 20px;">
  <div style="font-size:22px;font-weight:800;color:{COLORS['text_primary']};margin-bottom:4px;">Weekly Market Pulse</div>
  <div style="font-size:13px;color:{COLORS['text_secondary']};">Your weekly EGX intelligence briefing</div>
</td>
</tr>"""

    # Greeting
    greeting = f"""
<tr>
<td style="padding:0 32px 20px;">
  <div style="font-size:15px;color:{COLORS['text_primary']};line-height:1.6;">
    Good morning{f', <strong>{user_name}</strong>' if user_name else ''}! Here's your weekly snapshot of the Egyptian stock market.
  </div>
</td>
</tr>"""

    # EGX30 Snapshot Card
    egx30_card = _card(f"""
    <div style="text-align:center;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:{COLORS['text_secondary']};margin-bottom:8px;">EGX30 INDEX</div>
      <div style="font-size:36px;font-weight:800;color:{COLORS['text_primary']};font-family:'JetBrains Mono',monospace;letter-spacing:-1px;">{egx30_value:,.2f}</div>
      <div style="display:inline-block;margin-top:8px;padding:6px 16px;border-radius:20px;background:{egx_color}15;font-size:15px;font-weight:700;color:{egx_color};">
        {egx_arrow} {egx_sign}{egx30_change_pct:.2f}%
      </div>
    </div>
    """)

    # Top Gainers table
    gainers_rows = ""
    for i, g in enumerate(top_gainers[:5]):
        change_str = f"+{g.get('change_percent', 0):.2f}%"
        gainers_rows += _data_row(
            f"<strong>{g.get('symbol', '')}</strong> <span style='color:{COLORS['text_muted']};font-size:12px;'>{g.get('name', '')[:20]}</span>",
            f"{g.get('last_price', 0):.2f}",
            change_str,
            is_alt=(i % 2 == 1)
        )
    
    gainers_section = f"""
{_section_title('📈', 'Top Gainers')}
<tr>
<td style="padding:0 32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {COLORS['border']};border-radius:12px;overflow:hidden;">
  <tr style="background:{COLORS['surface']};">
    <td style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Stock</td>
    <td style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Price</td>
    <td style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Change</td>
  </tr>
  <tr><td colspan="3" style="padding:0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {gainers_rows}
    </table>
  </td></tr>
  </table>
</td>
</tr>"""

    # Top Losers table
    losers_rows = ""
    for i, l in enumerate(top_losers[:5]):
        change_str = f"{l.get('change_percent', 0):.2f}%"
        losers_rows += _data_row(
            f"<strong>{l.get('symbol', '')}</strong> <span style='color:{COLORS['text_muted']};font-size:12px;'>{l.get('name', '')[:20]}</span>",
            f"{l.get('last_price', 0):.2f}",
            change_str,
            is_alt=(i % 2 == 1)
        )
    
    losers_section = f"""
{_section_title('📉', 'Top Losers')}
<tr>
<td style="padding:0 32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {COLORS['border']};border-radius:12px;overflow:hidden;">
  <tr style="background:{COLORS['surface']};">
    <td style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Stock</td>
    <td style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Price</td>
    <td style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};">Change</td>
  </tr>
  <tr><td colspan="3" style="padding:0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {losers_rows}
    </table>
  </td></tr>
  </table>
</td>
</tr>"""

    # AI Trending Stocks
    trending_items = ""
    for i, t in enumerate(trending_stocks[:5], 1):
        trending_items += f"""
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid {COLORS['border']};">
            <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:{COLORS['teal_subtle']};color:{COLORS['teal']};font-size:11px;font-weight:700;margin-right:8px;">{i}</span>
            <strong style="color:{COLORS['text_primary']};">{t.get('symbol', '')}</strong>
            <span style="color:{COLORS['text_muted']};font-size:12px;margin-left:6px;">{t.get('count', 0)} questions</span>
          </td>
        </tr>"""

    trending_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:4px;">
      🤖 AI Trending This Week
    </div>
    <div style="font-size:12px;color:{COLORS['text_secondary']};margin-bottom:12px;">
      Most-asked stocks on Starta AI
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {trending_items}
    </table>
    """)

    # Tip of the week
    tip_section = f"""
<tr>
<td style="padding:0 32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{COLORS['teal_subtle']};border:1px solid {COLORS['teal']}30;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;">
    <div style="font-size:14px;font-weight:700;color:{COLORS['teal_dark']};margin-bottom:8px;">💡 Did You Know?</div>
    <div style="font-size:14px;color:{COLORS['text_primary']};line-height:1.6;">{tip_of_week}</div>
  </td></tr>
  </table>
</td>
</tr>"""

    content = hero + greeting + egx30_card + gainers_section + losers_section
    content += _section_title('🤖', 'Chatbot Intelligence')
    content += trending_section + tip_section
    content += _cta_button("Ask Starta AI About Any Stock →", "https://startamarkets.com")

    return _base_wrapper(content, unsubscribe_url, f"EGX30 {egx_sign}{egx30_change_pct:.2f}% this week — Top movers & AI trending stocks inside")


# ============================================================
# MONTHLY DEEP DIVE TEMPLATE
# ============================================================

def build_monthly_deep_dive(
    user_name: str,
    month_name: str,
    egx30_value: float,
    egx30_monthly_change: float,
    egx30_high: float,
    egx30_low: float,
    sector_performance: List[Dict],
    stock_of_month: Dict,
    hidden_gems: List[Dict],
    total_questions: int,
    total_stocks_analyzed: int,
    news_headlines: List[Dict],
    unsubscribe_url: str,
) -> str:
    """Build the Monthly Deep Dive email HTML."""
    
    egx_color = COLORS['green'] if egx30_monthly_change >= 0 else COLORS['red']
    egx_sign = "+" if egx30_monthly_change >= 0 else ""

    hero = f"""
<tr>
<td style="padding:28px 32px 20px;">
  <div style="font-size:22px;font-weight:800;color:{COLORS['text_primary']};margin-bottom:4px;">Monthly Deep Dive</div>
  <div style="font-size:13px;color:{COLORS['text_secondary']};">{month_name} EGX Market Report</div>
</td>
</tr>"""

    greeting = f"""
<tr>
<td style="padding:0 32px 20px;">
  <div style="font-size:15px;color:{COLORS['text_primary']};line-height:1.6;">
    Hi{f' <strong>{user_name}</strong>' if user_name else ''}! Here's your comprehensive monthly review of the Egyptian stock market.
  </div>
</td>
</tr>"""

    # Monthly Recap Card
    recap_card = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:16px;">📊 Monthly Recap</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:center;padding:8px;width:33%;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};margin-bottom:4px;">EGX30</div>
        <div style="font-size:22px;font-weight:800;color:{COLORS['text_primary']};font-family:'JetBrains Mono',monospace;">{egx30_value:,.0f}</div>
        <div style="font-size:13px;font-weight:700;color:{egx_color};margin-top:4px;">{egx_sign}{egx30_monthly_change:.2f}%</div>
      </td>
      <td style="text-align:center;padding:8px;width:33%;border-left:1px solid {COLORS['border']};border-right:1px solid {COLORS['border']};">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};margin-bottom:4px;">HIGH</div>
        <div style="font-size:18px;font-weight:700;color:{COLORS['green']};font-family:'JetBrains Mono',monospace;">{egx30_high:,.0f}</div>
      </td>
      <td style="text-align:center;padding:8px;width:33%;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:{COLORS['text_muted']};margin-bottom:4px;">LOW</div>
        <div style="font-size:18px;font-weight:700;color:{COLORS['red']};font-family:'JetBrains Mono',monospace;">{egx30_low:,.0f}</div>
      </td>
    </tr>
    </table>
    """)

    # Sector Performance
    sector_rows = ""
    for i, s in enumerate(sector_performance[:6]):
        pct = s.get('change_pct', 0)
        color = COLORS['green'] if pct >= 0 else COLORS['red']
        sign = "+" if pct >= 0 else ""
        bar_width = min(100, abs(pct) * 10)
        sector_rows += f"""
        <tr style="background:{'#F8FAFC' if i % 2 == 1 else '#FFFFFF'};">
          <td style="padding:10px 0;font-size:13px;font-weight:500;">{s.get('sector', '')}</td>
          <td style="padding:10px 0;text-align:right;">
            <div style="display:inline-block;width:{bar_width}px;height:6px;border-radius:3px;background:{color};margin-right:8px;vertical-align:middle;"></div>
            <span style="font-size:13px;font-weight:600;color:{color};font-family:'JetBrains Mono',monospace;">{sign}{pct:.1f}%</span>
          </td>
        </tr>"""

    sector_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:12px;">🏭 Sector Heatmap</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {sector_rows}
    </table>
    """) if sector_performance else ""

    # Stock of the Month
    som = stock_of_month or {}
    som_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:4px;">🏆 Stock of the Month</div>
    <div style="font-size:12px;color:{COLORS['text_secondary']};margin-bottom:16px;">Most researched on Starta AI</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:20px;font-weight:800;color:{COLORS['teal']};">{som.get('symbol', 'N/A')}</div>
          <div style="font-size:12px;color:{COLORS['text_muted']};margin-top:2px;">{som.get('name', '')}</div>
        </td>
        <td style="text-align:right;">
          <div style="font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;">{som.get('price', 'N/A')}</div>
          <div style="font-size:11px;color:{COLORS['text_muted']};margin-top:2px;">{som.get('queries', 0)} questions this month</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid {COLORS['border']};display:flex;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:6px;width:33%;">
          <div style="font-size:11px;color:{COLORS['text_muted']};text-transform:uppercase;">P/E</div>
          <div style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;">{som.get('pe', 'N/A')}</div>
        </td>
        <td style="text-align:center;padding:6px;width:33%;border-left:1px solid {COLORS['border']};border-right:1px solid {COLORS['border']};">
          <div style="font-size:11px;color:{COLORS['text_muted']};text-transform:uppercase;">ROE</div>
          <div style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;">{som.get('roe', 'N/A')}</div>
        </td>
        <td style="text-align:center;padding:6px;width:33%;">
          <div style="font-size:11px;color:{COLORS['text_muted']};text-transform:uppercase;">Div Yield</div>
          <div style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;">{som.get('div_yield', 'N/A')}</div>
        </td>
      </tr>
      </table>
    </div>
    """) if som else ""

    # Hidden Gems
    gems_items = ""
    for g in hidden_gems[:3]:
        gems_items += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid {COLORS['border']};">
            <div><strong style="color:{COLORS['teal']};">{g.get('symbol', '')}</strong> <span style="color:{COLORS['text_muted']};font-size:12px;">{g.get('name', '')[:25]}</span></div>
            <div style="font-size:12px;color:{COLORS['text_secondary']};margin-top:4px;">Score: {g.get('score', 0)}/100 · P/E: {g.get('pe', 'N/A')} · ROE: {g.get('roe', 'N/A')}</div>
          </td>
          <td style="padding:10px 0;text-align:right;border-bottom:1px solid {COLORS['border']};">
            <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;">{g.get('price', 'N/A')}</div>
          </td>
        </tr>"""

    gems_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:4px;">💎 Hidden Gems</div>
    <div style="font-size:12px;color:{COLORS['text_secondary']};margin-bottom:12px;">Top undervalued EGX stocks by our scoring engine</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {gems_items}
    </table>
    """) if hidden_gems else ""

    # Chatbot Stats
    stats_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:16px;">📈 Starta AI This Month</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:center;padding:12px;width:50%;">
        <div style="font-size:28px;font-weight:800;color:{COLORS['teal']};font-family:'JetBrains Mono',monospace;">{total_questions:,}</div>
        <div style="font-size:12px;color:{COLORS['text_secondary']};margin-top:4px;">Questions Answered</div>
      </td>
      <td style="text-align:center;padding:12px;width:50%;border-left:1px solid {COLORS['border']};">
        <div style="font-size:28px;font-weight:800;color:{COLORS['teal']};font-family:'JetBrains Mono',monospace;">{total_stocks_analyzed}</div>
        <div style="font-size:12px;color:{COLORS['text_secondary']};margin-top:4px;">Stocks Analyzed</div>
      </td>
    </tr>
    </table>
    """)

    # News Headlines
    news_items = ""
    for n in news_headlines[:3]:
        news_items += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid {COLORS['border']};">
            <div style="font-size:13px;font-weight:600;color:{COLORS['text_primary']};line-height:1.4;">{n.get('title', '')[:80]}</div>
            <div style="font-size:11px;color:{COLORS['text_muted']};margin-top:4px;">{n.get('date', '')}</div>
          </td>
        </tr>"""

    news_section = _card(f"""
    <div style="font-size:14px;font-weight:700;color:{COLORS['text_primary']};margin-bottom:12px;">📰 EGX Headlines</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {news_items}
    </table>
    """) if news_headlines else ""

    content = hero + greeting + recap_card + sector_section + som_section
    content += _section_title('💎', 'Investment Ideas')
    content += gems_section + stats_section + news_section
    content += _cta_button("Explore Full Dashboard →", "https://startamarkets.com/dashboard")

    return _base_wrapper(
        content, 
        unsubscribe_url,
        f"EGX {month_name}: {'+' if egx30_monthly_change >= 0 else ''}{egx30_monthly_change:.1f}% — Stock of the Month, Hidden Gems & more"
    )
