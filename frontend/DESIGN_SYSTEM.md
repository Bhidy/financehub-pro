# Starta – Midnight Teal Design System

## Brand Identity

**Starta** is an ultra-premium fintech platform providing institutional-grade financial intelligence for Egypt and Saudi markets. The visual identity projects **trust, authority, and innovation** through a carefully curated color palette and typography system.

---

## Core Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| **Primary (Dark Navy)** | `#0F172A` | Backgrounds, headers, primary surfaces |
| **Primary Light** | `#1E293B` | Elevated surfaces, cards in dark mode |
| **Primary Dark** | `#020617` | Deepest backgrounds |
| **Accent (Midnight Teal)** | `#14B8A6` | Brand accent, highlights, status indicators |
| **Accent Light** | `#2DD4BF` | Hover states for accent elements |
| **Accent Dark** | `#0D9488` | Pressed states for accent elements |

---

## Functional Colors

### Interactive Elements
| Token | Value | Usage |
|-------|-------|-------|
| **Trust Blue** | `#3B82F6` | CTAs, links, interactive elements, send buttons |
| **Trust Blue Light** | `#60A5FA` | Hover states |
| **Trust Blue Dark** | `#2563EB` | Pressed states |

### Semantic States
| Token | Value | Usage |
|-------|-------|-------|
| **Success** | `#10B981` | Confirmations, positive states |
| **Warning** | `#F59E0B` | Alerts, notices |
| **Error** | `#EF4444` | Errors, critical alerts |

### Market Data ONLY
> ⚠️ **CRITICAL**: Green and Red are EXCLUSIVELY for actual market data. Never use decoratively.

| Token | Value | Usage |
|-------|-------|-------|
| **Bullish** | `#22C55E` | Price increases ONLY |
| **Bearish** | `#EF4444` | Price decreases ONLY |
| **Neutral** | `#6B7280` | Unchanged data |

---

## Surface Colors

### Light Theme
| Token | Value |
|-------|-------|
| Background | `#F8FAFC` |
| Card | `#FFFFFF` |
| Elevated | `#FFFFFF` |
| Border | `#E2E8F0` |

### Dark Theme
| Token | Value |
|-------|-------|
| Base | `#0B1121` |
| Card | `#111827` |
| Elevated | `#1F2937` |
| Border | `rgba(255, 255, 255, 0.08)` |

---

## Typography

### Primary Brand Font: Manrope

**Manrope** is the official typeface for all English text in Starta. It provides a clean fintech tone with strong readability across dashboards, cards, and dense data UI.

> 🔗 **Google Fonts**: https://fonts.google.com/specimen/Manrope

| Property | Value |
|----------|-------|
| **Font Family** | Manrope |
| **Designer** | Mikhail Sharanda |
| **Category** | Sans-serif |
| **License** | Open Font License |

### Font Stack
```css
/* Primary Sans (English) */
--font-sans: var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace (Code/Data) */
--font-mono: var(--font-jetbrains), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

/* Arabic Text */
--font-arabic: "Cairo", var(--font-sans);
```

### Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Card titles, emphasis |
| Semibold | 600 | Subheadings, buttons |
| Bold | 700 | Headings, important labels |
| Extrabold | 800 | Hero prices, large numbers |
| Black | 900 | Brand name, big impact text |

### Type Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 32px | Bold (700) | Page titles |
| H2 | 24px | Bold (700) | Section headers |
| H3 | 18px | Semibold (600) | Card titles |
| Body | 16px | Regular (400) | Main content |
| Body Small | 14px | Regular (400) | Secondary content |
| Caption | 12px | Medium (500) | Labels, timestamps |
| Micro | 10px | Bold (700) | Badges, tags |

### Implementation (Next.js)
```tsx
// app/layout.tsx
import { Manrope, JetBrains_Mono } from "next/font/google";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});
```

---

## Component Specifications

### Input Fields
- Height: `48px`
- Border Radius: `6px`
- Border: `1px solid #E2E8F0`
- Focus: `2px ring #3B82F6`
- Placeholder: `#9CA3AF`

### Buttons
| Type | Background | Color |
|------|------------|-------|
| Primary | `#3B82F6` | White |
| Secondary | Transparent | `#0F172A` |
| Accent | `#14B8A6` | White |

### Cards
- Border Radius: `12px` (large), `8px` (default)
- Border: `1px solid #E2E8F0` (light), `1px solid rgba(255,255,255,0.08)` (dark)
- Shadow: `0 4px 16px rgba(0, 0, 0, 0.08)`

---

## Usage Guidelines

### DO ✅
- Use Trust Blue (`#3B82F6`) for all CTAs and interactive elements
- Use Midnight Teal (`#14B8A6`) for brand accents and status indicators
- Reserve green/red strictly for market data
- Use `#111827` for dark mode cards
- Apply subtle teal glows for premium feel
- Give every section exactly ONE dark heading (see "One Title Per Section")
- Change EN and AR copy together, in the same edit (see "Bilingual Parity")

