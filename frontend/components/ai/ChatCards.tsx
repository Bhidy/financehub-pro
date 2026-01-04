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
    HelpCircle,
    ExternalLink,
    ChevronRight
} from "lucide-react";
import { Card, ChartPayload, Action } from "@/hooks/useAIChat";

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
}

export function RatiosCard({ title, data }: RatiosProps) {
    const formatRatio = (v: number | null | undefined) => v !== null && v !== undefined ? v.toFixed(2) : "N/A";
    const formatPct = (v: number | null | undefined) => v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : "N/A";

    const ratios = [
        { label: "P/E", value: formatRatio(data.pe), color: "text-blue-600" },
        { label: "P/B", value: formatRatio(data.pb), color: "text-blue-600" },
        { label: "P/S", value: formatRatio(data.ps), color: "text-blue-600" },
        { label: "ROE", value: formatPct(data.roe), color: "text-emerald-600" },
        { label: "ROA", value: formatPct(data.roa), color: "text-emerald-600" },
        { label: "D/E", value: formatRatio(data.debt_equity), color: "text-amber-600" },
        { label: "PEG", value: formatRatio(data.peg_ratio), color: "text-purple-600" },
        { label: "Yield", value: formatPct(data.earnings_yield), color: "text-teal-600" },
    ].filter(r => r.value !== "N/A");

    if (!ratios.length) return null;

    return (
        <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-100 shadow-sm">
            {title && (
                <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
                    <BarChart3 size={16} />
                    {title}
                </div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {ratios.map(r => (
                    <div key={r.label} className="text-center p-2 bg-white rounded-lg shadow-sm">
                        <div className="text-xs text-slate-500">{r.label}</div>
                        <div className={`font-bold text-sm ${r.color}`}>{r.value}</div>
                    </div>
                ))}
            </div>
            {data.marketcap && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                    <span className="text-xs text-slate-500">Market Cap: </span>
                    <span className="font-bold text-slate-800">{formatNumber(data.marketcap)}</span>
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
}

export function FinancialsTableCard({ title, subtitle, years, rows, currency = "EGP" }: FinancialsTableProps) {
    // Deduplicate years (handle backend sending duplicate years)
    const uniqueYears = [...new Set(years.map(y => String(y)))].slice(0, 6);

    // Format large numbers with proper scaling
    const formatValue = (val: number | null | undefined, fmt?: string): string => {
        if (val === null || val === undefined) return "—";

        // Percentage formatting
        if (fmt === 'percent' || (val !== 0 && Math.abs(val) < 1 && !Number.isInteger(val))) {
            const pct = Math.abs(val) < 1 ? val * 100 : val;
            const formatted = pct.toFixed(1);
            return `${pct >= 0 ? '+' : ''}${formatted}%`;
        }

        // Large number formatting (millions/billions)
        const absVal = Math.abs(val);
        if (absVal >= 1_000_000_000) {
            return `${(val / 1_000_000_000).toFixed(2)}B`;
        }
        if (absVal >= 1_000_000) {
            return `${(val / 1_000_000).toFixed(2)}M`;
        }
        if (absVal >= 1_000) {
            return `${(val / 1_000).toFixed(2)}K`;
        }

        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Row styling based on type
    const getRowClass = (row: StatementRow): string => {
        if (row.isSubtotal) {
            return "bg-gradient-to-r from-blue-50 to-slate-50 font-bold border-y border-blue-100";
        }
        return "border-b border-slate-100/50 hover:bg-blue-50/30 transition-colors";
    };

    // Value color based on growth
    const getValueColor = (row: StatementRow, val: number | null): string => {
        if (val === null) return "text-slate-400";
        if (row.isGrowth) {
            return val >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold";
        }
        if (row.isSubtotal) return "text-slate-800 font-bold";
        return "text-slate-700";
    };

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Line Item', ...uniqueYears];
        const csvRows = rows.map(row => {
            const values = uniqueYears.map(year => row.values[year] ?? '');
            return [row.label, ...values].join(',');
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
        const excelRows = rows.map(row => {
            const values = uniqueYears.map(year => {
                const val = row.values[year];
                return val !== null && val !== undefined ? val : '';
            });
            return [row.label, ...values].join('\t');
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

    // Empty state handling
    if (!rows || rows.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200 text-center">
                <Table className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <div className="text-slate-600 font-medium">No financial data available</div>
                <div className="text-slate-400 text-sm mt-1">Data may still be loading...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden my-4">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                            <Table className="w-5 h-5" />
                            {title || "Financial Statement"}
                        </div>
                        {subtitle && (
                            <div className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                                {subtitle} • <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{currency}</span>
                            </div>
                        )}
                    </div>
                    {/* Export Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Excel
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    {/* Header Row */}
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-5 py-3 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                                Line Item
                            </th>
                            {uniqueYears.map(year => (
                                <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600 min-w-[100px]">
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* Data Rows */}
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className={getRowClass(row)}>
                                <td
                                    className="px-5 py-3 text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100"
                                    style={{ paddingLeft: `${20 + (row.indent || 0) * 16}px` }}
                                >
                                    <span className={row.isSubtotal ? "font-bold" : ""}>{row.label}</span>
                                </td>
                                {uniqueYears.map(year => {
                                    const val = row.values[year];
                                    return (
                                        <td
                                            key={year}
                                            className={`px-4 py-3 text-right font-mono tabular-nums ${getValueColor(row, val)}`}
                                        >
                                            {formatValue(val, row.format)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer with disclaimer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                    All values in {currency} • Data source: StockAnalysis.com
                </div>
                <div className="text-xs text-slate-400">
                    {rows.length} items • {uniqueYears.length} years
                </div>
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
}

export function ExportToolbar({ data, title, onExport }: ExportToolbarProps) {
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
            alert('Use browser screenshot (Cmd+Shift+4 on Mac) to capture');
        }
    };

    return (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Export:</span>
            <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
            >
                📊 Excel
            </button>
            <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
                📄 PDF
            </button>
            <button
                onClick={() => handleExport('image')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
                📸 Image
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
        case "ratios":
            return <RatiosCard title={card.title} data={card.data as any} />;
        case "financial_statement_table":
            return (
                <FinancialsTableCard
                    title={card.data.title}
                    subtitle={card.data.subtitle}
                    years={card.data.years}
                    rows={card.data.rows}
                    currency={card.data.currency}
                />
            );
        case "financials":
            // Adapter for legacy data format
            // Transform array of periods into rows
            const periods = card.data.periods || [];
            if (periods.length === 0) return null;

            const years = periods.map((p: any) => p.period);
            const legacyRows: StatementRow[] = [
                { label: "Revenue", values: {} },
                { label: "Gross Profit", values: {} },
                { label: "Operating Income", values: {} },
                { label: "Net Income", values: {} },
                { label: "EPS", values: {} },
            ];

            // Populate values
            periods.forEach((p: any) => {
                const y = p.period;
                legacyRows[0].values[y] = p.revenue;
                legacyRows[1].values[y] = p.gross_profit;
                legacyRows[2].values[y] = p.operating_income;
                legacyRows[3].values[y] = p.net_income;
                legacyRows[4].values[y] = p.eps;
            });

            return (
                <FinancialsTableCard
                    title="Financial Summary"
                    subtitle={card.data.statement_type}
                    years={years}
                    rows={legacyRows}
                    currency={card.data.currency}
                />
            );
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
            // Handle new ultra-premium Financial Explorer
            if (card.type === 'financial_explorer' || (card.data?.income && card.data?.balance)) {
                return <FinancialExplorerCard data={card.data} />;
            }

            // Legacy Fallback for simple tables
            if (card.data?.rows && Array.isArray(card.data.rows) && card.data?.years) {
                return (
                    <FinancialsTableCard
                        title={card.data.title || card.type}
                        subtitle={card.data.subtitle}
                        years={card.data.years}
                        rows={card.data.rows}
                        currency={card.data.currency}
                    />
                );
            }

            // Hide unknown in production
            if (process.env.NODE_ENV === 'development') {
                return (
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 mb-2">📋 {card.type}</div>
                        <pre className="text-xs text-slate-600 overflow-auto max-h-40">
                            {JSON.stringify(card.data, null, 2)}
                        </pre>
                    </div>
                );
            }
            return null;
    }
}

// ============================================================
// Financial Explorer Card (Ultra Premium)
// ============================================================

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
    };
}

function FinancialExplorerCard({ data }: FinancialExplorerProps) {
    const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'ratios'>('income');
    const [displayType, setDisplayType] = useState<'annual' | 'quarterly'>('annual'); // Placeholder for now

    const activeRows = data[activeTab] || [];
    const uniqueYears = data.years || [];

    // Format large numbers
    const formatValue = (val: number | null | undefined, fmt?: string): string => {
        if (val === null || val === undefined) return "—";
        if (fmt === 'percent' || (val !== 0 && Math.abs(val) < 1 && !Number.isInteger(val))) {
            const pct = Math.abs(val) <= 1 ? val * 100 : val;
            return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
        }
        const absVal = Math.abs(val);
        if (absVal >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
        if (absVal >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (absVal >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Export to Excel
    const handleExport = () => {
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
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden my-4 ring-1 ring-slate-100">
            {/* Header / Tabs */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-2 md:p-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2 px-2 pt-1">
                    <div className="flex items-center gap-2 text-white/90">
                        <span className="font-bold text-lg">{data.symbol} Financials</span>
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/60">{data.currency}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="text-xs text-white/70 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" /> Export {activeTab}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto scrollbar-none gap-1 pb-1">
                    {[
                        { id: 'income', label: 'Income', icon: BarChart3 },
                        { id: 'balance', label: 'Balance Sheet', icon: PieChart },
                        { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
                        { id: 'ratios', label: 'Ratios', icon: Activity }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-y-[1px]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-end">
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    {['Annual', 'Quarterly'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setDisplayType(type.toLowerCase() as any)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${displayType === type.toLowerCase()
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-5 py-3 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20 min-w-[220px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                Line Item
                            </th>
                            {uniqueYears.map(year => (
                                <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600 min-w-[110px]">
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeRows.length > 0 ? (
                            activeRows.map((row, idx) => (
                                <tr key={idx} className={`group hover:bg-blue-50/30 transition-colors ${row.isSubtotal ? 'bg-slate-50/50' : ''}`}>
                                    <td
                                        className="px-5 py-2.5 text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/10 z-10 border-r border-slate-100 font-medium"
                                        style={{ paddingLeft: `${20 + (row.indent || 0) * 16}px` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={row.isSubtotal ? "font-bold text-slate-900" : ""}>{row.label}</span>
                                            {row.isGrowth && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-bold tracking-wider">YoY</span>}
                                        </div>
                                    </td>
                                    {uniqueYears.map(year => {
                                        const val = row.values[year];
                                        return (
                                            <td
                                                key={year}
                                                className={`px-4 py-2.5 text-right font-mono tabular-nums ${row.isGrowth
                                                    ? (val || 0) >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'
                                                    : row.isSubtotal ? 'text-slate-900 font-bold' : 'text-slate-600'
                                                    }`}
                                            >
                                                {formatValue(val, row.format)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={uniqueYears.length + 1} className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Table className="w-8 h-8 opacity-20" />
                                        <span>No data available for this view</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
                <span>Data source: FinanceHub Enterprise DB</span>
                <span>{activeRows.length} rows • {uniqueYears.length} periods</span>
            </div>
        </div>
    );
}

// ============================================================
// Legacy Financial Cards
// ============================================================

// ============================================================
// Chat Cards Container
// ============================================================

interface ChatCardsProps {
    cards: Card[];
    language?: "en" | "ar" | "mixed";
    onSymbolClick?: (symbol: string) => void;
    onExampleClick?: (text: string) => void;
    showExport?: boolean;
}

export function ChatCards({ cards, language = "en", onSymbolClick, onExampleClick, showExport = false }: ChatCardsProps) {
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
            {showExport && cards.length > 0 && (
                <ExportToolbar
                    data={cards.map(c => c.data)}
                    title="chat_data"
                />
            )}
        </div>
    );
}

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

