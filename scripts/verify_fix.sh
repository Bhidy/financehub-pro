#!/bin/bash
BASE_URL="https://starta.46-224-223-172.sslip.io/api/v1"

echo "1. Registering Test User..."
curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "test_fix_portfolio_v2@example.com", "password": "Password123!", "full_name": "Test User"}' > signup.json

cat signup.json
TOKEN=$(cat signup.json | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login/Signup failed, trying login..."
  curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test_fix_portfolio_v2@example.com", "password": "Password123!"}' > login.json
  TOKEN=$(cat login.json | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)
fi

echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
    echo "Failed to get token."
    exit 1
fi

echo "2. Fetching Portfolio (Expect 200 OK)..."
curl -I -X GET "$BASE_URL/portfolio/full" \
  -H "Authorization: Bearer $TOKEN"

echo "3. Fetching Content..."
curl -s -X GET "$BASE_URL/portfolio/full" \
  -H "Authorization: Bearer $TOKEN"
