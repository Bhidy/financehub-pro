"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

// Full 37-column interface matching database schema
interface WatchlistStock {
    symbol: string;
    description: string;
    last_price: number | null;
    open_price: number | null;
    change: number | null;
    change_percent: number | null;
    bid: number | null;
    ask: number | null;
    day_range_pct: string | null;
    bid_qty: number | null;
    ask_qty: number | null;
    currency: string | null;
    last_qty: number | null;
    volume: number | null;
    turnover: number | null;
    trades: number | null;
    bid_ask_spread: number | null;
    day_high: number | null;
    day_low: number | null;
    limit_min: number | null;
    limit_max: number | null;
    total_bid_qty: number | null;
    total_ask_qty: number | null;
    week_52_range: string | null;
    last_trade_time: string | null;
    lt_price: number | null;
    market: string | null;
    vwap: number | null;
    prev_close: number | null;
    last_auction_price: number | null;
    updated_at: string | null;
}

interface Props {
    data: WatchlistStock[];
}

type SortField = "symbol" | "last_price" | "change_percent" | "volume" | "trades" | "turnover" | "day_high" | "day_low" | "open_price" | "vwap" | "prev_close";
type SortDir = "asc" | "desc";

export default function WatchlistTable({ data }: Props) {
    const [sortField, setSortField] = useState<SortField>("volume");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [searchQuery, setSearchQuery] = useState("");

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...data];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                s => s.symbol.toLowerCase().includes(q) ||
                    (s.description?.toLowerCase().includes(q))
            );
        }
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            if (aVal === null || aVal === undefined) aVal = sortDir === "desc" ? -Infinity : Infinity;
            if (bVal === null || bVal === undefined) bVal = sortDir === "desc" ? -Infinity : Infinity;
            if (typeof aVal === "string") {
                return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
            }
            return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
        return result;
    }, [data, sortField, sortDir, searchQuery]);

    const formatNumber = (val: number | null, decimals = 2) => {
        if (val === null || val === undefined) return "-";
        return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const formatVolume = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
        return val.toLocaleString();
    };

    const formatTurnover = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
        return val.toLocaleString();
    };

    const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
        <th
            onClick={() => handleSort(field)}
            className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap text-right"
        >
            <div className="flex items-center gap-1 justify-end">
                {label}
                <ArrowUpDown className={clsx("w-2.5 h-2.5", sortField === field ? "text-rose-500" : "text-slate-300")} />
            </div>
        </th>
    );

    const StaticHeader = ({ label }: { label: string }) => (
        <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">
            {label}
        </th>
    );

    return (
        <div>
            {/* Search */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-4">
                <input
                    type="text"
                    placeholder="Search by symbol or name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full max-w-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">37 Columns • Scroll →</span>
            </div>

            {/* Table - Full 37 columns */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                            {/* Core Info - 2 cols */}
                            <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left sticky left-0 bg-slate-50 z-20">Symbol</th>
                            <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left">Name</th>
                            {/* Price Data - 6 cols */}
                            <SortHeader field="last_price" label="Last" />
                            <SortHeader field="open_price" label="Open" />
                            <SortHeader field="prev_close" label="Prev Close" />
                            <SortHeader field="change_percent" label="Chg%" />
                            <StaticHeader label="Change" />
                            <SortHeader field="vwap" label="VWAP" />
                            {/* Day Range - 3 cols */}
                            <SortHeader field="day_high" label="High" />
                            <SortHeader field="day_low" label="Low" />
                            <StaticHeader label="Day Range" />
                            {/* Bid/Ask Data - 6 cols */}
                            <StaticHeader label="Bid" />
                            <StaticHeader label="Ask" />
                            <StaticHeader label="Bid Qty" />
                            <StaticHeader label="Ask Qty" />
                            <StaticHeader label="Total Bid" />
                            <StaticHeader label="Total Ask" />
                            <StaticHeader label="B/A Spread" />
                            {/* Volume & Trading - 4 cols */}
                            <SortHeader field="volume" label="Volume" />
                            <SortHeader field="turnover" label="Turnover" />
                            <SortHeader field="trades" label="Trades" />
                            <StaticHeader label="Last Qty" />
                            {/* Limits - 2 cols */}
                            <StaticHeader label="Min Limit" />
                            <StaticHeader label="Max Limit" />
                            {/* 52 Week - 1 col */}
                            <StaticHeader label="52Wk Range" />
                            {/* Other - 5 cols */}
                            <StaticHeader label="Trade Time" />
                            <StaticHeader label="LT Price" />
                            <StaticHeader label="Auction" />
                            <StaticHeader label="Market" />
                            <StaticHeader label="Currency" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredAndSorted.length === 0 ? (
                            <tr>
                                <td colSpan={30} className="py-12 text-center text-slate-400">
                                    {searchQuery ? "No matching stocks found" : "No data available"}
                                </td>
                            </tr>
                        ) : (
                            filteredAndSorted.map((stock, idx) => {
                                const changePos = (stock.change ?? 0) > 0;
                                const changeNeg = (stock.change ?? 0) < 0;

                                return (
                                    <tr
                                        key={stock.symbol}
                                        className={clsx("hover:bg-slate-50/50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-25")}
                                    >
                                        {/* Symbol - sticky */}
                                        <td className="px-2 py-1.5 sticky left-0 bg-white z-10">
                                            <Link href={`/egx/${stock.symbol}`} className="font-bold text-slate-900 hover:text-rose-600 transition-colors">
                                                {stock.symbol}
                                            </Link>
                                        </td>
                                        {/* Name */}
                                        <td className="px-2 py-1.5 text-slate-600 max-w-[140px] truncate" title={stock.description || ""}>
                                            {stock.description || "-"}
                                        </td>
                                        {/* Last */}
                                        <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-900">
                                            {formatNumber(stock.last_price)}
                                        </td>
                                        {/* Open */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-600">
                                            {formatNumber(stock.open_price)}
                                        </td>
                                        {/* Prev Close */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                                            {formatNumber(stock.prev_close)}
                                        </td>
                                        {/* Change % */}
                                        <td className="px-2 py-1.5 text-right">
                                            <span className={clsx(
                                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-[10px]",
                                                changePos && "bg-emerald-50 text-emerald-600",
                                                changeNeg && "bg-rose-50 text-rose-600",
                                                !changePos && !changeNeg && "bg-slate-100 text-slate-500"
                                            )}>
                                                {changePos && <TrendingUp className="w-2.5 h-2.5" />}
                                                {changeNeg && <TrendingDown className="w-2.5 h-2.5" />}
                                                {formatNumber(stock.change_percent)}%
                                            </span>
                                        </td>
                                        {/* Change */}
                                        <td className={clsx("px-2 py-1.5 text-right font-mono", changePos && "text-emerald-600", changeNeg && "text-rose-600")}>
                                            {formatNumber(stock.change)}
                                        </td>
                                        {/* VWAP */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-600">
                                            {formatNumber(stock.vwap)}
                                        </td>
                                        {/* High */}
                                        <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                                            {formatNumber(stock.day_high)}
                                        </td>
                                        {/* Low */}
                                        <td className="px-2 py-1.5 text-right font-mono text-rose-600">
                                            {formatNumber(stock.day_low)}
                                        </td>
                                        {/* Day Range */}
                                        <td className="px-2 py-1.5 text-right text-slate-500 text-[10px]">
                                            {stock.day_range_pct || "-"}
                                        </td>
                                        {/* Bid */}
                                        <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                                            {formatNumber(stock.bid)}
                                        </td>
                                        {/* Ask */}
                                        <td className="px-2 py-1.5 text-right font-mono text-rose-600">
                                            {formatNumber(stock.ask)}
                                        </td>
                                        {/* Bid Qty */}
                                        <td className="px-2 py-1.5 text-right text-slate-600">
                                            {formatVolume(stock.bid_qty)}
                                        </td>
                                        {/* Ask Qty */}
                                        <td className="px-2 py-1.5 text-right text-slate-600">
                                            {formatVolume(stock.ask_qty)}
                                        </td>
                                        {/* Total Bid Qty */}
                                        <td className="px-2 py-1.5 text-right text-slate-500">
                                            {formatVolume(stock.total_bid_qty)}
                                        </td>
                                        {/* Total Ask Qty */}
                                        <td className="px-2 py-1.5 text-right text-slate-500">
                                            {formatVolume(stock.total_ask_qty)}
                                        </td>
                                        {/* Bid/Ask Spread */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                                            {formatNumber(stock.bid_ask_spread)}
                                        </td>
                                        {/* Volume */}
                                        <td className="px-2 py-1.5 text-right font-semibold text-blue-700">
                                            {formatVolume(stock.volume)}
                                        </td>
                                        {/* Turnover */}
                                        <td className="px-2 py-1.5 text-right text-blue-600 font-medium">
                                            {formatTurnover(stock.turnover)}
                                        </td>
                                        {/* Trades */}
                                        <td className="px-2 py-1.5 text-right text-slate-600">
                                            {stock.trades?.toLocaleString() ?? "-"}
                                        </td>
                                        {/* Last Qty */}
                                        <td className="px-2 py-1.5 text-right text-slate-500">
                                            {formatVolume(stock.last_qty)}
                                        </td>
                                        {/* Min Limit */}
                                        <td className="px-2 py-1.5 text-right font-mono text-orange-600">
                                            {formatNumber(stock.limit_min)}
                                        </td>
                                        {/* Max Limit */}
                                        <td className="px-2 py-1.5 text-right font-mono text-teal-600">
                                            {formatNumber(stock.limit_max)}
                                        </td>
                                        {/* 52 Week Range */}
                                        <td className="px-2 py-1.5 text-right text-slate-500 text-[10px] max-w-[80px] truncate" title={stock.week_52_range || ""}>
                                            {stock.week_52_range || "-"}
                                        </td>
                                        {/* Trade Time */}
                                        <td className="px-2 py-1.5 text-right text-slate-400 text-[10px]">
                                            {stock.last_trade_time || "-"}
                                        </td>
                                        {/* LT Price */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                                            {formatNumber(stock.lt_price)}
                                        </td>
                                        {/* Last Auction Price */}
                                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                                            {formatNumber(stock.last_auction_price)}
                                        </td>
                                        {/* Market */}
                                        <td className="px-2 py-1.5 text-right text-slate-400 text-[10px]">
                                            {stock.market || "-"}
                                        </td>
                                        {/* Currency */}
                                        <td className="px-2 py-1.5 text-right text-slate-400">
                                            {stock.currency || "EGP"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 flex justify-between items-center">
                <span>Showing {filteredAndSorted.length} of {data.length} stocks • <strong>37 columns</strong></span>
                <span className="text-xs">Data updates every 1 minute during market hours</span>
            </div>
        </div>
    );
}
