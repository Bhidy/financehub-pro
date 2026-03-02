---
name: egx-earnings-analysis
description: Institutional-grade earnings analysis for EGX companies following equity research best practices. Auto-activates when user asks about quarterly results, annual earnings, earnings beats/misses, "نتائج ربعية", "اعلان الارباح", financial results announcements, Q1/Q2/Q3/Q4 results, or "how did [company] do this quarter". Follows the Anthropic financial-services-plugins equity-research/earnings-analysis workflow adapted for Egyptian market.
---

# EGX Earnings Analysis — Institutional Framework

Ported from Anthropic `equity-research/skills/earnings-analysis` and adapted for Egyptian Stock Exchange (EGX) listed companies using Mubasher data.

## 🎯 Auto-Activation Triggers
- "earnings", "results", "quarterly", "Q1/Q2/Q3/Q4 results"
- "نتائج", "ارباح ربعية", "نتائج الربع", "الاعلان عن النتائج"
- "did [company] beat estimates", "earnings surprise", "above/below expectations"
- "earnings season", "موسم الارباح", "تقرير الارباح"

## 📋 7-Step Earnings Analysis Protocol

### Step 1 — EPS vs Consensus
1. Pull reported EPS (actual earnings per share)
2. Compare to any available consensus/estimate
3. Calculate beat/miss magnitude:
   - **Beat**: Reported > Expected → Positive signal
   - **Miss**: Reported < Expected → Negative signal
   - Magnitude: `(Reported - Expected) / |Expected| × 100 = Beat%`
   - Material threshold: |beat%| > 5% is significant for EGX

### Step 2 — Revenue Quality Check
A critical distinction for institutional-grade analysis:

| Type | What it means | Quality |
|------|--------------|---------|
| Revenue-driven beat | Sales exceeded estimates | HIGH quality |
| Margin-driven beat | Revenue in-line, but costs lower | MEDIUM quality |
| Below-the-line beat | Tax benefit, one-time gain | LOW quality |

**Formula:** If Revenue Growth ≥ EPS Growth × 0.80 → "Revenue-driven" ✅
If Revenue Growth < EPS Growth × 0.50 → "Cost-driven only" ⚠️

### Step 3 — YoY vs QoQ Analysis
Always present both:
- **YoY**: This quarter vs same quarter last year (best for seasonality)
- **QoQ**: This quarter vs prior quarter (shows momentum)

For Egyptian companies, **YoY preferred** due to strong seasonal patterns (Q4 strongest for retail/food, Q2 strongest for real estate pre-sales).

### Step 4 — Management Guide / Outlook
Extract and analyze:
1. Revenue/profit guidance for next quarter or FY
2. Capex plans (expansion or contraction signal)
3. Dividend announcement or update
4. Any FX guidance (crucial for EGX in EGP/USD context)
5. Key risks acknowledged by management

### Step 5 — Thesis Tracker (Investment Thesis Validation)
For each major investment thesis, mark as **CONFIRMED / CHALLENGED / NEUTRAL**:

Template:
```
Thesis Check [Q{N} {YEAR}]
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [Thesis 1]: [Evidence from this quarter's results]
⚠️  [Thesis 2]: [Milestone missed — re-evaluate]
❓ [Thesis 3]: [No data yet — monitor]
━━━━━━━━━━━━━━━━━━━━━━━━━━
Thesis Status: INTACT / WEAKENING / BROKEN
```

### Step 6 — Valuation Refresh
After each earnings, update:
- Trailing P/E (using new LTM EPS)
- Forward P/E (using updated guidance if available)
- Price-to-Book update if equity changed
- Dividend yield update if payout announced

### Step 7 — Mandatory Output Format

```
📊 EARNINGS ANALYSIS — [SYMBOL] [Q{N} {YEAR}]

HEADLINE:
• Reported EPS: [X] EGP | Consensus: [Y] EGP | Beat/Miss: [±Z%]
• Revenue: [X] EGP mn | YoY: [±Z%] | QoQ: [±Z%]

QUALITY ASSESSMENT: [Revenue-Driven / Margin-Driven / Mixed]

KEY DRIVERS:
• [Most impactful factor with specific metric]
• [Second factor]
• [Third factor]

THESIS STATUS: [INTACT / WEAKENING / BROKEN]
• [Thesis 1]: [judgment]
• [Thesis 2]: [judgment]

VALUATION REFRESH:
• P/E (LTM): [X]x | P/E (Fwd): [Y]x
• Implied Re-rating: [positive/negative/neutral]

CATALYSTS TO WATCH:
1. [Next catalyst with timing]
2. [Second catalyst]
```

## 🏦 EGX-Specific Earnings Nuances

**Banking Sector (COMI, CIB, QNBA, etc.):**
- Focus on: NIM change QoQ, NPL ratio direction, provision coverage, CASA ratio
- Watch: CBE rate changes directly impact NIM — factor this in
- Key metric: Net Interest Income (NII) vs Fee Income split (shows revenue resilience)

**Real Estate (TMGH, PHDC, EMFD, OCDI):**
- Focus on: Pre-sales (contracted sales), delivery units, backlog
- Reported earnings ≠ cash collected (revenue recognized on delivery)
- Watch the backlog coverage ratio (backlog / annual revenue target)

**Industrial (ESRS, ABUK, MFPC, SKPC):**
- Focus on: Energy cost impact (Egypt subsidized energy change), export volumes
- Watch: USD Revenue % (currency hedge proxy)

**Food & Beverage (JUFO, DOMT, EFID):**
- Focus on: Gross margin (raw material pass-through success)
- Watch: Volume growth vs price growth split

## 📅 EGX Earnings Calendar Context

Egyptian companies typically report:
- Q1 (Jan-Mar): announced ~May
- Q2 (Apr-Jun): announced ~August (H1 results)
- Q3 (Jul-Sep): announced ~November
- Q4 + Annual: announced ~March next year

Banks follow CBE reporting calendar.
