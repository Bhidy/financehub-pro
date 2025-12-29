"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Globe,
    Users,
    BarChart3,
    PieChart,
    DollarSign,
    Percent,
    Calendar,
    FileText,
    ArrowUp,
    ArrowDown,
    ExternalLink,
    Star,
    Bell,
    Share2,
    ChevronRight,
    Activity,
    Target,
    Briefcase,
    Newspaper,
    LineChart,
    CandlestickChart
} from "lucide-react";

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://mubasher-deep-extract.hf.space";

// Types
interface StockData {
    symbol: string;
    name_ar: string;
    name_en: string;
    sector_name: string;
    last_price: number;
    change: number;
    change_percent: number;
    open_price: number;
    high: number;
    low: number;
    prev_close: number;
    volume: number;
    market_cap: number;
    pe_ratio: number;
    pb_ratio: number;
    dividend_yield: number;
    beta: number;
    high_52w: number;
    low_52w: number;
    target_price: number;
}

interface CompanyProfile {
    description: string;
    website: string;
    industry: string;
    sector: string;
    employees: number;
    headquarters: string;
    ceo: string;
    founded: string;
}

interface FinancialData {
    end_date: string;
    period_type: string;
    revenue: number;
    net_income: number;
    operating_income: number;
    total_assets: number;
    total_equity: number;
}

interface Shareholder {
    shareholder_name: string;
    shareholder_name_en: string;
    ownership_percent: number;
    shares_held: number;
}

interface AnalystRating {
    period: string;
    strong_buy: number;
    buy: number;
    hold: number;
    sell: number;
    strong_sell: number;
}

interface DividendRecord {
    ex_date: string;
    payment_date: string;
    amount: number;
    dividend_yield: number;
}

// Fetch functions
async function fetchStockData(symbol: string): Promise<StockData> {
    const res = await fetch(`${API_BASE}/api/tickers`);
    const data = await res.json();
    return data.find((t: StockData) => t.symbol === symbol) || null;
}

async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/profile`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

async function fetchFinancials(symbol: string): Promise<FinancialData[]> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/financials`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

async function fetchShareholders(symbol: string): Promise<Shareholder[]> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/shareholders`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

async function fetchAnalystRatings(symbol: string): Promise<AnalystRating[]> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/analysts`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

