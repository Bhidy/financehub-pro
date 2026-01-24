/**
 * ============================================================================
 * DESKTOP SIDEBAR - ULTRA-PREMIUM CHAT NAVIGATION
 * ============================================================================
 * 
 * ChatGPT-style sidebar for desktop chatbot experience.
 * Features:
 * - Direct embedded Chat History (Grouped by Today, Yesterday, etc.)
 * - Real-time session management
 * - Ultra-premium aesthetics
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    MessageSquare,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    Loader2,
    TrendingUp,
    PanelLeftClose,
    PanelLeftOpen
} from "lucide-react";
import { clsx } from "clsx";
import { fetchChatHistory } from "@/lib/api";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { useRouter } from "next/navigation";

// Define Session Interface (matching API)
interface Session {
    session_id: string;
    title: string;
    updated_at: string;
    last_market?: string;
}

interface DesktopSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onNewChat: () => void;
    onSelectSession: (sessionId: string) => void;
    currentSessionId: string | null;
    isAuthenticated: boolean;
    user?: any;
    onLogin: () => void;
    onSettings: () => void;
    onLogout: () => void;
}

export const DesktopSidebar = memo(function DesktopSidebar({
    isOpen,
    onToggle,
    onNewChat,
    onSelectSession,
    currentSessionId,
    isAuthenticated,
    user,
    onLogin,
    onSettings,
    onLogout
}: DesktopSidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load history when authenticated
    useEffect(() => {
        let isMounted = true;
        const loadHistory = async () => {
            // Quiet background load if we already have sessions
            if (sessions.length === 0) setIsLoading(true);
            try {
                const data = await fetchChatHistory();
                if (isMounted) setSessions(data || []);
            } catch (error) {
                console.error("Failed to load history:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            loadHistory();
        } else {
            setSessions([]);
        }

        return () => { isMounted = false; };
    }, [isAuthenticated]);

    // Group sessions by date
    const groupedSessions = sessions.reduce((groups, session) => {
        try {
            if (!session.updated_at) return groups;
            const date = new Date(session.updated_at);
            if (isNaN(date.getTime())) return groups; // Skip invalid dates

            let key = "Earlier";
            if (isToday(date)) key = "Today";
            else if (isYesterday(date)) key = "Yesterday";
            else if (isThisWeek(date)) key = "This Week";
            else key = format(date, "MMMM yyyy");

            if (!groups[key]) groups[key] = [];
            groups[key].push(session);
        } catch (e) {
            console.error("Error grouping session:", session, e);
        }
        return groups;
    }, {} as Record<string, Session[]>);

    const orderedKeys = ["Today", "Yesterday", "This Week", ...Object.keys(groupedSessions).filter(k => !["Today", "Yesterday", "This Week"].includes(k))];

    return (
        <AnimatePresence mode="wait">
            {isOpen ? (
                <motion.aside
                    key="sidebar-open"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-shrink-0 h-full bg-slate-50 dark:bg-[#0F1419] border-r border-slate-200 dark:border-white/5 flex flex-col overflow-hidden relative z-20"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 p-4 pb-2">
                        {/* Brand + Collapse */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center shadow-lg shadow-[#13b8a6]/20">
                                    <BarChart3 className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white text-base tracking-tight">Starta AI</span>
                            </div>
                            <button
                                onClick={onToggle}
                                className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#13b8a6] dark:hover:text-white transition-colors"
                                title="Close Sidebar"
                            >
                                <PanelLeftClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* New Chat Button */}
                        <button
                            onClick={onNewChat}
                            className="w-full h-11 rounded-xl bg-[#13b8a6] hover:bg-[#0f8f82] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#13b8a6]/20 transition-all active:scale-[0.98] group"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            New Chat
                        </button>
                    </div>

                    {/* Chat History List */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-white/20">
                        {!isAuthenticated ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                                <p className="text-sm text-slate-500 mb-3">Sign in to save your chat history</p>
                                <button
                                    onClick={onLogin}
                                    className="text-[#13b8a6] text-sm font-semibold hover:underline"
                                >
                                    Sign In &rarr;
                                </button>
                            </div>
                        ) : isLoading && sessions.length === 0 ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-[#13b8a6]" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm italic">
                                No past conversations
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {orderedKeys.map(group => {
                                    const groupSessions = groupedSessions[group];
                                    if (!groupSessions) return null;

                                    return (
                                        <div key={group} className="space-y-1">
                                            <h3 className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                                                {group}
                                            </h3>
                                            <div className="space-y-0.5">
                                                {groupSessions.map(session => (
                                                    <button
                                                        key={session.session_id}
                                                        onClick={() => onSelectSession(session.session_id)}
                                                        className={clsx(
                                                            "w-full text-left px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                                                            currentSessionId === session.session_id
                                                                ? "bg-[#13b8a6]/10 text-[#13b8a6]"
                                                                : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <p className="text-sm truncate pr-2 font-medium relative z-10">
                                                            {session.title || "New Conversation"}
                                                        </p>
                                                        {currentSessionId === session.session_id && (
                                                            <motion.div
                                                                layoutId="active-pill"
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#13b8a6] rounded-r-full"
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-3 pt-2 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F1419]/50 backdrop-blur-md">
                        {isAuthenticated ? (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={onSettings}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-3 hover:border-[#13b8a6]/30 hover:shadow-md transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
                                        {user?.full_name?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-bold text-slate-700 dark:text-white truncate">
                                            {user?.full_name || "User"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            Free Plan
                                        </p>
                                    </div>
                                    <Settings className="w-4 h-4 text-slate-400 group-hover:text-[#13b8a6] transition-colors" />
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group shrink-0"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="w-full p-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm text-center transition-all hover:bg-[#1E293B]"
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
                    animate={{ width: 72 }}
                    exit={{ width: 0 }}
                    className="flex-shrink-0 h-full bg-slate-50 dark:bg-[#0F1419] border-r border-slate-200 dark:border-white/5 flex flex-col items-center py-4 gap-3 z-20"
                >
                    <div className="mb-4">
                        <button
                            onClick={onToggle}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#13b8a6] hover:border-[#13b8a6]/30 transition-all shadow-sm group"
                            title="Open Sidebar"
                        >
                            <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>

                    <button
                        onClick={onNewChat}
                        className="w-10 h-10 rounded-xl bg-[#13b8a6] text-white flex items-center justify-center shadow-lg shadow-[#13b8a6]/20 hover:bg-[#0f8f82] transition-all hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    {isAuthenticated ? (
                        <button
                            onClick={onSettings}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-105 transition-transform"
                        >
                            {user?.full_name?.charAt(0) || "U"}
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            <LogOut className="w-4 h-4 text-white dark:text-slate-900" />
                        </button>
                    )}
                </motion.div>
            )
            }
        </AnimatePresence >
    );
}); // End memo
