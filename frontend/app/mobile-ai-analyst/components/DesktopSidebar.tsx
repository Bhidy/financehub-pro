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

// @ts-nocheck
"use client";

import { useState, useEffect, memo, useCallback, useRef } from "react";
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
    PanelLeftOpen,
    MoreVertical,
    Edit2,
    Trash2,
    Check,
    X
} from "lucide-react";
import { clsx } from "clsx";
import { fetchChatHistory, renameChatSession, deleteChatSession } from "@/lib/api";
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

    // Management State
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); // For modal
    const [editTitle, setEditTitle] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load history when authenticated
    useEffect(() => {
        let isMounted = true;
        const loadHistory = async () => {
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

    // Handlers
    const handleRename = async (sessionId: string) => {
        if (!editTitle.trim()) return;
        setProcessingId(sessionId);
        try {
            await renameChatSession(sessionId, editTitle);
            setSessions(prev => prev.map(s =>
                s.session_id === sessionId ? { ...s, title: editTitle } : s
            ));
            setEditingId(null);
        } catch (error) {
            console.error("Failed to rename:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setProcessingId(deleteConfirmId);
        try {
            await deleteChatSession(deleteConfirmId);
            setSessions(prev => prev.filter(s => s.session_id !== deleteConfirmId));
            if (currentSessionId === deleteConfirmId) {
                onNewChat(); // Reset if deleted current
            }
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete chat. Please try again."); // Fallback feedback
        } finally {
            setProcessingId(null);
            setDeleteConfirmId(null);
            setMenuOpenId(null);
        }
    };

    const startEditing = (session: Session) => {
        setEditingId(session.session_id);
        setEditTitle(session.title);
        setMenuOpenId(null);
    };

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
            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div key="delete-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteConfirmId(null)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm overflow-hidden"
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-2">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Chat?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    This action cannot be undone. All messages in this chat will be lost.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={!!processingId}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    {processingId === deleteConfirmId ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

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
                                                    <div
                                                        key={session.session_id}
                                                        className={clsx(
                                                            "group relative flex items-center rounded-lg transition-all",
                                                            currentSessionId === session.session_id
                                                                ? "bg-[#13b8a6]/10 text-[#13b8a6]"
                                                                : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                                                        )}
                                                    >
                                                        {editingId === session.session_id ? (
                                                            // Editing Mode
                                                            <div className="flex items-center gap-1 w-full px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={editTitle}
                                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                                    className="flex-1 bg-white dark:bg-[#0B1121] text-xs px-2 py-1 rounded border border-[#10B981] focus:outline-none min-w-0"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleRename(session.session_id);
                                                                        if (e.key === 'Escape') setEditingId(null);
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleRename(session.session_id)}
                                                                    disabled={!!processingId}
                                                                    className="p-1 text-[#10B981] hover:bg-[#10B981]/10 rounded"
                                                                >
                                                                    {processingId === session.session_id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // Standard Display Mode
                                                            <>
                                                                <button
                                                                    onClick={() => onSelectSession(session.session_id)}
                                                                    className="flex-1 text-left px-3 py-2.5 truncate font-medium text-sm relative z-10 min-w-0"
                                                                >
                                                                    {session.title || "New Conversation"}
                                                                </button>

                                                                {/* Options Button (Visible on Hover or Menu Open) */}
                                                                <div className={clsx(
                                                                    "absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center z-20 bg-gradient-to-l from-slate-100 via-slate-100 to-transparent dark:from-[#0F1419] dark:via-[#0F1419] pl-4",
                                                                    menuOpenId === session.session_id && "opacity-100"
                                                                )}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpenId(menuOpenId === session.session_id ? null : session.session_id);
                                                                        }}
                                                                        className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                                    >
                                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                                    </button>

                                                                    {/* Dropdown Menu */}
                                                                    <AnimatePresence>
                                                                        {menuOpenId === session.session_id && (
                                                                            <motion.div
                                                                                ref={menuRef}
                                                                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                                className="absolute right-0 top-8 w-32 bg-white dark:bg-[#1E293B] rounded-lg shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 origin-top-right"
                                                                            >
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        startEditing(session);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                                                                >
                                                                                    <Edit2 className="w-3 h-3" /> Rename
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setDeleteConfirmId(session.session_id); // Trigger Modal
                                                                                        setMenuOpenId(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" /> Delete
                                                                                </button>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>

                                                                {currentSessionId === session.session_id && (
                                                                    <motion.div
                                                                        layoutId="active-pill"
                                                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#13b8a6] rounded-r-full"
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
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
