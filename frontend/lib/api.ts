import axios from "axios";
import { TickerResponseSchema, Ticker } from "./schemas";

// =============================================================================
// UNIFIED SERVERLESS ARCHITECTURE - HETZNER PRODUCTION
// =============================================================================
const DIRECT_BACKEND_BASE_URL = "https://starta.46-224-223-172.sslip.io/api/v1";
const PROXY_API_BASE_URL = "/api/proxy";
const API_BASE_URL = typeof window === "undefined" ? DIRECT_BACKEND_BASE_URL : PROXY_API_BASE_URL;
const ACCESS_TOKEN_KEY = "fh_auth_token";
const USER_KEY = "fh_user";
const REFRESH_TOKEN_KEY = "fh_refresh_token";

if (typeof window !== 'undefined') {
    console.log(`[FinanceHub Pro] API gateway: ${API_BASE_URL}`);
}

const LOCAL_API_BASE_URL = typeof window === "undefined" ? "http://localhost:3000/api/v1" : "/api/v1";
export const localApi = axios.create({
    baseURL: LOCAL_API_BASE_URL,
    withCredentials: true,
});

export interface UpdateProfileData {
    full_name?: string;
    phone?: string;
}

export interface ChangePasswordData {
    old_password: string;
    new_password: string;
}

export interface NotificationPreferences {
    price_alerts: boolean;
    volume_spikes: boolean;
    weekly_report: boolean;
    academy_news: boolean;
    push_notifs: boolean;
    security_alert: boolean;
}

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
    const { data } = await api.get("/user/notifications/preferences");
    return data;
};

export const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const { data } = await api.put("/user/notifications/preferences", prefs);
    return data;
};


export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

const clearAuthStorage = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("fh_chat_session"); // Prevent session cross-contamination
};

const redirectToLogin = () => {
    if (typeof window === "undefined") return;
    if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
    }
};

