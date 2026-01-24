
"use client";

import { useAISuggestions } from "@/hooks/useAISuggestions";
import { clsx } from "clsx";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AnalystDesktopGrid({ onSelect }: { onSelect: (q: string) => void }) {
    const suggestionCategories = useAISuggestions();
    const [activeTab, setActiveTab] = useState(0);

    const activeSuggestions = (suggestionCategories[activeTab]?.suggestions || []).slice(0, 3);

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Tabs Row */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {suggestionCategories.map((cat, idx) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(idx)}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                            activeTab === idx
                                ? "bg-[#13b8a6] text-white border-[#13b8a6] shadow-lg shadow-[#13b8a6]/20 scale-105"
                                : "bg-white dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-[#13b8a6]/30 hover:text-[#13b8a6]"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <AnimatePresence mode="popLayout">
                    {activeSuggestions.map((item, idx) => (
                        <motion.button
                            key={`${activeTab}-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            onClick={() => onSelect(item.text)}
                            className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 hover:border-[#13b8a6]/50 hover:shadow-lg transition-all text-left group flex flex-col h-full relative overflow-hidden"
                        >
                            {/* Card Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#13b8a6]/10 to-transparent dark:from-[#13b8a6]/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg transition-colors relative z-10",
                                "bg-[#13b8a6]/10 text-[#13b8a6] dark:bg-[#13b8a6]/10"
                            )}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-2 group-hover:text-[#13b8a6] transition-colors line-clamp-2 relative z-10">
                                {item.text}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest relative z-10">
                                ASK STARTA
                            </p>
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
