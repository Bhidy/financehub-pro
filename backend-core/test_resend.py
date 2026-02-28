import asyncio
import httpx
from dotenv import load_dotenv
import os

load_dotenv('.env')

async def main():
    resend_key = os.getenv('RESEND_API_KEY')
    db_url = os.getenv('DATABASE_URL')
    print("RESEND_API_KEY exists:", bool(resend_key))
    print("DATABASE_URL exists:", bool(db_url))
    
    # 1. Check database
    try:
        from databases import Database
        db = Database(db_url)
        await db.connect()
        rows = await db.fetch_all("SELECT email, unsubscribed FROM newsletter_preferences WHERE email ILIKE '%mohamedbhidy%'")
        print("Database matches for mohamedbhidy:")
        for r in rows:
            print(dict(r))
        await db.disconnect()
    except Exception as e:
        print("Database check failed:", e)

    # 2. Test Resend Delivery
    if resend_key:
        print("\nTesting Resend delivery to mohamedbhidy@gmail.com...")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "onboarding@resend.dev",
                    "to": ["mohamedbhidy@gmail.com"],
                    "subject": "Diagnostic Test: FinanceHub Delivery Check",
                    "html": "<h3>Diagnostic Test</h3><p>If you see this, the Resend API is successfully delivering to your email address through the backend system.</p>",
                }
            )
            print("Resend Status Code:", resp.status_code)
            print("Resend Response Body:", resp.text)

if __name__ == "__main__":
    asyncio.run(main())
