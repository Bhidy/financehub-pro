"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders, fetchCorporateActions, Ticker } from "@/lib/api";
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Globe,
    Users,
    BarChart3,
    DollarSign,
    Percent,
    FileText,
    ArrowUp,
    ArrowDown,
    ExternalLink,
    Star,
    Bell,
    Share2,
    Activity,
    Target,
    Newspaper,
    LineChart,
    CandlestickChart,
    Zap
} from "lucide-react";

// API Base for company profile endpoints
const API_BASE = "https://bhidy-financehub-api.hf.space/api/v1";

// Types
interface CompanyProfile {
    business_summary?: string;
    website?: string;
    industry?: string;
    sector?: string;
}

interface Shareholder {
    shareholder_name: string;
    shareholder_name_en?: string;
    ownership_percent: number;
    shares_held: number;
}

// Fetch company profile
async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/profile`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

// Utility functions
function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "-";
    const n = Number(num);
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm font-medium">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-800">{value}</span>
                {trend === "up" && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                {trend === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
            </div>
        </div>
    );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse p-6">
            <div className="h-24 bg-slate-200 rounded-xl mb-6" />
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
            </div>
            <div className="h-80 bg-slate-200 rounded-xl" />
        </div>
    );
}

// Main Page Component
export default function SymbolDetailPage() {
    const params = useParams();
    const symbol = params.id as string;
    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership">("overview");
    const [chartPeriod, setChartPeriod] = useState("1y");

    // Fetch tickers
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({
        queryKey: ["tickers"],
        queryFn: fetchTickers,
    });

    // Find current stock from tickers
    const stockData = useMemo(() =>
        tickers.find((t: Ticker) => t.symbol === symbol),
        [tickers, symbol]
    );

    // Fetch additional data
    const { data: profile } = useQuery({
        queryKey: ["profile", symbol],
        queryFn: () => fetchCompanyProfile(symbol),
        enabled: !!symbol,
    });

    const { data: financials = [] } = useQuery({
        queryKey: ["financials", symbol],
        queryFn: () => fetchFinancials(symbol),
        enabled: !!symbol,
    });

    const { data: shareholders = [] } = useQuery({
        queryKey: ["shareholders", symbol],
        queryFn: () => fetchShareholders(symbol),
        enabled: !!symbol,
    });

    const { data: corporateActions = [] } = useQuery({
        queryKey: ["corporate-actions", symbol],
        queryFn: () => fetchCorporateActions(symbol),
        enabled: !!symbol,
    });

    const { data: ohlcData = [] } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod],
        queryFn: () => fetchOHLC(symbol, chartPeriod),
        enabled: !!symbol,
    });

    if (tickersLoading) return <LoadingSkeleton />;
    if (!stockData) return <div className="p-8 text-center text-slate-500">Stock not found: {symbol}</div>;

    const isPositive = Number(stockData.change || 0) >= 0;
    const changeColor = isPositive ? "text-emerald-600" : "text-red-600";
    const changeBg = isPositive ? "bg-emerald-50" : "bg-red-50";

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Premium Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Stock Identity */}
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg ${isPositive
                                    ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                                    : "bg-gradient-to-br from-red-400 to-red-600"
                                }`}>
                                {symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-black text-slate-900">{symbol}</h1>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                        {stockData.sector_name || "EQUITY"}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-medium">{stockData.name_en || stockData.name_ar || "Loading..."}</p>
                            </div>
                        </div>

                        {/* Price Display */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-3xl font-black text-slate-900 font-mono">
                                    SAR {Number(stockData.last_price || 0).toFixed(2)}
                                </div>
                                <div className={`flex items-center justify-end gap-2 mt-1 ${changeColor}`}>
                                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    <span className={`px-2 py-0.5 rounded font-bold ${changeBg}`}>
                                        {isPositive ? "+" : ""}{Number(stockData.change || 0).toFixed(2)} ({Number(stockData.change_percent || 0).toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-600 uppercase">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            <Star className="w-4 h-4" /> Add to Watchlist
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                            <Bell className="w-4 h-4" /> Set Alert
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                    <StatCard label="Open" value={Number(stockData.open_price || 0).toFixed(2)} />
                    <StatCard label="High" value={Number(stockData.high || 0).toFixed(2)} trend="up" />
                    <StatCard label="Low" value={Number(stockData.low || 0).toFixed(2)} trend="down" />
                    <StatCard label="Prev Close" value={Number(stockData.prev_close || 0).toFixed(2)} />
                    <StatCard label="Volume" value={formatNumber(stockData.volume)} icon={BarChart3} />
                    <StatCard label="Market Cap" value={formatCurrency(stockData.market_cap)} icon={Building2} />
                    <StatCard label="P/E Ratio" value={stockData.pe_ratio ? Number(stockData.pe_ratio).toFixed(2) : "-"} icon={Percent} />
                    <StatCard label="Div Yield" value={stockData.dividend_yield ? `${Number(stockData.dividend_yield).toFixed(2)}%` : "-"} icon={DollarSign} />
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 mb-6">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "financials", label: "Financials", icon: FileText },
                        { id: "ownership", label: "Ownership", icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-md"
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
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Price Chart Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <SectionHeader title="Price Chart" icon={LineChart} />
                                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                    {["1m", "3m", "6m", "1y", "5y", "max"].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setChartPeriod(period)}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartPeriod === period
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-800"
                                                }`}
                                        >
                                            {period.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-80 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl flex items-center justify-center">
                                <div className="text-center">
                                    <CandlestickChart className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                                    <p className="text-slate-600 font-medium">Interactive Chart</p>
                                    <p className="text-sm text-slate-400">{ohlcData.length} data points loaded</p>
                                </div>
                            </div>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="About Company" icon={Building2} />
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    {profile?.business_summary ||
                                        `${stockData.name_en || symbol} is a publicly traded company on the Saudi Stock Exchange (Tadawul). This section displays company description, business operations, and strategic focus when available.`}
                                </p>
                                {profile?.website && (
                                    <a
                                        href={profile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <Globe className="w-4 h-4" /> Visit Website <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Financials Tab */}
                        {activeTab === "financials" && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Financial Statements" icon={FileText} />
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 text-slate-500 font-medium">Period</th>
                                                <th className="text-right py-3 text-slate-500 font-medium">Revenue</th>
                                                <th className="text-right py-3 text-slate-500 font-medium">Net Income</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {financials.length > 0 ? financials.slice(0, 8).map((f: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 text-slate-800 font-medium">{f.end_date || f.period}</td>
                                                    <td className="py-3 text-right text-slate-800">{formatCurrency(f.revenue)}</td>
                                                    <td className="py-3 text-right text-slate-800">{formatCurrency(f.net_income)}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={3} className="py-8 text-center text-slate-500">
                                                        No financial data available
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
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Major Shareholders" icon={Users} />
                                <div className="space-y-3">
                                    {shareholders.length > 0 ? shareholders.slice(0, 10).map((s: Shareholder, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                            <div>
                                                <p className="font-medium text-slate-800">{s.shareholder_name_en || s.shareholder_name}</p>
                                                <p className="text-sm text-slate-500">{formatNumber(s.shares_held)} shares</p>
                                            </div>
                                            <span className="text-lg font-bold text-blue-600">{s.ownership_percent?.toFixed(2)}%</span>
                                        </div>
                                    )) : (
                                        <div className="py-8 text-center text-slate-500">
                                            No ownership data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Key Metrics Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <SectionHeader title="Key Metrics" icon={Target} />
                            <div className="space-y-3">
                                {[
                                    { label: "52 Week High", value: `SAR ${Number(stockData.high_52w || 0).toFixed(2)}` },
                                    { label: "52 Week Low", value: `SAR ${Number(stockData.low_52w || 0).toFixed(2)}` },
                                    { label: "Beta", value: stockData.beta ? Number(stockData.beta).toFixed(2) : "-" },
                                    { label: "P/B Ratio", value: stockData.pb_ratio ? Number(stockData.pb_ratio).toFixed(2) : "-" },
                                    { label: "Target Price", value: stockData.target_price ? `SAR ${Number(stockData.target_price).toFixed(2)}` : "-" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="font-bold text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Corporate Actions Card */}
                        {corporateActions.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <SectionHeader title="Recent Actions" icon={Zap} />
                                <div className="space-y-3">
                                    {corporateActions.slice(0, 3).map((action: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-amber-700 uppercase">{action.action_type}</span>
                                                <span className="text-xs text-amber-600">{new Date(action.ex_date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-amber-800 line-clamp-2">{action.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* News Placeholder */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <SectionHeader title="Latest News" icon={Newspaper} />
                            <p className="text-slate-500 text-center py-4">News feed coming soon...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
