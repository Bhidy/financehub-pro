import os
import sys

# Add backend-core to path
sys.path.append(os.path.join(os.getcwd(), "backend-core"))

from app.chat.text_normalizer import extract_potential_symbols


def run_case(text: str, must_include=None, must_exclude=None) -> bool:
    must_include = must_include or []
    must_exclude = must_exclude or []
    extracted = [str(x).upper() for x in extract_potential_symbols(text)]
    ok = True

    for symbol in must_include:
        if symbol.upper() not in extracted:
            print(f"❌ Missing expected symbol '{symbol}' | query='{text}' | extracted={extracted}")
            ok = False
    for noise in must_exclude:
        if noise.upper() in extracted:
            print(f"❌ Noise symbol leaked '{noise}' | query='{text}' | extracted={extracted}")
            ok = False

    if ok:
        print(f"✅ PASS | query='{text}' | extracted={extracted}")
    return ok


def main() -> int:
    print("🔬 Symbol Extraction Verification")
    print("=" * 60)

    tests = [
        # Baseline ticker extraction
        ("Compare JUFO to its competitors", ["JUFO"], ["ITS", "TO"]),
        ("Compare COMI vs SWDY", ["COMI", "SWDY"], ["COMPARE"]),
        # Lexical-noise cases from follow-up regressions
        (
            "How does the stock in question compare to its sector peers in terms of valuation and growth?",
            [],
            ["DOES", "PEERS", "TERMS", "VALUATION", "GROWTH"],
        ),
        (
            "How does COMI compare to sector peers in terms of valuation and growth?",
            ["COMI"],
            ["DOES", "PEERS", "TERMS", "VALUATION", "GROWTH"],
        ),
        (
            "What's driving the 9.3% decline in COMI's EPS?",
            ["COMI"],
            ["WHATS", "DRIVING", "DECLINE"],
        ),
        # Ensure aliases still work
        ("Price of CIB", ["COMI"], []),
    ]

    passed = 0
    for text, includes, excludes in tests:
        if run_case(text, includes, excludes):
            passed += 1

    total = len(tests)
    print("=" * 60)
    print(f"Summary: {passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
