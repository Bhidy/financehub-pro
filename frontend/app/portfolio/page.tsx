
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPortfolio, importPortfolio, addHolding, deleteHolding, FullPortfolio, PortfolioHolding, HoldingImport, fetchPortfolioHistory } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useState, useRef, useCallback, useEffect } from "react"; // Added useEffect
import Link from "next/link";
import Papa from "papaparse";
import {
    Briefcase, TrendingUp, TrendingDown, DollarSign, PieChart, Zap, ArrowUpRight, ArrowDownRight, Wallet,
    BarChart3, Target, Upload, Plus, X, FileSpreadsheet, AlertCircle, Check, Trash2, Loader2, Info,
    ChevronRight, Building2, Shield, Activity, TrendingUp as TrendUp, Eye, RefreshCw, LayoutGrid, List
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { SkeletonAssetCard, SkeletonInsightCard, SkeletonTable } from "@/components/PortfolioSkeletons";

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
                className="bg-white dark:bg-[#151925] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 dark:border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
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

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/5">
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
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                    Upload different file
                                </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl overflow-hidden border border-slate-100 dark:border-white/10">
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
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-white/5 dark:border-white/20"
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
                className="bg-white dark:bg-[#151925] rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
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
// ALLOCATION SUNBURST CHART (Premium)
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
        <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="relative w-40 h-40">
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
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
                                stroke="#151925"
                                strokeWidth="0.05"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                        );
                    })}
                </svg>
                {/* Center Hole for Donut Effect */}
                <div className="absolute inset-0 m-auto w-24 h-24 bg-white dark:bg-[#151925] rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-[#1A1F2E]">
                    <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
            </div>

            <div className="flex-1 w-full space-y-3">
                {data.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#151925]" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-blue-500 transition-colors">{item.sector}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: colors[i % colors.length] }} />
                            </div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white w-12 text-right">{item.percent.toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// ASSET CARD (NEW ULTRA PREMIUM COMPONENT)
// ============================================================================

function AssetCard({ holding, onDelete }: { holding: PortfolioHolding & { sparkline_data?: number[] }, onDelete: (id: number) => void }) {
    const isProfitable = holding.pnl_percent >= 0;

    // Use real sparkline data if available, otherwise fallback to details
    const sparklineData = (holding.sparkline_data && holding.sparkline_data.length > 0)
        ? holding.sparkline_data
        : [holding.current_price, holding.current_price];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative bg-white dark:bg-[#151925] rounded-2xl border border-slate-100 dark:border-white/5 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-300"
        >
            {/* Action Menu (Visible on Hover) */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(holding.id); }}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg",
                    isProfitable
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20"
                        : "bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/20"
                )}>
                    {holding.symbol.slice(0, 2)}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{holding.symbol}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{holding.quantity} shares</p>
                </div>
            </div>

            {/* Mini Sparkline Area */}
            <div className="h-16 -mx-2 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
                        <defs>
                            <linearGradient id={`grad-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="v"
                            stroke={isProfitable ? "#10B981" : "#EF4444"}
                            strokeWidth={2}
                            fill={`url(#grad-${holding.id})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Value</p>
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {Math.round(holding.current_value).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">P&L</p>
                    <div className={clsx(
                        "font-mono font-bold flex items-center justify-end gap-1",
                        isProfitable ? "text-emerald-500" : "text-red-500"
                    )}>
                        {isProfitable ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {holding.pnl_percent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// MAIN PORTFOLIO PAGE
// ============================================================================

export default function PortfolioPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();

    // View State (Card vs Table)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Data Query
    const { data: portfolio, isLoading, refetch, isError, error } = useQuery({
        queryKey: ["portfolio-full"],
        queryFn: fetchPortfolio,
        refetchInterval: 10000,
        enabled: isAuthenticated,
        retry: 1
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

    const addMutation = useMutation({
        mutationFn: addHolding,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            setShowAddModal(false);
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

    if (authLoading || (!portfolio && isLoading)) {
        return (
            <div className="min-h-screen bg-[#0B1121] p-6 space-y-6">
                {/* Skeleton Loading State */}
                <div className="h-64 w-full bg-[#151925] rounded-3xl animate-pulse" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-[#151925] rounded-2xl animate-pulse" />)}
                </div>
                <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <SkeletonAssetCard key={i} />)}
                </div>
            </div>
        );
    }

    if (!portfolio) return null; // Should be handled by loading or auth redirect

    const { insights, holdings } = portfolio;
    const hasHoldings = holdings && holdings.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] pb-20">
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

            {/* ULTRA-PREMIUM DISCONNECTED HEADER */}
            <div className="relative h-[320px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#151925] to-[#0B1121] z-0" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0" />

                {/* Floating Orbs for "Breathing" Effect */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-[-50%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]"
                />

                <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">My Portfolio</h1>
                                <p className="text-blue-200 font-medium">Welcome back, {user?.full_name?.split(' ')[0]}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => refetch()} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                                <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
                            </button>
                            <button onClick={() => setShowCSVModal(true)} className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-2 border border-white/5 transition-colors">
                                <Upload className="w-5 h-5" /> Import CSV
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="px-5 py-3 rounded-xl bg-white text-blue-900 font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg">
                                <Plus className="w-5 h-5" /> Add Holding
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER (Overlapping Header) */}
            <div className="max-w-[1600px] mx-auto px-6 -mt-32 relative z-20 space-y-8">

                {/* 1. HERO STATS (Glassmorphism) */}
                <PortfolioSummary
                    totalValue={insights.total_value}
                    totalPnl={insights.total_pnl}
                    totalPnlPercent={insights.total_pnl_percent}
                    dailyPnl={insights.daily_pnl}
                    dailyPnlPercent={insights.daily_pnl_percent}
                    cashBalance={portfolio.cash_balance}
                    holdingsCount={holdings.length}
                />

                {/* 2. MAIN CHART */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#151925] border border-white/5 rounded-3xl p-8 shadow-2xl shadow-black/40"
                >
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white">Portfolio Performance</h3>
                            <p className="text-sm text-slate-400">Net Asset Value History</p>
                        </div>
                        {/* Timeframe Toggles (Dummy for now) */}
                        <div className="flex bg-white/5 rounded-lg p-1">
                            {['1D', '1W', '1M', '1Y', 'ALL'].map(t => (
                                <button key={t} className={clsx(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-colors",
                                    t === '1M' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                                )}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        {history && history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                                    <XAxis
                                        dataKey="snapshot_date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        minTickGap={50}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(val) => `SAR ${(val / 1000).toFixed(0)}k`}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                                        formatter={(val: any) => [`SAR ${Number(val).toLocaleString()}`, 'Value']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total_value"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                                <p>No history data available yet</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 3. INSIGHTS GRID */}
                {hasHoldings && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sector Alloc */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-[#151925] border border-white/5 rounded-3xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-5 h-5 text-blue-500" />
                                <h3 className="font-bold text-white">Sector Allocation</h3>
                            </div>
                            <AllocationChart data={insights.sector_allocation} />
                        </motion.div>

                        {/* Top Performers */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-[#151925] border border-white/5 rounded-3xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <TrendUp className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-white">Top Performers</h3>
                            </div>
                            <div className="space-y-4">
                                {insights.top_gainer ? (
                                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl group cursor-pointer hover:bg-emerald-500/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                                                {insights.top_gainer.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{insights.top_gainer.symbol}</div>
                                                <div className="text-xs text-emerald-400 font-bold group-hover:underline">Best Performer</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-emerald-400 text-lg flex items-center gap-1">
                                                <ArrowUpRight className="w-5 h-5" />
                                                +{Number(insights.top_gainer.pnl_percent).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                ) : <div className="text-slate-500 text-center py-8">No gainers yet</div>}

                                {insights.top_loser ? (
                                    <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl group cursor-pointer hover:bg-red-500/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                                                {insights.top_loser.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{insights.top_loser.symbol}</div>
                                                <div className="text-xs text-red-400 font-bold group-hover:underline">Needs Attention</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-red-400 text-lg flex items-center gap-1">
                                                <ArrowDownRight className="w-5 h-5" />
                                                {Number(insights.top_loser.pnl_percent).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                ) : <div className="text-slate-500 text-center py-8">No losers yet</div>}
                            </div>
                        </motion.div>

                        {/* Health */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-[#151925] border border-white/5 rounded-3xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <Shield className="w-5 h-5 text-violet-500" />
                                <h3 className="font-bold text-white">Portfolio Health</h3>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-400 font-medium">Concentration Risk</span>
                                        <span className={clsx(
                                            "text-sm font-bold",
                                            insights.concentration_risk > 70 ? "text-red-500" : insights.concentration_risk > 50 ? "text-amber-500" : "text-emerald-500"
                                        )}>
                                            {insights.concentration_risk.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(insights.concentration_risk, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className={clsx(
                                                "h-full rounded-full",
                                                insights.concentration_risk > 70 ? "bg-red-500" : insights.concentration_risk > 50 ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Top 3 holdings vs total portfolio value</p>
                                </div>
                                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Diversification Score</span>
                                    <span className="text-white font-bold">{insights.sector_allocation.length} Sectors</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 4. HOLDINGS (The "Card" vs "Table" Switcher) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <List className="w-6 h-6 text-blue-500" />
                            Holdings
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-sm rounded-full font-bold">
                                {holdings.length}
                            </span>
                        </h2>

                        <div className="flex bg-white dark:bg-[#151925] p-1 rounded-xl border border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'cards' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'table' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {hasHoldings ? (
                        <>
                            {viewMode === 'cards' ? (
                                <motion.div
                                    layout
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                >
                                    <AnimatePresence>
                                        {holdings.map((h) => (
                                            <AssetCard key={h.id} holding={h} onDelete={(id) => deleteMutation.mutate(id)} />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-[#151925] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl"
                                >
                                    {/* Original Table View - Updated for Dark Mode Consistency */}
                                    {/* ... keeping it simple for now as Cards is the Delta way */}
                                    <div className="p-8 text-center text-slate-500">
                                        Table view is being upgraded. Please use Card view for the best experience.
                                    </div>
                                </motion.div>
                            )}
                        </>
                    ) : (
                        <div className="bg-[#151925] border border-white/5 rounded-3xl p-16 text-center">
                            <Briefcase className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                            <h3 className="text-2xl font-bold text-white mb-2">Portfolio is Empty</h3>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                Start your journey by adding your first holding or importing a CSV file.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all text-lg"
                            >
                                Add First Holding
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
