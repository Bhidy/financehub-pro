'use client';

/**
 * Structured Response Components
 * 
 * React components matching the HTML mockup for structured chatbot responses.
 * Includes: DataCard, InsightCard, StockListCard, MacroScoreCard, DisclaimerCard
 */

import React from 'react';

// ============================================================================
// TypeScript Interfaces (match backend schemas.py)
// ============================================================================

export interface DataCardProps {
    label?: string;
    icon?: string;
    price: string;
    change: string;
    changePositive: boolean;
    volumeContext?: string;
}

export interface InsightCardProps {
    variant: 'success' | 'warning' | 'info' | 'neutral';
    title: string;
    items: string[];
}

export interface StockListItem {
    ticker: string;
    companyName: string;
    score: number;
    metrics: Record<string, string>;
}

export interface MacroFactor {
    name: string;
    points: number;
    maxPoints: number;
    status: 'positive' | 'neutral' | 'negative';
}

export interface MacroScoreCardProps {
    score: number;
    maxScore?: number;
    assessment: string;
    factors: MacroFactor[];
}

export interface DisclaimerCardProps {
    icon?: string;
    title?: string;
    text?: string;
}

// ============================================================================
// DataCard Component - Current Position Display
// ============================================================================

export function DataCard({
    label = 'CURRENT POSITION',
    icon = '📊',
    price,
    change,
    changePositive,
    volumeContext,
}: DataCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                <span>{icon}</span>
                <span className="uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {price}
                </span>
                <span
                    className={`text-sm font-medium ${changePositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                >
                    {change}
                </span>
            </div>
            {volumeContext && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {volumeContext}
                </p>
            )}
        </div>
    );
}

// ============================================================================
// InsightCard Component - Bull/Bear Cases
// ============================================================================

const VARIANT_STYLES = {
    success: {
        border: 'border-l-4 border-l-emerald-500',
        bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        border: 'border-l-4 border-l-red-500',
        bg: 'bg-red-50/50 dark:bg-red-950/20',
        iconBg: 'bg-red-100 dark:bg-red-900',
        iconColor: 'text-red-600 dark:text-red-400',
    },
    info: {
        border: 'border-l-4 border-l-blue-500',
        bg: 'bg-blue-50/50 dark:bg-blue-950/20',
        iconBg: 'bg-blue-100 dark:bg-blue-900',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    neutral: {
        border: 'border-l-4 border-l-gray-400',
        bg: 'bg-gray-50/50 dark:bg-gray-800/50',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
        iconColor: 'text-gray-600 dark:text-gray-400',
    },
};

export function InsightCard({ variant, title, items }: InsightCardProps) {
    const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

    return (
        <div
            className={`rounded-lg p-4 ${styles.border} ${styles.bg} shadow-sm`}
        >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">
                {title}
            </h4>
            <ul className="space-y-2">
                {items.map((item, idx) => (
                    <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                        <span className={`${styles.iconColor} mt-0.5`}>•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ============================================================================
// StockListCard Component - Screener Results with Scores
// ============================================================================

interface StockListCardProps {
    title?: string;
    stocks: StockListItem[];
}

export function StockListCard({ title = 'Screener Results', stocks }: StockListCardProps) {
    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50';
        if (score >= 50) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50';
        if (score >= 25) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50';
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50';
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stocks.map((stock, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {stock.ticker}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                    {stock.companyName}
                                </span>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-sm font-medium ${getScoreColor(stock.score)}`}>
                                {stock.score}/100
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(stock.metrics).map(([key, value]) => (
                                <span key={key}>
                                    <span className="font-medium">{key}:</span> {value}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// MacroScoreCard Component - Market Environment Score
// ============================================================================

export function MacroScoreCard({
    score,
    maxScore = 100,
    assessment,
    factors,
}: MacroScoreCardProps) {
    const scorePercentage = (score / maxScore) * 100;

    const getScoreColor = () => {
        if (scorePercentage >= 75) return 'text-emerald-600 dark:text-emerald-400';
        if (scorePercentage >= 50) return 'text-blue-600 dark:text-blue-400';
        if (scorePercentage >= 25) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getProgressColor = () => {
        if (scorePercentage >= 75) return 'bg-emerald-500';
        if (scorePercentage >= 50) return 'bg-blue-500';
        if (scorePercentage >= 25) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getStatusIcon = (status: 'positive' | 'neutral' | 'negative') => {
        switch (status) {
            case 'positive':
                return <span className="text-emerald-500">↑</span>;
            case 'negative':
                return <span className="text-red-500">↓</span>;
            default:
                return <span className="text-gray-400">→</span>;
        }
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            {/* Header with Score */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        📈 Macro Environment Score
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{assessment}</p>
                </div>
                <div className={`text-3xl font-bold ${getScoreColor()}`}>
                    {score}<span className="text-lg text-gray-400">/{maxScore}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                <div
                    className={`h-full ${getProgressColor()} rounded-full transition-all duration-500`}
                    style={{ width: `${scorePercentage}%` }}
                />
            </div>

            {/* Factor Breakdown */}
            <div className="space-y-2">
                {factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            {getStatusIcon(factor.status)}
                            <span className="text-gray-700 dark:text-gray-300">{factor.name}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">
                            {factor.points}/{factor.maxPoints}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// DisclaimerCard Component - Educational Warning
// ============================================================================

export function DisclaimerCard({
    icon = '⚠️',
    title = 'Educational Analysis',
    text = 'This is market analysis for educational purposes, not personalized investment advice. Your decision should factor in your individual financial situation, risk tolerance, and investment timeline.',
}: DisclaimerCardProps) {
    return (
        <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
                <span className="text-lg">{icon}</span>
                <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                        {title}
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300/80">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// FollowUpPrompt Component - Suggested Next Action
// ============================================================================

interface FollowUpPromptProps {
    prompt: string;
}

export function FollowUpPrompt({ prompt }: FollowUpPromptProps) {
    return (
        <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="text-lg">💡</span>
                <p className="text-sm">{prompt}</p>
            </div>
        </div>
    );
}

// ============================================================================
// ComparisonTable Component - Peer Comparison
// ============================================================================

interface ComparisonRow {
    metric: string;
    values: string[];
}

interface ComparisonTableProps {
    headers: string[];
    rows: ComparisonRow[];
    personalityProfiles?: Record<string, string>;
}

export function ComparisonTable({ headers, rows, personalityProfiles }: ComparisonTableProps) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                Metric
                            </th>
                            {headers.map((header, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                    {row.metric}
                                </td>
                                {row.values.map((value, valIdx) => (
                                    <td
                                        key={valIdx}
                                        className="px-4 py-3 text-center text-gray-600 dark:text-gray-400"
                                    >
                                        {value}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Personality Profiles */}
            {personalityProfiles && Object.keys(personalityProfiles).length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                        Investment Personality Profiles:
                    </p>
                    <div className="space-y-1">
                        {Object.entries(personalityProfiles).map(([ticker, profile]) => (
                            <p key={ticker} className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">{ticker}:</span> {profile}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Export All Components
// ============================================================================

export default {
    DataCard,
    InsightCard,
    StockListCard,
    MacroScoreCard,
    DisclaimerCard,
    FollowUpPrompt,
    ComparisonTable,
};
