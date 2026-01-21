"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { fetchChatHistory } from "@/lib/api";
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

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

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
                        className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-[#F8FAFC] dark:bg-[#0B1121] shadow-2xl z-50 flex flex-col border-r border-slate-200 dark:border-white/[0.08]"
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
                            {/* New Chat Button - Trust Blue */}
                            <button
                                onClick={() => {
                                    onNewChat();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg shadow-lg shadow-[#3B82F6]/20 transition-all font-semibold mx-auto max-w-[95%]"
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
                                                        <button
                                                            key={session.session_id}
                                                            onClick={() => {
                                                                onSelectSession(session.session_id);
                                                                onClose();
                                                            }}
                                                            className={clsx(
                                                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-lg mx-auto max-w-[98%]",
                                                                currentSessionId === session.session_id
                                                                    ? "bg-[#3B82F6]/10 dark:bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20"
                                                                    : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-transparent"
                                                            )}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="truncate font-medium text-sm">
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
                                                            </div>
                                                            {currentSessionId === session.session_id && (
                                                                <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
