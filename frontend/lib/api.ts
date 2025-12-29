import axios from "axios";
import { env } from "./env";
import { TickerResponseSchema, Ticker } from "./schemas";

// FIXED: Always use the correct API URL with /api/v1 prefix
// Previous issue: NEXT_PUBLIC_API_URL was set without /api/v1, causing 404 errors
const PRODUCTION_API_BASE = "https://bhidy-financehub-api.hf.space/api/v1";

// For development, allow override but production always uses the correct URL
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? (env.NEXT_PUBLIC_API_URL || PRODUCTION_API_BASE)
    : PRODUCTION_API_BASE;

if (typeof window !== 'undefined') {
    console.log(`[FinanceHub v1.0.9] API Base URL: ${API_BASE_URL}`);
}

export const api = axios.create({
    baseURL: API_BASE_URL,
});

export type { Ticker } from "./schemas";

export type OHLC = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface CorporateAction {
    id: number;
    symbol: string;
    action_type: string;
    ex_date: string;
    value: number | string | null;
    ratio: number | string | null;
    description: string;
}

export interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_type: string;
    manager_name: string;
    latest_nav: number | string;
    expense_ratio: number | string;
    minimum_investment: number | string;
    last_update?: string;
    sharpe_ratio?: number;
    standard_deviation?: number;
    ytd_return?: number;
    one_year_return?: number;
    three_year_return?: number;
    five_year_return?: number;
}

export interface InsiderTransaction {
    id: number;
    symbol: string;
    insider_name: string;
    insider_role: string;
    transaction_type: 'BUY' | 'SELL';
    transaction_date: string;
    filing_date: string;
    shares: number;
    price: number;
    value: number | string;
    shares_held_after: number;
}

export interface AnalystRating {
    id: number;
    symbol: string;
    analyst_firm: string;
    analyst_name: string;
    rating: string;
    price_target: number | string;
    price_at_rating: number | string;
    rating_date: string;
    target_upside: number | string;
    previous_rating?: string;
}

export interface EconomicIndicator {
    id?: number;
    indicator_code: string;
    value: string | number;
    unit: string;
    date: string;
    source: string;

}

export const fetchTickers = async (): Promise<Ticker[]> => {
    const { data } = await api.get("/tickers");
    // Zod Validation: If backend returns invalid data, this throws an error explanation
    return TickerResponseSchema.parse(data);
};

export const fetchHistory = async (symbol: string): Promise<OHLC[]> => {
    const { data } = await api.get(`/history/${symbol}`);
    return data;
};

export const fetchOHLC = async (symbol: string, period: string = "1y"): Promise<OHLC[]> => {
    const { data } = await api.get(`/ohlc/${symbol}`, { params: { period } });
    return data;
};

export const fetchFinancials = async (symbol: string) => {
    const { data } = await api.get(`/financials/${symbol}`);
    return data;
};

export const fetchNews = async (symbol?: string) => {
    const params = symbol ? { symbol } : {};
    const { data } = await api.get(`/news`, { params });
    return data;
};

export const fetchSectors = async () => {
    const { data } = await api.get("/sectors");
    return data;
};

export const fetchScreener = async (params: Record<string, string | number>) => {
    const { data } = await api.get("/screener", { params });
    return data;
};

export const fetchPortfolio = async () => {
    // Use demo portfolio endpoint (no auth required for paper trading)
    const { data } = await api.get("/portfolio/demo");
    return data;
};

export const executeTrade = async (symbol: string, quantity: number, side: 'BUY' | 'SELL') => {
    const { data } = await api.post("/trade", { symbol, quantity, side });
    return data;
};

export const fetchAIBriefing = async () => {
    const { data } = await api.get("/ai/briefing");
    return data;
};

export const fetchCorporateActions = async (symbol?: string) => {
    // Attempt to pass symbol as param, but also filter client-side just in case backend ignores it
    const params = symbol ? { symbol } : {};
    const { data } = await api.get("/corporate-actions", { params });

    if (symbol && Array.isArray(data)) {
        return data.filter((a: any) => a.symbol === symbol);
    }
    return data;
};

export const fetchEconomicIndicators = async (limit: number = 365) => {
    const { data } = await api.get("/economic-indicators", { params: { limit } });
    return data;
};

export const fetchFunds = async () => {
    const { data } = await api.get("/funds");
    return data;
};

