"use client";

import React, { useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    BarChart3,
    Table,
    Download,
    Clock,
    HelpCircle,
    ExternalLink,
    ChevronRight,
    Target,
    FileText,
    Building2,
    Zap,
    Newspaper,
    LayoutDashboard,
    Wallet,
    ArrowLeftRight
} from "lucide-react";
import { SafeChatCard } from "@/components/ui/SafeChatCard";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import { Card, ChartPayload, Action } from "@/hooks/useAIChat";
import { FinancialTable } from "./AnalystUI";
import { InsightCard } from "./InsightCard";

// Enterprise Extended Scenario Components
import { MacroScoreCard } from "./MacroScoreCard";
import { EducationalCard } from "./EducationalCard";
import { MethodologyCard } from "./MethodologyCard";
import { HiddenGemCard } from "./HiddenGemCard";
import { IndexCompositionCard } from "./IndexCompositionCard";
import { DisclaimerCard } from "./DisclaimerCard";
import { ScoreBreakdownCard } from "./ScoreBreakdownCard";
import { translations } from "@/components/chatbot/translations";
import { resolveNewsImageSrc } from "@/lib/news-display";

// ============================================================
// Stock Header Card
// ============================================================

interface StockHeaderProps {
    data: {
        symbol: string;
        name: string;
        description?: string;
        market_code: string;
        currency: string;
        sector?: string;
        sector_ar?: string;
        logo_url?: string;
        as_of?: string;
    };
    language?: "en" | "ar";
}

