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
        <div className="relative h-[320px] overflow-hidden rounded-b-[40px] shadow-2xl shadow-blue-900/20">
            {/* Base Background */}
            <div className="absolute inset-0 bg-[#0B1121] z-0" />

            {/* Animated Gradient Orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                    rotate: [0, 45, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-50%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/30 blur-[120px] z-0"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2],
                    x: [0, 50, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[100px] z-0"
            />

            {/* Noise Texture for Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />

            {/* Content Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                    {/* Title Section */}
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl ring-1 ring-white/20">
                                <Briefcase className="w-8 h-8" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight mb-1">My Portfolio</h1>
                            <p className="text-blue-200/80 font-medium text-lg">Welcome back, {firstName}</p>
                        </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 backdrop-blur-md active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
                        </button>

                        <button
                            onClick={onImport}
                            className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-2.5 border border-white/10 backdrop-blur-md transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Upload className="w-5 h-5" />
                            <span>Import CSV</span>
                        </button>

                        <button
                            onClick={onAdd}
                            className="px-6 py-3.5 rounded-2xl bg-white text-blue-950 font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-all shadow-lg shadow-white/10 active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 stroke-[3px]" />
                            <span>Add Holding</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
