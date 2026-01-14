'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Download, Eye, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const fmt = (n: any, d = 2) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtLarge = (n: any) => {
    if (!n || isNaN(n)) return '-';
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return Number(n).toLocaleString();
};

export default function WatchlistPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'volume', asc: false });

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/yahoo/watchlist`)
            .then(res => res.json())
            .then(res => {
                setData(res.data || []);
            })
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let res = data.filter(d =>
            d.symbol.toLowerCase().includes(search.toLowerCase()) ||
            (d.name_en && d.name_en.toLowerCase().includes(search.toLowerCase()))
        );

        return res.sort((a, b) => {
            const va = a[sort.key] || 0;
            const vb = b[sort.key] || 0;
            return sort.asc ? va - vb : vb - va;
        });
    }, [data, search, sort]);

    const handleSort = (key: string) => {
        setSort(prev => ({ key, asc: prev.key === key ? !prev.asc : false }));
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Live Feed...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white font-sans pb-20">
            {/* HEADER */}
            <header className="bg-white dark:bg-[#151925] border-b border-slate-200 dark:border-white/5 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Eye className="w-8 h-8 text-blue-600" />
                                Smart Watchlist
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Real-time monitoring of {data.length} EGX securities
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative group w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search Ticker..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-[#1A1F2E] focus:border-blue-500 rounded-xl text-sm font-bold transition-all outline-none"
                                />
                            </div>
                            <button className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    <th className="p-5 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('symbol')}>Symbol</th>
                                    <th className="p-5 text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('last_price')}>Price</th>
                                    <th className="p-5 text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('change_pct')}>Change</th>
                                    <th className="p-5 text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('volume')}>Volume</th>
                                    <th className="p-5 text-right hidden lg:table-cell cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('market_cap')}>Mkt Cap</th>
                                    <th className="p-5 text-right hidden md:table-cell">Day Range</th>
                                    <th className="p-5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                                            No stocks found matching "{search}"
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((stock, i) => {
                                        const isPos = (stock.change_pct || 0) >= 0;
                                        return (
                                            <tr
                                                key={stock.isin}
                                                className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                                onClick={() => window.location.href = `/egx/${stock.symbol}`}
                                            >
                                                <td className="p-5">
                                                    <Link href={`/egx/${stock.symbol}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-black text-slate-700 dark:text-white group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                            {stock.symbol ? stock.symbol.substring(0, 2) : '??'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stock.symbol}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">{stock.name_en}</div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="font-bold text-slate-900 dark:text-white">{fmt(stock.last_price)}</div>
                                                    <div className="text-xs font-bold text-slate-400">EGP</div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold", isPos ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                                                        {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                        {fmt(Math.abs(stock.change_pct))}%
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right font-mono text-slate-600 dark:text-slate-300 font-medium text-sm">
                                                    {fmtLarge(stock.volume)}
                                                </td>
                                                <td className="p-5 text-right font-mono text-slate-600 dark:text-slate-300 font-medium text-sm hidden lg:table-cell">
                                                    {fmtLarge(stock.market_cap)}
                                                </td>
                                                <td className="p-5 text-right hidden md:table-cell">
                                                    <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400">
                                                        <span>{fmt(stock.day_low)}</span>
                                                        <div className="w-16 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                                                            {/* Simple Range Bar */}
                                                            <div
                                                                className="absolute top-0 bottom-0 bg-slate-300 rounded-full"
                                                                style={{
                                                                    left: `${Math.min(100, Math.max(0, ((stock.last_price - stock.day_low) / (stock.day_high - stock.day_low)) * 100))}%`,
                                                                    width: '20%'
                                                                }}
                                                            />
                                                        </div>
                                                        <span>{fmt(stock.day_high)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <Link href={`/egx/${stock.symbol}`} className="inline-flex p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                                                        <TrendingUp className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
