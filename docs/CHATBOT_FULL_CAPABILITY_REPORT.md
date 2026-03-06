# Starta Chatbot Full Capability Report

## 1. Product Identity

- The root product experience is the AI chatbot, not a secondary feature.
- The chatbot is implemented as a structured financial intelligence assistant, not a plain LLM text box.
- The system is built around a deterministic / handler-driven architecture with rich UI payloads.
- The product already presents itself publicly as having a free layer and a paid `Analyst` layer.

## 2. Current Access Model

### Guest access
- Guests are tracked by device fingerprint.
- Guests are limited to `5` free chat questions before they are blocked and pushed to register/login.
- This is enforced in the backend chat endpoint.
- The UI has a dedicated usage-limit modal explaining the free-question cap and pushing users toward signup.

### Authenticated access
- Authenticated users currently get unlimited chat access by default.
- There is no equivalent chat-limit enforcement layer yet for free registered users versus paid users.
- This means registration currently acts like an unlimited-access unlock, even before paid entitlements are fully enforced.

### Commercial implication
- The current real funnel is:
  - Guest trial
  - Registered user with effectively unlimited chat
  - Paid Analyst billing layer that is visible in the product but not fully enforced at the capability level

## 3. Supported Markets and Language Behavior

### Markets
- The chatbot is market-aware and supports at least `EGX` and a Saudi market mode in the frontend suggestion system.
- The backend premium handlers are heavily centered on `EGX` data and workflows.
- Some premium flows such as morning brief and catalyst calendar are explicitly EGX-focused.

### Languages
- The chat endpoint supports explicit language forcing through `X-Language`.
- If no language header is given, the system auto-detects Arabic characters and responds in Arabic.
- The frontend suggestion system has both English and Arabic prompt sets.
- The response layer includes substantial Arabic localization handling for card titles, metric labels, and explanatory content.

## 4. Conversation System Structure

The chatbot is not returning only one text paragraph. It uses a multi-layer response system.

### Core response layers
- Conversational narrative / opening text
- Data cards
- Learning section
- Follow-up prompt
- Action buttons
- Dynamic follow-up chips

### Conversation intelligence behavior
- Session continuity is stored in `chat_sessions`.
- User and assistant messages are persisted for follow-up continuity.
- Follow-up questions are explicitly detected and handled.
- Ambiguous follow-ups can trigger clarification flows.
- Symbol context is preserved across turns.
- The chatbot supports context-switch handling so a new ticker starts a new topic instead of being misread as a follow-up.

## 5. Core Chat Capabilities Already Implemented

### A. Direct market data and stock snapshots
- Stock price lookup
- Stock snapshot / quick stock overview
- Stock chart requests
- Market capitalization lookup via stock snapshot reuse
- Stock statistics lookup
- Market summary
- Market status
- Most active stocks
- Top gainers
- Top losers
- Sector stock lists
- Dividend-yield leaders

### B. Core fundamental intelligence
- Financial statements
- Annual financials intent
- Revenue trend
- Dividends
- Company profile
- Ownership
- News
- Fair value
- Financial health
- Ratio analysis
- Margin analysis
- Debt analysis
- Cash analysis
- Growth analysis
- EPS analysis

### C. Technical analysis
- Technical indicators
- Trend-oriented technical requests
- Support/resistance and levels requests are routed through technical handlers
- Momentum-oriented technical requests are routed through technical handlers

### D. Comparison and discovery
- Multi-stock comparison
- Sector-based screening
- Low-P/E / value screening
- Growth screening
- Safety screening
- Income / dividend screening
- Dividend leaders lists

### E. Educational and system behavior
- Greeting / identity / capabilities / mood / gratitude / goodbye flows
- Define-term / educational explanation flow
- Help flow
- Clarify-symbol flow
- Unknown-query fallback
- Blocked-query handling

## 6. Premium / Advanced Chat Capabilities Already Implemented

These are the strongest premium-grade capabilities because they go beyond basic “what is the price?” usage.

### Deep stock analysis
- Deep valuation
- Deep safety
- Deep growth
- Deep efficiency
- Score breakdown for a specific stock
- Score detail for Z-score / F-score style analysis
- Advanced statistics
- Ownership detail
- EV analysis
- Universal financial catch-all for arbitrary financial questions

### Premium screening and discovery
- Hidden gems discovery
- Universal deep screener logic
- Undervalued-stock screening
- Premium screeners using richer metrics than only P/E

### Macro and timing intelligence
- Macro score
- Macro view
- Market timing
- Index composition

### Institutional workflow features
- Earnings analysis
- Morning brief
- Catalyst calendar

### Financial explorer family
- Income explorer
- Income trend explorer
- Balance sheet explorer
- Balance sheet trend explorer
- Cash flow explorer
- Cash flow trend explorer
- Ratio trend explorer
- Advanced stats explorer
- Universal financial explorer

## 7. Detailed Breakdown of Response Types the UI Can Render

