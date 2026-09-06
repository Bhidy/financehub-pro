# Registration strategy — earn the click free, gate the workflow

**The goal is registrations. The constraint is that organic search is the only
channel this site has, on a domain under a year old with almost no backlinks.
So the rule is absolute:**

> **Nothing a search engine indexes is ever gated, hidden, blurred or metered.
> Registration gates what happens *after* the click, never the answer that
> earned it.**

Search sends people an answer: *what is the NAV of this fund*, *best mutual
funds in Egypt*, *COMI share price today*. That answer is the product's
distribution. Gating it trades the whole channel for a few sign-ups. The
Wall Street Journal lost 44% of its search traffic doing a version of this
badly, and it had authority to spare. This site does not.

What people register for is not the answer. It is **leverage over the answer** —
keeping it, comparing it, being told when it changes. That has no search value
at all, which is exactly why it is safe to gate and honest to charge attention
for.

---

## The three tiers

### Tier 1 — Open forever

Never gated, never metered, never blurred. This is everything a query asks for
and everything that supports it.

| Surface | Stays fully open |
| --- | --- |
| `/Funds` | All 207 funds, every filter, both views, the full list |
| `/Funds/[id]` | Identity, NAV, returns, fees, risk band, NAV history, manager, documents, FAQ |
| `/News` + articles | Every headline and every article body, in full |
| `/Market-Pulse` | EGX 30 level, movers, breadth, the tape, the market reading, news |
| `/symbol/[id]` | Price, key statistics, profile, ownership, sector peers, glossary, FAQ, and every metric sub-page |
| `/Learn`, `/Calculators`, `/RiskAssessment`, `/markets/*`, `/sectors/*`, `/companies` | Everything |

If a page is in a sitemap, its substance is Tier 1. No exceptions, no "just the
last paragraph", no archive cut-off.

### Tier 2 — Free account

Gated. Every item here is **personal or derived**, produces no indexable text,
and is genuinely better with an account than without one. The gate is not a
tax on these features; it is the thing that makes them work.

| Feature | Free without an account | Why gating is fair |
| --- | --- | --- |
| **Watchlist** | 3 symbols | It lives in one browser today and dies when the visitor clears their data. An account is what makes it survive and follow them to their phone. |
| **Fund comparison** | 2 funds side by side | A third fund is a research session, not a glance. |
| **Company comparison** | 2 companies | Same. |
| **Fund scorecard, suitability, stress tests** | — | Already gated. Derived analysis, not a published figure. |
| **Price and NAV alerts** | — | Cannot exist without an account to notify. |
| **Saved filters and screens** | — | Nothing to save state to. |
| **CSV export** | — | Bulk extraction is not what the free tier is for. |

Limits are set where they bite **after** interest is demonstrated, not before.
A visitor who wants one number never meets a gate. A visitor building a
shortlist meets one at exactly the moment an account starts paying for itself.

### Tier 3 — Invitation, never a wall

For high-volume reading surfaces — news articles, company pages — there is **no
meter and no wall**. Instead, after a visitor has read several items across a
rolling window, a single dismissible line appears in the flow of the page
offering to keep what they are reading. It removes nothing, blocks nothing, and
does not return once dismissed.

This is deliberate. Metering collapsed from about a third of publishers to under
a tenth over six years, and the average visitor reads under two articles per
session — so a meter set anywhere reasonable never fires, while a meter set low
enough to fire is the thing that costs rankings. Registration walls out-convert
meters, and an invitation out-converts a wall on a site that still needs every
crawl it can get.

---

## How it is built, and why it cannot hurt the rankings

1. **The server response is identical for everyone.** The gate is applied on the
   client, after authentication resolves. Server-side branching is impossible
   here anyway: the session lives in `localStorage`, and the edge cache
   (`middleware.ts`) serves one shared HTML document per URL. Any per-user
   server render would poison that cache.

2. **Gated content stays in the HTML.** It is visually clipped and blurred, never
   removed. Crawlers, and any visitor with the page source, see everything.

3. **Google's paywall markup is emitted wherever an in-DOM block is gated** —
   `isAccessibleForFree: false` plus `hasPart` with a `cssSelector` pointing at
   the gate's wrapper class. Google requires this for registration walls exactly
   as for paid ones; without it, showing crawlers content that visitors do not
   see is cloaking. This site had gated content and no such markup.

4. **One gate, two renderers.** React surfaces use a single component; the static
   HTML hubs use a vanilla twin that reads the same session contract. They cannot
   disagree about who is signed in.

5. **Build-gated.** A check fails the build if a Tier 1 route gains a gate, or if
   a page gates in-DOM content without emitting the paywall markup.

---

## What we are optimising

Not sign-ups this week. A registered reader is worth having only if they come
back, so every gate above is placed where saying yes makes the next visit
better: the watchlist they built, the comparison they were mid-way through, the
alert they asked for. A gate that interrupts someone reading a headline produces
an account and a person who never returns.
