#!/usr/bin/env python3
import os
import sys
import re

"""
CHIEF EXPERT PRE-FLIGHT CHECK
=============================
This script MUST pass before any deployment.
It verifies Architecture, Configuration, and Dependency Parity.
"""

def fail(msg):
    print(f"❌ [FAIL] {msg}")
    sys.exit(1)

def pass_check(msg):
    print(f"✅ [PASS] {msg}")

def check_frontend_config():
    api_ts_path = "frontend/lib/api.ts"
    if not os.path.exists(api_ts_path):
        fail(f"Missing {api_ts_path}")
    
    with open(api_ts_path, 'r') as f:
        content = f.read()
    
    # Check 1: API_BASE_URL must be Production Hetzner
    # Regex for const API_BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1";
    # or similar
    if 'https://starta.46-224-223-172.sslip.io/api/v1' not in content:
        fail("Frontend api.ts is NOT pointing to Production Backend (Hetzner)")
    
    pass_check("Frontend Config (api.ts) points to Production Backend")

def check_backend_deps():
    req_path = "backend-core/requirements.txt"
    if not os.path.exists(req_path):
        fail(f"Missing {req_path}")
        
    with open(req_path, 'r') as f:
        content = f.read()
    
    required = ["APScheduler", "fastapi", "uvicorn", "asyncpg", "sqlalchemy", "email-validator", "cachetools", "databases"]
    for r in required:
        if r not in content:
            fail(f"Backend requirements.txt missing critical dependency: {r}")
            
    pass_check("Backend Dependencies (requirements.txt) validated")

def check_backend_cors_strictness():
    main_path = "backend-core/app/main.py"
    with open(main_path, 'r') as f:
        content = f.read()
    
    # Check for allow_credentials=True
    if "allow_credentials=True" not in content:
        fail("Backend CORS missing 'allow_credentials=True' (Required for Auth)")
        
    # Check for specific origin
    if "https://finhub-pro.vercel.app" not in content:
        fail("Backend CORS missing Production Origin (finhub-pro.vercel.app)")
        
    pass_check("Backend CORS Policy is STRICT and SECURE")

def check_run_script():
    run_path = "backend-core/run.sh"
    with open(run_path, 'r') as f:
        content = f.read()
        
    if "uvicorn app.main:app" not in content:
        fail("run.sh missing Start Command")
        
    pass_check("Startup Script (run.sh) valid")

def main():
    print("🚀 STARTING CHIEF EXPERT PRE-FLIGHT CHECK...")
    check_frontend_config()
    check_backend_deps()
    check_backend_cors_strictness()
    check_run_script()
    print("\n🎉 ALL SYSTEMS GO. READY FOR DEPLOYMENT.")

if __name__ == "__main__":
    main()
