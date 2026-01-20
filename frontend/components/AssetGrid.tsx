"use client";

import { useState } from "react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Search } from "lucide-react";
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

    // Filter Logic
    const filteredHoldings = holdings.filter(h =>
        h.symbol.includes(searchQuery.toUpperCase()) ||
        h.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 border-b border-white/5 pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Your Assets
                    <span className="text-sm font-medium text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                        {holdings.length}
                    </span>
                </h2>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search holdings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#151925] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm text-white placeholder:text-slate-500"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-[#151925] rounded-xl p-1 border border-white/5 shadow-sm">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'cards' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-slate-300"
                            )}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'table' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-slate-300"
                            )}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid / List Content */}
            {filteredHoldings.length === 0 ? (
                <div className="text-center py-20 bg-[#151925] rounded-3xl border border-dashed border-white/10">
                    <p className="text-slate-500 font-medium">No holdings match your search.</p>
                </div>
            ) : (
                <motion.div layout className={clsx(
                    viewMode === 'cards'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
                        : "flex flex-col gap-2"
                )}>
                    <LayoutGroup>
                        <AnimatePresence mode="popLayout">
                            {filteredHoldings.map(holding => (
                                <AssetCard
                                    key={holding.id}
                                    holding={holding}
                                    onDelete={onDelete}
                                    onClick={() => onSelect(holding)}
                                // TODO: If we want a specific List View component for Table mode, we can add it here.
                                // For now, AssetCard adapts or we just show cards.
                                // ideally we'd have <AssetRow /> for table view.
                                // reusing AssetCard for now as it looks good in grid.
                                />
                            ))}
                        </AnimatePresence>
                    </LayoutGroup>
                </motion.div>
            )}
        </div>
    );
}
