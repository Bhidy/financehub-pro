
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp, LayoutList, LayoutGrid, DollarSign } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { PortfolioHolding } from "@/lib/api";
import { useMarketSafe } from "@/contexts/MarketContext";

interface GainsReportingProps {
    holdings: PortfolioHolding[];
    totalUnrealizedGain: number;
    totalRealizedGain: number;
}

export function GainsReporting({ holdings, totalUnrealizedGain, totalRealizedGain }: GainsReportingProps) {
    const { config } = useMarketSafe();
    const currency = config.currency;
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
    const [sortField, setSortField] = useState<'total_gain' | 'unrealized' | 'realized' | 'value'>('total_gain');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Sort logic
    const sortedHoldings = [...holdings].sort((a, b) => {
        const getVal = (h: PortfolioHolding, field: string) => {
            // @ts-ignore
            if (field === 'realized') return h.realized_gain || 0;
            // @ts-ignore
            if (field === 'total_gain') return (h.pnl_value) + (h.realized_gain || 0);
            if (field === 'unrealized') return h.pnl_value;
            if (field === 'value') return h.current_value;
            return 0;
        };

        const valA = getVal(a, sortField);
        const valB = getVal(b, sortField);

        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden"
        >
            {/* Dynamic Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-end mb-6 relative z-10 gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                        Gains Reporting
                    </h3>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Realized vs. Unrealized Performance</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'cards' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Summary Pills */}
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Gain</span>
                        <span className="text-lg font-black">{currency} {(totalUnrealizedGain + totalRealizedGain).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl mb-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                            <div className="col-span-3">Asset</div>
                            <div className="col-span-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('value')}>Value</div>
                            <div className="col-span-2 text-right">Cost Basis</div>
                            <div className="col-span-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('unrealized')}>Unrealized</div>
                            <div className="col-span-1 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('realized')}>Realized</div>
                            <div className="col-span-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('total_gain')}>Total Gain</div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {sortedHoldings.map((holding) => {
                                // @ts-ignore
                                const realized = holding.realized_gain || 0;
                                const unrealized = holding.pnl_value;
                                const totalGain = realized + unrealized;

                                return (
                                    <div
                                        key={holding.id}
                                        className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors items-center group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                                    >
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center text-xs font-black shadow-sm">
                                                    {holding.symbol[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{holding.symbol}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{holding.company_name || 'Stock'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{currency} {holding.current_value.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{holding.quantity} units</div>
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">{currency} {holding.cost_basis.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">@{holding.average_price.toFixed(2)}</div>
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <div className={clsx("font-bold text-sm", unrealized >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {unrealized >= 0 ? '+' : ''}{currency} {Math.abs(unrealized).toLocaleString()}
                                            </div>
                                            <div className={clsx("text-[10px] font-bold", unrealized >= 0 ? "text-emerald-500/70" : "text-rose-500/70")}>
                                                {holding.pnl_percent.toFixed(2)}%
                                            </div>
                                        </div>

                                        <div className="col-span-1 text-right">
                                            <div className={clsx("font-bold text-sm", realized >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {realized !== 0 ? (realized >= 0 ? '+' : '') + currency + ' ' + Math.abs(realized).toLocaleString() : '-'}
                                            </div>
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <div className={clsx("font-black text-sm flex items-center justify-end gap-1", totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                                {totalGain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {currency} {Math.abs(totalGain).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar"
                    >
                        {sortedHoldings.map((holding) => {
                            // @ts-ignore
                            const realized = holding.realized_gain || 0;
                            const unrealized = holding.pnl_value;
                            const totalGain = realized + unrealized;

                            return (
                                <div key={holding.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-sm font-black shadow-sm group-hover:scale-110 transition-transform">
                                                {holding.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{holding.symbol}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{holding.company_name || 'Stock'}</div>
                                            </div>
                                        </div>
                                        {totalGain >= 0
                                            ? <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp className="w-4 h-4" /></div>
                                            : <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><ArrowDownRight className="w-4 h-4" /></div>
                                        }
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold">Value</span>
                                            <span className="font-black text-slate-900 dark:text-white">{currency} {holding.current_value.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold">Unrealized</span>
                                            <span className={clsx("font-bold", unrealized >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {unrealized >= 0 ? '+' : ''}{Math.abs(unrealized).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="border-t border-slate-200 dark:border-white/10 my-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Gain</span>
                                            <span className={clsx("font-black text-sm", totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                                {totalGain >= 0 ? '+' : ''}{Math.abs(totalGain).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    * Realized gains are calculated based on closed positions in the current tax year.
                </p>
            </div>
        </motion.div>
    );
}