### DON'T ❌
- Use purple, violet, or indigo colors
- Use green/red decoratively (non-market data)
- Use gradients with blue-to-indigo
- Use `#1A1F2E` for dark cards (legacy)
- Mix color systems from other brands
- Add a small accent-coloured eyebrow/kicker above a section heading — BANNED site-wide
- Edit copy in one language and leave the other stale — BANNED

---

## Bilingual Parity — Every Change Lands in BOTH Languages (PERMANENT RULE)

> ⛔ **Never change copy in one language only.** Arabic and English are a matched
> pair. Editing one and leaving the other is a defect, not a follow-up task.

Every user-facing string change — new copy, reworded copy, deleted copy, a new
label, a removed section — must be applied to **both** the `en` and `ar`
translation dictionaries in the same edit. The two must always say the same
thing; not a literal word-for-word translation, but the same meaning, scope and
promise. If the Arabic is shortened, the English is shortened to match.

Three places must stay in sync for any static-HTML string:

1. the `en` dictionary entry,
2. the `ar` dictionary entry,
3. the **markup default** inside the element (it renders before
   `applyTranslations()` runs, so a stale default flashes to real users).

Deleting a string means deleting its key from both dictionaries *and* removing
the element — a `data-key` with no dictionary entry silently renders the stale
markup default forever.

**Enforcement:** `frontend/scripts/verify-route-aliases.mjs` compares the two
dictionaries key-for-key and fails the build on any key present in one language
but not the other. Do not weaken that check.

---

## Section Headings — One Title Per Section (PERMANENT RULE)

> ⛔ **BANNED: the small green eyebrow/kicker above a section heading.**
> Never reintroduce it anywhere on the site, in any surface, under any class name.

A section gets **exactly one title**: a single dark heading in `--c-text-main`,
optionally followed by one muted deck paragraph. There is no small accent-coloured
label above it — no "THE PROBLEM", no "MARKET NEWS", no "WEALTH PROJECTION".

**The banned pattern** (removed 2026-08-14 from the homepage, `/Funds`, and `/Fund`):

```html
<!-- ❌ NEVER -->
<span class="section-tag">MARKET NEWS</span>
<h2 class="section-title">Stories That Move Markets.</h2>

<!-- ❌ ALSO BANNED — same thing hand-styled without the class -->
<div class="text-[0.72rem] uppercase tracking-[0.24em] text-starta-darkTeal">Mutual Funds</div>
<h1>Comprehensive coverage</h1>
```

```html
<!-- ✅ ALWAYS — the label IS the title, rendered dark -->
<h2 class="section-title section-title--solo text-main">Market News</h2>
<p class="text-muted copy-premium">Curated financial coverage, company developments…</p>
```

**How to convert an existing eyebrow + headline pair:** the eyebrow's text becomes
the heading, and the old marketing headline is deleted — not the other way round.
The heading is plain and declarative ("Market News", "Starta Academy", "Wealth
Projection"), and `.section-title--solo` gives it the extra optical size it needs
to hold the section alone.

**Arabic:** `.section-title--solo` resets `letter-spacing` to `0` and opens the
leading under `html[lang="ar"]`. Arabic is a connected script — negative tracking
breaks the joins. Never ship negative tracking on Arabic display type.

**Enforcement:** `frontend/scripts/verify-route-aliases.mjs` fails the build if
`section-tag` reappears in any served HTML. Do not weaken that check.

---

## Implementation Reference

### Tailwind Classes
```tsx
// Primary brand colors
bg-[#0F172A]         // Dark navy background
text-[#14B8A6]       // Teal accent text
bg-[#14B8A6]/10      // Teal subtle background

// Trust Blue CTAs
bg-[#3B82F6]         // Primary button
hover:bg-[#2563EB]   // Button hover
shadow-[#3B82F6]/20  // Button shadow

// Dark mode cards
dark:bg-[#111827]    // Card background
dark:border-white/[0.08] // Card border

// Market data
text-[#22C55E]       // Bullish (price up)
text-[#EF4444]       // Bearish (price down)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `app/globals.css` | Complete design system with CSS variables |
| `app/login/page.tsx` | Midnight Teal login experience |
| `app/register/page.tsx` | Consistent registration flow |
| `app/page.tsx` | Dashboard with brand colors |
| `app/AiChat/page.tsx` | Canonical AI chat route |
| `components/chatbot/ResponsivePage.tsx` | Shared responsive AI chat experience |
| `components/AppSidebar.tsx` | Starta branding in sidebar |
| `components/ai/ChatCards.tsx` | Data cards with brand colors |

---

*Version: 1.0*  
*Last Updated: 2026-01-21*  
*Author: Starta Design System*
