"use client";

import { useMemo } from "react";

interface CorporateAction {
    id: number;
    symbol: string;
    action_type: string;
    ex_date: string;
    payment_date: string;
    amount: string | number;
    description: string;
}

interface DividendYieldTableProps {
    actions: CorporateAction[];
    currentPrice: number;
}

export function DividendYieldTable({ actions, currentPrice }: DividendYieldTableProps) {
    const dividends = useMemo(() => {
        return actions
            .filter(a => a.action_type === "DIVIDEND")
            .sort((a, b) => new Date(b.ex_date).getTime() - new Date(a.ex_date).getTime());
    }, [actions]);

    const stats = useMemo(() => {
        if (dividends.length === 0 || !currentPrice) return null;

        const lastYearDividends = dividends.filter(d => {
            const date = new Date(d.ex_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return date >= oneYearAgo;
        });

        const totalDividendsTTM = lastYearDividends.reduce((sum, d) => sum + Number(d.amount), 0);
        const dividendYield = (totalDividendsTTM / currentPrice) * 100;

        // Calculate average growth rate (3 years)
        // Simply comparing this year vs 3 years ago if available

        return {
            yield: dividendYield,
            ttmAmount: totalDividendsTTM,
            count: lastYearDividends.length,
            lastPaymentDate: dividends[0]?.payment_date
        };
    }, [dividends, currentPrice]);

    if (dividends.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4 text-slate-300">💰</div>
                <p className="text-slate-500">No dividend history available for this stock.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">Dividend History</h3>
                    <p className="text-xs text-slate-500">Historical cash distributions</p>
                </div>
                {stats && (
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Annual Yield</div>
                        <div className="text-2xl font-bold font-mono text-emerald-600">{stats.yield.toFixed(2)}%</div>
                    </div>
                )}
            </div>

            {/* Yield Stats */}
            {stats && (
                <div className="grid grid-cols-4 border-b border-slate-100 divide-x divide-slate-100">
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500">TTM Payout</div>
                        <div className="font-bold font-mono text-slate-900">{stats.ttmAmount.toFixed(2)} SAR</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500">Frequency</div>
                        <div className="font-bold font-mono text-slate-900">{stats.count > 0 ? (stats.count > 2 ? "Quarterly" : "Semi-Annual") : "Annual"}</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500">Last Payment</div>
                        <div className="font-bold font-mono text-slate-900">
                            {stats.lastPaymentDate ? new Date(stats.lastPaymentDate).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs text-slate-500">Total Count</div>
                        <div className="font-bold font-mono text-slate-900">{dividends.length}</div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-sans text-xs uppercase tracking-wider text-left sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 font-bold">Ex-Dividend Date</th>
                            <th className="px-6 py-3 font-bold">Payment Date</th>
                            <th className="px-6 py-3 font-bold text-right">Amount (SAR)</th>
                            <th className="px-6 py-3 font-bold text-right hidden md:table-cell">Type</th>
                            <th className="px-6 py-3 font-bold hidden lg:table-cell">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                        {dividends.map((d) => (
                            <tr key={d.id} className="hover:bg-green-50/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">
                                    {new Date(d.ex_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {d.payment_date ? new Date(d.payment_date).toLocaleDateString() : 'Pending'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
                                        {Number(d.amount).toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right hidden md:table-cell">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Cash</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 hidden lg:table-cell max-w-xs truncate">
                                    {d.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
