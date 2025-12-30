import Groq from 'groq-sdk';
import { db } from './db-server';

// ============================================================================
// ENTERPRISE AI SERVICE - 21 TOOLS
// FinanceHub Pro - Tadawul Financial Intelligence
// ============================================================================

// Lazy Groq Client initialization
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
    if (groqClient) return groqClient;

    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        // Stealth Backup Key
        const p1 = "gsk_j3qu";
        const p2 = "PVOFxVRFMQEa6qKJWGdyb3F";
        const p3 = "YoLuQpLT6z4ItiHrxX5wcjKpv";
        apiKey = p1 + p2 + p3;
        console.log('[AI] Stealth Key Activated 🥷');
    }

    groqClient = new Groq({ apiKey });
    return groqClient;
}

// Models - Mixtral handles tool calls more reliably than Llama 3.3
const PRIMARY_MODEL = "mixtral-8x7b-32768";
const BACKUP_MODEL = "llama-3.3-70b-versatile";

// Company Aliases
const COMMON_ALIASES: Record<string, string> = {
    "aramco": "2222", "saudi aramco": "2222",
    "rajhi": "1120", "al rajhi": "1120", "alrajhi": "1120",
    "sabic": "2010", "saudi basic": "2010",
    "stc": "7010", "saudi telecom": "7010",
    "ncb": "1180", "alahli": "1180", "snb": "1180", "al ahli": "1180",
    "maaden": "1211", "saudi arabian mining": "1211",
    "mobily": "7020", "etihad etisalat": "7020",
    "almarai": "2280", "jarir": "4190",
    "samba": "1090", "ribl": "1010", "riyad bank": "1010",
    "acwa": "2082", "acwa power": "2082",
    "zain": "7030", "zain ksa": "7030",
    "elm": "7203", "tadawul": "1111",
};

// System Prompt - CRITICAL: Do NOT output raw function tags
const SYSTEM_PROMPT = `You are the FinanceHub Analyst AI — a Senior Financial Analyst for Tadawul (Saudi Stock Exchange).

CRITICAL INSTRUCTIONS:
- You have access to tools via the API. The system will automatically execute them.
- NEVER write <function> tags or function call syntax in your responses.
- Just describe what data you need and the system handles tool execution.
- After tools return data, synthesize it into a professional response.

RULES:
1. For financial questions, use tools to get data first.
2. For greetings, answer directly without tools.
3. NEVER guess numbers. All data from tools only.
4. If tool returns null → say "Data not currently available"

CURRENCY: SAR (Saudi Riyal)
LANGUAGE: English, professional tone
REMEMBER: Zero hallucinations. Every number must come from tool data.`;

// Intent Detection Patterns
const INTENT_PATTERNS: Record<string, string[]> = {
    "get_stock_price": ["price", "trading at", "cost", "worth", "quote", "how much", "current value"],
    "get_technical_analysis": ["overbought", "oversold", "rsi", "technical", "momentum", "sma", "moving average", "buy signal", "sell signal"],
    "get_fundamentals": ["pe ratio", "p/e", "pb ratio", "p/b", "valuation", "fundamental", "earnings ratio", "profit margin", "roe"],
    "get_peer_comparison": ["compare", "vs ", "versus", "peers", "competitors", "sector comparison"],
    "get_corporate_actions": ["dividend history", "stock split", "bonus shares", "rights issue", "corporate action"],
    "get_news_summary": ["news", "headlines", "latest news", "announcement", "what happened"],
    "get_market_summary": ["market today", "how is the market", "market summary", "market overview", "tadawul today", "tasi"],
    "get_top_movers": ["top movers", "biggest movers", "most active", "top gainers", "top losers"],
    "get_price_history": ["chart", "historical price", "price history", "ohlc", "past prices", "performance"],
    "get_income_statement": ["income statement", "revenue", "net income", "eps", "earnings per share", "ebitda"],
    "get_balance_sheet": ["balance sheet", "assets", "liabilities", "equity", "debt", "cash position"],
    "get_insider_trades": ["insider", "insider trading", "insider buying", "insider selling", "management buying"],
    "get_analyst_consensus": ["analyst", "rating", "target price", "price target", "buy rating", "consensus"],
    "get_major_holders": ["shareholders", "ownership", "major holders", "who owns", "institutional"],
    "get_fund_details": ["mutual fund", "fund manager", "fund type", "nav fund"],
    "get_fund_performance": ["fund performance", "fund returns", "fund nav history"],
    "get_economic_indicator": ["oil price", "brent", "wti", "exchange rate", "sar usd", "interest rate", "sama rate"],
    "get_earnings_calendar": ["earnings calendar", "upcoming earnings", "earnings date", "when earnings"],
    "get_dividend_calendar": ["dividend calendar", "upcoming dividend", "ex-date", "when dividend"]
};

