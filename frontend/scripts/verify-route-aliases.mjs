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

  console.log("PASS: Route alias guard checks succeeded.");
}

run().catch((error) => {
  console.error("FAIL: Route alias guard failed with an exception.");
  console.error(error);
  process.exit(1);
});
