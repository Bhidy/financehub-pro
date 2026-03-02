---
name: egx-risk-analysis
description: >
  Expert EGX risk analysis skill. Auto-activates when user asks about risks,
  safety concerns, or threats for any EGX-listed stock. Conducts a 4-layer
  risk decomposition: Macro Risk (EGP, CBE), Liquidity Risk (float, spread),
  Balance Sheet Risk (leverage, coverage), and Regulatory Risk (FX controls).
triggers:
  keywords:
    - risk
    - risks
    - what are the risks
    - is it risky
    - downside risk
    - مخاطر
    - ما مخاطر
    - هل هو خطر
    - مخاطر السهم
    - مخاطر الاستثمار
    - risk analysis
    - risk assessment
    - key risks
    - risk factors
    - investment risk
    - downside scenario
    - bear case risks
    - worst case
    - what could go wrong
    - red flags
    - الأسوأ
    - ماذا يمكن أن يحدث
    - مخاوف السهم
    - المشاكل المحتملة
---

# EGX Risk Analysis Skill

Expert institutional-grade risk decomposition for Egyptian Stock Exchange (EGX) listed securities. When users ask about risks, threats, or downside scenarios for any stock, apply this 4-layer framework before responding.

## Auto-Activation Triggers

This skill auto-activates when user mentions:
- "what are the risks of [stock]" / "مخاطر [السهم]"  
- "is [stock] risky?" / "هل [السهم] خطر؟"
- "downside risk", "red flags", "what could go wrong"
- "worst case scenario", "bear case", "risk factors"
- "مخاطر السهم", "ما مخاطر", "الأسوأ", "مخاوف"

## The 4-Layer EGX Risk Decomposition Framework

For every risk analysis, you MUST cover all 4 layers:

---

### Layer 1: 🌍 Macro Risk (Egypt-Specific)

**EGP/FX Exposure Analysis:**
- Classify company as: Importer (FX risk HIGH) vs Exporter (FX risk HEDGE) vs Local-only (FX risk MEDIUM)
- Importers to watch: Food/Bev (JUFO, DOMT), Pharma, Industrial inputs
- Net exporters typically benefit from EGP weakness: FWRY, some industrials

**CBE Interest Rate Sensitivity:**
- Rate hike impact by sector:
  - Banks: NIM expansion (positive) BUT lower loan demand (negative) → NET: complex
  - Real Estate: Higher mortgage rates hurt affordability → NEGATIVE
  - Industrials with high debt: Higher interest cost → NEGATIVE
  - Cash-rich companies: Benefit from T-bill returns → POSITIVE

**Egypt Sovereign Risk:**
- CBE FX reserves level (below $25bn = systemic risk signal)
- IMF programme compliance milestones
- Devaluation risk: if official/parallel spread re-emerges

---

### Layer 2: 💧 Liquidity Risk

**Float & Trading Liquidity:**
- Calculate: Float % = (1 - Institutional/Strategic holding %) × Market Cap
- EGX Liquidity benchmarks:
  - High liquidity: >EGP 10M daily turnover (COMI, CIB, EFIH)
  - Medium: EGP 2-10M daily  
  - Illiquid / thin: <EGP 2M daily (mid/small caps — HIGH RISK)

**Bid-Ask Spread Signal:**
- Wide spreads (>1.5%) on EGX small caps signal institutional avoidance
- For retail investors: wide spread means higher transaction costs AND harder to exit during volatility

**Lock-up / Concentration Risk:**
- If any single entity owns >40% → liquidity crisis risk during unwinding
- Family-controlled companies common on EGX (TMGH, SWDY)

---

### Layer 3: 📊 Balance Sheet Risk

**Leverage Risk:**
| D/E Ratio | Risk Level | Comment |
|-----------|-----------|---------|
| < 0.5 | 🟢 Low | Conservative, flexible |
| 0.5 - 1.5 | 🟡 Medium | Watch interest coverage |
| 1.5 - 3.0 | 🟠 High | Stress-test vs rate hikes |
| > 3.0 | 🔴 Critical | Distress risk (exclude banks) |

**Interest Coverage Check:**
- EBIT / Interest Expense
- Below 2.0x → debt servicing under pressure
- Below 1.0x → potential covenant breach

