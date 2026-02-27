"use client";

/**
 * ============================================================================
 * PREMIUM WORLD-CLASS CHATBOT UI COMPONENTS
 * ============================================================================
 * 
 * These components match the HTML mockup specifications exactly.
 * Design Philosophy: Clean, professional, institutional-grade.
 * 
 * Components:
 * 1. FrameworkCard - Criteria/methodology boxes with colored borders
 * 2. CharacterCard - Stock personality profiles ("The 800-lb Gorilla")
 * 3. QuantifiedDriversCard - Numbered driver breakdown with percentages
 * 4. IndexCompositionCard - Index sector breakdown
 * 5. MacroScorecardCard - Large 68/100 style scorecard
 * 
 * ⚠️ PROTECTED CODE - Part of 4-Layer Response Structure Extension
 * ============================================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";

const BLOCKED_GENERIC_DISCLAIMER_SNIPPETS = [
    "this is market analysis for educational purposes, not personalized investment advice",
    "your decision should factor in your individual financial situation, risk tolerance, and investment timeline",
    "هذا تحليل سوقي لأغراض تعليمية، وليس نصيحة استثمارية شخصية",
    "هذا تحليل للسوق لأغراض تعليمية، وليس نصيحة استثمارية شخصية",
];

function isBlockedGenericDisclaimer(value?: string): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
    return BLOCKED_GENERIC_DISCLAIMER_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FrameworkCardProps {
    icon?: string;
    title: string;
    subtitle?: string;
    items: string[];
    borderColor?: "blue" | "green" | "amber" | "teal";
}

export interface CharacterCardProps {
    emoji: string;
    nickname: string;
    ticker: string;
    companyName?: string;
    profile: string;
    good: string[];
    bad: string[];
}

export interface QuantifiedDriver {
    name: string;
    impact: string;
    detail?: string;
}

export interface QuantifiedDriversCardProps {
    title?: string;
    icon?: string;
    drivers: QuantifiedDriver[];
    totalImpact?: string;
}

export interface IndexCompositionSector {
    name: string;
    weight: string;
    constituents: string[];
}

export interface IndexCompositionCardProps {
    indexName: string;
    icon?: string;
    sectors: IndexCompositionSector[];
    recentChanges?: {
        added?: string[];
        removed?: string[];
    };
    topByWeight?: Array<{ ticker: string; weight: string }>;
    characteristics?: string;
}

export interface MacroScorecardCardProps {
    score: number;
    maxScore?: number;
    assessment: string;
    assessmentDetail?: string;
    positives?: string[];
    negatives?: string[];
}

// ============================================================================
// FRAMEWORK CARD
// ============================================================================
// Visual: Colored left border, icon + uppercase title, bullet list
// Used for: Screener criteria, valuation frameworks, methodology explanations

const BORDER_COLORS = {
    blue: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
    green: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10",
    amber: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
    teal: "border-l-teal-500 bg-teal-50/50 dark:bg-teal-900/10",
};

const TITLE_COLORS = {
    blue: "text-blue-800 dark:text-blue-300",
    green: "text-emerald-800 dark:text-emerald-300",
    amber: "text-amber-800 dark:text-amber-300",
    teal: "text-teal-800 dark:text-teal-300",
};

export function FrameworkCard({
    icon = "📊",
    title,
    subtitle,
    items,
    borderColor = "blue",
}: FrameworkCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "rounded-xl border-l-4 p-4 mb-4",
                BORDER_COLORS[borderColor]
            )}
        >
            <div className="flex items-start gap-2 mb-3">
                <span className="text-lg">{icon}</span>
                <div>
                    <h4 className={clsx(
                        "text-xs font-bold uppercase tracking-wide",
                        TITLE_COLORS[borderColor]
                    )}>
                        {title}
                    </h4>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            <ul className="space-y-2 ml-6">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                            borderColor === "green" ? "bg-emerald-500" :
                                borderColor === "amber" ? "bg-amber-500" :
                                    borderColor === "teal" ? "bg-teal-500" : "bg-blue-500"
                        )} />
                        <span dangerouslySetInnerHTML={{
                            __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>')
                        }} />
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}

// ============================================================================
// CHARACTER CARD
// ============================================================================
// Visual: Emoji header, nickname, stock ticker, good/bad lists
// Used for: Comparison analyses, giving stocks memorable identities

export function CharacterCard({
    emoji,
    nickname,
    ticker,
    companyName,
    profile,
    good,
    bad,
}: CharacterCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-white/10 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{emoji}</span>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {nickname}
                    </h4>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                            {ticker}
                        </span>
                        {companyName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                • {companyName}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Description */}
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {profile}
            </p>

            {/* Good/Bad Lists */}
            <div className="grid grid-cols-2 gap-3">
                {/* Good */}
                <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> The Good
                    </h5>
                    <ul className="space-y-1">
                        {good.map((item, idx) => (
                            <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">+</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bad */}
                <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> The Concern
                    </h5>
                    <ul className="space-y-1">
                        {bad.map((item, idx) => (
                            <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5">-</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// QUANTIFIED DRIVERS CARD
// ============================================================================
// Visual: Numbered list with percentages, color-coded impacts
// Used for: Margin analysis, performance attribution, risk decomposition

export function QuantifiedDriversCard({
    title = "Here's what's actually driving it (quantified)",
    icon = "📊",
    drivers,
    totalImpact,
}: QuantifiedDriversCardProps) {
    const parseImpact = (impact: string): "positive" | "negative" | "neutral" => {
        if (impact.startsWith("+")) return "positive";
        if (impact.startsWith("-")) return "negative";
        return "neutral";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-white/10"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{icon}</span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {title}
                </h4>
            </div>

            {/* Drivers List */}
            <div className="space-y-3">
                {drivers.map((driver, idx) => {
                    const impactType = parseImpact(driver.impact);
                    return (
                        <div key={idx} className="flex items-start gap-3">
                            {/* Number Badge */}
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {idx + 1}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {driver.name}
                                    </span>
                                    <span className={clsx(
                                        "text-sm font-bold",
                                        impactType === "positive" ? "text-emerald-600 dark:text-emerald-400" :
                                            impactType === "negative" ? "text-red-600 dark:text-red-400" :
                                                "text-slate-600 dark:text-slate-400"
                                    )}>
                                        {driver.impact}
                                    </span>
                                </div>
                                {driver.detail && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {driver.detail}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            {totalImpact && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Total Impact
                    </span>
                    <span className={clsx(
                        "text-base font-bold",
                        parseImpact(totalImpact) === "positive" ? "text-emerald-600 dark:text-emerald-400" :
                            parseImpact(totalImpact) === "negative" ? "text-red-600 dark:text-red-400" :
                                "text-slate-700 dark:text-slate-300"
                    )}>
                        {totalImpact}
                    </span>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// INDEX COMPOSITION CARD
// ============================================================================
// Visual: Sector breakdown with weights and constituent names

export function IndexCompositionCard({
    indexName,
    icon = "📊",
    sectors,
    recentChanges,
    topByWeight,
    characteristics,
}: IndexCompositionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{icon}</span>
                <h4 className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-300">
                    {indexName} INDEX COMPOSITION
                </h4>
            </div>

            {/* Sectors */}
            <div className="space-y-3 mb-4">
                {sectors.map((sector, idx) => (
                    <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {sector.name}
                            </span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {sector.weight}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {sector.constituents.join(", ")}
                        </p>
                    </div>
                ))}
            </div>

            {/* Recent Changes */}
            {recentChanges && (recentChanges.added?.length || recentChanges.removed?.length) && (
                <div className="pt-3 border-t border-blue-200 dark:border-blue-500/20 space-y-2">
                    <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Recent changes (last quarterly rebalancing):
                    </h5>
                    {recentChanges.added && recentChanges.added.length > 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Added:</span>{" "}
                            {recentChanges.added.join(", ")}
                        </p>
                    )}
                    {recentChanges.removed && recentChanges.removed.length > 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="text-red-600 dark:text-red-400 font-medium">Removed:</span>{" "}
                            {recentChanges.removed.join(", ")}
                        </p>
                    )}
                </div>
            )}

            {/* Top by Weight */}
            {topByWeight && topByWeight.length > 0 && (
                <div className="pt-3 border-t border-blue-200 dark:border-blue-500/20 mt-3">
                    <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Top {topByWeight.length} by weight:
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        {topByWeight.map((s, idx) => `${s.ticker} (${s.weight})`).join(", ")}
                    </p>
                </div>
            )}

            {/* Characteristics */}
            {characteristics && (
                <div className="pt-3 border-t border-blue-200 dark:border-blue-500/20 mt-3">
                    <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Index characteristics:
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {characteristics}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// MACRO SCORECARD CARD
// ============================================================================
// Visual: Large score display (68/100), colored verdict, positives/negatives

export function MacroScorecardCard({
    score,
    maxScore = 100,
    assessment,
    assessmentDetail,
    positives = [],
    negatives = [],
}: MacroScorecardCardProps) {
    const scoreColor = score >= 70
        ? "text-emerald-600 dark:text-emerald-400"
        : score >= 40
            ? "text-amber-600 dark:text-amber-400"
            : "text-red-600 dark:text-red-400";

    const bgColor = score >= 70
        ? "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-500/20"
        : score >= 40
            ? "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-500/20"
            : "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-500/20";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={clsx(
                "bg-gradient-to-br rounded-xl p-5 border",
                bgColor
            )}
        >
            {/* Score Display */}
            <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                    <span className={clsx("text-5xl font-black", scoreColor)}>
                        {score}
                    </span>
                    <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">
                        /{maxScore}
                    </span>
                </div>
                <h4 className={clsx("text-lg font-bold mt-1", scoreColor)}>
                    {assessment}
                </h4>
                {assessmentDetail && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {assessmentDetail}
                    </p>
                )}
            </div>

            {/* Positives & Negatives */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                {/* Positives */}
                {positives.length > 0 && (
                    <div>
                        <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> What's Working
                        </h5>
                        <ul className="space-y-1.5">
                            {positives.map((item, idx) => (
                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                    <span className="text-emerald-500 mt-0.5">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Negatives */}
                {negatives.length > 0 && (
                    <div>
                        <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> Concerns
                        </h5>
                        <ul className="space-y-1.5">
                            {negatives.map((item, idx) => (
                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                    <span className="text-red-500 mt-0.5">✗</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================================================
// ENHANCED DISCLAIMER CARD
// ============================================================================
// Visual: Amber background, ⚠️ icon, soft border

export function EnhancedDisclaimerCard({
    icon = "⚠️",
    title = "Educational Analysis",
    text = "",
}: {
    icon?: string;
    title?: string;
    text?: string;
}) {
    const disclaimerText = String(text || "").trim();
    if (!disclaimerText || isBlockedGenericDisclaimer(disclaimerText)) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20"
        >
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">{icon}</span>
                <div>
                    <h5 className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                        {title}
                    </h5>
                    <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                        {disclaimerText}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
    FrameworkCard,
    CharacterCard,
    QuantifiedDriversCard,
    IndexCompositionCard,
    MacroScorecardCard,
    EnhancedDisclaimerCard,
};
