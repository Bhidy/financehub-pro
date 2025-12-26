#!/bin/bash

# GOO MODE: ACTIVATED
# Unified System Launcher for Mubasher Deep Extract

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}>>> GOO MODE INITIATED: System Diagnostics & Launch${NC}"

# 1. KILL ZOMBIE PROCESSES
echo "[-] Sweeping ports 8000 (API) and 3000 (Frontend)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
echo -e "${GREEN}[+] Ports cleared.${NC}"

# 2. VERIFY DATABASE
echo "[-] Checking Database Connection..."
if psql -d mubasher_db -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}[+] Database 'mubasher_db' is alive.${NC}"
else
    echo -e "${RED}[!] Database 'mubasher_db' NOT FOUND.${NC}"
    echo "[-] Attempting auto-creation..."
    createdb mubasher_db || true
    psql -d mubasher_db -f backend/schema.sql
    python3 backend/load_snapshot.py
fi

# 3. START BACKEND API
echo "[-] Launching Backend API (Background)..."
cd backend
# Use venv python to ensure dependencies
nohup ./venv/bin/python -m uvicorn api:app --reload --port 8000 > ../api.log 2>&1 &
API_PID=$!
cd ..

# 4. WAIT FOR API HEALTH
echo "[-] Waiting for API to breathe..."
for i in {1..30}; do
    if curl -s http://localhost:8000/ | grep "ok" > /dev/null; then
        echo -e "${GREEN}[+] API is ONLINE at http://localhost:8000${NC}"
        break
    fi
    sleep 1
    echo -n "."
    if [ $i -eq 30 ]; then
        echo -e "${RED}[!] API Failed to start. Check api.log provided below:${NC}"
        cat api.log
        kill $API_PID
        exit 1
    fi
done

# 5. START FRONTEND
echo -e "${GREEN}[+] Launching Frontend Dashboard...${NC}"
cd frontend
npm run dev

# Cleanup on exit
trap "kill $API_PID" EXIT
