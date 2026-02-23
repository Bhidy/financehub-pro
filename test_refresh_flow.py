import httpx
import asyncio
import json

BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1"
# We will use the system admin account from the DB seeding script
EMAIL = "admin@finhub.pro"
PASSWORD = "StartaProd2026!" # Or whatever the admin password is. Wait, the seeding script uses a bcrypt hash for admin@finhub.pro. Let's create a test user instead via the signup endpoint.

async def test_refresh_flow():
    test_email = "test_refresh_flow@example.com"
    test_password = "Password123!"

    print("1. Signing up a test user to get tokens...")
    async with httpx.AsyncClient(verify=False) as client:
        # 1. Signup
        signup_resp = await client.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "full_name": "Test User"
            }
        )
        
        # If user exists, just login
        if signup_resp.status_code == 400 and "already registered" in signup_resp.text:
            print("User exists, logging in instead...")
            resp = await client.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": test_email,
                    "password": test_password
                }
            )
        else:
            resp = signup_resp

        if resp.status_code != 200:
            print(f"Failed to auth: {resp.status_code} - {resp.text}")
            return
            
        data = resp.json()
        access_token = data.get("access_token")
        cookies = resp.cookies
        refresh_token = cookies.get("refresh_token")
        
        print(f"✅ Auth successful.")
        print(f"   Access Token: {access_token[:20]}...")
        print(f"   Refresh Token Cookie: {'Present' if refresh_token else 'Missing!'}")

        if not refresh_token:
            print("❌ FAIL: No refresh token cookie returned.")
            return

        print("\n2. Testing authenticated endpoint with valid access token...")
        headers = {"Authorization": f"Bearer {access_token}"}
        me_resp = await client.get(f"{BASE_URL}/auth/me", headers=headers)
        if me_resp.status_code == 200:
            print(f"✅ Success. User: {me_resp.json().get('email')}")
        else:
            print(f"❌ FAIL: {me_resp.status_code} - {me_resp.text}")

        print("\n3. Simulating expired access token (sending invalid token)...")
        bad_headers = {"Authorization": f"Bearer {access_token[:-5]}abcde"} # Mess up the signature
        fail_resp = await client.get(f"{BASE_URL}/auth/me", headers=bad_headers)
        if fail_resp.status_code == 401:
            print("✅ Success: Correctly rejected with 401.")
        else:
            print(f"❌ FAIL: Expected 401, got {fail_resp.status_code}")

        print("\n4. Calling /refresh endpoint with the HttpOnly cookie...")
        # httpx AsyncClient automatically sends cookies it received in the same session
        refresh_resp = await client.post(f"{BASE_URL}/auth/refresh")
        
        if refresh_resp.status_code == 200:
            new_data = refresh_resp.json()
            new_access_token = new_data.get("access_token")
            print(f"✅ Success. Received new access token: {new_access_token[:20]}...")
            
            print("\n5. Testing authenticated endpoint with NEW access token...")
            new_headers = {"Authorization": f"Bearer {new_access_token}"}
            me_resp2 = await client.get(f"{BASE_URL}/auth/me", headers=new_headers)
            if me_resp2.status_code == 200:
                print(f"✅ Success! Full silent refresh loop validated.")
            else:
                print(f"❌ FAIL on new token: {me_resp2.status_code}")
                
        else:
            print(f"❌ FAIL on /refresh: {refresh_resp.status_code} - {refresh_resp.text}")

if __name__ == "__main__":
    asyncio.run(test_refresh_flow())
