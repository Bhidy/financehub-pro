"use client";

import { useAISuggestions } from "@/hooks/useAISuggestions";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";

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

            {/* Category Tabs with fade edges */}
            <div className="relative px-4 mb-4">
                {/* Left fade */}
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
                )}
                {/* Right fade */}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
                >
                    {suggestionCategories.map((cat, idx) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(idx)}
                            className={clsx(
                                "relative px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border flex-shrink-0",
                                activeTab === idx
                                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-105"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {/* Glow effect for active */}
                            {activeTab === idx && (
                                <div className="absolute inset-0 rounded-full bg-slate-900 blur-md opacity-30 -z-10" />
                            )}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Suggestion Cards - Glass design */}
            <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-3">
                {activeSuggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(s.text)}
                        className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg shadow-slate-200/40 active:scale-[0.98] active:shadow-md transition-all duration-200 text-left"
                    >
                        {/* Icon with gradient */}
                        <div className={clsx(
                            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white shadow-lg transition-transform duration-300 group-active:scale-95",
                            s.gradient
                        )}>
                            <s.icon className="w-6 h-6" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 text-[15px] leading-snug block truncate">
                                {s.text}
                            </span>
                            <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                                Tap to ask
                            </span>
                        </div>

                        {/* Arrow hint */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-active:bg-blue-100 group-active:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
