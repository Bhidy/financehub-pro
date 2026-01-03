# EGX Daily Data Scheduler

## Cron Job Setup

### Location
- **Script:** `/Users/home/Documents/Info Site/mubasher-deep-extract/scripts/egx_daily_update.sh`
- **Log Dir:** `/Users/home/Documents/Info Site/mubasher-deep-extract/logs/`

### Installation

Add to your crontab with `crontab -e`:

```bash
# EGX Daily Update - 5 AM Egypt Time (UTC+2 = 3 AM UTC)
0 3 * * * /Users/home/Documents/Info\ Site/mubasher-deep-extract/scripts/egx_daily_update.sh

# Alternative: 5 AM Cairo Time (during EET, winter)
# 0 3 * * * /Users/home/Documents/Info\ Site/mubasher-deep-extract/scripts/egx_daily_update.sh
```

### Manual Trigger

```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract
./scripts/egx_daily_update.sh
```

### Monitoring

```bash
# Watch logs in real-time
tail -f logs/egx_daily_$(date +%Y%m%d).log

# Check last run
ls -la logs/egx_daily_*.log | tail -5
```