// Request interceptor for API calls
// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem(ACCESS_TOKEN_KEY);
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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = String(originalRequest?.url || "");
        const isAuthEntryRequest =
            requestUrl.includes('/auth/token') ||
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/signup') ||
            requestUrl.includes('/auth/register') ||
            requestUrl.includes('/auth/bootstrap-refresh');

        if (
            error.response &&
            error.response.status === 401 &&
            originalRequest &&
            !originalRequest._retry
        ) {
            // Invalid credentials on login/register should not force global logout redirects.
            if (isAuthEntryRequest) return Promise.reject(error);

            // If no auth token exists, this is a true guest/unauthenticated request.
            if (typeof window !== "undefined" && !localStorage.getItem(ACCESS_TOKEN_KEY)) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Refresh using both HttpOnly cookie and local fallback token for cross-domain reliability.
                const refreshToken =
                    typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
                const refreshPayload = refreshToken ? { refresh_token: refreshToken } : {};
                const { data } = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    refreshPayload,
                    { withCredentials: true }
                );

                const newToken = data.access_token;
                if (!newToken) {
                    throw new Error("Refresh endpoint returned no access token");
                }

                if (typeof window !== 'undefined') {
                    localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
                    if (data?.refresh_token) {
                        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
                    }
                    if (data?.user) {
                        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                    }
                }

                api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

                processQueue(null, newToken);
                return api(originalRequest);
            } catch (err) {
                processQueue(err, null);

                // Only hard-logout when refresh explicitly says token is invalid/expired.
                // Network/transient errors must not force sign-out.
                if ((err as any)?.response?.status === 401) {
                    clearAuthStorage();
                    redirectToLogin();
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
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

export interface MarketNewsItem {
    id: number;
    symbol: string | null;
    headline: string;
    source: string | null;
    url: string;
    published_at: string;
    sentiment_score?: number | null;
    article_body?: string | null;
    image_url?: string | null;
    published_date_raw?: string | null;
    source_section?: string | null;
    source_country?: string | null;
    external_id?: string | null;
}

export interface EgxDashboardStock {
    symbol: string;
    nameEn: string;
    sectorName: string;
    lastPrice: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    lastUpdated: string | null;
}

export interface EgxDashboardSector {
    sectorName: string;
    performance: number;
    stockCount: number;
    totalVolume: number;
}

export interface EgxIndexHistoryPoint {
    time: number;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface EgxIndexFeed {
    available: boolean;
    symbol: string;
    label: string;
    source: string;
    currency: string;
    updateMode: string | null;
    delaySeconds: number | null;
    value: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    lastUpdated: string | null;
    history: EgxIndexHistoryPoint[];
    note: string;
}

export interface EgxDashboardSnapshot {
    marketStatus: "OPEN" | "CLOSED" | "UNKNOWN";
    totalStocks: number;
    gainers: number;
    losers: number;
    unchanged: number;
    totalVolume: number;
    topGainers: EgxDashboardStock[];
    topLosers: EgxDashboardStock[];
    mostActive: EgxDashboardStock[];
    sectors: EgxDashboardSector[];
    retrievedAt: string;
    freshestUpdateAt: string | null;
    dataQuality: {
        staleThresholdMinutes: number;
        staleSymbols: string[];
        issues: string[];
    };
    indexFeed: EgxIndexFeed;
}

type LooseObject = Record<string, unknown>;

const asObject = (value: unknown): LooseObject | null =>
    typeof value === "object" && value !== null ? (value as LooseObject) : null;

const asNumber = (value: unknown, fallback = 0): number => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const asNullableNumber = (value: unknown): number | null => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
};

const asInt = (value: unknown, fallback = 0): number => Math.max(0, Math.trunc(asNumber(value, fallback)));

const isEgxSymbol = (value: unknown): value is string =>
    typeof value === "string" && /^[A-Z]{3,5}$/.test(value.toUpperCase());

const normalizeEgxStock = (raw: unknown): EgxDashboardStock | null => {
    const item = asObject(raw);
    if (!item) return null;

    const symbolRaw = item.symbol;
    if (!isEgxSymbol(symbolRaw)) return null;
    const symbol = symbolRaw.toUpperCase();

    const nameEn = typeof item.name_en === "string" && item.name_en.trim()
        ? item.name_en.trim()
        : symbol;

    const rawSector = typeof item.sector_name === "string"
        ? item.sector_name
        : typeof item.sector === "string"
            ? item.sector
            : "";
    // Treat UNCLASSIFIED as missing
    const _invalidSectors = new Set(["UNCLASSIFIED", "N/A", ""]);
    const sectorName = _invalidSectors.has((rawSector || "").trim().toUpperCase())
        ? "—"
        : rawSector;

    const lastUpdated = typeof item.last_updated === "string" ? item.last_updated : null;

    return {
        symbol,
        nameEn,
        sectorName: sectorName || "—",
        lastPrice: asNumber(item.last_price, 0),
        changePercent: asNumber(item.change_percent ?? item.change_pct, 0),
        volume: asNumber(item.volume, 0),
        marketCap: asNumber(item.market_cap, 0),
        lastUpdated,
    };
};

const normalizeEgxStockList = (raw: unknown): EgxDashboardStock[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(normalizeEgxStock)
        .filter((item): item is EgxDashboardStock => item !== null);
};

const normalizeEgxSectors = (preferred: unknown, fallback: unknown): EgxDashboardSector[] => {
    const fromPreferred = Array.isArray(preferred) ? preferred : [];
    const normalizedPreferred = fromPreferred
        .map((raw) => {
            const item = asObject(raw);
            if (!item) return null;
            const sectorName = typeof item.name === "string" ? item.name : "";
            if (!sectorName) return null;
            return {
                sectorName,
                performance: asNumber(item.performance, 0),
                stockCount: asInt(item.ticker_count ?? item.stock_count, 0),
                totalVolume: asNumber(item.volume ?? item.total_volume, 0),
            };
        })
        .filter((item): item is EgxDashboardSector => item !== null);

    if (normalizedPreferred.length > 0) {
        return normalizedPreferred.sort((a, b) => b.performance - a.performance);
    }

    const fromFallback = Array.isArray(fallback) ? fallback : [];
    return fromFallback
        .map((raw) => {
            const item = asObject(raw);
            if (!item) return null;
            const sectorName = typeof item.sector_name === "string" ? item.sector_name : "";
            if (!sectorName) return null;
            return {
                sectorName,
                performance: asNumber(item.performance, 0),
                stockCount: asInt(item.stock_count ?? item.ticker_count, 0),
                totalVolume: asNumber(item.total_volume, 0),
            };
        })
        .filter((item): item is EgxDashboardSector => item !== null)
        .sort((a, b) => b.performance - a.performance);
};

const normalizeMarketStatus = (value: unknown): "OPEN" | "CLOSED" | "UNKNOWN" => {
    const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (raw === "OPEN") return "OPEN";
    if (raw === "CLOSED") return "CLOSED";
    return "UNKNOWN";
};

const EGX_TIME_ZONE = "Africa/Cairo";
const EGX_OPEN_MINUTES = 10 * 60;
const EGX_CLOSE_MINUTES = 14 * 60 + 30;
const EGX_TRADING_WEEKDAYS = new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);

const getCairoClock = (referenceDate: Date = new Date()): { weekday: string; minutes: number } => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: EGX_TIME_ZONE,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(referenceDate);

    const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const weekday = getPart("weekday");
    const hour = Number(getPart("hour"));
    const minute = Number(getPart("minute"));

    const minutes = Number.isFinite(hour) && Number.isFinite(minute)
        ? hour * 60 + minute
        : -1;

    return { weekday, minutes };
};