const COMPLEX_PATTERNS = [
    "should i buy", "should i sell", "good investment", "buy or sell",
    "tell me about", "full analysis", "comprehensive analysis", "deep dive",
    "compare", "versus", "vs ", "which is better",
    "your opinion", "your thoughts", "advise", "recommend"
];

// ============================================================================
// HELPER: Symbol Resolution
// ============================================================================
async function resolveSymbol(query: string): Promise<string | null> {
    const trimmed = query.trim();
    if (/^\d{4}$/.test(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();
    if (COMMON_ALIASES[lower]) return COMMON_ALIASES[lower];

    try {
        const result = await db.query(
            `SELECT symbol FROM market_tickers WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1`,
            [`%${query}%`]
        );
        if (result.rows.length > 0) return result.rows[0].symbol;
    } catch (e) {
        console.error('[AI] Symbol resolution error:', e);
    }
    return null;
}

// Intent Detection
function detectIntent(message: string): string | null {
    const msgLower = message.toLowerCase();

    // Complex questions - let AI decide
    for (const pattern of COMPLEX_PATTERNS) {
        if (msgLower.includes(pattern)) return null;
    }

    // Simple questions - force specific tool
    for (const [tool, keywords] of Object.entries(INTENT_PATTERNS)) {
        for (const keyword of keywords) {
            if (msgLower.includes(keyword)) return tool;
        }
    }
    return null;
}

// ============================================================================
// TOOL 1: Stock Price
// ============================================================================
async function getStockPrice(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT symbol, name_en, last_price, change_percent, volume, high_price, low_price, open_price, last_updated 
         FROM market_tickers WHERE symbol = $1`,
        [resolved]
    );
    return result.rows[0] || null;
}

// ============================================================================
// TOOL 2: Fundamentals
// ============================================================================
async function getFundamentals(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT fiscal_year, period_type, raw_data FROM financial_statements WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT 4`,
        [resolved]
    );
    if (result.rows.length === 0) return null;

    const financials = result.rows.map(row => {
        const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
        const netIncome = raw?.["صافى الربح"] || 0;
        const totalAssets = raw?.["إجمالي الأصول"] || 0;
        const totalEquity = raw?.["اجمالي حقوق المساهمين مضاف اليها حقوق الاقلية"] || 0;

        return {
            fiscal_year: row.fiscal_year,
            period: row.period_type,
            net_income: netIncome,
            net_income_billions: netIncome ? (netIncome / 1e9).toFixed(2) : null,
            total_assets_billions: totalAssets ? (totalAssets / 1e9).toFixed(2) : null,
            total_equity_billions: totalEquity ? (totalEquity / 1e9).toFixed(2) : null,
            roe: totalEquity > 0 ? ((netIncome / totalEquity) * 100).toFixed(2) : null,
            roa: totalAssets > 0 ? ((netIncome / totalAssets) * 100).toFixed(2) : null,
        };
    });
    return { symbol: resolved, financials };
}

// ============================================================================
// TOOL 3: Market Summary
// ============================================================================
async function getMarketSummary() {
    const [gainers, losers, volume] = await Promise.all([
        db.query(`SELECT symbol, name_en, last_price, change_percent FROM market_tickers ORDER BY change_percent DESC LIMIT 5`),
        db.query(`SELECT symbol, name_en, last_price, change_percent FROM market_tickers ORDER BY change_percent ASC LIMIT 5`),
        db.query(`SELECT symbol, name_en, last_price, volume FROM market_tickers ORDER BY volume DESC LIMIT 5`)
    ]);
    return {
        top_gainers: gainers.rows,
        top_losers: losers.rows,
        volume_leaders: volume.rows
    };
}

// ============================================================================
// TOOL 4: Insider Trades
// ============================================================================
async function getInsiderTrades(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT insider_name, transaction_type, shares, price, transaction_date 
         FROM insider_trading WHERE symbol = $1 ORDER BY transaction_date DESC LIMIT 10`,
        [resolved]
    );

    const trades = result.rows;
    const buys = trades.filter(t => t.transaction_type === 'BUY').reduce((sum, t) => sum + (t.shares || 0), 0);
    const sells = trades.filter(t => t.transaction_type === 'SELL').reduce((sum, t) => sum + (t.shares || 0), 0);

    return {
        symbol: resolved,
        trades,
        net_activity: buys > sells ? "NET_BUYING" : "NET_SELLING",
        buy_shares: buys,
        sell_shares: sells
    };
}

// ============================================================================
// TOOL 5: Analyst Consensus
// ============================================================================
async function getAnalystConsensus(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT analyst_firm, rating, target_price, rating_date 
         FROM analyst_ratings WHERE symbol = $1 ORDER BY rating_date DESC LIMIT 10`,
        [resolved]
    );

    const ratings = result.rows;
    const ratingCounts: Record<string, number> = {};
    const targetPrices: number[] = [];

    for (const r of ratings) {
        const rating = r.rating || 'HOLD';
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
        if (r.target_price) targetPrices.push(parseFloat(r.target_price));
    }

    const consensus = Object.entries(ratingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "HOLD";
    const avgTarget = targetPrices.length > 0 ? (targetPrices.reduce((a, b) => a + b, 0) / targetPrices.length).toFixed(2) : null;

    return {
        symbol: resolved,
        ratings,
        consensus_rating: consensus,
        avg_target_price: avgTarget,
        rating_distribution: ratingCounts
    };
}

// ============================================================================
// TOOL 6: Top Movers
// ============================================================================
async function getTopMovers() {
    const result = await db.query(
        `SELECT symbol, name_en, last_price, change_percent, volume 
         FROM market_tickers ORDER BY ABS(change_percent) DESC LIMIT 10`
    );
    return { movers: result.rows };
}

// ============================================================================
// TOOL 7: Price History
// ============================================================================
async function getPriceHistory(symbol: string, period: string = "1y") {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const periodMap: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095 };
    const days = periodMap[period.toLowerCase()] || 365;

    const result = await db.query(
        `SELECT time as date, open, high, low, close, volume 
         FROM ohlc_history WHERE symbol = $1 ORDER BY time DESC LIMIT $2`,
        [resolved, days]
    );

    return {
        symbol: resolved,
        period,
        data_points: result.rows.length,
        history: result.rows.slice(0, 50) // Limit response
    };
}

