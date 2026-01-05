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
    ChevronRight,
    Target
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
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <Activity size={18} className="text-purple-600" />
                {title || "Technical Indicators"}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* RSI & Pivot */}
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500">RSI (14)</div>
                    <div className={`text-lg font-bold ${getSentiment(data.rsi, 'rsi')}`}>
                        {data.rsi?.toFixed(2) ?? "N/A"}
                    </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500">Pivot Point</div>
                    <div className="text-lg font-bold text-slate-700">
                        {data.pivot?.toFixed(2) ?? "N/A"}
                    </div>
                </div>
            </div>

            {/* Support & Resistance */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-emerald-600 mb-2">Support</div>
                    {data.support.map((val, i) => (
                        <div key={i} className="flex justify-between text-xs bg-emerald-50 p-1.5 rounded">
                            <span className="text-emerald-700">S{i + 1}</span>
                            <span className="font-mono font-medium">{val.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-red-500 mb-2">Resistance</div>
                    {data.resistance.map((val, i) => (
                        <div key={i} className="flex justify-between text-xs bg-red-50 p-1.5 rounded">
                            <span className="text-red-700">R{i + 1}</span>
                            <span className="font-mono font-medium">{val.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
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

export function OwnershipCard({ title, data }: OwnershipProps) {
    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <Building2 size={18} className="text-blue-600" />
                {title || "Major Shareholders"}
            </div>
            <div className="space-y-3">
                {data.shareholders.map((holder, i) => (
                    <div key={i} className="flex items-start justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex-1 mr-3">
                            <div className="text-sm font-semibold text-slate-800">{holder.name}</div>
                            <div className="text-[10px] text-slate-400">{new Date(holder.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-blue-600">
                                {holder.percent.toFixed(2)}%
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                                {formatNumber(holder.shares, 0)} sh
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

export function FairValueCard({ title, data }: FairValueProps) {
    return (
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <Target size={18} className="text-indigo-600" />
                {title || "Valuation Analysis"}
            </div>

            {/* Quick Ratios */}
            <div className="flex gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex-1 text-center border-r border-slate-100 last:border-0">
                    <div className="text-xs text-slate-500 uppercase">Current Price</div>
                    <div className="text-xl font-black text-slate-800">
                        {formatNumber(data.current_price)} <span className="text-xs text-slate-400 font-normal">{data.currency}</span>
                    </div>
                </div>
                <div className="flex-1 text-center border-r border-slate-100 last:border-0">
                    <div className="text-xs text-slate-500 uppercase">P/E Ratio</div>
                    <div className="text-xl font-bold text-blue-600">{data.pe?.toFixed(2) || '-'}</div>
                </div>
                <div className="flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">P/B Ratio</div>
                    <div className="text-xl font-bold text-blue-600">{data.pb?.toFixed(2) || '-'}</div>
                </div>
            </div>

            {/* Models Table */}
            <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fair Value Models</div>
                {data.models.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="text-sm font-medium text-slate-700">{m.model}</div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-800">{formatNumber(m.value)}</div>
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
        case "technicals":
            return <TechnicalsCard title={card.title} data={card.data as any} />;
        case "ownership":
            return <OwnershipCard title={card.title} data={card.data as any} />;
        case "fair_value":
            return <FairValueCard title={card.title} data={card.data as any} />;
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
        case "financial_explorer":
            // Ultra-Premium Financial Explorer Card
            return <FinancialExplorerCard data={card.data as any} />;
        case "financial_statement_table":
            // Legacy Financial Table
            return (
                <FinancialsTableCard
                    title={card.data?.title || "Financial Statement"}
                    subtitle={card.data?.subtitle}
                    years={card.data?.years || []}
                    rows={card.data?.rows || []}
                    currency={card.data?.currency}
                />
            );
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
}

function FinancialExplorerCard({ data }: FinancialExplorerProps) {
    const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'ratios' | 'kpis'>('income');
    const [displayType, setDisplayType] = useState<'annual' | 'quarterly' | 'ttm'>('annual');

    // Get the correct dataset based on displayType (annual vs quarterly vs TTM)
    let currentDataset = data.annual_data || data;
    if (displayType === 'quarterly') {
        currentDataset = data.quarterly_data || data;
    } else if (displayType === 'ttm') {
        currentDataset = data.ttm_data || data.annual_data || data;
    }

    const activeRows = currentDataset[activeTab] || [];
    const uniqueYears = currentDataset.years || data.years || [];

    // Format large numbers
    const formatValue = (val: number | null | undefined, fmt?: string): string => {
        if (val === null || val === undefined) return "—";
        if (fmt === 'percent' || (val !== 0 && Math.abs(val) < 1 && !Number.isInteger(val))) {
            const pct = Math.abs(val) <= 1 ? val * 100 : val;
            return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% `;
        }
        const absVal = Math.abs(val);
        if (absVal >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} B`;
        if (absVal >= 1_000_000) return `${(val / 1_000_000).toFixed(2)} M`;
        if (absVal >= 1_000) return `${(val / 1_000).toFixed(2)} K`;
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
        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200/60 overflow-hidden my-2 ring-1 ring-slate-100/50 w-full max-w-full group/card transition-all hover:shadow-md">
            {/* Premium Header - Ultra Compact */}
            <div className="bg-slate-900 p-2.5 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-sm flex items-center justify-center text-white font-bold text-xs border border-white/10">
                            {data.symbol[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-white tracking-tight leading-none">{data.symbol} Financials</h3>
                                <span className="px-1 py-px rounded-full bg-white/10 text-[9px] font-bold text-white/70 border border-white/10 uppercase tracking-widest backdrop-blur-sm leading-none">
                                    {data.currency}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-medium transition-all hover:text-white ml-auto md:ml-0"
                    >
                        <Download className="w-2.5 h-2.5 opacity-60" />
                        Export
                    </button>
                </div>

                {/* Modern Pill Tabs - Ultra Compact */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                    {[
                        { id: 'income', label: 'Income', icon: BarChart3 },
                        { id: 'balance', label: 'Balance', icon: PieChart },
                        { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
                        { id: 'ratios', label: 'Ratios', icon: Activity },
                        { id: 'kpis', label: 'KPIs', icon: Target }
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
                    Live Data
                </div>

                <div className="bg-slate-200/50 p-0.5 rounded flex items-center">
                    {['Annual', 'Quarterly', 'TTM'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setDisplayType(type.toLowerCase() as any)}
                            className={`
                                px-2 py-px rounded text-[9px] font-bold transition-all duration-200
                                ${displayType === type.toLowerCase()
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            {type}
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
                                <th className="sticky left-0 top-0 z-30 bg-white/95 backdrop-blur-md px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-r border-slate-200 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.05)] min-w-[140px] w-1/3">
                                    Line Item
                                </th>
                                {uniqueYears.map(year => (
                                    <th key={year} className="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/95 backdrop-blur-md border-b border-slate-200 min-w-[70px]">
                                        {year}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {activeRows.length > 0 ? (
                                activeRows.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={`
                                            group transition-colors duration-75
                                            ${row.isSubtotal ? 'bg-slate-50/60 hover:bg-slate-100' : 'hover:bg-blue-50/20'}
                                        `}
                                    >
                                        <td
                                            className={`
                                                px-3 py-1.5 sticky left-0 z-10 border-r border-slate-50 group-hover:border-blue-100/30 transition-colors
                                                ${row.isSubtotal
                                                    ? 'bg-slate-50/95 font-bold text-slate-800'
                                                    : 'bg-white/95 text-slate-600 font-medium'
                                                }
                                            `}
                                            style={{ paddingLeft: `${12 + (row.indent || 0) * 8}px` }}
                                        >
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className="truncate max-w-[140px]" title={row.label}>{row.label}</span>
                                                {row.isGrowth && (
                                                    <span className="shrink-0 text-[8px] font-bold bg-slate-100 text-slate-400 px-1 rounded uppercase tracking-wider">
                                                        YoY
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {uniqueYears.map(year => {
                                            const val = row.values[year];
                                            return (
                                                <td
                                                    key={year}
                                                    className={`
                                                        px-3 py-1.5 text-right font-mono tabular-nums
                                                        ${row.isGrowth
                                                            ? (val || 0) >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'
                                                            : row.isSubtotal ? 'font-bold text-slate-900' : 'text-slate-600'
                                                        }
                                                    `}
                                                >
                                                    {formatValue(val, row.format)}
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
                                            <span className="text-[10px]">No data available</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between">
                    <span>Source: FinanceHub Enterprise</span>
                    <span>{uniqueYears.length} Periods</span>
                </div>
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
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
    return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

function formatValue(val: any, format?: string) {
    if (val === null || val === undefined) return "-";
    if (format === 'percent') return formatPercent(val);
    return formatNumber(val);
}

