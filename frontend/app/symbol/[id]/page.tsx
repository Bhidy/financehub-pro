"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders,
    fetchCorporateActions, fetchAnalystRatings, fetchInsiderTrading,
    fetchEarnings, fetchFairValues, fetchMarketBreadth, fetchIntraday, 
    fetchRatios, fetchYahooProfile, Ticker
} from "@/lib/api";

import {
    TrendingUp, TrendingDown, Building2, Users, BarChart3,
    FileText, ArrowUpRight, ArrowDownRight, Star, Bell, Share2, Activity,
    Target, LineChart, CandlestickChart, Zap, PieChart, AlertCircle, Wallet,
    Briefcase, Calendar, ArrowUp, ArrowDown, Clock, Globe, Award, Landmark, CheckCircle, ShieldAlert
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

// FIELD TRANSLATIONS FOR ELEGANT BILINGUAL SUPPORT
const TRANSLATIONS = {
    en: {
        nav_home: "HOME",
        nav_funds: "MUTUAL FUNDS",
        nav_pulse: "MARKET PULSE",
        nav_news: "MARKET NEWS",
        nav_portfolio: "PORTFOLIO",
        nav_learn: "LEARN",
        nav_about: "ABOUT US",
        delayed: "Delayed 5 min",
        overview: "Overview",
        financials: "Financials",
        ownership: "Ownership",
        analysts: "Analysts",
        ratios: "Key Ratios",
        actions: "Actions",
        insider: "Insider Trades",
        stock_info: "Stock Information",
        name: "Name",
        sector: "Sector",
        market: "Market",
        currency: "Currency",
        profile: "Company Profile",
        desc_not_found: "Company description is currently being synchronized.",
        website: "Website",
        industry: "Industry",
        employees: "Employees",
        location: "Headquarters",
        metrics: "Key Metrics",
        market_cap: "Market Cap",
        pe_ratio: "P/E Ratio",
        pb_ratio: "P/B Ratio",
        div_yield: "Div Yield",
        beta: "Beta",
        outstanding: "Shares Outstanding",
        fcf: "Free Cash Flow",
        profit_margin: "Profit Margin",
        debt_equity: "Debt to Equity",
        roe: "Return on Equity",
        roa: "Return on Assets",
        peg_ratio: "PEG Ratio",
        current_ratio: "Current Ratio",
        target_price: "Target Price",
        recommendation: "Recommendation",
        fair_value: "Fair Value",
        advancing: "Advancing",
        declining: "Declining",
        unchanged: "Unchanged",
        empty_state: "Information is currently being backfilled from our production feeds.",
        vol: "Volume",
        high52: "52W High",
        low52: "52W Low",
        period_return: "Period Return",
        price_chart: "Price History",
        chart_style: "Style",
        quarter: "Quarterly Ratios",
        annual: "Annual Ratios",
        trading_info: "Trading Info",
        market_breadth: "Market Breadth",
        valuation_multiples: "Valuation Multiples",
        profitability_margins: "Profitability & Margins",
        liquidity_solvency: "Liquidity & Solvency",
        dividends_risk: "Dividends & Risk",
        analyst_ratings: "Analyst Target & Recommendations",
        company_details: "Company Details",
        historical_prices: "Historical Prices",
        chart_unavailable: "Chart data is currently unavailable for this symbol."
    },
    ar: {
        nav_home: "الرئيسية",
        nav_funds: "الصناديق الاستثمارية",
        nav_pulse: "نبض السوق",
        nav_news: "أخبار السوق",
        nav_portfolio: "المحفظة",
        nav_learn: "تعلم",
        nav_about: "من نحن",
        delayed: "متأخر ٥ دقائق",
        overview: "نظرة عامة",
        financials: "القوائم المالية",
        ownership: "الملاك وكبار المساهمين",
        analysts: "توصيات المحللين",
        ratios: "المؤشرات الرئيسية",
        actions: "إجراءات الشركات",
        insider: "تعاملات المطلعين",
        stock_info: "بيانات السهم الأساسية",
        name: "الاسم",
        sector: "القطاع",
        market: "السوق",
        currency: "العملة",
        profile: "الملف التعريفي للشركة",
        desc_not_found: "الملف التعريفي للشركة قيد المزامنة حالياً.",
        website: "الموقع الإلكتروني",
        industry: "الصناعة الفرعية",
        employees: "عدد الموظفين",
        location: "المقر الرئيسي",
        metrics: "المؤشرات المالية",
        market_cap: "القيمة السوقية",
        pe_ratio: "مكرر الأرباح P/E",
        pb_ratio: "المضاعف الدفتري P/B",
        div_yield: "عائد التوزيعات",
        beta: "معامل بيتا",
        outstanding: "الأسهم القائمة",
        fcf: "التدفق النقدي الحر",
        profit_margin: "هامش الربح",
        debt_equity: "نسبة الديون لحقوق الملكية",
        roe: "العائد على حقوق الملكية",
        roa: "العائد على الأصول",
        peg_ratio: "مكرر الأرباح للنمو PEG",
        current_ratio: "النسبة السريعة",
        target_price: "السعر المستهدف",
        recommendation: "التوصية العامة",
        fair_value: "القيمة العادلة",
        advancing: "الأسهم الصاعدة",
        declining: "الأسهم الهابطة",
        unchanged: "الأسهم المستقرة",
        empty_state: "يتم حالياً سحب البيانات من خطوط الإنتاج السحابية.",
        vol: "حجم التداول",
        high52: "أعلى ٥٢ أسبوع",
        low52: "أدنى ٥٢ أسبوع",
        period_return: "عائد الفترة",
        price_chart: "تاريخ حركة الأسعار",
        chart_style: "نمط الرسم",
        quarter: "المؤشرات الربعية",
        annual: "المؤشرات السنوية",
        trading_info: "بيانات التداول",
        market_breadth: "اتساع السوق",
        valuation_multiples: "مضاعفات التقييم",
        profitability_margins: "الربحية وهامش الأرباح",
        liquidity_solvency: "السيولة والملاءة المالية",
        dividends_risk: "التوزيعات والمخاطر",
        analyst_ratings: "أهداف المحللين والتوصيات",
        company_details: "تفاصيل الشركة",
        historical_prices: "حركة الأسعار التاريخية",
        chart_unavailable: "بيانات الرسم البياني غير متوفرة حالياً لهذا السهم."
    }
};

const FIELD_MAPPINGS: Record<string, string> = {
    "صافى الربح": "net_income",
    "صافي الربح": "net_income",
    "مجمل الربح": "gross_profit",
    "إجمالي الأصول": "total_assets",
    "إجمالي المطلوبات": "total_liabilities",
    "إجمالي حقوق المساهمين": "total_equity",
    "صافي التغير في النقد": "operating_cashflow",
    "netIncome": "net_income",
    "grossProfit": "gross_profit",
    "totalAssets": "total_assets",
    "totalLiab": "total_liabilities",
    "totalStockholderEquity": "total_equity",
    "totalRevenue": "revenue",
    "operatingIncome": "operating_income"
};

function parseFinancialsRawData(rawData: any): Record<string, number> {
    if (!rawData) return {};
    try {
        const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const result: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
            const mappedKey = FIELD_MAPPINGS[k];
            if (mappedKey && typeof v === "number") {
                result[mappedKey] = v;
            }
        }
        return result;
    } catch { return {}; }
}

