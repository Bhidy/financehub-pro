# 🔄 FinanceHub Pro - Auto-Update System

## Overview

The FinanceHub Pro auto-update system ensures your database and frontend stay synchronized with real-time market data automatically.

---

## 📅 Update Schedule

### During Market Hours (Sun-Thu, 10AM-3PM AST)
| Data Type | Frequency | Purpose |
|-----------|-----------|---------|
| Live Prices | Every 15 min | Real-time stock prices |
| Intraday Bars | Every 5 min | 1-minute OHLC data |

### Daily Updates (After Market Close)
| Time | Data Type | Purpose |
|------|-----------|---------|
| 6:00 PM | Daily OHLC | End-of-day price history |
| 7:00 PM | Fund NAVs | Mutual fund values |
| 8:00 PM | Earnings | Earnings calendar |
| 9:00 PM | Analyst Ratings | Buy/Sell recommendations |
| 9:00 AM & 5:00 PM | Insider Trading | Corporate actions, insider trades |
| 2:00 AM | Full Sync | Complete database refresh |

### Weekly Updates (Friday)
| Time | Data Type | Purpose |
|------|-----------|---------|
| 8:00 PM | Financial Statements | Quarterly/Annual reports |
| 10:00 PM | Major Shareholders | Ownership data |

---

## 🚀 Quick Start

### Option 1: Run Scheduler Manually
```bash
cd "/Users/home/Documents/Info Site/mubasher-deep-extract"
python3 scheduler.py
```

### Option 2: Run as Background Service
```bash
# Start scheduler in background
nohup python3 scheduler.py > logs/scheduler.log 2>&1 &

# Check if running
ps aux | grep scheduler
```

### Option 3: Install as macOS Service (Auto-Start on Boot)
```bash
# Copy launch agent
cp com.financehub.scheduler.plist ~/Library/LaunchAgents/

# Load the service
launchctl load ~/Library/LaunchAgents/com.financehub.scheduler.plist

# Check status
launchctl list | grep financehub
```

#### To Stop the macOS Service:
```bash
launchctl unload ~/Library/LaunchAgents/com.financehub.scheduler.plist
```

---

## 🖥️ Frontend Auto-Refresh

The frontend automatically refreshes data using React Query with these intervals:

| Data Type | Refresh Interval |
|-----------|-----------------|
| Portfolio | Every 5 seconds |
| Tickers | Every 30 seconds |
| Intraday | Every 60 seconds |
| News | Every 2 minutes |
| Health Check | Every 30 seconds |

---

## 📊 Monitoring

### View Scheduler Logs
```bash
tail -f logs/scheduler.log
```

### View Individual Extractor Logs
```bash
tail -f logs/stock_extractor_auto.log
tail -f logs/earnings_extractor_daily.log
```

### Health Check Status
```bash
curl http://localhost:8000/
# Should return: {"status":"ok","db":"connected"}
```

### Database Stats
```bash
curl http://localhost:8000/stats
```

---

## 🛠️ Manual Extractor Commands

Run any extractor manually:

```bash
# Market Data
python3 backend/extractors/stock_extractor.py

# Earnings
python3 backend/extractors/earnings_extractor.py

# Shareholders
python3 backend/extractors/shareholder_extractor.py

# Analyst Ratings
python3 backend/extractors/real_analyst_extractor.py

# Corporate Actions
python3 backend/extractors/real_insider_extractor.py

# Fund NAVs
python3 backend/extractors/fund_history_extractor.py
```

---

## ⚠️ Troubleshooting

### Scheduler Not Running
```bash
# Check if running
ps aux | grep scheduler

# Restart
pkill -f scheduler.py
python3 scheduler.py
```

### Database Connection Error
```bash
# Check PostgreSQL
pg_isready

# Restart if needed
brew services restart postgresql
```

### API Not Responding
```bash
# Restart API
lsof -ti:8000 | xargs kill -9
cd backend && python3 -m uvicorn api:app --port 8000
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `scheduler.py` | Main scheduler script |
| `com.financehub.scheduler.plist` | macOS LaunchAgent config |
| `logs/scheduler.log` | Scheduler activity log |
| `logs/*_auto.log` | Individual extractor logs |
| `start_all.sh` | Unified startup script |
| `stop_all.sh` | Shutdown script |

---

## 🔒 Best Practices

1. **Always run the scheduler** when the system is on
2. **Monitor logs** weekly for errors
3. **Check database stats** regularly via Command Center
4. **Keep PostgreSQL running** on system startup
5. **Use start_all.sh** for consistent startup

---

*Made with ❤️ by Bhidy for FinanceHub Pro Enterprise*
