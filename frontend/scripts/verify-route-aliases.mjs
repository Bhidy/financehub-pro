import { constants, readFileSync } from "node:fs";
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
      ["core", "companies", "ar-companies", "metrics", "sectors", "funds", "fund-categories", "comparisons", "learn", "glossary", "news"].every((seg) => text.includes(seg)),
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
    assert: (text) => /canonicalNewsPath\(r\.id, r\.headline\)/.test(text) && !/newsPath\(r\.id, r\.headline\)/.test(text),
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
  { route: "app/Market-Pulse/route.ts", shell: "market-pulse.html", url: "/Market-Pulse" },
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
  for (const file of ["lib/public-data.ts", "app/sitemaps/[name]/route.ts"]) {
    let text = "";
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      console.error(`FAIL: ${file} is missing.`);
      failed = true;
      continue;
    }
    const queries = [...text.matchAll(/`([^`]*FROM market_tickers[^`]*)`/g)].map((m) => m[1]);
    const ungated = queries.filter((q) => !q.includes("EGX_ONLY"));
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

  // ANCHOR INTEGRITY. The shell-serving routes edit the designed files by
  // matching literal strings (a <title>, a canonical, a data-key). If a
  // designer reformats the shell, those anchors stop matching and the route
  // ships the WRONG heading or the WRONG canonical with no error — that is
  // exactly how the category pages went out with the generic "Mutual Funds"
  // heading. Assert every anchor still exists in the file it targets.
  const SHELL_ANCHORS = [
    ["public/marketplace.html", '<title>Funds Marketplace | Starta Markets</title>'],
    ["public/marketplace.html", '<link rel="canonical" href="https://startamarkets.com/Funds">'],
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

  for (const check of checks) {
    const fullPath = path.join(root, check.file);
    const text = await readFile(fullPath, "utf8");
    if (!check.assert(text, { navConfig, authNav })) {
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

  console.log("PASS: Route alias guard checks succeeded.");
}

run().catch((error) => {
  console.error("FAIL: Route alias guard failed with an exception.");
  console.error(error);
  process.exit(1);
});
