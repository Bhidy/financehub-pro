"use client";

import { useState } from "react";
import { X, Plus, Calendar, DollarSign, Wallet, Hash, Search, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addHolding, PortfolioHolding } from "@/lib/api";
import clsx from "clsx";

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddHoldingModal({ isOpen, onClose }: AddHoldingModalProps) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<1 | 2>(1);

    // Form State
    const [symbol, setSymbol] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState("");

    const addMutation = useMutation({
        mutationFn: addHolding,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio-full"] });
            onClose();
            // Reset form
            setSymbol("");
            setQuantity("");
            setPrice("");
            setStep(1);
        },
        onError: (err) => {
            setError("Failed to add holding. Please check the symbol.");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!symbol || !quantity || !price) {
            setError("All fields are required.");
            return;
        }

        addMutation.mutate({
            symbol: symbol.toUpperCase(),
            quantity: Number(quantity),
            purchase_price: Number(price),
            purchase_date: date
        });
    };

    if (!isOpen) return null;

    const totalCost = (Number(quantity) || 0) * (Number(price) || 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                {/* Header Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />

                <div className="relative p-8 pb-0">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg">
                                <Plus className="w-6 h-6 stroke-[3]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">Add Position</h2>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Manual Entry</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6 relative z-10">
                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 border border-rose-500/20"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* SYMBOL */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-1">Asset Ticker</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="e.g. AAPL, CIB, TMGH"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    className="w-full bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-black text-lg p-4 pl-12 rounded-2xl border-2 border-slate-200 dark:border-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            {/* QUANTITY */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-1">Quantity</label>
                                <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-black text-lg p-4 pl-12 rounded-2xl border-2 border-slate-200 dark:border-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* PRICE */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-1">Unit Price</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-black text-lg p-4 pl-12 rounded-2xl border-2 border-slate-200 dark:border-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* DATE */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 pl-1">Exec Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-bold text-sm p-4 pl-12 rounded-2xl border-2 border-slate-200 dark:border-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* COST PREVIEW */}
                        <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-slate-200 dark:border-white/5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Investment</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                                {totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={addMutation.isPending}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {addMutation.isPending ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                            ) : (
                                <>Confirm Position <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>

                    </form>
                </div>
            </motion.div>
        </div>
    );
}