### Standard cards
- `stock_header`
- `snapshot`
- `stats`
- `financials_table`
- `dividends_table`
- `compare_table`
- `comparison_table`
- `movers_table`
- `sector_list`
- `screener_results`
- `ratios`
- `ownership`
- `fair_value`
- `technicals`
- `news_list`

### Premium structured response payloads
- `data_card`
- `bull_case`
- `bear_case`
- `insight_cards`
- `stock_list`
- `macro_score`
- `comparison_table`
- `educational_cards`
- `disclaimer_card`
- `framework_card`
- `character_cards`
- `quantified_drivers`
- `index_composition`

### Advanced visualization / explorer cards
- `revenue_breakdown`
- `cost_breakdown`
- `ebitda_breakdown`
- `earnings_quality`
- `growth_trend`
- `debt_structure`
- `assets_breakdown`
- `equity_breakdown`
- `ppe_breakdown`
- `working_capital_card`
- `cashflow_waterfall`
- `debt_activity`
- `fcf_vs_income`
- `ratio_history_chart`
- `advanced_stats`
- `ownership_structure`
- `score_detail`
- `dynamic_data_card`

### Premium scenario / intelligence cards
- `macro_score`
- `valuation_score`
- `macro_context`
- `methodology`
- `hidden_gems`
- `index_composition`
- `bull_case`
- `bear_case`
- `insight`
- `stock_list`
- `gem_list`
- `screening_criteria`
- `market_timing`
- `index_view`

### Chart types supported by the frontend contract
- `candlestick`
- `line`
- `bar`
- `pie`
- `donut`
- `column`
- `radar`
- `area`
- `financial_growth`

## 8. What the Chatbot Can Actually Answer in User Terms

Below is the practical feature list in user-facing language.

### Fast market questions
- “What is the price of COMI?”
- “Give me a snapshot of TMGH.”
- “Show me top gainers.”
- “What is happening in the market today?”
- “Which stocks are most active?”

### Company and stock research
- “Show me COMI financials.”
- “What is the dividend history of SWDY?”
- “Who owns TMGH?”
- “Give me the company profile of PHDC.”
- “What are the latest news items for a stock?”

### Deeper investor questions
- “Is this stock undervalued?”
- “Is this stock financially safe?”
- “How is its growth?”
- “How efficient is management?”
- “What is the fair value?”
- “Break down the score for this stock.”

### Comparative / screening questions
- “Compare COMI vs SWDY.”
- “Show me the safest stocks.”
- “Find undervalued stocks.”
- “Find high-growth names.”
- “Show me the best dividend stocks.”
- “Find hidden gems.”

### Macro / market strategy questions
- “How is the Egypt market environment?”
- “Is now a good time to buy?”
- “What is the macro score?”
- “What does index composition look like?”

### Workflow-style premium questions
- “Give me the morning brief.”
- “What catalysts are coming up?”
- “Analyze earnings for this stock.”
- “Show me balance-sheet detail.”
- “Show me debt structure.”
- “Show me cash flow waterfall.”
- “Show me historical ratio trends.”

## 9. Existing Prompt / Suggestion Families in the Frontend

The product already guides users toward monetizable use cases through suggestion chips.

### Main suggestion families
- Smart Insights
- Valuation
- Health
- Growth & Ownership
- Dividends

### Egypt-only mobile suggestion families
- Egypt Hot
- Valuation
- Health
- Growth
- Dividends
- News
- Ownership

### Suggested query patterns already surfaced in the UI
- Undervalued / overvalued
- Fair value
- Financial safety
- Growth potential
- P/E and PEG
- Profit margin
- Earnings trend
- Ownership and insider trading
- Dividend history and yield
- Market summary and top gainers

This is important commercially because the UI is already training users to ask premium-relevant questions.

## 10. Action Buttons and Guided Follow-Ups

The chatbot does not end with one answer. It frequently returns next-step actions.

### Existing action behavior includes
- Chart actions
- Financials actions
- Dividends actions
- Shareholders / ownership actions
- Technicals actions
- Morning brief actions
- Top-dividend follow-ups
- Analyze-symbol follow-ups
- Banking-sector / sector-overview follow-ups

### Commercial value of this behavior
- It increases depth per session.
- It encourages multi-turn exploration.
- It makes premium research workflows feel more guided and productized.

## 11. Account-Level Features Already Built Outside the Chat

### Watchlists
- Users can create watchlists.
- Users can delete watchlists.
- Users can add symbols to watchlists.
- Users can remove symbols from watchlists.

### Price alerts
- Users can create price alerts with `ABOVE` and `BELOW` conditions.
- Users can list alerts.
- Users can delete alerts.

### Notification preferences
- Price alerts toggle
- Volume spikes toggle
- Push notifications toggle
- Security alert toggle
- Weekly report toggle
- Academy news toggle

### Newsletter preferences
- Weekly pulse preference
- Academy preference
- Additional newsletter preference fields exist in the database model