**Altman Z-Score Context (EGX-Calibrated):**
- Z > 3.0: Safe zone
- 1.8 - 3.0: Grey zone — watch closely
- Z < 1.8: Distress signals — flag prominently

---

### Layer 4: ⚖️ Regulatory & Structural Risk (Egypt-Specific)

**Dividend Remittance Risk:**
- Egypt has historically imposed FX controls on profit repatriation
- Risk is highest during FX shortages
- Signal: If CBE imposes import documentation controls → tighten dividend remittance risk

**FX Control Risk:**
- Companies with USD-denominated revenues but EGP-listed costs: POSITIVE in devaluation
- Companies relying on imported raw materials with FX controls: SUPPLY CHAIN RISK

**Regulatory Concentration:**
- State-owned enterprise (SOE) competition: some sectors face government enterprise competition (e.g., telecom, energy)
- CAPEX-intensive businesses require government land/permit approvals (Real Estate in particular)

**Governance Risk (EGX-Specific):**
- Related-party transactions: family-owned companies sometimes have non-arm's-length deals
- Audit quality: Check if auditor is Big 4 vs. local — significant difference in reliability
- Board independence: Flag if CEO = Chairman (common on EGX)

---

## Risk Output Template

Always structure risk analysis output as:

```
## Risk Analysis: [COMPANY] ([TICKER])
**Overall Risk Profile:** [LOW / MEDIUM / HIGH / VERY HIGH]

### 🌍 Macro Risk: [LOW/MEDIUM/HIGH]
- EGP Exposure: [Importer/Exporter/Mixed] — [impact]
- CBE Rate Sensitivity: [positive/negative] — [one-liner]
- Sovereign Risk: [relevant signal]

### 💧 Liquidity Risk: [LOW/MEDIUM/HIGH]
- Daily Turnover: ~EGP [X]M — [assessment]
- Float %: ~[X]% — [concentrated/diversified]
- Key risk: [specific concern]

### 📊 Balance Sheet Risk: [LOW/MEDIUM/HIGH]
- D/E: [X]x — [commentary]
- Interest Coverage: [X]x — [assessment]
- Altman Z-Score: [X] — [SAFE/GREY/DISTRESS]

### ⚖️ Regulatory Risk: [LOW/MEDIUM/HIGH]
- Dividend Remittance: [risk level + rationale]
- Key regulatory exposure: [one specific concern]

### 📋 Risk Summary
**Top 3 Risks:**
1. [Most material risk]
2. [Second risk]
3. [Third risk]

**Mitigants:**
- [What reduces each top risk]
```

---

## EGX Sector-Specific Risk Focus Areas

| Sector | Primary Risk | Secondary Risk | Watch Metric |
|--------|-------------|----------------|--------------|
| Banks | NPL spike (macro) | CBE regulatory capital | NPL ratio + CIR |
| Real Estate | Pre-sales slowdown | FX/material cost | Pre-sales QoQ |
| Industrial | Raw material FX | Energy cost subsidy removal | Gross margin |
| Food & Bev | Input cost inflation | Consumer spending compression | Gross margin |
| Telecom | Regulatory pricing | FX for equipment imports | ARPU + capex |

---

## Anti-Hallucination Rules for Risk Responses

1. **Quantify every risk**: Don't say "high leverage" — say "D/E of 2.4x vs sector median 0.8x"
2. **Sector-lock your risks**: NEVER mention bank-specific risks (NPL, CIR) for an industrial company
3. **Egypt-calibrate your context**: Egypt's risk-free rate is ~18-20%, making even "safe" leverage more dangerous
4. **Acknowledge data limits**: If Altman Z-Score is unavailable, say so explicitly
5. **Balance risks with mitigants**: Always present mitigating factors to avoid pure negativity bias

---

## Quick Rule: When to Flag "Very High Risk"

Flag VERY HIGH RISK when **any 2 of the following** are true:
- Z-Score < 1.8
- D/E > 3.0 (non-financial)
- Interest Coverage < 1.5x
- Daily trading volume < EGP 500K (illiquid)
- Single shareholder > 70% (lock-up risk)
- Sector under active regulatory pressure
