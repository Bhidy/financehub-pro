# FinanceHub Pro - Deployment Checklist

## 🚨 CRITICAL: Required Environment Variables

Before deploying to **Vercel Production**, ensure the following environment variables are set in the [Vercel Dashboard](https://vercel.com/bhidys-projects/finhub/settings/environment-variables):

| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `DATABASE_URL` | ✅ **CRITICAL** | Production, Preview | PostgreSQL connection string (Supabase). Without this, the AI Chatbot fails. |
| `GROQ_API_KEY` | ✅ Recommended | Production | Groq LLM API Key. Fallback key exists, but primary is preferred. |
| `NEXT_PUBLIC_API_URL` | Optional | All | Backend API URL (if using separate backend). |
| `NEXT_PUBLIC_WS_URL` | Optional | Production | WebSocket URL for live data. |

---

## 🛠️ Deployment Commands

### From Project Root (Recommended)
```bash
# Navigate to the project root
cd /path/to/mubasher-deep-extract

# Link to the Vercel project (only needed once)
npx vercel link --yes --project finhub

# Deploy to Production
npx vercel --prod --yes
```

### Verify Deployment
After deployment, verify the AI chatbot is working:
1. Go to `https://finhub-pro.vercel.app/ai-analyst`
2. Ask: "SABIC stock quote"
3. You should see real data, NOT "tool execution failure".

---

## 🔒 Build-Time Validation

The `next.config.ts` now includes **enterprise-grade build validation**:
- If `DATABASE_URL` is missing during a Vercel build, the build will **fail immediately** with a clear error message.
- This prevents silent failures in production.

---

## 🧪 Troubleshooting

### "Tool execution failure" in AI Chatbot
**Cause**: `DATABASE_URL` is not set in Vercel.
**Fix**: Add it in Vercel Dashboard > Settings > Environment Variables.

### "Data not available" for a specific stock
**Cause**: The Backend Scraper has not populated data for that stock.
**Fix**: Run the data extraction scripts (in `/backend`) or wait for the scheduled scrape.

### Build fails with "Missing required environment variable"
**Cause**: You are deploying without setting up Vercel Env Vars.
**Fix**: Add all variables from the table above.

---

## 📌 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.1 | 2024-12-30 | Fixed DATABASE_URL missing in Vercel. Added build validation. |
| 1.1.0 | 2024-12-30 | Ultra Premium AI Response Architecture. |
| 1.0.15 | 2024-12-27 | Enterprise Edition. |
