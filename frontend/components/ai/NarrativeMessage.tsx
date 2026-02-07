"use client";

/**
 * ============================================================================
 * NARRATIVE MESSAGE COMPONENT
 * ============================================================================
 * 
 * Renders chatbot responses in the EXACT style of the mockup:
 * - Flowing paragraph narrative
 * - Inline data cards with colored headers
 * - Insight cards with colored left borders (green=bull, red=bear, blue=neutral)
 * - Stock list items with detailed descriptions
 * - Macro score cards with factor breakdowns
 * - Comparison tables
 * - Disclaimer cards with amber border
 * 
 * This is a COMPLETE replacement for the fragmented card rendering.
 * ============================================================================
 */

import React from "react";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import clsx from "clsx";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface DataCard {
    icon?: string;
    header: string;
    priceDisplay?: {
        value: string;
        change: string;
        changePercent: string;
        isPositive: boolean;
    };
    subtitle?: string;
    content?: string;
}

interface InsightCard {
    type: "bull" | "bear" | "neutral" | "warning" | "success";
    icon?: string;
    title: string;
    items?: string[];
    content?: string;
}

interface StockItem {
    ticker: string;
    name: string;
    subtitle?: string;
    metrics: { label: string; value: string }[];
    description?: string;
    score?: number;
    scoreLabel?: string;
    highlight?: boolean;
}

interface MacroFactor {
    label: string;
    points: string;
    status: "positive" | "negative" | "neutral";
}

interface MacroScoreCard {
    title: string;
    subtitle?: string;
    score: number;
    maxScore?: number;
    assessment: string;
    factors: MacroFactor[];
}

interface ComparisonRow {
    metric: string;
    values: { value: string; highlight?: boolean; color?: "green" | "red" | "default" }[];
}

interface ComparisonTable {
    headers: string[];
    rows: ComparisonRow[];
}

interface CharacterCard {
    emoji: string;
    nickname: string;
    ticker: string;
    good: string;
    bad: string;
    profile: string;
}

interface FrameworkCard {
    icon?: string;
    title: string;
    items: string[];
}

interface NarrativeSection {
    type: "paragraph" | "data_card" | "insight_card" | "stock_list" | "macro_score" |
    "comparison_table" | "character_cards" | "framework_card" | "disclaimer" |
    "section_header" | "bullet_list" | "follow_up";
    content: any;
}

// =============================================================================
// SUB-COMPONENTS (Matching mockup exactly)
// =============================================================================

/** Data Card - Light gray background with emoji header */
function DataCardComponent({ card }: { card: DataCard }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 my-4 border border-slate-200 dark:border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {card.icon && <span className="mr-1">{card.icon}</span>}
                {card.header}
            </div>
            {card.priceDisplay && (
                <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {card.priceDisplay.value}
                    </span>
                    <span className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-semibold",
                        card.priceDisplay.isPositive
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}>
                        {card.priceDisplay.isPositive ? "↑" : "↓"} {card.priceDisplay.change} ({card.priceDisplay.changePercent})
                    </span>
                </div>
            )}
            {card.subtitle && (
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {card.subtitle}
                </div>
            )}
            {card.content && (
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                    {card.content}
                </div>
            )}
        </div>
    );
}

