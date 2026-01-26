
import httpx
import asyncio

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

async def fetch():
    url = "https://stockanalysis.com/quote/egx/COMI/financials/"
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        r = await client.get(url)
        print(f"Status: {r.status_code}")
        with open("debug_financials.html", "w") as f:
            f.write(r.text)
        print("Saved to debug_financials.html")

if __name__ == "__main__":
    asyncio.run(fetch())