export const fetchFund = async (fundId: string): Promise<MutualFund> => {
    const { data } = await api.get(`/funds/${fundId}`);
    return data;
};

export const fetchFundNav = async (fundId: string, limit: number = 3650) => {
    const { data } = await api.get(`/funds/${fundId}/nav`, { params: { limit } });
    return data;
};

export const fetchInsiderTrading = async (limit: number = 100) => {
    const { data } = await api.get("/insider-trading", { params: { limit } });
    return data;
};

export const fetchAnalystRatings = async (limit: number = 100) => {
    const { data } = await api.get("/analyst-ratings", { params: { limit } });
    return data;
};

export const fetchMarketBreadth = async (limit: number = 30) => {
    const { data } = await api.get("/market-breadth", { params: { limit } });
    return data;
};

// ============================================================================
// NEW FUNCTIONS (Priorities 1 & 2)
// ============================================================================

export const fetchRatios = async (symbol: string) => {
    const { data } = await api.get(`/ratios`, { params: { symbol, limit: 1 } });
    // Keep it consistent with other array returns, or single object if logic dictates
    // Backend likely returns a list.
    return data;
};

export const fetchFairValues = async (symbol?: string) => {
    const params = symbol ? { symbol } : {};
    const { data } = await api.get(`/fair-values`, { params });
    return data;
};

export const fetchEtfs = async () => {
    const { data } = await api.get(`/etfs`);
    return data;
};

export const fetchOrderBook = async (symbol: string) => {
    // Note: This endpoint will be created in backend/api.py
    const { data } = await api.get(`/order-book/${symbol}`);
    return data;
};

export const sendChatMessage = async (message: string, history: any[]) => {
    const { data } = await api.post("/ai/chat", { message, history });
    return data;
};

export const fetchEarnings = async (symbol?: string, limit: number = 200) => {
    const params = symbol ? { symbol, limit } : { limit };
    const { data } = await api.get("/earnings", { params });
    return data;
};

export const fetchShareholders = async (symbol?: string, limit: number = 200) => {
    const params = symbol ? { symbol, limit } : { limit };
    const { data } = await api.get("/shareholders", { params });
    return data;
};

export const fetchIntraday = async (symbol: string, interval: string = "1m", limit: number = 300) => {
    const { data } = await api.get(`/intraday/${symbol}`, { params: { interval, limit } });
    return data;
};

// ============================================================================
// USER FEATURES (Watchlists & Alerts)
// ============================================================================

export const fetchMyWatchlists = async () => {
    const { data } = await api.get("/user/watchlists");
    return data;
};

export const createWatchlist = async (name: string) => {
    const { data } = await api.post("/user/watchlists", { name });
    return data;
};

export const deleteWatchlist = async (id: string) => {
    const { data } = await api.delete(`/user/watchlists/${id}`);
    return data;
};

export const addWatchlistItem = async (watchlistId: string, symbol: string) => {
    const { data } = await api.post(`/user/watchlists/${watchlistId}/items`, { symbol });
    return data;
};

export const removeWatchlistItem = async (watchlistId: string, symbol: string) => {
    const { data } = await api.delete(`/user/watchlists/${watchlistId}/items/${symbol}`);
    return data;
};

export const fetchMyAlerts = async () => {
    const { data } = await api.get("/user/alerts");
    return data;
};

export const createAlert = async (symbol: string, target_price: number, condition: 'ABOVE' | 'BELOW') => {
    const { data } = await api.post("/user/alerts", { symbol, target_price, condition });
    return data;
};

export const deleteAlert = async (id: string) => {
    const { data } = await api.delete(`/user/alerts/${id}`);
    return data;
};

// ============================================================================
// COMPANY PROFILE API FUNCTIONS
// ============================================================================

export const fetchCompanyProfile = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/profile`);
    return data;
};

export const fetchCompanyFinancials = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/financials`);
    return data;
};

export const fetchCompanyShareholders = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/shareholders`);
    return data;
};

export const fetchCompanyAnalysts = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/analysts`);
    return data;
};

export const fetchCompanyDividends = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/dividends`);
    return data;
};

export const fetchCompanyOwnership = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/ownership`);
    return data;
};

export const fetchCompanyNews = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/news`);
    return data;
};

export const fetchCompanyInsiderTransactions = async (symbol: string) => {
    const { data } = await api.get(`/api/company/${symbol}/insider-transactions`);
    return data;
};
