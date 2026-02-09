"use client";

/**
 * ============================================================================
 * WORLD-CLASS MESSAGE RENDERER
 * ============================================================================
 * 
 * This component renders AI chatbot responses in the EXACT style of the mockup:
 * 
 * Design Language:
 * - Light gray background cards (#f8fafc in light mode)
 * - Colored left-border insight cards (green=bull, red=bear, blue=neutral)
 * - Flowing narrative paragraphs with inline formatting
 * - Stock list items with detailed descriptions
 * - Macro score cards with factor breakdowns
 * - Comparison tables with color coding
 * - Educational cards with examples
 * - Amber-bordered disclaimer cards
 * 
 * This component:
 * 1. Parses the conversational_text into structured sections
 * 2. Integrates structured components (bull_case, bear_case, etc.) inline
 * 3. Renders everything in a cohesive, premium flowing layout
 * ============================================================================
 */

import React from "react";
import clsx from "clsx";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface WorldClassMessageProps {
    /** The conversational text from the LLM */
    conversationalText: string;
    /** Optional structured response components - accepts any ChatResponse type */
    response?: any;
}

// =============================================================================
// SUB-COMPONENTS - Matching Mockup Exactly
// =============================================================================

/** Framework Card - Light gray with criteria/methodology */
function FrameworkCard({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 my-4 border border-slate-200 dark:border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                {data.icon && <span>{data.icon}</span>}
                {data.title}
            </div>
            {data.subtitle && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{data.subtitle}</p>
            )}
            <div className="space-y-1.5">
                {(data.items || []).map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 mt-0.5">•</span>
                        <span className="leading-relaxed">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Bull Case Insight Card - Green left border */
function BullCaseCard({ data }: { data: any }) {
    // Backend uses 'items', compatibility with 'points' as fallback
    const items = data?.items || data?.points || [];
    if (!data || !items.length) return null;

    return (
        <div className="border-l-4 border-l-emerald-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15 dark:to-transparent">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span>📈</span>
                {data.title || `Bull Case ${data.upside ? `(+${data.upside}% upside)` : ''}`}
            </div>
            <ul className="space-y-1.5 ml-1">
                {items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span className="leading-relaxed">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Bear Case Insight Card - Red left border */
function BearCaseCard({ data }: { data: any }) {
    // Backend uses 'items', compatibility with 'points' as fallback
    const items = data?.items || data?.points || [];
    if (!data || !items.length) return null;

    return (
        <div className="border-l-4 border-l-red-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/15 dark:to-transparent">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span>📉</span>
                {data.title || `Bear Case ${data.downside ? `(-${data.downside}% downside)` : ''}`}
            </div>
            <ul className="space-y-1.5 ml-1">
                {items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span className="leading-relaxed">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Key Insight Card - 🎯 The single most important takeaway (8-Layer Guarantee) */
function KeyInsightCard({ data }: { data: any }) {
    if (!data) return null;

    // Support string or object format
    const content = typeof data === 'string' ? data : data.content || data.text || data.insight;
    if (!content) return null;

    return (
        <div className="border-l-4 border-l-violet-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-violet-50 to-violet-50/30 dark:from-violet-900/20 dark:to-transparent">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span>{typeof data === 'object' && data.title ? data.title : 'Key Insight'}</span>
            </div>
            <div
                className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{
                    __html: content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-violet-700 dark:text-violet-300">$1</strong>')
                }}
            />
        </div>
    );
}

/** Character Cards - Stock personality profiles with blue border */
function CharacterCards({ data }: { data: any }) {
    if (!data?.length) return null;
    return (
        <div className="space-y-3 my-4">
            {(data || []).map((card: any, idx: number) => (
                <div key={idx} className="border-l-4 border-l-sky-500 pl-4 py-3 pr-4 rounded-r-lg bg-gradient-to-r from-sky-50 to-sky-50/30 dark:from-sky-900/15 dark:to-transparent">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                        <span className="text-xl">{card.emoji}</span>
                        {card.ticker} ({card.nickname})
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                        <p><strong className="text-slate-700 dark:text-slate-200">The good:</strong> {Array.isArray(card.good) ? card.good.join(", ") : card.good}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">The bad:</strong> {Array.isArray(card.bad) ? card.bad.join(", ") : card.bad}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">The profile:</strong> {card.profile}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Macro Score Card - Prominent with factor breakdown */
function MacroScoreCard({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-800/10 border-2 border-sky-400 dark:border-sky-500/60 rounded-xl p-5 my-5">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🌍</span>
                        Egyptian Market Environment
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Weighted composite of key factors
                    </div>
                </div>
                <div className="text-4xl font-bold text-sky-600 dark:text-sky-400">
                    {data.score}/{data.max_score || 100}
                </div>
            </div>
            <div className="text-center text-base font-semibold text-sky-600 dark:text-sky-400 mb-4">
                Assessment: {data.assessment}
            </div>
            {data.factors && data.factors.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {(data.factors || []).map((factor: any, i: number) => (
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
            )}
        </div>
    );
}

/** Learning Section - Blue bordered educational box */
function LearningSection({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="border-l-4 border-l-sky-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-sky-50 to-sky-50/30 dark:from-sky-900/15 dark:to-transparent">
            <div className="font-semibold text-sky-700 dark:text-sky-300 text-sm mb-2 flex items-center gap-2">
                <span>📊</span>
                {data.title}
            </div>
            <ul className="space-y-1.5 ml-1">
                {(data.items || []).map((item: string, i: number) => {
                    const itemStr = typeof item === 'string' ? item : String(item || '');
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="text-sky-500 mt-0.5">•</span>
                            <span className="leading-relaxed" dangerouslySetInnerHTML={{
                                __html: itemStr.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                            }} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** Follow-Up Prompt - Soft gray box */
function FollowUpPrompt({ content }: { content: string }) {
    if (!content) return null;
    return (
        <div className="mt-4 px-4 py-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <p className="text-sm text-slate-600 dark:text-slate-400 italic flex items-start gap-2">
                <span>💡</span>
                <span>{content}</span>
            </p>
        </div>
    );
}

/** Disclaimer Card - Amber left border */
function DisclaimerCard({ content, title }: { content?: string; title?: string }) {
    const text = content || "This is market analysis for educational purposes, not personalized investment advice. Your decision should factor in your individual financial situation, risk tolerance, and investment timeline.";
    const displayTitle = title || "Educational Analysis";
    return (
        <div className="border-l-4 border-l-amber-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent">
            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-amber-700 dark:text-amber-400 font-semibold">⚠️ {displayTitle}:</strong>{" "}
                {text}
            </div>
        </div>
    );
}

/** Stock List Card - Premium stock cards with scores (Scenarios 2, 3) */
function StockListCard({ data }: { data: any }) {
    if (!data?.stocks?.length) return null;
    return (
        <div className="my-4 space-y-3">
            {data.title && (
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    {data.icon && <span>{data.icon}</span>}
                    {data.title}
                </div>
            )}
            {data.stocks.map((stock: any, idx: number) => (
                <div
                    key={idx}
                    className={`bg-white dark:bg-slate-800/60 rounded-xl p-4 border-2 transition-all hover:shadow-lg hover:scale-[1.01] ${stock.highlighted
                        ? 'border-emerald-400 dark:border-emerald-500/60 shadow-emerald-100 dark:shadow-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700/50'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-sky-600 dark:text-sky-400">{stock.ticker}</span>
                                {stock.badge && (
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold uppercase rounded-full">
                                        {stock.badge}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{stock.name}</div>
                            {stock.metrics && (
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    {stock.metrics.map((metric: string, i: number) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-md font-medium">
                                            {metric}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {stock.description && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <strong className="text-slate-700 dark:text-slate-200">Why it's a gem:</strong> {stock.description}
                                </div>
                            )}
                        </div>
                        {stock.score && (
                            <div className="text-right ml-4">
                                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stock.score}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Comparison Table Card - Peer comparison (Scenario 5) */
function ComparisonTableCard({ data }: { data: any }) {
    if (!data?.rows?.length || !data?.headers?.length) return null;
    return (
        <div className="my-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50">
            {data.title && (
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {data.icon && <span>{data.icon}</span>}
                        {data.title}
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                            {data.headers.map((header: string, idx: number) => (
                                <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/50">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800/30 divide-y divide-slate-100 dark:divide-slate-700/30">
                        {data.rows.map((row: any, rowIdx: number) => (
                            <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                {row.cells.map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className={`px-4 py-3 ${cell.highlight === 'positive' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                                        cell.highlight === 'negative' ? 'text-red-600 dark:text-red-400 font-semibold' :
                                            cell.highlight === 'primary' ? 'text-sky-600 dark:text-sky-400 font-bold' :
                                                'text-slate-700 dark:text-slate-300'
                                        }`}>
                                        {cell.value}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Educational Card - Metric explanations (Scenario 6) */
function EducationalCard({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-transparent px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                <div className="text-lg font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                    📚 {data.title}
                </div>
                {data.subtitle && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{data.subtitle}</div>
                )}
            </div>
            <div className="p-4 space-y-4">
                {data.definition && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.definition}</p>
                )}
                {data.formula && (
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border-l-4 border-l-sky-500">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Formula</div>
                        <code className="text-sm font-mono text-slate-800 dark:text-slate-200">{data.formula}</code>
                    </div>
                )}
                {data.example && (
                    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border-l-4 border-l-sky-500">
                        <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase mb-1">Example</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{data.example}</div>
                    </div>
                )}
                {data.sections && data.sections.map((section: any, idx: number) => (
                    <div key={idx} className="mt-3">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                            {section.icon && <span>{section.icon}</span>}
                            {section.title}
                        </div>
                        <ul className="space-y-1.5">
                            {section.items?.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <span className="text-sky-500 mt-0.5">•</span>
                                    <span className="leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Positives Card - Green "What's Working" section (Scenario 4) */
function PositivesCard({ data }: { data: any }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-l-4 border-l-emerald-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15 dark:to-transparent">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm mb-3 flex items-center gap-2">
                <span>🟢</span>
                {data.title || "What's Working (Positives)"}
            </div>
            <div className="space-y-3">
                {data.items.map((item: any, i: number) => (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-100">{item.label}:</strong> {item.detail}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Concerns Card - Red "Headwinds" section (Scenario 4) */
function ConcernsCard({ data }: { data: any }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-l-4 border-l-red-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/15 dark:to-transparent">
            <div className="font-semibold text-red-700 dark:text-red-300 text-sm mb-3 flex items-center gap-2">
                <span>🔴</span>
                {data.title || "Headwinds (The Concerns)"}
            </div>
            <div className="space-y-3">
                {data.items.map((item: any, i: number) => (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-100">{item.label}:</strong> {item.detail}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Mixed Signals Card - Yellow "Watch These" section (Scenario 4) */
function MixedSignalsCard({ data }: { data: any }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-l-4 border-l-amber-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent">
            <div className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-3 flex items-center gap-2">
                <span>🟡</span>
                {data.title || "Mixed Signals (Watch These)"}
            </div>
            <div className="space-y-3">
                {data.items.map((item: any, i: number) => (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-100">{item.label}:</strong> {item.detail}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Price Display Card - Current position/price (Scenario 1) */
function PriceDisplayCard({ data }: { data: any }) {
    if (!data) return null;
    const isPositive = data.change >= 0;
    return (
        <div className="my-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/60 dark:to-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                📊 {data.title || "Current Position"}
            </div>
            <div className="flex items-baseline gap-4 mb-3">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {data.currency || "EGP"} {data.price?.toLocaleString()}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${isPositive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                    {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{data.change?.toFixed(2)} ({data.changePercent?.toFixed(2)}%)
                </span>
            </div>
            {data.volume && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Volume: {data.volume?.toLocaleString()} shares
                    {data.volumeNote && <span className="text-emerald-600 dark:text-emerald-400 ml-1">({data.volumeNote})</span>}
                </div>
            )}
            {data.additionalInfo && (
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data.additionalInfo}</div>
            )}
        </div>
    );
}

/** Index Composition Card - EGX 30 sector breakdown (Scenario 9) */
function IndexCompositionCard({ data }: { data: any }) {
    if (!data?.sectors?.length) return null;
    return (
        <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-transparent px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            🏛️ {data.title || "Index Composition"}
                        </div>
                        {data.subtitle && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{data.subtitle}</div>
                        )}
                    </div>
                    {data.totalConstituents && (
                        <div className="text-right">
                            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{data.totalConstituents}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Constituents</div>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 space-y-4">
                {data.sectors.map((sector: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                                {sector.icon && <span>{sector.icon}</span>}
                                {sector.name}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{sector.weight}% weight</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sector.stocks?.map((stock: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md text-xs font-medium text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-600">
                                    {stock}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {data.topByWeight && (
                <div className="border-t border-slate-200 dark:border-slate-700/50 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Top 5 by Weight</div>
                    <div className="flex flex-wrap gap-2">
                        {data.topByWeight.map((item: any, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sm font-medium text-sky-700 dark:text-sky-300">
                                {item.ticker}: {item.weight}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Generic Insight Card - Flexible insight display */
function InsightCard({ data }: { data: any }) {
    if (!data) return null;
    const variant = data.variant || 'info'; // info, success, warning
    const borderColor = variant === 'success' ? 'border-l-emerald-500' : variant === 'warning' ? 'border-l-red-500' : 'border-l-sky-500';
    const bgGradient = variant === 'success'
        ? 'from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15'
        : variant === 'warning'
            ? 'from-red-50 to-red-50/30 dark:from-red-900/15'
            : 'from-sky-50 to-sky-50/30 dark:from-sky-900/15';

    return (
        <div className={`border-l-4 ${borderColor} pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r ${bgGradient} dark:to-transparent`}>
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                {data.icon && <span>{data.icon}</span>}
                {data.title}
            </div>
            {data.content && (
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                    {Array.isArray(data.content) ? data.content.map((para: string, i: number) => (
                        <p key={i} dangerouslySetInnerHTML={{
                            __html: para.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                        }} />
                    )) : (
                        <p dangerouslySetInnerHTML={{
                            __html: data.content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                        }} />
                    )}
                </div>
            )}
            {data.items && (
                <ul className="space-y-1.5 mt-2">
                    {data.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className={variant === 'success' ? 'text-emerald-500' : variant === 'warning' ? 'text-red-500' : 'text-sky-500'}>•</span>
                            <span className="leading-relaxed" dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                            }} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Warning Card - Cautionary information */
function WarningCard({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="border-l-4 border-l-amber-500 pl-4 py-3 pr-4 rounded-r-lg my-4 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent">
            <div className="font-semibold text-amber-700 dark:text-amber-400 text-sm mb-2 flex items-center gap-2">
                ⚠️ {data.title}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                {Array.isArray(data.content) ? data.content.map((para: string, i: number) => (
                    <p key={i} dangerouslySetInnerHTML={{
                        __html: para.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                    }} />
                )) : (
                    <p dangerouslySetInnerHTML={{
                        __html: (data.content || '').replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                    }} />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// TEXT PARSING UTILITIES
// =============================================================================

/** Parse markdown-style bold text */
function parseBoldText(text: string): React.ReactNode {
    if (!text) return null;

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={i} className="font-semibold text-slate-900 dark:text-white">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
}

/** Parse a line and return the appropriate element */
function parseLine(line: string, idx: number): React.ReactNode {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) return null;

    // Header line (starts and ends with **)
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
        return (
            <h4 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-2">
                {trimmed.slice(2, -2)}
            </h4>
        );
    }

    // Bullet point
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        const content = trimmed.replace(/^[-•]\s*/, "");
        return (
            <div key={idx} className="flex items-start gap-2 ml-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span className="leading-relaxed">{parseBoldText(content)}</span>
            </div>
        );
    }

    // Numbered list item
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
        return (
            <div key={idx} className="flex items-start gap-2 ml-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400 font-medium w-5 flex-shrink-0">{numberedMatch[1]}.</span>
                <span className="leading-relaxed">{parseBoldText(numberedMatch[2])}</span>
            </div>
        );
    }

    // Regular paragraph
    return (
        <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {parseBoldText(trimmed)}
        </p>
    );
}

/** Parse the entire conversational text into structured blocks */
function parseConversationalText(text: string): React.ReactNode[] {
    if (!text) return [];

    const elements: React.ReactNode[] = [];
    const lines = text.split("\n");
    let inParagraph = false;
    let paragraphLines: string[] = [];

    const flushParagraph = () => {
        if (paragraphLines.length > 0) {
            const combinedText = paragraphLines.join(" ");
            elements.push(
                <p key={`para-${elements.length}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
                    {parseBoldText(combinedText)}
                </p>
            );
            paragraphLines = [];
        }
    };

    lines.forEach((line, idx) => {
        const trimmed = line.trim();

        // Empty line ends current paragraph
        if (!trimmed) {
            flushParagraph();
            return;
        }

        // Headers, bullets, and numbered items are separate
        if (
            (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) ||
            trimmed.startsWith("- ") ||
            trimmed.startsWith("• ") ||
            /^\d+\.\s+/.test(trimmed)
        ) {
            flushParagraph();
            elements.push(parseLine(line, idx));
            return;
        }

        // Add to current paragraph
        paragraphLines.push(trimmed);
    });

    flushParagraph();

    return elements.filter(Boolean);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WorldClassMessage({ conversationalText, response }: WorldClassMessageProps) {
    // Parse the conversational text
    const textElements = parseConversationalText(conversationalText);

    // Check if we have any structured data to render
    const hasStructuredData = response?.bull_case || response?.bear_case ||
        response?.macro_score || response?.learning_section ||
        response?.stock_list || response?.comparison_table ||
        response?.educational_card || response?.positives ||
        response?.concerns || response?.mixed_signals ||
        response?.price_display || response?.index_composition ||
        response?.key_insight;

    // Check for disclaimer in text to avoid duplication
    const hasInlineDisclaimer = conversationalText?.toLowerCase().includes("educational analysis") ||
        conversationalText?.toLowerCase().includes("not investment advice") ||
        conversationalText?.toLowerCase().includes("methodology note") ||
        conversationalText?.toLowerCase().includes("important context") ||
        conversationalText?.toLowerCase().includes("liquidity warning") ||
        conversationalText?.includes("⚠️");

    return (
        <div className="space-y-1">
            {/* ============================================================
                LAYER 1: OPENING TEXT + FRAMEWORK CARD
                Narrative introduction with optional methodology card
               ============================================================ */}
            {response?.framework_card && textElements.length > 0 && (
                <>
                    {textElements[0]}
                    <FrameworkCard data={response.framework_card} />
                    {textElements.slice(1)}
                </>
            )}

            {/* No framework card - just render text */}
            {!response?.framework_card && textElements}

            {/* ============================================================
                LAYER 2: PRICE & POSITION DATA
                Current position card for stock queries (Scenario 1)
               ============================================================ */}
            <PriceDisplayCard data={response?.price_display} />

            {/* ============================================================
                LAYER 3: MACRO ENVIRONMENT SCORE
                Market environment scorecard (Scenarios 4, 10)
               ============================================================ */}
            <MacroScoreCard data={response?.macro_score} />

            {/* ============================================================
                LAYER 4: STOCK LISTS & RANKINGS
                Undervalued stocks, hidden gems (Scenarios 2, 3)
               ============================================================ */}
            <StockListCard data={response?.stock_list} />

            {/* ============================================================
                LAYER 5: COMPARISON TABLES
                Peer comparison data (Scenario 5)
               ============================================================ */}
            <ComparisonTableCard data={response?.comparison_table} />

            {/* ============================================================
                LAYER 6: INDEX COMPOSITION
                EGX 30 constituents breakdown (Scenario 9)
               ============================================================ */}
            <IndexCompositionCard data={response?.index_composition} />

            {/* ============================================================
                LAYER 7: EDUCATIONAL CONTENT
                Metric definitions and explanations (Scenario 6)
               ============================================================ */}
            <EducationalCard data={response?.educational_card} />

            {/* ============================================================
                LAYER 8: BULL/BEAR CASES
                Investment thesis with upside/downside (Scenarios 1, 7)
               ============================================================ */}
            <BullCaseCard data={response?.bull_case} />
            <BearCaseCard data={response?.bear_case} />

            {/* ============================================================
                LAYER 8.5: KEY INSIGHT
                🎯 Single most actionable takeaway (8-Layer Guarantee)
               ============================================================ */}
            <KeyInsightCard data={response?.key_insight} />

            {/* ============================================================
                LAYER 9: POSITIVES/MIXED/CONCERNS
                Traffic light analysis (Scenario 4)
               ============================================================ */}
            <PositivesCard data={response?.positives} />
            <MixedSignalsCard data={response?.mixed_signals} />
            <ConcernsCard data={response?.concerns} />

            {/* ============================================================
                LAYER 10: GENERIC INSIGHTS
                Flexible insight cards for various scenarios
               ============================================================ */}
            {response?.insights?.map((insight: any, idx: number) => (
                <InsightCard key={`insight-${idx}`} data={insight} />
            ))}

            {/* ============================================================
                LAYER 11: WARNING CARDS
                Reality checks, cautionary notes (Scenario 3)
               ============================================================ */}
            <WarningCard data={response?.warning_card} />

            {/* ============================================================
                LAYER 12: CHARACTER CARDS
                Stock personality profiles (Scenario 5)
               ============================================================ */}
            <CharacterCards data={response?.character_cards} />

            {/* ============================================================
                LAYER 13: LEARNING SECTION
                Educational bullet points (4-Layer guarantee)
               ============================================================ */}
            <LearningSection data={response?.learning_section} />

            {/* ============================================================
                LAYER 14: DISCLAIMER
                Amber-bordered warning (4-Layer guarantee)
                Always show if we have structured data AND no inline disclaimer
               ============================================================ */}
            {!hasInlineDisclaimer && hasStructuredData && (
                <DisclaimerCard
                    content={response?.disclaimer}
                    title={response?.disclaimer_title}
                />
            )}

            {/* ============================================================
                LAYER 15: FOLLOW-UP PROMPT
                Next action suggestion (4-Layer guarantee)
               ============================================================ */}
            <FollowUpPrompt content={response?.follow_up_prompt || ""} />
        </div>
    );
}

export default WorldClassMessage;

