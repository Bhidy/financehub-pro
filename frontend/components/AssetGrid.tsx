"use client";

import { useState } from "react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Search, Plus, Filter } from "lucide-react";
import clsx from "clsx";
import { PortfolioHolding } from "@/lib/api";
import { AssetCard } from "./AssetCard";

interface AssetGridProps {
    holdings: (PortfolioHolding & { sparkline_data?: number[] })[];
    onDelete: (id: number) => void;
    onSelect: (holding: PortfolioHolding) => void;
}

export function AssetGrid({ holdings, onDelete, onSelect }: AssetGridProps) {
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [searchQuery, setSearchQuery] = useState("");

    const filteredHoldings = holdings.filter(h =>
        h.symbol.includes(searchQuery.toUpperCase()) ||
        h.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Elite Sub-Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pb-6 border-b border-slate-200 dark:border-white/5">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Asset Universe
                        <span className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-brand-accent text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                            {holdings.length} Positions
                        </span>
                    </h2>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Global Portfolio Distribution</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Integrated Search Box */}
                    <div className="relative group flex-1 md:w-80">
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-accent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 rounded-full" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-accent transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Symbol or Entity..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-brand-accent/5 outline-none transition-all shadow-xl shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                    </div>

                    {/* Pro View Toggles */}
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-inner">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={clsx(
                                "p-3 rounded-xl transition-all duration-500",
                                viewMode === 'cards'
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-3 rounded-xl transition-all duration-500",
                                viewMode === 'table'
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Universe Content */}
            <AnimatePresence mode="wait">
                {filteredHoldings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center py-32 bg-white dark:bg-[#151925]/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5 shadow-inner relative overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 shadow-xl border border-slate-100 dark:border-white/5">
                                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Zero Matches Found</h4>
                            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">Adjust your filters or verify the ticker</p>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-accent/5 blur-[120px] rounded-full" />
                    </motion.div>
                ) : (
                    <motion.div layout className={clsx(
                        viewMode === 'cards'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                            : "flex flex-col gap-4"
                    )}>
                        <LayoutGroup>
                            <AnimatePresence mode="popLayout">
                                {filteredHoldings.map(holding => (
                                    <AssetCard
                                        key={holding.id}
                                        holding={holding}
                                        onDelete={onDelete}
                                        onClick={() => onSelect(holding)}
                                    />
                                ))}
                            </AnimatePresence>
                        </LayoutGroup>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
