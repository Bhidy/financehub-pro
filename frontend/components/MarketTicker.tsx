"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { fetchTickers, Ticker } from "@/lib/api";

export default function MarketTicker() {
    const { data: tickers = [] } = useQuery({
        queryKey: ["tickers", "egx-ticker-tape"],
        queryFn: async () => {
            const allTickers = await fetchTickers();
            return allTickers
                .filter((item) => /^[A-Z]{3,5}$/.test((item.symbol || "").toUpperCase()))
                .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))
                .slice(0, 120);
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    // Minimal data for display while loading or if data is missing
    const displayTickers: Ticker[] = tickers.length > 0 ? tickers : [
        { symbol: "EGX", last_price: 0, change: 0, change_percent: 0, name_en: "Egyptian Exchange", name_ar: "", sector_name: "Market", volume: 0 },
        { symbol: "LOADING", last_price: 0, change: 0, change_percent: 0, name_en: "Loading", name_ar: "", sector_name: "", volume: 0 }
    ];

    // Seamless loop: 2 copies is sufficient for -50% translation
    const duplicatedTickers = [...displayTickers, ...displayTickers];

    // Best Practice: Constant Speed (not constant time)
    // Adjust seconds per item to control speed (e.g. 5 seconds per ticker)
    const duration = Math.max(displayTickers.length * 8, 40);

    return (
        <div className="w-full bg-white dark:bg-[#1A222C] border-b border-slate-200 dark:border-[#2E3A47] py-1.5 overflow-hidden flex items-center z-50 transition-colors duration-300">
            <div className="flex whitespace-nowrap">
                <motion.div
                    key={displayTickers.length} // Force re-render when data loads to update duration
                    className="flex"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration: duration,
                    }}
                // Note: Tooltip hover works better if we could pause, but Framer Motion infinite loop is hard to pause without controls.
                // Given 'Best Practice', we prioritize smooth constant speed here.
                >
                    {duplicatedTickers.map((item, index) => (
                        <div key={`${item.symbol}-${index}`} className="flex items-center space-x-2.5 px-4 border-r border-slate-200/50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 font-sans group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{item.symbol}</span>
                            <div className="flex items-center gap-1.5 leading-none">
                                <span className={clsx("font-bold text-[11px] font-mono", Number(item.change_percent || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                    {Number(item.last_price || 0).toFixed(2)}
                                </span>
                                <span className={clsx("text-[10px] font-bold font-mono px-1 py-0.5 rounded-sm", Number(item.change_percent || 0) >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400")}>
                                    {Number(item.change_percent || 0) >= 0 ? "+" : ""}{Number(item.change_percent || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
