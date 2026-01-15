import requests
import uuid

BASE_URL = "http://localhost:7860"
TIMEOUT = 30

def test_user_authentication_login_registration_token_management():
    session = requests.Session()
    headers = {"Content-Type": "application/json"}
    user_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    user_password = "TestPassw0rd!"

    # Registration payload
    registration_payload = {
        "email": user_email,
        "password": user_password,
        "full_name": "Test User"
    }

    # Register new user
    try:
        reg_resp = session.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=registration_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert reg_resp.status_code in (200, 201), f"Registration failed: {reg_resp.text}"
        reg_data = reg_resp.json()
        assert "id" in reg_data or "user_id" in reg_data, "Registration response missing user ID"

        # Login payload
        login_payload = {
            "email": user_email,
            "password": user_password
        }

        # Login user
        login_resp = session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=login_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "access_token" in login_data, "Login response missing access_token"
        assert login_data.get("token_type", "").lower() == "bearer", "Token type is not bearer"

        access_token = login_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {access_token}"}

        # Validate token-based session management by calling a protected endpoint (/api/v1/auth/me)
        me_resp = session.get(
            f"{BASE_URL}/api/v1/auth/me",
            headers=auth_headers,
            timeout=TIMEOUT,
        )
        assert me_resp.status_code == 200, f"Token validation failed on /auth/me: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data.get("email", "").lower() == user_email.lower(), "Authenticated user email mismatch"

        # Optional: test token expiry - simulate by refreshing token or checking expiration if endpoint exists
        # Since no explicit token refresh in PRD, attempt to access protected endpoint multiple times to confirm no expiry error
        for _ in range(3):
            check_resp = session.get(
                f"{BASE_URL}/api/v1/auth/me",
                headers=auth_headers,
                timeout=TIMEOUT,
            )
            assert check_resp.status_code == 200, f"Token expired prematurely: {check_resp.text}"

        # Attempt login with wrong password to confirm secure authentication rejects invalid credentials
        invalid_login_payload = {
            "email": user_email,
            "password": "WrongPassword123!"
        }
        invalid_resp = session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=invalid_login_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert invalid_resp.status_code in (401, 400), "Invalid login was not rejected"

    finally:
        # Cleanup: Delete user via an admin or endpoint if available
        # Since no delete user endpoint provided, ignore cleanup or mark as TODO
        pass

test_user_authentication_login_registration_token_management()
