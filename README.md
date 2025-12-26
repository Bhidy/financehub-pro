# FinanceHub Pro

## Enterprise Financial Intelligence Platform
**Made with ❤️ by Bhidy**

---

## 🚀 Quick Start

### Option 1: Unified Startup (Recommended)
```bash
./start_all.sh
```
This starts both the backend API and frontend automatically.

### Option 2: Manual Startup
```bash
# Terminal 1 - Backend API
cd backend
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🛑 Stop All Services
```bash
./stop_all.sh
```

---

## 📊 Access Points

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Command Center** | http://localhost:3000/command-center |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

---

## 🔧 Prerequisites

Before running the application, ensure you have:

1. **PostgreSQL** - Running with `mubasher_db` database
2. **Node.js** - v18+ recommended
3. **Python 3.10+** - With pip

### Install Backend Dependencies
```bash
cd backend
pip3 install -r requirements-api.txt
```

### Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

## 📁 Project Structure

```
mubasher-deep-extract/
├── frontend/           # Next.js Frontend (Port 3000)
│   ├── app/            # App Router pages
│   ├── components/     # React components
│   └── lib/            # API client
├── backend/            # FastAPI Backend (Port 8000)
│   ├── api.py          # Main API endpoints
│   ├── database.py     # PostgreSQL connection
│   └── extractors/     # Data extraction scripts
├── logs/               # Application logs
├── start_all.sh        # Unified startup script
└── stop_all.sh         # Stop all services
```

---

## ⚠️ Troubleshooting

### "Loading data..." but nothing appears
**Cause:** Backend API is not running.
**Solution:** 
```bash
./start_all.sh
# Or manually:
cd backend && python3 -m uvicorn api:app --port 8000
```

### Port already in use
```bash
# Kill process on port
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Database connection error
```bash
# Ensure PostgreSQL is running
pg_isready
# If not, start it:
brew services start postgresql  # macOS
```

---

## 📊 Database Tables

| Table | Description | Rows |
|-------|-------------|------|
| market_tickers | Stock tickers | 453 |
| ohlc_data | Historical OHLC | 140K+ |
| intraday_data | Intraday bars | 36K+ |
| financial_statements | Quarterly/Annual financials | 5K+ |
| mutual_funds | Fund metadata | 582 |
| nav_history | Fund NAV history | 615K+ |
| major_shareholders | Ownership data | 900+ |
| earnings_calendar | EPS announcements | 2.5K+ |

---

## 🔒 Health Monitoring

The application includes a built-in health check indicator (bottom-right corner) that monitors:
- ✅ Backend API status
- ✅ Database connection
- ✅ Real-time latency

If services go offline, the indicator turns red with instructions to restart.

---

## 📞 Support

For issues or questions, check the logs:
```bash
tail -f logs/api.log       # Backend logs
tail -f logs/frontend.log  # Frontend logs
```