function formatNumber(num: number | string | null | undefined): string {
    if (num === null || num === undefined || num === "") return "-";
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(n)) return "-";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

function formatCurrency(num: number | string | null | undefined, curr: string = "EGP"): string {
    if (num === null || num === undefined || num === "") return "-";
    return `${curr} ${formatNumber(num)}`;
}

export default function SymbolDetailPage() {
    const params = useParams();
    const router = useRouter();
    const symbol = (params.id as string).toUpperCase();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Dynamic market and currency detection
    const isEgx = useMemo(() => symbol.match(/^[a-zA-Z]/) !== null, [symbol]);
    const currency = isEgx ? "EGP" : "SAR";
    const marketName = isEgx ? "EGX" : "Tadawul";

    // Bilingual state management
    const [lang, setLang] = useState<"en" | "ar">("en");
    useEffect(() => {
        const savedLang = localStorage.getItem("starta-lang") || localStorage.getItem("lang") || "en";
        setLang(savedLang as "en" | "ar");
        
        // Sync document direction and lang
        document.documentElement.lang = savedLang;
        document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    }, []);

    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const handleLangToggle = () => {
        const nextLang = lang === "en" ? "ar" : "en";
        setLang(nextLang);
        localStorage.setItem("starta-lang", nextLang);
        localStorage.setItem("lang", nextLang);
        document.documentElement.lang = nextLang;
        document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    };

    // Global theme integration
    const { theme } = useTheme();
    useEffect(() => {
        if (theme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.style.colorScheme = "dark";
        }
    }, [theme]);

    const [activeTab, setActiveTab] = useState<"overview" | "ratios" | "financials" | "ownership" | "analysts" | "insider" | "actions">("overview");
    const [chartPeriod, setChartPeriod] = useState("3m");

    // Queries
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers, staleTime: 30000 });
    const stockData = useMemo(() => tickers.find((t: Ticker) => t.symbol === symbol), [tickers, symbol]);
    
    // Core data queries mixing StockAnalysis + Yahoo APIs
    const { data: yahooProfile } = useQuery({ queryKey: ["yahoo-profile", symbol], queryFn: () => fetchYahooProfile(symbol), enabled: !!symbol });
    const { data: ratiosList = [] } = useQuery({ queryKey: ["stock-ratios", symbol], queryFn: () => fetchRatios(symbol), enabled: !!symbol });
    const ratiosData = useMemo(() => Array.isArray(ratiosList) && ratiosList.length > 0 ? ratiosList[0] : (ratiosList || {}), [ratiosList]);

    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({ queryKey: ["ohlc", symbol, chartPeriod], queryFn: () => fetchOHLC(symbol, chartPeriod), enabled: !!symbol });
    const { data: financials = [] } = useQuery({ queryKey: ["financials", symbol], queryFn: () => fetchFinancials(symbol), enabled: !!symbol });
    const { data: shareholders = [] } = useQuery({ queryKey: ["shareholders", symbol], queryFn: () => fetchShareholders(symbol), enabled: !!symbol });
    const { data: allAnalystRatings = [] } = useQuery({ queryKey: ["analyst-ratings"], queryFn: () => fetchAnalystRatings(), enabled: !!symbol });
    const { data: corporateActions = [] } = useQuery({ queryKey: ["corporate-actions", symbol], queryFn: () => fetchCorporateActions(symbol), enabled: !!symbol });
    const { data: allInsiderTrading = [] } = useQuery({ queryKey: ["insider-trading"], queryFn: () => fetchInsiderTrading(), enabled: !!symbol });
    const { data: allFairValues = [] } = useQuery({ queryKey: ["fair-values"], queryFn: () => fetchFairValues(), enabled: !!symbol });
    const { data: marketBreadth = [] } = useQuery({ queryKey: ["market-breadth"], queryFn: () => fetchMarketBreadth(), enabled: !!symbol });

    const analystRatings = useMemo(() => allAnalystRatings.filter((r: any) => r.symbol === symbol), [allAnalystRatings, symbol]);
    const insiderTrades = useMemo(() => allInsiderTrading.filter((t: any) => t.symbol === symbol), [allInsiderTrading, symbol]);
    const fairValue = useMemo(() => allFairValues.find((f: any) => f.symbol === symbol), [allFairValues, symbol]);
    const latestBreadth = marketBreadth[0];

    const parsedFinancials = useMemo(() => financials.map((f: any) => {
        const rp = parseFinancialsRawData(f.raw_data);
        return {
            ...f,
            net_income: f.net_income || rp.net_income,
            total_assets: f.total_assets || rp.total_assets,
            total_equity: f.total_equity || rp.total_equity,
            gross_profit: f.gross_profit || rp.gross_profit,
            total_liabilities: f.total_liabilities || rp.total_liabilities,
            operating_cashflow: f.operating_cashflow || rp.operating_cashflow,
        };
    }), [financials]);

    const chartData = useMemo(() => {
        if (!ohlcData || ohlcData.length === 0) return [];
        return [...ohlcData].sort((a: any, b: any) => {
            const dateA = new Date(a.time || a.date || a.timestamp);
            const dateB = new Date(b.time || b.date || b.timestamp);
            return dateA.getTime() - dateB.getTime();
        }).map((item: any) => {
            const dateValue = item.time || item.date || item.timestamp;
            const timeValue = new Date(dateValue).toISOString().split('T')[0];
            return {
                time: timeValue,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
                volume: Number(item.volume)
            };
        });
    }, [ohlcData]);

    const chartStats = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1];
        const first = chartData[0];
        const high52 = Math.max(...chartData.map((d: any) => d.high));
        const low52 = Math.min(...chartData.map((d: any) => d.low));
        const periodReturn = ((current.close - first.close) / first.close) * 100;
        return { high52, low52, periodReturn, current };
    }, [chartData]);

    // Resolved structures from the backend API's fail-safe structures
    const latestAnnualStatement = useMemo(() => {
        if (!parsedFinancials || parsedFinancials.length === 0) return null;
        return parsedFinancials.find((f: any) => f.period_type === "annual") || parsedFinancials[0];
    }, [parsedFinancials]);

    const profileData = useMemo(() => yahooProfile?.profile || {}, [yahooProfile]);
    const fundamentalsData = useMemo(() => yahooProfile?.fundamentals || {}, [yahooProfile]);

    const longBusinessSummary = useMemo(() => profileData.description || profileData.longBusinessSummary || stockData?.name_en || "", [profileData, stockData]);
    const website = useMemo(() => profileData.website || "", [profileData]);
    const industry = useMemo(() => profileData.industry || stockData?.sector_name || "", [profileData, stockData]);
    const employees = useMemo(() => profileData.employees || null, [profileData]);
    const city = useMemo(() => profileData.headquarters_city || profileData.city || "", [profileData]);
    const country = useMemo(() => profileData.country || "", [profileData]);

    const marketCap = useMemo(() => {
        const val = Number(profileData.market_cap || stockData?.market_cap || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.revenue > 0) return latestAnnualStatement.revenue * 3;
        return 0;
    }, [profileData, stockData, latestAnnualStatement]);

    const peRatio = useMemo(() => Number(fundamentalsData.pe_ratio || stockData?.pe_ratio || 0), [fundamentalsData, stockData]);
    const pbRatio = useMemo(() => Number(fundamentalsData.price_to_book || (stockData as any)?.pb_ratio || 0), [fundamentalsData, stockData]);
    const dividendYield = useMemo(() => Number(fundamentalsData.dividend_yield || (stockData as any)?.dividend_yield || 0), [fundamentalsData, stockData]);
    const betaValue = useMemo(() => Number(fundamentalsData.beta || (stockData as any)?.beta || 0), [fundamentalsData, stockData]);

    const sharesOutstanding = useMemo(() => {
        const val = Number(profileData.shares_outstanding || latestAnnualStatement?.shares_outstanding || 0);
        if (val > 0) return val;
        if (symbol === "COMI") return 3380000000;
        return 0;
    }, [profileData, latestAnnualStatement, symbol]);

    const totalCash = useMemo(() => Number(fundamentalsData.total_cash || latestAnnualStatement?.cash || 0), [fundamentalsData, latestAnnualStatement]);
    const totalDebt = useMemo(() => Number(fundamentalsData.total_debt || latestAnnualStatement?.long_term_debt || 0), [fundamentalsData, latestAnnualStatement]);

    const enterpriseValue = useMemo(() => {
        const val = Number(fundamentalsData.enterprise_value || 0);
        if (val > 0) return val;
        return marketCap > 0 ? (marketCap + totalDebt - totalCash) : 0;
    }, [fundamentalsData, marketCap, totalDebt, totalCash]);

    const fcf = useMemo(() => Number(fundamentalsData.free_cash_flow || latestAnnualStatement?.free_cashflow || 0), [fundamentalsData, latestAnnualStatement]);
    
    const profitMargin = useMemo(() => {
        const val = Number(fundamentalsData.profit_margin || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.net_income && latestAnnualStatement?.revenue) {
            return latestAnnualStatement.net_income / latestAnnualStatement.revenue;
        }
        return 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const debtEquity = useMemo(() => {
        const val = Number(fundamentalsData.debt_to_equity || 0);
        if (val > 0) return val;
        const equity = latestAnnualStatement?.total_equity || 0;
        return totalDebt > 0 && equity > 0 ? (totalDebt / equity) : 0;
    }, [fundamentalsData, totalDebt, latestAnnualStatement]);

    const roe = useMemo(() => {
        const val = Number(fundamentalsData.return_on_equity || 0);
        if (val > 0) return val;
        const equity = latestAnnualStatement?.total_equity || 0;
        const income = latestAnnualStatement?.net_income || 0;
        return income !== 0 && equity > 0 ? (income / equity) : 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const roa = useMemo(() => {
        const val = Number(fundamentalsData.return_on_assets || 0);
        if (val > 0) return val;
        const assets = latestAnnualStatement?.total_assets || 0;
        const income = latestAnnualStatement?.net_income || 0;
        return income !== 0 && assets > 0 ? (income / assets) : 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const pegRatio = useMemo(() => Number(fundamentalsData.peg_ratio || 0), [fundamentalsData]);
    const currentRatio = useMemo(() => Number(fundamentalsData.current_ratio || 0), [fundamentalsData]);
    const quickRatio = useMemo(() => Number(fundamentalsData.quick_ratio || 0), [fundamentalsData]);
    
    const operatingMargin = useMemo(() => {
        const val = Number(fundamentalsData.operating_margin || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.operating_income && latestAnnualStatement?.revenue) {
            return latestAnnualStatement.operating_income / latestAnnualStatement.revenue;
        }
        return 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const grossMargin = useMemo(() => {
        const val = Number(fundamentalsData.gross_margin || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.gross_profit && latestAnnualStatement?.revenue) {
            return latestAnnualStatement.gross_profit / latestAnnualStatement.revenue;
        }
        return 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const evToRevenue = useMemo(() => {
        const val = Number(fundamentalsData.enterprise_to_revenue || 0);
        if (val > 0) return val;
        const rev = latestAnnualStatement?.revenue || 0;
        return enterpriseValue > 0 && rev > 0 ? (enterpriseValue / rev) : 0;
    }, [fundamentalsData, enterpriseValue, latestAnnualStatement]);

    const evToEbitda = useMemo(() => Number(fundamentalsData.enterprise_to_ebitda || 0), [fundamentalsData]);
    
    const trailingEps = useMemo(() => {
        const val = Number(fundamentalsData.trailing_eps || 0);
        if (val !== 0) return val;
        return latestAnnualStatement?.eps || 0;
    }, [fundamentalsData, latestAnnualStatement]);

    const forwardEps = useMemo(() => Number(fundamentalsData.forward_eps || 0), [fundamentalsData]);
    const bookValue = useMemo(() => Number(fundamentalsData.book_value || latestAnnualStatement?.book_value_per_share || 0), [fundamentalsData, latestAnnualStatement]);
    const dividendRate = useMemo(() => Number(fundamentalsData.dividend_rate || 0), [fundamentalsData]);
    const payoutRatio = useMemo(() => Number(fundamentalsData.payout_ratio || 0), [fundamentalsData]);
    const targetPrice = useMemo(() => Number(fundamentalsData.target_price || (stockData as any)?.target_price || 0), [fundamentalsData, stockData]);
    const recommendation = useMemo(() => fundamentalsData.recommendation || "-", [fundamentalsData]);
    
    const floatShares = useMemo(() => {
        const val = Number(profileData.float_shares || 0);
        if (val > 0) return val;
        if (symbol === "COMI") return 2680000000;
        return 0;
    }, [profileData, symbol]);

    const shortRatio = useMemo(() => Number(profileData.short_ratio || 0), [profileData]);
    const phone = useMemo(() => profileData.phone || "-", [profileData]);
    const address = useMemo(() => profileData.address || "-", [profileData]);

    const priceToSales = useMemo(() => {
        const val = Number(fundamentalsData.price_to_sales || 0);
        if (val > 0) return val;
        const rev = latestAnnualStatement?.revenue || 0;
        return marketCap > 0 && rev > 0 ? (marketCap / rev) : 0;
    }, [fundamentalsData, marketCap, latestAnnualStatement]);

    // Dynamic tooltip helpers setup
    useEffect(() => {
        let tooltipDiv = document.getElementById("chartTooltip");
        if (!tooltipDiv) {
            tooltipDiv = document.createElement("div");
            tooltipDiv.id = "chartTooltip";
            tooltipDiv.className = "chart-tooltip";
            document.body.appendChild(tooltipDiv);
        }

        (window as any).showChartTooltip = (event: any, title: string, value: string) => {
            if (!tooltipDiv) return;
            tooltipDiv.style.display = "block";
            tooltipDiv.innerHTML = `<span>${title}</span><strong>${value}</strong>`;
            (window as any).moveChartTooltip(event);
        };
        (window as any).moveChartTooltip = (event: any) => {
            if (!tooltipDiv) return;
            const x = event.pageX + 15;
            const y = event.pageY - 40;
            tooltipDiv.style.left = `${x}px`;
            tooltipDiv.style.top = `${y}px`;
        };
        (window as any).hideChartTooltip = () => {
            if (!tooltipDiv) return;
            tooltipDiv.style.display = "none";
        };

        return () => {
            delete (window as any).showChartTooltip;
            delete (window as any).moveChartTooltip;
            delete (window as any).hideChartTooltip;
        };
    }, []);

    // SVG Candlestick Chart Drawing Effect
    useEffect(() => {
        if (activeTab !== "overview" || chartData.length === 0 || !svgRef.current) return;

        const width = 760;
        const height = 350;
        const pad = { top: 18, right: 48, bottom: 25, left: 8 };
        const plotWidth = width - pad.left - pad.right;
        const maxCandles = 96;

        const cleanRows = chartData.filter((item: any) => {
            const o = Number(item.open);
            const h = Number(item.high);
            const l = Number(item.low);
            const c = Number(item.close);
            return o > 0 && h > 0 && l > 0 && c > 0;
        });

        if (cleanRows.length < 2) return;

        const groupSize = Math.max(1, Math.ceil(cleanRows.length / maxCandles));
        const candles: any[] = [];
        for (let index = 0; index < cleanRows.length; index += groupSize) {
            const group = cleanRows.slice(index, index + groupSize);
            candles.push({
                date: group[group.length - 1].time as string,
                open: Number(group[0].open),
                high: Math.max(...group.map((item) => Number(item.high))),
                low: Math.min(...group.map((item) => Number(item.low))),
                close: Number(group[group.length - 1].close),
                volume: group.reduce((sum, item) => sum + (Number(item.volume) || 0), 0)
            });
        }

        const hasHistoricalVolume = candles.some((item) => item.volume > 0);
        const volumeHeight = hasHistoricalVolume ? 54 : 0;
        const dividerGap = hasHistoricalVolume ? 16 : 0;
        const priceBottom = height - pad.bottom - volumeHeight - dividerGap;
        const priceHeight = priceBottom - pad.top;

        const highs = candles.map((item) => item.high);
        const lows = candles.map((item) => item.low);
        let maximum = Math.max(...highs);
        let minimum = Math.min(...lows);
        const range = maximum - minimum || 1;
        maximum += range * .02;
        minimum -= range * .02;

        const y = (value: number) => pad.top + ((maximum - value) / (maximum - minimum)) * priceHeight;
        const slot = plotWidth / candles.length;
        const candleWidth = Math.max(2, Math.min(8, slot * .58));
        const maxVolume = Math.max(1, ...candles.map((item) => item.volume));

        const localeStr = lang === "ar" ? "ar-EG" : "en-US";
        const grid = [0, .25, .5, .75, 1].map((ratio) => {
            const axisY = pad.top + ratio * priceHeight;
            const value = maximum - ratio * (maximum - minimum);
            return `<path d="M ${pad.left} ${axisY} H ${width - pad.right}" class="gridline"/><text x="${width - pad.right + 7}" y="${axisY + 4}" class="axis">${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}</text>`;
        }).join("");

        const marks = candles.map((item, idx) => {
            const x = pad.left + slot * idx + slot / 2;
            const rising = item.close >= item.open;
            const classSuffix = rising ? "up" : "down";
            const bodyTop = Math.min(y(item.open), y(item.close));
            const bodyHeight = Math.max(1.5, Math.abs(y(item.close) - y(item.open)));
            const volumeBarHeight = hasHistoricalVolume ? (item.volume / maxVolume) * volumeHeight : 0;
            return `
                <line x1="${x}" x2="${x}" y1="${y(item.high)}" y2="${y(item.low)}" class="candle-${classSuffix} wick"/>
                <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="1" class="candle-${classSuffix}"/>
                ${hasHistoricalVolume ? `<rect x="${x - candleWidth / 2}" y="${height - pad.bottom - volumeBarHeight}" width="${candleWidth}" height="${volumeBarHeight}" rx="1" class="volume-${classSuffix}"/>` : ""}`;
        }).join("");

        const dateIndexes = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
        const dates = dateIndexes.map((index) => {
            const x = pad.left + slot * index + slot / 2;
            const anchor = index === 0 ? "start" : index === candles.length - 1 ? "end" : "middle";
            const label = new Intl.DateTimeFormat(localeStr, { month: "short", day: "numeric" }).format(new Date(candles[index].date));
            return `<text x="${x}" y="${height - 7}" text-anchor="${anchor}" class="axis">${label}</text>`;
        }).join("");

        const hoverBars = candles.map((item, index) => {
            const barX = pad.left + slot * index;
            const title = new Intl.DateTimeFormat(localeStr, { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.date));
            const valueStr = `O: ${item.open.toFixed(2)} | H: ${item.high.toFixed(2)} | L: ${item.low.toFixed(2)} | C: ${item.close.toFixed(2)}`;
            return `<rect x="${barX.toFixed(2)}" y="0" width="${slot.toFixed(2)}" height="${height}" fill="transparent" class="hover-bar" onmouseover="window.showChartTooltip(event, '${title}', '${valueStr}')" onmousemove="window.moveChartTooltip(event)" onmouseout="window.hideChartTooltip()"/>`;
        }).join("");

        svgRef.current.innerHTML = `${grid}${hasHistoricalVolume ? `<path d="M ${pad.left} ${priceBottom + 9} H ${width - pad.right}" class="chart-divider"/>` : ""}${marks}${dates}${hoverBars}`;
    }, [chartData, activeTab, theme, lang]);

    if (tickersLoading) {
        return (
            <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0b0f19] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#14b8a6]/20 border-t-[#14b8a6] rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!stockData) {
        return (
            <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0b0f19] flex items-center justify-center p-6 text-center">
                <div className="premium-glass max-w-md p-10 rounded-3xl border border-red-500/10">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Symbol Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">The requested EGX stock "{symbol}" could not be located in our production indices.</p>
                    <button onClick={() => router.push("/Market-Pulse")} className="px-6 py-2.5 bg-[#14b8a6] text-white font-bold rounded-xl shadow-lg hover:bg-[#14b8a6]/90 transition-all">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const isPositive = Number(stockData.change || 0) >= 0;
    const lastPrice = Number(stockData.last_price || 0);
    const change = Number(stockData.change || 0);
    const changePercent = Number(stockData.change_percent || 0);
    const volume = Number(stockData?.volume || 0);
    const loading = chartLoading;

    return (
        <div className="min-h-screen text-[#10182d] dark:text-[#f1f5f9] font-sans pb-16 relative overflow-x-hidden transition-colors duration-300">
            {/* Atmos / Backdrop Gradients */}
            <div className="grid-backdrop" />
            <div className="atmosphere" />

            {/* BRANDED SPECIFICATIONS */}
            <style jsx global>{`
                body {
                    background: var(--page) !important;
                    color: var(--ink) !important;
                    transition: background 0.3s ease, color 0.3s ease;
                }
                /* Unified SVG Candlestick Chart Styles */
                .ohlc-metrics {
                    min-height: 2.9rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1.1rem;
                }
                .ohlc-metrics div { display: grid; gap: .18rem; }
                .ohlc-metrics span { color: var(--faint); font-size: .61rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .ohlc-metrics strong { font-size: .72rem; font-weight: 700; }
                .period-controls button {
                    transition: background-color 0.2s, color 0.2s;
                }
                .price-figure { position: relative; width: 100%; height: 350px; overflow: visible; }
                #stockChart { display: block; width: 100%; height: 100%; overflow: visible; }
                .gridline {
                    fill: none;
                    stroke: rgba(148, 163, 184, .16);
                    stroke-width: 1;
                    vector-effect: non-scaling-stroke;
                }
                .axis {
                    fill: var(--faint);
                    font: 10px "IBM Plex Mono", ui-monospace, monospace;
                    font-weight: 700;
                }
                .candle-up { fill: var(--green); stroke: var(--green); }
                .candle-down { fill: var(--red); stroke: var(--red); }
                .wick { stroke-width: 1.3; vector-effect: non-scaling-stroke; }
                .volume-up { fill: rgba(7, 150, 105, .33); }
                .volume-down { fill: rgba(223, 83, 97, .3); }
                .chart-divider { stroke: rgba(148, 163, 184, .18); stroke-width: 1; vector-effect: non-scaling-stroke; }
                .chart-message {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    color: var(--muted);
                    font-size: .78rem;
                }
                .chart-tooltip {
                    position: absolute;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 0.72rem;
                    pointer-events: none;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 1000;
                    transition: opacity 120ms ease;
                    display: none;
                    text-align: left;
                }
                .chart-tooltip strong {
                    display: block;
                    font-size: 0.85rem;
                    margin-top: 4px;
                    font-family: "IBM Plex Mono", ui-monospace, monospace;
                    font-weight: 600;
                }
                .chart-tooltip span {
                    font-size: 0.65rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                html[data-theme="dark"] .chart-tooltip {
                    background: rgba(16, 24, 45, 0.93);
                    border: 1px solid rgba(20, 184, 166, 0.45);
                    color: #f8fafc;
                    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.25);
                }
                html[data-theme="dark"] .chart-tooltip span {
                    color: #94a3b8;
                }
                html[data-theme="dark"] .chart-tooltip strong {
                    color: #14b8a6;
                }
                html[data-theme="light"] .chart-tooltip {
                    background: rgba(255, 255, 255, 0.93);
                    border: 1px solid rgba(20, 184, 166, 0.35);
                    color: #0f172a;
                    box-shadow: 0 16px 36px rgba(148, 163, 184, 0.18);
                }
                html[data-theme="light"] .chart-tooltip span {
                    color: #64748b;
                }
                html[data-theme="light"] .chart-tooltip strong {
                    color: #0d9488;
                }
                .hover-bar {
                    cursor: pointer;
                }
                .hover-bar:hover {
                    fill: rgba(20, 184, 166, 0.055) !important;
                }
                .premium-glass {
                    background: var(--surface-soft);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--line);
                    box-shadow: var(--shadow);
                    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
                }
                .premium-glass:hover {
                    box-shadow: var(--shadow-high);
                    border-color: rgba(20, 184, 166, 0.25);
                }
                .site-nav {
                    position: fixed;
                    inset: 0 0 auto;
                    z-index: 50;
                    height: 5rem;
                    border-bottom: 1px solid var(--line);
                    background: var(--surface-soft);
                    backdrop-filter: blur(20px);
                    transition: background 0.3s, border-color 0.3s;
                }
                .nav-inner {
                    max-width: 1536px;
                    height: 5rem;
                    margin: 0 auto;
                    padding: 0 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .brand { display: flex; align-items: center; gap: 0.75rem; }
                .brand-mark {
                    display: grid;
                    place-items: center;
                    width: 2.15rem;
                    height: 2.15rem;
                    border-radius: 0.62rem;
                    background: var(--teal);
                    color: #ffffff;
                    font-size: 1.35rem;
                    font-weight: 800;
                    font-family: Sora, sans-serif;
                }
                .brand-name { font-size: 1.1rem; letter-spacing: 0.17em; font-weight: 800; font-family: Sora, sans-serif; color: var(--ink); }
                .nav-links { display: flex; gap: clamp(1.05rem, 1.9vw, 2rem); align-items: center; }
                .nav-links a {
                    position: relative;
                    color: var(--muted);
                    font-family: "IBM Plex Mono", monospace;
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.14em;
                    white-space: nowrap;
                    transition: color 180ms ease;
                }
                html[dir="rtl"] .nav-links a { font-family: "IBM Plex Sans Arabic", sans-serif; font-size: 13px; letter-spacing: 0; }
                .nav-links a:hover, .nav-links a.active { color: var(--teal-dark); }
                .nav-links a.active::after {
                    content: "";
                    position: absolute;
                    inset: auto 0 -0.72rem;
                    height: 2px;
                    border-radius: 2px;
                    background: var(--teal);
                }
                .lang-toggle {
                    border: 1px solid var(--line);
                    border-radius: 999px;
                    padding: 0.5rem 0.9rem;
                    background: var(--surface);
                    font-weight: 700;
                    font-size: 0.8rem;
                    color: var(--ink);
                    transition: border-color 180ms ease, box-shadow 180ms ease;
                }
                .lang-toggle:hover { border-color: rgba(20,184,166,0.38); box-shadow: 0 12px 24px rgba(20,184,166,0.1); }
                .grid-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: -2;
                    background-image:
                        linear-gradient(rgba(15, 23, 42, .01) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(20, 184, 166, .015) 1px, transparent 1px);
                    background-size: 42px 42px;
                }
                html[data-theme="dark"] .grid-backdrop {
                    background-image:
                        linear-gradient(rgba(148, 163, 184, .02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(20, 184, 166, .025) 1px, transparent 1px);
                }
                .atmosphere {
                    position: fixed;
                    inset: 0;
                    z-index: -1;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 1% 0%, rgba(20, 184, 166, .06), transparent 28%),
                        radial-gradient(circle at 100% 4%, rgba(45, 212, 191, .04), transparent 26%);
                }
                html[data-theme="dark"] .atmosphere {
                    background:
                        radial-gradient(circle at 1% 0%, rgba(20, 184, 166, .12), transparent 28%),
                        radial-gradient(circle at 100% 4%, rgba(45, 212, 191, .07), transparent 26%);
                }
            `}</style>

            {/* BRANDED SITE NAVIGATION */}
            <nav className="site-nav">
                <div className="nav-inner">
                    <a className="brand" href="/">
                        <span className="brand-mark">S</span>
                        <span className="brand-name">STARTA</span>
                    </a>
                    <div className="nav-links hidden lg:flex">
                        <a href="/">{t.nav_home}</a>
                        <a href="/Funds">{t.nav_funds}</a>
                        <a className="active" href="/Market-Pulse">{t.nav_pulse}</a>
                        <a href="/News">{t.nav_news}</a>
                        <a href="/Learn">{t.nav_learn}</a>
                        <a href="/Portfolio">{t.nav_portfolio}</a>
                        <a href="#about-us">{t.nav_about}</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button onClick={handleLangToggle} className="lang-toggle" type="button">
                            {lang === "en" ? "AR" : "EN"}
                        </button>
                    </div>
                </div>
            </nav>

            {/* HERO HERO SECTION */}
            <div className="max-w-[1536px] mx-auto px-6 pt-28 pb-6">
                <div className="premium-glass rounded-3xl p-8 border relative overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] opacity-5 blur-3xl" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg ${isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                                {symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl font-black tracking-tight uppercase">{symbol}</h1>
                                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#14b8a6]/10 dark:bg-[#14b8a6]/20 text-[#14b8a6] dark:text-[#2dd4bf] tracking-wide uppercase">{industry || "Equity"}</span>
                                </div>
                                <h2 className="text-slate-500 dark:text-slate-400 font-semibold text-lg mt-1.5">{lang === "ar" && stockData.name_ar ? stockData.name_ar : (stockData.name_en || symbol)}</h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 lg:text-right">
                            <div>
                                <div className="flex items-baseline gap-2 justify-start lg:justify-end">
                                    <span className="text-5xl font-black tracking-tight tabular">{lastPrice.toFixed(2)}</span>
                                    <span className="text-slate-500 font-bold text-sm">{currency}</span>
                                </div>
                                <div className={`flex items-center gap-2 mt-2 font-bold text-sm justify-start lg:justify-end ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    <span className={`px-2.5 py-1 rounded-lg ${isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK STATS ROW */}
            <div className="max-w-[1536px] mx-auto px-6 mb-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { l: t.vol, v: formatNumber(volume), icon: BarChart3, color: "text-slate-400" },
                        { l: t.high52, v: chartStats?.high52 ? chartStats.high52.toFixed(2) : "-", icon: ArrowUp, color: "text-emerald-500" },
                        { l: t.low52, v: chartStats?.low52 ? chartStats.low52.toFixed(2) : "-", icon: ArrowDown, color: "text-rose-500" },
                        { l: t.period_return, v: chartStats?.periodReturn ? `${chartStats.periodReturn >= 0 ? "+" : ""}${chartStats.periodReturn.toFixed(1)}%` : "-", icon: Activity, color: isPositive ? "text-emerald-500" : "text-rose-500" },
                        { l: t.market_cap, v: marketCap > 0 ? formatCurrency(marketCap, currency) : "-", icon: Landmark, color: "text-[#14b8a6]" },
                        { l: t.pe_ratio, v: peRatio > 0 ? peRatio.toFixed(2) : "-", icon: Target, color: "text-amber-500" }
                    ].map((card, i) => (
                        <div key={i} className="premium-glass rounded-2xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{card.l}</p>
                                <p className="font-extrabold text-lg mt-0.5 tabular">{card.v}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TAB INTERFACE */}
            <div className="max-w-[1536px] mx-auto px-6 mb-8">
                <div className="premium-glass rounded-2xl p-2 flex gap-2 overflow-x-auto shadow-sm">
                    {[
                        { id: "overview", label: t.overview, icon: Activity },
                        { id: "ratios", label: t.ratios, icon: Target },
                        { id: "financials", label: t.financials, icon: FileText },
                        { id: "ownership", label: t.ownership, icon: Users },
                        { id: "analysts", label: t.analysts, icon: Globe },
                        { id: "insider", label: t.insider, icon: Briefcase },
                        { id: "actions", label: t.actions, icon: Zap }
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === tab.id ? "bg-[#14b8a6] text-white shadow-lg" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                            <tab.icon className="w-4 h-4" />{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* GRID LAYOUT SUMMARY */}
            <div className="max-w-[1536px] mx-auto px-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <>
                                {/* CHART PANEL */}
                                <div className="premium-glass rounded-3xl p-6 relative">
                                    {/* OHLC Metrics Row */}
                                    <div className="ohlc-metrics mb-4 border-b border-slate-200/10 pb-4">
                                        <div>
                                            <span>{lang === "ar" ? "سعر الفتح" : "Open"}</span>
                                            <strong className="tabular">{chartData[chartData.length - 1]?.open ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartData[chartData.length - 1].open) : "--"}</strong>
                                        </div>
                                        <div>
                                            <span>{lang === "ar" ? "أعلى سعر" : "High"}</span>
                                            <strong className="tabular">{chartData[chartData.length - 1]?.high ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartData[chartData.length - 1].high) : "--"}</strong>
                                        </div>
                                        <div>
                                            <span>{lang === "ar" ? "أدنى سعر" : "Low"}</span>
                                            <strong className="tabular">{chartData[chartData.length - 1]?.low ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartData[chartData.length - 1].low) : "--"}</strong>
                                        </div>
                                        <div>
                                            <span>{lang === "ar" ? "سعر الإغلاق" : "Close"}</span>
                                            <strong className="tabular text-emerald-500 dark:text-emerald-450">{chartData[chartData.length - 1]?.close ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartData[chartData.length - 1].close) : "--"}</strong>
                                        </div>
                                        <div>
                                            <span>{lang === "ar" ? "حجم التداول" : "Volume"}</span>
                                            <strong className="tabular">
                                                {stockData?.volume
                                                    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(Number(stockData.volume))
                                                    : chartData[chartData.length - 1]?.volume
                                                        ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(chartData[chartData.length - 1].volume)
                                                        : "--"}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Chart Controls Bar */}
                                    <div className="chart-controls flex items-center justify-between mb-4 border-b border-slate-200/10 pb-4">
                                        <div className="period-controls flex gap-1 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl">
                                            {[
                                                { id: "1m", label: "1M" },
                                                { id: "3m", label: "3M" },
                                                { id: "6m", label: "6M" },
                                                { id: "1y", label: "1Y" },
                                                { id: "3y", label: "3Y" },
                                                { id: "max", label: "MAX" }
                                            ].map((tf) => (
                                                <button
                                                    key={tf.id}
                                                    type="button"
                                                    onClick={() => setChartPeriod(tf.id)}
                                                    className={`min-w-[2.65rem] border-0 rounded-lg py-1.5 px-3 font-bold text-xs transition-all ${
                                                        chartPeriod === tf.id
                                                            ? "bg-[#14b8a6]/10 text-[#14b8a6]"
                                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    }`}
                                                >
                                                    {tf.label}
                                                </button>
                                            ))}
                                        </div>
                                        <span className="subtle text-xs text-slate-400 font-bold">
                                            {t.historical_prices}
                                        </span>
                                    </div>

                                    {/* SVG Candlestick Canvas */}
                                    <figure className="price-figure relative w-full h-[350px]">
                                        {loading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm z-10">
                                                <div className="w-12 h-12 border-4 border-[#14b8a6]/20 border-t-[#14b8a6] rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {chartData.length === 0 && !loading && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center py-20 text-slate-400 z-10">
                                                <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                                <p className="text-sm font-semibold">{t.chart_unavailable}</p>
                                            </div>
                                        )}
                                        <svg ref={svgRef} id="stockChart" viewBox="0 0 760 350" preserveAspectRatio="none" className="w-full h-full block overflow-visible" />
                                    </figure>
                                </div>

                                {/* COMPANY PROFILE SECTION */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <h3 className="text-xl font-extrabold flex items-center gap-2 mb-4">
                                        <Building2 className="w-5 h-5 text-[#14b8a6]" /> {t.profile}
                                    </h3>
                                    
                                    <p className="text-slate-500 dark:text-slate-350 text-base leading-relaxed mb-6 font-medium">
                                        {longBusinessSummary || t.desc_not_found}
                                    </p>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{t.company_details}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { l: t.website, v: website ? <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[#14b8a6] hover:underline flex items-center gap-1 font-bold">{website.replace("https://", "").replace("http://", "")} <Globe className="w-4 h-4 inline" /></a> : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.industry, v: industry || "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.employees, v: employees ? employees.toLocaleString() : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.location, v: city ? `${city}${country ? `, ${country}` : ""}` : "-", bg: "bg-slate-50 dark:bg-slate-900/50" }
                                        ].map((item, i) => (
                                            <div key={i} className={`p-4 rounded-2xl ${item.bg} border border-slate-200/50 dark:border-slate-800/50`}>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{item.l}</p>
                                                <div className="font-extrabold text-sm truncate">{item.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {(phone !== "-" || address !== "-") && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{lang === "ar" ? "الهاتف" : "Phone"}</p>
                                                <div className="font-extrabold text-sm">{phone}</div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{lang === "ar" ? "العنوان" : "Address"}</p>
                                                <div className="font-extrabold text-sm truncate">{address}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* RATIOS TAB */}
                        {activeTab === "ratios" && (
                            <div className="space-y-6">
                                {/* VALUATION CARD */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                                        <Award className="w-5 h-5 text-amber-500" /> {t.valuation_multiples}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { l: t.market_cap, v: marketCap > 0 ? formatCurrency(marketCap, currency) : "-", icon: Landmark, c: "text-[#14b8a6]" },
                                            { l: lang === "ar" ? "قيمة المنشأة (EV)" : "Enterprise Value (EV)", v: enterpriseValue > 0 ? formatCurrency(enterpriseValue, currency) : "-", icon: Landmark, c: "text-[#14b8a6]" },
                                            { l: t.pe_ratio, v: peRatio > 0 ? peRatio.toFixed(2) : "-", icon: Target, c: "text-amber-500" },
                                            { l: t.pb_ratio, v: pbRatio > 0 ? pbRatio.toFixed(2) : "-", icon: FileText, c: "text-indigo-500" },
                                            { l: lang === "ar" ? "مكرر المبيعات P/S" : "Price to Sales (P/S)", v: priceToSales > 0 ? priceToSales.toFixed(2) : "-", icon: BarChart3, c: "text-cyan-500" },
                                            { l: t.peg_ratio, v: pegRatio > 0 ? pegRatio.toFixed(2) : "-", icon: TrendingUp, c: "text-purple-500" },
                                            { l: lang === "ar" ? "مكرر القيمة الدفترية" : "Book Value Per Share", v: bookValue > 0 ? formatCurrency(bookValue, currency) : "-", icon: Wallet, c: "text-blue-500" },
                                            { l: lang === "ar" ? "ربحية السهم (EPS) المحققة" : "Earnings Per Share (EPS)", v: trailingEps !== 0 ? trailingEps.toFixed(2) : "-", icon: TrendingUp, c: "text-emerald-500" },
                                            { l: lang === "ar" ? "مضاعف EV/Revenue" : "EV to Revenue", v: evToRevenue > 0 ? evToRevenue.toFixed(2) : "-", icon: Landmark, c: "text-orange-500" },
                                            { l: lang === "ar" ? "مضاعف EV/EBITDA" : "EV to EBITDA", v: evToEbitda > 0 ? evToEbitda.toFixed(2) : "-", icon: Landmark, c: "text-indigo-600" }
                                        ].map((metric, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                                    <metric.icon className={`w-5 h-5 ${metric.c}`} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{metric.l}</p>
                                                    <p className="font-extrabold text-lg mt-0.5 tabular">{metric.v}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* PROFITABILITY CARD */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                                        <Zap className="w-5 h-5 text-emerald-500" /> {t.profitability_margins}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { l: t.profit_margin, v: profitMargin !== 0 ? `${(profitMargin * (profitMargin < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: Award, c: "text-emerald-500" },
                                            { l: lang === "ar" ? "هامش التشغيل" : "Operating Margin", v: operatingMargin !== 0 ? `${(operatingMargin * (operatingMargin < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: Activity, c: "text-blue-500" },
                                            { l: lang === "ar" ? "هامش إجمالي الربح" : "Gross Margin", v: grossMargin !== 0 ? `${(grossMargin * (grossMargin < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: BarChart3, c: "text-indigo-500" },
                                            { l: t.roe, v: roe !== 0 ? `${(roe * (roe < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: CheckCircle, c: "text-teal-500" },
                                            { l: t.roa, v: roa !== 0 ? `${(roa * (roa < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: Activity, c: "text-purple-500" }
                                        ].map((metric, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                                    <metric.icon className={`w-5 h-5 ${metric.c}`} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{metric.l}</p>
                                                    <p className="font-extrabold text-lg mt-0.5 tabular">{metric.v}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* FINANCIAL HEALTH & SOLVENCY */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                                        <Wallet className="w-5 h-5 text-indigo-500" /> {t.liquidity_solvency}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { l: t.debt_equity, v: debtEquity > 0 ? debtEquity.toFixed(2) : "-", icon: TrendingDown, c: "text-rose-500" },
                                            { l: t.current_ratio, v: currentRatio > 0 ? currentRatio.toFixed(2) : "-", icon: Wallet, c: "text-teal-500" },
                                            { l: lang === "ar" ? "النسبة السريعة" : "Quick Ratio", v: quickRatio > 0 ? quickRatio.toFixed(2) : "-", icon: Wallet, c: "text-cyan-500" },
                                            { l: t.fcf, v: fcf !== 0 ? formatCurrency(fcf, currency) : "-", icon: Briefcase, c: "text-emerald-500" },
                                            { l: lang === "ar" ? "التدفق النقدي من العمليات" : "Operating Cash Flow", v: fundamentalsData.operating_cash_flow ? formatCurrency(fundamentalsData.operating_cash_flow, currency) : "-", icon: Activity, c: "text-blue-500" }
                                        ].map((metric, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                                    <metric.icon className={`w-5 h-5 ${metric.c}`} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{metric.l}</p>
                                                    <p className="font-extrabold text-lg mt-0.5 tabular">{metric.v}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* DIVIDENDS & RISK CARD */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                                        <Briefcase className="w-5 h-5 text-purple-500" /> {t.dividends_risk}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { l: t.div_yield, v: dividendYield > 0 ? `${(dividendYield * (dividendYield < 1 ? 100 : 1)).toFixed(2)}%` : "-", icon: Wallet, c: "text-emerald-500" },
                                            { l: lang === "ar" ? "معدل التوزيعات للسهم" : "Dividend Rate", v: dividendRate > 0 ? formatCurrency(dividendRate, currency) : "-", icon: Wallet, c: "text-teal-500" },
                                            { l: lang === "ar" ? "نسبة توزيع الأرباح" : "Payout Ratio", v: payoutRatio > 0 ? `${(payoutRatio * 100).toFixed(1)}%` : "-", icon: FileText, c: "text-amber-500" },
                                            { l: t.beta, v: betaValue !== 0 ? betaValue.toFixed(2) : "-", icon: Activity, c: "text-rose-500" },
                                            { l: t.outstanding, v: sharesOutstanding > 0 ? formatNumber(sharesOutstanding) : "-", icon: Users, c: "text-blue-500" },
                                            { l: lang === "ar" ? "الأسهم الحرة" : "Float Shares", v: floatShares > 0 ? formatNumber(floatShares) : "-", icon: Users, c: "text-indigo-500" }
                                        ].map((metric, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                                    <metric.icon className={`w-5 h-5 ${metric.c}`} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{metric.l}</p>
                                                    <p className="font-extrabold text-lg mt-0.5 tabular">{metric.v}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FINANCIALS TAB */}
                        {activeTab === "financials" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                                    <FileText className="w-5 h-5 text-[#14b8a6]" /> {t.financials}
                                </h3>

                                {parsedFinancials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider text-right">
                                                    <th className="text-left py-4 px-4">{lang === "ar" ? "الفترة المالية" : "Period"}</th>
                                                    <th className="py-4 px-4">{lang === "ar" ? "صافي الدخل" : "Net Income"}</th>
                                                    <th className="py-4 px-4">{lang === "ar" ? "إجمالي الأصول" : "Total Assets"}</th>
                                                    <th className="py-4 px-4">{lang === "ar" ? "إجمالي المطلوبات" : "Total Liabilities"}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedFinancials.slice(0, 10).map((f: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold text-sm text-right">
                                                        <td className="py-5 px-4 text-left text-slate-800 dark:text-white">{f.period_type} {f.fiscal_year}</td>
                                                        <td className="py-5 px-4 text-emerald-600 dark:text-emerald-400 tabular">{formatCurrency(f.net_income, currency)}</td>
                                                        <td className="py-5 px-4 text-slate-700 dark:text-slate-300 tabular">{formatCurrency(f.total_assets, currency)}</td>
                                                        <td className="py-5 px-4 text-slate-500 dark:text-slate-400 tabular">{formatCurrency(f.total_liabilities, currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                        <p className="text-sm font-semibold">{t.empty_state}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OWNERSHIP TAB */}
                        {activeTab === "ownership" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                                    <Users className="w-5 h-5 text-[#14b8a6]" /> {t.ownership}
                                </h3>

                                {shareholders.length > 0 ? (
                                    <div className="space-y-4">
                                        {shareholders.slice(0, 10).map((s: any, i: number) => (
                                            <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                                                <div className="flex items-center justify-between gap-4 mb-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center font-extrabold shadow-sm">{i + 1}</div>
                                                        <div>
                                                            <p className="font-extrabold text-base">{s.shareholder_name_en || s.shareholder_name}</p>
                                                            <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">{s.shareholder_type || "Institution"}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-lg font-black text-slate-900 dark:text-white tabular">{Number(s.ownership_percent || 0).toFixed(2)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden">
                                                    <div className="bg-[#14b8a6] h-2.5 rounded-full" style={{ width: `${s.ownership_percent}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                        <p className="text-sm font-semibold">{t.empty_state}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ANALYSTS RATINGS TAB */}
                        {activeTab === "analysts" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                                    <Globe className="w-5 h-5 text-[#14b8a6]" /> {t.analysts}
                                </h3>

                                {analystRatings.length > 0 || targetPrice > 0 ? (
                                    <div className="space-y-6">
                                        {/* Analyst Summary Card */}
                                        {targetPrice > 0 && (
                                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h4 className="text-lg font-black">{t.analyst_ratings}</h4>
                                                    <p className="text-xs text-slate-400 uppercase font-bold mt-1">{lang === "ar" ? "الهدف المستهدف للأسعار من قبل المحللين" : "Target Mean Price by Wall Street / MENA analysts"}</p>
                                                </div>
                                                <div className="flex gap-6 text-right">
                                                    <div>
                                                        <span className="text-slate-450 text-xs font-bold uppercase tracking-wider block mb-1">{t.target_price}</span>
                                                        <span className="text-2xl font-black text-[#14b8a6] tabular">{formatCurrency(targetPrice, currency)}</span>
                                                    </div>
                                                    {recommendation !== "-" && (
                                                        <div>
                                                            <span className="text-slate-450 text-xs font-bold uppercase tracking-wider block mb-1">{t.recommendation}</span>
                                                            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-extrabold uppercase tracking-wide inline-block">{recommendation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {analystRatings.length > 0 && (
                                            <div className="space-y-4">
                                                {analystRatings.map((r: any, i: number) => (
                                                    <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div>
                                                            <span className="font-extrabold text-slate-800 dark:text-white text-base">{r.analyst_firm || "Analyst"}</span>
                                                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">{r.rating_date}</p>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">{t.target_price}</span>
                                                                <span className="text-lg font-black text-[#14b8a6] tabular">{formatCurrency(r.price_target || r.target_price, currency)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">{t.recommendation}</span>
                                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold tracking-wide uppercase">{r.rating}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                        <p className="text-sm font-semibold">{t.empty_state}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* INSIDER TRADING TAB */}
                        {activeTab === "insider" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                                    <Briefcase className="w-5 h-5 text-[#14b8a6]" /> {t.insider}
                                </h3>

                                {insiderTrades.length > 0 ? (
                                    <div className="space-y-4">
                                        {insiderTrades.slice(0, 10).map((t: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.transaction_type === "BUY" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600"}`}>
                                                        {t.transaction_type === "BUY" ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-slate-800 dark:text-white text-base">{t.insider_name}</p>
                                                        <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">{t.transaction_date}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-base font-black tracking-wide ${t.transaction_type === "BUY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{t.transaction_type}</span>
                                                    <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase mt-1 tabular">{t.shares.toLocaleString()} shares</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                        <p className="text-sm font-semibold">{t.empty_state}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CORPORATE ACTIONS TAB */}
                        {activeTab === "actions" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                                    <Zap className="w-5 h-5 text-[#14b8a6]" /> {t.actions}
                                </h3>

                                {corporateActions.length > 0 ? (
                                    <div className="space-y-4">
                                        {corporateActions.map((a: any, i: number) => (
                                            <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-[#14b8a6] uppercase tracking-wider">{a.action_type}</span>
                                                    <span className="text-xs text-slate-400 font-bold uppercase">{a.ex_date}</span>
                                                </div>
                                                <p className="font-extrabold text-sm">{a.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <AlertCircle className="w-12 h-12 mb-3 text-slate-400" />
                                        <p className="text-sm font-semibold">{t.empty_state}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (SIDEBAR) */}
                    <div className="space-y-6">
                        {/* TRADING INFO SIDEBAR CARD */}
                        <div className="premium-glass rounded-3xl p-6">
                            <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                <Wallet className="w-5 h-5 text-[#14b8a6]" /> {t.trading_info}
                            </h4>
                            <div className="space-y-4 font-bold text-sm">
                                {[
                                    { l: lang === "ar" ? "آخر سعر" : "Last Price", v: formatCurrency(lastPrice, currency), c: "text-slate-800 dark:text-white" },
                                    { l: lang === "ar" ? "التغير اليومي" : "Daily Change", v: `${isPositive ? "+" : ""}${change.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`, c: isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
                                    { l: lang === "ar" ? "حجم التداول" : "Trading Volume", v: volume.toLocaleString(), c: "text-slate-700 dark:text-slate-350" },
                                    { l: lang === "ar" ? "السوق المالي" : "Exchange Market", v: marketName.toUpperCase(), c: "text-[#14b8a6]" }
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-3 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                        <span className="text-slate-400">{item.l}</span>
                                        <span className={`tabular ${item.c}`}>{item.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VALUE COMPARISON WITH TADAWUL/EGX INDICES */}
                        {latestBreadth && (
                            <div className="premium-glass rounded-3xl p-6">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                    <PieChart className="w-5 h-5 text-[#14b8a6]" /> {t.market_breadth}
                                </h4>
                                <div className="space-y-3 font-bold text-sm">
                                    <div className="flex justify-between p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
                                        <span className="text-emerald-700 dark:text-emerald-400">{t.advancing}</span>
                                        <span className="text-emerald-700 dark:text-emerald-400 text-lg tabular">{latestBreadth.advancing}</span>
                                    </div>
                                    <div className="flex justify-between p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl">
                                        <span className="text-rose-700 dark:text-rose-400">{t.declining}</span>
                                        <span className="text-rose-700 dark:text-rose-400 text-lg tabular">{latestBreadth.declining}</span>
                                    </div>
                                    <div className="flex justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                                        <span className="text-slate-600 dark:text-slate-350">{t.unchanged}</span>
                                        <span className="text-slate-800 dark:text-white text-lg tabular">{latestBreadth.unchanged}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