const isEgxSessionOpen = (referenceDate: Date = new Date()): boolean => {
    const clock = getCairoClock(referenceDate);
    if (!EGX_TRADING_WEEKDAYS.has(clock.weekday)) return false;
    return clock.minutes >= EGX_OPEN_MINUTES && clock.minutes < EGX_CLOSE_MINUTES;
};

const resolveEgxMarketStatus = (params: {
    summaryStatus: unknown;
    indexTimestamp: string | null;
    indexDelaySeconds: number | null;
}): "OPEN" | "CLOSED" | "UNKNOWN" => {
    const summaryStatus = normalizeMarketStatus(params.summaryStatus);

    // Hard close outside Cairo EGX session window.
    if (!isEgxSessionOpen()) return "CLOSED";

    // During session: verify quote freshness to avoid false OPEN statuses.
    if (!params.indexTimestamp) return summaryStatus === "OPEN" ? "OPEN" : "UNKNOWN";

    const timestampMs = new Date(params.indexTimestamp).getTime();
    if (!Number.isFinite(timestampMs)) return summaryStatus;

    const ageMinutes = (Date.now() - timestampMs) / 60000;
    const vendorDelayMinutes = Math.max(0, (params.indexDelaySeconds ?? 0) / 60);
    const staleThresholdMinutes = Math.max(25, Math.ceil(vendorDelayMinutes + 15));

    if (ageMinutes > staleThresholdMinutes) return "UNKNOWN";
    return "OPEN";
};

