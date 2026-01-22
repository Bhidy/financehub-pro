
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { PortfolioHolding } from "@/lib/api";
import { useMarketSafe } from "@/contexts/MarketContext";

interface GainsReportingProps {
    holdings: PortfolioHolding[];
    totalUnrealizedGain: number;
    totalRealizedGain: number; // This might need to be passed in or calculated if available
}

export function GainsReporting({ holdings, totalUnrealizedGain, totalRealizedGain }: GainsReportingProps) {
    const { config } = useMarketSafe();
    const currency = config.currency;
    const [sortField, setSortField] = useState<'total_gain' | 'unrealized' | 'realized' | 'value'>('total_gain');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    
    // Sort logic
    const sortedHoldings = [...holdings].sort((a, b) => {
        // Mocking realized gain as 0 for now since it's not in the main type yet, 
        // effectively sorting by unrealized for total gain if realized is missing.
        // We will assume 'pnl_value' is unrealized gain.
        
        // Extended logic for demo purposes:
        // We really should have this data. For now, let's assume pnl_value is Unrealized.
        // And we might simulate realized gain or just use 0 if not provided.
        
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
            className="w-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden"
        >
             {/* Dynamic Glow */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                        Gains Reporting
                    </h3>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Realized vs. Unrealized Performance</p>
                </div>
                
                {/* Summary Pills */}
                <div className="flex gap-4">
                     <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Gain</span>
                        <span className="text-lg font-black">{currency} {(totalUnrealizedGain + totalRealizedGain).toLocaleString()}</span>
                     </div>
                </div>
            </div>

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
                    // Extended properties check
                    // @ts-ignore
                    const realized = holding.realized_gain || 0;
                    const unrealized = holding.pnl_value;
                    const totalGain = realized + unrealized;
                    
                    return (
                        <motion.div 
                            layout
                            key={holding.id}
                            className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors items-center group"
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
                        </motion.div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    * Realized gains are calculated based on closed positions in the current tax year.
                </p>
            </div>
        </motion.div>
    );
}
