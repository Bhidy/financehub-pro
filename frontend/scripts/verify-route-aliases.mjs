import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const checks = [
  {
    name: "home alias page redirects to root",
    file: "app/home/page.tsx",
    assert: (text) => /redirect\(\s*["']\/["']\s*\)/.test(text),
  },
  {
    name: "route helper keeps home mapped to root",
    file: "components/chatbot/hooks/useMobileRoutes.ts",
    assert: (text) => /home:\s*["']\/["']/.test(text),
  },
  {
    name: "next config redirects /home to canonical root",
    file: "next.config.ts",
    assert: (text) =>
      /source:\s*['"]\/home['"]/.test(text) &&
      /source:\s*['"]\/Home['"]/.test(text),
  },
];

async function run() {
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
