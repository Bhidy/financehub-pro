import axios from "axios";
import { TickerResponseSchema, Ticker } from "./schemas";

// =============================================================================
// UNIFIED SERVERLESS ARCHITECTURE - HETZNER PRODUCTION
// =============================================================================
// Pointing to Hetzner VPS (Primary Production) via HTTPS
const API_BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1";

if (typeof window !== 'undefined') {
    console.log(`[FinanceHub Pro] Connected to Backend: ${API_BASE_URL}`);
}

export interface UpdateProfileData {
    full_name?: string;
    phone?: string;
}

export interface ChangePasswordData {
    old_password: string;
    new_password: string;
}

export const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor for API calls
// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem("fh_auth_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                // Clear storage
                localStorage.removeItem("fh_auth_token");
                localStorage.removeItem("fh_user");

                // CRITICAL FIX: Mobile-aware redirect
                // Detect if user is on a mobile route and redirect to mobile login
                const currentPath = window.location.pathname;
                const isMobilePath = currentPath.startsWith('/mobile-ai-analyst');
                const loginPath = isMobilePath ? '/mobile-ai-analyst/login' : '/login';

                window.location.href = loginPath;
            }
        }
        return Promise.reject(error);
    }
);

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

// ============================================================================
// ENTERPRISE PORTFOLIO MANAGEMENT
// ============================================================================

export interface PortfolioHolding {
    id: number;
    symbol: string;
    quantity: number;
    average_price: number;
    purchase_date: string | null;
    company_name: string | null;
    sector: string | null;
    current_price: number;
    daily_change_percent: number;
    pnl_percent: number;
    pnl_value: number;
    cost_basis: number;
    current_value: number;
}

export interface PortfolioInsights {
    total_cost: number;
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    daily_pnl: number;
    daily_pnl_percent: number;
    num_holdings: number;
    top_gainer: PortfolioHolding | null;
    top_loser: PortfolioHolding | null;
    concentration_risk: number;
    sector_allocation: { sector: string; value: number; percent: number }[];
}

export interface FullPortfolio {
    portfolio_id: number;
    cash_balance: number;
    market_value: number;
    total_equity: number;
    holdings: PortfolioHolding[];
    insights: PortfolioInsights;
}

export interface HoldingImport {
    symbol: string;
    quantity: number;
    purchase_price: number;
    purchase_date?: string;
}

export const fetchPortfolio = async (): Promise<FullPortfolio> => {
    // Use demo portfolio for unauthenticated users
    const token = typeof window !== 'undefined' ? localStorage.getItem("fh_auth_token") : null;
    if (!token) {
        // Return empty portfolio structure for demo
        return {
            portfolio_id: 0,
            cash_balance: 1000000,
            market_value: 0,
            total_equity: 1000000,
            holdings: [],
            insights: {
                total_cost: 0,
                total_value: 0,
                total_pnl: 0,
                total_pnl_percent: 0,
                daily_pnl: 0,
                daily_pnl_percent: 0,
                num_holdings: 0,
                top_gainer: null,
                top_loser: null,
                concentration_risk: 0,
                sector_allocation: []
            }
        };
    }
    const { data } = await api.get("/portfolio/full");
    return data;
};

export const importPortfolio = async (holdings: HoldingImport[], replaceExisting: boolean = false) => {
    const { data } = await api.post("/portfolio/import", {
        holdings,
        replace_existing: replaceExisting
    });
    return data;
};

export const addHolding = async (holding: {
    symbol: string;
    quantity: number;
    purchase_price: number;
    purchase_date?: string;
}) => {
    const { data } = await api.post("/portfolio/holdings", holding);
    return data;
};

export const updateHolding = async (holdingId: number, updates: {
    quantity?: number;
    purchase_price?: number;
    purchase_date?: string;
}) => {
    const { data } = await api.put(`/portfolio/holdings/${holdingId}`, updates);
    return data;
};

export const deleteHolding = async (holdingId: number) => {
    const { data } = await api.delete(`/portfolio/holdings/${holdingId}`);
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

export const fetchFunds = async (market?: string) => {
    const params = market ? { market } : {};
    const { data } = await api.get("/funds", { params });
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

export const fetchMarketSummary = async () => {
    const { data } = await api.get("/market-summary");
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

export const sendChatMessage = async (
    message: string,
    history: any[],
    session_id?: string | null,
    market?: string,
    deviceFingerprint?: string  // CRITICAL: For guest usage tracking
) => {
    // UNIFIED ARCHITECTURE: Use Python Backend directly
    // This uses the 'api' instance which has the correct Base URL and Auth Headers
    // ENTERPRISE FIX: Include both Market Context and Device Fingerprint for proper tracking
    const headers: Record<string, string> = {};

    if (market) {
        headers['X-Market-Context'] = market;
    }

    // CRITICAL: Send device fingerprint for guest tracking
    // This enables the backend to enforce the 5-question limit for guests
    if (deviceFingerprint) {
        headers['X-Device-Fingerprint'] = deviceFingerprint;
    }

    const config = Object.keys(headers).length > 0 ? { headers } : {};
    const { data } = await api.post("/ai/chat", { message, history, session_id, market }, config);
    return data;
};

export const fetchChatHistory = async (): Promise<any[]> => {
    const { data } = await api.get("/ai/history");
    return data;
};

export const fetchSessionMessages = async (sessionId: string): Promise<any[]> => {
    const { data } = await api.get(`/ai/history/${sessionId}`);
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
// SETTINGS & USER MANAGEMENT
// ============================================================================

export const updateProfile = async (data: UpdateProfileData) => {
    const response = await api.put("/auth/me", data);
    return response.data;
};

export const changePassword = async (data: ChangePasswordData) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
};

export const fetchUsers = async (skip: number = 0, limit: number = 50, search?: string) => {
    const params = { skip, limit, ...(search && { search }) };
    const { data } = await api.get("/auth/users", { params });
    return data;
};

export const adminResetUserPassword = async (userId: number, newPassword: string) => {
    const { data } = await api.post("/auth/admin/reset-user-password", { user_id: userId, new_password: newPassword });
    return data;
};

// ============================================================================
// COMPANY PROFILE API FUNCTIONS
// ============================================================================

export const fetchCompanyProfile = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/profile`);
    return data;
};

export const fetchCompanyFinancials = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/financials`);
    return data;
};

export const fetchCompanyShareholders = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/shareholders`);
    return data;
};

export const fetchCompanyAnalysts = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/analysts`);
    return data;
};

export const fetchCompanyDividends = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/dividends`);
    return data;
};

export const fetchCompanyOwnership = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/ownership`);
    return data;
};

export const fetchCompanyNews = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/news`);
    return data;
};

export const fetchCompanyInsiderTransactions = async (symbol: string) => {
    const { data } = await api.get(`/company/${symbol}/insider-transactions`);
    return data;
};

// ============================================================================
// DIRECT BACKEND ACCESS (Enterprise Fix)
// ============================================================================

export const fetchYahooProfile = async (symbol: string) => {
    // Direct call to verified Python endpoint (Hetzner VPS)
    // This bypasses the faulty Next.js Proxy layer
    // Endpoint: /api/v1/yahoo/stock/{symbol}
    const { data } = await api.get(`/yahoo/stock/${symbol}`);
    return data;
};