/** Insight Card - Left border colored by type */
function InsightCardComponent({ card }: { card: InsightCard }) {
    const borderColorClass = {
        bull: "border-l-emerald-500",
        bear: "border-l-red-500",
        neutral: "border-l-sky-500",
        warning: "border-l-amber-500",
        success: "border-l-emerald-500",
    }[card.type];

    const bgColorClass = {
        bull: "bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/10 dark:to-transparent",
        bear: "bg-gradient-to-r from-red-50 to-transparent dark:from-red-900/10 dark:to-transparent",
        neutral: "bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-900/10 dark:to-transparent",
        warning: "bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent",
        success: "bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/10 dark:to-transparent",
    }[card.type];

    return (
        <div className={clsx(
            "border-l-4 pl-4 py-3 pr-4 rounded-r-lg my-4",
            borderColorClass,
            bgColorClass
        )}>
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                {card.icon && <span>{card.icon}</span>}
                {card.title}
            </div>
            {card.items && card.items.length > 0 && (
                <ul className="space-y-1.5 ml-1">
                    {card.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            )}
            {card.content && (
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {card.content}
                </div>
            )}
        </div>
    );
}

/** Stock List Item - Matches mockup with ticker, metrics, and optional score */
function StockItemComponent({ stock }: { stock: StockItem }) {
    return (
        <div className={clsx(
            "p-4 rounded-xl border bg-white dark:bg-slate-800 my-2 transition-all hover:shadow-md",
            stock.highlight
                ? "border-emerald-400 dark:border-emerald-500 border-2"
                : "border-slate-200 dark:border-slate-700"
        )}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="font-bold text-base text-slate-900 dark:text-white">
                        {stock.ticker}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {stock.name}
                        {stock.subtitle && <span className="text-slate-400 dark:text-slate-500"> – {stock.subtitle}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {stock.metrics.map((m, i) => (
                            <span key={i}>{m.label}: {m.value}</span>
                        ))}
                    </div>
                    {stock.description && (
                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong className="text-slate-700 dark:text-slate-200">Why it's a gem:</strong> {stock.description}
                        </div>
                    )}
                    {stock.score && (
                        <div className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            📊 {stock.scoreLabel || "Undervaluation Score"}: {stock.score}/100
                        </div>
                    )}
                </div>
                {stock.score && !stock.description && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-500">{stock.score}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {stock.scoreLabel || "Score"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Macro Score Card - Prominent display with factor breakdown */
function MacroScoreCardComponent({ card }: { card: MacroScoreCard }) {
    return (
        <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-800/10 border-2 border-sky-400 dark:border-sky-500 rounded-xl p-5 my-5">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                        🌍 {card.title}
                    </div>
                    {card.subtitle && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">{card.subtitle}</div>
                    )}
                </div>
                <div className="text-4xl font-bold text-sky-500">
                    {card.score}/{card.maxScore || 100}
                </div>
            </div>
            <div className="text-center text-base font-semibold text-sky-600 dark:text-sky-400 mb-4">
                Assessment: {card.assessment}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {card.factors.map((factor, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-800 rounded-lg text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{factor.label}</span>
                        <span className={clsx(
                            "font-semibold",
                            factor.status === "positive" && "text-emerald-600 dark:text-emerald-400",
                            factor.status === "negative" && "text-red-600 dark:text-red-400",
                            factor.status === "neutral" && "text-amber-600 dark:text-amber-400"
                        )}>
                            {factor.points} {factor.status === "positive" ? "✓" : factor.status === "neutral" ? "~" : "✗"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Comparison Table */
function ComparisonTableComponent({ table }: { table: ComparisonTable }) {
    return (
        <div className="overflow-x-auto my-4">
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {table.headers.map((h, i) => (
                            <th key={i} className="bg-slate-100 dark:bg-slate-700 px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                                {row.metric}
                            </td>
                            {row.values.map((v, vi) => (
                                <td key={vi} className={clsx(
                                    "px-3 py-3 border-b border-slate-100 dark:border-slate-700",
                                    v.highlight && "font-bold text-sky-600 dark:text-sky-400",
                                    v.color === "green" && "text-emerald-600 dark:text-emerald-400",
                                    v.color === "red" && "text-red-600 dark:text-red-400"
                                )}>
                                    {v.value}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Character Card - Stock personality profiles */
function CharacterCardComponent({ card }: { card: CharacterCard }) {
    return (
        <div className="border-l-4 border-l-sky-500 pl-4 py-3 pr-4 rounded-r-lg my-3 bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-900/10 dark:to-transparent">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span className="text-xl">{card.emoji}</span>
                {card.ticker} ({card.nickname})
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p><strong className="text-slate-700 dark:text-slate-200">The good:</strong> {card.good}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">The bad:</strong> {card.bad}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">The profile:</strong> {card.profile}</p>
            </div>
        </div>
    );
}

/** Framework Card - Criteria/methodology box */
function FrameworkCardComponent({ card }: { card: FrameworkCard }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 my-4 border border-slate-200 dark:border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {card.icon && <span className="mr-1">{card.icon}</span>}
                {card.title}
            </div>
            <div className="space-y-1.5">
                {card.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span className="leading-relaxed">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Disclaimer Card - Amber left border */
function DisclaimerComponent({ content }: { content: string }) {
    return (
        <div className="border-l-4 border-l-amber-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-amber-700 dark:text-amber-400">⚠️ Educational Analysis:</strong> {content}
            </div>
        </div>
    );
}

/** Follow-up Prompt */
function FollowUpComponent({ content }: { content: string }) {
    return (
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-4 italic">
            {content}
        </p>
    );
}

// =============================================================================
// MAIN EXPORT: NarrativeMessage
// =============================================================================

interface NarrativeMessageProps {
    sections: NarrativeSection[];
}

export function NarrativeMessage({ sections }: NarrativeMessageProps) {
    return (
        <div className="space-y-0">
            {sections.map((section, i) => {
                switch (section.type) {
                    case "paragraph":
                        // Render paragraph with inline bold handling
                        const text = section.content as string;
                        if (text.includes("**")) {
                            const parts = text.split(/(\*\*[^*]+\*\*)/g);
                            return (
                                <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-3">
                                    {parts.map((part, j) => {
                                        if (part.startsWith("**") && part.endsWith("**")) {
                                            return <strong key={j} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                                        }
                                        return part;
                                    })}
                                </p>
                            );
                        }
                        return (
                            <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-3">
                                {text}
                            </p>
                        );

                    case "section_header":
                        return (
                            <h4 key={i} className="text-sm font-semibold text-slate-900 dark:text-white mt-5 mb-2">
                                {section.content}
                            </h4>
                        );

                    case "bullet_list":
                        return (
                            <ul key={i} className="ml-5 my-2 space-y-1">
                                {(section.content as string[]).map((item, j) => (
                                    <li key={j} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        );

                    case "data_card":
                        return <DataCardComponent key={i} card={section.content as DataCard} />;

                    case "insight_card":
                        return <InsightCardComponent key={i} card={section.content as InsightCard} />;

                    case "stock_list":
                        return (
                            <div key={i} className="space-y-2 my-4">
                                {(section.content as StockItem[]).map((stock, j) => (
                                    <StockItemComponent key={j} stock={stock} />
                                ))}
                            </div>
                        );

                    case "macro_score":
                        return <MacroScoreCardComponent key={i} card={section.content as MacroScoreCard} />;

                    case "comparison_table":
                        return <ComparisonTableComponent key={i} table={section.content as ComparisonTable} />;

                    case "character_cards":
                        return (
                            <div key={i} className="space-y-3 my-4">
                                {(section.content as CharacterCard[]).map((card, j) => (
                                    <CharacterCardComponent key={j} card={card} />
                                ))}
                            </div>
                        );

                    case "framework_card":
                        return <FrameworkCardComponent key={i} card={section.content as FrameworkCard} />;

                    case "disclaimer":
                        return <DisclaimerComponent key={i} content={section.content as string} />;

                    case "follow_up":
                        return <FollowUpComponent key={i} content={section.content as string} />;

                    default:
                        return null;
                }
            })}
        </div>
    );
}

// =============================================================================
// PARSER: Convert raw text/data to NarrativeSection[]
// =============================================================================

/**
 * parseNarrativeContent
 * 
 * Takes the raw conversational_text and structured components from the backend
 * and converts them into an array of NarrativeSection for rendering.
 */
export function parseNarrativeContent(
    conversationalText: string,
    response?: {
        framework_card?: any;
        character_cards?: any[];
        cards?: any[];
        bull_case?: any;
        bear_case?: any;
        macro_score?: any;
        follow_up_prompt?: string;
        learning_section?: any;
    }
): NarrativeSection[] {
    const sections: NarrativeSection[] = [];

    if (!conversationalText) {
        return sections;
    }

    // Split by double newlines to get paragraphs
    const paragraphs = conversationalText.split(/\n\n+/);

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check for headers (lines starting with **)
        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes("\n")) {
            sections.push({
                type: "section_header",
                content: trimmed.slice(2, -2)
            });
            continue;
        }

        // Check for bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            const items = trimmed.split(/\n/).map(line =>
                line.replace(/^[-•]\s*/, "").trim()
            ).filter(Boolean);
            sections.push({
                type: "bullet_list",
                content: items
            });
            continue;
        }

        // Check for disclaimer markers
        if (trimmed.toLowerCase().includes("educational analysis") ||
            trimmed.toLowerCase().includes("not investment advice") ||
            trimmed.toLowerCase().includes("⚠️")) {
            sections.push({
                type: "disclaimer",
                content: trimmed.replace(/⚠️\s*/g, "").replace(/\*\*/g, "")
            });
            continue;
        }

        // Default: paragraph
        sections.push({
            type: "paragraph",
            content: trimmed
        });
    }

    // Add structured components at appropriate positions
    if (response?.framework_card) {
        // Insert after first paragraph
        const insertIdx = sections.findIndex(s => s.type === "paragraph") + 1;
        sections.splice(Math.max(1, insertIdx), 0, {
            type: "framework_card",
            content: response.framework_card
        });
    }

    if (response?.bull_case || response?.bear_case) {
        // Add bull/bear insight cards
        if (response.bull_case) {
            sections.push({
                type: "insight_card",
                content: {
                    type: "bull",
                    icon: "📈",
                    title: `Bull Case (+${response.bull_case.upside || ""}% upside)`,
                    items: response.bull_case.points || []
                } as InsightCard
            });
        }
        if (response.bear_case) {
            sections.push({
                type: "insight_card",
                content: {
                    type: "bear",
                    icon: "📉",
                    title: `Bear Case (${response.bear_case.downside || ""}% downside)`,
                    items: response.bear_case.points || []
                } as InsightCard
            });
        }
    }

    if (response?.character_cards && response.character_cards.length > 0) {
        sections.push({
            type: "character_cards",
            content: response.character_cards
        });
    }

    if (response?.macro_score) {
        sections.push({
            type: "macro_score",
            content: response.macro_score
        });
    }

    if (response?.follow_up_prompt) {
        sections.push({
            type: "follow_up",
            content: response.follow_up_prompt
        });
    }

    return sections;
}

export default NarrativeMessage;
