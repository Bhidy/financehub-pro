# Starta Subscription Package Analysis

## Executive Summary

Your chatbot already has enough real functionality to support two clear public packages.

The strongest packaging structure is:

1. `Starta Free`
2. `Starta Analyst`

The important product truth is this:
- The app already has a real `guest trial` layer with a 5-question limit.
- The app already has a visible `paid Analyst` identity in billing/settings.
- But feature entitlements are not yet fully enforced between registered free users and paid users.

That means the best pricing strategy is:
- Treat the current 5-question guest experience as a `trial`, not as the actual free plan.
- Position `Starta Free` as the registered entry plan.
- Position `Starta Analyst` as the premium intelligence layer built around the advanced response types already in the system.

## What The Chatbot Already Does Well

### 1. Core market intelligence
Verified in the chat router and handlers:
- Live stock price and snapshot answers
- Market summary and market status
- Top gainers, top losers, and most active names
- Sector stock lists and dividend leader screens
- Stock comparisons
- Technical indicator analysis
- News, dividends, ownership, and company profile answers

### 2. Deep financial analysis
Already implemented in the intent map and dedicated handlers:
- Deep valuation
- Deep safety / financial health
- Deep growth
- Deep efficiency
- Fair value analysis
- Ratio analysis
- Revenue trends
- Margin, debt, cash, EPS, and growth metric analysis

### 3. Premium institutional-style features
These are the strongest paid-plan candidates because they feel materially more valuable than basic chat:
- Hidden gems discovery
- Macro score / market timing
- Macro view
- Score breakdown per stock
- Morning brief
- Catalyst calendar
- Earnings analysis
- Universal financial question answering
- Advanced statistics
- Ownership detail
- EV analysis
- Dynamic financial explorer flows for income, balance sheet, cash flow, and ratio history

### 4. Account-level product features outside chat
Already available for authenticated users:
- Watchlists
- Price alerts
- Notification preferences
- Newsletter preferences / weekly report settings
- Billing / Stripe checkout and customer portal

## Existing Response Types You Can Monetize

The chatbot is not returning only plain text. It already supports a premium-style response system with multiple UI payload types.

### Standard response layers
- Conversational answer text
- Data cards
- Learning section
- Follow-up prompt
- Action buttons
- Dynamic follow-up chips

### Premium structured response objects
- `data_card`
- `bull_case`
- `bear_case`
- `insight_cards`
- `stock_list`
- `macro_score`
- `comparison_table`
- `educational_cards`
- `framework_card`
- `character_cards`
- `quantified_drivers`
- `index_composition`
- `disclaimer_card`

### Advanced card / visualization types
- Stock header
- Snapshot
- Stats
- Financial tables
- Compare tables
- Movers tables
- Screener result lists
- News lists
- Technical cards
- Revenue breakdown
- Cost breakdown
- EBITDA breakdown
- Growth trend charts
- Debt structure
- Asset breakdown
- Equity breakdown
- Working capital cards
- Cash flow waterfall
- Debt activity
- FCF vs income
- Ratio history charts
- Advanced stats cards
- Ownership structure charts
- Score detail cards
- Dynamic data cards

## Best Monetization Logic

### What should stay in Free
Free should prove value quickly and let users trust the product.

Best free-plan features:
- Market summary
- Price lookups and stock snapshot
- Top gainers / losers / most active
- Basic financials
- Basic dividend and news checks
- Basic comparisons
- Basic technicals
- Limited watchlist / alerts
- Limited daily AI usage

### What should move into Analyst
Paid should unlock depth, not just volume.

Best paid-plan features:
- Unlimited AI usage
- Deep valuation / safety / growth / efficiency
- Hidden gems and premium screeners
- Macro score and market timing
- Morning brief and catalyst calendar
- Score breakdown and advanced stats
- Universal financial explorer questions
- Full financial visualizations and multi-year explorer cards
- Full exports / reports
- More watchlists, alerts, and premium notifications

## Critical Product Gap

Before public monetization, there is one important mismatch:

