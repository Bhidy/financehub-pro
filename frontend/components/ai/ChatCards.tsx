"use client";

import React from "react";
import {
    TrendingUp, TrendingDown, BarChart3, Building2,
    DollarSign, Calendar, Info, HelpCircle, AlertTriangle,
    ChevronRight, ExternalLink
} from "lucide-react";
import { Card, ChartPayload, Action } from "@/hooks/useAIChat";

// ============================================================
// Utilities
// ============================================================

function formatNumber(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined) return "N/A";
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

// ============================================================
// Stock Header Card
// ============================================================

interface StockHeaderProps {
    data: {
        symbol: string;
        name: string;
        market_code: string;
        currency: string;
        as_of?: string;
    };
}

export function StockHeaderCard({ data }: StockHeaderProps) {
    return (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {data.symbol.slice(0, 2)}
            </div>
            <div className="flex-1">
                <div className="font-bold text-slate-800">{data.name}</div>
                <div className="text-sm text-slate-500">
                    {data.symbol} • {data.market_code} • {data.currency}
                </div>
            </div>
            {data.as_of && (
                <div className="text-xs text-slate-400">
                    As of {new Date(data.as_of).toLocaleTimeString()}
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
}

export function SnapshotCard({ data }: SnapshotProps) {
    const isPositive = data.change >= 0;

    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-black text-slate-800">
                    {formatNumber(data.last_price)}
                </span>
                <span className="text-sm text-slate-500">{data.currency}</span>
                <span className={`flex items-center gap-1 text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    {formatPercent(data.change_percent)}
                </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Open</div>
                    <div className="font-semibold text-slate-700">{formatNumber(data.open)}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">High</div>
                    <div className="font-semibold text-emerald-600">{formatNumber(data.high)}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Low</div>
                    <div className="font-semibold text-red-500">{formatNumber(data.low)}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Volume</div>
                    <div className="font-semibold text-slate-700">{formatNumber(data.volume, 0)}</div>
                </div>
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
        pe_ratio?: number;
        pb_ratio?: number;
        dividend_yield?: number;
        market_cap?: number;
        high_52w?: number;
        low_52w?: number;
        beta?: number;
        eps?: number;
    };
}

export function StatsCard({ title, data }: StatsProps) {
    const stats = [
        { label: "P/E Ratio", value: data.pe_ratio, format: (v: number) => v.toFixed(2) },
        { label: "P/B Ratio", value: data.pb_ratio, format: (v: number) => v.toFixed(2) },
        { label: "Div Yield", value: data.dividend_yield, format: (v: number) => `${v.toFixed(2)}%` },
        { label: "Market Cap", value: data.market_cap, format: formatNumber },
        { label: "52W High", value: data.high_52w, format: (v: number) => v.toFixed(2) },
        { label: "52W Low", value: data.low_52w, format: (v: number) => v.toFixed(2) },
        { label: "Beta", value: data.beta, format: (v: number) => v.toFixed(2) },
        { label: "EPS", value: data.eps, format: (v: number) => v.toFixed(2) },
    ].filter(s => s.value !== null && s.value !== undefined);

    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            {title && (
                <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
                    <BarChart3 size={16} />
                    {title}
                </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(stat => (
                    <div key={stat.label} className="p-2 bg-slate-50 rounded-lg text-center">
                        <div className="text-xs text-slate-500">{stat.label}</div>
                        <div className="font-semibold text-slate-800">
                            {stat.value !== undefined ? stat.format(stat.value as number) : "N/A"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Movers Table (Gainers/Losers)
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
        }>;
        direction: "up" | "down";
    };
    onSymbolClick?: (symbol: string) => void;
}

export function MoversTable({ title, data, onSymbolClick }: MoversProps) {
    const isUp = data.direction === "up";

    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            {title && (
                <div className={`flex items-center gap-2 mb-3 font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {title}
                </div>
            )}
            <div className="space-y-2">
                {data.movers.slice(0, 10).map((stock, i) => (
                    <div
                        key={stock.symbol}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => onSymbolClick?.(stock.symbol)}
                    >
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{stock.symbol}</div>
                            <div className="text-xs text-slate-500 truncate">{stock.name}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-medium text-slate-800">{formatNumber(stock.price)}</div>
                            <div className={`text-sm font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatPercent(stock.change_percent)}
                            </div>
                        </div>
                    </div>
                ))}
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
}

export function CompareTable({ title, data }: CompareProps) {
    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            {title && (
                <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
                    <BarChart3 size={16} />
                    {title}
                </div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left p-2 font-medium text-slate-500">Metric</th>
                        {data.stocks.map(stock => (
                            <th key={stock.symbol} className="text-right p-2 font-bold text-slate-800">
                                {stock.symbol}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.metrics.map(metric => (
                        <tr key={metric.key} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="p-2 text-slate-600">{metric.label}</td>
                            {data.stocks.map(stock => (
                                <td key={stock.symbol} className="text-right p-2 font-medium text-slate-800">
                                    {formatNumber(stock[metric.key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
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
}

export function HelpCard({ data, onExampleClick }: HelpProps) {
    return (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-4 text-blue-700 font-semibold">
                <HelpCircle size={18} />
                What I Can Help With
            </div>
            <div className="space-y-4">
                {data.categories.map(cat => (
                    <div key={cat.title}>
                        <div className="font-medium text-slate-700 mb-2">{cat.title}</div>
                        <div className="flex flex-wrap gap-2">
                            {cat.examples.map(ex => (
                                <button
                                    key={ex}
                                    onClick={() => onExampleClick?.(ex)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
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

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => onAction(action)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-full text-sm font-medium transition-colors"
                >
                    {language === "ar" ? action.label_ar || action.label : action.label}
                    {action.action_type === "navigate" ? <ExternalLink size={12} /> : <ChevronRight size={12} />}
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
// Main Card Router
// ============================================================

interface ChatCardProps {
    card: Card;
    language?: "en" | "ar" | "mixed";
    onSymbolClick?: (symbol: string) => void;
    onExampleClick?: (text: string) => void;
}

export function ChatCard({ card, language = "en", onSymbolClick, onExampleClick }: ChatCardProps) {
    switch (card.type) {
        case "stock_header":
            return <StockHeaderCard data={card.data as any} />;
        case "snapshot":
            return <SnapshotCard data={card.data as any} />;
        case "stats":
            return <StatsCard title={card.title} data={card.data as any} />;
        case "movers_table":
            return <MoversTable title={card.title} data={card.data as any} onSymbolClick={onSymbolClick} />;
        case "compare_table":
            return <CompareTable title={card.title} data={card.data as any} />;
        case "help":
            return <HelpCard data={card.data as any} onExampleClick={onExampleClick} />;
        case "screener_results":
            return <MoversTable title={card.title} data={{ movers: card.data.stocks, direction: "up" }} onSymbolClick={onSymbolClick} />;
        case "sector_list":
            return <MoversTable title={card.title} data={{ movers: card.data.stocks, direction: "up" }} onSymbolClick={onSymbolClick} />;
        default:
            // Fallback for unknown card types
            return (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <pre className="text-xs text-slate-600 overflow-auto">
                        {JSON.stringify(card.data, null, 2)}
                    </pre>
                </div>
            );
    }
}

// ============================================================
// Chat Cards Container
// ============================================================

interface ChatCardsProps {
    cards: Card[];
    language?: "en" | "ar" | "mixed";
    onSymbolClick?: (symbol: string) => void;
    onExampleClick?: (text: string) => void;
}

export function ChatCards({ cards, language = "en", onSymbolClick, onExampleClick }: ChatCardsProps) {
    if (!cards.length) return null;

    return (
        <div className="space-y-3 mt-3">
            {cards.map((card, i) => (
                <ChatCard
                    key={i}
                    card={card}
                    language={language}
                    onSymbolClick={onSymbolClick}
                    onExampleClick={onExampleClick}
                />
            ))}
        </div>
    );
}
