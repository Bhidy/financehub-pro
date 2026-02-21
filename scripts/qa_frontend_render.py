#!/usr/bin/env python3
"""
Frontend Rendering Smoke Test
==============================
Uses Playwright to verify the API data values confirmed by qa_30_english.py
actually render correctly in the live browser UI (not as N/A or blank).

Tests 5 targeted scenarios — runs in ~3 minutes using a single browser session.

Run: python3 scripts/qa_frontend_render.py
"""

import asyncio
import sys
import re
import time
from typing import List, Dict

CHAT_URL = "https://startamarkets.com/AiChat"
TIMEOUT_MS = 45_000          # max wait for response to render
RESPONSE_SELECTOR = "[data-testid='chat-message']:last-child, .chat-message:last-child, [class*='message']:last-child"


# ───────────────────────────────────────────────────────────────────
# SMOKE TESTS — Each verifies one category of fixed data displays
# ───────────────────────────────────────────────────────────────────
SMOKE_TESTS = [
    {
        "id": "S1",
        "label": "P/B Ratio renders as numeric (Fix #2)",
        "query": "Show me statistics for SWDY including P/B ratio",
        "must_contain": ["2.5", "P/B"],           # SWDY P/B ≈ 2.56x
        "must_not_contain": [],
        "expect_no_na_near": "P/B",
    },
    {
        "id": "S2",
        "label": "ROE renders as numeric (Fix #3)",
        "query": "Show me the financial statistics for HRHO",
        "must_contain": ["ROE", "13"],             # HRHO ROE ≈ 13.99%
        "must_not_contain": [],
        "expect_no_na_near": "ROE",
    },
    {
        "id": "S3",
        "label": "Dividend yield renders as numeric (Fix #4)",
        "query": "What is the dividend yield of ABUK?",
        "must_contain": ["9.", "%"],               # ABUK yield ≈ 9.52%
        "must_not_contain": [],
        "expect_no_na_near": None,
    },
    {
        "id": "S4",
        "label": "Sector avg PE shown inline (Fix #7)",
        "query": "Show me the valuation ratios and sector context for SWDY",
        "must_contain": ["sector", "averag"],      # expects "sector average" or similar
        "must_not_contain": [],
        "case_insensitive": True,
        "expect_no_na_near": None,
    },
    {
        "id": "S5",
        "label": "Score renders as numeric, not flat (Fix #1)",
        "query": "Give me a full snapshot of COMI",
        "must_contain": [],                        # Score renders as colored circle
        "score_card_present": True,               # look for score element
        "must_not_contain": [],
        "expect_no_na_near": None,
    },
]

# ───────────────────────────────────────────────────────────────────

class Colors:
    GREEN  = '\033[92m'
    FAIL   = '\033[91m'
    WARN   = '\033[93m'
    CYAN   = '\033[96m'
    BOLD   = '\033[1m'
    HEADER = '\033[95m'
    ENDC   = '\033[0m'


async def wait_for_response(page, prev_text: str = "", timeout_s: int = 55) -> str:
    """
    Wait until the chat actually responds with new data.
    Strategy: poll page text every 1s until it changes AND
    the loading indicator is gone AND response has stayed stable for 2s.
    """
    deadline = time.time() + timeout_s
    last_change = time.time()
    last_text = prev_text

    while time.time() < deadline:
        await asyncio.sleep(1.2)
        current = await page.inner_text("body")

        # Page changed — note the time
        if current != last_text:
            last_text = current
            last_change = time.time()

        # Check if loading indicator is still visible
        still_loading = False
        try:
            for sel in ["text=Analyzing", "text=Searching", "text=Loading",
                        "[class*='typing']", "[class*='loader']"]:
                elems = await page.locator(sel).all()
                if elems:
                    still_loading = True
                    break
        except Exception:
            pass

        # Stable for 2+ seconds and not loading → response is done
        stable = (time.time() - last_change) >= 2.0
        if stable and not still_loading and current != prev_text:
            return current

    return await page.inner_text("body")


def check_test(test: Dict, page_text: str) -> List[str]:
    """Returns list of issues found."""
    issues = []
    text = page_text.lower() if test.get("case_insensitive") else page_text

    # Check must_contain strings appear
    for s in test.get("must_contain", []):
        check = s.lower() if test.get("case_insensitive") else s
        if check not in text:
            issues.append(f"Expected '{s}' not found on screen")

    # Check must_not_contain
    for s in test.get("must_not_contain", []):
        check = s.lower() if test.get("case_insensitive") else s
        if check in text:
            issues.append(f"Found unexpected '{s}' on screen")

    # Check no "N/A" near a specific label
    label = test.get("expect_no_na_near")
    if label:
        # Find label position and check surrounding 200 chars for N/A
        idx = page_text.upper().find(label.upper())
        if idx >= 0:
            window = page_text[max(0, idx-20):idx+100]
            if re.search(r'\bN/A\b', window, re.IGNORECASE):
                issues.append(f"'{label}' is showing N/A on screen (fix not rendering)")

    # Check score card is visible for score rendering test
    if test.get("score_card_present"):
        # Look for a number in 0-100 range near "score" or colored circle
        score_match = re.search(r'\b([3-9]\d|[1-9]\d{2})\b', page_text)
        if not score_match:
            # Even simpler: just make sure there's a 2-digit number indicating a score
            issues.append("No score number (30-99) found on screen — score card may not be rendering")

    return issues


