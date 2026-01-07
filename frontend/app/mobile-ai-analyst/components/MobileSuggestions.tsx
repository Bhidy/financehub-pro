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

            {/* Category Tabs - Ultra Premium */}
            <div className="relative px-4 mb-5">
                {/* Left fade */}
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />
                )}
                {/* Right fade */}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
                >
                    {suggestionCategories.map((cat, idx) => (
                        <motion.button
                            key={cat.id}
                            onClick={() => setActiveTab(idx)}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(
                                "relative px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0",
                                activeTab === idx
                                    ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/25"
                                    : "bg-white text-slate-600 border border-slate-200 shadow-sm hover:shadow-md"
                            )}
                        >
                            {/* Inner glow for active */}
                            {activeTab === idx && (
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-teal-500/10 blur-sm" />
                            )}
                            <span className="relative">{cat.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Suggestion Cards - Super Ultra Premium */}
            <div className="flex-1 overflow-y-auto px-4 pb-36 space-y-4">
                {activeSuggestions.map((s, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(s.text)}
                        className="w-full group relative overflow-hidden"
                    >
                        {/* Card */}
                        <div className="relative flex items-center gap-4 p-5 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 transition-all duration-300 group-active:shadow-lg group-active:border-blue-200">

                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/0 to-teal-50/0 group-active:from-blue-50/50 group-active:via-blue-50/30 group-active:to-teal-50/50 rounded-3xl transition-all duration-300" />

                            {/* Icon Container - Premium 3D effect */}
                            <div className="relative">
                                <div className={clsx(
                                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-active:scale-95",
                                    s.gradient
                                )}>
                                    <s.icon className="w-7 h-7" />
                                </div>
                                {/* Icon glow */}
                                <div className={clsx(
                                    "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40 blur-lg -z-10",
                                    s.gradient
                                )} />
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 text-left relative">
                                <span className="font-bold text-slate-900 text-base leading-snug block mb-1">
                                    {s.text}
                                </span>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                        Tap to ask Finny
                                    </span>
                                </div>
                            </div>

                            {/* Arrow with animation */}
                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200/50 shadow-sm group-active:from-blue-100 group-active:to-blue-50 group-active:border-blue-200 transition-all duration-300">
                                <ChevronRight className="w-5 h-5 text-slate-400 group-active:text-blue-600 transition-colors" />
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
