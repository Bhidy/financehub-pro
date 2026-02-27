import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

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
      /router\.push\(homeRoute\)/.test(text) &&
      !/router\.push\(\s*['"]\/dashboard['"]\s*\)/.test(text),
  },
  {
    name: "register success uses unified home route",
    file: "app/register/page.tsx",
    assert: (text) =>
      /router\.push\(getRoute\('home'\)\)/.test(text) &&
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
    name: "home page defaults to dark theme for premium card styling",
    file: "public/home.html",
    assert: (text) =>
      /<html[^>]*data-theme=["']dark["']/i.test(text) &&
      /const initialTheme = savedTheme === 'light' \? 'light' : 'dark';/.test(text),
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
