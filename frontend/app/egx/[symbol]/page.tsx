'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { fetchYahooProfile, fetchTickers, fetchHistory } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart,
    Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, BarChart2, DollarSign,
    PieChart as PieIcon, Building2, Calendar, FileText, Globe, MapPin, Users,
    Star, Briefcase, AlertTriangle, Scale, ChartLine, LayoutDashboard,
    ChartCandlestick, Building, BarChart3, Clock, Banknote, Percent,
    ArrowUpRight, ArrowDownRight, Minus, ExternalLink, Info, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// 2026 ULTRA-PREMIUM DESIGN SYSTEM
// ============================================================================

const formatNumber = (n: any, decimals = 2) => {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatPercent = (n: any, already100 = false) => {
    if (n == null || isNaN(n)) return '—';
    const val = already100 ? n : n * 100;
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
};

const formatLarge = (n: any) => {
    if (!n || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
};

const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

const normalizeCompanyName = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const candidate = value.trim();
    if (!candidate) return null;
    if (/^(n\/a|na|none|null|-|--)$/i.test(candidate)) return null;
    if (/^[A-Z0-9.\-]+\.CA,0P[A-Z0-9]+,\d+$/i.test(candidate)) return null;
    if (/^[A-Z0-9.\-]+\.CA$/i.test(candidate)) return null;
    if (/^[A-Z]{3,6}$/.test(candidate) && candidate === candidate.toUpperCase()) return null;
    return candidate;
};

// Aurora Gradient SVG Definitions for Charts (Theme-Matched)
const AuroraGradients = () => (
    <defs>
        {/* Cyan Aurora */}
        <linearGradient id="auroraCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
        </linearGradient>
        {/* Teal Aurora (replacing Purple) */}
        <linearGradient id="auroraTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#0d9488" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
        </linearGradient>
        {/* Emerald Aurora */}
        <linearGradient id="auroraEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#059669" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#047857" stopOpacity={0} />
        </linearGradient>
        {/* Rose Aurora */}
        <linearGradient id="auroraRose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#e11d48" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#be123c" stopOpacity={0} />
        </linearGradient>
        {/* Amber Aurora */}
        <linearGradient id="auroraAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#d97706" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
        </linearGradient>
        {/* Horizontal Spectrum - Theme Matched (no purple) */}
        <linearGradient id="auroraSpectrum" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        {/* Glow Filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
);

// Premium Radial Gauge - Dual Theme Optimized
const RadialGauge = ({ value, max = 100, label, color = 'cyan', size = 120 }: any) => {
    const safeValue = Math.min(Math.max(value || 0, 0), max);
    const percentage = (safeValue / max) * 100;
    const strokeWidth = size * 0.06;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colors: any = {
        cyan: { stroke: '#0891b2', trackLight: '#e0f2fe', trackDark: '#164e63' },
        teal: { stroke: '#0d9488', trackLight: '#ccfbf1', trackDark: '#134e4a' },
        emerald: { stroke: '#059669', trackLight: '#d1fae5', trackDark: '#064e3b' },
        rose: { stroke: '#e11d48', trackLight: '#ffe4e6', trackDark: '#4c0519' },
        amber: { stroke: '#d97706', trackLight: '#fef3c7', trackDark: '#451a03' },
        blue: { stroke: '#0f172a', trackLight: '#e2e8f0', trackDark: '#1e293b' },
    };

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Track - Light/Dark */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth={strokeWidth}
                />
                {/* Progress Arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors[color]?.stroke || colors.cyan.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatPercent(value, true)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</span>
            </div>
        </div>
    );
};

// Mini Sparkline for KPI Cards
const MiniSparkline = ({ data, color = '#00d4ff', height = 40 }: any) => {
    if (!data?.length) return null;
    const values = data.slice(-20).map((d: any) => d.close || d.price || d.value || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 100;

    const points = values.map((v: number, i: number) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={`url(#spark-${color.replace('#', '')})`}
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
            />
        </svg>
    );
};

// Premium Card Component - Reimagined 2026 Signature Layer
const GlassCard = ({ children, className = '', noPadding = false, premium = false }: any) => (
    <section
        className={clsx(
            "group/card relative overflow-hidden rounded-3xl transition-all duration-500",
            "border border-slate-200/70 dark:border-white/[0.10]",
            "bg-white/90 dark:bg-[#0B1121]/85 backdrop-blur-2xl",
            "shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_44px_rgba(2,6,23,0.42)]",
            "hover:-translate-y-0.5 hover:border-[#14B8A6]/35 hover:shadow-[0_20px_48px_rgba(20,184,166,0.14)] dark:hover:shadow-[0_22px_56px_rgba(20,184,166,0.22)]",
            !noPadding && "p-6",
            className
        )}
    >
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#14B8A6]/10 blur-3xl dark:bg-[#14B8A6]/18" />
            <div className="absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-[#3B82F6]/8 blur-3xl dark:bg-[#3B82F6]/16" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#14B8A6]/50 to-transparent opacity-40" />
            {premium && (
                <>
                    <div className="absolute right-4 top-4 h-16 w-16 rounded-full border border-[#14B8A6]/25 opacity-60" />
                    <div className="absolute bottom-4 left-4 h-12 w-12 rounded-full border border-[#3B82F6]/25 opacity-50" />
                </>
            )}
        </div>
        <div className="relative">{children}</div>
    </section>
);

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = 'default' }: any) => {
    const iconStyle: any = {
        default: "text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70",
        green: "text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30",
        red: "text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30",
        blue: "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30",
        teal: "text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30",
    };

    return (
        <article
            className={clsx(
                "group/stat relative overflow-hidden rounded-3xl p-5 transition-all duration-500",
                "border border-slate-200/70 dark:border-white/[0.10]",
                "bg-white/90 dark:bg-[#0F172A]/88 backdrop-blur-xl",
                "shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]",
                "hover:-translate-y-1 hover:border-[#14B8A6]/35 hover:shadow-[0_14px_34px_rgba(20,184,166,0.16)]"
            )}
        >
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#14B8A6]/50 to-transparent opacity-60" />
            <div className="mb-4 flex items-start justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    {label}
                </span>
                {Icon && (
                    <span className={clsx("inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10", iconStyle[color] || iconStyle.default)}>
                        <Icon className="h-4 w-4" />
                    </span>
                )}
            </div>
            <div className="flex items-end gap-2">
                <span className="text-[1.85rem] leading-none font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {value}
                </span>
                {trend !== undefined && (
                    <span
                        className={clsx(
                            "mb-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                            trend >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        )}
                    >
                        {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(trend).toFixed(2)}%
                    </span>
                )}
            </div>
            {subValue && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subValue}</p>}
        </article>
    );
};

const TabButton = ({ active, onClick, label, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "relative inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all duration-300 whitespace-nowrap",
            active
                ? "bg-gradient-to-r from-[#14B8A6] via-[#0EA5E9] to-[#14B8A6] text-white shadow-[0_10px_22px_rgba(20,184,166,0.35)]"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/85 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
        )}
    >
        {active && <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/35" />}
        {Icon && <Icon className={clsx("h-4 w-4", active ? "text-white" : "text-slate-500 dark:text-slate-400")} />}
        {label}
    </button>
);

const RangeIndicator = ({ current, low, high, label }: any) => {
    const spread = (high || 0) - (low || 0);
    const percent = spread > 0 ? ((current - low) / spread) * 100 : 0;
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{formatNumber(low)}</span>
                <span className="text-slate-700 dark:text-slate-200">{label}</span>
                <span>{formatNumber(high)}</span>
            </div>
            <div className="relative h-3 rounded-full border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-[#111827]">
                <div className="absolute inset-[1px] rounded-full bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-500 to-cyan-500" />
                <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#0B1121] shadow-[0_0_0_3px_rgba(20,184,166,0.35)] dark:border-[#0B1121] dark:bg-white"
                    style={{ left: `calc(${clamped}% - 8px)` }}
                />
            </div>
        </div>
    );
};

const DataRow = ({ label, value, highlight = false }: any) => (
    <div
        className={clsx(
            "group/row flex items-center justify-between rounded-xl px-3 py-2.5 transition-all",
            "border-b border-slate-100 dark:border-white/[0.05] last:border-b-0",
            "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
            highlight && "bg-[#14B8A6]/8 dark:bg-[#14B8A6]/12 ring-1 ring-[#14B8A6]/20"
        )}
    >
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{value}</span>
    </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EnterpriseStockProfile() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [isWatched, setIsWatched] = useState(false);
    const [chartRange, setChartRange] = useState('1Y');

    // Chart Data Preparation - MUST be before any conditional returns
    const chartData = useMemo(() => {
        const h = data?.history || [];
        if (!h?.length) return [];
        return h.slice(-252).map((item: any) => ({
            date: item.date?.split('T')[0] || item.date,
            price: item.close,
            volume: item.volume,
            open: item.open,
            high: item.high,
            low: item.low
        }));
    }, [data?.history]);

    // Data Fetching (Hybrid System)
    useEffect(() => {
        if (!symbol) return;
        setLoading(true);

        const loadData = async () => {
            try {
                const [backendRes, proxyRes] = await Promise.allSettled([
                    fetchYahooProfile(symbol),
                    fetch(`/api/yahoo-service?symbol=${symbol}`).then(r => r.ok ? r.json() : null)
                ]);

                let combined: any = { profile: {}, fundamentals: {}, history: [] };

                if (backendRes.status === 'fulfilled' && backendRes.value) {
                    combined = { ...combined, ...backendRes.value };
                }

                if (proxyRes.status === 'fulfilled' && proxyRes.value) {
                    const p = proxyRes.value;
                    if (p.profile) combined.profile = { ...combined.profile, ...p.profile };
                    if (p.fundamentals) combined.fundamentals = { ...combined.fundamentals, ...p.fundamentals };
                }

                if (Object.keys(combined.profile).length === 0) {
                    const tickers = await fetchTickers().catch(() => []);
                    const tick = tickers.find((t: any) => t.symbol === symbol || t.symbol === `${symbol}.CA`);
                    if (tick) combined.profile = tick;
                }

                if (!combined.history?.length) {
                    const h = await fetchHistory(symbol).catch(() => []);
                    combined.history = h;
                }

                setData(combined);
            } catch (err) {
                console.error("Load Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        const saved = localStorage.getItem('egx_watchlist');
        if (saved && JSON.parse(saved).includes(symbol)) setIsWatched(true);
    }, [symbol]);

    const toggleWatchlist = () => {
        const saved = localStorage.getItem('egx_watchlist');
        let list = saved ? JSON.parse(saved) : [];
        if (list.includes(symbol)) {
            list = list.filter((s: string) => s !== symbol);
            setIsWatched(false);
        } else {
            list.push(symbol);
            setIsWatched(true);
        }
        localStorage.setItem('egx_watchlist', JSON.stringify(list));
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-[100dvh] finhub-page bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto border-4 border-slate-200 dark:border-[#2E3A47] border-t-[#14B8A6] rounded-full animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading market data...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (!data || !data.profile) {
        return (
            <div className="min-h-[100dvh] finhub-page bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center p-4">
                <GlassCard className="max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Symbol Not Found</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Unable to retrieve data for {symbol}</p>
                    <a href="/egx" className="inline-block px-6 py-3 bg-[#14B8A6] text-white font-bold rounded-xl hover:bg-[#0D9488] transition-all shadow-lg shadow-[#14B8A6]/20">
                        Back to Market
                    </a>
                </GlassCard>
            </div>
        );
    }

    const p = data.profile;
    const f = data.fundamentals || {};
    const h = data?.history || [];
    const displayCompanyName =
        normalizeCompanyName(p.display_name) ||
        normalizeCompanyName(p.name_en) ||
        normalizeCompanyName(p.longName) ||
        normalizeCompanyName(p.shortName) ||
        symbol;

    const isPositive = (p.regularMarketChange || p.change || 0) >= 0;
    const currentPrice = p.regularMarketPrice || p.price || p.last_price;
    const priceChange = p.regularMarketChange || p.change || 0;
    const priceChangePct = p.regularMarketChangePercent || p.change_pct || 0;

    const tabs = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard },
        { id: 'chart', label: 'Chart', icon: ChartLine },
        { id: 'financials', label: 'Financials', icon: Scale },
        { id: 'profile', label: 'Profile', icon: Building },
        { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    ];

    return (
        <div className="relative min-h-[100dvh] finhub-page overflow-x-clip bg-slate-50 dark:bg-[#050B17]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-28 top-16 h-80 w-80 rounded-full bg-[#14B8A6]/12 blur-3xl dark:bg-[#14B8A6]/18" />
                <div className="absolute right-[-7rem] top-0 h-[28rem] w-[28rem] rounded-full bg-[#3B82F6]/10 blur-3xl dark:bg-[#3B82F6]/16" />
                <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-[#0EA5E9]/8 blur-3xl dark:bg-[#0EA5E9]/14" />
            </div>

            {/* === HERO HEADER === */}
            <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#050B17]/78">
                <div className="mx-auto max-w-7xl px-4 pb-5 pt-5 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-white/95 via-white/85 to-[#EAF7F6] shadow-[0_18px_42px_rgba(15,23,42,0.10)] dark:border-white/[0.10] dark:from-[#0B1121]/95 dark:via-[#0F172A]/92 dark:to-[#0B2230]/92 dark:shadow-[0_20px_50px_rgba(2,6,23,0.52)]">
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -left-10 -top-14 h-40 w-40 rounded-full bg-[#14B8A6]/20 blur-3xl dark:bg-[#14B8A6]/26" />
                            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#3B82F6]/14 blur-3xl dark:bg-[#3B82F6]/22" />
                            <div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full border border-[#14B8A6]/30" />
                        </div>

                        <div className="relative grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div className="flex items-start gap-4">
                                <div className="relative mt-0.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14B8A6] via-[#0EA5E9] to-[#3B82F6] text-xl font-black text-white shadow-[0_14px_34px_rgba(14,165,233,0.45)] ring-1 ring-white/40">
                                    {symbol.substring(0, 2)}
                                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] dark:border-[#0B1121]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white lg:text-[1.95rem]">
                                            {displayCompanyName}
                                        </h1>
                                        <span className="rounded-lg border border-slate-300/70 bg-white/90 px-2 py-0.5 text-xs font-black uppercase tracking-[0.08em] text-slate-700 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                            {symbol}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 dark:bg-white/[0.05]">
                                            <Building2 className="h-3 w-3 text-[#14B8A6]" />
                                            {p.fullExchangeName || 'EGX'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 dark:bg-white/[0.05]">
                                            <Briefcase className="h-3 w-3 text-[#3B82F6]" />
                                            {p.sector || 'Financial Services'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 dark:bg-white/[0.05]">
                                            <Banknote className="h-3 w-3 text-emerald-500" />
                                            {(p.currency || 'EGP').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-right shadow-sm dark:border-white/[0.12] dark:bg-white/[0.03]">
                                    <div className="flex items-end justify-end gap-2">
                                        <span className="text-[2rem] font-black leading-none tracking-tight text-slate-900 dark:text-white font-mono">
                                            {formatNumber(currentPrice)}
                                        </span>
                                        <span className="mb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{p.currency || 'EGP'}</span>
                                    </div>
                                    <div className={clsx("mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold", isPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300")}>
                                        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        <span>{formatNumber(priceChange)}</span>
                                        <span className="text-xs">{formatPercent(priceChangePct, true)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleWatchlist}
                                    className={clsx(
                                        "inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-all",
                                        isWatched
                                            ? "border-amber-300 bg-amber-100 text-amber-600 shadow-[0_10px_20px_rgba(245,158,11,0.25)] dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-amber-300"
                                            : "border-slate-300/80 bg-white/90 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/[0.15] dark:bg-white/[0.04] dark:text-slate-300"
                                    )}
                                >
                                    <Star className={clsx("h-5 w-5", isWatched && "fill-current")} />
                                </button>
                            </div>
                        </div>

                        <div className="relative border-t border-slate-200/70 bg-white/70 px-5 py-3 dark:border-white/[0.08] dark:bg-white/[0.03] md:px-6">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-2.5 py-1 text-slate-600 dark:border-white/[0.14] dark:bg-white/[0.04] dark:text-slate-300">
                                    <ChartLine className="h-3 w-3 text-[#14B8A6]" />
                                    52W: {formatNumber(p.fiftyTwoWeekLow || p.year_low)} - {formatNumber(p.fiftyTwoWeekHigh || p.year_high)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-2.5 py-1 text-slate-600 dark:border-white/[0.14] dark:bg-white/[0.04] dark:text-slate-300">
                                    <BarChart2 className="h-3 w-3 text-[#3B82F6]" />
                                    Vol: {formatLarge(p.volume || p.regularMarketVolume)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-2.5 py-1 text-slate-600 dark:border-white/[0.14] dark:bg-white/[0.04] dark:text-slate-300">
                                    <Scale className="h-3 w-3 text-emerald-500" />
                                    P/E: {formatNumber(p.trailingPE || f.pe_ratio)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-2.5 py-1 text-slate-600 dark:border-white/[0.14] dark:bg-white/[0.04] dark:text-slate-300">
                                    <Building className="h-3 w-3 text-cyan-500" />
                                    MCap: {formatLarge(p.marketCap || p.market_cap)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-4 flex max-w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 dark:border-white/[0.10] dark:bg-white/[0.04]">
                        {tabs.map(tab => (
                            <TabButton
                                key={tab.id}
                                active={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                label={tab.label}
                                icon={tab.icon}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* === MAIN CONTENT === */}
            <main className="relative mx-auto max-w-7xl px-4 py-8 pb-12 sm:px-6 lg:px-8">

                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="space-y-6">
                        {/* Key Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <StatCard label="Market Cap" value={formatLarge(p.marketCap || p.market_cap)} icon={Building2} color="teal" />
                            <StatCard label="P/E Ratio" value={formatNumber(p.trailingPE || f.pe_ratio)} icon={Scale} />
                            <StatCard label="EPS (TTM)" value={formatNumber(p.epsTrailingTwelveMonths || f.trailing_eps)} icon={DollarSign} color="green" />
                            <StatCard label="Book Value" value={formatNumber(p.bookValue || f.book_value)} icon={Banknote} />
                            <StatCard label="P/B Ratio" value={formatNumber(p.priceToBook || f.price_to_book)} icon={BarChart2} />
                            <StatCard label="Shares Out" value={formatLarge(p.sharesOutstanding || p.shares_outstanding)} icon={Users} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Price Chart Mini */}
                            <GlassCard className="lg:col-span-2" noPadding>
                                <div className="p-6 border-b border-slate-100 dark:border-white/[0.05]">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Price Performance</h3>
                                </div>
                                <div className="h-[300px] p-4">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                                    tickFormatter={(v) => v.split('-').slice(1).join('/')}
                                                />
                                                <YAxis
                                                    domain={['dataMin - 5', 'dataMax + 5']}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                                    width={50}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        border: 'none',
                                                        borderRadius: 12,
                                                        color: '#fff'
                                                    }}
                                                    formatter={(value: any) => [formatNumber(value), 'Price']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke="#14b8a6"
                                                    strokeWidth={2}
                                                    fill="url(#priceGradient)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">
                                            No chart data available
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            {/* 52 Week Range + Moving Averages */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Trading Range</h3>

                                <RangeIndicator
                                    current={currentPrice}
                                    low={p.fiftyTwoWeekLow || p.year_low}
                                    high={p.fiftyTwoWeekHigh || p.year_high}
                                    label="52-Week Range"
                                />

                                <div className="mt-8 space-y-4">
                                    <DataRow label="Previous Close" value={formatNumber(p.regularMarketPreviousClose || p.prev_close)} />
                                    <DataRow label="Day Range" value={`${formatNumber(p.dayLow || p.day_low)} - ${formatNumber(p.dayHigh || p.day_high)}`} />
                                    <DataRow label="50-Day Avg" value={formatNumber(p.fiftyDayAverage)} highlight />
                                    <DataRow label="200-Day Avg" value={formatNumber(p.twoHundredDayAverage)} highlight />
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.05]">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">vs 50D Avg</span>
                                        <span className={clsx(
                                            "font-bold",
                                            (p.fiftyDayAverageChangePercent || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatPercent(p.fiftyDayAverageChangePercent)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-slate-500 dark:text-slate-400">vs 200D Avg</span>
                                        <span className={clsx(
                                            "font-bold",
                                            (p.twoHundredDayAverageChangePercent || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatPercent(p.twoHundredDayAverageChangePercent)}
                                        </span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Volume & Trading Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Volume" value={formatLarge(p.volume || p.regularMarketVolume)} icon={BarChart2} />
                            <StatCard label="Avg Vol (10D)" value={formatLarge(p.averageDailyVolume10Day || p.avg_vol_10d)} icon={Activity} />
                            <StatCard label="Avg Vol (3M)" value={formatLarge(p.averageDailyVolume3Month || p.avg_vol_3m)} icon={BarChart3} />
                            <StatCard
                                label="52W Change"
                                value={formatPercent(p.fiftyTwoWeekChangePercent, true)}
                                icon={TrendingUp}
                                color={(p.fiftyTwoWeekChangePercent || 0) >= 0 ? 'green' : 'red'}
                            />
                        </div>

                        {/* === 2026 ULTRA-PREMIUM VISUALIZATION SECTION === */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

                            {/* Performance Momentum - Ultra Premium Redesign */}
                            <GlassCard premium className="flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                        Performance Momentum
                                    </h3>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1A222C] px-2 py-1 rounded-full">
                                        YTD
                                    </span>
                                </div>

                                {/* Gauge Grid */}
                                <div className="grid grid-cols-2 gap-6 flex-1">
                                    {/* 52W Return Gauge */}
                                    <div className="flex flex-col items-center">
                                        <RadialGauge
                                            value={Math.min(100, Math.max(0, Math.abs(p.fiftyTwoWeekChangePercent || 0)))}
                                            max={100}
                                            label=""
                                            color={(p.fiftyTwoWeekChangePercent || 0) >= 0 ? 'emerald' : 'rose'}
                                            size={100}
                                        />
                                        <div className="text-center mt-3">
                                            <p className={clsx(
                                                "text-lg font-bold font-mono",
                                                (p.fiftyTwoWeekChangePercent || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                            )}>
                                                {formatPercent(p.fiftyTwoWeekChangePercent, true)}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">52W Return</p>
                                        </div>
                                    </div>

                                    {/* 50D MA Gauge */}
                                    <div className="flex flex-col items-center">
                                        <RadialGauge
                                            value={Math.min(100, Math.max(0, Math.abs((p.fiftyDayAverageChangePercent || 0) * 100)))}
                                            max={100}
                                            label=""
                                            color={(p.fiftyDayAverageChangePercent || 0) >= 0 ? 'cyan' : 'amber'}
                                            size={100}
                                        />
                                        <div className="text-center mt-3">
                                            <p className={clsx(
                                                "text-lg font-bold font-mono",
                                                (p.fiftyDayAverageChangePercent || 0) >= 0 ? "text-cyan-600 dark:text-cyan-400" : "text-amber-600 dark:text-amber-400"
                                            )}>
                                                {formatPercent(p.fiftyDayAverageChangePercent)}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">vs 50D MA</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Volume Trend Section */}
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Volume Trend (20D)</span>
                                        <span className={clsx(
                                            "text-xs font-bold",
                                            ((p.volume || 0) / (p.averageDailyVolume3Month || 1)) >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                                        )}>
                                            {(((p.volume || 0) / (p.averageDailyVolume3Month || 1)) * 100).toFixed(0)}% of Avg
                                        </span>
                                    </div>
                                    <MiniSparkline data={chartData} color="#0891b2" height={45} />
                                </div>
                            </GlassCard>

                            {/* Valuation Radar */}
                            <GlassCard className="flex flex-col">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-teal-500" />
                                    Valuation Profile
                                </h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer>
                                        <RadarChart data={[
                                            { metric: 'P/E', value: Math.min(100, ((p.trailingPE || f.pe_ratio || 15) / 30) * 100), fullMark: 100 },
                                            { metric: 'P/B', value: Math.min(100, ((p.priceToBook || f.price_to_book || 1) / 5) * 100), fullMark: 100 },
                                            { metric: 'Div Yield', value: Math.min(100, ((p.trailingAnnualDividendYield || f.dividend_yield || 0) * 100) * 10), fullMark: 100 },
                                            { metric: 'ROE', value: Math.min(100, (f.return_on_equity || 0) * 100), fullMark: 100 },
                                            { metric: 'Margin', value: Math.min(100, (f.profit_margin || 0) * 100), fullMark: 100 },
                                        ]}>
                                            <PolarGrid stroke="#334155" strokeOpacity={0.3} />
                                            <PolarAngleAxis
                                                dataKey="metric"
                                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                            />
                                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Score"
                                                dataKey="value"
                                                stroke="#14b8a6"
                                                fill="url(#auroraTeal)"
                                                fillOpacity={0.6}
                                                strokeWidth={2}
                                                dot={{ fill: '#14b8a6', strokeWidth: 0, r: 4 }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: 12,
                                                    color: '#fff',
                                                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                                                }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>

                            {/* Financial Health Cards */}
                            <GlassCard className="flex flex-col">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                    Financial Highlights
                                </h3>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
                                        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Profit Margin</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                                            {formatPercent(f.profit_margin)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20">
                                        <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">ROE</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                                            {formatPercent(f.return_on_equity)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Div Yield</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                                            {formatPercent(p.trailingAnnualDividendYield || f.dividend_yield)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
                                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Beta</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                                            {formatNumber(f.beta || p.beta, 2)}
                                        </p>
                                    </div>
                                </div>
                                {/* Volume Comparison Bar */}
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
                                    <div className="flex justify-between text-xs font-medium mb-2">
                                        <span className="text-slate-500">Today vs Avg Volume</span>
                                        <span className={clsx(
                                            "font-bold",
                                            ((p.volume || 0) / (p.averageDailyVolume3Month || 1)) >= 1 ? "text-emerald-500" : "text-slate-400"
                                        )}>
                                            {(((p.volume || 0) / (p.averageDailyVolume3Month || 1)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-[#1A222C] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, ((p.volume || 0) / (p.averageDailyVolume3Month || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* CHART TAB */}
                {activeTab === 'chart' && (
                    <div className="space-y-6">
                        <GlassCard noPadding>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ChartLine className="w-5 h-5 text-blue-500" />
                                    Price & Volume Chart
                                </h3>
                                <div className="flex gap-1">
                                    {['1M', '3M', '6M', '1Y', 'Max'].map(range => (
                                        <button
                                            key={range}
                                            onClick={() => setChartRange(range)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                chartRange === range
                                                    ? "bg-blue-600 text-white"
                                                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A222C]"
                                            )}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[500px] p-6">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <ComposedChart data={chartData}>
                                            <defs>
                                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                tickFormatter={(v) => v.split('-').slice(1).join('/')}
                                            />
                                            <YAxis
                                                yAxisId="price"
                                                domain={['dataMin - 5', 'dataMax + 5']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                orientation="right"
                                            />
                                            <YAxis
                                                yAxisId="volume"
                                                domain={[0, 'dataMax * 3']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={false}
                                                orientation="left"
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: 'none',
                                                    borderRadius: 12,
                                                    color: '#fff'
                                                }}
                                            />
                                            <Bar yAxisId="volume" dataKey="volume" fill="#94a3b8" opacity={0.3} />
                                            <Area
                                                yAxisId="price"
                                                type="monotone"
                                                dataKey="price"
                                                stroke={isPositive ? "#10b981" : "#ef4444"}
                                                strokeWidth={2}
                                                fill="url(#areaGradient)"
                                            />
                                            {p.fiftyDayAverage && (
                                                <ReferenceLine
                                                    yAxisId="price"
                                                    y={p.fiftyDayAverage}
                                                    stroke="#3b82f6"
                                                    strokeDasharray="5 5"
                                                    label={{ value: '50D MA', fill: '#3b82f6', fontSize: 10 }}
                                                />
                                            )}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">
                                        Chart data unavailable for this security
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* FINANCIALS TAB */}
                {activeTab === 'financials' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Valuation Metrics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-blue-500" /> Valuation
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Trailing P/E" value={formatNumber(p.trailingPE || f.pe_ratio)} />
                                    <DataRow label="Forward P/E" value={formatNumber(f.forward_pe)} />
                                    <DataRow label="P/E to Growth (PEG)" value={formatNumber(f.peg_ratio)} />
                                    <DataRow label="Price to Book" value={formatNumber(p.priceToBook || f.price_to_book)} />
                                    <DataRow label="Price to Sales" value={formatNumber(f.price_to_sales)} />
                                    <DataRow label="Enterprise Value" value={formatLarge(f.enterprise_value)} />
                                    <DataRow label="EV/Revenue" value={formatNumber(f.enterprise_to_revenue)} />
                                    <DataRow label="EV/EBITDA" value={formatNumber(f.enterprise_to_ebitda)} />
                                </div>
                            </GlassCard>

                            {/* Profitability */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-emerald-500" /> Profitability
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Gross Margin" value={formatPercent(f.gross_margin)} />
                                    <DataRow label="Operating Margin" value={formatPercent(f.operating_margin)} />
                                    <DataRow label="Profit Margin" value={formatPercent(f.profit_margin)} />
                                    <DataRow label="EBITDA Margin" value={formatPercent(f.ebitda_margin)} />
                                    <DataRow label="Return on Assets" value={formatPercent(f.return_on_assets)} />
                                    <DataRow label="Return on Equity" value={formatPercent(f.return_on_equity)} />
                                </div>
                            </GlassCard>

                            {/* Per Share Data */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-amber-500" /> Per Share Data
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="EPS (Trailing)" value={formatNumber(p.epsTrailingTwelveMonths || f.trailing_eps)} />
                                    <DataRow label="EPS (Forward)" value={formatNumber(f.forward_eps)} />
                                    <DataRow label="Book Value / Share" value={formatNumber(p.bookValue || f.book_value)} />
                                    <DataRow label="Revenue / Share" value={formatNumber(f.revenue_per_share)} />
                                </div>
                            </GlassCard>

                            {/* Dividends */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-500" /> Dividends
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Dividend Rate" value={formatNumber(p.trailingAnnualDividendRate || f.dividend_rate)} />
                                    <DataRow label="Dividend Yield" value={formatPercent((p.trailingAnnualDividendYield || f.dividend_yield) / 100)} />
                                    <DataRow label="Payout Ratio" value={formatPercent(f.payout_ratio)} />
                                    <DataRow label="Ex-Dividend Date" value={formatDate(f.ex_dividend_date)} />
                                </div>
                            </GlassCard>

                            {/* Balance Sheet */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-teal-500" /> Balance Sheet
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Total Cash" value={formatLarge(f.total_cash)} />
                                    <DataRow label="Total Debt" value={formatLarge(f.total_debt)} />
                                    <DataRow label="Total Revenue" value={formatLarge(f.total_revenue)} />
                                    <DataRow label="Current Ratio" value={formatNumber(f.current_ratio)} />
                                    <DataRow label="Quick Ratio" value={formatNumber(f.quick_ratio)} />
                                    <DataRow label="Debt to Equity" value={formatNumber(f.debt_to_equity)} />
                                </div>
                            </GlassCard>

                            {/* Cash Flow */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-cyan-500" /> Cash Flow
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Operating Cash Flow" value={formatLarge(f.operating_cash_flow)} />
                                    <DataRow label="Free Cash Flow" value={formatLarge(f.free_cash_flow)} />
                                </div>
                            </GlassCard>
                        </div>

                        {/* Earnings Calendar */}
                        {p.earningsTimestamp && (
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Earnings
                                </h3>
                                <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {new Date(p.earningsTimestamp * 1000).getDate()}
                                        </p>
                                        <p className="text-xs text-indigo-500 uppercase">
                                            {new Date(p.earningsTimestamp * 1000).toLocaleDateString('en-US', { month: 'short' })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Earnings Report</p>
                                        <p className="text-sm text-slate-500">
                                            {p.isEarningsDateEstimate ? 'Estimated Date' : 'Confirmed Date'}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* === 2026 ULTRA-PREMIUM FINANCIAL VISUALIZATIONS === */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Margin Waterfall Chart */}
                            <GlassCard premium>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                                    Margin Analysis
                                </h3>
                                <div className="h-[280px]">
                                    <ResponsiveContainer>
                                        <BarChart
                                            data={[
                                                { name: 'Gross', value: (f.gross_margin || 0) * 100, fill: '#00d4ff' },
                                                { name: 'Operating', value: (f.operating_margin || 0) * 100, fill: '#14b8a6' },
                                                { name: 'EBITDA', value: (f.ebitda_margin || 0) * 100, fill: '#0d9488' },
                                                { name: 'Net', value: (f.profit_margin || 0) * 100, fill: '#10b981' },
                                            ]}
                                            layout="vertical"
                                            margin={{ left: 10, right: 30 }}
                                        >
                                            <defs>
                                                <AuroraGradients />
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                                            <XAxis
                                                type="number"
                                                domain={[0, 100]}
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                tickFormatter={(v) => `${v}%`}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                                width={80}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: 12,
                                                    color: '#fff',
                                                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
                                                }}
                                                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Margin']}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[0, 8, 8, 0]}
                                                fill="url(#auroraCyan)"
                                            >
                                                {[
                                                    { fill: '#00d4ff' },
                                                    { fill: '#14b8a6' },
                                                    { fill: '#0d9488' },
                                                    { fill: '#10b981' },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0 0 6px ${entry.fill}60)` }} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>

                            {/* Returns Comparison */}
                            <GlassCard premium>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    Returns Profile
                                </h3>
                                <div className="h-[280px]">
                                    <ResponsiveContainer>
                                        <BarChart
                                            data={[
                                                { name: 'ROA', value: (f.return_on_assets || 0) * 100 },
                                                { name: 'ROE', value: (f.return_on_equity || 0) * 100 },
                                            ]}
                                            margin={{ top: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                            />
                                            <YAxis
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                tickFormatter={(v) => `${v}%`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: 12,
                                                    color: '#fff',
                                                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                                                }}
                                                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Return']}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={80}
                                            >
                                                <Cell fill="#00d4ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.5))' }} />
                                                <Cell fill="#10b981" style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Additional Return Metrics */}
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05] grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent">
                                        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase">Total Cash</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatLarge(f.total_cash)}</p>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent">
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Free Cash Flow</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatLarge(f.free_cash_flow)}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <GlassCard>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">About {displayCompanyName}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {p.description || p.longBusinessSummary || "Company description not available for this security."}
                            </p>
                        </GlassCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> Industry
                                </h4>
                                <DataRow label="Sector" value={p.sector || '—'} />
                                <DataRow label="Industry" value={p.industry || '—'} />
                            </GlassCard>

                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Exchange
                                </h4>
                                <DataRow label="Exchange" value={p.fullExchangeName || p.exchange || '—'} />
                                <DataRow label="Market" value={p.market || '—'} />
                                <DataRow label="Timezone" value={p.exchangeTimezoneShortName || '—'} />
                            </GlassCard>

                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Contact
                                </h4>
                                <DataRow label="Currency" value={p.currency || 'EGP'} />
                                <DataRow label="Website" value={p.website ? (
                                    <a href={p.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1">
                                        Visit <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : '—'} />
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* STATISTICS TAB */}
                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Trading Statistics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Trading Statistics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Open" value={formatNumber(p.regularMarketOpen || p.open)} />
                                    <DataRow label="Previous Close" value={formatNumber(p.regularMarketPreviousClose || p.prev_close)} />
                                    <DataRow label="Day High" value={formatNumber(p.dayHigh || p.day_high)} />
                                    <DataRow label="Day Low" value={formatNumber(p.dayLow || p.day_low)} />
                                    <DataRow label="52W High" value={formatNumber(p.fiftyTwoWeekHigh || p.year_high)} />
                                    <DataRow label="52W Low" value={formatNumber(p.fiftyTwoWeekLow || p.year_low)} />
                                    <DataRow label="52W Range" value={p.fiftyTwoWeekRange || '—'} />
                                </div>
                            </GlassCard>

                            {/* Moving Averages */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Moving Averages</h3>
                                <div className="space-y-1">
                                    <DataRow label="50-Day Average" value={formatNumber(p.fiftyDayAverage)} />
                                    <DataRow label="50-Day Change" value={formatNumber(p.fiftyDayAverageChange)} />
                                    <DataRow label="50-Day Change %" value={formatPercent(p.fiftyDayAverageChangePercent)} />
                                    <DataRow label="200-Day Average" value={formatNumber(p.twoHundredDayAverage)} />
                                    <DataRow label="200-Day Change" value={formatNumber(p.twoHundredDayAverageChange)} />
                                    <DataRow label="200-Day Change %" value={formatPercent(p.twoHundredDayAverageChangePercent)} />
                                </div>
                            </GlassCard>

                            {/* Volume Analysis */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Volume Analysis</h3>
                                <div className="space-y-1">
                                    <DataRow label="Today's Volume" value={formatLarge(p.volume || p.regularMarketVolume)} />
                                    <DataRow label="10-Day Avg Volume" value={formatLarge(p.averageDailyVolume10Day || p.avg_vol_10d)} />
                                    <DataRow label="3-Month Avg Volume" value={formatLarge(p.averageDailyVolume3Month || p.avg_vol_3m)} />
                                </div>
                            </GlassCard>

                            {/* Shares Information */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Share Statistics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Shares Outstanding" value={formatLarge(p.sharesOutstanding || p.shares_outstanding)} />
                                    <DataRow label="Float Shares" value={formatLarge(p.floatShares || p.float_shares)} />
                                    <DataRow label="Implied Shares" value={formatLarge(p.impliedSharesOutstanding || p.implied_shares)} />
                                    <DataRow label="Short Ratio" value={formatNumber(f.short_ratio)} />
                                    <DataRow label="Insider Ownership" value={formatPercent(f.insider_percent)} />
                                    <DataRow label="Institutional Ownership" value={formatPercent(f.institution_percent)} />
                                </div>
                            </GlassCard>

                            {/* Risk Metrics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Risk Metrics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Beta" value={formatNumber(f.beta)} />
                                    <DataRow label="Audit Risk" value={f.audit_risk || '—'} />
                                    <DataRow label="Board Risk" value={f.board_risk || '—'} />
                                    <DataRow label="Compensation Risk" value={f.compensation_risk || '—'} />
                                    <DataRow label="Shareholder Rights Risk" value={f.shareholder_rights_risk || '—'} />
                                    <DataRow label="Overall Risk" value={f.overall_risk || '—'} />
                                </div>
                            </GlassCard>

                            {/* Technical Metadata */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Technical Data</h3>
                                <div className="space-y-1">
                                    <DataRow label="Quote Type" value={p.quoteType || '—'} />
                                    <DataRow label="Market State" value={p.marketState || '—'} />
                                    <DataRow label="Exchange Delay" value={p.exchangeDataDelayedBy ? `${p.exchangeDataDelayedBy} min` : '—'} />
                                    <DataRow label="Source Interval" value={p.sourceInterval ? `${p.sourceInterval} min` : '—'} />
                                    <DataRow label="First Trade Date" value={p.firstTradeDateMilliseconds ? formatDate(p.firstTradeDateMilliseconds / 1000) : '—'} />
                                </div>
                            </GlassCard>
                        </div>

                        {/* === 2026 ULTRA-PREMIUM STATISTICS VISUALIZATIONS === */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

                            {/* Volume Distribution Chart */}
                            <GlassCard premium className="lg:col-span-2">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                                    Volume History (Last 30 Days)
                                </h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData.slice(-30)}>
                                            <defs>
                                                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.2} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                tickFormatter={(v) => v?.split('-').slice(1).join('/')}
                                            />
                                            <YAxis
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                tickFormatter={(v) => formatLarge(v)}
                                                width={60}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: 12,
                                                    color: '#fff',
                                                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
                                                }}
                                                formatter={(value: any) => [formatLarge(value), 'Volume']}
                                                labelFormatter={(label) => `Date: ${label}`}
                                            />
                                            <Bar
                                                dataKey="volume"
                                                fill="url(#volumeGradient)"
                                                radius={[4, 4, 0, 0]}
                                            />
                                            <ReferenceLine
                                                y={p.averageDailyVolume3Month || 0}
                                                stroke="#f59e0b"
                                                strokeDasharray="5 5"
                                                label={{ value: '3M Avg', fill: '#f59e0b', fontSize: 10 }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>

                            {/* Moving Averages Comparison */}
                            <GlassCard premium>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <ChartLine className="w-5 h-5 text-teal-500" />
                                    Price vs Moving Averages
                                </h3>
                                <div className="space-y-6">
                                    {/* Current Price vs 50D MA */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">vs 50-Day MA</span>
                                            <span className={clsx(
                                                "text-sm font-bold",
                                                (currentPrice > (p.fiftyDayAverage || 0)) ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {currentPrice > (p.fiftyDayAverage || 0) ? 'ABOVE' : 'BELOW'}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-100 dark:bg-[#1A222C] rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute left-1/2 top-0 h-full w-1 bg-white dark:bg-slate-600 z-10"
                                            />
                                            <div
                                                className={clsx(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    currentPrice > (p.fiftyDayAverage || 0)
                                                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500 ml-[50%]"
                                                        : "bg-gradient-to-l from-rose-400 to-rose-500 mr-[50%] float-right"
                                                )}
                                                style={{
                                                    width: `${Math.min(50, Math.abs((p.fiftyDayAverageChangePercent || 0) * 500))}%`,
                                                    filter: currentPrice > (p.fiftyDayAverage || 0)
                                                        ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))'
                                                        : 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.6))'
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>-5%</span>
                                            <span>{formatPercent(p.fiftyDayAverageChangePercent)} ({formatNumber(p.fiftyDayAverage)})</span>
                                            <span>+5%</span>
                                        </div>
                                    </div>

                                    {/* Current Price vs 200D MA */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">vs 200-Day MA</span>
                                            <span className={clsx(
                                                "text-sm font-bold",
                                                (currentPrice > (p.twoHundredDayAverage || 0)) ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {currentPrice > (p.twoHundredDayAverage || 0) ? 'ABOVE' : 'BELOW'}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-100 dark:bg-[#1A222C] rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute left-1/2 top-0 h-full w-1 bg-white dark:bg-slate-600 z-10"
                                            />
                                            <div
                                                className={clsx(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    currentPrice > (p.twoHundredDayAverage || 0)
                                                        ? "bg-gradient-to-r from-cyan-400 to-cyan-500 ml-[50%]"
                                                        : "bg-gradient-to-l from-amber-400 to-amber-500 mr-[50%] float-right"
                                                )}
                                                style={{
                                                    width: `${Math.min(50, Math.abs((p.twoHundredDayAverageChangePercent || 0) * 500))}%`,
                                                    filter: currentPrice > (p.twoHundredDayAverage || 0)
                                                        ? 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.6))'
                                                        : 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))'
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>-10%</span>
                                            <span>{formatPercent(p.twoHundredDayAverageChangePercent)} ({formatNumber(p.twoHundredDayAverage)})</span>
                                            <span>+10%</span>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            {/* Price Range Gauge */}
                            <GlassCard premium>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    52-Week Position
                                </h3>
                                <div className="flex flex-col items-center justify-center py-4">
                                    <RadialGauge
                                        value={((currentPrice - (p.fiftyTwoWeekLow || 0)) / ((p.fiftyTwoWeekHigh || 1) - (p.fiftyTwoWeekLow || 0))) * 100}
                                        max={100}
                                        label="52W Range"
                                        color="cyan"
                                        size={150}
                                    />
                                    <div className="mt-6 grid grid-cols-3 gap-4 w-full text-center">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">52W Low</p>
                                            <p className="text-lg font-bold text-rose-500 font-mono">{formatNumber(p.fiftyTwoWeekLow)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Current</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatNumber(currentPrice)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">52W High</p>
                                            <p className="text-lg font-bold text-emerald-500 font-mono">{formatNumber(p.fiftyTwoWeekHigh)}</p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