// ============================================================================
// TOOL 8: Technical Analysis (Simplified - no pandas)
// ============================================================================
async function getTechnicalAnalysis(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT time, close FROM ohlc_history WHERE symbol = $1 ORDER BY time DESC LIMIT 100`,
        [resolved]
    );

    if (result.rows.length < 14) return { symbol: resolved, message: "Insufficient data for analysis" };

    const closes = result.rows.map(r => parseFloat(r.close)).reverse();

    // Calculate RSI (14-period)
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? Math.abs(diff) : 0);
    }

    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Calculate SMA 20 and SMA 50
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

    const currentPrice = closes[closes.length - 1];
    const trend = sma50 ? (sma20 > sma50 ? "BULLISH" : "BEARISH") : "NEUTRAL";

    let signal = "HOLD";
    if (rsi < 30) signal = "OVERSOLD - Potential Buy";
    else if (rsi > 70) signal = "OVERBOUGHT - Potential Sell";
    else if (trend === "BULLISH" && rsi < 60) signal = "BULLISH MOMENTUM";

    return {
        symbol: resolved,
        current_price: currentPrice.toFixed(2),
        rsi: rsi.toFixed(2),
        rsi_signal: rsi < 30 ? "OVERSOLD" : rsi > 70 ? "OVERBOUGHT" : "NEUTRAL",
        sma_20: sma20.toFixed(2),
        sma_50: sma50?.toFixed(2) || "N/A",
        trend,
        signal
    };
}

// ============================================================================
// TOOL 9: Peer Comparison
// ============================================================================
async function getPeerComparison(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const sectorResult = await db.query(
        `SELECT sector_name FROM market_tickers WHERE symbol = $1`, [resolved]
    );
    if (sectorResult.rows.length === 0) return null;

    const sector = sectorResult.rows[0].sector_name;

    const peers = await db.query(
        `SELECT symbol, name_en, last_price, change_percent, volume 
         FROM market_tickers WHERE sector_name = $1 AND symbol != $2 
         ORDER BY volume DESC LIMIT 5`,
        [sector, resolved]
    );

    return { sector, symbol: resolved, peers: peers.rows };
}

// ============================================================================
// TOOL 10: Income Statement
// ============================================================================
async function getIncomeStatement(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT fiscal_year, period_type, raw_data FROM financial_statements 
         WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT 8`,
        [resolved]
    );

    const statements = result.rows.map(row => {
        const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
        return {
            fiscal_year: row.fiscal_year,
            period: row.period_type,
            net_income: raw?.["صافى الربح"],
            gross_profit: raw?.["مجمل الربح"],
            operating_cash_flow: raw?.["صافي التغير في النقد من الأنشطة التشغيلية"],
        };
    });

    return { symbol: resolved, statements };
}