### Billing account area
- The settings page recognizes a paid `Analyst` state.
- It shows plan name, billing button behavior, and premium benefit copy.
- It can open Stripe Checkout for upgrade.
- It can open Stripe customer portal for active paid users.

## 12. Billing and Subscription Infrastructure Already Present

### Existing billing implementation
- Stripe Checkout session creation exists.
- Stripe customer portal session creation exists.
- Stripe webhook endpoint exists.
- Webhook updates `stripe_customer_id`, `subscription_status`, `subscription_plan`, and `subscription_end_date` in `users`.

### What that means
- Subscription plumbing is real.
- Billing is not mock-only.
- Paid state is stored in the user record.
- The settings page already consumes that state.

## 13. Data / Persistence / Analytics Infrastructure Already Present

### Core conversation persistence
- `guest_sessions`
- `chat_sessions`
- `chat_messages`
- `chat_analytics`
- `chat_interactions`
- `chat_session_summary`

### Feedback / admin tables
- `unresolved_queries`
- `chat_feedback`

### User and auth tables
- `users`
- `verification_codes`

### Notification / newsletter tables
- `newsletter_preferences`
- `user_notification_settings`

### User feature tables
- `watchlists`
- `watchlist_items`
- `price_alerts`

### Commercial value
- You already have enough persistence and analytics structure to support:
  - free-to-paid funnel analysis
  - high-intent query analysis
  - unresolved premium-demand detection
  - behavior-based upsell design

## 14. Strongest Features for Monetization Later

If the goal is packaging and later upsell, these are the strongest capability clusters.

### High-value premium clusters
- Deep valuation / safety / growth / efficiency
- Hidden gems discovery
- Market timing and macro score
- Morning brief
- Catalyst calendar
- Score breakdown
- Advanced statistics and ownership detail
- Income / balance / cash flow explorer flows
- Ratio history and advanced financial visualization
- Universal financial Q&A

### High-value sticky product features
- Watchlists
- Alerts
- Notifications
- Weekly reports / briefing preferences
- Guided follow-up actions

## 15. Important Gaps and Mismatches

This is the most important part for pricing accuracy.

### Gap 1: Guest limit vs real free plan
- Guest users are capped at 5 questions.
- The pricing page currently says `5 chats per day` for the free tier.
- That is not the same thing.
- The actual implemented flow is `5 free questions before registration prompt`, not a full daily-limited registered free plan.

### Gap 2: Registered free vs paid entitlements
- Authenticated users currently get unlimited chat access by default.
- This means the backend does not yet properly separate registered free users from paid Analyst users for chat depth/volume.

### Gap 3: Pricing copy may overstate enforcement
- The public pricing constants list export/download limits and Analyst benefits.
- Billing/settings also present a premium Analyst plan.
- But several of these features are represented in UI copy more clearly than in hard backend entitlement checks.

### Gap 4: Subscription plan naming mismatch
- The UI often treats `subscription_plan === 'analyst'` or `subscription_status === 'active'` as paid.
- Stripe webhooks currently store the Stripe price ID into `subscription_plan`.
- That can create a naming mismatch unless normalized elsewhere.

### Gap 5: Some premium handlers are stronger than the public pricing story
- Your implemented premium answer system is actually more advanced than the current simple `Starter / Analyst` copy suggests.
- The product can already support a more convincing premium positioning around decision-quality and institutional-style insight.

## 16. What Is Clearly Verified vs What Is Only Partially Wired

### Clearly verified in code
- Guest 5-question gate
- Unlimited access for authenticated users
- Rich handler-based chatbot architecture
- Deep analysis intents
- Premium response card types
- Watchlists
- Alerts
- Notification preferences
- Newsletter preferences
- Stripe checkout and portal
- Paid-state persistence in the user table
- Analyst plan presence in the settings UI

### Partially wired / commercially visible but not fully enforced
- Real free registered plan entitlements
- Paid-only gating of premium chat capabilities
- Hard download/export limits matching pricing page claims
- Clean normalization of `subscription_plan` values across billing and UI logic

## 17. Bottom-Line Product Readiness Assessment

### What is already ready
- Capability discovery and audit
- Marketing preparation
- Plan design
- Pricing-page restructuring
- Analyst-plan positioning
- Feature differentiation strategy

### What should be done before hard launch of paid tiers
- Implement entitlement enforcement for registered free users versus paid users
- Normalize subscription plan identifiers
- Align pricing-page claims with real backend limits
- Decide which premium handlers and account features are Analyst-only
- Decide whether guest `5 questions` is a trial or the actual free plan

## 18. Best Practical Conclusion

Your chatbot is already strong enough for a real two-tier monetization strategy.

The system already has:
- enough breadth for a strong free offer
- enough depth for a convincing premium offer
- enough UI sophistication for premium perceived value
- enough billing infrastructure to support subscription sales

The main thing still missing is not capability.

The main missing layer is `entitlement enforcement`.
