import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
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
    name: "route helper still defines home route",
    file: "components/chatbot/hooks/useMobileRoutes.ts",
    assert: (text) => /home:\s*["']\/AiChat["']/.test(text),
  },
  {
    name: "login success never redirects to dashboard",
    file: "app/login/page.tsx",
    assert: (text) =>
      !/router\.push\(\s*['"]\/dashboard['"]\s*\)/.test(text),
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

  for (const check of checks) {
    const fullPath = path.join(root, check.file);
    const text = await readFile(fullPath, "utf8");
    if (!check.assert(text)) {
      console.error(`FAIL: ${check.name} (${check.file})`);
      process.exit(1);
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
