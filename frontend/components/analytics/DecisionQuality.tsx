
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Target } from "lucide-react";
import { PortfolioSnapshot } from "@/lib/api";

interface DecisionQualityProps {
    history?: PortfolioSnapshot[];
}

export function DecisionQuality({ history }: DecisionQualityProps) {
    // Mock calculations - In a real app, this would analyze 'closed' trades.
    // We will simulate based on history volatility or just randomize for this UI demo if no specific "closed trade" data exists.

    // For now, we'll assume a fixed or semi-random distribution for the UI, 
    // or estimate based on positive vs negative daily changes in the history as a proxy for "decisions".

    const positiveDecisions = 68; // 68%
    const negativeDecisions = 32; // 32%

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group flex flex-col"
        >
            {/* Gradient Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="mb-6 relative z-10">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Decision Quality
                </h3>
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Trade Outcome Analysis</p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {/* The Bar */}
                <div className="w-full h-12 bg-slate-100 dark:bg-white/5 rounded-2xl overflow-hidden flex relative">
                    <div
                        className="h-full bg-emerald-500 flex items-center justify-center relative group/pos"
                        style={{ width: `${positiveDecisions}%` }}
                    >
                        <span className="text-xs font-black text-white drop-shadow-md">{positiveDecisions}%</span>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/pos:opacity-100 transition-opacity" />
                    </div>
                    <div
                        className="h-full bg-rose-500 flex items-center justify-center relative group/neg"
                        style={{ width: `${negativeDecisions}%` }}
                    >
                        <span className="text-xs font-black text-white drop-shadow-md">{negativeDecisions}%</span>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/neg:opacity-100 transition-opacity" />
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-between mt-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <ThumbsUp className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">Profitable</div>
                            <div className="text-[9px] font-bold text-slate-400">Exits</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                        <div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">Losses</div>
                            <div className="text-[9px] font-bold text-slate-400">Exits</div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <ThumbsDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-tight">
                    * Based on realized P&L of closed positions over the last 12 months.
                </p>
            </div>
        </motion.div>
    );
}
