
import requests
import re
from bs4 import BeautifulSoup

EMAIL = "m.mostafa@mubasher.net"
PASS = "bhidy1234"
LOGIN_URL = "https://www.decypha.com/en/login"
SEARCH_URL = "https://www.decypha.com/en/funds/search?selectedRegion=MENA-20&fundName=&country=EG&fundClass=-1"
EXPORT_URL = "https://www.decypha.com/en/funds/search/export?selectedRegion=MENA-20&fundName=&country=EG&fundClass=-1"

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

# 1. Get Login Page for CSRF/Cookies
print("Fetching login page...")
r = s.get(LOGIN_URL)
soup = BeautifulSoup(r.text, 'html.parser')

# Try to find login form inputs (often hidden tokens)
data = {
    "email": EMAIL,
    "password": PASS,
    # Add any other hidden fields if needed. Usually 'do_login' or similar.
}

# 2. Post Login
print("Logging in...")
# Decypha login might be different. Let's inspect form if possible or just try standard named fields.
# Based on common PHP/HTML forms.
r = s.post(LOGIN_URL, data=data)

# Check if logged in
if "Logout" in r.text or "My Profile" in r.text:
    print("Login SUCCESS!")
else:
    print("Login FAILED (or could not detect success).")
    # print(r.text[:500])

# 3. Export Excel
print("Downloading Excel...")
r = s.get(EXPORT_URL)
if r.status_code == 200 and len(r.content) > 1000:
    with open("decypha_funds.xls", "wb") as f:
        f.write(r.content)
    print(f"Downloaded decypha_funds.xls ({len(r.content)} bytes)")
else:
    print(f"Download failed: Status {r.status_code}, Len {len(r.content)}")