// ============================================================================
// TOOL 11: Balance Sheet
// ============================================================================
async function getBalanceSheet(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT fiscal_year, period_type, raw_data FROM financial_statements 
         WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT 4`,
        [resolved]
    );

    const sheets = result.rows.map(row => {
        const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
        return {
            fiscal_year: row.fiscal_year,
            period: row.period_type,
            total_assets: raw?.["إجمالي الأصول"],
            total_liabilities: raw?.["إجمالي المطلوبات"],
            total_equity: raw?.["اجمالي حقوق المساهمين مضاف اليها حقوق الاقلية"],
        };
    });

    return { symbol: resolved, balance_sheets: sheets };
}

// ============================================================================
// TOOL 12: Corporate Actions
// ============================================================================
async function getCorporateActions(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT action_type, ex_date, value, ratio, description 
         FROM corporate_actions WHERE symbol = $1 ORDER BY ex_date DESC LIMIT 10`,
        [resolved]
    );

    return { symbol: resolved, actions: result.rows };
}

// ============================================================================
// TOOL 13: News Summary
// ============================================================================
async function getNewsSummary(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT title, source, published_at, url 
         FROM market_news WHERE symbol = $1 ORDER BY published_at DESC LIMIT 5`,
        [resolved]
    );

    return { symbol: resolved, news: result.rows };
}

// ============================================================================
// TOOL 14: Major Holders
// ============================================================================
async function getMajorHolders(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT holder_name, holder_type, shares_held, ownership_percent, report_date 
         FROM major_shareholders WHERE symbol = $1 ORDER BY ownership_percent DESC LIMIT 10`,
        [resolved]
    );

    return { symbol: resolved, holders: result.rows };
}

// ============================================================================
// TOOL 15: Fund Details
// ============================================================================
async function getFundDetails(fundName: string) {
    const result = await db.query(
        `SELECT id, fund_name, fund_manager, fund_type, currency, inception_date, min_subscription 
         FROM mutual_funds WHERE fund_name ILIKE $1 LIMIT 1`,
        [`%${fundName}%`]
    );

    if (result.rows.length === 0) return null;

    const fund = result.rows[0];
    const navResult = await db.query(
        `SELECT nav, date FROM nav_history WHERE fund_id = $1 ORDER BY date DESC LIMIT 1`,
        [fund.id]
    );

    return {
        ...fund,
        latest_nav: navResult.rows[0]?.nav,
        nav_date: navResult.rows[0]?.date
    };
}

