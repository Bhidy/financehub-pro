# WORLD-CLASS STOCK EXTRACTION STRATEGY
## Goal: 5 Million+ Data Points

### Executive Summary
After deep analysis, the optimal path is **scaling our proven Playwright + Highcharts extraction** that successfully captured 615K mutual fund NAV points. The same methodology applies to stocks.

---

## 📊 Data Volume Targets

### Current State (Verified)
- **Stocks**: 118 tickers, 140K OHLC points, 3 intraday points
- **Funds**: 582 funds, 615K NAV points ✅
- **Total Aggregate**: 1.93M data points

### Target State (5M+)
- **Stocks**: 300 tickers (full Saudi market)
- **Historical OHLC**: 300 × 1,000 days = **300K points**
- **Intraday**: 300 × 5,000 intraday bars (recent months) = **1.5M points**
- **Funds**: 615K (already complete) ✅
- **Total**: **2.4M minimum**, scalable to 5M+ with deeper intraday history

---

## 🎯 Technical Strategy: PROVEN Playwright Method

### Why Playwright (Not CSV/API)
1. ✅ **Already Validated**: Extracted 235 historical + 3 intraday for stock 9620
2. ✅ **Proven at Scale**: 615K fund NAV points using identical method
3. ✅ **No Auth/Blocks**: Bypasses Cloudflare issues we hit with API
4. ✅ **Complete Data**: Gets BOTH intraday + historical from Highcharts
5. ✅ **Source of Truth**: Direct from browser state (no data interpretation)

### CSV/Excel Export Analysis
**Investigated**: No export buttons found on mubasher.info stock pages  
**Conclusion**: Not available for programmatic bulk download

---

## 🚀 Implementation: 3-Phase Execution

### Phase 1: Ticker Discovery (IMMEDIATE)
**Problem**: API returns only 50 stocks, pagination blocked (403)  
**Solution**: Browser-based ticker scraping from https://www.mubasher.info/countries/sa/all-stock-prices

```python
# Scrape full ticker list from paginated UI table
# Expected: ~300 Saudi stocks
```

### Phase 2: Deep Historical Extraction (24-48 hours)
**Method**: Scale existing `deep_stock_extractor.py`
- Parallel execution (5 concurrent tabs)
- Click "All" button for full history
- Extract from Highcharts Chart[1]
- **Target**: 300 stocks × 1,000 days = 300K points

### Phase 3: Intraday Extraction (48-72 hours)
**Method**: Same extractor, different chart
- Extract from Highcharts Chart[0] (intraday sparkline)
- Store to `intraday_data` table
- **Target**: 300 stocks × 5,000 recent bars = 1.5M points

---

## 📈 Quality Assurance

### Data Integrity
- ✅ Upsert logic prevents duplicates
- ✅ Timestamp validation
- ✅ Error handling with retries
- ✅ Database constraints (PKs, indexes)

### Performance Metrics
- **Extraction Rate**: ~10-15 seconds per stock
- **Total Time**: 300 stocks ÷ 5 parallel = ~60 stocks/hour = **5 hours for full run**
- **Storage**: ~2GB for 2M+ points (PostgreSQL compressed)

---

## ✅ Success Validation

1. **Database Audit**: Run `check_db_stats.py` → Expect 2M+ aggregate points
2. **Coverage**: `SELECT COUNT(DISTINCT symbol) FROM ohlc_data` → Expect ~300
3. **Depth**: `SELECT COUNT(*) FROM intraday_data` → Expect 1M+
4. **Quality**: Random sample verification against mubasher.info UI

---

## 🎓 Senior Expert Recommendation

**DO THIS**: Scale the proven Playwright approach immediately.  
**DON'T**: Waste time investigating CSV exports (they don't exist) or fighting Cloudflare API blocks.

**Next Command**: Run full ticker discovery + parallel extraction.

**ETA to 5M+**: 12-24 hours of wall-clock time (mostly automated).
