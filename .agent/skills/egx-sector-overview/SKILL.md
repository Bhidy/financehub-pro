---
name: egx-sector-overview
description: Deep sector analysis for Egyptian Stock Exchange sectors. Auto-activates when user asks about "banking sector", "real estate sector", "industrial sector", "technology stocks EGX", "sector analysis", "قطاع البنوك", "قطاع العقارات", "تحليل القطاع". Provides sector-level fundamental analysis, key drivers, and stock rankings within each EGX sector.
---

# EGX Sector Overview — Deep Sector Analysis

Ported from Anthropic `equity-research/skills/sector-overview` and `equity-research/commands/sector.md`, adapted for the 9 main Egyptian Stock Exchange sectors.

## 🎯 Auto-Activation Triggers
- "banking sector", "real estate sector", "industrial sector", "food sector"
- "sector analysis", "sector stocks", "best stock in [sector]", "sector outlook"
- "قطاع البنوك", "القطاع العقاري", "قطاع الصناعة", "تحليل القطاع", "اسهم القطاع"
- "compare sectors", "which sector is best now"

## 🏛️ EGX Sector Definitions & Key Stocks

### 1. Banking & Financial Services
- **Key stocks**: COMI, CIB, QNBA, HDBK, EXPA, CIEB, SAIB, ABUU
- **Sector weight in EGX 30**: ~35-40%
- **Primary drivers**: CBE interest rates, NIM, loan growth, NPL quality
- **Key metric**: CIR (Cost-to-Income Ratio) — lower = more efficient
- **EGP impact**: Neutral (EGP assets/liabilities broadly matched)
- **CBE rate cut sensitivity**: For every 100bps CBE cut, NIM compresses ~20-30bps but loan demand accelerates

### 2. Real Estate & Construction
- **Key stocks**: TMGH, PHDC, EMFD, OCDI, MNHD, ORHD, HELI, SWDY (cables)
- **Sector weight in EGX 30**: ~15-20%
- **Primary drivers**: Pre-sales velocity, delivery pipeline, land bank valuation, interest rates
- **Key metric**: NAV discount/premium; typical EGX real estate at 30-50% NAV discount
- **EGP impact**: Positive for USD-priced projects (New Cairo, North Coast); Negative for EGP-only
- **Catalyst**: New Capital delivery, North Coast season (Q2-Q3)

### 3. Industrial / Basic Materials
- **Key stocks**: ESRS (steel), ABUK, MFPC, SKPC, KIMA (fertilizers), AMOC (petrochem)
- **Primary drivers**: Energy cost (Egypt is energy-subsidized), export market prices, EGP/USD
- **Key metric**: EBITDA margin sensitivity to raw material costs
- **EGP impact**: Strongly POSITIVE for exporters (revenue in USD, costs in EGP)

### 4. Food & Beverage
- **Key stocks**: JUFO, DOMT, EFID, POUL, EAST
- **Primary drivers**: ASP growth, raw material costs (wheat, milk, poultry feed), distribution
- **Key metric**: Gross margin — shows pricing power vs input inflation
- **EGP impact**: Mixed — imports are USD-priced (inflationary), local production benefits from subsidy

### 5. Telecommunications
- **Key stocks**: ETEL (We/Telecom Egypt)
- **Primary drivers**: ARPU, data monetization, infrastructure capex ROI
- **Key metric**: Revenue/MHz spectrum efficiency
- **EGP impact**: Moderate — local revenues in EGP, some USD capex

### 6. Healthcare & Pharmaceuticals
- **Key stocks**: ISPH, PHAR, MNHD (pharma segment)
- **Primary drivers**: Generic drug approvals, hospital capacity, pricing
- **Key metric**: EBITDA margin vs global peers

### 7. Financial Services (Non-Bank)
- **Key stocks**: HRHO (EFG Hermes), BTLL (Beltone), CCAP (Qalaa Holdings)
- **Primary drivers**: Market volumes (brokerage), AUM growth, deal flow
- **Key metric**: Revenue per employee, AUM growth rate

## 📊 Sector Analysis Framework (5 Steps)

### Step 1 — Sector Macro Context
```
Sector: [NAME]
━━━━━━━━━━━━━━━━━
Macro Tailwinds: [2-3 specific factors supporting sector now]
Macro Headwinds: [2-3 specific risks]
CBE Rate Impact: [Direct impact on this sector]
EGP Sensitivity: [Positive/Negative/Neutral + why]
```

### Step 2 — Valuation Table (All Listed Companies)
| Stock | Market Cap (EGP mn) | P/E | P/B | YTD Return | Rank |
|-------|---------------------|-----|-----|-------------|------|
| [Best] | | | | | 1 |
| ... | | | | | |

### Step 3 — Sector Score Card
Rate each pillar 1-5:
```
SECTOR SCORECARD — [SECTOR NAME]
• Valuation:     [★★★★☆] (4/5) — [one line rationale]
• Growth:        [★★★☆☆] (3/5) — [one line rationale]
• Macro Support: [★★★★★] (5/5) — [one line rationale]
• Earnings Quality: [★★★☆☆] (3/5) — [one line rationale]
• Technical Setup: [★★★★☆] (4/5) — [one line rationale]
OVERALL: [★★★★☆] (4/5) — [FAVORABLE/NEUTRAL/AVOID]
```

### Step 4 — Top Pick in Sector
```
TOP PICK: [SYMBOL]
Why: [3-bullet case]
• [Valuation argument]
• [Quality argument]  
• [Catalyst argument]
Risk: [Primary downside scenario]
```

### Step 5 — Avoid in Sector
```
AVOID: [SYMBOL]
Why: [1-2 red flags with data]
```

## 🔄 Sector Cross-Comparison (When Asked)

When user asks "which sector should I invest in now":
1. Score all major sectors (1-5) across: Valuation, Growth, Macro Support
2. Rank top 3 sectors
3. Provide 1 stock pick per top sector
4. 1-sentence why this moment favors these sectors over others
