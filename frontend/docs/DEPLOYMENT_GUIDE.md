# Deployment Guide & Troubleshooting

## 🚨 Critical Environment Variables

For the production deployment to work correctly, you **MUST** set the following environment variables in your Vercel Project Settings:

### 1. `NEXT_PUBLIC_API_URL`
The URL of your live Backend API (e.g., Railway, Render, or another Vercel deployment).
- **Format**: `https://your-backend-app.railway.app` (No trailing slash)
- **Why**: Typically defaults to `http://localhost:8000` if missing, which causes "0 matches found" and "Service Offline" errors in production.

### 2. `DATABASE_URL`
The connection string for your PostgreSQL database.
- **Format**: `postgresql://user:password@host:port/database`
- **Why**: Required for the **Command Center** and **Inventory** APIs to function. Without this, the Command Center will crash or show no data.

---

## 🔍 How to Verify

1. **Check the Browser Console**:
   - Open your production site.
   - Open Developer Tools (F12) -> Console.
   - Look for the log: `[FinanceHub] Initializing API Client with Base URL: ...`
   - If it says `http://localhost:8000/...`, your `NEXT_PUBLIC_API_URL` is **NOT** set correctly.

2. **Check the Network Tab**:
   - If calls are failing (Red), check the Request URL.
   - If the URL starts with `http://localhost:8000`, the environment variable is missing.

## 🛠️ Recent Fixes Applied

- **Unified API Client**: All pages (`Intraday`, `Market Pulse`, `Screener`, `Earnings`, `Shareholders`, `Data Explorer`) now use a single configuration in `lib/api.ts`.
- **Database Connection**: `app/api/inventory/route.ts` no longer hardcodes `localhost`.
- **Health Check**: The health indicator now respects the centralized API URL.
