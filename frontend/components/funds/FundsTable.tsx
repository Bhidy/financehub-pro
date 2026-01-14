import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, Shield } from "lucide-react";
import clsx from "clsx";

// Mubasher-aligned MutualFund interface
interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_name_en: string | null;
    fund_type: string | null;
    manager: string | null;
    manager_name: string;
    manager_name_en: string | null;
    latest_nav: number | string;
    currency: string | null;
    market_code: string | null;
    // Returns/Profit
    returns_ytd: number | string | null;
    ytd_return: number | string | null;
    returns_1y: number | string | null;
    one_year_return: number | string | null;
    returns_3y: number | string | null;
    three_year_return: number | string | null;
    returns_5y: number | string | null;
    five_year_return: number | string | null;
    // Last update
    last_updated: string | null;
    last_update_date: string | null;
    last_nav_date: string | null;
    is_shariah: boolean | null;
}

interface FundsTableProps {
    funds: MutualFund[];
}

const safeNumber = (val: any) => {
    const num = Number(val);
    return isFinite(num) ? num : null;
};

type SortKey = "name" | "market" | "manager" | "nav" | "profit" | "updated";

export default function FundsTable({ funds }: FundsTableProps) {
    const router = useRouter();
    const [sortKey, setSortKey] = useState<SortKey>("profit");
    const [sortDesc, setSortDesc] = useState(true);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const getVal = (f: MutualFund, key: SortKey) => {
        switch (key) {
            case "name": return f.fund_name_en || f.fund_name;
            case "market": return f.market_code || "EGX";
            case "manager": return f.manager_name_en || f.manager_name || f.manager || "";
            case "nav": return safeNumber(f.latest_nav) || 0;
            case "profit": return safeNumber(f.returns_ytd ?? f.ytd_return) || -999;
            case "updated": return f.last_nav_date || f.last_updated || f.last_update_date || "";
            default: return 0;
        }
    };

    const sortedFunds = [...funds].sort((a, b) => {
        const valA = getVal(a, sortKey);
        const valB = getVal(b, sortKey);

        if (typeof valA === "string" && typeof valB === "string") {
            return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return sortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    });

    const HeaderCell = ({ label, keyName, align = "left" }: { label: string, keyName: SortKey, align?: "left" | "right" | "center" }) => (
        <th
            className={clsx(
                "py-3 px-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors select-none",
                align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"
            )}
            onClick={() => handleSort(keyName)}
        >
            <div className={clsx("flex items-center gap-1", align === "right" && "justify-end")}>
                {sortKey === keyName ? (
                    sortDesc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                {label}
            </div>
        </th>
    );

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="overflow-x-auto bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-slate-200 dark:border-white/5">
            <table className="w-full border-collapse min-w-[900px]">
                <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-[#0f172a] dark:to-[#1e293b]">
                        <HeaderCell label="Fund Name" keyName="name" />
                        <HeaderCell label="Market" keyName="market" align="center" />
                        <HeaderCell label="Manager" keyName="manager" />
                        <th className="py-3 px-4 text-xs font-bold text-white uppercase tracking-wider text-left">Owner</th>
                        <HeaderCell label="Current Price" keyName="nav" align="right" />
                        <HeaderCell label="Profit %" keyName="profit" align="right" />
                        <HeaderCell label="Last Update" keyName="updated" align="right" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {sortedFunds.map((fund) => {
                        const profit = safeNumber(fund.returns_ytd ?? fund.ytd_return);
                        const managerName = fund.manager_name_en || fund.manager_name || fund.manager || "—";
                        const lastUpdate = fund.last_nav_date || fund.last_updated || fund.last_update_date;

                        return (
                            <tr
                                key={fund.fund_id}
                                onClick={() => router.push(`/funds/${fund.fund_id}`)}
                                className="group hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer text-sm"
                            >
                                {/* Fund Name */}
                                <td className="py-4 px-4">
                                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                        {fund.fund_name_en || fund.fund_name}
                                    </div>
                                    {fund.is_shariah && (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-emerald-100 dark:border-emerald-500/20 mt-1">
                                            <Shield className="w-2.5 h-2.5" /> Shariah
                                        </span>
                                    )}
                                </td>

                                {/* Market */}
                                <td className="py-4 px-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                        {fund.market_code || "EGX"}
                                    </span>
                                </td>

                                {/* Manager */}
                                <td className="py-4 px-4 text-slate-700 dark:text-slate-300 text-sm max-w-[200px] truncate" title={managerName}>
                                    {managerName}
                                </td>

                                {/* Owner (using manager for now - same data source) */}
                                <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-sm max-w-[180px] truncate" title={managerName}>
                                    {managerName}
                                </td>

                                {/* Current Price (NAV) */}
                                <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 dark:text-white">
                                    {Number(fund.latest_nav).toFixed(2)}
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 font-sans">{fund.currency || 'EGP'}</span>
                                </td>

                                {/* Profit % */}
                                <td className={clsx(
                                    "py-4 px-4 text-right font-mono font-semibold",
                                    profit !== null && (profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")
                                )}>
                                    {profit !== null ? `${profit > 0 ? "+" : ""}${profit.toFixed(2)}%` : "—"}
                                </td>

                                {/* Last Update */}
                                <td className="py-4 px-4 text-right text-slate-500 dark:text-slate-400 text-sm">
                                    {formatDate(lastUpdate)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