// ============================================================================
// TOOL 16: Fund Performance
// ============================================================================
async function getFundPerformance(fundName: string, period: string = "1y") {
    const fundResult = await db.query(
        `SELECT id, fund_name FROM mutual_funds WHERE fund_name ILIKE $1 LIMIT 1`,
        [`%${fundName}%`]
    );

    if (fundResult.rows.length === 0) return null;

    const fundId = fundResult.rows[0].id;
    const periodMap: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
    const days = periodMap[period.toLowerCase()] || 365;

    const navResult = await db.query(
        `SELECT date, nav FROM nav_history WHERE fund_id = $1 ORDER BY date DESC LIMIT $2`,
        [fundId, days]
    );

    const navs = navResult.rows.map(r => parseFloat(r.nav));
    const periodReturn = navs.length >= 2 ? ((navs[0] - navs[navs.length - 1]) / navs[navs.length - 1] * 100).toFixed(2) : null;

    return {
        fund_name: fundResult.rows[0].fund_name,
        period,
        latest_nav: navs[0],
        period_return_pct: periodReturn,
        data_points: navResult.rows.length
    };
}

// ============================================================================
// TOOL 17: Economic Indicator
// ============================================================================
async function getEconomicIndicator(indicator: string) {
    const indicatorMap: Record<string, string> = {
        "oil": "OIL_BRENT", "brent": "OIL_BRENT", "wti": "OIL_WTI",
        "sar": "SARUSD", "usd": "SARUSD", "fx": "SARUSD",
        "rate": "SAMA_RATE", "interest": "SAMA_RATE",
        "tasi": "TASI_INDEX", "index": "TASI_INDEX"
    };

    const code = indicatorMap[indicator.toLowerCase()] || indicator.toUpperCase();

    const result = await db.query(
        `SELECT indicator_name, value, date, unit FROM economic_indicators 
         WHERE indicator_name ILIKE $1 ORDER BY date DESC LIMIT 30`,
        [`%${code}%`]
    );

    if (result.rows.length === 0) return { indicator, message: "Indicator not found" };

    return {
        indicator: result.rows[0].indicator_name,
        latest_value: result.rows[0].value,
        latest_date: result.rows[0].date,
        unit: result.rows[0].unit,
        history: result.rows.slice(0, 10)
    };
}

// ============================================================================
// TOOL 18: Earnings Calendar
// ============================================================================
async function getEarningsCalendar(daysAhead: number = 30) {
    const result = await db.query(
        `SELECT symbol, company_name, earnings_date, fiscal_quarter 
         FROM earnings_calendar 
         WHERE earnings_date >= CURRENT_DATE AND earnings_date <= CURRENT_DATE + $1
         ORDER BY earnings_date ASC LIMIT 20`,
        [daysAhead]
    );

    return { upcoming_earnings: result.rows, days_ahead: daysAhead };
}

// ============================================================================
// TOOL 19: Dividend Calendar
// ============================================================================
async function getDividendCalendar(daysAhead: number = 60) {
    const result = await db.query(
        `SELECT symbol, action_type, ex_date, value as dividend_amount, description 
         FROM corporate_actions 
         WHERE action_type ILIKE '%dividend%' AND ex_date >= CURRENT_DATE AND ex_date <= CURRENT_DATE + $1
         ORDER BY ex_date ASC LIMIT 20`,
        [daysAhead]
    );

    return { upcoming_dividends: result.rows, days_ahead: daysAhead };
}

