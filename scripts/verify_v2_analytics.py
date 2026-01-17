import httpx
import asyncio
import json

API_BASE = "https://starta.46-224-223-172.sslip.io/api/v1/admin/analytics"

async def check():
    print("--- Verifying V2 Analytics Endpoints ---")
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        # Check summary
        try:
            res = await client.get(f"{API_BASE}/health/summary?period=30d")
            print(f"Summary Status: {res.status_code}")
            if res.status_code == 200:
                print("Summary Data:", json.dumps(res.json(), indent=2))
        except Exception as e:
            print(f"Summary failed: {e}")

        # Check demand
        try:
            res = await client.get(f"{API_BASE}/demand/trending?period=30d")
            print(f"Demand Status: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                print(f"Demand Data Count: {len(data)}")
                if data:
                    print("Sample:", data[0])
        except Exception as e:
            print(f"Demand failed: {e}")

        # Check health kpis with filters
        try:
            res = await client.get(f"{API_BASE}/health?period=30d&user_type=guest")
            print(f"Health Filtered Status: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                print("Health Filtered Trend:", data.get('trend_chats'))
        except Exception as e:
            print(f"Health Filtered failed: {e}")

if __name__ == "__main__":
    asyncio.run(check())
