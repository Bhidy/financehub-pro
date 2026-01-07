"use client";

import { useAISuggestions } from "@/hooks/useAISuggestions";
import clsx from "clsx";
import { useState } from "react";

interface MobileSuggestionsProps {
    onSelect: (text: string) => void;
}

export function MobileSuggestions({ onSelect }: MobileSuggestionsProps) {
    const suggestionCategories = useAISuggestions();
    const [activeTab, setActiveTab] = useState(0);

    const activeSuggestions = suggestionCategories[activeTab]?.suggestions || [];

    return (
        <div className="w-full flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 pb-4 snap-x">
                {suggestionCategories.map((cat, idx) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(idx)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border snap-center",
                            activeTab === idx
                                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                : "bg-white text-slate-500 border-slate-200"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-3 px-4 pb-20 overflow-y-auto">
                {activeSuggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(s.text)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:bg-slate-50 active:scale-[0.99] transition-all text-left"
                    >
                        <div className={clsx("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white shadow-sm", s.gradient)}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm leading-snug">
                            {s.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
