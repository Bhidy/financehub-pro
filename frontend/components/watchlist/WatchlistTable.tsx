"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

interface WatchlistStock {
    symbol: string;
    description: string;
    last_price: number | null;
    change: number | null;
    change_percent: number | null;
    bid: number | null;
    ask: number | null;
    bid_qty: number | null;
    ask_qty: number | null;
    volume: number | null;
    trades: number | null;
    turnover: number | null;
    updated_at: string | null;
}

interface Props {
    data: WatchlistStock[];
}

type SortField = "symbol" | "last_price" | "change_percent" | "volume" | "trades";
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

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                s => s.symbol.toLowerCase().includes(q) ||
                    (s.description?.toLowerCase().includes(q))
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (aVal === null || aVal === undefined) aVal = sortDir === "desc" ? -Infinity : Infinity;
            if (bVal === null || bVal === undefined) bVal = sortDir === "desc" ? -Infinity : Infinity;

            if (typeof aVal === "string") {
                return sortDir === "asc"
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }

            return sortDir === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
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

    const SortHeader = ({ field, label, align = "left" }: { field: SortField; label: string; align?: "left" | "right" }) => (
        <th
            onClick={() => handleSort(field)}
            className={clsx(
                "px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none",
                align === "right" ? "text-right" : "text-left"
            )}
        >
            <div className={clsx("flex items-center gap-1", align === "right" && "justify-end")}>
                {label}
                <ArrowUpDown className={clsx(
                    "w-3 h-3",
                    sortField === field ? "text-rose-500" : "text-slate-300"
                )} />
            </div>
        </th>
    );

    return (
        <div>
            {/* Search */}
            <div className="p-4 border-b border-slate-100">
                <input
                    type="text"
                    placeholder="Search by symbol or name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full max-w-md px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                            <SortHeader field="symbol" label="Symbol" />
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <SortHeader field="last_price" label="Last" align="right" />
                            <SortHeader field="change_percent" label="Change" align="right" />
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Bid</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ask</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Bid Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ask Qty</th>
                            <SortHeader field="volume" label="Volume" align="right" />
                            <SortHeader field="trades" label="Trades" align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredAndSorted.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-16 text-center text-slate-400">
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
                                        className={clsx(
                                            "hover:bg-slate-50/50 transition-colors",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-25"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/egx/${stock.symbol}`}
                                                className="font-bold text-slate-900 hover:text-rose-600 transition-colors"
                                            >
                                                {stock.symbol}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={stock.description || ""}>
                                            {stock.description || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                                            {formatNumber(stock.last_price)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs",
                                                changePos && "bg-emerald-50 text-emerald-600",
                                                changeNeg && "bg-rose-50 text-rose-600",
                                                !changePos && !changeNeg && "bg-slate-100 text-slate-500"
                                            )}>
                                                {changePos && <TrendingUp className="w-3 h-3" />}
                                                {changeNeg && <TrendingDown className="w-3 h-3" />}
                                                {formatNumber(stock.change_percent)}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                                            {formatNumber(stock.bid)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-rose-600">
                                            {formatNumber(stock.ask)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {formatVolume(stock.bid_qty)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {formatVolume(stock.ask_qty)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                            {formatVolume(stock.volume)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {stock.trades?.toLocaleString() ?? "-"}
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
                <span>Showing {filteredAndSorted.length} of {data.length} stocks</span>
                <span className="text-xs">Data updates every 1 minute during market hours</span>
            </div>
        </div>
    );
}