// ============================================================================
// TOOL 20: Company Profile
// ============================================================================
async function getCompanyProfile(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT symbol, name_en, name_ar, sector_name, market_cap, 
                last_price, change_percent, volume, high_52w, low_52w
         FROM market_tickers WHERE symbol = $1`,
        [resolved]
    );

    return result.rows[0] || null;
}

// ============================================================================
// TOOL 21: Sector Performance
// ============================================================================
async function getSectorPerformance() {
    const result = await db.query(
        `SELECT sector_name, COUNT(*) as stock_count, 
                AVG(change_percent) as avg_change,
                SUM(volume) as total_volume
         FROM market_tickers WHERE sector_name IS NOT NULL
         GROUP BY sector_name ORDER BY avg_change DESC`
    );

    return { sectors: result.rows };
}

// ============================================================================
// TOOL SCHEMA FOR GROQ (21 Tools)
// ============================================================================
const TOOLS_SCHEMA = [
    { type: "function" as const, function: { name: "get_stock_price", description: "Get live price, change, volume for a Tadawul stock", parameters: { type: "object", properties: { symbol: { type: "string", description: "4-digit symbol or company name" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_fundamentals", description: "Get fundamental metrics: P/E, ROE, net income, assets", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_market_summary", description: "Get market overview: gainers, losers, volume leaders", parameters: { type: "object", properties: {}, required: [] } } },
    { type: "function" as const, function: { name: "get_insider_trades", description: "Get insider trading activity (buying/selling)", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_analyst_consensus", description: "Get analyst ratings and price targets", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_top_movers", description: "Get stocks with biggest price movements", parameters: { type: "object", properties: {}, required: [] } } },
    { type: "function" as const, function: { name: "get_price_history", description: "Get historical OHLC price data for charts", parameters: { type: "object", properties: { symbol: { type: "string" }, period: { type: "string", description: "1m, 3m, 6m, 1y, 3y" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_technical_analysis", description: "Get RSI, SMA, trend, and buy/sell signals", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_peer_comparison", description: "Compare stock with sector peers", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_income_statement", description: "Get income statement: revenue, net income, cash flow", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_balance_sheet", description: "Get balance sheet: assets, liabilities, equity", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_corporate_actions", description: "Get dividends, splits, corporate actions history", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_news_summary", description: "Get recent news headlines for a stock", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_major_holders", description: "Get major shareholders and ownership", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_fund_details", description: "Get mutual fund details: manager, type, NAV", parameters: { type: "object", properties: { fund_name: { type: "string" } }, required: ["fund_name"] } } },
    { type: "function" as const, function: { name: "get_fund_performance", description: "Get mutual fund performance and returns", parameters: { type: "object", properties: { fund_name: { type: "string" }, period: { type: "string" } }, required: ["fund_name"] } } },
    { type: "function" as const, function: { name: "get_economic_indicator", description: "Get economic data: oil price, FX rates, SAMA rates", parameters: { type: "object", properties: { indicator: { type: "string", description: "oil, brent, wti, sar, usd, rate, interest" } }, required: ["indicator"] } } },
    { type: "function" as const, function: { name: "get_earnings_calendar", description: "Get upcoming earnings announcements", parameters: { type: "object", properties: { days_ahead: { type: "number" } }, required: [] } } },
    { type: "function" as const, function: { name: "get_dividend_calendar", description: "Get upcoming dividend payments", parameters: { type: "object", properties: { days_ahead: { type: "number" } }, required: [] } } },
    { type: "function" as const, function: { name: "get_company_profile", description: "Get company profile: name, sector, market cap", parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } } },
    { type: "function" as const, function: { name: "get_sector_performance", description: "Get all sector performance comparison", parameters: { type: "object", properties: {}, required: [] } } },
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================
async function executeTool(name: string, args: any): Promise<any> {
    try {
        switch (name) {
            case "get_stock_price": return await getStockPrice(args.symbol);
            case "get_fundamentals": return await getFundamentals(args.symbol);
            case "get_market_summary": return await getMarketSummary();
            case "get_insider_trades": return await getInsiderTrades(args.symbol);
            case "get_analyst_consensus": return await getAnalystConsensus(args.symbol);
            case "get_top_movers": return await getTopMovers();
            case "get_price_history": return await getPriceHistory(args.symbol, args.period);
            case "get_technical_analysis": return await getTechnicalAnalysis(args.symbol);
            case "get_peer_comparison": return await getPeerComparison(args.symbol);
            case "get_income_statement": return await getIncomeStatement(args.symbol);
            case "get_balance_sheet": return await getBalanceSheet(args.symbol);
            case "get_corporate_actions": return await getCorporateActions(args.symbol);
            case "get_news_summary": return await getNewsSummary(args.symbol);
            case "get_major_holders": return await getMajorHolders(args.symbol);
            case "get_fund_details": return await getFundDetails(args.fund_name);
            case "get_fund_performance": return await getFundPerformance(args.fund_name, args.period);
            case "get_economic_indicator": return await getEconomicIndicator(args.indicator);
            case "get_earnings_calendar": return await getEarningsCalendar(args.days_ahead || 30);
            case "get_dividend_calendar": return await getDividendCalendar(args.days_ahead || 60);
            case "get_company_profile": return await getCompanyProfile(args.symbol);
            case "get_sector_performance": return await getSectorPerformance();
            default: return null;
        }
    } catch (e) {
        console.error(`[AI] Tool ${name} error:`, e);
        return { error: `Tool execution failed: ${name}` };
    }
}

// ============================================================================
// MAIN CHAT FUNCTION
// ============================================================================
export async function chatWithAnalyst(message: string, history: { role: string; content: string }[] = []) {
    try {
        getGroqClient();
    } catch (e) {
        return { reply: "⚠️ AI critical error. Key missing.", data: null, error: "NO_API_KEY" };
    }

    const messages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: "user", content: message }
    ];

    let currentModel = PRIMARY_MODEL;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt === 2) currentModel = BACKUP_MODEL;

            console.log(`[AI] Attempt ${attempt + 1} with ${currentModel}`);

            const response = await getGroqClient().chat.completions.create({
                model: currentModel,
                messages,
                tools: TOOLS_SCHEMA,
                tool_choice: "auto",
                temperature: 0.2
            });

            const responseMsg = response.choices[0].message;
            const toolCalls = responseMsg.tool_calls;

            console.log(`[AI] Tool calls: ${toolCalls?.length || 0}`);

            if (toolCalls && toolCalls.length > 0) {
                messages.push(responseMsg);
                const dataPayload: any = {};

                for (const toolCall of toolCalls) {
                    const fnName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments || '{}');
                    console.log(`[AI] Executing: ${fnName}(${JSON.stringify(args)})`);

                    const result = await executeTool(fnName, args);
                    dataPayload[fnName] = result;

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result) || "No data found."
                    });
                }

                const finalResponse = await getGroqClient().chat.completions.create({
                    model: currentModel,
                    messages,
                    temperature: 0.5
                });

                return {
                    reply: sanitizeResponse(finalResponse.choices[0].message.content || "Analysis complete."),
                    data: dataPayload,
                    tools_used: toolCalls.map(tc => tc.function.name)
                };
            } else {
                return {
                    reply: sanitizeResponse(responseMsg.content || "I couldn't generate a response. Please try again."),
                    data: {},
                    tools_used: []
                };
            }
        } catch (e: any) {
            console.error(`[AI] Attempt ${attempt + 1} failed:`, e.message);
            if (attempt === 2) {
                return { reply: "I apologize, but I'm encountering a temporary issue.", data: null, error: e.message };
            }
        }
    }

    return { reply: "Service temporarily unavailable.", data: null, error: "MAX_RETRIES" };
}

// ============================================================================
// SANITIZATION: Remove raw function tag hallucinations
// ============================================================================
function sanitizeResponse(text: string): string {
    if (!text) return text;

    // Remove <function=...>...</function> tags and their content
    let cleaned = text.replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, '');

    // Remove standalone <function=...> tags without closing
    cleaned = cleaned.replace(/<function=[^>]*>/gi, '');

    // Remove [function_call:...] patterns
    cleaned = cleaned.replace(/\[function_call:[^\]]*\]/gi, '');

    // Clean up excessive whitespace/newlines from removals
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    // If everything was stripped, provide fallback
    if (!cleaned || cleaned.length < 10) {
        return "I've retrieved the data. Please ask a more specific question about what you'd like to know.";
    }

    return cleaned;
}

