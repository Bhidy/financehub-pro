"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchPortfolio,
    importPortfolio,
    addHolding,
    deleteHolding,
    FullPortfolio,
    PortfolioHolding,
    HoldingImport
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
    Briefcase,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    BarChart3,
    Target,
    Upload,
    Plus,
    X,
    FileSpreadsheet,
    AlertCircle,
    Check,
    Trash2,
    Loader2,
    Info,
    ChevronRight,
    Building2,
    Shield,
    Activity,
    TrendingUp as TrendUp,
    Eye,
    RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// CSV UPLOAD MODAL
// ============================================================================

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (holdings: HoldingImport[], replace: boolean) => void;
    isLoading: boolean;
}

function CSVUploadModal({ isOpen, onClose, onImport, isLoading }: CSVUploadModalProps) {
    const [parsedData, setParsedData] = useState<HoldingImport[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        setError(null);
        if (!file.name.match(/\.(csv|xlsx?)$/i)) {
            setError("Please upload a CSV or Excel file");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const holdings: HoldingImport[] = [];
                const errors: string[] = [];

                results.data.forEach((row: any, idx: number) => {
                    const rowLower: Record<string, string> = {};
                    Object.keys(row).forEach(k => {
                        rowLower[k.toLowerCase().trim()] = String(row[k]).trim();
                    });

                    const symbol = rowLower['symbol'] || rowLower['ticker'] || rowLower['stock'];
                    const quantity = rowLower['quantity'] || rowLower['qty'] || rowLower['shares'];
                    const price = rowLower['purchase_price'] || rowLower['price'] || rowLower['avg_price'] || rowLower['cost'];
                    const date = rowLower['purchase_date'] || rowLower['date'] || rowLower['buy_date'];

                    if (symbol && quantity && price) {
                        try {
                            holdings.push({
                                symbol: symbol.toUpperCase(),
                                quantity: parseInt(quantity),
                                purchase_price: parseFloat(price),
                                purchase_date: date || undefined
                            });
                        } catch (e) {
                            errors.push(`Row ${idx + 2}: Invalid data`);
                        }
                    }
                });

                if (holdings.length === 0) {
                    setError("No valid holdings found. Expected columns: symbol, quantity, purchase_price");
                } else {
                    setParsedData(holdings);
                    if (errors.length > 0) {
                        setError(`Parsed ${holdings.length} holdings. ${errors.length} rows skipped.`);
                    }
                }
            },
            error: (err) => {
                setError(`Parse error: ${err.message}`);
            }
        });
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleSubmit = () => {
        if (parsedData.length > 0) {
            onImport(parsedData, replaceExisting);
        }
    };

    const resetModal = () => {
        setParsedData([]);
        setError(null);
        setReplaceExisting(false);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { resetModal(); onClose(); }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-[#0F1629] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Import Portfolio</h2>
                            <p className="text-sm text-blue-100">Upload CSV with your holdings</p>
                        </div>
                    </div>
                    <button onClick={() => { resetModal(); onClose(); }} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Drop Zone */}
                    {parsedData.length === 0 && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={clsx(
                                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                                isDragging
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                    : "border-slate-300 dark:border-white/20 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                        >
                            <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                            <p className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
                                Drag & drop your CSV file
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                or click to browse
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                        </div>
                    )}

                    {/* Expected Format */}
                    {parsedData.length === 0 && (
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Expected CSV Format
                            </p>
                            <code className="text-xs text-slate-600 dark:text-slate-300 block font-mono">
                                symbol,quantity,purchase_price,purchase_date<br />
                                COMI,100,55.50,2024-01-15<br />
                                HRHO,250,12.30,2024-02-20
                            </code>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className={clsx(
                            "p-4 rounded-xl flex items-start gap-3",
                            parsedData.length > 0
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                        )}>
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedData.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-bold text-slate-700 dark:text-white">
                                    Preview ({parsedData.length} holdings)
                                </p>
                                <button
                                    onClick={resetModal}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Upload different file
                                </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/10">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Symbol</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {parsedData.slice(0, 5).map((h, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{h.symbol}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">{h.quantity}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">{h.purchase_price.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{h.purchase_date || '-'}</td>
                                            </tr>
                                        ))}
                                        {parsedData.length > 5 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-2 text-center text-slate-400 text-xs">
                                                    ... and {parsedData.length - 5} more
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Replace Option */}
                            <label className="flex items-center gap-3 mt-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={replaceExisting}
                                    onChange={(e) => setReplaceExisting(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                    Replace existing holdings (clear portfolio first)
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-white/5">
                    <button
                        onClick={() => { resetModal(); onClose(); }}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={parsedData.length === 0 || isLoading}
                        className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                        ) : (
                            <><Check className="w-4 h-4" /> Import {parsedData.length} Holdings</>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// ADD HOLDING MODAL
// ============================================================================

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (holding: { symbol: string; quantity: number; purchase_price: number; purchase_date?: string }) => void;
    isLoading: boolean;
}

function AddHoldingModal({ isOpen, onClose, onAdd, isLoading }: AddHoldingModalProps) {
    const [form, setForm] = useState({
        symbol: '',
        quantity: '',
        purchase_price: '',
        purchase_date: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.symbol || !form.quantity || !form.purchase_price) return;

        onAdd({
            symbol: form.symbol.toUpperCase(),
            quantity: parseInt(form.quantity),
            purchase_price: parseFloat(form.purchase_price),
            purchase_date: form.purchase_date || undefined
        });
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-[#0F1629] rounded-3xl shadow-2xl max-w-md w-full"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Holding</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Symbol *</label>
                        <input
                            type="text"
                            value={form.symbol}
                            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                            placeholder="e.g. COMI"
                            className="w-full p-4 border-2 border-slate-200 dark:border-white/10 rounded-xl text-lg font-mono font-bold uppercase placeholder-slate-300 dark:placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quantity *</label>
                            <input
                                type="number"
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                placeholder="100"
                                min="1"
                                className="w-full p-4 border-2 border-slate-200 dark:border-white/10 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Price *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.purchase_price}
                                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                                placeholder="55.00"
                                min="0.01"
                                className="w-full p-4 border-2 border-slate-200 dark:border-white/10 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Purchase Date</label>
                        <input
                            type="date"
                            value={form.purchase_date}
                            onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                            className="w-full p-4 border-2 border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !form.symbol || !form.quantity || !form.purchase_price}
                        className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Adding...</>
                        ) : (
                            <><Plus className="w-5 h-5" /> Add to Portfolio</>
                        )}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// ALLOCATION PIE CHART (Simple SVG)
// ============================================================================

function AllocationChart({ data }: { data: { sector: string; percent: number }[] }) {
    const colors = [
        '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex items-center gap-6">
            <svg viewBox="-1 -1 2 2" className="w-32 h-32 transform -rotate-90">
                {data.slice(0, 6).map((item, i) => {
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent / 100);
                    cumulativePercent += item.percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent / 100);
                    const largeArcFlag = item.percent > 50 ? 1 : 0;

                    return (
                        <path
                            key={i}
                            d={`M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`}
                            fill={colors[i % colors.length]}
                            className="transition-all hover:opacity-80"
                        />
                    );
                })}
            </svg>
            <div className="flex-1 space-y-2">
                {data.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{item.sector}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.percent.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN PORTFOLIO PAGE
// ============================================================================

export default function PortfolioPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();

    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // Fetch portfolio
    const { data: portfolio, isLoading, refetch } = useQuery({
        queryKey: ["portfolio-full"],
        queryFn: fetchPortfolio,
        refetchInterval: 10000,
        enabled: true
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: ({ holdings, replace }: { holdings: HoldingImport[], replace: boolean }) =>
            importPortfolio(holdings, replace),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            setShowCSVModal(false);
        }
    });

    // Add holding mutation
    const addMutation = useMutation({
        mutationFn: addHolding,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            setShowAddModal(false);
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteHolding,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            setDeleteConfirm(null);
        }
    });

    // Auth loading state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#0B1121] dark:via-[#0B1121] dark:to-[#0B1121] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-slate-500 font-medium">Loading...</span>
                </div>
            </div>
        );
    }

    // Not authenticated - show login prompt
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#0B1121] dark:via-[#0B1121] dark:to-[#0B1121] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <Briefcase className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Your Portfolio Awaits</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        Sign in to track your investments, import your holdings, and get powerful insights.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 transition-all"
                    >
                        Sign In to Continue
                    </button>
                </div>
            </div>
        );
    }

    // Loading portfolio data
    if (isLoading || !portfolio) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#0B1121] dark:via-[#0B1121] dark:to-[#0B1121] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-slate-500 font-medium">Loading Portfolio...</span>
                </div>
            </div>
        );
    }

    const { insights, holdings } = portfolio;
    const hasHoldings = holdings.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#0B1121] dark:via-[#0B1121] dark:to-[#0B1121] pb-12">
            {/* Modals */}
            <AnimatePresence>
                {showCSVModal && (
                    <CSVUploadModal
                        isOpen={showCSVModal}
                        onClose={() => setShowCSVModal(false)}
                        onImport={(h, r) => importMutation.mutate({ holdings: h, replace: r })}
                        isLoading={importMutation.isPending}
                    />
                )}
                {showAddModal && (
                    <AddHoldingModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onAdd={(h) => addMutation.mutate(h)}
                        isLoading={addMutation.isPending}
                    />
                )}
            </AnimatePresence>

            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="max-w-[1800px] mx-auto px-6 py-8 relative">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">My Portfolio</h1>
                                <p className="text-blue-100 font-medium">Welcome back, {user?.full_name?.split(' ')[0] || 'Investor'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => refetch()}
                                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowCSVModal(true)}
                                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold flex items-center gap-2 transition-colors"
                            >
                                <Upload className="w-5 h-5" />
                                Import CSV
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-5 py-3 rounded-xl bg-white font-bold text-indigo-600 flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
                            >
                                <Plus className="w-5 h-5" />
                                Add Holding
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Hero Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 mb-8">
                    {[
                        {
                            label: "Total Value",
                            value: `SAR ${insights.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            icon: Wallet,
                            color: "blue",
                            subtext: `${holdings.length} holdings`
                        },
                        {
                            label: "Total P&L",
                            value: insights.total_pnl >= 0
                                ? `+SAR ${insights.total_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                : `-SAR ${Math.abs(insights.total_pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            icon: insights.total_pnl >= 0 ? TrendingUp : TrendingDown,
                            color: insights.total_pnl >= 0 ? "green" : "red",
                            subtext: `${insights.total_pnl_percent >= 0 ? '+' : ''}${insights.total_pnl_percent.toFixed(2)}%`
                        },
                        {
                            label: "Today's Change",
                            value: insights.daily_pnl >= 0
                                ? `+SAR ${insights.daily_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                : `-SAR ${Math.abs(insights.daily_pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            icon: Activity,
                            color: insights.daily_pnl >= 0 ? "emerald" : "rose",
                            subtext: `${insights.daily_pnl_percent >= 0 ? '+' : ''}${insights.daily_pnl_percent.toFixed(2)}%`
                        },
                        {
                            label: "Cash Balance",
                            value: `SAR ${portfolio.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            icon: DollarSign,
                            color: "violet",
                            subtext: "Available"
                        },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    stat.color === "blue" && "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
                                    stat.color === "green" && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                    stat.color === "red" && "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                                    stat.color === "emerald" && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                    stat.color === "rose" && "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
                                    stat.color === "violet" && "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
                                )}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.subtext}</div>
                        </div>
                    ))}
                </div>

                {/* Insights Row */}
                {hasHoldings && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Sector Allocation */}
                        <div className="bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="font-bold text-slate-800 dark:text-white">Sector Allocation</h3>
                            </div>
                            {insights.sector_allocation.length > 0 ? (
                                <AllocationChart data={insights.sector_allocation} />
                            ) : (
                                <p className="text-slate-400 text-sm">No sector data available</p>
                            )}
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="font-bold text-slate-800 dark:text-white">Top Performers</h3>
                            </div>
                            <div className="space-y-4">
                                {insights.top_gainer && (
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                                                {insights.top_gainer.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{insights.top_gainer.symbol}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">Best performer</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <ArrowUpRight className="w-4 h-4" />
                                                +{Number(insights.top_gainer.pnl_percent).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {insights.top_loser && (
                                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold text-sm">
                                                {insights.top_loser.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{insights.top_loser.symbol}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">Needs attention</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <ArrowDownRight className="w-4 h-4" />
                                                {Number(insights.top_loser.pnl_percent).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Risk Analysis */}
                        <div className="bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                <h3 className="font-bold text-slate-800 dark:text-white">Portfolio Health</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Concentration Risk</span>
                                        <span className={clsx(
                                            "text-sm font-bold",
                                            insights.concentration_risk > 70 ? "text-red-600" : insights.concentration_risk > 50 ? "text-amber-600" : "text-emerald-600"
                                        )}>
                                            {insights.concentration_risk.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={clsx(
                                                "h-full rounded-full transition-all",
                                                insights.concentration_risk > 70 ? "bg-red-500" : insights.concentration_risk > 50 ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${Math.min(insights.concentration_risk, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Top 3 holdings as % of portfolio</p>
                                </div>
                                <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Diversification</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {insights.sector_allocation.length} sectors
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Holdings Table */}
                <div className="bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-slate-50 to-white dark:from-[#1A1F2E] dark:to-[#151925] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-bold text-slate-800 dark:text-white">Holdings</h3>
                        </div>
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            {holdings.length} Positions
                        </span>
                    </div>

                    {hasHoldings ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Price</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">P&L</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {holdings.map((h: PortfolioHolding) => (
                                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <Link href={`/symbol/${h.symbol}`} className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white",
                                                        Number(h.pnl_percent) >= 0
                                                            ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                            : "bg-gradient-to-br from-red-400 to-rose-500"
                                                    )}>
                                                        {h.symbol.slice(0, 2)}
                                                    </span>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{h.symbol}</span>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[150px]">{h.company_name || h.sector || ''}</p>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{h.quantity}</td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500 dark:text-slate-400">{Number(h.average_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">{Number(h.current_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{Number(h.current_value).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1 font-bold",
                                                    Number(h.pnl_percent) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {Number(h.pnl_percent) >= 0
                                                        ? <ArrowUpRight className="w-4 h-4" />
                                                        : <ArrowDownRight className="w-4 h-4" />
                                                    }
                                                    {Number(h.pnl_percent).toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={clsx(
                                                    "text-sm font-medium",
                                                    Number(h.daily_change_percent) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {Number(h.daily_change_percent) >= 0 ? '+' : ''}{Number(h.daily_change_percent).toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {deleteConfirm === h.id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => deleteMutation.mutate(h.id)}
                                                            disabled={deleteMutation.isPending}
                                                            className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(h.id)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <Briefcase className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No Holdings Yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                                Start building your portfolio by importing a CSV file or adding holdings manually.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setShowCSVModal(true)}
                                    className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-slate-700 dark:text-white flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    <Upload className="w-5 h-5" />
                                    Import CSV
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-lg shadow-blue-500/25"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Holding
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
