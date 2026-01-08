import React from "react";
import { Banknote, Scissors, Calendar, ArrowRight } from "lucide-react";
import clsx from "clsx";

interface Action {
    action_date: string;
    action_type: string;
    value: string;
    currency?: string;
}

interface ActionsTimelineProps {
    actions: Action[];
}

const safeDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

export default function ActionsTimeline({ actions }: ActionsTimelineProps) {
    if (!actions || actions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 text-sm font-medium italic">
                No corporate actions recorded.
            </div>
        );
    }

    // Sort descending by date
    const sortedActions = [...actions].sort((a, b) => {
        const tA = new Date(a.action_date).getTime();
        const tB = new Date(b.action_date).getTime();
        return tB - tA;
    });

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("dividend") || t.includes("distribution") || t.includes("coup")) return <Banknote className="w-4 h-4 text-emerald-600" />;
        if (t.includes("split")) return <Scissors className="w-4 h-4 text-blue-600" />;
        return <Calendar className="w-4 h-4 text-slate-500" />;
    };

    return (
        <div className="relative pl-4 border-l border-slate-100 space-y-8 my-4">
            {sortedActions.map((action, i) => {
                const date = safeDate(action.action_date);
                const isDividend = action.action_type.toLowerCase().includes("dividend") || action.action_type.toLowerCase().includes("coup");

                return (
                    <div key={i} className="relative group">
                        {/* Timeline Dot */}
                        <div className={clsx(
                            "absolute -left-[25px] top-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
                            isDividend ? "bg-emerald-50" : "bg-slate-50"
                        )}>
                            {getIcon(action.action_type)}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : action.action_date}
                                </div>
                                <h4 className="text-sm font-black text-slate-900 leading-tight">
                                    {action.action_type}
                                </h4>
                            </div>

                            <div className="flex items-center gap-2">
                                {action.value && (
                                    <div className={clsx(
                                        "px-3 py-1.5 rounded-lg text-sm font-black font-mono",
                                        isDividend ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700"
                                    )}>
                                        {action.value}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
