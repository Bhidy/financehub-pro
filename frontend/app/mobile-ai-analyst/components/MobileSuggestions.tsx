"use client";

import { useAISuggestions } from "@/hooks/useAISuggestions";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

interface MobileSuggestionsProps {
    onSelect: (text: string) => void;
}

export function MobileSuggestions({ onSelect }: MobileSuggestionsProps) {
    const suggestionCategories = useAISuggestions();
    const [activeTab, setActiveTab] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(true);

    const activeSuggestions = suggestionCategories[activeTab]?.suggestions || [];

    // Handle scroll fade indicators
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftFade(scrollLeft > 10);
            setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        handleScroll();
    }, []);

    return (
        <div className="w-full flex-1 flex flex-col">

            {/* Category Tabs - Midnight Teal Design */}
            <div className="relative px-0 mb-4 overflow-hidden">
                {/* Left fade */}
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/80 dark:from-[#0B1121] dark:via-[#0B1121]/80 to-transparent z-10 pointer-events-none" />
                )}
                {/* Right fade */}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/80 dark:from-[#0B1121] dark:via-[#0B1121]/80 to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-4"
                >
                    {suggestionCategories.map((cat, idx) => (
                        <motion.button
                            key={cat.id}
                            onClick={() => setActiveTab(idx)}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(
                                "relative px-4 py-2.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0",
                                activeTab === idx
                                    ? "bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] shadow-lg shadow-slate-900/20 dark:shadow-white/10"
                                    : "bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.08]"
                            )}
                        >
                            <span className="relative z-10">{cat.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Suggestion Cards - Midnight Teal Design */}
            <div className="flex-1 space-y-3 px-0">
                {activeSuggestions.map((s, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(s.text)}
                        className="w-full group"
                    >
                        {/* Card */}
                        <div className="relative flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.08] shadow-sm dark:shadow-none transition-all duration-300 group-active:scale-[0.98] group-hover:border-[#3B82F6]/30 dark:group-hover:border-[#3B82F6]/20">

                            {/* Icon Container */}
                            <div className="relative flex-none">
                                <div className={clsx(
                                    "w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-md transition-transform duration-300 group-active:scale-90",
                                    s.gradient
                                )}>
                                    <s.icon className="w-5.5 h-5.5" />
                                </div>
                                <div className={clsx(
                                    "absolute inset-0 rounded-lg bg-gradient-to-br opacity-20 blur-md -z-10",
                                    s.gradient
                                )} />
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 text-left relative">
                                <span className="font-bold text-[#0F172A] dark:text-slate-100 text-[14px] leading-tight block mb-0.5 group-hover:text-[#3B82F6] dark:group-hover:text-[#3B82F6] transition-colors">
                                    {s.text}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        Ask Starta
                                    </span>
                                </div>
                            </div>

                            {/* Minimal Arrow */}
                            <ChevronRight className="flex-none w-5 h-5 text-slate-300 dark:text-slate-600 group-active:text-[#3B82F6] transition-colors" />
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
