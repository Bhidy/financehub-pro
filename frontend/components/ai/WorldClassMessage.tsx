"use client";

/**
 * ============================================================================
 * WORLD-CLASS MESSAGE RENDERER (RTL/LTR SUPPORTED)
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
 * 4. FULL RTL SUPPORT: Uses logical properties (ps, pe, ms, me, border-s)
 * ============================================================================
 */

import React from "react";
import clsx from "clsx";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

import { translations, Language } from "@/app/mobile-ai-analyst/translations";

interface WorldClassMessageProps {
    /** The conversational text from the LLM */
    conversationalText: string;
    /** Optional structured response components - accepts any ChatResponse type */
    response?: any;
    /** Language for translations */
    lang?: Language;
}

// =============================================================================
// SUB-COMPONENTS - Matching Mockup Exactly (With Logical Props)
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

/** Bull Case Insight Card - Green start border */
function BullCaseCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    // Backend uses 'items', compatibility with 'points' as fallback
    const items = data?.items || data?.points || [];
    if (!data || !items.length) return null;

    // Detect if content is Arabic for fallback title
    const fallbackTitle = lang === 'ar'
        ? `${translations.ar.chat.bullCase} ${data.upside ? `(+${data.upside}% ${translations.ar.chat.upside})` : ''}`
        : `${translations.en.chat.bullCase} ${data.upside ? `(+${data.upside}% ${translations.en.chat.upside})` : ''}`;

    return (
        <div className="border-s-4 border-s-emerald-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span>📈</span>
                {data.title || fallbackTitle}
            </div>
            <ul className="space-y-1.5 ms-1">
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

/** Bear Case Insight Card - Red start border */
function BearCaseCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    // Backend uses 'items', compatibility with 'points' as fallback
    const items = data?.items || data?.points || [];
    if (!data || !items.length) return null;

    // Detect if content is Arabic for fallback title
    const fallbackTitle = lang === 'ar'
        ? `${translations.ar.chat.bearCase} ${data.downside ? `(-${data.downside}% ${translations.ar.chat.downside})` : ''}`
        : `${translations.en.chat.bearCase} ${data.downside ? `(-${data.downside}% ${translations.en.chat.downside})` : ''}`;

    return (
        <div className="border-s-4 border-s-red-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span>📉</span>
                {data.title || fallbackTitle}
            </div>
            <ul className="space-y-1.5 ms-1">
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
function KeyInsightCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data) return null;

    // Support string or object format
    const content = typeof data === 'string' ? data : data.content || data.text || data.insight;
    if (!content) return null;

    return (
        <div className="border-s-4 border-s-violet-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-violet-50 to-violet-50/30 dark:from-violet-900/20 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span>{typeof data === 'object' && data.title ? data.title : translations[lang].chat.keyInsight}</span>
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
function CharacterCards({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data?.length) return null;
    return (
        <div className="space-y-3 my-4">
            {(data || []).map((card: any, idx: number) => (
                <div key={idx} className="border-s-4 border-s-sky-500 ps-4 py-3 pe-4 rounded-e-lg bg-gradient-to-r from-sky-50 to-sky-50/30 dark:from-sky-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                        <span className="text-xl">{card.emoji}</span>
                        {card.ticker} ({card.nickname})
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                        <p><strong className="text-slate-700 dark:text-slate-200">{translations[lang].chat.good}</strong> {Array.isArray(card.good) ? card.good.join(", ") : card.good}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">{translations[lang].chat.bad}</strong> {Array.isArray(card.bad) ? card.bad.join(", ") : card.bad}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">{translations[lang].chat.profile}</strong> {card.profile}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Macro Score Card - Prominent with factor breakdown */
function MacroScoreCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data) return null;
    return (
        <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-800/10 ltr:bg-gradient-to-r rtl:bg-gradient-to-l border-2 border-sky-400 dark:border-sky-500/60 rounded-xl p-5 my-5">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🌍</span>
                        {translations[lang].chat.marketEnv}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {translations[lang].chat.weighted}
                    </div>
                </div>
                <div className="text-4xl font-bold text-sky-600 dark:text-sky-400">
                    {data.score}/{data.max_score || 100}
                </div>
            </div>
            <div className="text-center text-base font-semibold text-sky-600 dark:text-sky-400 mb-4">
                {translations[lang].chat.assessment} {data.assessment}
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
        <div className="border-s-4 border-s-sky-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-sky-50 to-sky-50/30 dark:from-sky-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-sky-700 dark:text-sky-300 text-sm mb-2 flex items-center gap-2">
                <span>📊</span>
                {data.title}
            </div>
            <ul className="space-y-1.5 ms-1">
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



/** Disclaimer Card - Amber start border */
function DisclaimerCard({ content, title, lang = 'en' }: { content?: string; title?: string, lang?: Language }) {
    const text = content || translations[lang].chat.disclaimer;
    const displayTitle = title || translations[lang].chat.eduAnalysis;
    return (
        <div className="border-s-4 border-s-amber-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-amber-700 dark:text-amber-400 font-semibold">⚠️ {displayTitle}:</strong>{" "}
                {text}
            </div>
        </div>
    );
}

/** Stock List Card - Premium stock cards with scores (Scenarios 2, 3) */
function StockListCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
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
                                    <strong className="text-slate-700 dark:text-slate-200">{translations[lang].chat.whyGem}</strong> {stock.description}
                                </div>
                            )}
                        </div>
                        {stock.score && (
                            <div className="text-end ms-4">
                                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stock.score}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{translations[lang].chat.score}</div>
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
                                <th key={idx} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/50">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800/30 divide-y divide-slate-100 dark:divide-slate-700/30">
                        {data.rows.map((row: any, rowIdx: number) => (
                            <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                {row.cells.map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className={`px-4 py-3 text-start ${cell.highlight === 'positive' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
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
function EducationalCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data) return null;
    return (
        <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
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
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border-s-4 border-s-sky-500">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{translations[lang].chat.formula}</div>
                        <code className="text-sm font-mono text-slate-800 dark:text-slate-200 dir-ltr block text-start">{data.formula}</code>
                    </div>
                )}
                {data.example && (
                    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border-s-4 border-s-sky-500">
                        <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase mb-1">{translations[lang].chat.example}</div>
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
function PositivesCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-s-4 border-s-emerald-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm mb-3 flex items-center gap-2">
                <span>🟢</span>
                {data.title || translations[lang].chat.working}
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
function ConcernsCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-s-4 border-s-red-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-red-700 dark:text-red-300 text-sm mb-3 flex items-center gap-2">
                <span>🔴</span>
                {data.title || translations[lang].chat.concerns}
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
function MixedSignalsCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data?.items?.length) return null;
    return (
        <div className="border-s-4 border-s-amber-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
            <div className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-3 flex items-center gap-2">
                <span>🟡</span>
                {data.title || translations[lang].chat.mixed}
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
function PriceDisplayCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data) return null;
    const isPositive = data.change >= 0;
    return (
        <div className="my-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/60 dark:to-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                📊 {data.title || translations[lang].chat.currentPos}
            </div>
            <div className="flex items-baseline gap-4 mb-3">
                <span className="text-4xl font-bold text-slate-900 dark:text-white dir-ltr">
                    {data.currency || "EGP"} {data.price?.toLocaleString()}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold dir-ltr ${isPositive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                    {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{data.change?.toFixed(2)} ({data.changePercent?.toFixed(2)}%)
                </span>
            </div>
            {data.volume && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {translations[lang].chat.volume} <span className="dir-ltr inline-block">{data.volume?.toLocaleString()}</span> {translations[lang].chat.shares}
                    {data.volumeNote && <span className="text-emerald-600 dark:text-emerald-400 ms-1">({data.volumeNote})</span>}
                </div>
            )}
            {data.additionalInfo && (
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data.additionalInfo}</div>
            )}
        </div>
    );
}

/** Index Composition Card - EGX 30 sector breakdown (Scenario 9) */
function IndexCompositionCard({ data, lang = 'en' }: { data: any, lang?: Language }) {
    if (!data?.sectors?.length) return null;
    return (
        <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            🏛️ {data.title || translations[lang].chat.indexComposition}
                        </div>
                        {data.subtitle && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{data.subtitle}</div>
                        )}
                    </div>
                    {data.totalConstituents && (
                        <div className="text-end">
                            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{data.totalConstituents}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{translations[lang].chat.constituents}</div>
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
                            <span className="text-xs text-slate-500 dark:text-slate-400">{sector.weight}% {translations[lang].chat.weight}</span>
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
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">{translations[lang].chat.topByWeight}</div>
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
    const borderColor = variant === 'success' ? 'border-s-emerald-500' : variant === 'warning' ? 'border-s-red-500' : 'border-s-sky-500';
    const bgGradient = variant === 'success'
        ? 'from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15'
        : variant === 'warning'
            ? 'from-red-50 to-red-50/30 dark:from-red-900/15'
            : 'from-sky-50 to-sky-50/30 dark:from-sky-900/15';

    return (
        <div className={`border-s-4 ${borderColor} ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r ${bgGradient} dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l`}>
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
        <div className="border-s-4 border-s-amber-500 ps-4 py-3 pe-4 rounded-e-lg my-4 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-900/15 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l">
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
            <h4 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-6 mb-3 leading-snug tracking-tight">
                {trimmed.slice(2, -2)}
            </h4>
        );
    }

    // Bullet point
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        const content = trimmed.replace(/^[-•]\s*/, "");
        return (
            <div key={idx} className="flex items-start gap-3 ms-1 text-sm text-slate-600 dark:text-slate-300 my-1.5">
                <span className="text-slate-400 dark:text-slate-500 mt-1.5 text-xs">•</span>
                <span className="leading-relaxed">{parseBoldText(content)}</span>
            </div>
        );
    }

    // Numbered list item
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
        return (
            <div key={idx} className="flex items-start gap-3 ms-1 text-sm text-slate-600 dark:text-slate-300 my-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-bold w-4 flex-shrink-0 mt-0.5 text-xs">{numberedMatch[1]}.</span>
                <span className="leading-relaxed">{parseBoldText(numberedMatch[2])}</span>
            </div>
        );
    }

    // Regular paragraph
    return (
        <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-7 my-3">
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

export function WorldClassMessage({ conversationalText, response, lang = 'en' }: WorldClassMessageProps) {
    // Parse the conversational text
    const textElements = parseConversationalText(conversationalText);

    // Check if we have any structured data to render
    const hasStructuredData = response?.bull_case || response?.bear_case ||
        response?.macro_score || response?.learning_section ||
        response?.stock_list || response?.comparison_table ||
        response?.educational_card || response?.positives ||
        response?.concerns || response?.mixed_signals ||
        response?.price_display || response?.index_composition ||
        response?.key_insight || response?.character_cards || response?.educational_cards; // Added educational_cards and character_cards

    // Check for disclaimer in text to avoid duplication
    const hasInlineDisclaimer = conversationalText?.toLowerCase().includes("educational analysis") ||
        conversationalText?.toLowerCase().includes("not investment advice") ||
        conversationalText?.toLowerCase().includes("methodology note") ||
        conversationalText?.toLowerCase().includes("important context") ||
        conversationalText?.toLowerCase().includes("liquidity warning") ||
        conversationalText?.includes("⚠️");

    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    const fontClass = lang === 'ar' ? 'font-arabic' : '';

    return (
        <div
            className={`w-full text-start ${fontClass} bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 md:p-6 transition-all duration-300 hover:shadow-md`}
            dir={direction}
            lang={lang}
        >
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

            {/* If no framework section, just render the text (Standard flow) */}
            {!response?.framework_card && textElements}

            {/* ============================================================
                LAYER 2: PREMIUM DATA & INSIGHT COMPONENTS
                Rendered sequentially based on response structure
               ============================================================ */}

            {/* Quick Stats / Price (Scenario 1) */}
            {response?.price_display && (
                <PriceDisplayCard data={response.price_display} lang={lang} />
            )}

            {/* Character Cards (Scenario 8) */}
            {response?.character_cards && (
                <CharacterCards data={response.character_cards} lang={lang} />
            )}

            {/* Macro Score (Scenario 7) */}
            {response?.macro_score && (
                <MacroScoreCard data={response.macro_score} lang={lang} />
            )}

            {/* Key Insight (8-Layer Guarantee) */}
            {response?.key_insight && (
                <KeyInsightCard data={response.key_insight} lang={lang} />
            )}

            {/* Bull/Bear Cases (Scenario 1) - Side by Side on Desktop, Stacked on Mobile? 
                Mockup shows them stacked usually. */}
            {response?.bull_case && <BullCaseCard data={response.bull_case} lang={lang} />}
            {response?.bear_case && <BearCaseCard data={response.bear_case} lang={lang} />}

            {/* Comparison Tables (Scenario 5) */}
            {response?.comparison_table && (
                <ComparisonTableCard data={response.comparison_table} />
            )}

            {/* Stock Lists (Scenarios 2, 3) */}
            {response?.stock_list && (
                <StockListCard data={response.stock_list} lang={lang} />
            )}

            {/* Scenario 4: Pros/Cons/Mixed */}
            {response?.positives && <PositivesCard data={response.positives} lang={lang} />}
            {response?.concerns && <ConcernsCard data={response.concerns} lang={lang} />}
            {response?.mixed_signals && <MixedSignalsCard data={response.mixed_signals} lang={lang} />}

            {/* Educational/Formula Cards (Scenario 6) */}
            {response?.educational_cards && response.educational_cards.map((card: any, idx: number) => (
                <EducationalCard key={idx} data={card} lang={lang} />
            ))}
            {response?.educational_card && !response.educational_cards && (
                <EducationalCard data={response.educational_card} lang={lang} />
            )}

            {/* Index Composition (Scenario 9) */}
            {response?.index_composition && (
                <IndexCompositionCard data={response.index_composition} lang={lang} />
            )}

            {/* ============================================================
                LAYER 3: LEARNING SECTION (Educational Footer)
               ============================================================ */}
            {response?.learning_section && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <LearningSection data={response.learning_section} />
                </div>
            )}

            {/* ============================================================
                LAYER 4: DISCLAIMER (Regulatory Compliance)
               ============================================================ */}
            {(!hasInlineDisclaimer || response?.disclaimer_card) && (
                <DisclaimerCard
                    content={response?.disclaimer_card?.content}
                    title={response?.disclaimer_card?.title}
                    lang={lang}
                />
            )}

            {/* ============================================================
                LAYER 5: FOLLOW-UP (Conversation Driver)
                MOVED TO PARENT COMPONENT FOR POSITIONING CONTROL
               ============================================================ */}
        </div>
    );
}

/** Follow-Up Prompt - Soft gray box */
export function FollowUpPrompt({ content }: { content: string }) {
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
