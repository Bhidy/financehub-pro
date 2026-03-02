import asyncio
from typing import Dict, Any
from app.chat.handlers.compare_handler import handle_compare
import asyncpg
import json
import os

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        results = {}
        
        # Test 1: PHDC vs PEERS (fallback)
        print("Testing: PHDC (expecting 3 stocks from same sector)")
        res1 = await handle_compare(["PHDC"], "en", conn, "STOCK_COMPARISON")
        results["test1_phdc_auto"] = {
            "stocks_found": [s["symbol"] for s in res1["comparison_table"]["headers"][1:]] if "comparison_table" in res1 else [],
            "error": res1.get("error")
        }

        # Test 2: PHDC vs JUFO (user forced cross-sector) -> Should STILL append 1 peer to make 3
        print("Testing: PHDC vs JUFO (expecting 3 stocks)")
        res2 = await handle_compare(["PHDC", "JUFO"], "en", conn, "STOCK_COMPARISON")
        results["test2_phdc_jufo"] = {
            "stocks_found": [s["symbol"] for s in res2["comparison_table"]["headers"][1:]] if "comparison_table" in res2 else [],
            "rows": res2.get("comparison_table", {}).get("rows", [])
        }
        
        # Test 3: COMI vs SWDY vs TMGH
        print("Testing: COMI vs SWDY vs TMGH (expecting exactly 3, checking values array lengths)")
        res3 = await handle_compare(["COMI", "SWDY", "TMGH"], "en", conn, "STOCK_COMPARISON")
        rows = res3.get("comparison_table", {}).get("rows", [])
        results["test3_3stocks"] = {
            "stocks_found": [s["symbol"] for s in res3["comparison_table"]["headers"][1:]] if "comparison_table" in res3 else [],
            "metrics_with_empty": [r["metric"] for r in rows if any(v == "N/A" for v in r["values"])],
            "first_row_values": rows[0]["values"] if rows else []
        }
        
        with open("compare_debug_global.json", "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        print("\nAll tests ran successfully. Wrote to compare_debug_global.json")
    finally:
        await conn.close()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=".env")
    asyncio.run(main())
