import { constants, existsSync, readFileSync, readdirSync } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { assetHashes } from "./sync-asset-versions.mjs";
import { deriveArRoutes } from "./sync-ar-routes.mjs";
import { renderMirror, extractMirror, readContract } from "./sync-auth-nav.mjs";
import { buildManifest, referencedImages } from "./sync-learn-image-sizes.mjs";
import { validate as validateManagerLogos, MIN_RASTER_WIDTH } from "./sync-manager-logos.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicPages = ["home", "marketplace", "fund-details", "fund-compare", "market-pulse", "learn", "learn-topic", "news", "news-article"];
// SEO gate covers every indexable static template (superset incl. legal pages).
const seoPages = [...publicPages, "portfolio", "portfolio-detail", "privacy", "terms"];
// Every static HTML page must load the ONE typography contract
// (public/assets/starta-typography.css). A page that misses it falls back to
// whatever its own inline <style> says, which is exactly the drift that let
// Arabic render in a Latin face. Checked for the full set, not just the
// indexable ones — a legal page in the wrong typeface is still wrong.
const typographyPages = [...seoPages];

function hasCurrentPublicNav(text) {
  const nav = text.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || "";
  const fundsKey = nav.includes('data-key="nav_mobile"') ? "nav_mobile" : "nav_funds";
  // My Portfolio (nav_portfolio), Features and Pricing are hidden features; assert
  // they are ABSENT and the remaining links are in order. nav_pulse is NOT in that
  // set any more — Market Pulse was restored to the bar on 2026-09-06 and now lives
  // in lib/nav.json, which the runtime renderer draws over this legacy markup.
  const positions = ["nav_home", fundsKey, "nav_news", "nav_learn"]
    .map((key) => nav.indexOf(`data-key="${key}"`));

  return positions.every((position) => position >= 0) &&
    positions.every((position, index) => index === 0 || position > positions[index - 1]) &&
    !/data-key=["']nav_(features|pricing|portfolio)["']/.test(nav) &&
    /data-key=["']nav_news["'][^>]*>\s*MARKET NEWS\s*</i.test(nav);
}

const checks = [
  {
    // The chatbot is hidden from the website (2026-08): the app-shell "home"
    // must be the SITE home, never /AiChat — logos, back buttons and post-auth
    // fallbacks all flow through this route.
    name: "route helper home is the site home (not the hidden chatbot)",
    file: "components/chatbot/hooks/useMobileRoutes.ts",
    assert: (text) => /home:\s*["']\/["']/.test(text) && !/home:\s*["']\/AiChat["']/.test(text),
  },
  {
    name: "login success never redirects to dashboard",
    file: "app/login/page.tsx",
    assert: (text) =>
      !/router\.push\(\s*['"]\/dashboard['"]\s*\)/.test(text),
  },
  {
    // Theme contract: LIGHT is the product default; DARK is opt-in via the
    // toggle only. An OS-preference override here silently flipped React pages
    // to dark for OS-dark users while the static pages stayed light.
    name: "globals.css must not auto-switch theme from the OS preference",
    file: "app/globals.css",
    // Strip /* … */ comments first: the block's removal is documented in a
    // comment that names the at-rule, which must not trip the gate.
    assert: (text) =>
      !/@media\s*\(prefers-color-scheme:\s*dark\)/.test(text.replace(/\/\*[\s\S]*?\*\//g, "")),
  },
  {
    // Theme contract: every React page must resolve the theme BEFORE paint,
    // stamping both representations (data-theme attribute + .light/.dark class)
    // so no surface can render half-dark or flip during navigation.
    name: "root layout ships the pre-paint theme boot script",
    file: "app/layout.tsx",
    assert: (text) =>
      /id="starta-theme-boot"/.test(text) &&
      /data-theme="light"/.test(text) &&
      /localStorage\.getItem\("theme"\)/.test(text),
  },
  {
    // Theme contract: the static-page engine must stamp the class too, so a
    // toggle on any page is consistent across static and React surfaces.
    name: "starta-theme.js stamps both data-theme and the light/dark class",
    file: "public/assets/starta-theme.js",
    assert: (text) => /classList\.add\(resolved\)/.test(text),
  },
  {
    // Theme contract: LIGHT is the default on EVERY surface. This provider
    // once defaulted to dark and force-applied it outside .seo-shell pages,
    // flipping light users to dark on /login, /register and /settings.
    name: "app ThemeProvider defaults to light (no second dark default)",
    file: "components/ThemeProvider.tsx",
    assert: (text) =>
      /useState<Theme>\("light"\)/.test(text) && !/\|\|\s*"dark"/.test(text),
  },
  {
    // Language contract: static pages must be able to localize links into
    // server-rendered /ar twins. The global helper + anchor rewriter live in
    // the lang-boot script that every static page loads before paint.
    name: "lang-boot defines startaLocalizedHref + anchor localizer",
    file: "public/assets/starta-lang-boot.js",
    assert: (text) =>
      /window\.startaLocalizedHref\s*=/.test(text) &&
      /addEventListener\(["']click["']/.test(text),
  },
  {
    // Language contract: the shell must never hardcode a bare EN link to a
    // twinned route — an Arabic page would silently flip the user to English.
    name: "PublicPageShell routes twinned links through localizedHref",
    file: "components/seo/PublicPageShell.tsx",
    // The helper now lives in lib/localized-href.ts and is shared with SiteNav,
    // so accept the import as well as a local definition.
    assert: (text) =>
      (/function localizedHref/.test(text) || /from '@\/lib\/localized-href'/.test(text)) &&
      !/href="\/RiskAssessment"/.test(text) &&
      !/href="\/Calculators"/.test(text),
  },
  // ───────────────────────────────────────────────────────────────────────
  // HOME + LANGUAGE CONTRACT (lib/lang.ts). The behavioural half of these
  // rules is EXECUTED by scripts/test-lang-contract.ts (npm run verify:lang);
  // these gates guard the source so a regression is caught at the line that
  // causes it, with the reason attached.
  //
  // Both defects these gates exist for were live in production on 2026-09-06:
  //   1. localizedHref('/', 'ar') returned '/ar', so every Arabic page's nav,
  //      breadcrumb and footer HOME link opened the 113 KB Arabic hub while the
  //      brand lockup beside them opened the 299 KB designed homepage.
  //   2. Persisting the URL's language was opt-in, and 35 of 59 shell call
  //      sites never opted in, so storage drifted from the URL and the next
  //      single-URL page rendered in the other language.
  // ───────────────────────────────────────────────────────────────────────
  {
    name: "HOME is one URL: the canonical nav points home at '/'",
    file: "lib/nav.json",
    assert: (text) => {
      const home = JSON.parse(text).items.find((i) => i.key === "nav_home");
      return Boolean(home) && home.href === "/";
    },
  },
  {
    name: "the React link localizer never maps '/' to the Arabic hub",
    file: "lib/localized-href.ts",
    assert: (text) =>
      /return HOME_PATH/.test(text) &&
      !/(path|bare)\s*===\s*['"]\/['"][^\n]*return\s*['"]\/ar['"]/.test(text) &&
      !/return\s*['"]\/ar['"];/.test(text),
  },
  {
    name: "the React link localizer matches EXACT patterns, never route prefixes",
    file: "lib/localized-href.ts",
    // Prefix matching is the algorithm sync-ar-routes.mjs documents as
    // abandoned: it minted /ar/News/{id} for English-only articles (a 308 back
    // into the English tree — the language-flip report) and /ar/markets (a hard
    // 404). Both halves of the contract must use arTwinRoutes.patterns.
    assert: (text) =>
      /arTwinRoutes\.patterns/.test(text) &&
      !/startsWith\(`\$\{route\}\//.test(text),
  },
  {
    name: "the browser link localizer never maps '/' to the Arabic hub",
    file: "public/assets/starta-lang-boot.js",
    assert: (text) =>
      /if \(bare === "" \|\| bare === "\/"\) return "\/" \+ rest;/.test(text),
  },
  {
    name: "PublicPageShell records the URL's language itself (never opt-in)",
    file: "components/seo/PublicPageShell.tsx",
    // `persistLang` was the opt-in that 35 call sites missed. The shell now
    // decides: an /ar URL always counts as a language choice; a bare English
    // URL counts only when the page has a real Arabic twin (altHref), so
    // opening an English-only article cannot flip an Arabic reader's chrome.
    assert: (text) =>
      /lang === 'ar' \|\| altHref \? langSeedScriptBody\(lang\) : ''/.test(text) &&
      /void persistLang/.test(text),
  },
  {
    name: "one definition of the language seed (keys + cookie)",
    file: "lib/static-hub.ts",
    assert: (text) => /langSeedScriptFromContract\(lang\)/.test(text) && !/localStorage\.setItem\('starta-lang'/.test(text),
  },
  {
    name: "every designed hub seeds its language in BOTH trees, not only Arabic",
    // Seeding only on /ar made storage a one-way ratchet: a reader who chose
    // English was flipped back by any /ar URL they opened, and the next
    // single-URL page they visited rendered in the wrong language.
    files: ["app/Funds/route.ts", "app/Learn/route.ts", "app/Market-Pulse/route.ts", "lib/news-hub.ts", "lib/fund-hub.ts", "lib/compare-hub.ts"],
    assert: (text) => /langSeedScript\(/.test(text),
  },
  {
    name: "the Market Pulse hub seeds English too (not only Arabic)",
    file: "app/Market-Pulse/route.ts",
    assert: (text) => /langSeedScript\(isAr \? 'ar' : 'en'\)/.test(text),
  },
  {
    name: "the company page resolves its language with the shared Arabic-default rule",
    file: "app/symbol/[id]/SymbolPageClient.tsx",
    // It defaulted to "en" and cast whatever string it found, so a visitor with
    // no stored preference got English on a site whose default is Arabic.
    assert: (text) =>
      /readStoredLang\(\)/.test(text) && !/\|\| "en";/.test(text),
  },
  {
    name: "the language + home contract is executed by the build",
    file: "package.json",
    assert: (text) => {
      const scripts = JSON.parse(text).scripts || {};
      return Boolean(scripts["verify:lang"]) && /verify:lang/.test(scripts["verify:all"] || "");
    },
  },
  {
    name: "register success uses unified home route",
    file: "app/register/page.tsx",
    assert: (text) =>
      !/router\.push\(\s*['"]\/dashboard['"]\s*\)/.test(text),
  },
  {
    name: "next config rewrites / to existing static home.html",
    file: "next.config.ts",
    assert: (text) =>
      /async rewrites\(\)\s*{[\s\S]*source:\s*['"]\/['"][\s\S]*destination:\s*['"]\/home\.html['"]/m.test(
        text
      ),
  },
  {
    // The homepage is one large inline <script>. A syntax error anywhere in it
    // kills EVERY script on the page (translations, funds, marquee) while the
    // HTML still renders and every other check here still passes — exactly how
    // a broken build slipped through once. Parse the inline scripts for real.
    name: "home page inline scripts parse as valid JavaScript",
    file: "public/home.html",
    assert: (text) => {
      const blocks = [...text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((m) => m[1])
        .filter((code) => code.trim() && !/^\s*\{[\s\S]*\}\s*$/.test(code)); // skip JSON-LD
      if (!blocks.length) return false;
      for (const code of blocks) {
        try {
          new Function(code);
        } catch (error) {
          console.error(`       ${error.message}`);
          return false;
        }
      }
      return true;
    },
  },
  {
    // Sora has no Arabic glyphs. A stack that names Sora without an explicit
    // Arabic face drops Arabic text to the browser's generic sans-serif, which
    // renders visibly different from the rest of the page (this shipped once,
    // in the academy section). Every Sora stack must name the Arabic face.
    name: "no Sora font stack without an Arabic fallback",
    file: "public/home.html",
    // \s* must live INSIDE the lookahead: outside it, backtracking lets it
    // match zero characters and the lookahead passes on the space.
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (learn.html)",
    file: "public/learn.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (learn-topic.html)",
    file: "public/learn-topic.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (news.html)",
    file: "public/news.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (news-article.html)",
    file: "public/news-article.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (marketplace.html)",
    file: "public/marketplace.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (fund-details.html)",
    file: "public/fund-details.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (fund-compare.html)",
    file: "public/fund-compare.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (market-pulse.html)",
    file: "public/market-pulse.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (privacy.html)",
    file: "public/privacy.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "no Sora font stack without an Arabic fallback (terms.html)",
    file: "public/terms.html",
    assert: (text) => !/font-family:\s*'Sora',(?!\s*'IBM Plex Sans Arabic')/.test(text),
  },
  {
    name: "home.html loads the canonical nav renderer",
    file: "public/home.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "learn.html loads the canonical nav renderer",
    file: "public/learn.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "learn-topic.html loads the canonical nav renderer",
    file: "public/learn-topic.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "news.html loads the canonical nav renderer",
    file: "public/news.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "news-article.html loads the canonical nav renderer",
    file: "public/news-article.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "marketplace.html loads the canonical nav renderer",
    file: "public/marketplace.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "fund-details.html loads the canonical nav renderer",
    file: "public/fund-details.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "fund-compare.html loads the canonical nav renderer",
    file: "public/fund-compare.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "market-pulse.html loads the canonical nav renderer",
    file: "public/market-pulse.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "privacy.html loads the canonical nav renderer",
    file: "public/privacy.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "terms.html loads the canonical nav renderer",
    file: "public/terms.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "portfolio.html loads the canonical nav renderer",
    file: "public/portfolio.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    name: "portfolio-detail.html loads the canonical nav renderer",
    file: "public/portfolio-detail.html",
    assert: (text) => /assets\/starta-nav\.js/.test(text),
  },
  {
    // The nav is defined once in lib/nav.json. React imports it directly; the
    // static pages read the mirrored public/assets/starta-nav.js. A stale
    // mirror silently reintroduces the drift this replaced, so compare them.
    name: "static nav mirror matches lib/nav.json (run: node scripts/sync-nav.mjs)",
    file: "public/assets/starta-nav.js",
    assert: (text, ctx) => {
      const items = JSON.parse(ctx.navConfig).items;
      const cta = JSON.parse(ctx.navConfig).cta;
      const itemsOk = items.every((i) => text.includes(`"key": "${i.key}"`) && text.includes(`"href": "${i.href}"`));
      // cta is null when the profile link is a normal nav item rather than a button.
      const ctaOk = cta ? text.includes(`"key":"${cta.key}"`) : /var CTA = null;/.test(text);
      const expected = items.length + (cta ? 1 : 0);
      return itemsOk && ctaOk && (text.match(/"key":\s*"nav_/g) || []).length === expected;
    },
  },
  {
    // MARKET PULSE IS A NAV ITEM (restored 2026-09-06, owner request). The page
    // shipped in both languages the whole time (app/Market-Pulse +
    // app/ar/Market-Pulse); only the menu entry was missing, so it was reachable
    // by URL alone. Pin it here so a future nav edit cannot drop it silently, and
    // pin the Arabic label too — an item added English-only would render an
    // English word in the Arabic bar (see the bilingual-parity rule).
    name: "Market Pulse is in the canonical nav, in both languages",
    file: "lib/nav.json",
    assert: (text) => {
      const item = JSON.parse(text).items.find((i) => i.key === "nav_pulse");
      return Boolean(item) && item.href === "/Market-Pulse" && item.en === "MARKET PULSE" && item.ar === "\u0646\u0628\u0636 \u0627\u0644\u0633\u0648\u0642";
    },
  },
  {
    // Both React navs must render from the canonical list, never a local copy.
    // The Market-Pulse pattern below is a LOCAL-LIST canary, not a ban on the
    // page: `href: "/Market-Pulse"` in object-literal form can only come from a
    // hand-written array, which is exactly the drift lib/nav.json replaced.
    name: "SiteNav renders from lib/nav.json",
    file: "components/SiteNav.tsx",
    assert: (text) => /import navConfig from "@\/lib\/nav\.json"/.test(text)
      && /const NAV_LINKS = navConfig\.items/.test(text)
      && !/href: "\/Market-Pulse"/.test(text),
  },
  {
    name: "PublicPageShell renders from lib/nav.json",
    file: "components/seo/PublicPageShell.tsx",
    assert: (text) => /import navConfig from '@\/lib\/nav\.json'/.test(text)
      && /navConfig\.items\.map/.test(text),
  },
  {
    // ── AUTH NAV ────────────────────────────────────────────────────────
    // The session's storage keys, account routes and four labels are defined
    // ONCE in lib/auth-nav.json. Three surfaces render them: NavAuth.tsx (both
    // React shells) and the mirrored public/assets/starta-auth-nav.js (the 13
    // static pages). Drift here is not cosmetic — it is how the site shipped an
    // auth-aware nav that no user could reach while every reachable nav was
    // hardcoded to "Create Account", including for users who had just
    // registered. These four checks make that unshippable.
    name: "static auth-nav mirror matches lib/auth-nav.json (run: node scripts/sync-auth-nav.mjs)",
    file: "public/assets/starta-auth-nav.js",
    assert: (text, ctx) => extractMirror(text) === renderMirror(ctx.authNav),
  },
  {
    name: "no page paints auth links without reading the session",
    file: "public/assets/starta-lang-boot.js",
    assert: (text) => !/paintAuthLinks/.test(text),
  },
  {
    name: "NavAuth renders from lib/auth-nav.json and the canonical session",
    file: "components/seo/NavAuth.tsx",
    assert: (text) => /import authNav from '@\/lib\/auth-nav\.json'/.test(text)
      && /readSession/.test(text)
      && /subscribeSession/.test(text),
  },
  {
    name: "both React navs mount NavAuth (never hardcoded auth links)",
    file: "components/seo/PublicPageShell.tsx",
    assert: (text) => /<NavAuth\b/.test(text) && !/href="\/register"[\s\S]{0,400}nav_register/.test(text),
  },
  {
    // News rows carry `image_url` scraped from the originating publisher.
    // Those are third-party editorial photos: off-brand, unpredictable, and not
    // ours to republish (a street-market photo once illustrated a CPI story).
    // Every news surface must resolve its image through lib/news-cover.ts.
    // The implementation moved from page.tsx to renderNewsArticle.tsx when the
    // Arabic news tree was added (both thin routes delegate to it); this gate
    // must follow the code, or it silently checks an empty wrapper.
    name: "news article renders the branded cover, never the scraped image",
    file: "app/News/[id]/renderNewsArticle.tsx",
    assert: (text) =>
      /from '@\/lib\/news-cover'/.test(text) &&
      !/src=\{article\.image_url\}/.test(text) &&
      !/images:\s*\[\{\s*url:\s*article\.image_url/.test(text) &&
      !/image:\s*\[article\.image_url\]/.test(text),
  },
  {
    // The originating publisher must never be credited on-page.
    name: "news article does not print an original-source attribution",
    file: "app/News/[id]/page.tsx",
    assert: (text) => !/المصدر الأصلي|Original source/.test(text),
  },
  {
    // One nav APPEARANCE, one stylesheet. While the look lived inside the JS
    // renderer only static pages got it, and /Calculators rendered its links as
    // 12px monospace against 13px IBM Plex everywhere else.
    name: "PublicPageShell loads the canonical nav stylesheet",
    file: "components/seo/PublicPageShell.tsx",
    assert: (text) =>
      /assets\/starta-nav\.css/.test(text) &&
      /className="starta-nav-links"/.test(text) &&
      !/flex gap-10 text-xs font-mono/.test(text),
  },
  {
    name: "SiteNav loads the canonical nav stylesheet",
    file: "components/SiteNav.tsx",
    assert: (text) =>
      /assets\/starta-nav\.css/.test(text) &&
      /className="starta-nav-links"/.test(text),
  },
  ...typographyPages.map((page) => ({
    name: `${page}.html loads the canonical typography contract`,
    file: `public/${page}.html`,
    assert: (text) => /assets\/starta-typography\.css/.test(text),
  })),
  {
    name: "static nav renderer links the canonical stylesheet (not inline CSS)",
    file: "public/assets/starta-nav.js",
    assert: (text) => /assets\/starta-nav\.css/.test(text),
  },
  {
    // ONE Arabic typeface site-wide. The static pages load IBM Plex Sans Arabic
    // while this app loaded Cairo, so the same nav — and every heading —
    // rendered in a different face depending on which renderer served the route.
    name: "React app uses the canonical Arabic font (IBM Plex Sans Arabic)",
    file: "app/layout.tsx",
    assert: (text) =>
      /IBM_Plex_Sans_Arabic\(/.test(text) &&
      /variable:\s*"--font-arabic"/.test(text) &&
      !/Cairo\(/.test(text),
  },
  {
    // ══ THE REGISTRATION STRATEGY ═══════════════════════════════════════════
    // Organic search is this site's only channel and the domain is under a year
    // old. The rule (REGISTRATION_STRATEGY.md) is that NOTHING a search engine
    // indexes may be gated — the gate goes on personal and derived value only.
    // These renderers produce the pages an organic visitor lands on, and none of
    // them may mount a gate around their body.
    name: "no registration gate on an indexed answer",
    files: [
      "lib/news-hub.ts",
      "app/News/[id]/renderNewsArticle.tsx",
      "components/seo/SymbolSeoSection.tsx",
      "lib/funds-hub-render.ts",
    ],
    assert: (text) => !/RegisterGate|FundGate|starta-gate-clip/.test(text),
  },
  {
    // ══ AN ALERT MUST BE EVALUATED AND DELIVERED ════════════════════════════
    // The alerts CRUD wrote rows into `price_alerts` that NOTHING ever read —
    // no evaluator, no delivery — for the whole life of the account system. The
    // gate in front of alerts was deliberately withheld until that was untrue.
    // If the evaluator or its schedule is removed, the gate goes back to selling
    // a promise the product cannot keep, so the build must stop.
    name: "price alerts are evaluated and delivered, not just stored",
    file: "../backend-core/app/services/alert_service.py",
    assert: (text) =>
      /async def evaluate_alerts/.test(text) &&
      /_send_email/.test(text) &&
      // Fire once: the claim is what stops a double-send.
      /is_active IS TRUE\s*\n\s*RETURNING id/.test(text) &&
      // Never on a stale quote.
      /ALERT_MAX_PRICE_AGE_HOURS/.test(text) &&
      /last_updated > NOW\(\) - /.test(text),
  },
  {
    name: "the alert evaluator is actually scheduled",
    file: "../backend-core/app/services/scheduler.py",
    assert: (text) =>
      /run_price_alerts_job/.test(text) &&
      /tier1a2_price_alerts/.test(text) &&
      /evaluate_alerts/.test(text),
  },
  {
    // ══ A GATE MUST NOT PROMISE WHAT THE PRODUCT DOES NOT DO ════════════════
    // The watchlist gate tells visitors, in both languages, that a free account
    // keeps their list "on every device you sign in from". That was FALSE when
    // it shipped: the list was written to localStorage and nowhere else, while
    // /user/watchlists and its typed wrappers in lib/api.ts sat unused. Someone
    // could register for exactly the reason the gate gave and receive nothing.
    // If the sync goes away, the gate is lying again.
    name: "the watchlist gate's promise is backed by the account",
    file: "public/assets/market-pulse.js",
    assert: (text) =>
      /startaWatchlist\.add\(/.test(text) &&
      /startaWatchlist\.remove\(/.test(text) &&
      /startaWatchlist\.sync\(/.test(text),
  },
  {
    // The first sync after signing in must be a UNION. A visitor who builds a
    // list as a guest, meets the allowance, registers because of it, and then
    // finds an empty panel has been punished for doing what we asked.
    name: "signing in merges the guest watchlist rather than replacing it",
    file: "public/assets/starta-watchlist.js",
    assert: (text) => /union/i.test(text) && /alreadyMerged/.test(text),
  },
  {
    // ══ THE INVITATION MUST STAY AN INVITATION ══════════════════════════════
    // It stands in for a meter, and it only works as a substitute while it
    // removes nothing. The moment it becomes a modal — fixed position, a scrim,
    // something you must dismiss before reading — it IS a wall, and a wall on a
    // news article is exactly the thing that costs the rankings this whole
    // strategy exists to protect. So: it must be dismissible, and it must sit in
    // the flow rather than over it.
    name: "the registration invitation is dismissible and never a modal",
    file: "public/assets/starta-gate.css",
    assert: (text) => {
      const block = (text.match(/\.starta-invite\s*\{[^}]*\}/) || [])[0] || "";
      return (
        /\.starta-invite-dismiss/.test(text) &&
        !/position:\s*fixed/.test(block) &&
        !/position:\s*absolute/.test(block)
      );
    },
  },
  {
    // Dismissal must be permanent. An invitation that returns on the next page
    // is nagging, and nagging a reader who already said no is how a growth
    // prompt turns into the reason someone leaves.
    name: "dismissing the invitation is remembered",
    file: "public/assets/starta-gate.js",
    assert: (text) =>
      /dismissInvite/.test(text) &&
      /starta-invite-off/.test(text) &&
      // …and it must count DISTINCT items over a window, not page views, or a
      // refresh would manufacture the prompt.
      /shouldInvite/.test(text) &&
      /WINDOW_MS/.test(text),
  },
  {
    // The free allowances are the strategy's actual numbers. They live in ONE
    // place; a call site that hardcodes its own limit is how the funds hub and
    // the watchlist end up disagreeing about what "free" means.
    name: "capped features ask the shared allowance, never their own number",
    files: ["public/marketplace.html", "public/assets/market-pulse.js"],
    assert: (text) => /startaGate\s*&&\s*!window\.startaGate\.allow\(/.test(text),
  },
  {
    // A gate that veils in-DOM content shows a crawler more than a person, which
    // is cloaking unless declared. Google applies this to a FREE registration
    // wall exactly as to a paid subscription; the WSJ lost about 44% of its
    // search traffic changing its model without it. This page gates its
    // analytics and emitted no declaration at all until 2026-09-06.
    name: "the fund page declares its gate to search engines",
    file: "app/Funds/[id]/renderFundPage.tsx",
    assert: (text) => /withGateDeclaration/.test(text),
  },
  {
    // The declaration names a CSS class, and the gate must actually carry it.
    // If these drift apart the markup points at nothing and the page is back to
    // undeclared cloaking — silently, because both halves still look right.
    name: "the paywall selector matches the class the gate renders",
    file: "components/gate/RegisterGate.tsx",
    assert: (text, ctx) => {
      const declared = (ctx.gateI18n.match(/GATED_CLASS\s*=\s*"([^"]+)"/) || [])[1];
      return Boolean(declared) && text.includes("GATED_CLASS") && ctx.paywall.includes("GATED_CLASS");
    },
  },
  {
    // The gate must never decide server-side. The edge cache (middleware.ts)
    // serves ONE shared HTML document per URL, so a per-visitor server render
    // would hand one visitor's view to everybody — and would take the gated
    // content out of the crawler's copy at the same time. Both renderers resolve
    // the session in the browser, and this keeps it that way.
    name: "the gate resolves the session in the browser, never on the server",
    file: "components/gate/RegisterGate.tsx",
    assert: (text) =>
      /'use client'/.test(text) &&
      /useAuth\(\)/.test(text) &&
      // isLoading must keep the SSR + hydrating render UNLOCKED, or the content
      // leaves the server HTML.
      /!isLoading\s*&&\s*!user/.test(text),
  },
  {
    // Both renderers read ONE session contract. If the static gate and the auth
    // nav disagreed about who is signed in, a signed-in visitor would meet a
    // gate on a static hub and not on a React page.
    name: "the static gate reads the canonical session keys",
    file: "public/assets/starta-gate.js",
    assert: (text, ctx) => {
      // readContract() already returns the parsed object — do not JSON.parse it.
      const keys = ctx.authNav?.storage;
      if (!keys) return false;
      // The three that resolve a session. `avatar` is presentation, not identity.
      return ["token", "refresh", "user"].every((k) => keys[k] && text.includes(`"${keys[k]}"`));
    },
  },
  {
    // ══ ONE ARABIC TYPEFACE, EVERYWHERE ═════════════════════════════════════
    // Checking only app/layout.tsx was not enough. Cairo survived in
    // app/mobile/mobile.module.css, which self-hosted it in four weights and
    // applied it with !important to every Arabic element under a comment
    // claiming Cairo was "the brand's Arabic typeface (same as the website)" —
    // false on both counts. The Arabic mobile shell therefore rendered in a
    // different face from every other surface for months. This scans the files
    // that can actually set a face, so a second Arabic typeface cannot re-enter
    // through a module nobody thought to check.
    name: "no banned typeface anywhere that can set a font",
    files: [
      "app/globals.css",
      "app/layout.tsx",
      "app/mobile/mobile.module.css",
      "public/assets/starta-typography.css",
      "public/assets/starta-nav.css",
      "public/assets/market-pulse.css",
    ],
    assert: (text) => {
      // Comments may NAME a banned face — the history above depends on it.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      return !/\b(Cairo|Tajawal|Almarai|Changa|Amiri|Noto\s+Sans\s+Arabic|Inter|Poppins|Lato|Open\s+Sans)\b/i.test(code);
    },
  },
  {
    // A banned face cannot be self-hosted back in through a font file either.
    name: "no banned typeface is self-hosted in the asset tree",
    file: "package.json",
    assert: () => {
      const dir = path.join(root, "public/assets/starta-mobile/fonts");
      if (!existsSync(dir)) return true;
      return !readdirSync(dir).some((f) => /^(Cairo|Tajawal|Almarai|Changa|Amiri|Inter|Poppins|Lato)[-_.]/i.test(f));
    },
  },
  {
    // ══ EVERY SINGLE-URL PAGE SHIPS BOTH LANGUAGES ══════════════════════════
    // The site's DEFAULT language is Arabic. /settings had no language support
    // at all — every string an English literal — so a visitor reading the site
    // in Arabic clicked into their own account and landed in English, and the
    // screen's own Language card called Arabic "Coming Soon" months after it
    // shipped site-wide. A single-URL page has no /ar twin to carry the
    // language, so it MUST read it from storage.
    name: "single-URL account pages resolve the language from storage",
    files: [
      "app/settings/page.tsx",
      "app/login/page.tsx",
      "app/register/page.tsx",
      "app/forgot-password/page.tsx",
    ],
    assert: (text) => /useStoredLang\(\)/.test(text) && /dir=\{/.test(text),
  },
  {
    // …and its copy must exist in BOTH languages. A typed dictionary is what
    // makes TypeScript refuse a half-translated screen; a Latin word inside an
    // Arabic value is the shape of a fat-finger that TypeScript cannot catch.
    name: "settings copy is complete in both languages",
    file: "lib/settings-i18n.ts",
    assert: (text) => {
      const arBlock = text.split("const ar: SettingsLabels = {")[1]?.split("\n};")[0] ?? "";
      if (!arBlock) return false;
      const allowed = new Set(["English", "Stripe"]);
      for (const [, value] of arBlock.matchAll(/:\s*"([^"]+)"/g)) {
        for (const word of value.match(/[A-Za-z]{2,}/g) ?? []) {
          if (!allowed.has(word)) return false;
        }
      }
      return true;
    },
  },
  {
    // ══ THE BRAND LOCKUP ════════════════════════════════════════════════════
    // FIVE different marks shipped at once: the landing page and public chrome
    // drew a teal tile carrying the letter S, /login drew a lucide BarChart3,
    // /register /forgot-password and /settings drew a lucide TrendingUp, and
    // /mobile drew a bespoke SVG — plus two wordmark casings and three tracking
    // values. A visitor signing in met a different brand from the page they had
    // just left. There is now ONE component and these pages must use it.
    name: "auth and account pages render the canonical brand lockup",
    files: [
      "app/login/page.tsx",
      "app/register/page.tsx",
      "app/forgot-password/page.tsx",
      "app/settings/page.tsx",
    ],
    assert: (text) => {
      if (!/StartaLogo/.test(text)) return false;
      // A lucide glyph sitting in a brand-teal tile is the exact shape of the
      // drift. Look for the two together rather than banning the icons outright
      // — TrendingUp is legitimate on a performance figure.
      const tiles = text.match(/className="[^"]*(?:bg-starta-teal|#14B8A6|#0D9488|#13b8a6)[^"]*"[\s\S]{0,260}?<\/div>/gi) || [];
      const stockGlyph = /<(BarChart3|TrendingUp|Sparkles|Zap|Activity|LineChart)\b/;
      return !tiles.some((t) => stockGlyph.test(t));
    },
  },
  {
    // The wordmark is STARTA, uppercase, tracking-widest. Mixed-case "Starta"
    // beside a mark is the drifted lockup; "Starta Markets" in prose, titles and
    // aria-labels is copy and is fine, so this only looks at the LOCKUP shape:
    // a wordmark span sitting next to a brand tile.
    name: "brand component keeps the uppercase wordmark and its tracking",
    file: "components/brand/StartaLogo.tsx",
    assert: (text) =>
      /STARTA/.test(text) &&
      /tracking-widest/.test(text) &&
      /bg-starta-teal/.test(text) &&
      !/tracking-tight/.test(text),
  },
  {
    // The tab icon, the home-screen icon and the in-page mark must be ONE mark.
    // They were three: a teal tile with a white BAR CHART (app/icon.png), a NAVY
    // tile with a teal bar chart (public/icon.svg), and the teal tile with the
    // letter S that the site actually uses. Two of them were binaries, so the
    // drift could not be seen in a diff — they are generated from code now.
    name: "app icon is generated from the brand contract, not a binary",
    file: "app/icon.tsx",
    assert: (text) => /#14B8A6/i.test(text) && />\s*S\s*</.test(text),
  },
  {
    name: "no checked-in icon binary can shadow the generated one",
    file: "package.json",
    assert: () =>
      !existsSync(path.join(root, "app/icon.png")) &&
      !existsSync(path.join(root, "app/apple-icon.png")),
  },
  {
    // #13b8a6 differs from the brand teal #14B8A6 by one digit and reads as a
    // slightly different green beside it. It spread through the settings page.
    name: "no off-brand teal in the shared brand and chrome files",
    files: [
      "components/brand/StartaLogo.tsx",
      "public/assets/starta-nav.css",
      "public/assets/starta-typography.css",
    ],
    assert: (text) => !/#13b8a6/i.test(text),
  },
  {
    // ══ THE TYPOGRAPHY CONTRACT ═════════════════════════════════════════════
    // ONE font policy for the whole system. Four disagreed before this file
    // existed (globals.css, each static page's inline <style>, market-pulse.css,
    // and per-component classes) and Arabic lost: /login, /register and
    // /forgot-password rendered EVERY Arabic string in Manrope, which has no
    // Arabic glyphs, so the text fell back to an arbitrary system face. Those
    // pages have no /ar twin, so they keep <html dir="ltr"> and flip an inner
    // wrapper to rtl — and `[dir="rtl"] *` then ties with `[dir="ltr"] *` on
    // specificity, letting source order pick the font instead of the element's
    // actual direction. The contract must keep both faces, the :dir() rule that
    // is immune to that nesting, and the Arabic fallback INSIDE the Latin stack
    // (the only thing that can rescue untagged mixed content).
    name: "canonical typography contract is intact",
    file: "public/assets/starta-typography.css",
    assert: (text) =>
      /IBM Plex Sans Arabic/.test(text) &&
      /Manrope/.test(text) &&
      /:dir\(rtl\)/.test(text) &&
      /\[lang="ar"\]/.test(text) &&
      !/Cairo/.test(text.replace(/\/\*[\s\S]*?\*\//g, "")),
  },
  {
    // The React tree must load the SAME file the static pages do, or the two
    // engines drift again — which is the entire history of this defect class.
    name: "React root layout loads the canonical typography contract",
    file: "app/layout.tsx",
    assert: (text) => /assets\/starta-typography\.css/.test(text),
  },
  {
    // A font policy anywhere else is how this broke. globals.css keeps its
    // legacy attribute rules ONLY as the pre-:dir() fallback; it must not grow
    // a new direction-scoped face, and it must never name a family directly
    // (every face goes through a --font-* token so one edit moves the site).
    name: "globals.css declares no font family outside the canonical tokens",
    file: "app/globals.css",
    assert: (text) => {
      // Scan the WHOLE stylesheet, not just `font-family:` declarations — the
      // first version of this gate did the latter and a `--font-x: Cairo` custom
      // property sailed straight through it, which is precisely how a second
      // Arabic typeface entered the app the first time. Comments are stripped so
      // the history above may name the banned faces.
      const css = text.replace(/\/\*[\s\S]*?\*\//g, "");
      const banned = /\b(Cairo|Tajawal|Almarai|Changa|Amiri|Noto\s+Sans\s+Arabic|Inter|Poppins|Lato|Open\s+Sans)\b/i;
      return !banned.test(css);
    },
  },
  {
    // Inline onclick handlers run in GLOBAL scope at click time. A render-time
    // variable concatenated into one (…'/Learn/' + topic.slug) is undefined
    // there and the click throws instead of navigating — this shipped once.
    // Interpolate the value into the string, call the helper at click time.
    name: "no render-time variable concatenated into an inline onclick",
    file: "public/home.html",
    assert: (text) =>
      !/onclick="[^"]*\)\s*\(\s*'[^']*'\s*\+\s*[A-Za-z_$][\w.$]*\s*\)/.test(text),
  },
  {
    // DESIGN_SYSTEM.md -> "Bilingual Parity": the en and ar dictionaries are a
    // matched pair. A key added to one language and forgotten in the other
    // renders the stale English markup default to Arabic users (and vice
    // versa), so any divergence fails the build.
    name: "home page en/ar translation dictionaries have identical keys",
    file: "public/home.html",
    assert: (text) => {
      const dictKeys = (label) => {
        const start = text.indexOf(`${label}: {`);
        if (start === -1) return null;
        // Walk braces from the dictionary's opening brace to its match.
        let depth = 0;
        let end = -1;
        for (let i = text.indexOf("{", start); i < text.length; i += 1) {
          if (text[i] === "{") depth += 1;
          else if (text[i] === "}") {
            depth -= 1;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end === -1) return null;
        // Strip string literals first: several keys share a line, and values
        // themselves contain colons (URLs, Arabic punctuation), so a naive
        // key regex both misses and invents entries.
        const body = text
          .slice(start, end)
          .replace(/`(?:[^`\\]|\\.)*`/g, '""')
          .replace(/"(?:[^"\\]|\\.)*"/g, '""')
          .replace(/'(?:[^'\\]|\\.)*'/g, '""');
        const keys = new Set([...body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]));
        keys.delete(label); // the slice starts at the dictionary's own label
        return keys;
      };
      const en = dictKeys("en");
      const ar = dictKeys("ar");
      if (!en || !ar || en.size < 50 || ar.size < 50) return false;
      const missingAr = [...en].filter((k) => !ar.has(k));
      const missingEn = [...ar].filter((k) => !en.has(k));
      if (missingAr.length || missingEn.length) {
        console.error(
          `       missing in ar: ${missingAr.join(", ") || "(none)"}\n` +
          `       missing in en: ${missingEn.join(", ") || "(none)"}`
        );
        return false;
      }
      return true;
    },
  },
  {
    // DESIGN_SYSTEM.md -> "One Title Per Section": the small accent-coloured
    // eyebrow above a section heading is banned site-wide. It was stripped from
    // the homepage, /Funds and /Fund on 2026-08-14; this gate keeps it gone.
    name: "no banned section eyebrow/kicker in the static Home page",
    file: "public/home.html",
    assert: (text) => !/section-tag/.test(text),
  },
  {
    name: "no banned section eyebrow/kicker in the static Funds page",
    file: "public/marketplace.html",
    assert: (text) => !/section-tag/.test(text),
  },
  {
    name: "no banned section eyebrow/kicker in the static Fund detail page",
    file: "public/fund-details.html",
    assert: (text) => !/section-tag/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in home.html",
    file: "public/home.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in marketplace.html",
    file: "public/marketplace.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in learn.html",
    file: "public/learn.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in fund-compare.html",
    file: "public/fund-compare.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in fund-details.html",
    file: "public/fund-details.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    name: "no hand-styled eyebrow above a heading in news.html",
    file: "public/news.html",
    assert: (text) => !/tracking-\[0\.2[0-9]em\][^"]*text-starta-darkTeal/.test(text),
  },
  {
    // Pins the homepage title so a legacy home.html cannot be restored over it
    // (the original reason for this check) AND so the title cannot regress to
    // something short and untargeted. "Starta | Master the EGX" was 23
    // characters matching no query anyone types, on the domain's most
    // authoritative page.
    name: "static Home page carries a substantive, targeted title",
    file: "public/home.html",
    assert: (text) => {
      const m = /<title>([\s\S]*?)<\/title>/i.exec(text);
      if (!m) return false;
      const title = m[1].replace(/&amp;/g, "&").trim();
      return (
        title.length >= 40 &&
        /Starta Markets/i.test(title) &&
        /EGX/i.test(title) &&
        /fund/i.test(title)
      );
    },
  },
  {
    name: "home page keeps latest roadmap/trust copy (prevents legacy text regression)",
    file: "public/home.html",
    assert: (text) =>
      /road_title:\s*["']What we're working on\./.test(text) &&
      /proof_title:\s*["']Built for Serious Capital\./.test(text) &&
      !/road_title:\s*["']What We're Building Next\./.test(text) &&
      !/proof_title:\s*["']Built for Professional Investors\./.test(text),
  },
  {
    name: "shared theme controller persists a valid public theme",
    file: "public/assets/starta-theme.js",
    assert: (text) =>
      /localStorage\.setItem\(STORAGE_KEY,\s*resolved\)/.test(text) &&
      /document\.documentElement\.setAttribute\("data-theme",\s*resolved\)/.test(text),
  },
  ...publicPages.map((page) => ({
    name: `${page} uses the shared persistent theme controller`,
    file: `public/${page}.html`,
    assert: (text) =>
      /<html[^>]*data-theme=["']light["']/i.test(text) &&
      /<script src=["']\/assets\/starta-theme\.js(?:\?[^"']*)?["']><\/script>/.test(text),
  })),
  ...publicPages.map((page) => ({
    name: `${page} uses the current public header navigation`,
    file: `public/${page}.html`,
    assert: hasCurrentPublicNav,
  })),
  {
    name: "fund comparison dock never restores selections after refresh or navigation",
    file: "public/marketplace.html",
    assert: (text) =>
      /localStorage\.removeItem\(COMPARE_STORAGE_KEY\)/.test(text) &&
      /window\.addEventListener\(['"]pagehide['"]/.test(text) &&
      !/getStoredCompareIds|persistCompareIds/.test(text),
  },
  {
    name: "fund comparison page accepts deliberate URL selections only",
    file: "public/fund-compare.html",
    assert: (text) =>
      /new URLSearchParams\(window\.location\.search\)\.get\(['"]ids['"]\)/.test(text) &&
      !/starta-funds-compare|COMPARE_STORAGE_KEY/.test(text),
  },
  {
    name: "Learn only serves compressed topic imagery",
    file: "public/data/learn-topics.js",
    assert: (text) => {
      const displayedImages = text.match(/(?:coverImage(?:En|Ar):\s*|src:\s*)["']\/assets\/learn\/[^"']+["']/g) || [];
      return displayedImages.length >= 30 && displayedImages.every((asset) => /\.webp["']$/.test(asset));
    },
  },
  {
    name: "Arabic Learn cards display a lesson number over image covers",
    file: "public/learn.html",
    assert: (text) =>
      /const lessonNumber = state\.lang === ['"]ar['"]/.test(text) &&
      /class=["']cover-art-number["']/.test(text),
  },

  // ── SEO release gate (master-plan guardrail 3.7) ────────────────────────
  // Every static public page must ship canonical + social tags, and none may
  // regress to the Tailwind Play CDN runtime compiler (killed in PR #139).
  ...seoPages.map((page) => ({
    name: `${page} carries canonical + OG + Twitter tags (SEO gate)`,
    file: `public/${page}.html`,
    assert: (text) =>
      /<link rel="canonical" href="https:\/\/startamarkets\.com\//.test(text) &&
      /property="og:title"/.test(text) &&
      /name="twitter:card"/.test(text),
  })),
  ...seoPages.map((page) => ({
    name: `${page} does not use the Tailwind CDN runtime compiler (SEO/CWV gate)`,
    file: `public/${page}.html`,
    assert: (text) => !text.includes("cdn.tailwindcss.com"),
  })),
  {
    name: "robots.ts exists (crawl policy is a route, deleting it kills robots.txt)",
    file: "app/robots.ts",
    assert: (text) => /sitemap/.test(text) && /Disallow|disallow/.test(text),
  },
  {
    name: "segmented sitemap route exists with all eleven segments",
    file: "app/sitemaps/[name]/route.ts",
    assert: (text) =>
      ["core", "companies", "ar-companies", "metrics", "sectors", "funds", "fund-categories", "comparisons", "stock-comparisons", "learn", "glossary", "news"].every((seg) => text.includes(seg)),
  },
  {
    // The sitemap index and the segment router must list the SAME segments. A
    // segment present in one and absent from the other is either an
    // undiscoverable sitemap or a 404 advertised in the index.
    name: "sitemap index and segment router agree on the segment list",
    file: "app/sitemap.xml/route.ts",
    assert: (text) => {
      const inIndex = [...text.matchAll(/\['([a-z-]+)',\s*(?:clamp\(|DEPLOY_TIME)/g)].map((m) => m[1]);
      const router = readFileSync(path.join(root, "app/sitemaps/[name]/route.ts"), "utf8");
      const inRouter = [...router.matchAll(/^\s{4}'?([a-z-]+)'?:\s*\w+Entries,/gm)].map((m) => m[1]);
      if (inIndex.length < 10 || inRouter.length < 10) return false;
      return inIndex.every((s) => inRouter.includes(s)) && inRouter.every((s) => inIndex.includes(s));
    },
  },
  {
    // News URLs must be built through canonicalNewsPath (which strips dateline
    // prefixes exactly as the article page does). Slugifying the RAW headline
    // put ~510 redirecting URLs into the news sitemap.
    name: "news sitemap builds URLs through canonicalNewsPath (not the raw headline)",
    file: "app/sitemaps/[name]/route.ts",
    assert: (text) => /canonicalNewsPath\(r\.id, r\.headline, r\.source_section\)/.test(text) && !/newsPath\(r\.id, r\.headline\)/.test(text),
  },
  {
    name: "news-sitemap.xml and feed.xml also use canonicalNewsPath",
    file: "app/news-sitemap.xml/route.ts",
    assert: (text) => /canonicalNewsPath\(/.test(text) && !/newsPath\(r\.id, r\.headline\)/.test(text),
  },
  {
    // /ar/Funds is a real Arabic hub, not a redirect. Reinstating the 308
    // would delete the site's only Arabic funds URL.
    name: "/ar/Funds is a server page, not a redirect to the English hub",
    file: "next.config.ts",
    assert: (text) => !/source:\s*'\/ar\/Funds'/.test(text),
  },
  {
    // THE DESIGN CONTRACT — the one that has now been broken three times
    // (#123, #130, and the plain /ar/Funds hub the owner rejected).
    //
    // /Funds and /ar/Funds are the SAME premium marketplace. Both are served
    // by a Route Handler that returns public/marketplace.html itself, with
    // content pre-rendered into its empty grid. Neither may ever be served by
    // a PublicPageShell page: that is a different, plainer design system, and
    // pointing a user-navigable funds URL at it is a product regression no
    // amount of SEO gain justifies.
    name: "/ar/Funds is served by the PREMIUM marketplace shell, not a plain page",
    file: "app/ar/Funds/route.ts",
    assert: (text) =>
      /file:\s*'marketplace\.html'/.test(text) &&
      /langSeedScript\('ar'\)/.test(text) &&
      /fundsHubRows\(funds, 'ar'\)/.test(text),
  },
  {
    name: "/Funds is served by the PREMIUM marketplace shell, not a plain page",
    file: "app/Funds/route.ts",
    assert: (text) => /file:\s*'marketplace\.html'/.test(text) && /fundsHubRows\(funds, 'en'\)/.test(text),
  },
  {
    // THE LANGUAGE CONTRACT. A single root layout serves both language trees,
    // so <html lang>/<dir> can only come from the middleware-stamped header.
    // If either half is removed, every /ar/* URL silently reverts to
    // declaring itself English — the defect that cost the Arabic SERPs.
    name: "middleware stamps the URL-derived language header",
    file: "middleware.ts",
    assert: (text) =>
      /x-starta-lang/.test(text) &&
      /isArabicPath\(/.test(text) &&
      /NextResponse\.next\(\{\s*request:\s*\{\s*headers/.test(text),
  },
  {
    name: "root layout derives <html lang>/<dir> from the language header",
    file: "app/layout.tsx",
    assert: (text) =>
      /headers\(\)/.test(text) &&
      /x-starta-lang/.test(text) &&
      /<html lang=\{lang\}/.test(text) &&
      /dir=\{lang === "ar" \? "rtl" : "ltr"\}/.test(text),
  },
  {
    // Page Cache-Control MUST live in middleware. Next.js stamps
    // force-dynamic App Router routes with `private, no-cache, no-store` at
    // render time, which overrides next.config headers() — a caching entry
    // added there silently does nothing (measured on production 2026-09-03).
    name: "page edge-caching is set in middleware (not dead next.config headers)",
    file: "middleware.ts",
    assert: (text) =>
      /export function edgeTtlFor\(/.test(text) &&
      /response\.headers\.set\('Cache-Control'/.test(text) &&
      // Private surfaces must never be publicly cached.
      /admin\|settings\|login\|register/.test(text),
  },
  {
    // Fund category slugs mint URLs in both languages. A collision would make
    // two categories claim one URL; an empty Arabic slug would mint /ar/Funds/category/.
    name: "fund category slugs are unique and non-empty across EN + AR",
    file: "content/fund-categories.ts",
    assert: (text) => {
      const keys = [...text.matchAll(/^\s{8}key: '([^']+)',/gm)].map((m) => m[1]);
      const arSources = [...text.matchAll(/^\s{8}slugSourceAr: '([^']+)',/gm)].map((m) => m[1]);
      if (keys.length < 4 || keys.length !== arSources.length) return false;
      if (new Set(keys).size !== keys.length) return false;
      if (new Set(arSources).size !== arSources.length) return false;
      return keys.every(Boolean) && arSources.every((v) => v.trim().length > 0);
    },
  },
  {
    // Category pages must stay data-gated: the sitemap and the page must apply
    // the SAME minimum, or the sitemap advertises URLs that 404.
    name: "fund category pages and their sitemap share one publish threshold",
    file: "app/sitemaps/[name]/route.ts",
    assert: (text) => /MIN_FUNDS_TO_PUBLISH/.test(text) && /categoryOfFund\(/.test(text),
  },
  {
    name: "llms.txt exists and points at the canonical host",
    file: "public/llms.txt",
    assert: (text) => text.includes("https://startamarkets.com/"),
  },

  // ── Arabic-first release gate (AR slugs + default language, 2026-07-18) ──
  // The site's default language is Arabic and /ar/* canonical URLs carry
  // Arabic slugs. These checks pin both contracts.
  {
    name: "seo.ts keeps the Arabic slug engine (arabicSlug + lang-aware fundPath)",
    file: "lib/seo.ts",
    assert: (text) =>
      /export function arabicSlug\(/.test(text) &&
      /export function fundPath\([\s\S]*?lang: SiteLang = 'en'/.test(text) &&
      /export function learnPath\(/.test(text) &&
      /export function glossaryPath\(/.test(text) &&
      /export function sectorPath\(/.test(text),
  },
  {
    name: "funds sitemap emits the Arabic twins alongside English",
    file: "app/sitemaps/[name]/route.ts",
    assert: (text) => /fundPath\(r\.fund_id, r\.fund_name_en, r\.fund_name, 'ar'\)/.test(text),
  },
  {
    name: "Arabic sector display names are collision-free (they mint /ar/sectors slugs)",
    file: "content/sector-names-ar.ts",
    assert: (text) => {
      const values = [...text.matchAll(/'[^']+':\s*'([^']+)',/g)].map((m) => m[1]);
      return values.length >= 20 && new Set(values).size === values.length;
    },
  },
  {
    name: "lang-boot asset exists and defaults to Arabic",
    file: "public/assets/starta-lang-boot.js",
    assert: (text) => /var lang = "ar"/.test(text) && /stored === "en"/.test(text),
  },
  ...seoPages.map((page) => ({
    name: `${page} loads the shared lang-boot (first-paint RTL, Arabic default)`,
    file: `public/${page}.html`,
    assert: (text) => /<script src=["']\/assets\/starta-lang-boot\.js(?:\?[^"']*)?["']><\/script>/.test(text),
  })),
  ...["home", "learn-topic", "learn", "terms", "fund-compare", "marketplace", "fund-details", "privacy"].map((page) => ({
    name: `${page} no-preference language default is Arabic`,
    file: `public/${page}.html`,
    assert: (text) =>
      text.includes("return stored === 'en' ? 'en' : 'ar';") &&
      !text.includes("return stored === 'ar' ? 'ar' : 'en';"),
  })),
  {
    name: "market-pulse asset defaults to Arabic",
    file: "public/assets/market-pulse.js",
    assert: (text) => text.includes('setLanguage(stored === "en" ? "en" : "ar", false)'),
  },
  {
    name: "news asset defaults to Arabic",
    file: "public/assets/news-public.js",
    assert: (text) => text.includes('setLanguage(stored === "en" ? "en" : "ar", { refresh: false })'),
  },
  ...["portfolio-detail", "portfolio-list", "portfolio-showcase"].map((asset) => ({
    name: `${asset} asset defaults to Arabic`,
    file: `public/assets/${asset}.js`,
    assert: (text) => !/localStorage\.getItem\('lang'\) \|\| 'en'/.test(text),
  })),
];

/**
 * THE DESIGNED-SHELL FAMILIES. Each of these URL trees is owned by a
 * hand-designed page in public/, and every user-navigable route inside it must
 * render THAT design. A plain PublicPageShell page anywhere in one of these
 * trees is the exact regression the owner has rejected three times: SEO work
 * quietly introduces a second, flatter design system at a URL people actually
 * click. Detail pages (/Funds/{id}) are excluded — they have their own premium
 * template and are not the marketplace.
 */
const DESIGNED_SHELL_HUBS = [
  { route: "app/Funds/route.ts", shell: "marketplace.html", url: "/Funds" },
  { route: "app/ar/Funds/route.ts", shell: "marketplace.html", url: "/ar/Funds" },
  // These two delegate to a shared renderer; `via` is where the shell and the
  // language are actually set. The check follows the delegation rather than
  // being relaxed — a route that stops serving the designed shell must still
  // fail, wherever that call now lives.
  { route: "app/News/route.ts", via: "lib/news-hub.ts", shell: "news.html", url: "/News" },
  { route: "app/ar/News/route.ts", via: "lib/news-hub.ts", shell: "news.html", url: "/ar/News" },
  { route: "app/Learn/route.ts", shell: "learn.html", url: "/Learn" },
  { route: "app/ar/Learn/route.ts", shell: "learn.html", url: "/ar/Learn" },
  { route: "app/Funds/Compare/route.ts", via: "lib/compare-hub.ts", shell: "fund-compare.html", url: "/Funds/Compare" },
  { route: "app/ar/Funds/Compare/route.ts", via: "lib/compare-hub.ts", shell: "fund-compare.html", url: "/ar/Funds/Compare" },
  { route: "app/Market-Pulse/route.ts", shell: "market-pulse.html", url: "/Market-Pulse" },
  { route: "app/ar/Market-Pulse/route.ts", via: "app/Market-Pulse/route.ts", shell: "market-pulse.html", url: "/ar/Market-Pulse" },
];

/**
 * PREMIUM-COMPONENT PARITY. Some content types have ONE premium implementation
 * and an SEO layer that sits beneath it. Both language trees must mount the
 * premium component — an Arabic URL that renders only the SEO layer gives the
 * site's DEFAULT audience a downgraded product, which is what happened to
 * /ar/symbol/{SYMBOL} for months.
 */
const PREMIUM_PARITY = [
  {
    en: "app/symbol/[id]/page.tsx",
    ar: "app/ar/symbol/[id]/page.tsx",
    component: "SymbolPageClient",
    url: "/ar/symbol/{SYMBOL}",
  },
];

/**
 * ARABIC HUB PARITY — the gate that WOULD have caught /ar/Learn.
 *
 * DESIGNED_SHELL_HUBS is hand-maintained, so /ar/Learn was not merely failing
 * its checks: it was absent from the list entirely and therefore unfailable,
 * while next.config.ts quietly 308'd it to the English hub. That is the same
 * defect that cost the Arabic funds rankings, and the list-based gate could
 * not see it because the missing thing was the list entry itself.
 *
 * This check is DERIVED instead of listed. For every English designed hub it
 * asserts an Arabic twin route exists, and that no redirect sends /ar/X to /X.
 * Forgetting to add a new hub to a list can no longer hide a missing Arabic
 * tree — on a site whose default language is Arabic.
 */
async function assertArabicHubParity() {
  let failed = false;
  const enHubs = DESIGNED_SHELL_HUBS.filter((h) => !h.url.startsWith("/ar/"));

  for (const hub of enHubs) {
    const arUrl = `/ar${hub.url}`;
    const twin = DESIGNED_SHELL_HUBS.find((h) => h.url === arUrl);
    if (!twin) {
      console.error(
        `FAIL: ${hub.url} is a designed hub with no Arabic twin registered (${arUrl}). On an Arabic-default site every hub needs an Arabic URL of its own — see /ar/Funds and /ar/Learn.`
      );
      failed = true;
      continue;
    }
    if (!existsSync(path.join(root, twin.route))) {
      console.error(`FAIL: ${twin.route} is missing — ${arUrl} would fall back to a redirect or a 404.`);
      failed = true;
    }
  }

  // No Arabic hub may redirect to its English twin. Reading next.config.ts as
  // text keeps this honest without importing the config.
  let cfg = "";
  try {
    cfg = readFileSync(path.join(root, "next.config.ts"), "utf8");
  } catch {
    console.error("FAIL: next.config.ts unreadable — cannot verify Arabic hubs are not redirected away.");
    return true;
  }
  for (const hub of enHubs) {
    const arUrl = `/ar${hub.url}`;
    // `source: '/ar/Learn'` followed within the same object literal by
    // `destination: '/Learn'`.
    const re = new RegExp(
      `source:\\s*['"]${arUrl.replace(/[/\-]/g, "\\$&")}['"][\\s\\S]{0,200}?destination:\\s*['"]${hub.url.replace(/[/\-]/g, "\\$&")}['"]`
    );
    if (re.test(cfg)) {
      console.error(
        `FAIL: next.config.ts redirects ${arUrl} -> ${hub.url}. That leaves the Arabic tree with no hub URL and makes ${arUrl} answer <html lang="en">. Serve the designed shell in Arabic instead.`
      );
      failed = true;
    }
  }
  if (!failed) console.log("OK: every designed hub has an Arabic twin, and none is redirected to its English URL.");
  return failed;
}

async function assertPremiumParity() {
  let failed = false;
  for (const pair of PREMIUM_PARITY) {
    for (const [label, file] of [["EN", pair.en], ["AR", pair.ar]]) {
      let text = "";
      try {
        text = readFileSync(path.join(root, file), "utf8");
      } catch {
        console.error(`FAIL: ${file} is missing — ${pair.url} parity cannot be checked.`);
        failed = true;
        continue;
      }
      if (!new RegExp(`<${pair.component}\\s*/>`).test(text)) {
        console.error(
          `FAIL: ${file} (${label}) does not mount <${pair.component} /> — ${pair.url} would serve the SEO layer only, not the premium page.`
        );
        failed = true;
      }
    }
  }
  if (failed) process.exit(1);
  console.log("OK: premium components mount in BOTH language trees.");
}

async function assertDesignedShellsIntact() {
  let failed = false;
  for (const hub of DESIGNED_SHELL_HUBS) {
    // A page.tsx at the same segment would both conflict with the route and
    // signal someone re-introducing a plain page for a designed URL.
    const pagePath = path.join(root, hub.route.replace(/route\.ts$/, "page.tsx"));
    try {
      await access(pagePath, constants.F_OK);
      console.error(`FAIL: ${hub.url} has a page.tsx alongside its route.ts — the designed shell (${hub.shell}) must own this URL.`);
      failed = true;
    } catch {
      // expected: no page.tsx
    }
    // TWO scopes, deliberately. `routeText` is the route file ALONE — the
    // Arabic check must run against it, because a shared renderer legitimately
    // contains the literal 'ar' everywhere and would make that check pass for
    // any route. `text` additionally includes the delegated module, where the
    // shell and the language option actually live.
    let routeText = "";
    try {
      routeText = readFileSync(path.join(root, hub.route), "utf8");
    } catch {
      console.error(`FAIL: ${hub.url} has no ${hub.route} — the designed shell would not be served.`);
      failed = true;
      continue;
    }
    let text = routeText;
    if (hub.via) {
      try {
        text += "\n" + readFileSync(path.join(root, hub.via), "utf8");
      } catch {
        console.error(`FAIL: ${hub.route} delegates to ${hub.via}, which is missing.`);
        failed = true;
        continue;
      }
    }
    if (!text.includes(`'${hub.shell}'`)) {
      console.error(`FAIL: ${hub.route} does not serve ${hub.shell}.`);
      failed = true;
    }
    // The designed shells hardcode <html lang="en" dir="ltr">. The App Router
    // language fix never reaches them, so every route that serves one must
    // rewrite it explicitly — otherwise an Arabic URL ships a document that
    // declares itself English, the exact defect that cost the Arabic SERPs.
    // Accepts a literal, a forwarded variable, or a spec field — what matters
    // is that `lang` reaches renderStaticHub, not how it is spelled.
    if (!/^\s*lang(?::\s*(?:'(?:en|ar)'|lang|spec\.lang))?\s*,/m.test(text)) {
      console.error(`FAIL: ${hub.route} does not set \`lang\` on renderStaticHub — ${hub.url} would ship the shell's hardcoded <html lang="en">.`);
      failed = true;
    }
    // An Arabic route must pass 'ar' — either as the renderStaticHub option or
    // as the argument it forwards to a shared renderer.
    // An Arabic route must pass 'ar' — as the renderStaticHub option, or as an
    // argument to the shared renderer in any position.
    if (hub.url.startsWith("/ar") && !/(^\s*lang:\s*'ar'\s*,|\B'ar'\s*[,)])/m.test(routeText)) {
      console.error(`FAIL: ${hub.route} serves an ARABIC URL but does not set lang: 'ar'.`);
      failed = true;
    }
    // An IMPORT, not a mention: these files legitimately name PublicPageShell
    // in their comments to explain why they must not use it.
    if (/^\s*import[^;]*PublicPageShell/m.test(text)) {
      console.error(`FAIL: ${hub.route} imports PublicPageShell — that is the PLAIN design system, not ${hub.shell}.`);
      failed = true;
    }
  }
  // MARKET PURITY. market_tickers holds a legacy Saudi (Tadawul) universe
  // alongside the Egyptian one — identifiable because Saudi rows carry
  // market_code IS NULL while every EGX row carries market_code='EGX'.
  // Unfiltered, 827 Saudi companies were published and sitemapped as Egyptian
  // Exchange listings (ar-companies.xml was 57% Saudi). Every PUBLIC query
  // against that table must carry the EGX_ONLY gate.
  // Every API route is a publication surface too: /api/v1/tickers served 273
  // Saudi rows and 284 non-publishable symbols, /screener 18, /sectors counted
  // Saudi companies, and the AI chat's tools read the raw table (2026-09-06).
  // So the scan is the WHOLE app/api tree plus the AI service, not a fixed list.
  const marketPurityFiles = ["lib/public-data.ts", "app/sitemaps/[name]/route.ts", "lib/ai-service.ts"];
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(path.join(root, dir), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.isFile() && /\.(ts|tsx|mjs|js)$/.test(e.name) && !marketPurityFiles.includes(rel)) {
        let t = "";
        try { t = readFileSync(path.join(root, rel), "utf8"); } catch { continue; }
        if (/FROM market_tickers/.test(t)) marketPurityFiles.push(rel);
      }
    }
  };
  walk("app/api");
  for (const file of marketPurityFiles) {
    let text = "";
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      console.error(`FAIL: ${file} is missing.`);
      failed = true;
      continue;
    }
    // Resolve one level of same-file interpolation before judging a query. The
    // gate is textual, so a route that builds `WHERE … ${EGX_ONLY}` into a
    // `whereClause` variable and interpolates THAT reads as ungated when it is
    // perfectly gated — app/api/v1/egx/stocks/route.ts does exactly this.
    const locals = new Map();
    for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*(?::[^=]+)?=\s*`([^`]*)`/g)) {
      locals.set(m[1], m[2]);
    }
    for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*(?::[^=]+)?=\s*(['"])((?:[^\\]|\\.)*?)\2/g)) {
      if (!locals.has(m[1])) locals.set(m[1], m[3]);
    }
    const expand = (q) =>
      q.replace(/\$\{(\w+)\}/g, (whole, name) => (locals.has(name) ? locals.get(name) : whole));
    // Keep BOTH forms: the gate check needs the expanded query, while the
    // documented exceptions are written against the literal `${EGX_ANY}` token
    // and stop matching once it has been substituted.
    const queries = [...text.matchAll(/`([^`]*FROM market_tickers[^`]*)`/g)].map((m) => ({
      raw: m[1],
      // Two passes: a whereClause is itself often assembled from another local.
      resolved: expand(expand(m[1])),
    }));
    // EGX_ANY (market filter only, no listing gate) is permitted ONLY on the
    // single-symbol identity lookup that renders a non-listed symbol's status
    // page (getTickerAny). Any LIST or aggregate must carry EGX_ONLY.
    // A literal lookup of the EGX30 INDEX line (status `index`, never a company)
    // is the other permitted exception — an index value is not a listing claim.
    const ungated = queries.filter(
      ({ raw, resolved }) =>
        !resolved.includes("EGX_ONLY") &&
        !(raw.includes("EGX_ANY") && /WHERE symbol = \$1 AND \$\{EGX_ANY\}/.test(raw)) &&
        !/WHERE symbol = 'EGX30'/.test(raw)
    );
    if (ungated.length > 0) {
      console.error(
        `FAIL: ${file} has ${ungated.length} market_tickers quer${ungated.length === 1 ? "y" : "ies"} without the EGX_ONLY gate — Saudi rows would publish as EGX companies.`
      );
      for (const q of ungated.slice(0, 2)) {
        console.error(`       ${q.replace(/\s+/g, " ").trim().slice(0, 110)}`);
      }
      failed = true;
    }
  }

  // LISTING AUTHORITY. EGX_ONLY is not a market filter any more: it is the
  // security master's publish allow-list (EGX's own registers, keyed by ISIN).
  // A revert to `market_code = 'EGX'` would republish delisted securities
  // (GTHE), ISIN-alias duplicates and rights lines as EGX companies.
  {
    const pd = readFileSync(path.join(root, "lib/public-data.ts"), "utf8");
    if (!/export const EGX_ONLY = EGX_PUBLISHABLE_SQL;/.test(pd)) {
      console.error("FAIL: lib/public-data.ts EGX_ONLY must be EGX_PUBLISHABLE_SQL (lib/security-master.ts) — the listing gate was weakened.");
      failed = true;
    }
    if (!/import \{[^}]*EGX_PUBLISHABLE_SQL[^}]*\} from '\.\/security-master'/.test(pd)) {
      console.error("FAIL: lib/public-data.ts no longer imports the security master.");
      failed = true;
    }
  }

  // ANCHOR INTEGRITY. The shell-serving routes edit the designed files by
  // matching literal strings (a <title>, a canonical, a data-key). If a
  // designer reformats the shell, those anchors stop matching and the route
  // ships the WRONG heading or the WRONG canonical with no error — that is
  // exactly how the category pages went out with the generic "Mutual Funds"
  // heading. Assert every anchor still exists in the file it targets.
  const SHELL_ANCHORS = [
    ["public/marketplace.html", '<title>Funds Marketplace | Starta Markets</title>'],
    ["public/marketplace.html", '<link rel="canonical" href="https://startamarkets.com/Funds">'],
    // lib/fund-hub.ts REMOVES these three on every category/provider hub so
    // each page declares exactly ONE hreflang cluster. If the shell's lines
    // change, the removal silently no-ops and 82 hubs regress to two clusters.
    ["public/marketplace.html", '<link rel="alternate" hreflang="en" href="https://startamarkets.com/Funds">'],
    ["public/marketplace.html", '<link rel="alternate" hreflang="ar" href="https://startamarkets.com/ar/Funds">'],
    ["public/marketplace.html", '<link rel="alternate" hreflang="x-default" href="https://startamarkets.com/ar/Funds">'],
    ["public/marketplace.html", '<meta property="og:url" content="https://startamarkets.com/Funds">'],
    ["public/marketplace.html", '<meta property="og:title" content="Funds Marketplace | Starta Markets">'],
    ["public/marketplace.html", '<meta property="og:locale" content="en_US">'],
    ["public/marketplace.html", 'data-key="marketplace_title"'],
    ["public/marketplace.html", 'data-key="marketplace_subline"'],
    ["public/marketplace.html", 'id="fundsGrid"'],
    ["public/news.html", 'id="newsGrid"'],
    ["public/news.html", 'id="featuredStory"'],
    ["public/learn.html", 'id="topicsGrid"'],
    ["public/market-pulse.html", 'id="indexValue"'],
    ["public/market-pulse.html", 'id="overviewIndex"'],
    // lib/compare-hub.ts edits each of these literally. The empty-state class
    // string matters most: the route strips `hidden` from it so the served HTML
    // matches the state every first-time visitor sees, and a reformat here
    // would silently ship a comparison hub with no visible content again.
    ["public/fund-compare.html", '<title>Fund Comparison | Starta Markets</title>'],
    ["public/fund-compare.html", '<link rel="canonical" href="https://startamarkets.com/Funds/Compare">'],
    ["public/fund-compare.html", '<section id="emptyState" class="hidden mt-8'],
    ["public/fund-compare.html", 'data-key="empty_cta">Go back to Funds</a>'],
    ["public/fund-compare.html", '<a href="/Funds" class="btn-primary'],
    ["public/fund-compare.html", 'data-key="hero_title"'],
    // app/Market-Pulse/route.ts injects the page's real <h1> before this div,
    // and the CSS rule below is what makes the ticker heading's h1->h2 swap
    // pixel-identical. Losing either silently returns the page to having a
    // live ticker as its only <h1>.
    ["public/market-pulse.html", '<div class="grid-backdrop"></div>'],
    ["public/market-pulse.html", '<h2 id="selectedSymbol" class="display">'],
    ["public/assets/market-pulse.css", '.ticker-row h1, .ticker-row h2'],
    ["public/assets/market-pulse.css", '.mp-a11y-title'],
  ];
  for (const [file, anchor] of SHELL_ANCHORS) {
    let text = "";
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      console.error(`FAIL: ${file} is missing — its Route Handler cannot serve it.`);
      failed = true;
      continue;
    }
    if (!text.includes(anchor)) {
      console.error(`FAIL: ${file} no longer contains the anchor \`${anchor}\` that its Route Handler edits — the route would ship unlocalized/incorrect output silently.`);
      failed = true;
    }
  }

  // The rewrites these routes replaced must stay gone, or they would shadow
  // the routes and silently revert the server rendering.
  const cfg = readFileSync(path.join(root, "next.config.ts"), "utf8");
  for (const shell of ["marketplace.html", "news.html", "learn.html", "market-pulse.html"]) {
    const re = new RegExp(`destination:\\s*'/${shell.replace(/\./g, "\\.")}'`);
    if (re.test(cfg)) {
      console.error(`FAIL: next.config.ts still rewrites to /${shell} — that shadows the Route Handler.`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("OK: designed shells own their URLs (no plain-page regression).");
}

async function run() {
  await assertDesignedShellsIntact();
  if (await assertArabicHubParity()) process.exitCode = 1;
  await assertPremiumParity();

  // /home must be served by rewrite to /home.html, not by a competing app route.
  try {
    await access(path.join(root, "app/home/page.tsx"), constants.F_OK);
    console.error("FAIL: app/home/page.tsx should not exist when /home is rewrite-mapped.");
    process.exit(1);
  } catch {
    // Expected missing file
  }

  // The legacy "Pro Terminal" AppSidebar shell is permanently removed
  // (2026-08-06, owner decision). Production never rendered it; on localhost
  // it leaked onto any route missing from ShellWrapper's old isolation lists.
  // It must never come back — neither the component nor a mount of it.
  try {
    await access(path.join(root, "components/AppSidebar.tsx"), constants.F_OK);
    console.error("FAIL: components/AppSidebar.tsx must not exist — the legacy Pro Terminal sidebar was permanently removed.");
    process.exit(1);
  } catch {
    // Expected missing file
  }
  {
    const shellWrapper = await readFile(path.join(root, "components/ShellWrapper.tsx"), "utf8");
    if (/AppSidebar/.test(shellWrapper.replace(/^\s*\/\/.*$/gm, ""))) {
      console.error("FAIL: ShellWrapper must not import or render AppSidebar — the legacy Pro Terminal sidebar was permanently removed.");
      process.exit(1);
    }
  }

  // Canonical nav config, passed to checks that compare a surface against it.
  const navConfig = await readFile(path.join(root, "lib/nav.json"), "utf8");
  const authNav = await readContract();
  // The registration-gate contract, read once for the checks that compare the
  // declared paywall selector against the class the gate actually renders.
  const gateI18n = await readFile(path.join(root, "lib/gate-i18n.ts"), "utf8");
  const paywall = await readFile(path.join(root, "lib/paywall-jsonld.ts"), "utf8");

  for (const check of checks) {
    // A check may name one `file` or a list of `files` that must ALL satisfy the
    // same assertion — several contracts (the brand lockup, the off-brand teal)
    // apply identically to a handful of surfaces, and spelling them out as
    // separate entries invites one being forgotten when a page is added.
    const targets = check.files ?? [check.file];
    for (const target of targets) {
      const text = await readFile(path.join(root, target), "utf8");
      if (!check.assert(text, { navConfig, authNav, gateI18n, paywall })) {
        console.error(`FAIL: ${check.name} (${target})`);
        process.exit(1);
      }
    }
  }

  // Arabic twin routes must match what app/ar/** actually contains. The list
  // was hand-maintained in three places and listed 2 routes while 15 existed,
  // so every link to /Learn/{slug}, /Funds/{id}, /companies, /sectors,
  // /markets/* and /symbol/{id} flipped an Arabic reader to English.
  {
    const derived = await deriveArRoutes();
    const checkedFile = JSON.parse(await readFile(path.join(root, "lib/ar-twin-routes.json"), "utf8"));
    if (JSON.stringify(derived.routes) !== JSON.stringify(checkedFile.routes) ||
        JSON.stringify(derived.patterns) !== JSON.stringify(checkedFile.patterns ?? [])) {
      console.error(
        "FAIL: lib/ar-twin-routes.json is stale.\n" +
        `       on disk: ${derived.patterns.length} patterns\n` +
        `       checked in: ${(checkedFile.patterns ?? []).length} patterns\n` +
        "       Run: node scripts/sync-ar-routes.mjs"
      );
      process.exit(1);
    }
    const boot = await readFile(path.join(root, "public/assets/starta-lang-boot.js"), "utf8");
    if (!derived.patterns.every((r) => boot.includes(JSON.stringify(r)))) {
      console.error("FAIL: starta-lang-boot.js twin-pattern mirror is stale. Run: node scripts/sync-ar-routes.mjs");
      process.exit(1);
    }

    // ── THE /ar LINK HELPERS MUST MATCH EXACT PATTERNS, NEVER PARENT PREFIXES ──
    // Prefix matching asserts that an Arabic twin of a parent covers every
    // child. It does not: app/ar/News/route.ts exists while app/ar/News/[id]
    // does not, so `startaLocalizedHref` rewrote every article link to
    // /ar/News/{id} — a 404 on all 4,584 articles, and the same on
    // /ar/symbol/{id}/{metric}. Both copies of the helper (the static boot
    // script and PublicPageShell's inline script) must test the derived
    // patterns.
    const shell = await readFile(path.join(root, "components/seo/PublicPageShell.tsx"), "utf8");
    // lib/localized-href.ts WAS MISSING FROM THIS LIST until 2026-09-06, and it
    // is the copy every React nav, breadcrumb and footer actually calls. The
    // gate passed for a year while that copy still prefix-matched the flattened
    // route list — the abandoned algorithm — and minted /ar/News/{id} for
    // English-only articles (308 back to English: the language-flip report) and
    // /ar/markets (404). A gate that does not examine the file that does the
    // work is not a gate.
    const reactLocalizer = await readFile(path.join(root, "lib/localized-href.ts"), "utf8");
    for (const [label, text] of [["starta-lang-boot.js", boot], ["PublicPageShell.tsx", shell], ["lib/localized-href.ts", reactLocalizer]]) {
      if (!/AR_TWIN_PATTERNS|arTwinRoutes\.patterns/.test(text)) {
        console.error(`FAIL: ${label} does not use the derived /ar patterns — parent-prefix matching invents URLs that 404.`);
        process.exit(1);
      }
      if (/indexOf\(\s*(?:r|route)\s*\+\s*"\/"\s*\)\s*===?\s*0/.test(text)) {
        console.error(`FAIL: ${label} still prefix-matches /ar twin routes (route + "/") — that is the 404 bug.`);
        process.exit(1);
      }
    }

    // Every generated pattern must correspond to a real app/ar route file, and
    // no EN path may be rewritten unless its own Arabic twin exists.
  // HOME IS ONE URL (lib/lang.ts R1). Twenty render files each hand-wrote
  // `{ href: isAr ? '/ar' : '/', … }` for the first breadcrumb, which is why
  // the Arabic breadcrumb still opened the Arabic hub after the nav item was
  // fixed. One definition (HOME_PATH) or it drifts again.
  //
  // This scan REPORTS THE FILE COUNT it examined: a repo-wide check that
  // silently walks zero files passes just as loudly as one that walks a
  // thousand, and this repo has shipped exactly that failure before.
  {
    const HOME_TERNARY = /(isAr|arabic|lang === 'ar'|lang === "ar")\s*\?\s*['"]\/ar['"]\s*:\s*['"]\/['"]/;
    const offenders = [];
    let scanned = 0;
    async function scanDir(dir) {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".next") continue;
          await scanDir(full);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          const rel = path.relative(root, full);
          if (rel === path.join("lib", "lang.ts")) continue; // the definition itself documents the banned form
          scanned++;
          const text = await readFile(full, "utf8");
          if (HOME_TERNARY.test(text)) offenders.push(rel);
        }
      }
    }
    for (const dir of ["app", "components", "lib"]) await scanDir(path.join(root, dir));
    if (scanned < 200) {
      console.error(`FAIL: the home-href scan examined only ${scanned} files — it is not reaching the source tree.`);
      process.exit(1);
    }
    if (offenders.length) {
      console.error(
        `FAIL: ${offenders.length} file(s) hand-roll the home href instead of importing HOME_PATH from lib/lang.ts:\n` +
        offenders.map((f) => `       ${f}`).join("\n")
      );
      process.exit(1);
    }
    console.log(`OK: home is one URL — ${scanned} source files carry no hand-rolled /ar home href.`);
  }

    const mustStayEnglish = ["/News/838616-x", "/symbol/COMI/pe-ratio", "/symbol/COMI/revenue"];
    const compiled = derived.patterns.map((s) => new RegExp(s));
    for (const p of mustStayEnglish) {
      if (compiled.some((re) => re.test(p))) {
        console.error(`FAIL: ${p} would be rewritten to /ar${p}, which has no Arabic route (404).`);
        process.exit(1);
      }
    }
    console.log(`OK: /ar link helpers match ${derived.patterns.length} exact route patterns (no parent-prefix 404s).`);
  }

  // The homepage academy cards carry their own copy of the Learn topic list.
  // It drifted: 'diversification-explained' had been renamed to
  // 'diversification-made-simple', so one of six cards linked to a 404 in BOTH
  // languages. Every slug the homepage links to must exist in the canonical
  // topic list (content/learn-topics.generated.ts).
  {
    const canonical = new Set(
      [...(await readFile(path.join(root, "content/learn-topics.generated.ts"), "utf8"))
        .matchAll(/"slug"\s*:\s*"([^"]+)"/g)].map((m) => m[1])
    );
    if (canonical.size === 0) {
      console.error("FAIL: could not read canonical Learn topic slugs.");
      process.exit(1);
    }
    const home = await readFile(path.join(root, "public/home.html"), "utf8");
    const used = [...home.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    const missing = [...new Set(used)].filter((slug) => !canonical.has(slug));
    if (missing.length) {
      console.error(
        `FAIL: home.html links to Learn topics that do not exist: ${missing.join(", ")}\n` +
        `       canonical slugs: ${[...canonical].join(", ")}`
      );
      process.exit(1);
    }
  }

  // LANGUAGE INTEGRITY, part 1: an Arabic page must not link to an English
  // route. The only exception is the deliberate "view in English" affordance,
  // which carries hrefLang="en".
  {
    const arFiles = [];
    const collect = async (dir) => {
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await collect(full);
        else if (e.name.endsWith(".tsx")) arFiles.push(full);
      }
    };
    await collect(path.join(root, "app/ar"));
    const ROUTES = "(?:Learn|Funds|Calculators|RiskAssessment|companies|sectors|markets|symbol)";
    const offenders = [];
    for (const file of arFiles) {
      const text = await readFile(file, "utf8");
      text.split("\n").forEach((line, i) => {
        if (line.includes('hrefLang="en"')) return;
        const m = line.match(new RegExp(`href="(/${ROUTES}[^"]*)"`));
        if (m) offenders.push(`${path.relative(root, file)}:${i + 1} -> ${m[1]}`);
      });
    }
    if (offenders.length) {
      console.error(
        "FAIL: Arabic pages link to English routes (add the /ar prefix, or " +
        'hrefLang="en" if the English link is intentional):\n' +
        offenders.map((o) => `       ${o}`).join("\n")
      );
      process.exit(1);
    }
  }

  // LANGUAGE INTEGRITY, part 2: the bilingual nav renderers must localize every
  // href. Rendering the canonical list with a raw item.href made every nav link
  // on /ar/Calculators point at the English route.
  {
    const checks = [
      ["components/seo/PublicPageShell.tsx", /href=\{localizedHref\(item\.href, lang\)\}/],
      ["components/SiteNav.tsx", /href=\{localizedHref\(link\.href, lang\)\}/],
    ];
    for (const [file, re] of checks) {
      const text = await readFile(path.join(root, file), "utf8");
      if (!re.test(text)) {
        console.error(`FAIL: ${file} renders nav links without localizedHref().`);
        process.exit(1);
      }
    }
  }

  // Learn images must declare their REAL pixel size. The markup used to hardcode
  // 1200x675 for every image while seven distinct sizes exist, so most covers
  // were upscaled (they looked low-resolution) and the wrong aspect box invited
  // object-fit: cover to crop editorial artwork.
  {
    const refs = await referencedImages();
    const checkedIn = JSON.parse(await readFile(path.join(root, "lib/learn-image-sizes.json"), "utf8"));
    const missing = refs.filter((r) => !checkedIn[r]);
    if (missing.length) {
      console.error(
        `FAIL: Learn images with no measured size: ${missing.join(", ")}\n` +
        "       Run: node scripts/sync-learn-image-sizes.mjs"
      );
      process.exit(1);
    }
    const fresh = await buildManifest();
    const drifted = Object.keys(fresh).filter(
      (k) => !checkedIn[k] || checkedIn[k].w !== fresh[k].w || checkedIn[k].h !== fresh[k].h
    );
    if (drifted.length) {
      console.error(
        `FAIL: lib/learn-image-sizes.json is stale for: ${drifted.join(", ")}\n` +
        "       Run: node scripts/sync-learn-image-sizes.mjs"
      );
      process.exit(1);
    }
    // The article must never hardcode dimensions again.
    const article = await readFile(path.join(root, "components/seo/LearnTopicArticle.tsx"), "utf8");
    if (/width=\{1200\}/.test(article) || /object-cover/.test(article)) {
      console.error(
        "FAIL: LearnTopicArticle hardcodes image dimensions or crops artwork.\n" +
        "       Use lib/learn-image-sizes.json; editorial images are never cropped."
      );
      process.exit(1);
    }
  }

  // Manager logos are third-party marks fetched from each company's own site.
  // A missing file would render a broken image on the homepage, and a small
  // raster looks soft at the 52px mark (Naeem, 79px, was rejected for this).
  {
    const { logos, problems } = await validateManagerLogos();
    if (problems.length) {
      console.error(
        `FAIL: manager logos (min raster width ${MIN_RASTER_WIDTH}px):\n` +
        problems.map((p) => `       · ${p}`).join("\n") +
        "\n       Run: node scripts/sync-manager-logos.mjs"
      );
      process.exit(1);
    }
    const mirror = await readFile(path.join(root, "public/assets/manager-logos.js"), "utf8");
    const stale = Object.values(logos).filter((l) => !mirror.includes(l.file));
    if (stale.length) {
      console.error("FAIL: public/assets/manager-logos.js is stale. Run: node scripts/sync-manager-logos.mjs");
      process.exit(1);
    }
  }

  // Shared-asset cache keys must be content hashes. A hand-written ?v= gets
  // forgotten when the file changes, and every returning visitor keeps running
  // the stale script — a fixed nav rendering broken because the browser never
  // fetched the fix.
  {
    const hashes = await assetHashes();
    const pages = (await readdir(path.join(root, "public"))).filter((f) => f.endsWith(".html"));
    for (const page of pages) {
      const text = await readFile(path.join(root, "public", page), "utf8");
      for (const [name, hash] of Object.entries(hashes)) {
        const escaped = name.replace(/\./g, "\\.");
        const used = [...text.matchAll(new RegExp(`/assets/${escaped}\\?v=([^"']*)`, "g"))].map((m) => m[1]);
        if (used.length && used.some((v) => v !== hash)) {
          console.error(
            `FAIL: ${page} loads ${name} with a stale cache key (expected ${hash}). ` +
            "Run: node scripts/sync-asset-versions.mjs"
          );
          process.exit(1);
        }
      }
    }
  }

  // Keep the duplicate repo-level index.html in sync with public/home.html to
  // avoid editing one copy while production serves the other.
  const repoIndex = path.resolve(root, "..", "index.html");
  try {
    await access(repoIndex, constants.F_OK);
    const [homeHtml, indexHtml] = await Promise.all([
      readFile(path.join(root, "public/home.html"), "utf8"),
      readFile(repoIndex, "utf8"),
    ]);
    if (homeHtml !== indexHtml) {
      console.error("FAIL: index.html is out of sync with frontend/public/home.html.");
      process.exit(1);
    }
  } catch {
    // index.html is optional outside local monorepo usage
  }


  // ── SIGNED FIGURES MUST BE BIDI-ISOLATED ON BILINGUAL SURFACES ──────────
  // A string like "-2.55%" is a neutral sign + European digits. Inside an RTL
  // paragraph the bidi algorithm moves the sign to the VISUAL RIGHT, so Arabic
  // readers saw "2.55%-" — on /ar/Funds/prices-today every return rendered with
  // its sign on the wrong end. The dedicated app/ar/** pages guard with
  // dir="ltr"; the SHARED bilingual renderers had no guard at all, which is how
  // the defect survived. Any of these files that formats a signed percentage
  // must route it through ltrNum().
  {
    const bilingualNumericRenderers = [
      "app/Funds/prices-today/renderPricesToday.tsx",
      "app/Funds/vs/renderFundVs.tsx",
      "app/Funds/[id]/fund-format.ts",
      "app/Funds/fees/renderFundFees.tsx",
      "app/markets/renderMarketScreen.tsx",
      "app/symbol/[id]/seasonality/renderSeasonality.tsx",
      "lib/funds-hub-render.ts",
      // League tables + the helper every one of them formats through.
      "lib/fund-stats.ts",
      "app/Funds/providers/renderProvidersIndex.tsx",
      "app/Funds/categories/renderCategoriesIndex.tsx",
      "app/Funds/risk/renderFundRisk.tsx",
    ];
    for (const rel of bilingualNumericRenderers) {
      let text;
      try {
        text = await readFile(path.join(root, rel), "utf8");
      } catch {
        console.error(`FAIL: ${rel} is missing — the bidi gate cannot verify it.`);
        process.exit(1);
      }
      // Lines that BUILD a percentage string from a number.
      const numericLines = text
        .split("\n")
        .filter((l) => /toFixed\(2\)\}%|maximumFractionDigits: 2 \}\)\}%|Math\.round\([^)]*\)\}%/.test(l));
      if (numericLines.length === 0) continue;
      const unguarded = numericLines.filter((l) => !l.includes("ltrNum"));
      if (unguarded.length > 0) {
        console.error(
          `FAIL: ${rel} formats a percentage without ltrNum() — the sign will render on the wrong side in Arabic.`
        );
        console.error(`       ${unguarded[0].trim().slice(0, 120)}`);
        process.exit(1);
      }
    }
    console.log("OK: signed figures are bidi-isolated on every bilingual renderer.");
  }


  // ── ENGLISH SECTOR NAMES MUST NOT LEAK INTO ARABIC COPY ─────────────────
  // market_tickers.sector_name is English ("Finance", "Process Industries").
  // A 2026-07-03 audit already fixed one round of this — it left strings like
  // "قطاع Finance" on the /ar/symbol pages — and content/sector-names-ar.ts
  // exists for exactly this. It then regressed onto the market screens and the
  // premium overview, and shipped again on the new comparison pages. Any
  // BILINGUAL renderer that puts sector_name in front of a reader must route
  // it through sectorAr().
  {
    const sectorSurfaces = [
      "app/markets/renderMarketScreen.tsx",
      "app/symbol/[id]/SymbolPageClient.tsx",
      "app/companies/vs/[pair]/renderStockVs.tsx",
    ];
    for (const rel of sectorSurfaces) {
      let text;
      try {
        text = await readFile(path.join(root, rel), "utf8");
      } catch {
        console.error(`FAIL: ${rel} is missing — the sector-localisation gate cannot verify it.`);
        process.exit(1);
      }
      if (!/sectorAr\(/.test(text)) {
        console.error(
          `FAIL: ${rel} renders sector_name but never calls sectorAr() — English sector names will appear in Arabic copy.`
        );
        process.exit(1);
      }
    }
    console.log("OK: sector names are localised on every bilingual surface that shows them.");
  }


  // ── EVERY PAGE WITH AN /ar TWIN MUST OFFER THE LANGUAGE TOGGLE ──────────
  // PublicPageShell renders the AR/EN switch only when `altHref` is passed.
  // Every app/ar/** page passed one (back to English) while ten English pages
  // passed none, so the toggle was one-directional: Arabic readers could reach
  // English, English readers could not reach Arabic — on /companies, /sectors,
  // /markets/* and more. Arabic is the site's default language, so that is
  // backwards.
  {
    const { readdirSync } = await import("node:fs");
    const patterns = JSON.parse(
      await readFile(path.join(root, "lib/ar-twin-routes.json"), "utf8")
    ).patterns.map((s) => new RegExp(s));

    const pages = [];
    const walk = (dir, rel) => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/${e.name}`);
        else if (e.name === "page.tsx") pages.push({ file: path.join(dir, e.name), route: rel || "/" });
      }
    };
    walk(path.join(root, "app"), "");

    const missing = [];
    for (const { file, route } of pages) {
      if (route.startsWith("/ar/") || route === "/ar") continue;
      const text = await readFile(file, "utf8");
      if (!text.includes("<PublicPageShell")) continue;
      const sample = route.replace(/\/\[[^\]]+\]/g, "/X");
      if (patterns.some((re) => re.test(sample)) && !/altHref/.test(text)) missing.push(route);
    }
    if (missing.length > 0) {
      console.error(
        "FAIL: these pages have an /ar twin but pass no altHref, so they render NO language toggle:\n" +
        missing.map((r) => `       ${r}`).join("\n")
      );
      process.exit(1);
    }
    console.log("OK: every page with an /ar twin offers the language toggle.");
  }


  // ── CANONICAL REDIRECTS MUST BE PERMANENT (308, not 307) ────────────────
  // canonicalRedirectTarget() normalises a bare/stale URL onto the canonical
  // one (bare ticker -> Arabic-slugged company URL, wrong news slug -> right
  // one). That is a PERMANENT fact about the URL, so it must use
  // permanentRedirect(). Half the call sites used redirect() (307), which
  // tells Google the original may return and keeps both URLs in play instead
  // of consolidating them. A live crawl found 210 such 307s on /ar/symbol.
  {
    const { readdirSync } = await import("node:fs");
    const files = [];
    const walk = (dir) => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(tsx|ts)$/.test(e.name)) files.push(full);
      }
    };
    walk(path.join(root, "app"));
    const offenders = [];
    for (const f of files) {
      const text = await readFile(f, "utf8");
      if (!text.includes("canonicalRedirectTarget")) continue;
      if (/(?<![A-Za-z])redirect\(/.test(text.replace(/permanentRedirect\(/g, "PERM("))) {
        offenders.push(path.relative(root, f));
      }
    }
    if (offenders.length > 0) {
      console.error(
        "FAIL: canonical redirects must use permanentRedirect() (308), not redirect() (307):\n" +
        offenders.map((f) => `       ${f}`).join("\n")
      );
      process.exit(1);
    }
    console.log("OK: every canonical redirect is permanent (308).");
  }

  console.log("PASS: Route alias guard checks succeeded.");
}

run().catch((error) => {
  console.error("FAIL: Route alias guard failed with an exception.");
  console.error(error);
  process.exit(1);
});