export const fetchEgxDashboardSnapshot = async (): Promise<EgxDashboardSnapshot> => {
    const indexFeedPromise = fetch("/api/v1/egx30/index", { cache: "no-store" })
        .then(async (response) => {
            if (!response.ok) return null;
            return asObject(await response.json());
        })
        .catch(() => null);

    const [summaryResult, marketResult, egxStatsResult, sectorsResult, indexResult] = await Promise.allSettled([
        api.get("/market-summary"),
        api.get("/yahoo/market"),
        api.get("/egx/stats"),
        api.get("/sectors"),
        indexFeedPromise,
    ]);

    const summaryPayload = summaryResult.status === "fulfilled" ? asObject(summaryResult.value.data) : null;
    const marketPayload = marketResult.status === "fulfilled" ? asObject(marketResult.value.data) : null;
    const egxStatsPayload = egxStatsResult.status === "fulfilled" ? asObject(egxStatsResult.value.data) : null;
    const sectorsPayload = sectorsResult.status === "fulfilled" ? sectorsResult.value.data : null;
    const indexPayload = indexResult.status === "fulfilled" ? asObject(indexResult.value) : null;

    const summary = asObject(summaryPayload?.summary) ?? {};
    const marketPulse = asObject(marketPayload?.market_pulse) ?? {};

    const totalStocks = asInt(
        summary.total_stocks ?? summary.total ?? egxStatsPayload?.total_stocks ?? marketPulse.count,
        0
    );
    const gainers = asInt(summary.gainers ?? egxStatsPayload?.gainers ?? marketPulse.up, 0);
    const losers = asInt(summary.losers ?? egxStatsPayload?.losers ?? marketPulse.down, 0);
    const unchangedFromSource = asInt(summary.unchanged ?? egxStatsPayload?.unchanged ?? marketPulse.unchanged, 0);
    const totalVolume = asNumber(
        summary.total_volume ?? egxStatsPayload?.total_volume ?? marketPulse.volume_total,
        0
    );

    let unchanged = unchangedFromSource;
    const issues: string[] = [];

    if (totalStocks > 0) {
        const expectedUnchanged = Math.max(0, totalStocks - gainers - losers);
        if (gainers + losers + unchanged !== totalStocks) {
            unchanged = expectedUnchanged;
            issues.push("Breadth totals were normalized to match EGX stock count.");
        }
    }

    const topGainers = normalizeEgxStockList(summaryPayload?.top_gainers ?? marketPayload?.top_gainers)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5);

    const topLosers = normalizeEgxStockList(summaryPayload?.top_losers ?? marketPayload?.top_losers)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);

    const mostActive = normalizeEgxStockList(summaryPayload?.most_active ?? marketPayload?.most_active)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

    const sectors = normalizeEgxSectors(marketPayload?.sectors, sectorsPayload).slice(0, 20);

    const combinedStocks = [...topGainers, ...topLosers, ...mostActive];
    const staleThresholdMinutes = 240;
    const staleCutoff = Date.now() - staleThresholdMinutes * 60 * 1000;

    const updateTimestamps = combinedStocks
        .map((stock) => stock.lastUpdated)
        .filter((value): value is string => Boolean(value))
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value));

    const freshestUpdateAt = updateTimestamps.length > 0
        ? new Date(Math.max(...updateTimestamps)).toISOString()
        : null;

    const staleSymbols = Array.from(
        new Set(
            combinedStocks
                .filter((stock) => {
                    if (!stock.lastUpdated) return false;
                    const ts = new Date(stock.lastUpdated).getTime();
                    return Number.isFinite(ts) && ts < staleCutoff;
                })
                .map((stock) => stock.symbol)
        )
    );

    if (staleSymbols.length > 0) {
        issues.push(`${staleSymbols.length} mover entries are older than ${staleThresholdMinutes / 60} hours.`);
    }

    if (marketPayload && !Array.isArray(marketPayload.top_gainers)) {
        issues.push("Fallbacked from /yahoo/market movers to /market-summary movers.");
    }

    const indexQuote = asObject(indexPayload?.quote);
    const indexHistory = Array.isArray(indexPayload?.history)
        ? indexPayload.history
            .map((rawPoint) => {
                const point = asObject(rawPoint);
                if (!point) return null;

                const time = asNullableNumber(point.time);
                const close = asNullableNumber(point.close);
                const date = typeof point.date === "string" ? point.date : null;

                if (time === null || close === null || !date) return null;

                return {
                    time,
                    date,
                    open: asNumber(point.open, close),
                    high: asNumber(point.high, close),
                    low: asNumber(point.low, close),
                    close,
                    volume: asNumber(point.volume, 0),
                } satisfies EgxIndexHistoryPoint;
            })
            .filter((item): item is EgxIndexHistoryPoint => item !== null)
            .sort((a, b) => a.time - b.time)
        : [];

    const indexFeed: EgxIndexFeed = {
        available: indexPayload?.available === true && indexHistory.length > 1,
        symbol: typeof indexPayload?.symbol === "string" ? indexPayload.symbol : "EGX:EGX30",
        label: typeof indexPayload?.label === "string" ? indexPayload.label : "EGX 30 Index",
        source: typeof indexPayload?.source === "string" ? indexPayload.source : "unavailable",
        currency: typeof indexPayload?.currency === "string" ? indexPayload.currency : "EGP",
        updateMode: typeof indexPayload?.updateMode === "string" ? indexPayload.updateMode : null,
        delaySeconds: asNullableNumber(indexPayload?.delaySeconds),
        value: asNullableNumber(indexQuote?.value),
        change: asNullableNumber(indexQuote?.change),
        changePercent: asNullableNumber(indexQuote?.changePercent),
        volume: asNullableNumber(indexQuote?.volume),
        lastUpdated: typeof indexQuote?.timestamp === "string" ? indexQuote.timestamp : null,
        history: indexHistory,
        note:
            typeof indexPayload?.note === "string"
                ? indexPayload.note
                : "TradingView EGX30 feed is currently unavailable.",
    };

    if (!indexFeed.available) {
        issues.push("EGX30 TradingView index feed unavailable; index chart is in fallback mode.");
    }

    const resolvedMarketStatus = resolveEgxMarketStatus({
        summaryStatus: summaryPayload?.market_status,
        indexTimestamp: indexFeed.lastUpdated,
        indexDelaySeconds: indexFeed.delaySeconds,
    });

    if (resolvedMarketStatus === "UNKNOWN") {
        issues.push("EGX session timing and quote freshness mismatch; market status marked UNKNOWN.");
    }

    return {
        marketStatus: resolvedMarketStatus,
        totalStocks,
        gainers,
        losers,
        unchanged,
        totalVolume,
        topGainers,
        topLosers,
        mostActive,
        sectors,
        retrievedAt: new Date().toISOString(),
        freshestUpdateAt,
        dataQuality: {
            staleThresholdMinutes,
            staleSymbols,
            issues,
        },
        indexFeed,
    };
};

