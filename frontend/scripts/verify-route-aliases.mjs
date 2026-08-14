import { constants } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { assetHashes } from "./sync-asset-versions.mjs";
import { deriveArRoutes } from "./sync-ar-routes.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicPages = ["home", "marketplace", "fund-details", "fund-compare", "market-pulse", "learn", "learn-topic", "news", "news-article"];
// SEO gate covers every indexable static template (superset incl. legal pages).
const seoPages = [...publicPages, "portfolio", "portfolio-detail", "privacy", "terms"];

function hasCurrentPublicNav(text) {
  const nav = text.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || "";
  const fundsKey = nav.includes('data-key="nav_mobile"') ? "nav_mobile" : "nav_funds";
  // Market Pulse (nav_pulse) and My Portfolio (nav_portfolio) are intentionally
  // hidden from the nav; assert they are ABSENT and the remaining links are in order.
  const positions = ["nav_home", fundsKey, "nav_news", "nav_learn"]
    .map((key) => nav.indexOf(`data-key="${key}"`));

  return positions.every((position) => position >= 0) &&
    positions.every((position, index) => index === 0 || position > positions[index - 1]) &&
    !/data-key=["']nav_(features|pricing|pulse|portfolio)["']/.test(nav) &&
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
    // Both React navs must render from the canonical list, never a local copy.
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
    // News rows carry `image_url` scraped from the originating publisher.
    // Those are third-party editorial photos: off-brand, unpredictable, and not
    // ours to republish (a street-market photo once illustrated a CPI story).
    // Every news surface must resolve its image through lib/news-cover.ts.
    name: "news article renders the branded cover, never the scraped image",
    file: "app/News/[id]/page.tsx",
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
    name: "static Home page asset exists with expected title",
    file: "public/home.html",
    assert: (text) => /<title>\s*Starta\s*\|\s*Master the EGX\s*<\/title>/i.test(text),
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
    name: "segmented sitemap route exists with all ten segments",
    file: "app/sitemaps/[name]/route.ts",
    assert: (text) =>
      ["core", "companies", "ar-companies", "metrics", "sectors", "funds", "comparisons", "learn", "glossary", "news"].every((seg) => text.includes(seg)),
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

async function run() {
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

  for (const check of checks) {
    const fullPath = path.join(root, check.file);
    const text = await readFile(fullPath, "utf8");
    if (!check.assert(text, { navConfig })) {
      console.error(`FAIL: ${check.name} (${check.file})`);
      process.exit(1);
    }
  }

  // Arabic twin routes must match what app/ar/** actually contains. The list
  // was hand-maintained in three places and listed 2 routes while 15 existed,
  // so every link to /Learn/{slug}, /Funds/{id}, /companies, /sectors,
  // /markets/* and /symbol/{id} flipped an Arabic reader to English.
  {
    const derived = await deriveArRoutes();
    const checked = JSON.parse(await readFile(path.join(root, "lib/ar-twin-routes.json"), "utf8")).routes;
    if (JSON.stringify(derived) !== JSON.stringify(checked)) {
      console.error(
        "FAIL: lib/ar-twin-routes.json is stale.\n" +
        `       on disk: ${derived.join(", ")}\n` +
        `       checked in: ${checked.join(", ")}\n` +
        "       Run: node scripts/sync-ar-routes.mjs"
      );
      process.exit(1);
    }
    const boot = await readFile(path.join(root, "public/assets/starta-lang-boot.js"), "utf8");
    if (!derived.every((r) => boot.includes(`"${r}"`))) {
      console.error("FAIL: starta-lang-boot.js twin-route mirror is stale. Run: node scripts/sync-ar-routes.mjs");
      process.exit(1);
    }
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

  console.log("PASS: Route alias guard checks succeeded.");
}

run().catch((error) => {
  console.error("FAIL: Route alias guard failed with an exception.");
  console.error(error);
  process.exit(1);
});
