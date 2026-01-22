"use client";

import { motion } from "framer-motion";
import { Briefcase, RefreshCw, Upload, Plus } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";

interface PortfolioHeaderProps {
    isLoading: boolean;
    onRefresh: () => void;
    onImport: () => void;
    onAdd: () => void;
}

export function PortfolioHeader({ isLoading, onRefresh, onImport, onAdd }: PortfolioHeaderProps) {
    const { user } = useAuth();
    const firstName = user?.full_name?.split(' ')[0] || "Trader";

    return (
        <div className="relative h-[220px] overflow-hidden rounded-b-[40px] shadow-2xl shadow-blue-900/10 dark:shadow-black/40 transition-all duration-500">
            {/* Dynamic Surface Background */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-[#0B1121] z-0 transition-colors duration-500" />

            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            {/* Ambient Accent Glows (Refined) */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[120%] bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] rounded-full z-0 animate-pulse" />
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[120%] bg-teal-500/5 dark:bg-teal-600/10 blur-[100px] rounded-full z-0 animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Main Header Content */}
            <div className="relative z-10 max-w-[1700px] mx-auto px-6 pt-10 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">

                    {/* Brand/Identity Section */}
                    <div className="flex items-center gap-6 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-accent/20 dark:bg-brand-accent/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative w-16 h-16 rounded-3xl bg-white dark:bg-[#151925] flex items-center justify-center text-brand-accent shadow-xl border border-slate-100 dark:border-white/10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                                <Briefcase className="w-8 h-8 stroke-[1.5]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                    My Portfolio
                                </h1>
                                <span className="px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest border border-brand-accent/20">
                                    Live
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">
                                Welcome, <span className="text-slate-900 dark:text-white">{firstName}</span>. Your assets at a glance.
                            </p>
                        </div>
                    </div>

                    {/* Elite Action Bar */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Tooltip content="Sync Data">
                            <button
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="p-4 rounded-2xl bg-white dark:bg-[#151925] hover:bg-slate-50 dark:hover:bg-[#1e2536] text-slate-600 dark:text-slate-300 transition-all border border-slate-200 dark:border-white/10 shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
                            </button>
                        </Tooltip>

                        <button
                            onClick={onImport}
                            className="px-6 py-4 rounded-2xl bg-white dark:bg-[#151925] hover:bg-slate-50 dark:hover:bg-[#1e2536] text-slate-900 dark:text-white font-black flex items-center gap-3 border border-slate-200 dark:border-white/10 shadow-lg transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Upload className="w-5 h-5" />
                            <span>Import List</span>
                        </button>

                        <button
                            onClick={onAdd}
                            className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black flex items-center gap-3 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/10 active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 stroke-[4px]" />
                            <span>Add Asset</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper: Simple Local Tooltip to avoid external dependency issues if not present
function Tooltip({ children, content }: { children: React.ReactNode, content: string }) {
    return (
        <div className="relative group/tip">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-300 whitespace-nowrap pointer-events-none shadow-xl z-50 border border-white/5">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-slate-800" />
            </div>
        </div>
    );
}
