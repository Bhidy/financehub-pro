---
name: egx-morning-note
description: Generate daily Egyptian Stock Exchange (EGX) morning market briefs and pre-market analysis. Auto-activates when user asks for "morning brief", "market brief", "today's market", "EGX update", "what should I watch today", "موجز الصباح", "ملخص السوق", "ما الذي حدث بالبورصة". Follows the Anthropic equity-research/skills/morning-note workflow adapted for EGX.
---

# EGX Morning Note — Daily Market Brief

Ported from Anthropic `equity-research/skills/morning-note` and `equity-research/commands/morning-note.md`, adapted for the Egyptian Stock Exchange.

## 🎯 Auto-Activation Triggers
- "morning brief", "morning note", "market brief", "today's market"
- "EGX update", "market recap", "what should I watch"
- "موجز الصباح", "ملخص السوق", "ما الذي حدث", "البورصة اليوم", "تقرير يومي"
- "pre-market", "before trading", "open session"

## 📰 Morning Note Structure (EGX Standard)

### Section 1 — Overnight Context (2-3 key points)
Cover what happened globally that matters for EGX:
- **US markets**: S&P 500, Nasdaq direction (risk-on/off signal)
- **Oil price**: Critical for Egypt (energy cost + regional sentiment)
- **USD/EGP rate**: Any FX movement overnight
- **Regional**: Saudi TASI, UAE DFM if relevant

### Section 2 — Yesterday's EGX Performance
```
EGX RECAP:
• EGX 30: [X] pts ([±Y]%) | Volume: [EGP Z]mn
• Breadth: [A] Gainers / [B] Losers / [C] Unchanged
• Top Gainer: [SYMBOL] +[X]% | Top Loser: [SYMBOL] -[X]%
• Most Active: [SYMBOL] (EGP [X]mn traded)
```

### Section 3 — Stocks in Focus (3-5 max)
For each stock to watch:
```
📌 [SYMBOL] — [Reason to Watch]
• [Specific data point or event]
• [Implication for today's trading]
• Level to watch: [price/technical level]
```

Select stocks based on:
1. Recent earnings announcements
2. Material news or disclosures
3. Unusual volume from yesterday
4. Approaching major technical levels
5. Upcoming catalyst (dividend, results date)

### Section 4 — Sector Themes
```
SECTOR WATCH:
🏦 Banks: [1-line theme]
🏠 Real Estate: [1-line theme]
🏭 Industrial: [1-line theme]
🍔 Food & Bev: [1-line theme]
```

### Section 5 — The Day's Key Question
End with a provocative question for the session:
> "The key question today: [specific thing investors should be watching and why]"

## 📋 Morning Note Template

```
📊 EGX MORNING NOTE — [Day, Date]
════════════════════════════════

🌍 OVERNIGHT CONTEXT
• US markets [closed/opened] [direction] — [implication]
• Oil: $[X]/bbl ([±Y]%) — [EGX impact]
• USD/EGP: [rate] [stable/moved]

📈 YESTERDAY'S EGX RECAP
EGX 30: [X] ([±Y]%)  |  Volume: EGP [Z]mn
Top Movers: [SYMBOL] +[X]% | [SYMBOL] -[X]%

🔍 STOCKS IN FOCUS
• [SYMBOL]: [reason + level to watch]
• [SYMBOL]: [reason + level to watch]
• [SYMBOL]: [reason + level to watch]

🏭 SECTOR THEMES
Banks: [theme]
Real Estate: [theme]

❓ KEY QUESTION TODAY
[Thoughtful analytical question]

Have a good session. 📊
```

## ⚡ Quick Rules for Morning Notes

1. **Keep it BRIEF**: Morning notes are consumed in 2-3 minutes before market opens
2. **Be DATA-FIRST**: Every claim needs a number
3. **No fluff**: Eliminate "markets are mixed" — say what happened specifically
4. **Forward-looking**: Focus on what matters TODAY, not rehashing yesterday
5. **One key theme**: Identify the dominant theme (rate expectations, FX, earnings season)
6. **EGX Trading Hours**: Sunday–Thursday, 10:00–14:30 Cairo time (EET = UTC+2/+3)
