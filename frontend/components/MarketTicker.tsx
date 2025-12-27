"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { fetchTickers, Ticker } from "@/lib/api";

export default function MarketTicker() {
    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });

    // Minimal data for display while loading or if data is missing
    const displayTickers: Ticker[] = tickers.length > 0 ? tickers : [
        { symbol: "TASI", last_price: 12150.45, change: 0.85, change_percent: 0.1, name_en: "Tadawul All Share", name_ar: "", sector_name: "Index", volume: 0 },
        { symbol: "LOADING...", last_price: 0, change: 0, change_percent: 0, name_en: "Loading", name_ar: "", sector_name: "", volume: 0 }
    ];

    // Seamless loop: 2 copies is sufficient for -50% translation
    const duplicatedTickers = [...displayTickers, ...displayTickers];

    // Best Practice: Constant Speed (not constant time)
    // Adjust seconds per item to control speed (e.g. 5 seconds per ticker)
    const duration = Math.max(displayTickers.length * 8, 40);

    return (
        <div className="w-full bg-white border-b border-slate-200 py-3 overflow-hidden flex items-center shadow-sm z-50">
            <div className="flex whitespace-nowrap">
                <motion.div
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
                        <div key={`${item.symbol}-${index}`} className="flex items-center space-x-3 px-6 border-r border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group">
                            <span className="font-bold text-sm text-slate-800 font-sans group-hover:text-blue-600 transition-colors">{item.symbol}</span>
                            <div className="flex flex-col leading-none">
                                <span className={clsx("font-bold text-xs font-mono", (item.change || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {Number(item.last_price || 0).toFixed(2)}
                                </span>
                                <span className={clsx("text-[10px] font-bold font-mono", (item.change || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(item.change || 0) >= 0 ? "+" : ""}{Number(item.change_percent || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
