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
                            className="w-full bg-[#F1F5F9] dark:bg-[#1A222C] border border-slate-200 dark:border-[#2E3A47] rounded-md pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-[#3C50E0]/20 outline-none transition-all shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                    </div>

                    {/* Pro View Toggles */}
                    <div className="flex bg-[#F1F5F9] dark:bg-[#1A222C] rounded-md p-1 border border-slate-200 dark:border-[#2E3A47]">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={clsx(
                                "p-2 rounded-md transition-all duration-300",
                                viewMode === 'cards'
                                    ? "bg-white dark:bg-[#24303F] text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-2 rounded-md transition-all duration-300",
                                viewMode === 'table'
                                    ? "bg-white dark:bg-[#24303F] text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
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
                        className="text-center py-20 bg-white dark:bg-[#24303F] rounded-md border border-slate-200 dark:border-[#2E3A47] shadow-sm relative overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-md bg-[#F1F5F9] dark:bg-[#1A222C] flex items-center justify-center mb-6 shadow-sm border border-slate-200 dark:border-[#2E3A47]">
                                <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Zero Matches Found</h4>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Adjust your filters or verify the ticker</p>
                        </div>
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
