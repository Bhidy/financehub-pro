"use client";

import React from "react";
import {
    TrendingUp, TrendingDown, BarChart3, DollarSign, Activity,
    Clock, Zap, Flame, ArrowUpRight, ArrowDownRight, AlertCircle,
    Award, Trophy, Medal
} from "lucide-react";
import clsx from "clsx";

// ============================================================================
// PREMIUM MESSAGE RENDERER
// Parses AI message content and renders with premium UI components
// ============================================================================

interface PremiumMessageProps {
    content: string;
}

// Parse [STAT] tags and render with icons
function StatLine({ text }: { text: string }) {
    // Extract the stat label and value
    const match = text.match(/\[STAT\]\s*([^:]+):\s*(.+)/);
    if (!match) return <p className="text-slate-700">{text}</p>;

    const label = match[1].trim();
    const value = match[2].trim();

    // Determine icon based on label
    const getIcon = (label: string) => {
        const lower = label.toLowerCase();
        if (lower.includes('change')) return { icon: TrendingUp, gradient: "from-blue-400 to-indigo-500" };
        if (lower.includes('volume')) return { icon: BarChart3, gradient: "from-violet-400 to-purple-500" };
        if (lower.includes('range')) return { icon: Activity, gradient: "from-emerald-400 to-teal-500" };
        if (lower.includes('rsi')) return { icon: Zap, gradient: "from-amber-400 to-orange-500" };
        if (lower.includes('macd')) return { icon: TrendingUp, gradient: "from-cyan-400 to-blue-500" };
        if (lower.includes('trend')) return { icon: Activity, gradient: "from-pink-400 to-rose-500" };
        if (lower.includes('price')) return { icon: DollarSign, gradient: "from-green-400 to-emerald-500" };
        return { icon: Activity, gradient: "from-slate-400 to-slate-500" };
    };

    const { icon: Icon, gradient } = getIcon(label);
    const isPositive = value.includes('+') || value.toLowerCase().includes('up') || value.toLowerCase().includes('bullish');
    const isNegative = value.includes('-') || value.toLowerCase().includes('down') || value.toLowerCase().includes('bearish');

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-2">
            <div className={clsx(
                "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                gradient
            )}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-500 min-w-[70px]">{label}</span>
            <span className="text-sm font-bold text-slate-900 flex-1">{value}</span>
            {isPositive && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            {isNegative && !isPositive && <ArrowDownRight className="w-4 h-4 text-red-500" />}
        </div>
    );
}

// Parse [VERDICT:type] tags
function VerdictBadge({ text }: { text: string }) {
    const match = text.match(/\[VERDICT:(\w+)\]\s*(.*)/);
    if (!match) return <p className="text-slate-700">{text}</p>;

    const type = match[1].toLowerCase();
    const message = match[2].trim();

    const configs: Record<string, { icon: React.ElementType, bg: string, label: string, shadow: string }> = {
        bullish: { icon: TrendingUp, bg: "from-emerald-500 to-teal-600", label: "Looking Good!", shadow: "shadow-emerald-500/25" },
        bearish: { icon: TrendingDown, bg: "from-red-500 to-rose-600", label: "Heads Up!", shadow: "shadow-red-500/25" },
        neutral: { icon: AlertCircle, bg: "from-slate-500 to-slate-600", label: "Mixed Signals", shadow: "shadow-slate-500/25" },
        hot: { icon: Flame, bg: "from-orange-500 to-red-500", label: "On Fire!", shadow: "shadow-orange-500/25" },
    };

    const config = configs[type] || configs.neutral;
    const Icon = config.icon;

    return (
        <div className={clsx(
            "inline-flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-xl mt-4 bg-gradient-to-r",
            config.bg, config.shadow
        )}>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="text-sm font-black">{config.label}</div>
                <div className="text-xs opacity-90">{message}</div>
            </div>
        </div>
    );
}

// Parse [RANK:N] tags
function RankLine({ text }: { text: string }) {
    const match = text.match(/\[RANK:(\d+)\]\s*(.*)/);
    if (!match) return <p className="text-slate-700">{text}</p>;

    const rank = parseInt(match[1]);
    const content = match[2].trim();

    const rankIcons = [Trophy, Award, Medal];
    const rankColors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-300 to-amber-400"];

    const Icon = rankIcons[Math.min(rank - 1, 2)];
    const gradient = rankColors[Math.min(rank - 1, 2)];

    return (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg mb-2">
            <div className={clsx(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                gradient
            )}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-400 w-8">#{rank}</span>
            <span className="text-sm font-semibold text-slate-800 flex-1">{content}</span>
        </div>
    );
}

// Timestamp display
function UpdatedLine({ text }: { text: string }) {
    const match = text.match(/Updated:\s*(.*)/i);
    if (!match) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {match[1]}</span>
        </div>
    );
}

export function PremiumMessageRenderer({ content }: PremiumMessageProps) {
    // Guard against null/undefined content
    if (!content || typeof content !== 'string') {
        return <p className="text-slate-600 text-sm">...</p>;
    }
    // Split content into lines and parse each
    const lines = content.split('\n');

    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const trimmed = line.trim();

                // Skip empty lines and separators
                if (!trimmed || trimmed === '---') return null;

                // Parse special tags
                if (trimmed.startsWith('[STAT]')) {
                    return <StatLine key={i} text={trimmed} />;
                }

                if (trimmed.startsWith('[VERDICT:')) {
                    return <VerdictBadge key={i} text={trimmed} />;
                }

                if (trimmed.startsWith('[RANK:')) {
                    return <RankLine key={i} text={trimmed} />;
                }

                if (trimmed.toLowerCase().startsWith('updated:')) {
                    return <UpdatedLine key={i} text={trimmed} />;
                }

                // Regular text - apply basic markdown
                if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                    return <h3 key={i} className="text-lg font-bold text-slate-900 mt-2">{trimmed.replace(/\*\*/g, '')}</h3>;
                }

                if (trimmed.startsWith('- ')) {
                    return (
                        <div key={i} className="flex items-center gap-2 pl-2 text-sm text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{trimmed.substring(2)}</span>
                        </div>
                    );
                }

                // Default paragraph with bold handling
                const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={i} className="text-sm text-slate-700 leading-relaxed">
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j} className="font-bold text-slate-900">{part.replace(/\*\*/g, '')}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
}