export function StockHeaderCard({ data, language = "en" }: StockHeaderProps) {
    // Add onError handler to fallback if image fails to load
    const [imgError, setImgError] = React.useState(false);
    const isRtl = language === "ar";
    const sectorArMap: Record<string, string> = {
        "Banks": "البنوك",
        "Real Estate": "العقارات",
        "Financial Services": "الخدمات المالية",
        "Industrial Goods & Services": "السلع والخدمات الصناعية",
        "Basic Resources": "الموارد الأساسية",
        "Food & Beverage": "الأغذية والمشروبات",
        "Telecommunications": "الاتصالات",
        "Healthcare & Pharmaceuticals": "الرعاية الصحية والأدوية",
        "Construction & Materials": "التشييد ومواد البناء",
        "Travel & Leisure": "السياحة والترفيه",
    };
    const resolvedDescription = data.description
        || (language === "ar"
            ? (data.sector_ar || (data.sector ? (sectorArMap[data.sector] || data.sector) : undefined))
            : data.sector)
        || (language === "ar" ? "سهم مدرج في السوق" : "Listed equity");

    return (
        <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-white/[0.08] shadow-xl transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {data.logo_url && !imgError ? (
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={data.logo_url}
                        alt={data.symbol}
                        className="w-full h-full object-contain"
                        onError={() => setImgError(true)}
                    />
                </div>
            ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-teal-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-900/20" dir="ltr">
                    {data.symbol.slice(0, 2)}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-black text-slate-800 dark:text-white text-base truncate text-start">{data.name}</div>
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span dir="ltr">{data.symbol}</span> <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" /> {data.market_code} <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" /> {data.currency}
                </div>
                {resolvedDescription && (
                    <div className={clsx(
                        "mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate",
                        language === "ar" ? "normal-case tracking-normal" : "uppercase tracking-wide"
                    )}>
                        {resolvedDescription}
                    </div>
                )}
            </div>
            {data.as_of && (
                <div className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter opacity-60 ${isRtl ? "text-left" : "text-right"}`}>
                    {new Date(data.as_of).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Snapshot Card (Price + Change)
// ============================================================

interface SnapshotProps {
    data: {
        last_price: number;
        change: number;
        change_percent: number;
        volume: number;
        open: number;
        high: number;
        low: number;
        prev_close: number;
        currency: string;
    };
    language?: "en" | "ar";
}

export function SnapshotCard({ data, language = "en" }: SnapshotProps) {
    const isPositive = (data.change_percent || 0) >= 0;
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="relative p-6 bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-white/[0.08] shadow-xl overflow-hidden group" dir={isRtl ? "rtl" : "ltr"}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#14B8A6]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-baseline justify-between mb-8 relative z-10">
                <div className="flex flex-col">
                    <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none text-start">
                        {formatNumber(data.last_price)}
                    </span>
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                        {t.marketPrice} <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">{data.currency}</span>
                    </span>
                </div>
                <div className={clsx(
                    "flex flex-col items-end px-4 py-2 rounded-2xl border backdrop-blur-md transition-all duration-500",
                    isPositive
                        ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10"
                        : "bg-red-500/5 border-red-500/10 text-red-500 dark:text-red-400 shadow-lg shadow-red-500/10"
                )}>
                    <div className="flex items-center gap-1.5" dir="ltr">
                        {isPositive ? <TrendingUp size={22} className="stroke-[3]" /> : <TrendingDown size={22} className="stroke-[3]" />}
                        <span className="text-2xl font-black">{formatPercent(data.change_percent)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 relative z-10 w-full">
                {data.open !== null && data.open !== undefined && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-black mb-1">{t.open}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatNumber(data.open)}</div>
                    </div>
                )}
                {data.high !== null && data.high !== undefined && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-500/20 transition-all">
                        <div className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-black mb-1">{t.high}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatNumber(data.high)}</div>
                    </div>
                )}
                {data.low !== null && data.low !== undefined && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-red-200/50 dark:hover:border-red-500/20 transition-all">
                        <div className="text-[9px] uppercase tracking-widest text-red-500 dark:text-red-400 font-black mb-1">{t.low}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatNumber(data.low)}</div>
                    </div>
                )}
                {data.volume !== null && data.volume !== undefined && data.volume > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-blue-200/50 dark:hover:border-blue-500/20 transition-all">
                        <div className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-black mb-1">{t.volume}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatNumber(data.volume, 0)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Stats Card (PE, Market Cap, etc.)
// ============================================================

interface StatsProps {
    title?: string;
    data: {
        [key: string]: any; // Allow dynamic keys
        pe_ratio?: number;
        pb_ratio?: number;
        dividend_yield?: number;
        market_cap?: number;
        high_52w?: number;
        low_52w?: number;
        beta?: number;
        eps?: number;
    };
    language?: "en" | "ar";
}

export function StatsCard({ title, data, language = "en" }: StatsProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    // Legacy mapping for known keys
    const knownStats: Record<string, any> = {
        pe_ratio: { label: isRtl ? "مكرر الربحية" : "P/E", icon: Target, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10", format: (v: number) => v.toFixed(2) },
        pb_ratio: { label: isRtl ? "مضاعف الدفترية" : "P/B", icon: BarChart3, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10", format: (v: number) => v.toFixed(2) },
        dividend_yield: { label: isRtl ? t.yield : "Yield", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", format: (v: number) => `${v.toFixed(2)}%` },

        // New Deep Stats
        roe: { label: "ROE", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", format: (v: number) => `${v.toFixed(2)}%` },
        debt_equity: { label: "D/E", icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", format: (v: number) => v.toFixed(2) },
        net_profit_margin: { label: isRtl ? "هامش صافي الربح" : "Margin", icon: PieChart, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", format: (v: number) => `${v.toFixed(2)}%` },

        beta: { label: isRtl ? "بيتا" : "Beta", icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", format: (v: number) => v.toFixed(2) },
        eps: { label: isRtl ? "ربحية السهم" : "EPS", icon: TrendingUp, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10", format: (v: number) => v.toFixed(2) },
        high_52w: { label: t.high, icon: ArrowUpRight, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", format: (v: number) => v.toFixed(2) },
        low_52w: { label: t.low, icon: ArrowDownRight, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", format: (v: number) => v.toFixed(2) },
        market_cap: { label: isRtl ? "القيمة السوقية" : "Cap", icon: Building2, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", format: formatNumber },
    };

    // Process all data keys (both legacy and dynamic)
    const stats = Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined || value === "N/A" || value === "") return null;

        const config = knownStats[key] || {
            label: key, // Use key as label for dynamic stats (e.g. "Gross Margin")
            icon: Activity, // Default icon
            color: "text-slate-700 dark:text-slate-300",
            bg: "bg-slate-50 dark:bg-slate-800",
            format: (v: any) => v // Default no-op format
        };

        const displayValue = (typeof value === 'number' && config.format) ? config.format(value) : value;
        if (displayValue === null || displayValue === undefined) return null;
        // RELAXED CHECK: Allow "N/A" to be shown (User request: "Force No Data")
        if (String(displayValue) === "") return null;

        return {
            ...config,
            value: value,
            displayValue: displayValue
        };
    }).filter(Boolean);

    if (stats.length === 0) return null;

    return (
        <div className="p-5 bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold text-slate-800 dark:text-slate-100 ${isRtl ? "text-right" : "text-left"}`}>{title || t.marketStats}</h4>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t.financialMetrics}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map((stat: any) => (
                    <div key={stat.label} className="group p-3 bg-slate-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-100 dark:border-white/5 hover:border-blue-200 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate max-w-[80%]">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shrink-0`}>
                                <stat.icon size={12} />
                            </div>
                        </div>
                        <div className="font-black text-slate-800 dark:text-white text-lg tracking-tight truncate" title={String(stat.displayValue)}>
                            {stat.displayValue}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Movers Table (Gainers/Losers) - Updated with Logo Support
// ============================================================

interface MoversProps {
    title?: string;
    data: {
        movers: Array<{
            symbol: string;
            name: string;
            price: number;
            change_percent: number;
            volume?: number;
            logo_url?: string;
        }>;
        direction: "up" | "down" | "volume"; // Added volume
    };
    onSymbolClick?: (symbol: string) => void;
    language?: "en" | "ar";
}

export function MoversTable({ title, data, onSymbolClick, language = "en" }: MoversProps) {
    const isUp = data.direction === "up";
    const gradient = isUp ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600";
    const bgGlow = isUp ? "bg-emerald-500/5" : "bg-red-500/5";
    const t = translations[language].chat;
    const isRtl = language === "ar";

    const defaultTitle = data.direction === 'up' ? t.topGainers : t.topLosers;

    return (
        <div className={`p-5 bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden relative ${bgGlow}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg ${data.direction === 'up' ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' : data.direction === 'down' ? 'from-red-500 to-rose-600 shadow-red-500/20' : 'from-blue-500 to-indigo-600 shadow-blue-500/20'}`}>
                        {data.direction === 'up' ? <TrendingUp size={20} /> : data.direction === 'down' ? <TrendingDown size={20} /> : <BarChart3 size={20} />}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title || defaultTitle}</h4>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t.marketDynamics}</div>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {data.movers.slice(0, 10).map((stock, i) => {
                    const rankColor = i === 0 ? "bg-yellow-400 text-yellow-900" :
                        i === 1 ? "bg-slate-300 text-slate-800" :
                            i === 2 ? "bg-amber-600 text-amber-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
                    return (
                        <div
                            key={stock.symbol}
                            className="group flex items-center gap-4 p-3 hover:bg-white dark:hover:bg-white/5 hover:shadow-lg rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/10 transition-all duration-300 cursor-pointer active:scale-98"
                            onClick={() => onSymbolClick?.(stock.symbol)}
                        >
                            {stock.logo_url ? (
                                <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={stock.logo_url}
                                        className="w-full h-full object-contain"
                                        alt={stock.symbol}
                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('hidden'); }}
                                    />
                                    {/* Fallback to number if image hidden/errored */}
                                    <div className={`hidden absolute inset-0 flex items-center justify-center text-xs font-black w-8 h-8 ${rankColor}`}>
                                        {i + 1}
                                    </div>
                                </div>
                            ) : (
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${rankColor}`}>
                                    {i + 1}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stock.symbol}</div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 truncate">{stock.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-900 dark:text-white">{formatNumber(stock.price)}</div>
                                {stock.change_percent !== 0 ? (
                                    <div className={`text-xs font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${stock.change_percent > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                        {formatPercent(stock.change_percent)}
                                    </div>
                                ) : (
                                    <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full inline-block mt-0.5 font-bold">0.00%</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================
// Compare Table
// ============================================================

interface CompareProps {
    title?: string;
    data: {
        stocks: Array<Record<string, any>>;
        metrics: Array<{ key: string; label: string }>;
    };
    language?: "en" | "ar";
}

export function CompareTable({ title, data, language = "en" }: CompareProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="bg-white dark:bg-[#1A1F2E]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden my-4 transition-all duration-300 hover:shadow-emerald-500/5" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0F172A] dark:via-[#1e293b] dark:to-[#0F172A] px-6 py-5 border-b border-slate-700/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg tracking-tight">{title || t.headToHead}</h3>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">{t.deepAnalysis}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"} bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 w-1/3`}>
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{t.metric}</span>
                            </th>
                            {data.stocks.map((stock, i) => (
                                <th key={stock.symbol} className={`px-4 py-4 ${isRtl ? "text-left" : "text-right"} bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5`}>
                                    <div className={`flex flex-col ${isRtl ? "items-start" : "items-end"} gap-2`}>
                                        {/* Logo or Initials */}
                                        {stock.logo_url ? (
                                            <div className="w-10 h-10 bg-white rounded-lg p-1 shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={stock.logo_url}
                                                    alt={stock.symbol}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className={clsx(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md",
                                                i === 0 ? "bg-blue-600" : "bg-purple-600"
                                            )}>
                                                {stock.symbol.slice(0, 2)}
                                            </div>
                                        )}

                                        <div className={`flex flex-col ${isRtl ? "items-start" : "items-end"}`}>
                                            <span className="font-black text-slate-800 dark:text-white text-base leading-none" dir="ltr">{stock.symbol}</span>
                                            <span className={clsx(
                                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1",
                                                i === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                                            )}>
                                                {stock.market_code || 'EGX'}
                                            </span>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {data.metrics.map((metric: any) => (
                            <tr key={metric.key} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-teal-500 transition-colors" />
                                        <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {metric.label}
                                        </span>
                                    </div>
                                </td>
                                {data.stocks.map(stock => {
                                    const isWinner = metric.winner_symbol === stock.symbol;
                                    const val = stock[metric.key];

                                    // Formatting
                                    let displayVal = formatNumber(val);
                                    if (metric.format === 'pct') displayVal = formatPercent(val);
                                    if (metric.format === 'compact') displayVal = formatNumber(val, 0); // Need specialized compact logic if wanted

                                    return (
                                        <td key={stock.symbol} className={`px-6 py-4 ${isRtl ? "text-left" : "text-right"}`}>
                                            <div className={`flex items-center ${isRtl ? "justify-start" : "justify-end"} gap-2`}>
                                                {isWinner && (
                                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 animate-in zoom-in spin-in-180 duration-500">
                                                        <TrendingUp size={12} className="stroke-[3]" />
                                                    </div>
                                                )}
                                                <span className={clsx(
                                                    "font-mono font-medium transition-all duration-300",
                                                    isWinner
                                                        ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                                                        : "text-slate-600 dark:text-slate-400"
                                                )}>
                                                    {displayVal}
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Footer Legend */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <TrendingUp size={12} className="text-emerald-500" />
                <span>{language === "ar" ? "يشير إلى المؤشر الأفضل وفق المنطق المالي" : "Indicates the superior metric based on financial logic"}</span>
            </div>
        </div>
    );
}

// ============================================================
// Help Card
// ============================================================

interface HelpProps {
    data: {
        categories: Array<{
            title: string;
            examples: string[];
        }>;
    };
    onExampleClick?: (text: string) => void;
    language?: "en" | "ar";
}

export function HelpCard({ data, onExampleClick, language = "en" }: HelpProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-500/10 dark:to-teal-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-400 font-semibold">
                <HelpCircle size={18} />
                {t.whatIHelpWith}
            </div>
            <div className="space-y-4">
                {data.categories.map(cat => (
                    <div key={cat.title}>
                        <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">{cat.title}</div>
                        <div className="flex flex-wrap gap-2">
                            {cat.examples.map(ex => (
                                <button
                                    key={ex}
                                    onClick={() => onExampleClick?.(ex)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Actions Bar
// ============================================================

interface ActionsBarProps {
    actions: Action[];
    language?: "en" | "ar" | "mixed";
    onAction: (action: Action) => void;
}

export function ActionsBar({ actions, language = "en", onAction }: ActionsBarProps) {
    if (!actions.length) return null;

    // Client-side override: 
    // 1. Hide 1Y/MAX (Data unavailable)
    // 2. Inject 3M/6M (Data available, but backend buttons might be stale during deploy)
    const processedActions = actions.filter(a => a.label !== '1Y' && a.label !== 'MAX');

    // Check if this is a chart context (has "1M")
    const has1M = processedActions.some(a => a.label === '1M');
    const has6M = processedActions.some(a => a.label === '6M');

    if (has1M && !has6M) {
        // Find the 1M action to clone its payload structure
        const oneMAction = processedActions.find(a => a.label === '1M');
        if (oneMAction && oneMAction.payload) {
            // Inject 3M and 6M after 1M
            const idx = processedActions.findIndex(a => a.label === '1M');
            const basePayload = oneMAction.payload.replace(' 1M', ''); // remove 1M suffix

            const newButtons = [
                { ...oneMAction, label: '3M', payload: `${basePayload} 3M` },
                { ...oneMAction, label: '6M', payload: `${basePayload} 6M` }
            ];

            // Insert after 1M
            processedActions.splice(idx + 1, 0, ...newButtons);
        }
    }

    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {processedActions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => onAction(action)}
                    className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1F2E]/60 border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-500/10 dark:hover:to-teal-500/10 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <span>{language === "ar" ? action.label_ar || action.label : action.label}</span>
                    {action.action_type === "navigate" ?
                        <ExternalLink size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" /> :
                        <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-0.5" />
                    }
                </button>
            ))}
        </div>
    );
}

// ============================================================
// Disclaimer
// ============================================================

export function Disclaimer({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-700 text-xs">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {text}
        </div>
    );
}

// ============================================================
// Ratios Card (PE, PB, ROE, ROA, etc.)
// ============================================================

interface RatiosProps {
    title?: string;
    data: {
        pe?: number;
        pb?: number;
        ps?: number;
        roe?: number;
        roa?: number;
        debt_equity?: number;
        dividend_yield?: number;
        marketcap?: number;
        earnings_yield?: number;
        payout_ratio?: number;
        peg_ratio?: number;
        fcf_yield?: number;
    };
    language?: "en" | "ar";
}

export function RatiosCard({ title, data, language = "en" }: RatiosProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    const noDataText = t.noData || (isRtl ? "غير متاح" : "N/A");
    const formatRatio = (v: number | null | undefined) => v !== null && v !== undefined ? v.toFixed(2) : noDataText;
    const formatPct = (v: number | null | undefined) => v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : noDataText;

    const ratios = [
        { label: isRtl ? "مكرر الربحية" : "P/E", value: formatRatio(data.pe), color: "text-blue-600 dark:text-blue-400" },
        { label: isRtl ? "مضاعف الدفترية" : "P/B", value: formatRatio(data.pb), color: "text-blue-600 dark:text-blue-400" },
        { label: isRtl ? "مكرر المبيعات" : "P/S", value: formatRatio(data.ps), color: "text-blue-600 dark:text-blue-400" },
        { label: "ROE", value: formatPct(data.roe), color: "text-emerald-600 dark:text-emerald-400" },
        { label: "ROA", value: formatPct(data.roa), color: "text-emerald-600 dark:text-emerald-400" },
        { label: isRtl ? "الدين/حقوق الملكية" : "D/E", value: formatRatio(data.debt_equity), color: "text-amber-600 dark:text-amber-400" },
        { label: "PEG", value: formatRatio(data.peg_ratio), color: "text-cyan-600 dark:text-cyan-400" },
        { label: t.yield, value: formatPct(data.earnings_yield), color: "text-teal-600 dark:text-teal-400" },
    ].filter(r => r.value !== noDataText);

    if (!ratios.length) return null;

    return (
        <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
            {title && (
                <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 font-semibold">
                    <BarChart3 size={16} />
                    {title}
                </div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {ratios.map(r => (
                    <div key={r.label} className="text-center p-2 bg-white dark:bg-[#1A1F2E] rounded-lg shadow-sm border dark:border-white/5">
                        <div className="text-xs text-slate-500 dark:text-slate-500">{r.label}</div>
                        <div className={`font-bold text-sm ${r.color}`}>{r.value}</div>
                    </div>
                ))}
            </div>
            {data.marketcap && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{isRtl ? "القيمة السوقية: " : "Market Cap: "}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{formatNumber(data.marketcap)}</span>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Financial Statement Table (Ultra-Premium Component)
// ============================================================

export interface StatementRow {
    label: string;
    values: { [year: string]: number | null };
    isGrowth?: boolean;
    isSubtotal?: boolean;
    indent?: number;
    format?: 'number' | 'currency' | 'percent';
}

interface FinancialsTableProps {
    title?: string;
    subtitle?: string;
    years: (string | number)[];
    rows: StatementRow[];
    currency?: string;
    language?: "en" | "ar";
}

export function FinancialsTableCard({ title, subtitle, years, rows, currency = "EGP", language = "en" }: FinancialsTableProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";
    const safeYears = Array.isArray(years) ? years : [];
    const safeRows = Array.isArray(rows) ? rows : [];

    const getRowValues = (row: StatementRow | null | undefined): Record<string, number | null> => {
        if (!row || typeof row !== "object") return {};
        const values = (row as any).values;
        return values && typeof values === "object" ? values : {};
    };
    // Initial raw years
    const rawYears = [...new Set(safeYears.map(y => String(y)))].slice(0, 7);

    // Filter out rows where ALL values are null (Strict Policy)
    const validRows = safeRows.filter(row => {
        const values = Object.values(getRowValues(row));
        return values.some(v => v !== null && v !== undefined);
    });

    // Final years: Only those that have at least one non-null value in validRows
    const uniqueYears = rawYears.filter(year =>
        validRows.some(row => {
            const values = getRowValues(row);
            return values[year] !== null && values[year] !== undefined;
        })
    );



    // Row styling based on type
    const getRowClass = (row: StatementRow): string => {
        if (row.isSubtotal) {
            return "bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-500/10 dark:to-slate-800/10 font-bold border-y border-blue-100 dark:border-blue-500/20";
        }
        return "border-b border-slate-100/50 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-blue-500/10 transition-colors";
    };

    // Value color based on growth
    const getValueColor = (row: StatementRow, val: number | null): string => {
        if (val === null) return "text-slate-400 dark:text-slate-500";
        if (row.isGrowth) {
            return val >= 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-500 dark:text-red-400 font-semibold";
        }
        if (row.isSubtotal) return "text-slate-800 dark:text-white font-bold";
        return "text-slate-700 dark:text-slate-300";
    };

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Line Item', ...uniqueYears];
        const csvRows = validRows.map(row => {
            const valuesMap = getRowValues(row);
            const values = uniqueYears.map(year => valuesMap[year] ?? '');
            return [row.label || "", ...values].join(',');
        });
        const csv = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'financials'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export to Excel (via CSV with proper encoding)
    const handleExportExcel = () => {
        const headers = ['Line Item', ...uniqueYears];
        const excelRows = validRows.map(row => {
            const valuesMap = getRowValues(row);
            const values = uniqueYears.map(year => {
                const val = valuesMap[year];
                return val !== null && val !== undefined ? val : '';
            });
            return [row.label || "", ...values].join('\t');
        });
        const tsv = [headers.join('\t'), ...excelRows].join('\n');

        const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'financials'}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // validRows already calculated above for uniqueYears filtering

    if (!validRows || validRows.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl p-8 border border-slate-200 dark:border-white/10 text-center" dir={isRtl ? "rtl" : "ltr"}>
                <Table className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                <div className="text-slate-600 dark:text-slate-300 font-medium">{t.noData}</div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden my-4 transition-colors duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-slate-800 via-teal-700 to-emerald-600 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                            <Table className="w-5 h-5" />
                            {title || t.financials}
                        </div>
                        {subtitle && <div className="text-emerald-100 text-xs mt-1 font-medium">{subtitle}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white border border-white/10 uppercase tracking-widest">{currency}</span>
                        <div className="flex gap-1">
                            <button onClick={handleExportCSV} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title={t.exportCsv}>
                                <FileText size={14} />
                            </button>
                            <button onClick={handleExportExcel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title={t.exportExcel}>
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5">
                            <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"} text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/3 min-w-[200px]`}>
                                {t.lineItem}
                            </th>
                            {uniqueYears.map((year, i) => (
                                <th key={i} className={`px-6 py-4 ${isRtl ? "text-left" : "text-right"} text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest min-w-[100px]`}>
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-transparent">
                        {validRows.map((row, i) => (
                            <tr key={i} className={getRowClass(row)}>
                                <td className={`px-6 py-4 ${isRtl ? "pl-6 pr-[24px]" : "pr-6 pl-[24px]"}`}>
                                    <div className="flex items-center gap-2" style={isRtl ? { paddingRight: (row.indent || 0) * 16 } : { paddingLeft: (row.indent || 0) * 16 }}>
                                        {row.isSubtotal && <div className="w-1 h-4 bg-blue-500 rounded-full mr-2" />}
                                        <span className={clsx(
                                            "truncate",
                                            row.isSubtotal ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"
                                        )}>
                                            {row.label}
                                        </span>
                                    </div>
                                </td>
                                {uniqueYears.map((year, j) => (
                                    <td key={j} className={`px-6 py-4 ${isRtl ? "text-left" : "text-right"} font-mono tabular-nums tracking-tight`}>
                                        <span className={getValueColor(row, row.values[year])}>
                                            {formatValue(row.values[year], row.format, row.label)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-white/[0.02] px-6 py-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                <span>{t.exploreInsights}</span>
                <span>{years.length} {t.periods}</span>
            </div>
        </div>
    );
}

// ============================================================
// Export Toolbar
// ============================================================

interface ExportToolbarProps {
    data: any;
    title?: string;
    onExport?: (format: 'excel' | 'pdf' | 'image') => void;
    language?: "en" | "ar";
}

export function ExportToolbar({ data, title, onExport, language = "en" }: ExportToolbarProps) {
    const ui = language === "ar"
        ? {
            export: "تصدير:",
            excel: "إكسل",
            pdf: "PDF",
            image: "صورة",
            screenshotTip: "استخدم أداة لقطة الشاشة في المتصفح لالتقاط الرسم",
        }
        : {
            export: "Export:",
            excel: "Excel",
            pdf: "PDF",
            image: "Image",
            screenshotTip: "Use browser screenshot (Cmd+Shift+4 on Mac) to capture",
        };

    const handleExport = async (format: 'excel' | 'pdf' | 'image') => {
        if (onExport) {
            onExport(format);
            return;
        }

        // Basic export implementations
        if (format === 'excel') {
            // Convert to CSV and download
            const csv = convertToCSV(data);
            downloadFile(csv, `${title || 'data'}.csv`, 'text/csv');
        } else if (format === 'pdf') {
            // Use browser print
            window.print();
        } else if (format === 'image') {
            // Screenshot notification
            alert(ui.screenshotTip);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">{ui.export}</span>
            <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
            >
                📊 {ui.excel}
            </button>
            <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
                📄 {ui.pdf}
            </button>
            <button
                onClick={() => handleExport('image')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
                📸 {ui.image}
            </button>
        </div>
    );
}

function convertToCSV(data: any): string {
    if (Array.isArray(data)) {
        if (!data.length) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => row[h] ?? '').join(','));
        return [headers.join(','), ...rows].join('\n');
    }
    return JSON.stringify(data, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================
// Technicals Card
// ============================================================

interface TechnicalsProps {
    title?: string;
    data: {
        symbol: string;
        rsi: number | null;
        macd: { line: number; signal: number; hist: number };
        pivot: number | null;
        ma: { sma_50: number | null; sma_200: number | null };
        support: number[];
        resistance: number[];
    };
}

export function TechnicalsCard({ title, data }: TechnicalsProps) {
    const getSentiment = (val: number | null, type: 'rsi' | 'trend') => {
        if (val === null) return 'text-slate-400';
        if (type === 'rsi') return val > 70 ? 'text-red-500' : val < 30 ? 'text-emerald-500' : 'text-slate-600';
        return val > 0 ? 'text-emerald-500' : 'text-red-500';
    };

    return (
        <div className="p-4 bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-300 font-bold">
                <Activity size={18} className="text-cyan-600 dark:text-cyan-400" />
                {title || "Technical Indicators"}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* RSI & Pivot */}
                {data.rsi !== null && data.rsi !== undefined && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">RSI (14)</div>
                        <div className={`text-lg font-bold ${getSentiment(data.rsi, 'rsi')} dark:text-white`}>
                            {data.rsi.toFixed(2)}
                        </div>
                    </div>
                )}
                {data.pivot !== null && data.pivot !== undefined && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Pivot Point</div>
                        <div className="text-lg font-bold text-slate-700 dark:text-white">
                            {data.pivot.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>

            {/* Support & Resistance */}
            {(data.support?.length > 0 || data.resistance?.length > 0) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {data.support?.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Support</div>
                            {data.support.map((val, i) => (
                                <div key={i} className="flex justify-between text-xs bg-emerald-50 dark:bg-emerald-500/10 p-1.5 rounded">
                                    <span className="text-emerald-700 dark:text-emerald-300">S{i + 1}</span>
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{val.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {data.resistance?.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-red-500 dark:text-red-400 mb-2">Resistance</div>
                            {data.resistance.map((val, i) => (
                                <div key={i} className="flex justify-between text-xs bg-red-50 dark:bg-red-500/10 p-1.5 rounded">
                                    <span className="text-red-700 dark:text-red-300">R{i + 1}</span>
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{val.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Ownership Card
// ============================================================

interface OwnershipProps {
    title?: string;
    data: {
        shareholders: Array<{
            name: string;
            percent: number;
            shares: number;
            date: string;
        }>;
    };
}

// ============================================================
// DEEP HEALTH CARD (Z-Score, F-Score) - Ultra Premium
// ============================================================
interface DeepHealthProps {
    data: {
        symbol: string;
        z_score: number | null;
        f_score: number | null;
        status: string;
        metrics: Record<string, number | null>;
    };
}

export function DeepHealthCard({ data, language = "en" }: DeepHealthProps & { language?: "en" | "ar" }) {
    const t = translations[language].chat;
    const isRtl = language === "ar";
    // Safety check for null Z-Score (e.g. Banks)
    const safeZ = data.z_score ?? 0;
    const isSafe = safeZ > 2.99;
    const isDistress = safeZ < 1.81;
    const color = (data.z_score === null) ? "text-slate-500" : isSafe ? "text-emerald-600" : isDistress ? "text-red-500" : "text-amber-500";
    const bg = (data.z_score === null) ? "bg-slate-50" : isSafe ? "bg-emerald-50" : isDistress ? "bg-red-50" : "bg-amber-50";
    const gradientId = `gauge-${data.symbol || 'default'}`;

    // Calculate gauge percentage (Z-Score typically 0-4 range, capped)
    // If null, set to 0 (empty gauge)
    const gaugePercent = (data.z_score === null) ? 0 : Math.min(Math.max(safeZ / 4, 0), 1) * 100;
    const strokeDasharray = `${gaugePercent * 2.51} 251`; // 251 = circumference of r=40

    return (
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/40 dark:to-slate-800/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                        <Activity className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                    </div>
                    🛡️ {language === "ar" ? "تحليل الصحة المالية" : "Financial Health Analysis"}
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${bg} ${color} shadow-sm`}>
                    {data.status}
                </span>
            </div>

            {/* SVG Gauge Visualization */}
            <div className="flex items-center justify-center py-6">
                <div className="relative">
                    <svg width="160" height="100" viewBox="0 0 160 100">
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="45%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>
                        {/* Background Arc */}
                        <path
                            d="M 20 90 A 60 60 0 0 1 140 90"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="12"
                            strokeLinecap="round"
                        />
                        {/* Colored Arc */}
                        <path
                            d="M 20 90 A 60 60 0 0 1 140 90"
                            fill="none"
                            stroke={`url(#${gradientId})`}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${gaugePercent * 1.88} 188`}
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Needle */}
                        <circle
                            cx={20 + (gaugePercent / 100) * 120}
                            cy={90 - Math.sin(gaugePercent / 100 * Math.PI) * 60}
                            r="6"
                            fill="white"
                            stroke="#1e293b"
                            strokeWidth="3"
                            className="drop-shadow-md"
                        />
                    </svg>
                    {/* Center Value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                        <div className={`text-3xl font-black ${color}`}>{data.z_score !== null ? data.z_score.toFixed(2) : t.noData}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">{language === "ar" ? "مؤشر ألتمان" : "Altman Z-Score"}</div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/20 rounded-xl text-center shadow-sm">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{language === "ar" ? "مؤشر F" : "F-Score"}</div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-200">{data.f_score}<span className="text-sm text-blue-500 dark:text-blue-400">/9</span></div>
                </div>
                {Object.entries(data.metrics).slice(0, 4).map(([key, val]) => {
                    //Allow showing N/A explicitly if needed
                    if (val === null || val === undefined) return (
                        <div key={key} className="p-3 bg-white dark:bg-white/5 rounded-xl text-center border border-slate-100 dark:border-white/10 shadow-sm opacity-50">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">{key}</div>
                            <div className="font-bold text-slate-400 dark:text-slate-500">{t.noData}</div>
                        </div>
                    );
                    if ((val as any) === "N/A") return null;
                    return (
                        <div key={key} className="p-3 bg-white dark:bg-white/5 rounded-xl text-center border border-slate-100 dark:border-white/10 shadow-sm">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">{key}</div>
                            <div className="font-bold text-slate-800 dark:text-white">{typeof val === 'number' ? val.toFixed(2) : val}</div>
                        </div>
                    );
                })}
            </div>

            {/* Risk Scale Legend */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "تعثر (<1.81)" : "Distress (<1.81)"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "منطقة رمادية" : "Grey Zone"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "آمن (>2.99)" : "Safe (>2.99)"}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DEEP VALUATION CARD (Starta Valuation Score — 5 Component Breakdown)
// ============================================================
interface DeepValuationProps {
    data: {
        // Backend schema from price_handler.py
        total_score?: number;
        valuation_score?: number;
        quality_score?: number;
        momentum_score?: number;
        profitability_score?: number;
        health_score?: number;
        assessment?: string;
        signal?: string;
        grade?: string;
        sector?: string;
        // Legacy deep_valuation schema (fallback)
        symbol?: string;
        verdict?: string;
        multiples?: Record<string, number | null>;
    };
}

export function DeepValuationCard({ data, language = "en" }: DeepValuationProps & { language?: "en" | "ar" }) {
    const isRtl = language === "ar";
    const safeData = (data && typeof data === "object") ? data : ({} as any);

    // ── Detect which schema we received ──
    const isScoreSchema = safeData.total_score !== undefined || safeData.grade !== undefined;

    if (isScoreSchema) {
        // ═══════════════════════════════════════════════════════
        // STARTA VALUATION SCORE (5-Component Breakdown)
        // ═══════════════════════════════════════════════════════
        const totalScore = typeof safeData.total_score === "number" ? safeData.total_score : 0;
        const grade = typeof safeData.grade === "string" ? safeData.grade : "–";
        const assessment = typeof safeData.assessment === "string" ? safeData.assessment : (language === "ar" ? "غير متاح" : "N/A");
        const signal = typeof safeData.signal === "string" ? safeData.signal : "";
        const sector = typeof safeData.sector === "string" ? safeData.sector : "";

        // 5 pillars — each out of 20
        const pillars = [
            { key: language === "ar" ? "التقييم" : "Valuation", value: safeData.valuation_score ?? 0, icon: "📊" },
            { key: language === "ar" ? "الربحية" : "Profitability", value: safeData.profitability_score ?? 0, icon: "💰" },
            { key: language === "ar" ? "الصحة المالية" : "Health", value: safeData.health_score ?? 0, icon: "🛡️" },
            { key: language === "ar" ? "جودة الأرباح" : "Quality", value: safeData.quality_score ?? 0, icon: "✅" },
            { key: language === "ar" ? "الزخم" : "Momentum", value: safeData.momentum_score ?? 0, icon: "🚀" },
        ];
        const maxPillar = 20;

        // Grade badge color
        const gradeColorMap: Record<string, string> = {
            'A': 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20',
            'B': 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20',
            'C': 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/20',
            'D': 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/20',
            'F': 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/20',
        };
        const gradeBadgeColor = gradeColorMap[grade.charAt(0).toUpperCase()] || gradeColorMap['C'];

        // Bar color based on score percentage
        const getBarColor = (score: number) => {
            const pct = score / maxPillar;
            if (pct >= 0.7) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
            if (pct >= 0.4) return 'bg-gradient-to-r from-amber-400 to-amber-500';
            return 'bg-gradient-to-r from-red-400 to-red-500';
        };

        return (
            <div className="p-5 bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-900/40 dark:to-cyan-900/20 rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg" dir={isRtl ? "rtl" : "ltr"}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg">
                            <Target className="text-cyan-600 dark:text-cyan-400 w-5 h-5" />
                        </div>
                        💎 {language === "ar" ? "تحليل التقييم" : "Valuation Analysis"}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm ${gradeBadgeColor}`}>
                        {grade}
                    </span>
                </div>

                {/* Score Summary Row */}
                <div className="flex items-center justify-between mb-5 px-3 py-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === "ar" ? "النتيجة الإجمالية" : "Total Score"}</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{totalScore}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/100</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === "ar" ? "التقييم" : "Assessment"}</div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{assessment}</div>
                        {signal && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{signal}</div>}
                    </div>
                </div>

                {/* 5-Component Bars */}
                <div className="space-y-3 mb-4">
                    {pillars.map((p) => {
                        const barWidth = Math.min((p.value / maxPillar) * 100, 100);
                        return (
                            <div key={p.key}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{p.icon} {p.key}</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{p.value}<span className="text-xs font-normal text-slate-400">/{maxPillar}</span></span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getBarColor(p.value)} rounded-full transition-all duration-700 ease-out`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sector context */}
                {sector && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{language === "ar" ? "القطاع:" : "Sector:"}</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{sector}</span>
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════
    // LEGACY: Deep Valuation (multiples-based) — fallback
    // ═══════════════════════════════════════════════════════
    const multiplesRaw = safeData.multiples && typeof safeData.multiples === "object" ? safeData.multiples : {};
    const multiples = Object.fromEntries(
        Object.entries(multiplesRaw).filter(([key]) => typeof key === "string" && key.trim().length > 0)
    ) as Record<string, number | null>;
    const verdict = typeof safeData.verdict === "string" ? safeData.verdict : (language === "ar" ? "غير متاح" : "N/A");
    const isUndervalued = verdict.toLowerCase().includes('under');
    const isOvervalued = verdict.toLowerCase().includes('over');
    const verdictColor = isUndervalued ? 'text-emerald-600 bg-emerald-50' : isOvervalued ? 'text-red-600 bg-red-50' : 'text-cyan-600 bg-cyan-50';

    const values = Object.values(multiples)
        .map(v => (typeof v === "number" ? v : Number(v)))
        .filter(v => Number.isFinite(v)) as number[];
    const maxVal = Math.max(...values, 1);

    return (
        <div className="p-5 bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-900/40 dark:to-cyan-900/20 rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg">
                        <Target className="text-cyan-600 dark:text-cyan-400 w-5 h-5" />
                    </div>
                    💎 {language === "ar" ? "تحليل التقييم" : "Valuation Analysis"}
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${verdictColor}`}>
                    {verdict}
                </span>
            </div>
            <div className="space-y-3 mb-4">
                {Object.entries(multiples).slice(0, 6).map(([key, val]) => {
                    if (val === null || val === undefined || (val as any) === "N/A") return null;
                    const numVal = typeof val === "number" ? val : Number(val);
                    if (!Number.isFinite(numVal)) return null;
                    const barWidth = Math.min((numVal / maxVal) * 100, 100);
                    const isHigh = numVal > maxVal * 0.7;
                    const barColor = isHigh ? 'bg-gradient-to-r from-cyan-400 to-cyan-600' : 'bg-gradient-to-r from-blue-400 to-blue-600';
                    return (
                        <div key={key} className="group">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{key}</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{numVal.toFixed(2)}</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`} style={{ width: `${barWidth}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "أقل من القيمة العادلة" : "Undervalued"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "قيمة عادلة" : "Fair Value"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "أعلى من القيمة العادلة" : "Overvalued"}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DEEP EFFICIENCY/GROWTH CARD (Generic Metrics)
// ============================================================
interface DeepMetricsProps {
    title: string;
    data: {
        symbol: string;
        verdict?: string;
        roce?: number;
        metrics: Record<string, string | number | null>;
    };
    icon?: React.ReactNode;
    accentColor?: "blue" | "emerald" | "slate";
}

export function DeepMetricsCard({ title, data, icon, accentColor = "blue", language = "en" }: DeepMetricsProps & { language?: "en" | "ar" }) {
    const isGrowth = title?.toLowerCase().includes("growth");
    const isEfficiency = title?.toLowerCase().includes("efficiency");
    const isRtl = language === "ar";

    return (
        <div className="p-5 bg-white dark:bg-[#1A1F2E] rounded-3xl border border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-black text-lg tracking-tight">
                    <div className={clsx(
                        "p-2 rounded-xl border shadow-sm",
                        accentColor === 'blue' ? "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400" :
                            accentColor === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-400"
                    )}>
                        {icon || <Activity className="w-5 h-5" />}
                    </div>
                    {title}
                </div>
                {data.verdict && (
                    <span className={clsx(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        accentColor === 'blue' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20" :
                            accentColor === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" :
                                "bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-400 border-slate-100 dark:border-white/10"
                    )}>
                        {data.verdict}
                    </span>
                )}
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(data.metrics).slice(0, 6).map(([key, val]) => {
                    if (val === null || val === undefined || val === "N/A") return null; // STRICT HIDE

                    const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
                    const isPercent = String(val).includes('%') || Math.abs(numVal) <= 1;
                    const displayVal = isPercent ? `${(numVal * (Math.abs(numVal) <= 1 ? 100 : 1)).toFixed(1)}%` : String(val);
                    const isPositive = numVal > 0;

                    return (
                        <div key={key} className="p-3.5 bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate pr-2">{key.replace(/_/g, ' ')}</span>
                                {isGrowth && (
                                    <div className={clsx(
                                        "w-4 h-4 rounded-full flex items-center justify-center",
                                        isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
                                    )}>
                                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "text-lg font-black tracking-tighter",
                                isPositive && isGrowth ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            )}>
                                {displayVal}
                            </div>
                            {isPercent && numVal !== 0 && (
                                <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full transition-all duration-700",
                                            isPositive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'
                                        )}
                                        style={{ width: `${Math.min(Math.abs(numVal * (Math.abs(numVal) <= 1 ? 100 : 1)), 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {isGrowth ? (language === "ar" ? "📊 تحليل آخر 12 شهر" : "📊 Analysis TTM") : (language === "ar" ? "⚙️ نسب الأداء" : "⚙️ Performance Ratios")}
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    {data.symbol}
                </span>
            </div>
        </div>
    );
}

export function OwnershipCard({ title, data, language = "en" }: OwnershipProps & { language?: "en" | "ar" }) {
    const isRtl = language === "ar";
    return (
        <div className="p-4 bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-300 font-bold">
                <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
                {title || (language === "ar" ? "كبار المساهمين" : "Major Shareholders")}
            </div>
            <div className="space-y-3">
                {data.shareholders.map((holder, i) => (
                    <div key={i} className="flex items-start justify-between p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                        <div className="flex-1 mr-3">
                            <div className="text-sm font-semibold text-slate-800 dark:text-white">{holder.name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(holder.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {holder.percent.toFixed(2)}%
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {formatNumber(holder.shares, 0)} {language === "ar" ? "سهم" : "sh"}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Fair Value Card
// ============================================================

interface FairValueProps {
    title?: string;
    data: {
        current_price: number;
        currency: string;
        pe: number | null;
        pb: number | null;
        models: Array<{
            model: string;
            value: number;
            upside: number;
        }>;
    };
}

export function FairValueCard({ title, data, language = "en" }: FairValueProps & { language?: "en" | "ar" }) {
    const isRtl = language === "ar";
    return (
        <div className="p-4 bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-300 font-bold">
                <Target size={18} className="text-blue-600 dark:text-blue-400" />
                {title || (language === "ar" ? "تحليل التقييم" : "Valuation Analysis")}
            </div>

            {/* Quick Ratios */}
            <div className="flex gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="flex-1 text-center border-r border-slate-100 dark:border-white/10 last:border-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{language === "ar" ? "السعر الحالي" : "Current Price"}</div>
                    <div className="text-xl font-black text-slate-800 dark:text-white">
                        {formatNumber(data.current_price)} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{data.currency}</span>
                    </div>
                </div>
                <div className="flex-1 text-center border-r border-slate-100 dark:border-white/10 last:border-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{language === "ar" ? "مكرر الربحية" : "P/E Ratio"}</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.pe?.toFixed(2) || '-'}</div>
                </div>
                <div className="flex-1 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{language === "ar" ? "مضاعف الدفترية" : "P/B Ratio"}</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.pb?.toFixed(2) || '-'}</div>
                </div>
            </div>

            {/* Models Table */}
            <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{language === "ar" ? "نماذج القيمة العادلة" : "Fair Value Models"}</div>
                {data.models.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.model}</div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-800 dark:text-white">{formatNumber(m.value)}</div>
                            <div className={`text-xs font-bold ${m.upside > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {m.upside > 0 ? '+' : ''}{m.upside.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Fund Cards (New)
// ============================================================

interface FundNavProps {
    data: {
        fund_id: string;
        name: string;
        nav: number | null;
        currency: string;
        aum_millions: number | null;
        is_shariah: boolean;
        returns_ytd: number | null;
        returns_1y: number | null;
        returns_3m: number | null;
        manager: string | null;
    };
    language?: "en" | "ar";
}

export function FundNavCard({ data, language = "en" }: FundNavProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="p-4 bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-500/10 rounded-bl-full opacity-50 -z-0" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                {t.mutualFunds}
                            </span>
                            {data.is_shariah && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Target size={10} /> {t.shariah}
                                </span>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{data.name}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Building2 size={12} />
                            {data.manager || t.unknownManager}
                        </div>
                    </div>
                </div>

                {/* Main Stats (NAV & AUM) */}
                <div className="flex items-end gap-6 mb-6">
                    <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-0.5">{t.navPrice}</div>
                        <div className={`flex items-baseline gap-1 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
                            <span className="text-3xl font-black text-slate-800 dark:text-white">
                                {data.nav ? formatNumber(data.nav) : t.noData}
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{data.currency}</span>
                        </div>
                    </div>
                    {data.aum_millions && (
                        <div className="pb-1">
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-0.5">{t.aum}</div>
                            <div className="text-lg font-bold text-slate-600 dark:text-slate-300">
                                {formatNumber(data.aum_millions)} M
                            </div>
                        </div>
                    )}
                </div>

                {/* Returns Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: t.threeMonth, value: data.returns_3m },
                        { label: t.ytd, value: data.returns_ytd },
                        { label: t.oneYear, value: data.returns_1y },
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 text-center border border-slate-100 dark:border-white/10">
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mb-1">{item.label}</div>
                            <div className={`font-bold text-sm ${(item.value || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                                }`}>
                                {item.value !== null ? `${item.value > 0 ? '+' : ''}${item.value.toFixed(1)}%` : '-'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface FundListProps {
    title?: string;
    data: {
        count: number;
        funds: Array<{
            fund_id: string;
            name: string;
            nav: number | null;
            returns_ytd: number | null;
            is_shariah: boolean;
        }>;
    };
    onSymbolClick?: (symbol: string) => void;
    language?: "en" | "ar";
}

export function FundListCard({ title, data, onSymbolClick, language = "en" }: FundListProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <PieChart size={16} className="text-blue-600 dark:text-blue-400" />
                    {title || t.mutualFunds}
                </div>
                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-white/10">
                    {data.count} {t.found}
                </div>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.funds.map((fund, i) => (
                    <div
                        key={i}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer group"
                        onClick={() => onSymbolClick?.(`fund ${fund.fund_id}`)}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{fund.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {fund.is_shariah && (
                                    <span className="text-[9px] px-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">{t.shariah}</span>
                                )}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">ID: {fund.fund_id}</span>
                            </div>
                        </div>
                        <div className={`${isRtl ? "text-left" : "text-right"}`}>
                            {fund.returns_ytd !== null && (
                                <div className={`text-sm font-bold ${fund.returns_ytd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {fund.returns_ytd > 0 ? '+' : ''}{fund.returns_ytd.toFixed(1)}%
                                </div>
                            )}
                            {fund.nav && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {t.nav} {fund.nav.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {data.count > data.funds.length && (
                <div className="p-2 text-center text-xs text-slate-400 italic bg-slate-50/30 dark:bg-slate-800/30">
                    {t.more}
                </div>
            )}
        </div>
    );
}

interface FundMoversProps {
    title?: string;
    data: {
        range: string;
        funds: Array<{
            fund_id: string;
            name: string;
            return: number;
        }>;
    };
    onSymbolClick?: (symbol: string) => void;
    language?: "en" | "ar";
}

export function FundMoversCard({ title, data, onSymbolClick, language = "en" }: FundMoversProps) {
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-600 dark:text-cyan-400" />
                <div className="font-bold text-slate-700 dark:text-slate-200">{title}</div>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-medium ml-auto">
                    {data.range}
                </span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.funds.map((fund, i) => (
                    <div
                        key={i}
                        className="p-3 hover:bg-cyan-50/30 dark:hover:bg-cyan-900/20 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => onSymbolClick?.(`fund ${fund.fund_id}`)}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">{i + 1}</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={fund.name}>
                                {fund.name}
                            </span>
                        </div>
                        <div className={`text-sm font-bold ${fund.return >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {fund.return > 0 ? '+' : ''}{fund.return.toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// [Cleaned]

// ============================================================
// Financial Explorer Card (Ultra Premium)
// ============================================================

interface PeriodDataset {
    years: string[];
    income: StatementRow[];
    balance: StatementRow[];
    cashflow: StatementRow[];
    ratios: StatementRow[];
    kpis?: StatementRow[];
    [key: string]: any;
}

interface FinancialExplorerProps {
    data: {
        symbol: string;
        currency: string;
        period_type: string;
        years: string[];
        income: StatementRow[];
        balance: StatementRow[];

        cashflow: StatementRow[];
        ratios: StatementRow[];
        kpis?: StatementRow[];
        annual_data?: PeriodDataset;
        quarterly_data?: PeriodDataset;
        ttm_data?: PeriodDataset;
        [key: string]: any;
    };
    language?: "en" | "ar";
}

function FinancialExplorerCard({ data, language = "en" }: FinancialExplorerProps) {
    const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'ratios' | 'kpis'>('income');
    const [displayType, setDisplayType] = useState<'annual' | 'quarterly' | 'ttm'>('annual');
    const t = translations[language].chat;
    const isRtl = language === "ar";

    // Get the correct dataset based on displayType (annual vs quarterly vs TTM)
    let currentDataset = data.annual_data || data;
    if (displayType === 'quarterly') {
        currentDataset = data.quarterly_data || data;
    } else if (displayType === 'ttm') {
        currentDataset = data.ttm_data || data.annual_data || data;
    }

    const activeRows = (currentDataset[activeTab] || []).filter((r: any) => r && r.values);
    const rawYears = currentDataset.years || data.years || [];

    // Filter uniqueYears to only include those with actual data in activeRows
    const uniqueYears = rawYears.filter(year =>
        activeRows.some(row => {
            if (!row.values) return false;
            const v = row.values[year];
            return v !== null && v !== undefined;
        })
    );

    // Format large numbers
    const formatValue = (val: number | string | null | undefined, fmt?: string, label?: string): string => {
        if (val === null || val === undefined) return "—";
        if (typeof val === 'string') return val;

        // Heuristic: Check for percentage keywords in label
        const isPercentMetric = label && (
            label.toLowerCase().includes("growth") ||
            label.toLowerCase().includes("margin") ||
            label.toLowerCase().includes("yield") ||
            label.toLowerCase().includes("return") ||
            label.toLowerCase().includes("tax rate") ||
            label.toLowerCase().includes("payout")
        );

        if (fmt === 'percent' || isPercentMetric || (val !== 0 && Math.abs(val) < 1 && !Number.isInteger(val))) {
            const pct = val;
            return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        }

        const absVal = Math.abs(val);
        if (absVal >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} B`;
        if (absVal >= 1_000_000) return `${(val / 1_000_000).toFixed(2)} M`;

        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Export to Excel via Backend API (professional formatting)
    const handleExport = async () => {
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://starta.46-224-223-172.sslip.io';
            const url = `${API_BASE}/api/v1/financials/${data.symbol}/export?period_type=${displayType === 'annual' ? 'annual' : 'quarterly'}&limit=10`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${data.symbol}_Financials_${displayType}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Export failed:', error);
            // Fallback to client-side TSV if backend fails
            const headers = ['Line Item', ...uniqueYears];
            const rows = activeRows.map(row => {
                const values = uniqueYears.map(year => {
                    const val = row.values[year];
                    return val !== null && val !== undefined ? val : '';
                });
                return [row.label, ...values].join('\t');
            });
            const tsv = [headers.join('\t'), ...rows].join('\n');
            const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.symbol}_${activeTab}.xls`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };


    return (
        <div className="bg-white/95 dark:bg-[#1A1F2E]/95 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden my-2 ring-1 ring-slate-100/50 dark:ring-white/5 w-full max-w-full group/card transition-all hover:shadow-md" dir={isRtl ? "rtl" : "ltr"}>
            {/* Premium Header - Ultra Compact */}
            <div className="bg-slate-900 p-2.5 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-sm flex items-center justify-center text-white font-bold text-xs border border-white/10">
                            {data.symbol ? data.symbol[0] : '?'}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-white tracking-tight leading-none">{data.symbol || 'UNKNOWN'} {t.financials}</h3>
                                <span className="px-1 py-px rounded-full bg-white/10 text-[9px] font-bold text-white/70 border border-white/10 uppercase tracking-widest backdrop-blur-sm leading-none">
                                    {data.currency || 'SAR'}
                                </span>
                            </div>
                            <div className="text-[10px] text-blue-200/80 font-medium mt-1">{t.numbersByMillions}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-medium transition-all hover:text-white ${isRtl ? "mr-auto md:mr-0" : "ml-auto md:ml-0"}`}
                    >
                        <Download className="w-2.5 h-2.5 opacity-60" />
                        {t.export}
                    </button>
                </div>

                {/* Modern Pill Tabs - Ultra Compact */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                    {[
                        { id: 'income', label: t.income, icon: BarChart3 },
                        { id: 'balance', label: t.balance, icon: PieChart },
                        { id: 'cashflow', label: t.cashFlow, icon: TrendingUp },
                        { id: 'ratios', label: t.ratios, icon: Activity },
                        { id: 'kpis', label: t.kpis, icon: Target }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                group relative px-2 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1 transition-all duration-300 border
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm border-blue-500'
                                    : 'bg-slate-800/50 text-slate-400 hover:text-white border-transparent hover:bg-slate-700'
                                }
                            `}
                        >
                            <tab.icon className={`w-2.5 h-2.5 ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Smart Controls Bar - Ultra Compact */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-1.5 backdrop-blur-sm">
                <div className="text-[9px] font-medium text-slate-500 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    {t.liveData}
                </div>

                <div className="bg-slate-200/50 p-0.5 rounded flex items-center">
                    {[
                        { id: 'annual', label: t.annual },
                        { id: 'quarterly', label: t.quarterly },
                        { id: 'ttm', label: t.ttm }
                    ].map((typeObj) => (
                        <button
                            key={typeObj.id}
                            onClick={() => setDisplayType(typeObj.id as any)}
                            className={`
                                px-2 py-px rounded text-[9px] font-bold transition-all duration-200
                                ${displayType === typeObj.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            {typeObj.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Premium Data Table - Ultra Compact Density */}
            <div className="relative w-full overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300/80">
                    <table className="w-full text-[11px] border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr>
                                <th className={`sticky left-0 top-0 z-30 bg-white/95 backdrop-blur-md px-3 py-1.5 ${isRtl ? "text-right border-l" : "text-left border-r"} text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.05)] min-w-[140px] w-1/3`}>
                                    {t.lineItem}
                                </th>
                                {uniqueYears.map(year => {
                                    // Logic to display TTM if year is current year + 1 (synthetic) or explicitly "TTM"
                                    const currentYear = new Date().getFullYear();
                                    const isTTM = parseInt(year) > currentYear || year.includes('TTM');
                                    let displayYear = year;

                                    if (isTTM && !year.includes('TTM')) {
                                        displayYear = t.ttm;
                                    } else if (!isNaN(parseInt(year)) && !year.includes('Q')) {
                                        displayYear = `${t.fy} ${year}`;
                                    }

                                    return (
                                        <th key={year} className={`px-3 py-1.5 ${isRtl ? "text-left" : "text-right"} text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/95 backdrop-blur-md border-b border-slate-200 min-w-[70px]`}>
                                            {displayYear}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {activeRows.length > 0 ? (
                                activeRows.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={`
                                            group transition-colors duration-75
                                            ${row.label === 'Period Ending' ? '!bg-slate-50' : ''}
                                            ${row.isSubtotal ? 'bg-slate-50/60 hover:bg-slate-100' : 'hover:bg-blue-50/20'}
                                        `}
                                    >
                                        <td
                                            className={`
                                                px-3 py-1.5 sticky left-0 z-10 ${isRtl ? "border-l text-right" : "border-r text-left"} border-slate-50 group-hover:border-blue-100/30 transition-colors
                                                ${row.label === 'Period Ending' ? '!bg-slate-100/90 text-[10px]' : ''}
                                                ${row.isSubtotal
                                                    ? 'bg-slate-50/95 font-bold text-slate-800'
                                                    : 'bg-white/95 text-slate-600 font-medium'
                                                }
                                            `}
                                            style={isRtl ? { paddingRight: `${12 + (row.indent || 0) * 8}px` } : { paddingLeft: `${12 + (row.indent || 0) * 8}px` }}
                                        >
                                            <div className={`flex items-center justify-between gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                                                <span className={`truncate max-w-[140px] ${row.label === 'Period Ending' ? 'font-bold text-slate-700' : ''}`} title={row.label}>{row.label}</span>
                                                {row.isGrowth && (
                                                    <span className="shrink-0 text-[8px] font-bold bg-slate-100 text-slate-400 px-1 rounded uppercase tracking-wider">
                                                        YoY
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {uniqueYears.map(year => {
                                            const val = row.values?.[year];
                                            return (
                                                <td
                                                    key={year}
                                                    className={`
                                                        px-3 py-1.5 ${isRtl ? "text-left" : "text-right"} font-mono tabular-nums
                                                        ${row.label === 'Period Ending' ? 'text-[10px] font-bold text-slate-800' : ''}
                                                        ${row.isGrowth
                                                            ? (typeof val === 'number' && val >= 0) ? 'text-emerald-600 font-bold' : (typeof val === 'number' ? 'text-rose-500 font-bold' : '')
                                                            : row.isSubtotal ? 'font-bold text-slate-900' : 'text-slate-600'
                                                        }
                                                    `}
                                                >
                                                    {formatValue(val, row.format, row.label)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={uniqueYears.length + 1} className="py-6 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-1">
                                            <Table className="w-4 h-4 opacity-20" />
                                            <span className="text-[10px]">{t.noData}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between">
                    <span></span>
                    <span>{uniqueYears.length} {t.periods}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Legacy Financial Cards
// ============================================================

// ============================================================
// News List Card
// ============================================================

interface NewsListProps {
    title?: string;
    data: {
        items: Array<{
            id?: number;
            title: string;
            date?: string;
            summary?: string;
            url?: string;
            internal_path?: string;
            image_url?: string;
            published_at?: string;
        }>;
        window_days?: number;
        coverage?: {
            total?: number;
            with_image?: number;
            with_body?: number;
        };
    };
    language?: "en" | "ar";
}

export function NewsListCard({ title, data, language = "en" }: NewsListProps) {
    if (!data.items || data.items.length === 0) return null;
    const t = translations[language].chat;
    const isRtl = language === "ar";
    const readLabel = language === "ar" ? "قراءة المقال الكامل" : "Read Full Article";
    const updatedLabel = language === "ar" ? "آخر تحديث" : "Latest Update";

    const resolveInternalHref = (item: NewsListProps["data"]["items"][number]) => {
        if (item.internal_path && item.internal_path.startsWith("/")) return item.internal_path;
        if (item.url && item.url.startsWith("/")) return item.url;
        if (item.id) return `/news/${item.id}`;
        return "/news";
    };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-900/10 dark:to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm">
                        <Newspaper size={20} className="stroke-[2.5]" />
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{title || t.latestHeadlines}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
                    {data.coverage?.total || data.items.length} {language === "ar" ? "عناصر" : "Items"}
                </span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5 max-h-[450px] overflow-y-auto scrollbar-hide">
                {data.items.map((item, i) => (
                    <a
                        key={i}
                        href={resolveInternalHref(item)}
                        className="group block p-6 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all duration-300"
                    >
                        <div className="flex items-start gap-4">
                            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                                {resolveNewsImageSrc(item.image_url) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={resolveNewsImageSrc(item.image_url) || undefined}
                                        alt={item.title}
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-[radial-gradient(circle_at_top,#0ea5e9_0%,#111827_45%,#020617_100%)]" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                        <Clock size={12} className="stroke-[2.5]" />
                                        {updatedLabel}
                                    </span>
                                    {item.date && (
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            {item.date}
                                        </span>
                                    )}
                                </div>

                                <h4 className={`mb-2 text-[15px] font-black leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 ${isRtl ? "text-right" : "text-left"}`}>
                                    {item.title}
                                </h4>
                                {item.summary && (
                                    <p className={`line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
                                        {item.summary}
                                    </p>
                                )}
                                <div className={`mt-3 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-600 transition group-hover:text-cyan-500 dark:text-cyan-300 ${isRtl ? "flex-row-reverse" : ""}`}>
                                    {readLabel}
                                    <ArrowUpRight size={13} className={`stroke-[3] transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
                <button className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all flex items-center justify-center gap-2 select-none uppercase tracking-widest mx-auto group">
                    {t.exploreInsights} <ArrowUpRight size={14} className={`stroke-[3] group-hover:-translate-y-0.5 transition-transform ${isRtl ? "group-hover:-translate-x-0.5 rotate-180" : "group-hover:translate-x-0.5"}`} />
                </button>
            </div>
        </div>
    );
}

// ============================================================
// Chat Cards Container
// ============================================================

// ============================================================
// Screener Results Card (New for Phase 6)
// ============================================================

interface ScreenerResultsProps {
    title?: string;
    data: {
        stocks: Array<{
            symbol: string;
            name: string;
            price: number;
            value: number;
            change_percent?: number;
            market_code: string;
        }>;
        metric: string;
    };
    onSymbolClick?: (symbol: string) => void;
    language?: "en" | "ar";
}

export function ScreenerResultsCard({ title, data, onSymbolClick, language = "en" }: ScreenerResultsProps) {
    const isPercentage = data.metric?.toLowerCase().includes("yield") ||
        data.metric?.toLowerCase().includes("percent") ||
        data.metric?.toLowerCase().includes("growth") ||
        data.metric?.toLowerCase().includes("margin") ||
        data.metric?.toLowerCase().includes("return") ||
        title?.toLowerCase().includes("dividend");

    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/10 shadow-xl overflow-hidden mt-2 transition-colors" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-900/20 dark:to-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Target size={18} />
                    </div>
                    <span className="font-black text-slate-800 dark:text-white text-lg">{title || t.screenerResults}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/50 px-2 py-1 rounded-lg">
                    {data.metric?.replace(/_/g, " ")}
                </span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.stocks.slice(0, 10).map((stock, i) => (
                    <div
                        key={stock.symbol}
                        className="group flex items-center gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer"
                        onClick={() => onSymbolClick?.(stock.symbol)}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${i < 3 ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"}`}>
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-left" dir="ltr">{stock.symbol}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 truncate text-start">{stock.name}</div>
                        </div>
                        <div className={`flex flex-col ${isRtl ? "items-start" : "items-end"}`}>
                            <div className="font-black text-slate-900 dark:text-white">
                                {stock.change_percent !== undefined
                                    ? formatNumber(stock.price || stock.value)
                                    : (isPercentage ? `${stock.value.toFixed(2)}%` : formatNumber(stock.value))}
                            </div>
                            {stock.change_percent !== undefined ? (
                                <div className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-md inline-block mt-0.5",
                                    stock.change_percent >= 0
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-red-500/10 text-red-500 dark:text-red-400"
                                )}>
                                    {formatPercent(stock.change_percent)}
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">
                                    {data.metric?.replace(/_/g, " ") || t.value}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-slate-50 dark:bg-white/5 px-4 py-2 text-[10px] text-slate-400 dark:text-slate-500 text-center tracking-wide uppercase font-bold">
                {t.topMatches} {data.metric?.replace(/_/g, " ")}
            </div>
        </div>
    );
}

interface ChatCardsProps {
    cards: Card[];
    language?: "en" | "ar" | "mixed";
    onSymbolClick?: (symbol: string) => void;
    onExampleClick?: (text: string) => void;
    showExport?: boolean;
}

export function ChatCards({ cards, language = "en", onSymbolClick, onExampleClick, showExport = false }: ChatCardsProps) {
    const safeCards = Array.isArray(cards)
        ? cards.filter((card: any) => card && typeof card === "object")
        : [];

    // Integrity Tracer - Professional Verification
    console.log("💎 FinanceHub Pro v3.7-ULTRA-PRD Loaded", {
        timestamp: new Date().toISOString(),
        engine: "Ultra-Premium-v7",
        cards: safeCards.length
    });

    if (!safeCards.length) return null;

    return (
        <div className="space-y-3 mt-3">
            {safeCards.map((card, i) => (
                <SafeChatCard key={i} title={card.title || card.type}>
                    <ChatCard
                        key={i}
                        card={card}
                        language={language}
                        onSymbolClick={onSymbolClick}
                        onExampleClick={onExampleClick}
                    />
                </SafeChatCard>
            ))}
            {showExport && safeCards.length > 0 && (
                <ExportToolbar
                    data={safeCards.map(c => c?.data || {})}
                    title="chat_data"
                />
            )}
        </div>
    );
}

// ============================================================
// Dividends Table Card
// ============================================================

interface DividendsTableProps {
    title?: string;
    data: {
        dividends: Array<{
            ex_date: string;
            amount: number;
            currency: string;
        }>;
        current_yield?: number;
        total_annual?: number;
        currency: string;
    };
    language?: "en" | "ar";
}

export function DividendsTableCard({ title, data, language = "en" }: DividendsTableProps) {
    if (!data.dividends || data.dividends.length === 0) return null;
    const t = translations[language].chat;
    const isRtl = language === "ar";

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/10 shadow-xl overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-900/20 dark:to-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <DollarSign size={18} />
                    </div>
                    <span className="font-black text-slate-800 dark:text-white text-lg">{title || t.dividendHistory}</span>
                </div>
                {data.current_yield && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/50 px-2 py-1 rounded-lg">
                        {t.yield}: {data.current_yield.toFixed(2)}%
                    </span>
                )}
            </div>

            <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-white/5 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className={`px-5 py-3 ${isRtl ? "text-right" : "text-left"} font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider`}>{t.exDate}</th>
                            <th className={`px-5 py-3 ${isRtl ? "text-left" : "text-right"} font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider`}>{t.amount} ({data.currency})</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {data.dividends.map((div, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className={`px-5 py-3 font-bold text-slate-700 dark:text-slate-300 font-mono ${isRtl ? "text-right" : "text-left"}`}>
                                    {div.ex_date ? new Date(div.ex_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noData}
                                </td>
                                <td className={`px-5 py-3 font-black text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${isRtl ? "text-left" : "text-right"}`}>
                                    {formatNumber(div.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.total_annual && (
                <div className="px-5 py-3 bg-emerald-50/30 dark:bg-emerald-900/10 border-t border-emerald-100 dark:border-emerald-900/20 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.last12Months}</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-base">{formatNumber(data.total_annual)} <span className="text-xs opacity-50">{data.currency}</span></span>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Chat Card (Main Switch)
// ============================================================

function ChatCard({ card, language, onSymbolClick, onExampleClick }: any) {
    if (!card || typeof card !== "object") {
        return null;
    }
    if (!card.type) return null;
    if (!card.data || typeof card.data !== "object") {
        card = { ...card, data: {} };
    }

    const type = (card.type || "").toLowerCase().trim();
    const chatT = translations[language === "ar" ? "ar" : "en"].chat;
    const rawErrorText = card?.data?.error;
    const safeErrorText = (
        language === "ar" && typeof rawErrorText === "string" && /[A-Za-z]/.test(rawErrorText)
    ) ? chatT.unknownSystemFailure : (rawErrorText || chatT.unknownSystemFailure);

    // Handle error cards robustly, even if type is not explicitly "error"
    if (card.data?.error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                <div className="flex items-center gap-2 font-bold mb-1 uppercase tracking-tighter text-xs">
                    <AlertTriangle size={14} />
                    {language === "ar" ? "سجل تشخيص النظام" : "System Debug Entry"}
                </div>
                <div className="text-sm font-medium">{safeErrorText}</div>
            </div>
        );
    }

    switch (type) {
        case "stock_header":
            return <StockHeaderCard data={card.data} language={language} />;
        case "snapshot":
            return <SnapshotCard data={card.data} language={language} />;
        case "stats":
        case "statistics": // Alias
        case "metric": // Alias
            return <StatsCard title={card.title} data={card.data} language={language} />;
        case "movers":
        case "movers_table":
            return <MoversTable title={card.title} data={card.data} onSymbolClick={onSymbolClick} language={language} />;
        case "compare":
        case "compare_table":
            return <CompareTable title={card.title} data={card.data} language={language} />;
        case "help":
        case "suggestions": // Alias
            return <HelpCard data={card.data} onExampleClick={onExampleClick} language={language} />;
        case "ratios":
            return <RatiosCard title={card.title} data={card.data} language={language} />;
        case "deep_health":
            return <DeepHealthCard data={card.data} language={language} />;
        case "deep_valuation":
        case "valuation_score": // Added alias for backend compatibility
            return <DeepValuationCard data={card.data} language={language} />;
        case "deep_efficiency":
            return <DeepMetricsCard title={card.title} data={card.data} icon={<Zap className="text-blue-500" />} language={language} />;
        case "deep_growth":
            return <DeepMetricsCard title={card.title} data={card.data} icon={<TrendingUp className="text-emerald-500" />} language={language} />;
        case "ownership":
            return <OwnershipCard title={card.title} data={card.data} language={language} />;
        case "macro_context":
        case "macro_score":
            return <MacroScoreCard data={card.data} language={language} />;
        // Fund & Fair Value Cards (Enterprise)
        case "fund_nav":
            return <FundNavCard data={card.data} language={language} />;
        case "fund_list":
            return <FundListCard title={card.title} data={card.data} onSymbolClick={onSymbolClick} language={language} />;
        case "fund_movers":
            return <FundMoversCard title={card.title} data={card.data} onSymbolClick={onSymbolClick} language={language} />;
        case "fair_value":
            return <FairValueCard title={card.title} data={card.data} language={language} />;
        case "technicals":
            // Explicitly hidden as per user request
            return null;
        case "financial_explorer":
            // Ultra-Premium Financial Explorer (Tabbed Interface)
            return <FinancialExplorerCard data={card.data} language={language} />;
        case "financials":
            // Handle legacy structures
            if (card.data.rows) {
                return (
                    <FinancialsTableCard
                        title={card.title}
                        rows={card.data.rows}
                        years={card.data.years}
                        subtitle={card.data.subtitle}
                        currency={card.data.currency}
                        language={language}
                    />
                );
            }
            // Fallback for FinancialExplorer data sent as 'financials' intent
            if (card.data.annual_data || card.data.income) {
                return <FinancialExplorerCard data={card.data} language={language} />;
            }
            return <FinancialTable financials={card.data} language={language} />;
        case "dividends_table":
            return <DividendsTableCard title={card.title} data={card.data} language={language} />;
        // Insights (Bull/Bear) - Ultra Premium
        case "bull_case":
            return <InsightCard data={card.data} variant_override="bull" />;
        case "bear_case":
            return <InsightCard data={card.data} variant_override="bear" />;
        case "my_framework":
            return <InsightCard data={{ ...card.data, title: card.title }} variant_override="info" />;
        case "insight":
            return <InsightCard data={card.data} />;

        // ============================================================
        // EXTENDED SCENARIO COMPONENTS (Enterprise)
        // ============================================================
        case "macro_score":
        case "market_timing":
            return <MacroScoreCard data={card.data} language={language} />;
        case "educational":
        case "define_term":
        case "definition":
            return <EducationalCard data={card.data} language={language} />;
        case "methodology":
        case "screening_criteria":
            return <MethodologyCard data={card.data} language={language} />;
        case "hidden_gems":
        case "gem_list":
        case "discovery_list":
            return <HiddenGemCard data={card.data} onStockClick={onSymbolClick} language={language} />;
        case "index_composition":
        case "index_view":
            return <IndexCompositionCard data={card.data} onStockClick={onSymbolClick} language={language} />;
        case "disclaimer":
        case "disclaimer_card":
            return <DisclaimerCard data={card.data} language={language} />;

        case "score_breakdown":
        case "starta_score":
            return <ScoreBreakdownCard data={card.data} language={language} />;


        case "news_list":
            return <NewsListCard title={card.title} data={card.data as any} language={language} />;
        case "screener_results":
        case "sector_list": // Reuse screener card or fallback?
            // Sector list data usually different. Fallback to screener if compatible or TODO. 
            // ScreenerResultsCard expects { stocks: [], metric: str }
            // Let's assume sector_list maps closely or default to fallback for now to avoid crash.
            // Actually, handle_screener sends { sectors: [{name, ...}], metric } for sector_list.
            // ScreenerResults expects `stocks`. It might break.
            // Safest is to handle "dividends_table" which is THE user error.
            return <ScreenerResultsCard title={card.title} data={card.data} onSymbolClick={onSymbolClick} language={language} />;
        case "error":
            return (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                    <div className="flex items-center gap-2 font-bold mb-1 uppercase tracking-tighter text-xs">
                        <AlertTriangle size={14} />
                        {chatT.systemError}
                    </div>
                    <div className="text-sm font-medium">{safeErrorText}</div>
                </div>
            );
        default:
            // Fallback for unknown cards
            return (
                <div className="p-4 bg-slate-50 dark:bg-slate-500/10 border border-slate-100 dark:border-slate-500/20 rounded-xl text-xs text-slate-500">
                    {language === "ar" ? chatT.unsupportedCard : `${chatT.unsupportedCard}: ${type}`}
                </div>
            );
    }
}

// ============================================================
// Utilities
// ============================================================

// Utilities
// ============================================================

function formatNumber(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined) return "-";
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(value: number | null | undefined, forceSign = false): string {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "-";
    const sign = (num >= 0 && forceSign) ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
}

function formatValue(val: any, format?: string, label?: string) {
    if (val === null || val === undefined) return "-";
    if (typeof val === 'string') return val;

    const lowerLabel = label?.toLowerCase() || "";
    const isGrowth = lowerLabel.includes("growth") || lowerLabel.includes("change");

    const isPercentMetric = isGrowth ||
        lowerLabel.includes("margin") ||
        lowerLabel.includes("yield") ||
        lowerLabel.includes("return") ||
        lowerLabel.includes("tax rate") ||
        lowerLabel.includes("payout");

    if (format === 'percent' || isPercentMetric) {
        return formatPercent(Number(val), isGrowth);
    }

    // Ratios usually 2 decimals, formatting handles >1000
    // But Market Cap / Enterprise Value / Revenue need abbreviations
    // We can assume large numbers > 1M are monetary
    if (Math.abs(val) >= 1e6) {
        return formatNumber(val);
    }

    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
