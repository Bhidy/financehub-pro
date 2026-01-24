/**
 * ============================================================================
 * DESKTOP SIDEBAR - ULTRA-PREMIUM CHAT NAVIGATION
 * ============================================================================
 * 
 * ChatGPT-style sidebar for desktop chatbot experience.
 * Features: New Chat button, Chat History, User profile.
 * 
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    History,
    MessageSquare,
    BarChart3,
    Sun,
    Moon,
    Settings,
    LogOut,
    ChevronLeft,
    Search
} from "lucide-react";
import { clsx } from "clsx";

interface DesktopSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onNewChat: () => void;
    onOpenHistory: () => void;
    isAuthenticated: boolean;
    userName?: string;
    userInitial?: string;
    theme: "light" | "dark";
    onToggleTheme: () => void;
    onLogin: () => void;
    onSettings: () => void;
}

export function DesktopSidebar({
    isOpen,
    onToggle,
    onNewChat,
    onOpenHistory,
    isAuthenticated,
    userName,
    userInitial,
    theme,
    onToggleTheme,
    onLogin,
    onSettings
}: DesktopSidebarProps) {

    return (
        <AnimatePresence mode="wait">
            {isOpen ? (
                <motion.aside
                    key="sidebar-open"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="flex-shrink-0 h-full bg-slate-50 dark:bg-[#0F1419] border-r border-slate-200 dark:border-white/5 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 p-3 space-y-3">
                        {/* Brand + Collapse */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <BarChart3 className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white text-sm">Starta AI</span>
                            </div>
                            <button
                                onClick={onToggle}
                                className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>

                        {/* New Chat Button */}
                        <button
                            onClick={onNewChat}
                            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {/* History Button */}
                        <button
                            onClick={onOpenHistory}
                            className="w-full p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    <History className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Chat History</p>
                                    <p className="text-xs text-slate-400">View past conversations</p>
                                </div>
                            </div>
                        </button>

                        {/* Quick Suggestions */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Quick Start</p>
                            {[
                                { label: "Fair Value Analysis", query: "What is the fair value of SWDY?" },
                                { label: "Top Gainers", query: "Show me top gainers today" },
                                { label: "Dividend Stocks", query: "Stocks with highest dividends" },
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { }}
                                    className="w-full p-2.5 rounded-lg hover:bg-white dark:hover:bg-white/5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate"
                                >
                                    <MessageSquare className="w-3 h-3 inline mr-2 opacity-50" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={onToggleTheme}
                            className="w-full p-2.5 rounded-lg hover:bg-white dark:hover:bg-white/5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-2"
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>

                        {/* User */}
                        {isAuthenticated ? (
                            <button
                                onClick={onSettings}
                                className="w-full p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-2 hover:border-emerald-500/30 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                                    {userInitial || "U"}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                                    {userName || "User"}
                                </span>
                                <Settings className="w-4 h-4 text-slate-400" />
                            </button>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="w-full p-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm text-center transition-all hover:opacity-90"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </motion.aside>
            ) : (
                /* Collapsed Sidebar */
                <motion.div
                    key="sidebar-collapsed"
                    initial={{ width: 0 }}
                    animate={{ width: 64 }}
                    exit={{ width: 0 }}
                    className="flex-shrink-0 h-full bg-slate-50 dark:bg-[#0F1419] border-r border-slate-200 dark:border-white/5 flex flex-col items-center py-3 gap-2"
                >
                    <button
                        onClick={onToggle}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-500/30 transition-all"
                    >
                        <BarChart3 className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onNewChat}
                        className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onOpenHistory}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-all"
                    >
                        <History className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={onToggleTheme}
                        className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-white/5 flex items-center justify-center text-slate-400 transition-all"
                    >
                        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {isAuthenticated ? (
                        <button
                            onClick={onSettings}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold"
                        >
                            {userInitial || "U"}
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center"
                        >
                            <LogOut className="w-4 h-4 text-white dark:text-slate-900" />
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