export const fetchTickers = async (): Promise<Ticker[]> => {
    const { data } = await localApi.get("/tickers");
    // Zod Validation: If backend returns invalid data, this throws an error explanation
    return TickerResponseSchema.parse(data);
};

export const fetchHistory = async (symbol: string): Promise<OHLC[]> => {
    const { data } = await localApi.get(`/history/${symbol}`);
    return data;
};

export const fetchOHLC = async (symbol: string, period: string = "1y"): Promise<OHLC[]> => {
    const { data } = await localApi.get(`/ohlc/${symbol}`, { params: { period } });
    return data;
};

export const fetchFinancials = async (symbol: string) => {
    const { data } = await localApi.get(`/financials/${symbol}`);
    return data;
};

export interface FetchNewsParams {
    symbol?: string;
    limit?: number;
    source_country?: string;
    source_section?: string;
    days?: number;
}

export const fetchNews = async (params: FetchNewsParams = {}): Promise<MarketNewsItem[]> => {
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

export interface PortfolioSnapshot {
    snapshot_date: string;
    total_value: number;
    cash_balance: number;
    total_pnl: number;
}

export const fetchPortfolioHistory = async (): Promise<PortfolioSnapshot[]> => {
    const { data } = await api.get("/portfolio/history");
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
    const { data } = await localApi.get("/corporate-actions", { params });

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
    const { data } = await localApi.get("/insider-trading", { params: { limit } });
    return data;
};

export const fetchAnalystRatings = async (limit: number = 100) => {
    const { data } = await localApi.get("/analyst-ratings", { params: { limit } });
    return data;
};

export const fetchMarketBreadth = async (limit: number = 30) => {
    const { data } = await localApi.get("/market-breadth", { params: { limit } });
    return data;
};

export const fetchMarketSummary = async () => {
    const { data } = await localApi.get("/market-summary");
    return data;
};

// ============================================================================
// NEW FUNCTIONS (Priorities 1 & 2)
// ============================================================================

export const fetchRatios = async (symbol: string) => {
    const { data } = await localApi.get(`/ratios`, { params: { symbol, limit: 1 } });
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
    deviceFingerprint?: string,  // CRITICAL: For guest usage tracking
    language?: 'en' | 'ar'
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

    if (language) {
        headers['X-Language'] = language;
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

export const fetchSharedSessionMessages = async (sessionId: string): Promise<any[]> => {
    const { data } = await api.get(`/ai/shared/${sessionId}`);
    return data;
};

export const fetchSharedMessagePair = async (messageId: string): Promise<any[]> => {
    const { data } = await api.get(`/ai/shared/message/${messageId}`);
    return data;
};

export const renameChatSession = async (sessionId: string, title: string) => {
    const { data } = await api.patch(`/ai/history/${sessionId}`, { title });
    return data;
};

export const deleteChatSession = async (sessionId: string) => {
    const { data } = await api.delete(`/ai/history/${sessionId}`);
    return data;
};

export const fetchEarnings = async (symbol?: string, limit: number = 200) => {
    const params = symbol ? { symbol, limit } : { limit };
    const { data } = await api.get("/earnings", { params });
    return data;
};

export const fetchShareholders = async (symbol?: string, limit: number = 200) => {
    const params = symbol ? { symbol, limit } : { limit };
    const { data } = await localApi.get("/shareholders", { params });
    return data;
};

export const fetchIntraday = async (symbol: string, interval: string = "1m", limit: number = 300) => {
    const { data } = await localApi.get(`/intraday/${symbol}`, { params: { interval, limit } });
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

// ============================================================================
// STRIPE SUBSCRIPTIONS
// ============================================================================

export const createCheckoutSession = async (priceId: string) => {
    const { data } = await api.post("/subscriptions/create-checkout-session", { price_id: priceId });
    return data; // { sessionId, url }
};

export const createCustomerPortalSession = async () => {
    const { data } = await api.post("/subscriptions/customer-portal");
    return data; // { url }
};