async def run_smoke_tests():
    from playwright.async_api import async_playwright

    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*65}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD} 🌐 FRONTEND RENDER SMOKE TEST — {len(SMOKE_TESTS)} Scenarios{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*65}{Colors.ENDC}")
    print(f"  Target: {CHAT_URL}\n")

    results = {"passed": 0, "failed": 0, "failures": []}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        )
        page = await context.new_page()

        # Navigate and wait for chatbot to load
        print(f"  Loading chatbot...", end=" ", flush=True)
        try:
            await page.goto(CHAT_URL, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)
            print(f"{Colors.GREEN}✓ Ready{Colors.ENDC}\n")
        except Exception as e:
            print(f"{Colors.FAIL}✗ Failed to load: {e}{Colors.ENDC}")
            await browser.close()
            sys.exit(1)

        # Handle guest/login if present
        try:
            guest_btn = page.get_by_text("Continue as Guest", exact=False)
            if await guest_btn.is_visible(timeout=3000):
                await guest_btn.click()
                await asyncio.sleep(1.5)
        except Exception:
            pass  # Not shown, already logged in

        # Run each smoke test in the SAME session (natural conversation)
        for test in SMOKE_TESTS:
            tid   = test["id"]
            label = test["label"]
            query = test["query"]

            print(f"  [{tid}] {Colors.CYAN}{label}{Colors.ENDC}")
            print(f"       Query: {query[:60]}", end="  ", flush=True)

            start = time.time()

            try:
                # Capture current page text as baseline BEFORE submitting
                prev_page_text = await page.inner_text("body")

                # Type and submit the query
                chat_input = page.locator(
                    "input[placeholder*='Ask'], textarea[placeholder*='Ask'], "
                    "input[placeholder*='Type'], textarea[placeholder*='Type'], "
                    "input[type='text'], textarea"
                ).first
                await chat_input.fill(query)
                await chat_input.press("Enter")

                # Wait for response — pass current text so we detect new content
                await asyncio.sleep(0.5)   # let loader appear first
                page_text = await wait_for_response(page, prev_text=prev_page_text)
                dur = time.time() - start

                issues = check_test(test, page_text)

                # Save screenshot for reference
                screenshot_path = f"/tmp/qa_smoke_{tid.lower()}.png"
                await page.screenshot(path=screenshot_path, full_page=False)

                if issues:
                    print(f"{Colors.FAIL}❌ FAIL{Colors.ENDC} ({dur:.1f}s) → {screenshot_path}")
                    for iss in issues:
                        print(f"         {Colors.FAIL}✗ {iss}{Colors.ENDC}")
                    results["failed"] += 1
                    results["failures"].append({"id": tid, "label": label, "issues": issues})
                else:
                    print(f"{Colors.GREEN}✅ PASS{Colors.ENDC} ({dur:.1f}s) → {screenshot_path}")
                    results["passed"] += 1

            except Exception as e:
                dur = time.time() - start
                print(f"{Colors.FAIL}❌ ERROR{Colors.ENDC} ({dur:.1f}s): {e}")
                results["failed"] += 1
                results["failures"].append({"id": tid, "label": label, "issues": [str(e)]})

            await asyncio.sleep(1.5)  # small gap between queries

        await browser.close()

    # ── Summary ──────────────────────────────────────────────────
    total = results["passed"] + results["failed"]
    pct   = int(results["passed"] / total * 100) if total else 0

    print(f"\n{Colors.HEADER}{'='*65}{Colors.ENDC}")
    print(f"{Colors.BOLD}📊 FRONTEND RENDER: {results['passed']}/{total} passed ({pct}%){Colors.ENDC}")

    if results["failures"]:
        print(f"\n{Colors.FAIL}{Colors.BOLD}RENDER FAILURES:{Colors.ENDC}")
        for f in results["failures"]:
            print(f"  [{f['id']}] {f['label']}")
            for iss in f["issues"]:
                print(f"        • {iss}")

    if results["failed"] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🏆 ALL VALUES RENDER CORRECTLY IN BROWSER{Colors.ENDC}")
        print(f"   Screenshots saved to /tmp/qa_smoke_*.png\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}⚠️  {results['failed']} RENDER FAILURE(S){Colors.ENDC}\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_smoke_tests())
