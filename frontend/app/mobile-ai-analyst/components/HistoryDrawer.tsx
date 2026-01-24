"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Calendar, ChevronRight, Loader2, MoreVertical, Edit2, Trash2, Check, XCircle } from "lucide-react";
import { fetchChatHistory, renameChatSession, deleteChatSession } from "@/lib/api";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { clsx } from "clsx";

interface Session {
    session_id: string;
    title: string;
    updated_at: string;
    last_market?: string;
}

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    currentSessionId: string | null;
}

export function HistoryDrawer({
    isOpen,
    onClose,
    onSelectSession,
    onNewChat,
    currentSessionId
}: HistoryDrawerProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Management State
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null); // For delete/rename loading

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

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

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await fetchChatHistory();
            setSessions(data || []);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleDelete = async (sessionId: string) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;
        setProcessingId(sessionId);
        try {
            await deleteChatSession(sessionId);
            setSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (currentSessionId === sessionId) {
                onNewChat(); // Reset if deleted current
            }
        } catch (error) {
            console.error("Failed to delete:", error);
        } finally {
            setProcessingId(null);
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
        const date = new Date(session.updated_at);
        let key = "Earlier";

        if (isToday(date)) key = "Today";
        else if (isYesterday(date)) key = "Yesterday";
        else if (isThisWeek(date)) key = "This Week";
        else key = format(date, "MMMM yyyy");

        if (!groups[key]) groups[key] = [];
        groups[key].push(session);
        return groups;
    }, {} as Record<string, Session[]>);

    // Order keys: Today, Yesterday, This Week, then others
    const orderedKeys = ["Today", "Yesterday", "This Week", ...Object.keys(groupedSessions).filter(k => !["Today", "Yesterday", "This Week"].includes(k))];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Drawer - Midnight Teal Design */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-[#F8FAFC] dark:bg-[#0B1121] shadow-2xl z-[60] flex flex-col border-r border-slate-200 dark:border-white/[0.08]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/[0.08]">
                            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Chat History</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
                            {/* New Chat Button - Starta Green */}
                            <button
                                onClick={() => {
                                    onNewChat();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-lg shadow-[#10B981]/20 transition-all font-semibold mx-auto max-w-[95%]"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>New Chat</span>
                            </button>

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#14B8A6]" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                                    No history yet.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {orderedKeys.map(group => {
                                        const groupSessions = groupedSessions[group];
                                        if (!groupSessions) return null;

                                        return (
                                            <div key={group} className="space-y-2">
                                                <h3 className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                    {group}
                                                </h3>
                                                <div className="space-y-1">
                                                    {groupSessions.map(session => (
                                                        <div
                                                            key={session.session_id}
                                                            className={clsx(
                                                                "group relative flex items-center gap-3 px-4 py-3 transition-all rounded-lg mx-auto max-w-[98%]",
                                                                currentSessionId === session.session_id
                                                                    ? "bg-[#10B981]/10 dark:bg-[#10B981]/10 border border-[#10B981]/20"
                                                                    : "hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                                                            )}
                                                        >
                                                            {/* Main Click Area */}
                                                            <div
                                                                className="flex-1 min-w-0 cursor-pointer"
                                                                onClick={() => {
                                                                    if (editingId !== session.session_id) {
                                                                        onSelectSession(session.session_id);
                                                                        onClose();
                                                                    }
                                                                }}
                                                            >
                                                                {editingId === session.session_id ? (
                                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            type="text"
                                                                            value={editTitle}
                                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                                            className="w-full bg-slate-200 dark:bg-black/40 text-sm px-2 py-1 rounded border border-[#10B981] focus:outline-none text-[#0F172A] dark:text-white"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleRename(session.session_id);
                                                                                if (e.key === 'Escape') setEditingId(null);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleRename(session.session_id)}
                                                                            disabled={!!processingId}
                                                                            className="p-1 hover:bg-[#10B981]/20 rounded text-[#10B981]"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingId(null)}
                                                                            disabled={!!processingId}
                                                                            className="p-1 hover:bg-red-500/20 rounded text-red-500"
                                                                        >
                                                                            <XCircle className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <p className={clsx(
                                                                            "truncate font-medium text-sm",
                                                                            currentSessionId === session.session_id ? "text-[#10B981]" : "text-slate-700 dark:text-slate-300"
                                                                        )}>
                                                                            {session.title || "Untitled Chat"}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                                            {format(new Date(session.updated_at), "h:mm a")}
                                                                            {session.last_market && (
                                                                                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                                                    {session.last_market}
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Actions Area */}
                                                            {editingId !== session.session_id && (
                                                                <div className="flex items-center gap-1">
                                                                    {currentSessionId === session.session_id && (
                                                                        <ChevronRight className="w-4 h-4 text-[#10B981]" />
                                                                    )}

                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setMenuOpenId(menuOpenId === session.session_id ? null : session.session_id);
                                                                            }}
                                                                            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors"
                                                                        >
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </button>

                                                                        {/* Dropdown Menu */}
                                                                        <AnimatePresence>
                                                                            {menuOpenId === session.session_id && (
                                                                                <motion.div
                                                                                    ref={menuRef}
                                                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1E293B] rounded-xl shadow-xl border border-slate-100 dark:border-white/10 z-50 overflow-hidden py-1"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <button
                                                                                        onClick={() => startEditing(session)}
                                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                                                                    >
                                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                                        Rename
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDelete(session.session_id)}
                                                                                        disabled={!!processingId}
                                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                                    >
                                                                                        {processingId === session.session_id ? (
                                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                        ) : (
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        )}
                                                                                        Delete
                                                                                    </button>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                </div>
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
