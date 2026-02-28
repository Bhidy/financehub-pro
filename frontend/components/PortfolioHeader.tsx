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
        <div className="relative overflow-hidden bg-white dark:bg-[#1A222C] border-b border-slate-200 dark:border-[#2E3A47] z-40 transition-all duration-500">
            

            {/* Main Header Content */}
            <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">

                    {/* Brand/Identity Section */}
                    <div className="flex items-center gap-6 group">
                        <div className="relative">
                            <div className="relative w-16 h-16 rounded-md bg-[#F1F5F9] dark:bg-[#24303F] flex items-center justify-center text-[#3C50E0] border border-slate-200 dark:border-[#2E3A47]">
                                <Briefcase className="w-8 h-8 stroke-[1.5]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    My Portfolio
                                </h1>
                                <span className="px-2.5 py-1 rounded-md bg-[#3C50E0]/10 text-[#3C50E0] text-xs font-bold border border-[#3C50E0]/20">
                                    Live
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
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
                                className="p-2.5 rounded-md bg-white dark:bg-[#24303F] hover:bg-slate-50 dark:hover:bg-[#1A222C] text-slate-700 dark:text-white transition-all border border-slate-200 dark:border-[#2E3A47] shadow-sm disabled:opacity-50"
                            >
                                <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
                            </button>
                        </Tooltip>

                        <button
                            onClick={onImport}
                            className="px-4 py-2 rounded-md bg-white dark:bg-[#24303F] hover:bg-slate-50 dark:hover:bg-[#1A222C] text-slate-700 dark:text-white font-medium flex items-center gap-2 border border-slate-200 dark:border-[#2E3A47] shadow-sm whitespace-nowrap"
                        >
                            <Upload className="w-5 h-5" />
                            <span>Import List</span>
                        </button>

                        <button
                            onClick={onAdd}
                            className="px-4 py-2 rounded-md bg-[#3C50E0] text-white font-medium flex items-center gap-2 hover:bg-[#3C50E0]/90 transition-all shadow-sm whitespace-nowrap"
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
