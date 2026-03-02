---
name: egx-comps-analysis
description: Comparable company (Comps) analysis for EGX listed stocks. Auto-activates when user asks to "compare [stock] to peers", "peer comparison", "sector comparison", "how does [company] rank vs competitors", "مقارنة بالمنافسين", "مقارنة بالقطاع". Builds institutional trading comps tables with median/percentile statistics following equity research best practices.
---

# EGX Comparable Company Analysis (Comps)

Ported from Anthropic `financial-analysis/skills/comps-analysis` and `financial-analysis/commands/comps.md`, adapted for Egyptian market peer groups.

## 🎯 Auto-Activation Triggers
- "compare [stock] to peers", "peer comparison", "sector peers"
- "how does [company] rank vs sector", "comps", "comparable companies"
- "مقارنة بالمنافسين", "مقارنة بالقطاع", "أداء مقارن", "قارن"
- Any "compare [A] vs [B]" query with EGX stocks

## 📊 EGX Peer Groups (Pre-Mapped)

**Banking Sector:**
Tier 1: COMI, CIB
Tier 2: QNBA, HDBK, EXPA, CIEB, SAIB
Universal: ABUK (Abu Qir Fertilizers — note: industrial, not bank — common error to avoid)

**Real Estate:**
Large Cap: TMGH, PHDC, EMFD, ORHD
Mid Cap: OCDI, MNHD, HELI

**Industrial/Materials:**
Steel: ESRS
Fertilizers: ABUK, MFPC, SKPC, KIMA
Petrochemicals: AMOC, SKPC

**Food & Beverage:**
JUFO, DOMT, EFID, POUL, EAST

**Financial Services (Non-Bank):**
HRHO, BTLL, CCAP

## 📋 Comps Analysis Protocol

### Step 1 — Select Peer Group
1. Identify primary sector from symbol
2. Select 4-6 most comparable peers (same sector, similar size tier)
3. Exclude companies with distorted metrics (loss-making, restructuring)

### Step 2 — Pull Valuation Multiples
For each peer, collect:
- Market Cap (EGP mn)
- P/E ratio (LTM)
- P/B ratio
- EV/EBITDA (where applicable)
- Dividend Yield (%)

### Step 3 — Pull Operating Metrics
- Revenue (LTM, EGP mn)
- Revenue Growth (YoY %)
- EBITDA Margin (%)
- Net Margin (%)
- ROE (%)
- Debt/Equity ratio

### Step 4 — Statistical Summary (MANDATORY — Institutional Standard)

Always include the summary statistics row:

| Metric | [Stock A] | [Stock B] | [Stock C] | [Stock D] | **Median** | **25th %ile** | **75th %ile** |
|--------|-----------|-----------|-----------|-----------|------------|--------------|--------------|
| P/E | | | | | **Bold** | | |
| P/B | | | | | **Bold** | | |
| EV/EBITDA | | | | | **Bold** | | |
| ROE | | | | | **Bold** | | |
| Net Margin | | | | | **Bold** | | |

### Step 5 — Subject Stock Positioning
After the table, explicitly state:
```
[SUBJECT STOCK] Positioning vs Peers:
• Valuation: Trading at [X]x P/E vs peer median [Y]x → [premium/discount] of [Z]%
• Quality: ROE of [A]% vs peer median [B]% → [above/below] average
• Growth: Revenue growth [C]% vs peer median [D]% → [faster/slower]

KEY TAKEAWAY: [One-sentence competitive position statement]
```

### Step 6 — Valuation Implication
If [stock] is at a discount vs peers:
→ "The [X]% discount to peers implies either: (1) market pricing in [specific risk], or (2) opportunity if [specific catalyst] materializes"

If [stock] is at a premium vs peers:
→ "The [X]% premium requires sustaining [metric] above [Y]% — current trajectory [confirms/challenges] this"

## 🏆 Comps Output Template

```
COMPS ANALYSIS — [SECTOR] PEER GROUP
════════════════════════════════════

TRADING MULTIPLES (LTM Data)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company    Mkt Cap  P/E   P/B   Div Yld  ROE
[Stock A]  [X]mn    [x]x  [x]x  [x]%     [x]%
[Stock B]  
[Stock C]  
[Stock D]  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Median:    —        [x]x  [x]x  [x]%     [x]%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT ★  [X]mn    [x]x  [x]x  [x]%     [x]%
vs Median  —        [±%]  [±%]  [±%]     [±%]

COMPETITIVE POSITION: [1-2 sentence summary]
```