async function fetchDividends(symbol: string): Promise<DividendRecord[]> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/dividends`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

async function fetchOHLC(symbol: string, period: string = "1Y") {
    try {
        const res = await fetch(`${API_BASE}/api/ohlc/${symbol}?period=${period}`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

// Utility functions
function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "-";
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
}

function formatCurrency(num: number | null | undefined): string {
    if (num === null || num === undefined) return "-";
    return `SAR ${formatNumber(num)}`;
}

// Components
function StatCard({ label, value, icon: Icon, trend }: {
    label: string;
    value: string;
    icon?: any;
    trend?: "up" | "down" | null;
}) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-slate-800">{value}</span>
                {trend === "up" && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                {trend === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
            </div>
        </div>
    );
}

function SectionHeader({ title, icon: Icon, action }: {
    title: string;
    icon: any;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            </div>
            {action}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-32 bg-slate-200 rounded-xl mb-6" />
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
            </div>
            <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
    );
}

// Main Page Component
export default function CompanyProfilePage() {
    const params = useParams();
    const symbol = params.symbol as string;
    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership" | "analysts">("overview");
    const [chartPeriod, setChartPeriod] = useState("1Y");

    // Queries
    const { data: stockData, isLoading: stockLoading } = useQuery({
        queryKey: ["stock", symbol],
        queryFn: () => fetchStockData(symbol),
        refetchInterval: 30000, // Refresh every 30s
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", symbol],
        queryFn: () => fetchCompanyProfile(symbol),
    });

    const { data: financials } = useQuery({
        queryKey: ["financials", symbol],
        queryFn: () => fetchFinancials(symbol),
    });

    const { data: shareholders } = useQuery({
        queryKey: ["shareholders", symbol],
        queryFn: () => fetchShareholders(symbol),
    });

    const { data: analysts } = useQuery({
        queryKey: ["analysts", symbol],
        queryFn: () => fetchAnalystRatings(symbol),
    });

    const { data: dividends } = useQuery({
        queryKey: ["dividends", symbol],
        queryFn: () => fetchDividends(symbol),
    });

    const { data: ohlc } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod],
        queryFn: () => fetchOHLC(symbol, chartPeriod),
    });

    if (stockLoading) return <LoadingSkeleton />;
    if (!stockData) return <div className="p-8 text-center text-slate-500">Stock not found</div>;

    const isPositive = stockData.change >= 0;
    const changeColor = isPositive ? "text-emerald-600" : "text-red-600";
    const changeBg = isPositive ? "bg-emerald-50" : "bg-red-50";

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-start justify-between">
                        {/* Stock Info */}
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {stockData.name_en || stockData.name_ar}
                                </h1>
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-sm font-mono text-slate-600">
                                    {symbol}.SR
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm">{stockData.sector_name}</p>
                        </div>

                        {/* Price Display */}
                        <div className="text-right">
                            <div className="text-3xl font-bold text-slate-900">
                                SAR {stockData.last_price?.toFixed(2) || "-"}
                            </div>
                            <div className={`flex items-center justify-end gap-2 ${changeColor}`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className={`px-2 py-0.5 rounded ${changeBg} font-medium`}>
                                    {isPositive ? "+" : ""}{stockData.change?.toFixed(2)} ({stockData.change_percent?.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Star className="w-4 h-4" /> Add to Watchlist
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                            <Bell className="w-4 h-4" /> Set Alert
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                    <StatCard label="Open" value={`${stockData.open_price?.toFixed(2) || "-"}`} />
                    <StatCard label="High" value={`${stockData.high?.toFixed(2) || "-"}`} trend="up" />
                    <StatCard label="Low" value={`${stockData.low?.toFixed(2) || "-"}`} trend="down" />
                    <StatCard label="Prev Close" value={`${stockData.prev_close?.toFixed(2) || "-"}`} />
                    <StatCard label="Volume" value={formatNumber(stockData.volume)} icon={BarChart3} />
                    <StatCard label="Market Cap" value={formatCurrency(stockData.market_cap)} icon={Building2} />
                    <StatCard label="P/E Ratio" value={stockData.pe_ratio?.toFixed(2) || "-"} icon={Percent} />
                    <StatCard label="Div Yield" value={`${stockData.dividend_yield?.toFixed(2) || "-"}%`} icon={DollarSign} />
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 mb-6">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "financials", label: "Financials", icon: FileText },
                        { id: "ownership", label: "Ownership", icon: Users },
                        { id: "analysts", label: "Analysts", icon: Target },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Price Chart Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <SectionHeader title="Price Chart" icon={LineChart} />
                                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                    {["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setChartPeriod(period)}
                                            className={`px-3 py-1 text-sm rounded-md transition-colors ${chartPeriod === period
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-800"
                                                }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Chart Placeholder - Will integrate TradingView chart */}
                            <div className="h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <CandlestickChart className="w-12 h-12 mx-auto mb-2" />
                                    <p>Interactive Chart</p>
                                    <p className="text-sm">Loading {ohlc?.length || 0} data points...</p>
                                </div>
                            </div>
                        </div>

                        {/* Company Overview */}
                        {activeTab === "overview" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="About" icon={Building2} />
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    {profile?.description ||
                                        "Company profile information is being loaded. This section will display a comprehensive description of the company's business operations, history, and strategic focus."}
                                </p>
                                {profile?.website && (
                                    <a
                                        href={profile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                    >
                                        <Globe className="w-4 h-4" />
                                        Visit Website
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Financials Tab */}
                        {activeTab === "financials" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Financial Statements" icon={FileText} />
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 text-slate-500 font-medium">Period</th>
                                                <th className="text-right py-3 text-slate-500 font-medium">Revenue</th>
                                                <th className="text-right py-3 text-slate-500 font-medium">Net Income</th>
                                                <th className="text-right py-3 text-slate-500 font-medium">Operating Income</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {financials?.slice(0, 8).map((f, i) => (
                                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 text-slate-800">{f.end_date}</td>
                                                    <td className="py-3 text-right text-slate-800">{formatCurrency(f.revenue)}</td>
                                                    <td className="py-3 text-right text-slate-800">{formatCurrency(f.net_income)}</td>
                                                    <td className="py-3 text-right text-slate-800">{formatCurrency(f.operating_income)}</td>
                                                </tr>
                                            )) || (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-slate-500">
                                                            Loading financial data...
                                                        </td>
                                                    </tr>
                                                )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Ownership Tab */}
                        {activeTab === "ownership" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Major Shareholders" icon={Users} />
                                <div className="space-y-3">
                                    {shareholders?.slice(0, 10).map((s, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-slate-800">{s.shareholder_name_en || s.shareholder_name}</p>
                                                <p className="text-sm text-slate-500">{formatNumber(s.shares_held)} shares</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-semibold text-blue-600">{s.ownership_percent?.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    )) || (
                                            <div className="py-8 text-center text-slate-500">
                                                Loading ownership data...
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {/* Analysts Tab */}
                        {activeTab === "analysts" && (
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Analyst Recommendations" icon={Target} />
                                {analysts && analysts.length > 0 ? (
                                    <div className="space-y-4">
                                        {analysts.slice(0, 4).map((a, i) => {
                                            const total = (a.strong_buy || 0) + (a.buy || 0) + (a.hold || 0) + (a.sell || 0) + (a.strong_sell || 0);
                                            return (
                                                <div key={i} className="space-y-2">
                                                    <p className="text-sm text-slate-500">{a.period}</p>
                                                    <div className="flex h-8 rounded-lg overflow-hidden">
                                                        <div className="bg-emerald-500" style={{ width: `${((a.strong_buy || 0) / total) * 100}%` }} title={`Strong Buy: ${a.strong_buy}`} />
                                                        <div className="bg-emerald-300" style={{ width: `${((a.buy || 0) / total) * 100}%` }} title={`Buy: ${a.buy}`} />
                                                        <div className="bg-slate-300" style={{ width: `${((a.hold || 0) / total) * 100}%` }} title={`Hold: ${a.hold}`} />
                                                        <div className="bg-red-300" style={{ width: `${((a.sell || 0) / total) * 100}%` }} title={`Sell: ${a.sell}`} />
                                                        <div className="bg-red-500" style={{ width: `${((a.strong_sell || 0) / total) * 100}%` }} title={`Strong Sell: ${a.strong_sell}`} />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>Strong Buy: {a.strong_buy || 0}</span>
                                                        <span>Buy: {a.buy || 0}</span>
                                                        <span>Hold: {a.hold || 0}</span>
                                                        <span>Sell: {a.sell || 0}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-slate-500">
                                        Loading analyst ratings...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar (1/3) */}
                    <div className="space-y-6">
                        {/* Key Metrics Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <SectionHeader title="Key Metrics" icon={BarChart3} />
                            <div className="space-y-4">
                                {[
                                    { label: "52 Week High", value: `SAR ${stockData.high_52w?.toFixed(2) || "-"}` },
                                    { label: "52 Week Low", value: `SAR ${stockData.low_52w?.toFixed(2) || "-"}` },
                                    { label: "Beta", value: stockData.beta?.toFixed(2) || "-" },
                                    { label: "P/B Ratio", value: stockData.pb_ratio?.toFixed(2) || "-" },
                                    { label: "Target Price", value: `SAR ${stockData.target_price?.toFixed(2) || "-"}` },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="font-medium text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dividend History Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <SectionHeader title="Dividend History" icon={DollarSign} />
                            <div className="space-y-3">
                                {dividends?.slice(0, 5).map((d, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <div>
                                            <p className="text-slate-800 font-medium">SAR {d.amount?.toFixed(2)}</p>
                                            <p className="text-xs text-slate-500">{d.ex_date}</p>
                                        </div>
                                        <span className="text-emerald-600 font-medium">{d.dividend_yield?.toFixed(2)}%</span>
                                    </div>
                                )) || (
                                        <p className="text-slate-500 text-center py-4">No dividend data</p>
                                    )}
                            </div>
                        </div>

                        {/* News Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <SectionHeader title="Latest News" icon={Newspaper} />
                            <div className="space-y-4">
                                <p className="text-slate-500 text-center py-4">News feed loading...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
