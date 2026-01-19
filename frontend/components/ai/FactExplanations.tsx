"use client";

import React, { useState } from "react";
import { BookOpen, X, ChevronDown, ChevronUp } from "lucide-react";

interface FactExplanationsProps {
    explanations: Record<string, string>;
}

export function FactExplanations({ explanations }: FactExplanationsProps) {
    const [isOpen, setIsOpen] = useState(true);

    if (!explanations || Object.keys(explanations).length === 0) return null;

    const terms = Object.entries(explanations);

    return (
        <div className="mt-4 max-w-2xl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-full transition-colors"
            >
                <BookOpen size={14} />
                <span>Explanations & Definitions</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="mt-2 grid gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    {terms.map(([term, definition]) => (
                        <div key={term} className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 rounded-xl">
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{term}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {definition}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
