"use client";

import React from "react";
import { BookOpen } from "lucide-react";

interface FactExplanationsProps {
    explanations: Record<string, string>;
}

export function FactExplanations({ explanations }: FactExplanationsProps) {
    if (!explanations || Object.keys(explanations).length === 0) return null;

    const terms = Object.entries(explanations);

    return (
        <div className="mt-2 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-4">
                <BookOpen size={16} />
                <span>Explanations & Definitions</span>
            </div>

            <div className="grid gap-3">
                {terms.map(([term, definition]) => (
                    <div key={term} className="group">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 group-hover:text-blue-500 transition-colors">
                            {term}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                            {definition}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
