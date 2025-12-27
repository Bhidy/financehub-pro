"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCorporateActions } from "@/lib/api";
import { Calendar, Filter, Loader2, Coins, Split, AlertCircle, Search } from "lucide-react";
import clsx from "clsx";

interface CorporateAction {
    id: number;
    symbol: string;
    action_type: string;
    description: string;
    announcement_date: string;
    ex_date: string;
}

export default function CorporateActionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");

    const { data: actions = [], isLoading } = useQuery({
        queryKey: ["corporate-actions"],
        queryFn: async () => fetchCorporateActions(), // Fetch all (limited by API default)
    });

    const actionTypes = ["All", ...new Set(actions.map((a: CorporateAction) => a.action_type || "Other"))] as string[];

    const filteredActions = actions.filter((action: CorporateAction) => {
        const matchesSearch = !searchTerm || action.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || action.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "All" || action.action_type === filterType;
        return matchesSearch && matchesType;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Corporate Events...</h2>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Corporate Actions Calendar</h1>
                            <p className="text-orange-100 font-medium">Track dividends, stock splits, and capital changes • {actions.length} events</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 sticky top-4 z-30">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by symbol or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:border-orange-500 focus:outline-none"
                            >
                                {actionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Events Feed */}
                <div className="space-y-4">
                    {filteredActions.map((action: CorporateAction) => (
                        <div key={action.id} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-all flex flex-col md:flex-row gap-6">

                            {/* Date Box */}
                            <div className="flex-shrink-0 w-20 h-20 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Ex-Date</span>
                                <span className="text-2xl font-bold text-slate-900 font-mono">
                                    {new Date(action.ex_date || action.announcement_date).getDate()}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                    {new Date(action.ex_date || action.announcement_date).toLocaleDateString(undefined, { month: 'short' })}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        {action.symbol}
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                            action.action_type.includes("Distribution") ? "bg-emerald-100 text-emerald-700" :
                                                action.action_type.includes("Capital") ? "bg-blue-100 text-blue-700" :
                                                    "bg-slate-100 text-slate-700"
                                        )}>
                                            {action.action_type}
                                        </span>
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400">
                                        Announced: {new Date(action.announcement_date).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    {action.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredActions.length === 0 && !isLoading && (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900">No Events Found</h3>
                        <p className="text-slate-500">Try adjusting your filters.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
