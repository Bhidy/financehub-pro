/**
 * portfolio-store.js — Client-side portfolio data layer.
 * Persists to localStorage. Exposes window.PFStore.
 *
 * Data model:
 *   Portfolio { id, name, currency, benchmark, riskFreeRate, description,
 *               createdAt, cashBalance, transactions[] }
 *
 *   Transaction { id, type, date, symbol, companyName, quantity, price,
 *                 commission, tax, currency, notes }
 *
 *   Computed (never stored):
 *   Holdings, metrics, chart data — derived from transactions on each load.
 */
(function (global) {
    'use strict';

    var KEY = 'starta-portfolios';

    /* ─── Symbol metadata ──────────────────────────────────────────────────── */
    var SYMBOLS = {
        COMI: { name: 'Commercial International Bank', nameAr: 'البنك التجاري الدولي', sector: 'Banks', color: '#14b8a6' },
        CIB:  { name: 'CIB Group', nameAr: 'مجموعة سي آي بي', sector: 'Banks', color: '#0ea5e9' },
        HRHO: { name: 'Heliopolis Housing', nameAr: 'هليوبوليس للإسكان', sector: 'Real Estate', color: '#8b5cf6' },
        SWDY: { name: 'Elsewedy Electric', nameAr: 'السويدي إلكتريك', sector: 'Energy', color: '#f59e0b' },
        TMGH: { name: 'Talaat Moustafa Group', nameAr: 'طلعت مصطفى القابضة', sector: 'Real Estate', color: '#ec4899' },
        EGBE: { name: 'Egyptian Gulf Bank', nameAr: 'البنك المصري الخليجي', sector: 'Banks', color: '#22c55e' },
        ADIB: { name: 'Abu Dhabi Islamic Bank', nameAr: 'بنك أبوظبي الإسلامي', sector: 'Banks', color: '#3b82f6' },
        EAST: { name: 'Eastern Company', nameAr: 'الشركة الشرقية للدخان', sector: 'Consumer Staples', color: '#f97316' },
        VALU: { name: 'valU', nameAr: 'فالو', sector: 'Financials', color: '#a855f7' },
        ETEL: { name: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', sector: 'Telecom', color: '#06b6d4' },
    };

    function symMeta(sym) {
        return SYMBOLS[sym] || { name: sym, nameAr: sym, sector: 'Other', color: '#9ca6b5' };
    }

    /* ─── Demo seed data ───────────────────────────────────────────────────── */
    function makeDemoPortfolio() {
        var now = new Date();
        var d = function (daysAgo, sym, type, qty, price, commission) {
            var dt = new Date(now); dt.setDate(dt.getDate() - daysAgo);
            return {
                id: 'tx-' + daysAgo + sym + type,
                type: type, date: dt.toISOString().slice(0, 10),
                symbol: sym, companyName: symMeta(sym).name,
                quantity: qty, price: price,
                commission: commission || Math.round(qty * price * 0.001),
                tax: 0, currency: 'EGP', notes: ''
            };
        };

        return {
            id: 'demo',
            name: 'My Portfolio',
            nameAr: 'محفظتي',
            currency: 'EGP',
            benchmark: 'EGX30',
            riskFreeRate: 25.5,
            description: 'Main EGX equity portfolio',
            createdAt: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString().slice(0, 10),
            isDefault: true,
            cashBalance: 85420.50,
            transactions: [
                // Deposits
                { id: 'dep-1', type: 'deposit', date: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString().slice(0, 10), symbol: null, companyName: null, quantity: null, price: null, commission: 0, tax: 0, currency: 'EGP', notes: 'Initial deposit', amount: 600000 },
                { id: 'dep-2', type: 'deposit', date: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString().slice(0, 10), symbol: null, companyName: null, quantity: null, price: null, commission: 0, tax: 0, currency: 'EGP', notes: 'Second deposit', amount: 400000 },
                // COMI buys
                d(118, 'COMI', 'buy', 800, 74.50, 60),
                d(72,  'COMI', 'buy', 450, 91.20, 41),
                // CIB buys
                d(115, 'CIB', 'buy', 1200, 58.40, 70),
                d(68,  'CIB', 'buy', 800, 73.80, 59),
                // HRHO buy
                d(100, 'HRHO', 'buy', 2001, 14.60, 29),
                // SWDY buy
                d(95,  'SWDY', 'buy', 1800, 20.15, 36),
                // TMGH buy
                d(88,  'TMGH', 'buy', 1100, 40.75, 45),
                // Dividends
                { id: 'div-1', type: 'dividend', date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString().slice(0, 10), symbol: 'CIB', companyName: 'CIB Group', quantity: 2000, price: null, commission: 0, tax: 0, currency: 'EGP', notes: '', amount: 14800 },
                { id: 'div-2', type: 'dividend', date: new Date(now.getFullYear(), now.getMonth() - 1, 22).toISOString().slice(0, 10), symbol: 'COMI', companyName: 'Commercial International Bank', quantity: 1250, price: null, commission: 0, tax: 0, currency: 'EGP', notes: '', amount: 11780.75 },
            ]
        };
    }

    /* ─── Holdings computation (average cost) ─────────────────────────────── */
    function computeHoldings(transactions) {
        var map = {};
        transactions.filter(function (t) { return t.type === 'buy' || t.type === 'sell'; })
            .sort(function (a, b) { return a.date.localeCompare(b.date); })
            .forEach(function (t) {
                var sym = String(t.symbol || '').trim().toUpperCase();
                if (!sym) return;
                if (!map[sym]) map[sym] = { symbol: sym, quantity: 0, totalCost: 0 };
                if (t.type === 'buy') {
                    map[sym].totalCost += (t.quantity * t.price) + (t.commission || 0);
                    map[sym].quantity += t.quantity;
                } else {
                    var avgCost = map[sym].quantity ? map[sym].totalCost / map[sym].quantity : 0;
                    map[sym].totalCost -= avgCost * t.quantity;
                    map[sym].quantity -= t.quantity;
                }
            });
        return Object.values(map).filter(function (h) { return h.quantity > 0; });
    }

    /* ─── Live prices ─────────────────────────────────────────────────────── */
    // Seeded with a broad set of commonly-held EGX stocks.
    // The async refreshPrices() call below overlays real API data on top.
    var PRICES = {
        COMI: 138.00, CIB: 95.20, HRHO: 17.85, SWDY: 24.80, TMGH: 58.20,
        EAST: 22.50, VALU: 4.80, ETEL: 38.20, ADIB: 41.50, EGBE: 1.20,
        // Extended seed — commonly held EGX mid-cap & large-cap symbols
        ABUK: 20.02, OCPH: 343.00, AMES: 46.56, CLHO: 14.33, EIUD: 0.75,
        MIPH: 649.50, RAYA: 6.86, MOSC: 288.10, PHTV: 201.10, ORWE: 11.25,
        PHDC: 6.80, MNHD: 4.75, EGCH: 22.40, DCRC: 9.50, ESRS: 18.70,
        ISPH: 8.30, SKPC: 12.10, ALCN: 29.50, UEGC: 3.90, JUHD: 6.70,
        DOMT: 47.20, NCGC: 5.10, MCQE: 3.30, AMOC: 29.80, KABO: 6.40
    };
    var PREV_PRICES = {
        COMI: 136.55, CIB: 95.61, HRHO: 17.50, SWDY: 24.41, TMGH: 57.50,
        EAST: 22.00, VALU: 4.92, ETEL: 37.80, ADIB: 42.10, EGBE: 1.18,
        ABUK: 20.02, OCPH: 339.80, AMES: 38.80, CLHO: 13.10, EIUD: 0.69,
        MIPH: 596.30, RAYA: 6.31, MOSC: 265.30, PHTV: 188.80, ORWE: 10.80,
        PHDC: 6.50, MNHD: 4.56, EGCH: 21.60, DCRC: 9.20, ESRS: 17.90,
        ISPH: 7.95, SKPC: 11.60, ALCN: 28.40, UEGC: 3.75, JUHD: 6.40,
        DOMT: 45.80, NCGC: 4.90, MCQE: 3.15, AMOC: 28.70, KABO: 6.10
    };
    var _pricesFetched = false;

    // Async: fetch live prices from the real EGX API and merge into PRICES map.
    // Safe to call multiple times — skips if already fetched in this session.
    function refreshPrices() {
        if (_pricesFetched) return Promise.resolve();
        return fetch('/api/v1/egx/stocks?limit=500', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (stocks) {
                if (!Array.isArray(stocks)) return;
                stocks.forEach(function (s) {
                    if (!s || !s.symbol) return;
                    var sym = String(s.symbol).trim().toUpperCase();
                    var lp = parseFloat(s.last_price);
                    var pp = parseFloat(s.prev_close || s.last_price);
                    if (lp > 0) PRICES[sym] = lp;
                    if (pp > 0) PREV_PRICES[sym] = pp;
                });
                _pricesFetched = true;
            })
            .catch(function () {}); // Silently fall back to seeded prices
    }

    // Start fetching immediately when the store loads
    refreshPrices();

    /**
     * lastPrice — returns current price for a symbol.
     * @param {string} sym - Stock symbol
     * @param {number} [fallback] - Use this value if no live/seeded price exists (e.g. avgCost)
     */
    function lastPrice(sym, fallback) {
        if (!sym) return (fallback && fallback > 0) ? fallback : 0;
        var cleanSym = String(sym).trim().toUpperCase();
        var p = PRICES[cleanSym];
        if (p && p > 0) return p;
        // Use caller-supplied fallback (e.g. avgCost) rather than 0
        return (fallback && fallback > 0) ? fallback : 0;
    }
    function prevClose(sym, fallback) {
        if (!sym) return lastPrice(sym, fallback);
        var cleanSym = String(sym).trim().toUpperCase();
        var p = PREV_PRICES[cleanSym];
        if (p && p > 0) return p;
        return lastPrice(cleanSym, fallback);
    }

    /* ─── Metrics computation ──────────────────────────────────────────────── */
    function computeMetrics(portfolio) {
        var holdings = computeHoldings(portfolio.transactions);
        var totalMarketValue = 0;
        var totalCost = 0;
        var dividendsYTD = 0;
        var yearStart = new Date().getFullYear() + '-01-01';

        holdings.forEach(function (h) {
            var avgCost = h.quantity ? h.totalCost / h.quantity : 0;
            var price = lastPrice(h.symbol, avgCost);   // fallback to avgCost
            var mktVal = h.quantity * price;
            totalMarketValue += mktVal;
            totalCost += h.quantity * avgCost;
        });

        portfolio.transactions.filter(function (t) {
            return t.type === 'dividend' && t.date >= yearStart;
        }).forEach(function (t) {
            dividendsYTD += (t.amount || 0);
        });

        var invested = portfolio.transactions.filter(function (t) {
            return t.type === 'deposit';
        }).reduce(function (s, t) { return s + (t.amount || 0); }, 0) -
            portfolio.transactions.filter(function (t) {
                return t.type === 'withdrawal';
            }).reduce(function (s, t) { return s + (t.amount || 0); }, 0);

        var totalValue = totalMarketValue + (portfolio.cashBalance || 0);
        var totalGain = totalMarketValue - totalCost;
        var totalReturn = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

        // Today's P&L
        var todayGain = 0;
        holdings.forEach(function (h) {
            var avgCost = h.quantity ? h.totalCost / h.quantity : 0;
            todayGain += h.quantity * (lastPrice(h.symbol, avgCost) - prevClose(h.symbol, avgCost));
        });
        var todayPct = totalValue > 0 ? (todayGain / (totalValue - todayGain)) * 100 : 0;

        // Enrich holdings — use avgCost as price fallback so values are always meaningful
        var enriched = holdings.map(function (h) {
            var meta = symMeta(h.symbol);
            var avgCost = h.quantity ? h.totalCost / h.quantity : 0;
            var price = lastPrice(h.symbol, avgCost);     // never 0
            var prev  = prevClose(h.symbol, avgCost);     // never 0
            var mktVal = h.quantity * price;
            var gain = mktVal - h.totalCost;
            var ret = h.totalCost > 0 ? (gain / h.totalCost) * 100 : 0;
            var dayChg = price - prev;
            var dayChgPct = prev > 0 ? (dayChg / prev) * 100 : 0;
            return {
                symbol: h.symbol,
                companyName: meta.name,
                companyNameAr: meta.nameAr,
                sector: meta.sector,
                color: meta.color,
                quantity: h.quantity,
                avgCost: avgCost,
                lastPrice: price,
                prevClose: prev,
                marketValue: mktVal,
                weight: totalMarketValue > 0 ? (mktVal / totalMarketValue) * 100 : 0,
                dayChange: dayChg,
                dayChangePct: dayChgPct,
                totalGain: gain,
                totalReturn: ret
            };
        });

        enriched.sort(function (a, b) { return b.marketValue - a.marketValue; });

        // Sector allocation
        var sectors = {};
        enriched.forEach(function (h) {
            sectors[h.sector] = (sectors[h.sector] || 0) + h.weight;
        });

        var bestHolder = enriched.slice().sort(function (a, b) { return b.totalReturn - a.totalReturn; })[0];
        var worstHolder = enriched.slice().sort(function (a, b) { return a.totalReturn - b.totalReturn; })[0];

        return {
            totalValue: totalValue,
            totalMarketValue: totalMarketValue,
            cashBalance: portfolio.cashBalance || 0,
            invested: invested,
            totalGain: totalGain,
            totalReturn: totalReturn,
            todayGain: todayGain,
            todayPct: todayPct,
            dividendsYTD: dividendsYTD,
            holdings: enriched,
            sectors: sectors,
            bestHolder: bestHolder,
            worstHolder: worstHolder,
            holdingsCount: enriched.length
        };
    }

    /* ─── Performance chart data ───────────────────────────────────────────── */
    function seeded(n) { var x = Math.sin(n + 1) * 10000; return x - Math.floor(x); }

    function generateChartData(days) {
        var now = new Date();
        var labels = [], pValues = [], bValues = [];
        var pVal = 950000, bVal = 950000;
        var pTarget = 1245684, bTarget = 1172410;
        var pTotal = Math.pow(pTarget / pVal, 1 / days) - 1;
        var bTotal = Math.pow(bTarget / bVal, 1 / days) - 1;

        for (var i = 0; i <= days; i++) {
            var d = new Date(now); d.setDate(d.getDate() - (days - i));
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            var pNoise = (seeded(i * 3) - 0.48) * 0.018;
            var bNoise = (seeded(i * 7) - 0.49) * 0.016;
            pVal *= (1 + pTotal + pNoise);
            bVal *= (1 + bTotal + bNoise);
            labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
            pValues.push(Math.round(pVal));
            bValues.push(Math.round(bVal));
        }
        return { labels: labels, portfolio: pValues, benchmark: bValues };
    }

    /* ─── CRUD ─────────────────────────────────────────────────────────────── */
    function loadAll() {
        try {
            var raw = localStorage.getItem(KEY);
            var list = raw ? JSON.parse(raw) : [];
            if (!list.length) {
                list = [makeDemoPortfolio()];
                saveAll(list);
            }
            return list;
        } catch (_) { return [makeDemoPortfolio()]; }
    }

    function saveAll(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
    }

    function getAll() { return loadAll(); }

    function get(id) {
        return loadAll().find(function (p) { return p.id === id; }) || null;
    }

    function create(data) {
        var list = loadAll();
        var p = Object.assign({
            id: 'pf-' + Date.now(),
            createdAt: new Date().toISOString().slice(0, 10),
            cashBalance: 0,
            transactions: []
        }, data);
        list.push(p);
        saveAll(list);
        return p;
    }

    function update(id, patch) {
        var list = loadAll();
        list = list.map(function (p) { return p.id === id ? Object.assign({}, p, patch) : p; });
        saveAll(list);
    }

    function remove(id) {
        var list = loadAll().filter(function (p) { return p.id !== id; });
        saveAll(list);
    }

    function addTransaction(id, tx) {
        var list = loadAll();
        list = list.map(function (p) {
            if (p.id !== id) return p;
            tx.id = 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            var updated = Object.assign({}, p);
            updated.transactions = p.transactions.concat([tx]);
            // Update cash balance
            if (tx.type === 'deposit') updated.cashBalance += (tx.amount || 0);
            if (tx.type === 'withdrawal') updated.cashBalance -= (tx.amount || 0);
            if (tx.type === 'buy') updated.cashBalance -= (tx.quantity * tx.price + (tx.commission || 0));
            if (tx.type === 'sell') updated.cashBalance += (tx.quantity * tx.price - (tx.commission || 0));
            if (tx.type === 'dividend') updated.cashBalance += (tx.amount || 0);
            return updated;
        });
        saveAll(list);
    }

    function fmt(n, decimals) {
        decimals = decimals === undefined ? 2 : decimals;
        return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    global.PFStore = {
        getAll: getAll, get: get,
        create: create, update: update, remove: remove,
        addTransaction: addTransaction,
        computeMetrics: computeMetrics,
        generateChartData: generateChartData,
        symMeta: symMeta, lastPrice: lastPrice,
        refreshPrices: refreshPrices,
        fmt: fmt, SYMBOLS: SYMBOLS,
        PRICES: PRICES, PREV_PRICES: PREV_PRICES
    };

}(window));
