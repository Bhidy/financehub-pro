---
name: egx-dcf-valuation
description: Build DCF (Discounted Cash Flow) valuation models for Egyptian Stock Exchange companies. Auto-activates when user asks for "DCF", "intrinsic value", "discounted cash flow", "fair value model", "WACC", "terminal value", "قيمة جوهرية", "نموذج DCF", "تقييم DCF" for any EGX stock. Follows institutional DCF methodology adapted for high-inflation Egyptian market with CBE rate context.
---

# EGX DCF Valuation Framework

Ported from Anthropic `financial-analysis/skills/dcf-model` and `financial-analysis/commands/dcf.md`, adapted for the Egyptian Stock Exchange (EGX) high-inflation, high-rate environment.

## 🎯 Auto-Activation Triggers
- "DCF", "discounted cash flow", "intrinsic value", "fair value model"
- "WACC", "terminal value", "cost of equity", "cost of capital"
- "نموذج DCF", "قيمة جوهرية", "قيمة جوهرية للسهم", "تقدير سعر عادل"
- "is [stock] undervalued", "what's the target price", "price target"

## 📐 Egypt-Adjusted WACC Framework

### Cost of Equity (CAPM — Egypt Adjusted)
```
Re = Rf + β × ERP + CRP
```
Where:
- **Rf** = Egypt T-bill rate (currently ~20-22% as CBE eases from 27.25% peak)
- **β** = Stock beta vs EGX 30 (or 1.0 for market)
- **ERP** = Equity Risk Premium = ~5-6% (global) + Egypt adjustment
- **CRP** = Country Risk Premium = 3-4% for Egypt (Damodaran estimate)
- **Result**: Cost of equity for average EGX stock ≈ 28-32%

### Cost of Debt
- Large caps: ~20-22% (benchmark + spread)
- Factor in: tax shield at Egyptian CIT rate (22.5%)

### WACC Calculation
```
WACC = (E/V × Re) + (D/V × Rd × (1 - T))
```

**🔴 CRITICAL Egypt Adjustment:** With T-bills yielding 20%+, any DCF with WACC < 22% for EGX companies is miscalibrated.

## 📊 5-Step DCF Build Protocol

### Step 1 — Historical Foundation (3-5 years)
Collect from Mubasher/FinanceHub API:
- Revenue (3-5 years)
- EBITDA margin trend
- Capex/Revenue ratio
- Working capital dynamics
- Tax rate

### Step 2 — Projection Period (5 years: Bear/Base/Bull)

**Egypt-Specific Growth Considerations:**
- Nominal GDP growth ~10-12% (real 4-5% + ~6% inflation)
- Revenue growth for EGX companies: typically 15-25% nominal during expansion
- Apply margin mean-reversion toward peer median in years 4-5

| Scenario | Revenue CAGR | EBITDA Margin | Capex/Revenue |
|----------|-------------|---------------|---------------|
| Bear | 8-10% | -1% vs current | +1% |
| Base | 14-18% | Stable | Stable |
| Bull | 22-28% | +2% vs current | -0.5% |

### Step 3 — Free Cash Flow Formula
```
FCF = EBITDA × (1 - T) - ΔWorking Capital - Capex
    = NOPAT + D&A - Capex - ΔNWC
```

### Step 4 — Terminal Value (Two Methods)

**Method A: Exit Multiple**
```
TV = EBITDA_year5 × Exit EV/EBITDA multiple
```
- EGX sector medians: Banks 6-9x, Real Estate 8-12x, Industrial 6-10x

**Method B: Gordon Growth Model**
```
TV = FCF_year5 × (1 + g) / (WACC - g)
g = long-term nominal GDP growth = ~7-9% for Egypt
```

**Cross-check:** TV should be 50-70% of total EV. If >75%, model is too back-ended → stress-test.

### Step 5 — Bridge to Equity Value
```
Enterprise Value = PV(FCFs) + PV(Terminal Value)
Equity Value = EV - Net Debt + Cash
Implied Share Price = Equity Value / Shares Outstanding
Implied Upside/Downside = (Target Price - Current Price) / Current Price
```

## 📋 DCF Output Template

```
DCF VALUATION SUMMARY — [SYMBOL]
═══════════════════════════════

WACC: [X]% | Terminal Growth: [Y]%
Projection Period: [N] years | Currency: EGP

SCENARIO ANALYSIS:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Scenario    │ Rev CAGR    │ Target Price│ Upside      │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Bear        │ [X]%        │ EGP [XX]    │ [X]%        │
│ Base        │ [X]%        │ EGP [XX]    │ [X]%        │
│ Bull        │ [X]%        │ EGP [XX]    │ [X]%        │
└─────────────┴─────────────┴─────────────┴─────────────┘

SENSITIVITY TABLE (Base Case):
       WACC →
TV %   25%   27%   30%   32%   35%
8%
9%
10%

CROSS-VALIDATION:
• DCF-implied EV/EBITDA: [X]x | Peer median: [Y]x
• Terminal Value as % of EV: [Z]% [HEALTHY/CONCERNING]
• Current P/E vs implied DCF P/E: [comparison]

KEY ASSUMPTIONS:
• Revenue CAGR (5Y): [X]% 
• Terminal EBITDA Margin: [Y]%
• WACC: [Z]% (Rf=[A]%, Beta=[B], ERP=[C]%, CRP=[D]%)
• Terminal Growth: [G]%
```

## ⚠️ Egypt-Specific DCF Caveats

1. **EGP Devaluation Risk**: For companies with mixed USD/EGP costs, model in FX scenarios separately
2. **Subsidies**: Energy-intensive companies (Industrial) — factor CBE subsidy trajectory
3. **Political Risk**: Add 50-100bps to discount rate during political uncertainty periods
4. **Liquidity Premium**: Mid/small caps warrant extra 100-200bps vs large caps
5. **Interest Rate Sensitivity**: At peak CBE rates (27.25%), model terminal rates at 18-20% (normalization)
