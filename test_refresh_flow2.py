import httpx
import asyncio

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"

async def test_headers():
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "test_refresh_flow@example.com",
                "password": "Password123!"
            }
        )
        print("Status code:", resp.status_code)
        print("Cookies dict:", resp.cookies)
        for k, v in resp.headers.items():
            if 'cookie' in k.lower():
                print(f"{k}: {v}")
        print("Raw Server Data:", resp.text[:100])

if __name__ == "__main__":
    asyncio.run(test_headers())
