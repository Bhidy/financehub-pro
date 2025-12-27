"use client";

import { useMemo } from "react";
import { Split, ArrowRight } from "lucide-react";

interface CorporateAction {
    id: number;
    symbol: string;
    action_type: string;
    ex_date: string;
    amount: string | number;
    description: string;
}

interface StockSplitsTimelineProps {
    actions: CorporateAction[];
}

export function StockSplitsTimeline({ actions }: StockSplitsTimelineProps) {
    const splits = useMemo(() => {
        return actions
            .filter(a => a.action_type === "SPLIT")
            .sort((a, b) => new Date(b.ex_date).getTime() - new Date(a.ex_date).getTime());
    }, [actions]);

    if (splits.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="text-4xl mb-4 text-slate-300">✂️</div>
                <p className="text-slate-500">No stock splits recorded.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Split className="w-5 h-5 text-blue-600" />
                    Stock Splits History
                </h3>
            </div>

            <div className="p-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>

                <div className="space-y-8 relative z-10">
                    {splits.map((s) => (
                        <div key={s.id} className="flex gap-4 group">
                            <div className="w-6 h-6 rounded-full bg-blue-600 border-4 border-white shadow-sm flex items-center justify-center shrink-0 mt-1 ring-2 ring-blue-100 group-hover:scale-110 transition-transform">
                            </div>
                            <div className="flex-1 bg-white border border-slate-100 hover:border-blue-200 rounded-lg p-4 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        {new Date(s.ex_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                        Completed
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl font-bold font-mono text-slate-900">1</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                    <span className="text-2xl font-bold font-mono text-blue-600">{Number(s.amount)}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                    {s.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
