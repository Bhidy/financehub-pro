"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPortfolio, importPortfolio, addHolding, deleteHolding, fetchPortfolioHistory, HoldingImport, PortfolioHolding } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Components
import { PortfolioHeader } from "@/components/PortfolioHeader";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { PortfolioChart } from "@/components/PortfolioChart";
import { AllocationChart } from "@/components/AllocationChart";
import { AssetGrid } from "@/components/AssetGrid";
import { HoldingDrawer } from "@/components/HoldingDrawer";
import { SkeletonAssetCard, SkeletonInsightCard } from "@/components/PortfolioSkeletons";

// ============================================================================
// MODALS (Inline for now to avoid breaking changes)
// ============================================================================
// CSVUploadModal is defined inline at the bottom


export default function PortfolioPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // UI State
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<(PortfolioHolding & { sparkline_data?: number[] }) | null>(null);

    // Data Queries
    const { data: portfolio, isLoading, refetch } = useQuery({
        queryKey: ["portfolio-full"],
        queryFn: fetchPortfolio,
        refetchInterval: 30000, // 30s live updates
        enabled: isAuthenticated,
    });

    const { data: history } = useQuery({
        queryKey: ["portfolio-history"],
        queryFn: fetchPortfolioHistory,
        enabled: !!portfolio
    });

    // Mutations
    const importMutation = useMutation({
        mutationFn: ({ holdings, replace }: { holdings: HoldingImport[], replace: boolean }) =>
            importPortfolio(holdings, replace),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            setShowCSVModal(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteHolding,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio-full"] })
    });

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Loading State (Premium Skeleton)
    if (authLoading || (!portfolio && isLoading)) {
        return (
            <div className="min-h-screen bg-[#0B1121] p-6 space-y-8 overflow-hidden">
                <div className="h-[320px] bg-[#151925] rounded-[40px] animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />
                </div>
                <div className="max-w-[1700px] mx-auto px-6 -mt-32 space-y-8 relative z-20">
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <SkeletonInsightCard key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!portfolio) return null;

    return (
        <div className="min-h-screen bg-[#0B1120] pb-20 font-sans selection:bg-blue-500/30">
            {/* Slide-Over Drawer */}
            <HoldingDrawer
                isOpen={!!selectedHolding}
                onClose={() => setSelectedHolding(null)}
                holding={selectedHolding}
            />

            {/* Modals */}
            <AnimatePresence>
                {showCSVModal && (
                    <CSVUploadModalInline
                        isOpen={showCSVModal}
                        onClose={() => setShowCSVModal(false)}
                        onImport={(h, r) => importMutation.mutate({ holdings: h, replace: r })}
                        isLoading={importMutation.isPending}
                    />
                )}
                {/* Add Modal Placeholder */}
            </AnimatePresence>

            {/* 1. HERO HEADER */}
            <PortfolioHeader
                isLoading={isLoading}
                onRefresh={refetch}
                onImport={() => setShowCSVModal(true)}
                onAdd={() => setShowAddModal(true)}
            />

            {/* 2. MAIN DASHBOARD CONTENT */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-20 space-y-8">

                {/* A. Key Metrics Summary */}
                <PortfolioSummary
                    totalValue={portfolio.insights.total_value}
                    totalPnl={portfolio.insights.total_pnl}
                    totalPnlPercent={portfolio.insights.total_pnl_percent}
                    dailyPnl={portfolio.insights.daily_pnl}
                    dailyPnlPercent={portfolio.insights.daily_pnl_percent}
                    cashBalance={portfolio.cash_balance}
                    holdingsCount={portfolio.holdings.length}
                />

                {/* B. Advanced Visualization (Chart + Allocation) */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                    {/* Main History Chart (2/3 width) */}
                    <div className="xl:col-span-2">
                        <PortfolioChart history={history} />
                    </div>
                    {/* Sector Allocation (1/3 width) */}
                    <div>
                        <AllocationChart data={portfolio.insights.sector_allocation} />
                    </div>
                </div>

                {/* C. Assets Management Grid */}
                <div>
                    <AssetGrid
                        holdings={portfolio.holdings}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onSelect={setSelectedHolding}
                    />
                </div>
            </div>
        </div>
    );
}

// ===================================
// INLINE COMPONENTS (Safe Fallbacks)
// ===================================

import Papa from "papaparse";
import { FileSpreadsheet, X, Check } from "lucide-react";
import { useRef } from "react";

function CSVUploadModalInline({ isOpen, onClose, onImport, isLoading }: any) {
    const [parsedData, setParsedData] = useState<HoldingImport[]>([]);
    const [replaceExisting, setReplaceExisting] = useState(false);

    const handleFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const holdings: HoldingImport[] = [];
                results.data.forEach((row: any) => {
                    const rowLower: Record<string, string> = {};
                    Object.keys(row).forEach(k => rowLower[k.toLowerCase().trim()] = String(row[k]).trim());
                    const symbol = rowLower['symbol'] || rowLower['ticker'];
                    const quantity = rowLower['quantity'] || rowLower['qty'];
                    const price = rowLower['purchase_price'] || rowLower['price'];

                    if (symbol && quantity && price) {
                        holdings.push({
                            symbol: symbol.toUpperCase(),
                            quantity: parseInt(quantity),
                            purchase_price: parseFloat(price),
                            purchase_date: rowLower['purchase_date']
                        });
                    }
                });
                setParsedData(holdings);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#151925] p-8 rounded-3xl max-w-lg w-full border border-white/10 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-500" /> Import Portfolio
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
                </div>

                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-emerald-500/50 transition-colors bg-white/5 cursor-pointer relative">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                        <p className="font-bold text-white">Click to upload CSV</p>
                        <p className="text-sm text-slate-400">symbol, quantity, price, date</p>
                    </div>
                </div>

                {parsedData.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-emerald-400 font-bold flex items-center gap-2"><Check className="w-4 h-4" /> Found {parsedData.length} holdings</p>
                        <label className="flex items-center gap-2 mt-3 text-slate-300 text-sm cursor-pointer">
                            <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500" />
                            Replace existing portfolio
                        </label>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-slate-300 hover:bg-white/5 font-bold transition-all">Cancel</button>
                    <button
                        onClick={() => onImport(parsedData, replaceExisting)}
                        className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={parsedData.length === 0 || isLoading}
                    >
                        {isLoading ? "Importing..." : "Confirm Import"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

