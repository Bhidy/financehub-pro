"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPortfolio, importPortfolio, deleteHolding, fetchPortfolioHistory, HoldingImport, PortfolioHolding } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileSpreadsheet, X, Check, Search, Upload } from "lucide-react";
import Papa from "papaparse";

// Core Components
import { PortfolioHeader } from "@/components/PortfolioHeader";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { PortfolioChart } from "@/components/PortfolioChart";
import { AssetGrid } from "@/components/AssetGrid";
import { HoldingDrawer } from "@/components/HoldingDrawer";
import { SkeletonAssetCard, SkeletonInsightCard } from "@/components/PortfolioSkeletons";
import { AddHoldingModal } from "@/components/AddHoldingModal";

// Advanced Analytics (Ultra Premium)
import { PortfolioHealth, RiskRadar } from "@/components/analytics/PortfolioInsightCards";
import { DividendForecast, TopMoversList, PerformanceHeatmap } from "@/components/analytics/MarketWidgets";
import { GainsReporting } from "@/components/analytics/GainsReporting";
import { DecisionQuality } from "@/components/analytics/DecisionQuality";
import { DiversityCard } from "@/components/analytics/DiversityAnalysis";
import { ChevronDown, Wallet } from "lucide-react";

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
        refetchInterval: 30000,
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

    // PRE-LOADING STATE (SKELETONS)
    if (authLoading || (!portfolio && isLoading)) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] p-6 space-y-8 overflow-hidden transition-colors duration-500">
                <div className="h-[320px] bg-white dark:bg-[#151925] rounded-[40px] animate-pulse shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-900/5 dark:via-white/5 to-transparent z-10" />
                </div>
                <div className="max-w-[1900px] mx-auto px-6 -mt-32 space-y-8 relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <SkeletonInsightCard key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!portfolio) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] pb-20 font-sans selection:bg-brand-accent/30 transition-colors duration-500 overflow-x-hidden">
            {/* Slide-Over Drawer */}
            <HoldingDrawer
                isOpen={!!selectedHolding}
                onClose={() => setSelectedHolding(null)}
                holding={selectedHolding}
            />

            {/* MODALS */}
            <AnimatePresence>
                {showCSVModal && (
                    <CSVUploadModalInline
                        isOpen={showCSVModal}
                        onClose={() => setShowCSVModal(false)}
                        onImport={(h: HoldingImport[], r: boolean) => importMutation.mutate({ holdings: h, replace: r })}
                        isLoading={importMutation.isPending}
                    />
                )}
                {showAddModal && (
                    <AddHoldingModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* 1. HERO HEADER */}
            <PortfolioHeader
                isLoading={isLoading}
                onRefresh={refetch}
                onImport={() => setShowCSVModal(true)}
                onAdd={() => setShowAddModal(true)}
            />

            {/* 2. ELITE DASHBOARD LAYOUT - HIGH DENSITY MODE */}
            <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 relative z-20 -mt-6">

                {/* A. Summary Strip */}
                <PortfolioSummary
                    totalValue={portfolio.insights.total_value}
                    totalPnl={portfolio.insights.total_pnl}
                    totalPnlPercent={portfolio.insights.total_pnl_percent}
                    dailyPnl={portfolio.insights.daily_pnl}
                    dailyPnlPercent={portfolio.insights.daily_pnl_percent}
                    cashBalance={portfolio.cash_balance}
                    holdingsCount={portfolio.holdings.length}
                />

                {/* Multi-Portfolio Selector (Mock UI) */}
                <div className="flex justify-end -mt-4 mb-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#151925] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <Wallet className="w-4 h-4" />
                        <span>Main Portfolio</span>
                        <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                </div>

                {/* B. Gains Reporting (New - Mandatory) */}
                <GainsReporting
                    holdings={portfolio.holdings}
                    totalUnrealizedGain={portfolio.insights.total_pnl}
                    totalRealizedGain={0} // Placeholder until backend provides it
                />

                {/* C. Performance & Asset Worth (Expanded) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Asset Worth Over Time (8 cols) */}
                    <div className="xl:col-span-8">
                        <PortfolioChart history={history} />
                    </div>

                    {/* Decisions Quality (4 cols) */}
                    <div className="xl:col-span-4 h-[420px]">
                        <DecisionQuality history={history} />
                    </div>
                </div>

                {/* D. Diversity & Risk Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-auto md:h-[380px]">
                    <DiversityCard data={portfolio.insights.sector_allocation.map(s => ({ name: s.sector, value: s.value, percent: s.percent }))} type="Sector" />
                    <DiversityCard data={[
                        { name: 'Stocks', value: portfolio.market_value, percent: (portfolio.market_value / portfolio.total_equity) * 100 },
                        { name: 'Cash', value: portfolio.cash_balance, percent: (portfolio.cash_balance / portfolio.total_equity) * 100 }
                    ]} type="Asset Class" />
                    <RiskRadar />
                </div>

                {/* E. Operational Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <PortfolioHealth
                        score={88} // In real app, calculate from risk metrics
                        beta={1.05} // In real app, weighted average beta of holdings
                        diversityScore={portfolio.insights.sector_allocation.length * 15}
                    />
                    <DividendForecast holdings={portfolio.holdings} />
                    <PerformanceHeatmap history={history} />
                    <TopMoversList holdings={portfolio.holdings} />
                </div>

                {/* C. The Asset Universe (Full Width) */}
                <div className="pt-8 border-t border-slate-200 dark:border-white/5">
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
// INLINE COMPONENTS (CSV Import)
// ===================================
function CSVUploadModalInline({ isOpen, onClose, onImport, isLoading }: any) {
    const [parsedData, setParsedData] = useState<HoldingImport[]>([]);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleFile = (file: File) => {
        setParseError(null);

        // Log for debugging
        console.log("Processing file:", file.name, file.type, file.size);

        if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
            setParseError("Invalid format. Please upload a .CSV file.");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const holdings: HoldingImport[] = [];
                console.log("Parsed rows:", results.data.length);

                if (results.data.length === 0) {
                    setParseError("File is empty or invalid structure.");
                    return;
                }

                results.data.forEach((row: any, index) => {
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
                    } else {
                        console.warn(`Row ${index} missing required fields:`, rowLower);
                    }
                });

                if (holdings.length === 0) {
                    setParseError("No valid holdings found. Check column headers.");
                } else {
                    setParsedData(holdings);
                }
            },
            error: (err) => {
                console.error("Papa parse error:", err);
                setParseError("Failed to parse CSV file.");
            }
        });
    };

    // Explicit Drag Handlers
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#151925] p-8 rounded-[2.5rem] max-w-lg w-full border border-slate-200 dark:border-white/10 shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">Import Data</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Bulk CSV Upload</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"><X className="text-slate-500" /></button>
                </div>

                {/* DROP ZONE */}
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer relative group ${isDragging
                        ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
                        : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                        }`}
                >
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="space-y-3 relative z-10 pointer-events-none">
                        <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className={`w-8 h-8 transition-colors ${isDragging ? "text-emerald-600" : "text-emerald-500"}`} />
                        </div>
                        <p className="font-black text-slate-900 dark:text-white text-lg">
                            {isDragging ? "Drop it here!" : "Drop CSV File"}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            symbol, quantity, price, date
                        </p>
                    </div>
                </div>

                {/* Download Template Button (Outside Drop Zone) */}
                <div className="flex justify-center mt-4">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            const csvContent = "symbol,quantity,purchase_price,purchase_date\nCIB,100,75.50,2024-01-15\nTMGH,50,44.10,2023-11-20";
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", "financehub_portfolio_template.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Download Template
                    </button>
                </div>

                {/* ERROR MESSAGE */}
                {parseError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold text-center"
                    >
                        ⚠️ {parseError}
                    </motion.div>
                )}

                {/* SUCCESS STATE */}
                {parsedData.length > 0 && !parseError && (
                    <div className="mt-6 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2"><Check className="w-4 h-4" /> Ready to import {parsedData.length} items</p>
                        <label className="flex items-center gap-2 text-slate-500 dark:text-slate-300 text-xs font-bold cursor-pointer select-none">
                            <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-black/20 text-emerald-500 focus:ring-emerald-500" />
                            Overwrite All
                        </label>
                    </div>
                )}

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                    <button
                        onClick={() => onImport(parsedData, replaceExisting)}
                        className="flex-[2] py-4 rounded-2xl bg-slate-900 dark:bg-emerald-600 hover:scale-[1.02] active:scale-95 text-white font-black uppercase text-xs tracking-widest transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={parsedData.length === 0 || isLoading}
                    >
                        {isLoading ? "Processing..." : "Run Import"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