- Guest users are limited to 5 questions.
- Authenticated users currently get unlimited chat access by default.
- The UI and billing system already describe a paid `Analyst` plan.
- But the backend chat access layer does not yet enforce paid-only premium capabilities.

So right now, pricing copy can be prepared immediately, but entitlement enforcement should be aligned before a hard commercial launch.

## Recommended Public Package Structure

## Package 1: Starta Free

### Positioning
A friendly entry plan for investors who want fast, trustworthy market answers without paying upfront.

### Who it is for
- New users
- Casual investors
- Users validating whether Starta fits their workflow

### Included features
- Guided AI market chat
- Price, snapshot, and market summary answers
- Top gainers, losers, and most active stocks
- Basic stock comparisons
- Dividend, news, and company profile answers
- Core financial statement access
- Basic technical and ownership insights
- Save a watchlist
- Create a small number of alerts
- Weekly product/news updates

### Recommended limits
- 10 to 20 AI questions per day for registered free users
- 1 watchlist
- Up to 3 alerts
- Basic exports only

### Marketing copy
**Starta Free**
Start investing with clarity. Get fast AI answers, real market data, and the essential tools you need to track stocks, compare opportunities, and understand what is happening in the market.

### Short feature list for marketing
- Real market data with AI explanations
- Market summary, movers, and stock snapshots
- Basic financials, dividends, news, and comparisons
- 1 watchlist and limited alerts
- Great for getting started

### CTA
`Start Free`

## Package 2: Starta Analyst

### Positioning
The serious-investor plan for users who want deeper conviction, richer workflows, and premium decision support.

### Who it is for
- Active investors
- Serious retail traders
- Users making repeated buy/sell/watch decisions
- Users who want more than surface-level stock answers

### Included features
- Unlimited AI analyst chat
- Deep valuation, safety, growth, and efficiency analysis
- Premium stock screeners and hidden gems discovery
- Macro score, market timing, and full macro view
- Morning brief and catalyst calendar
- Detailed score breakdown per stock
- Advanced statistics and ownership detail
- Universal financial explorer for balance sheet, income statement, cash flow, and ratios
- Full multi-year charts and premium visual cards
- Unlimited watchlists and more alerts
- Premium notifications and weekly briefings
- PDF / export / premium reporting access

### Marketing copy
**Starta Analyst**
Turn market noise into clear conviction. Unlock premium AI analysis, advanced stock discovery, deeper financial breakdowns, and the daily workflows serious investors need to move faster and decide better.

### Short feature list for marketing
- Unlimited AI analyst chat
- Deep valuation, safety, growth, and efficiency insights
- Hidden gems, premium screeners, and score breakdowns
- Morning brief, catalyst calendar, and macro signals
- Advanced charts, exports, watchlists, and alerts

### CTA
`Upgrade to Analyst`

## Clean Side-by-Side Version

| Feature | Starta Free | Starta Analyst |
|---|---|---|
| AI market chat | Limited | Unlimited |
| Market summary and movers | Yes | Yes |
| Price, snapshot, dividends, news | Yes | Yes |
| Basic comparisons | Yes | Yes |
| Deep valuation and safety | No | Yes |
| Hidden gems and premium screeners | No | Yes |
| Macro score and market timing | No | Yes |
| Morning brief and catalyst calendar | No | Yes |
| Advanced financial explorer | No | Yes |
| Score breakdown | No | Yes |
| Watchlists | Limited | Expanded / unlimited |
| Alerts | Limited | Expanded / unlimited |
| Exports and reports | Basic / limited | Full |

## Best Final Recommendation

If you want the simplest and strongest commercial message, use this:

### Starta Free
For discovering opportunities and understanding the market.

### Starta Analyst
For making higher-conviction investment decisions with premium intelligence.

That is much clearer than the current `Starter / Analyst / Institutional` public story for this product stage.

## Suggested Next Product Step

If you want pricing to match reality before launch, the next implementation step should be:
- Keep `guest = 5-question trial`
- Create a true `registered free` entitlement set
- Gate premium intents and premium account features behind `subscription_plan = analyst`

That would make the pricing page, billing flow, and chatbot behavior finally consistent.
