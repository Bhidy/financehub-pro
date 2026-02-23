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

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ScoreBreakdownCard } from "./ScoreBreakdownCard";
import { GemListCard } from "./GemListCard";
import { UndervaluedScreenCard } from "./UndervaluedScreenCard";
import { ChartCard } from "./ChartCard";
import { ChatCards } from "./ChatCards";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

import { translations, Language } from "@/components/chatbot/translations";

interface StructuredNarrative {
    personal_greeting?: string;
    context_bridge?: string;
    human_opening?: string;
    core_narrative: string;
    key_insight?: string;
    risk_warning?: string;
    follow_up_prompt?: string;
}

interface WorldClassMessageProps {
    /** The conversational text from the LLM */
    conversationalText: string;
    /** Optional structured response components - accepts any ChatResponse type */
    response?: any & { structured_narrative?: StructuredNarrative };
    /** Language for translations */
    lang?: Language;
    /** Whether this is the latest active message (animates) */
    isLatest?: boolean;
    /** Callback to notify parent of typing progress for auto-scrolling */
    onTyping?: () => void;
    /** Callback to notify parent when typing completes */
    onTypingComplete?: () => void;
}

const ARABIC_METRIC_LABELS: Record<string, string> = {
    "p/e": "مضاعف الربحية",
    "pe": "مضاعف الربحية",
    "p/b": "مضاعف القيمة الدفترية",
    "pb": "مضاعف القيمة الدفترية",
    "roe": "العائد على حقوق الملكية",
    "roa": "العائد على الأصول",
    "eps": "ربحية السهم",
    "ev/ebitda": "قيمة المنشأة إلى الأرباح التشغيلية",
    "ev/sales": "قيمة المنشأة إلى المبيعات",
    "div yield": "عائد التوزيعات",
    "yield": "العائد",
    "score": "النتيجة",
    "factor": "العامل",
    "metric": "المؤشر",
    "valuation": "التقييم",
    "market breadth": "اتساع السوق",
    "income potential": "جاذبية الدخل",
    "asset values": "قيم الأصول",
    "liquidity": "السيولة",
    "banks": "البنوك",
    "real estate": "العقارات",
    "financial services": "الخدمات المالية",
    "food & beverage": "الأغذية والمشروبات",
    "industrial goods & services": "السلع والخدمات الصناعية",
    "telecommunications": "الاتصالات",
    "healthcare & pharmaceuticals": "الرعاية الصحية والأدوية",
    "construction & materials": "التشييد ومواد البناء",
    "travel & leisure": "السياحة والترفيه",
    "other": "قطاعات أخرى",
};

const ARABIC_REPLACEMENTS: Array<[string, string]> = [
    ["N/A", "غير متاح"],
    ["No Data", "لا توجد بيانات"],
    ["No data", "لا توجد بيانات"],
    ["P/E", "مضاعف الربحية"],
    ["P/B", "مضاعف القيمة الدفترية"],
    ["ROE", "العائد على حقوق الملكية"],
    ["ROA", "العائد على الأصول"],
    ["EPS", "ربحية السهم"],
    ["EV/EBITDA", "قيمة المنشأة إلى الأرباح التشغيلية"],
    ["EV/Sales", "قيمة المنشأة إلى المبيعات"],
    ["Yield", "العائد"],
    ["Score", "النتيجة"],
    ["Valuation", "التقييم"],
    ["Market Breadth", "اتساع السوق"],
    ["Income Potential", "جاذبية الدخل"],
    ["Asset Values", "قيم الأصول"],
    ["Liquidity", "السيولة"],
    ["Constructive", "إيجابي"],
    ["Mixed", "مختلط"],
    ["Caution", "حذر"],
    ["Risk-Off", "تجنب المخاطر"],
    ["EGP", "جنيه"],
    ["USD", "دولار"],
];

const ARABIC_BLOCKED_TOKENS = new Set([
    "PE", "PB", "ROE", "ROA", "EPS", "EBITDA", "EV",
    "YTD", "Q1", "Q2", "Q3", "Q4", "FY", "GDP", "PMI",
    "N", "A"
]);

// Keys that are control/structural (not user-facing text). We must preserve them
// or we will break rendering logic/actions in Arabic mode.
const ARABIC_STRUCTURAL_KEYS = new Set([
    "type",
    "variant",
    "status",
    "highlight",
    "direction",
    "format",
    "trend",
    "signal",
    "border_color",
    "action_type",
    "payload",
    "intent",
    "backend_version",
    "as_of",
    "query",
    "id",
    "timestamp",
    "symbol",
    "ticker",
    "market_code",
    "currency",
    "logo_url",
]);

function localizeMetricLabel(label: string, lang: Language = "en"): string {
    if (!label) return label;
    if (lang !== "ar") return label;
    const mapped = ARABIC_METRIC_LABELS[label.trim().toLowerCase()];
    return mapped || sanitizeArabicString(label);
}

function isTickerLikeToken(token: string): boolean {
    const clean = token.replace(/[^A-Za-z0-9]/g, "");
    if (!clean) return false;
    if (ARABIC_BLOCKED_TOKENS.has(clean.toUpperCase())) return false;
    return /^[A-Z0-9]{1,6}$/.test(clean);
}

function sanitizeArabicString(value: string): string {
    if (!value) return value;
    let out = String(value);

    for (const [en, ar] of ARABIC_REPLACEMENTS) {
        out = out.replaceAll(en, ar);
    }

    out = out.replace(/[A-Za-z][A-Za-z0-9/\-.]*/g, (token) => {
        return isTickerLikeToken(token) ? token : "";
    });

    out = out
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([،,.!?:؛])/g, "$1")
        .trim();

    return out || "غير متاح";
}

function sanitizeArabicPayload<T = any>(value: T, fieldKey?: string): T {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
        if (fieldKey && ARABIC_STRUCTURAL_KEYS.has(fieldKey)) return value;
        return sanitizeArabicString(value) as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeArabicPayload(item, fieldKey)) as T;
    }
    if (typeof value === "object") {
        const result: Record<string, any> = {};
        Object.entries(value as Record<string, any>).forEach(([k, v]) => {
            if (ARABIC_STRUCTURAL_KEYS.has(k)) {
                // Preserve structural/control fields exactly.
                result[k] = v;
            } else {
                result[k] = sanitizeArabicPayload(v, k);
            }
        });
        return result as T;
    }
    return value;
}

function toCompactDisplay(value: any, lang: Language = "en"): string {
    if (value === null || value === undefined || value === "") return lang === "ar" ? "غير متاح" : "N/A";
    if (typeof value === "string") return lang === "ar" ? sanitizeArabicString(value) : value;
    if (typeof value !== "number" || Number.isNaN(value)) return String(value);
    if (Math.abs(value) >= 1_000_000_000) return lang === "ar" ? `${(value / 1_000_000_000).toFixed(2)} مليار` : `${(value / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(value) >= 1_000_000) return lang === "ar" ? `${(value / 1_000_000).toFixed(2)} مليون` : `${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return lang === "ar" ? `${(value / 1_000).toFixed(2)} ألف` : `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(2);
}

function normalizeStockListData(stockList: any, lang: Language = "en"): any {
    if (!stockList) return null;
    const rawStocks = Array.isArray(stockList) ? stockList : (stockList.stocks || []);
    if (!Array.isArray(rawStocks) || rawStocks.length === 0) return null;

    return {
        title: lang === "ar" ? sanitizeArabicString(String(stockList?.title || "")) : stockList?.title,
        icon: stockList?.icon,
        stocks: rawStocks.map((s: any) => {
            const metricsRaw = s?.metrics || {};
            const metrics = Array.isArray(metricsRaw)
                ? metricsRaw.map((m: any) => (lang === "ar" ? sanitizeArabicString(String(m)) : m))
                : Object.entries(metricsRaw).map(([k, v]) => {
                    const keyLabel = localizeMetricLabel(String(k), lang);
                    const valueLabel = lang === "ar" ? sanitizeArabicString(String(v ?? "غير متاح")) : String(v ?? "N/A");
                    return `${keyLabel}: ${valueLabel}`;
                });
            return {
                ...s,
                name: lang === "ar"
                    ? sanitizeArabicString(String(s?.name || s?.company_name || s?.companyName || s?.title || s?.ticker || "غير متاح"))
                    : (s?.name || s?.company_name || s?.companyName || s?.title || s?.ticker),
                metrics,
                description: lang === "ar"
                    ? sanitizeArabicString(String(s?.description || s?.why_its_a_gem || s?.why || ""))
                    : (s?.description || s?.why_its_a_gem || s?.why || ""),
            };
        }),
    };
}

function normalizeMacroScoreData(macro: any, lang: Language = "en"): any {
    if (!macro) return null;
    const factors = Array.isArray(macro?.factors) ? macro.factors.map((f: any) => ({
        ...f,
        label: localizeMetricLabel(String(f?.label || f?.name || (lang === "ar" ? "العامل" : "Factor")), lang),
        detail: lang === "ar" ? sanitizeArabicString(String(f?.detail || "")) : f?.detail,
    })) : [];
    return { ...macro, factors };
}

function normalizeComparisonData(table: any, lang: Language = "en"): any {
    if (!table) return null;
    const headers = table?.headers || [];
    const rows = table?.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Shape A: already cells-based
    if (rows[0]?.cells) {
        return {
            ...table,
            headers: lang === "ar" ? headers.map((h: string) => localizeMetricLabel(String(h), lang)) : headers,
            rows
        };
    }

    // Shape B: metric + values[]
    return {
        ...table,
        headers: lang === "ar" ? headers.map((h: string) => localizeMetricLabel(String(h), lang)) : headers,
        rows: rows.map((row: any) => {
            const values = Array.isArray(row?.values) ? row.values : [];
            return {
                cells: [
                    { value: localizeMetricLabel(String(row?.metric || row?.label || (lang === "ar" ? "المؤشر" : "Metric")), lang), highlight: "primary" },
                    ...values.map((v: any, idx: number) => ({
                        value: typeof v === "number"
                            ? toCompactDisplay(v, lang)
                            : (lang === "ar" ? sanitizeArabicString(String(v ?? "غير متاح")) : String(v ?? "N/A")),
                        highlight: row?.winner_symbol && headers[idx + 1] === row.winner_symbol ? "positive" : undefined
                    }))
                ]
            };
        })
    };
}

function normalizeIndexCompositionData(indexData: any, lang: Language = "en"): any {
    if (!indexData) return null;
    const sectors = Array.isArray(indexData?.sectors) ? indexData.sectors.map((s: any) => {
        const weightRaw = s?.weight;
        const parsed = typeof weightRaw === "string" ? parseFloat(weightRaw.replace("%", "")) : Number(weightRaw);
        return {
            ...s,
            name: lang === "ar" ? localizeMetricLabel(String(s?.name || s?.sector || "قطاع"), lang) : (s?.name || s?.sector),
            weight: Number.isFinite(parsed) ? parsed : weightRaw,
            stocks: s?.stocks || s?.constituents || [],
            constituents: s?.constituents || s?.stocks || [],
        };
    }) : [];

    const topByWeight = Array.isArray(indexData?.topByWeight)
        ? indexData.topByWeight
        : (Array.isArray(indexData?.top_by_weight) ? indexData.top_by_weight : []);

    return {
        ...indexData,
        title: lang === "ar"
            ? sanitizeArabicString(String(indexData?.title || indexData?.index_name || "مكونات المؤشر"))
            : (indexData?.title || indexData?.index_name || "Index Composition"),
        sectors,
        topByWeight: topByWeight.map((x: any) => {
            const parsed = typeof x?.weight === "string" ? parseFloat(x.weight.replace("%", "")) : Number(x?.weight);
            return {
                ...x,
                weight: Number.isFinite(parsed) ? parsed : x?.weight,
            };
        }),
        totalConstituents: indexData?.totalConstituents || indexData?.total_constituents || undefined,
    };
}

function normalizeDataCardToPriceDisplay(dataCard: any, lang: Language = "en"): any {
    if (!dataCard) return null;
    const priceRaw = dataCard?.price;
    const changeRaw = dataCard?.change;
    const priceNum = parseFloat(String(priceRaw ?? "").replace(/[^0-9.-]/g, ""));

    let changeNum = 0;
    let changePct = 0;
    if (typeof changeRaw === "string") {
        const numMatches = changeRaw.match(/-?\d+(\.\d+)?/g) || [];
        changeNum = numMatches[0] ? parseFloat(numMatches[0]) : 0;
        changePct = numMatches[1] ? parseFloat(numMatches[1]) : 0;
    } else if (typeof changeRaw === "number") {
        changeNum = changeRaw;
    }

    return {
        title: lang === "ar"
            ? sanitizeArabicString(String(dataCard?.label || dataCard?.title || "السعر الحالي"))
            : (dataCard?.label || dataCard?.title),
        currency: lang === "ar"
            ? sanitizeArabicString(String((typeof priceRaw === "string" && /[A-Za-z]{3}/.exec(priceRaw)?.[0]) || "جنيه"))
            : ((typeof priceRaw === "string" && /[A-Za-z]{3}/.exec(priceRaw)?.[0]) || "EGP"),
        price: Number.isFinite(priceNum) ? priceNum : undefined,
        change: changeNum,
        changePercent: changePct,
        additionalInfo: lang === "ar"
            ? sanitizeArabicString(String(dataCard?.volume_context || ""))
            : dataCard?.volume_context,
    };
}

function normalizeFrameworkCard(data: any, lang: Language = "en"): any {
    if (!data) return null;
    if (Array.isArray(data?.items)) {
        return {
            icon: data?.icon || "📊",
            title: lang === "ar"
                ? sanitizeArabicString(String(data?.title || "إطار التحليل"))
                : (data?.title || "Framework"),
            subtitle: lang === "ar"
                ? sanitizeArabicString(String(data?.subtitle || data?.description || ""))
                : (data?.subtitle || data?.description),
            items: lang === "ar"
                ? (data?.items || []).map((item: string) => sanitizeArabicString(String(item)))
                : data?.items,
            border_color: data?.border_color || "blue",
        };
    }

    const criteria = Array.isArray(data?.criteria)
        ? data.criteria
            .map((c: any) => {
                if (typeof c === "string") return lang === "ar" ? sanitizeArabicString(c) : c;
                const label = c?.label ? String(c.label).trim() : "";
                const value = c?.value ? String(c.value).trim() : "";
                if (!label && !value) return null;
                const metricLabel = localizeMetricLabel(label, lang);
                const metricValue = lang === "ar" ? sanitizeArabicString(value) : value;
                return metricLabel && metricValue ? `${metricLabel}: ${metricValue}` : (metricLabel || metricValue);
            })
            .filter(Boolean)
        : [];

    return {
        icon: data?.icon || "📊",
        title: lang === "ar"
            ? sanitizeArabicString(String(data?.title || "إطار التحليل"))
            : (data?.title || "Framework"),
        subtitle: lang === "ar"
            ? sanitizeArabicString(String(data?.subtitle || data?.description || ""))
            : (data?.subtitle || data?.description),
        items: criteria,
        border_color: data?.border_color || "blue",
    };
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
        <div className="bg-teal-50 border-s-[3px] border-s-teal-600 dark:bg-teal-900/20 dark:border-s-teal-500 rounded-lg px-3.5 py-3 my-3 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="font-semibold text-slate-900 dark:text-white">
                {lang === "ar" ? "رؤية رئيسية:" : "What this tells me:"}
            </strong>{" "}
            <span
                dangerouslySetInnerHTML={{
                    __html: content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
                }}
            />
        </div>
    );
}

// =============================================================================
// LAYER COMPONENTS (PHASE 1: 7-LAYER STRUCTURE)
// =============================================================================

function PersonalGreeting({ text }: { text: string }) {
    if (!text) return null;
    return (
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 select-none">
            {text}
        </div>
    );
}

function ContextBridge({ text }: { text: string }) {
    if (!text) return null;
    return (
        <div className="text-sm text-slate-500 dark:text-slate-400 italic mb-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3 leading-relaxed">
            {text}
        </div>
    );
}

function HumanOpening({ text }: { text: string }) {
    if (!text) return null;
    return (
        <div className="text-[15px] font-medium text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
            {text}
        </div>
    );
}

function CoreNarrative({ text }: { text: string }) {
    if (!text) return null;
    // Uses the existing parsing logic but wrapped
    const elements = parseConversationalText(text);
    return <div className="space-y-4">{elements}</div>;
}

function RiskWarning({ text, lang = 'en' }: { text: string; lang?: Language }) {
    if (!text) return null;
    return (
        <div className="bg-amber-50 border-s-[3px] border-s-amber-500 dark:bg-amber-900/20 dark:border-s-amber-400 rounded-lg px-3.5 py-3 my-3 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="font-semibold text-amber-700 dark:text-amber-400">
                {lang === "ar" ? "تحذير:" : "The one thing to watch:"}
            </strong>{" "}
            {text}
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
                            <span className="text-slate-600 dark:text-slate-400">{factor.label || factor.name}</span>
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

/** Quantified Drivers Card - Numbered margin/impact decomposition */
function QuantifiedDriversCard({ data, lang = 'en' }: { data: any; lang?: Language }) {
    if (!data?.drivers?.length) return null;
    const totalImpact = String(data?.total_impact || "");
    const isNegative = totalImpact.startsWith("-");
    return (
        <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {data?.icon && <span>{data.icon}</span>}
                    {data?.title || "Quantified Drivers"}
                </div>
            </div>
            <div className="p-4 space-y-3">
                {(data.drivers || []).map((driver: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {idx + 1}. {driver?.name}
                            </div>
                            <span className={clsx(
                                "text-xs font-bold px-2 py-1 rounded-md",
                                String(driver?.impact || "").startsWith("-")
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            )}>
                                {driver?.impact}
                            </span>
                        </div>
                        {driver?.detail && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{driver.detail}</p>
                        )}
                    </div>
                ))}
                {totalImpact && (
                    <div className={clsx(
                        "mt-2 text-sm font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2",
                        isNegative
                            ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                    )}>
                        <span>{lang === "ar" ? "الأثر الكلي" : "Total Impact"}</span>
                        <span>{totalImpact}</span>
                    </div>
                )}
            </div>
        </div>
    );
}



function DisclaimerCard({ content, text, title, lang = 'en' }: { content?: string; text?: string; title?: string, lang?: Language }) {
    const resolvedText = content || text || translations[lang].chat.disclaimer;
    return (
        <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/50 italic">
            {resolvedText}
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

    if (typeof data.content === "string" && data.variant) {
        const variant = String(data.variant);
        const title = data.title || (lang === "ar" ? "شرح تعليمي" : "Educational Note");
        const content = data.content;

        if (variant === "when_misleading") {
            return (
                <div className="my-4">
                    <WarningCard
                        data={{
                            title,
                            content: content.split("\n").map((x: string) => x.trim()).filter(Boolean),
                        }}
                    />
                </div>
            );
        }

        return (
            <div className="my-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="text-lg font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                        📚 {title}
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    {variant === "formula" ? (
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border-s-4 border-s-sky-500">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{translations[lang].chat.formula}</div>
                            <code className="text-sm font-mono text-slate-800 dark:text-slate-200 dir-ltr block text-start">{content}</code>
                        </div>
                    ) : variant === "example" ? (
                        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border-s-4 border-s-sky-500">
                            <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase mb-1">{translations[lang].chat.example}</div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{content}</div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{content}</p>
                    )}
                </div>
            </div>
        );
    }

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
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {typeof sector.weight === "number" ? `${sector.weight}%` : String(sector.weight)} {translations[lang].chat.weight}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(sector.stocks || sector.constituents || []).map((stock: any, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md text-xs font-medium text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-600">
                                    {typeof stock === "string" ? stock : (stock?.ticker || stock?.symbol || stock?.name || "—")}
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
                                {item.ticker}: {typeof item.weight === "number" ? `${item.weight}%` : String(item.weight)}
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
    const variant = data.variant || 'info'; // info, success, warning, gem
    const borderColor = variant === 'success' ? 'border-s-emerald-500' : variant === 'warning' ? 'border-s-amber-500' : variant === 'gem' ? 'border-s-violet-600' : 'border-s-teal-600';
    const bgGradient = variant === 'success'
        ? 'bg-emerald-50 dark:bg-emerald-900/20'
        : variant === 'warning'
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : variant === 'gem'
                ? 'bg-violet-50 dark:bg-violet-900/20'
                : 'bg-teal-50 dark:bg-teal-900/20';

    return (
        <div className={`border-s-[3px] ${borderColor} px-3.5 py-3 rounded-lg my-3 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300 ${bgGradient}`}>
            <div className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
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

    try {
        const elements: React.ReactNode[] = [];
        const lines = text.split("\n");
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
    } catch (e) {
        console.error("Error parsing conversational text:", e);
        // Fallback: simple text render
        return [<p key="fallback" className="text-sm text-slate-700 dark:text-slate-300">{text}</p>];
    }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WorldClassMessage({ conversationalText, response, lang = 'en', isLatest = false, onTyping, onTypingComplete }: WorldClassMessageProps) {
    const safeConversationalText = lang === "ar"
        ? sanitizeArabicString(conversationalText || "")
        : (conversationalText || "");
    const safeResponse = lang === "ar"
        ? sanitizeArabicPayload(response || {})
        : (response || {});

    // --- PHASE 9: Ultra-Premium Reveal Animation Logic ---
    const [displayLength, setDisplayLength] = useState(isLatest ? 0 : Infinity);
    const [isTypingCompleted, setIsTypingCompleted] = useState(!isLatest);

    const strGreeting = safeResponse?.structured_narrative?.personal_greeting || "";
    const strBridge = safeResponse?.structured_narrative?.context_bridge || "";
    const strOpening = safeResponse?.structured_narrative?.human_opening || "";
    const strCore = safeResponse?.structured_narrative?.core_narrative || "";
    const strWarning = safeResponse?.structured_narrative?.risk_warning || "";

    // Total typing length depends on whether it's structured or fallback
    const totalTypingLength = safeResponse?.structured_narrative
        ? strGreeting.length + strBridge.length + strOpening.length + strCore.length + strWarning.length
        : safeConversationalText.length;

    useEffect(() => {
        if (!isLatest) {
            setDisplayLength(Infinity);
            setIsTypingCompleted(true);
            return;
        }

        const totalChars = Math.max(totalTypingLength, 1);
        if (totalTypingLength === 0) {
            setIsTypingCompleted(true);
            setDisplayLength(Infinity);
            return;
        }

        // Initialize state for the animation
        setDisplayLength(0);
        setIsTypingCompleted(false);

        // Ultra-premium, deliberate writing pace: 1 character per 12ms
        const interval = setInterval(() => {
            setDisplayLength(prev => {
                const next = prev + 1;
                if (next >= totalChars) {
                    clearInterval(interval);
                    setIsTypingCompleted(true);
                    if (onTypingComplete) setTimeout(onTypingComplete, 100);
                    if (onTyping) setTimeout(onTyping, 100);
                    return totalChars;
                }

                // Throttle the scroll callback to every 3 characters (36ms) to avoid layout thrashing
                if (onTyping && next % 3 === 0) {
                    onTyping();
                }

                return next;
            });
        }, 12);

        return () => clearInterval(interval);
    }, [isLatest, totalTypingLength]);

    let currentOffset = 0;
    const getSlicedText = (text: string) => {
        if (!text) return "";
        if (!isLatest || displayLength >= totalTypingLength) return text;
        const availableChars = Math.max(0, displayLength - currentOffset);
        currentOffset += text.length;
        if (availableChars <= 0) return "";
        return text.slice(0, availableChars);
    };

    const slicedGreeting = getSlicedText(strGreeting);
    const slicedBridge = getSlicedText(strBridge);
    const slicedOpening = getSlicedText(strOpening);
    const slicedCore = getSlicedText(strCore);
    const slicedWarning = getSlicedText(strWarning);
    const slicedFallbackText = getSlicedText(safeConversationalText);

    // Animation Variants for Cards
    const staggerContainer: any = {
        hidden: { opacity: isLatest ? 0 : 1, height: isLatest ? 0 : 'auto' }, // Added height: 0 for hidden state when isLatest
        show: {
            opacity: 1,
            height: 'auto', // Ensure height is auto when shown
            transition: { staggerChildren: 0.12 }
        }
    };

    const staggerItem: any = {
        hidden: { opacity: isLatest ? 0 : 1, y: isLatest ? 15 : 0, height: isLatest ? 0 : 'auto' }, // Added height: 0 for hidden state when isLatest
        show: { opacity: 1, y: 0, height: 'auto', transition: { type: "spring", stiffness: 200, damping: 20 } }
    };
    // --------------------------------------------------------

    // Parse the conversational text
    const textElements = parseConversationalText(slicedFallbackText);

    const cards = Array.isArray(safeResponse?.cards) ? safeResponse.cards : [];
    const findCardData = (types: string[]) => {
        const wanted = new Set(types.map(t => t.toLowerCase()));
        const card = cards.find((c: any) => wanted.has(String(c?.type || "").toLowerCase()));
        return card?.data;
    };

    const normalizedFrameworkCard = normalizeFrameworkCard(
        safeResponse?.framework_card || findCardData(["framework_card", "methodology", "screening_criteria"]),
        lang
    );

    const normalizedPriceDisplay = safeResponse?.price_display
        || normalizeDataCardToPriceDisplay(safeResponse?.data_card || findCardData(["data_card"]), lang);

    const normalizedMacroScore = normalizeMacroScoreData(
        safeResponse?.macro_score || findCardData(["macro_score", "market_timing"]),
        lang
    );

    const normalizedComparisonTable = normalizeComparisonData(
        safeResponse?.comparison_table || findCardData(["comparison_table", "compare_table"]),
        lang
    );

    const normalizedStockList = normalizeStockListData(
        safeResponse?.stock_list || findCardData(["stock_list", "hidden_gems", "discovery_list", "undervalued_stocks"]),
        lang
    );

    const normalizedIndexComposition = normalizeIndexCompositionData(
        safeResponse?.index_composition || findCardData(["index_composition", "index_view"]),
        lang
    );

    const normalizedScoreBreakdown = safeResponse?.score_breakdown || findCardData(["score_breakdown"]);
    const normalizedGemList = safeResponse?.gem_list || findCardData(["gem_list"]);
    const normalizedUndervaluedScreen = safeResponse?.undervalued_screen || findCardData(["undervalued_screen"]);

    const normalizedEducationalCards = (
        Array.isArray(safeResponse?.educational_cards) && safeResponse.educational_cards.length > 0
            ? safeResponse.educational_cards
            : safeResponse?.educational_card
                ? [safeResponse.educational_card]
                : cards
                    .filter((c: any) => ["educational", "define_term", "definition"].includes(String(c?.type || "").toLowerCase()))
                    .map((c: any) => {
                        const d = c?.data || {};
                        if (d?.title || d?.definition || d?.formula || d?.example || d?.sections) {
                            return d;
                        }
                        if (d?.term || d?.sections) {
                            const formulaSection = Array.isArray(d.sections)
                                ? d.sections.find((s: any) => s?.type === "formula")
                                : null;
                            const definitionSection = Array.isArray(d.sections)
                                ? d.sections.find((s: any) => s?.type === "definition")
                                : null;
                            const exampleSection = Array.isArray(d.sections)
                                ? d.sections.find((s: any) => s?.type === "example")
                                : null;
                            return {
                                title: d?.term || "Educational Note",
                                definition: d?.definition || definitionSection?.content,
                                formula: d?.formula || formulaSection?.content,
                                example: d?.example || exampleSection?.content,
                                sections: Array.isArray(d?.sections)
                                    ? d.sections
                                        .filter((s: any) => s?.type !== "definition" && s?.type !== "formula" && s?.type !== "example")
                                        .map((s: any) => ({
                                            title: s?.title,
                                            items: Array.isArray(s?.items) ? s.items : (s?.content ? [s.content] : []),
                                        }))
                                    : [],
                            };
                        }
                        return d;
                    })
                    .filter(Boolean)
    );

    const rawInsightCards = (
        Array.isArray(safeResponse?.insight_cards) && safeResponse.insight_cards.length > 0
            ? safeResponse.insight_cards
            : cards
                .filter((c: any) => ["insight", "insights"].includes(String(c?.type || "").toLowerCase()))
                .map((c: any) => c?.data)
                .filter(Boolean)
    );
    const normalizedInsightCards = rawInsightCards.filter((card: any) => {
        const title = String(card?.title || "").toLowerCase();
        return !(title.includes("bull case") || title.includes("bear case") || title.includes("السيناريو"));
    });

    const normalizedDisclaimer = safeResponse?.disclaimer_card || findCardData(["disclaimer_card", "disclaimer"]);
    const normalizedLearningSection = safeResponse?.learning_section;

    // Check for disclaimer in text to avoid duplication
    const hasInlineDisclaimer = safeConversationalText?.toLowerCase().includes("educational analysis") ||
        safeConversationalText?.toLowerCase().includes("not investment advice") ||
        safeConversationalText?.toLowerCase().includes("methodology note") ||
        safeConversationalText?.toLowerCase().includes("important context") ||
        safeConversationalText?.toLowerCase().includes("liquidity warning") ||
        safeConversationalText?.includes("تحليل تعليمي") ||
        safeConversationalText?.includes("⚠️");

    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    const fontClass = lang === 'ar' ? 'font-arabic' : '';

    return (
        <div
            className={`w-full text-start ${fontClass} bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 md:p-6 transition-all duration-300 hover:shadow-md`}
            dir={direction}
            lang={lang}
        >
            {/* ============================================================
                LAYER 1: TEXT NARRATIVE (Standard or 7-Layer)
               ============================================================ */}

            {/* NEW: 7-Layer Structured Rendering */}
            {safeResponse?.structured_narrative ? (
                <div className="mb-6 space-y-1">
                    {/* Layer 1: Personal Greeting */}
                    <PersonalGreeting text={slicedGreeting} />

                    {/* Layer 2: Context Bridge */}
                    <ContextBridge text={slicedBridge} />

                    {/* Layer 3: Human Opening */}
                    <HumanOpening text={slicedOpening} />

                    {/* Layer 4: Core Narrative */}
                    <div className="mt-3">
                        <CoreNarrative text={slicedCore} />
                    </div>

                    {/* Layer 5: Key Insight (If passed in structured narrative) */}
                    {safeResponse.structured_narrative.key_insight && (
                        <motion.div variants={staggerItem} initial="hidden" animate={isTypingCompleted ? "show" : "hidden"}>
                            <KeyInsightCard data={safeResponse.structured_narrative.key_insight} lang={lang} />
                        </motion.div>
                    )}

                    {/* Layer 6: Risk Warning */}
                    <RiskWarning text={slicedWarning} lang={lang} />
                </div>
            ) : (
                /* Fallback: Old Monolithic Logic */
                normalizedFrameworkCard && textElements.length > 0 ? (
                    <>
                        {textElements[0]}
                        <FrameworkCard data={normalizedFrameworkCard} />
                        {textElements.slice(1)}
                    </>
                ) : (
                    textElements
                )
            )}

            {/* ============================================================
                LAYER 2: PREMIUM DATA & INSIGHT COMPONENTS
                Rendered sequentially based on response structure
               ============================================================ */}

            {isTypingCompleted && (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col"
                >
                    {/* Stock Header (if present) */}
                    {safeResponse?.cards?.filter((c: any) => c.type === 'stock_header').length > 0 && (
                        <motion.div variants={staggerItem} className="mb-3 mt-1">
                            <ChatCards cards={safeResponse.cards.filter((c: any) => c.type === 'stock_header')} language={lang} />
                        </motion.div>
                    )}

                    {/* Chart (if present) */}
                    {safeResponse?.chart && (
                        <motion.div variants={staggerItem} className="my-3">
                            <ChartCard chart={safeResponse.chart} language={lang} />
                        </motion.div>
                    )}

                    {/* Quick Stats / Price (Scenario 1) */}
                    {normalizedPriceDisplay && (
                        <motion.div variants={staggerItem}><PriceDisplayCard data={normalizedPriceDisplay} lang={lang} /></motion.div>
                    )}

                    {/* Character Cards (Scenario 8) */}
                    {safeResponse?.character_cards?.length > 0 && (
                        <motion.div variants={staggerItem}><CharacterCards data={safeResponse.character_cards} lang={lang} /></motion.div>
                    )}

                    {/* Warning Card (Scenario 9) */}
                    {safeResponse?.warning_card && (
                        <motion.div variants={staggerItem}><WarningCard data={safeResponse.warning_card} /></motion.div>
                    )}

                    {/* Quantified Drivers (Scenario 7) */}
                    {safeResponse?.quantified_drivers && (
                        <motion.div variants={staggerItem}><QuantifiedDriversCard data={safeResponse.quantified_drivers} lang={lang} /></motion.div>
                    )}

                    {/* Macro Score (Scenario 7) */}
                    {normalizedMacroScore && (
                        <motion.div variants={staggerItem}><MacroScoreCard data={normalizedMacroScore} lang={lang} /></motion.div>
                    )}

                    {/* Key Insight (8-Layer Guarantee) */}
                    {normalizedInsightCards && normalizedInsightCards.length > 0 && (
                        <motion.div variants={staggerItem}>
                            {normalizedInsightCards.map((insight: any, idx: number) => (
                                <KeyInsightCard key={idx} data={insight} lang={lang} />
                            ))}
                        </motion.div>
                    )}

                    {/* Bull / Bear Cases (Scenario 1, 7) */}
                    {safeResponse?.bull_case && (
                        <motion.div variants={staggerItem}><BullCaseCard data={safeResponse.bull_case} lang={lang} /></motion.div>
                    )}
                    {safeResponse?.bear_case && (
                        <motion.div variants={staggerItem}><BearCaseCard data={safeResponse.bear_case} lang={lang} /></motion.div>
                    )}

                    {/* Stock Identification / Lists (Scenario 2, 3, 9, 10) */}
                    {normalizedGemList && normalizedGemList.stocks?.length > 0 ? (
                        <motion.div variants={staggerItem}><GemListCard data={normalizedGemList} language={lang} /></motion.div>
                    ) : normalizedUndervaluedScreen && normalizedUndervaluedScreen.top_stocks?.length > 0 ? (
                        <motion.div variants={staggerItem}><UndervaluedScreenCard data={normalizedUndervaluedScreen} language={lang} /></motion.div>
                    ) : normalizedStockList && (
                        <motion.div variants={staggerItem}><StockListCard data={normalizedStockList} lang={lang} /></motion.div>
                    )}

                    {/* Peer Comparison / Tables (Scenario 5) */}
                    {normalizedComparisonTable && (
                        <motion.div variants={staggerItem}><ComparisonTableCard data={normalizedComparisonTable} /></motion.div>
                    )}

                    {/* Score Breakdown (Scenario 4) */}
                    {normalizedScoreBreakdown && normalizedScoreBreakdown.factors?.length > 0 && (
                        <motion.div variants={staggerItem}><ScoreBreakdownCard data={normalizedScoreBreakdown} language={lang} /></motion.div>
                    )}

                    {/* Index Composition (Scenario 10) */}
                    {normalizedIndexComposition && (
                        <motion.div variants={staggerItem}><IndexCompositionCard data={normalizedIndexComposition} lang={lang} /></motion.div>
                    )}

                    {/* ============================================================
                    LAYER 3: LEARNING / EDUCATIONAL
                   ============================================================ */}

                    {/* Educational Cards (Scenario 6) */}
                    {normalizedEducationalCards && normalizedEducationalCards.length > 0 && (
                        <motion.div variants={staggerItem}>
                            {normalizedEducationalCards.map((card: any, idx: number) => (
                                <EducationalCard key={idx} data={card} lang={lang} />
                            ))}
                        </motion.div>
                    )}

                    {/* Legacy Learning Section */}
                    {normalizedLearningSection && (
                        <motion.div variants={staggerItem}><LearningSection data={normalizedLearningSection} /></motion.div>
                    )}



                    {/* ============================================================
                    LAYER 4: FOLLOW UP SUGGESTIONS (Chips)
                   ============================================================ */}

                </motion.div>
            )}

            {isTypingCompleted && normalizedLearningSection && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <LearningSection data={normalizedLearningSection} />
                </div>
            )}

            {/* ============================================================
                LAYER 4: DISCLAIMER (Regulatory Compliance)
               ============================================================ */}
            {isTypingCompleted && (!hasInlineDisclaimer || normalizedDisclaimer) && (
                <div className="mt-6 text-slate-500 dark:text-slate-400">
                    <DisclaimerCard
                        text={safeResponse?.disclaimer || normalizedDisclaimer?.text}
                        content={normalizedDisclaimer?.content}
                        title={normalizedDisclaimer?.title}
                        lang={lang}
                    />
                </div>
            )}
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

/** Follow-Up Chips - Dynamic 3-chip UI */
export function FollowUpChips({
    followups,
    onAction,
    language = "en"
}: {
    followups: Array<{ text: string; payload: string; type: string }>;
    onAction?: (payload: string) => void;
    language?: "en" | "ar" | "mixed";
}) {
    if (!followups || !followups.length) return null;

    const isRtl = language === "ar";

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'deeper_dive': return "border-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20";
            case 'risk_probe': return "border-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20";
            case 'comparison': return "border-teal-500 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20";
            case 'catalyst': return "border-amber-500 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20";
            case 'macro_link': return "border-purple-500 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20";
            case 'historical': return "border-slate-400 hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/20";
            case 'sector_view': return "border-emerald-500 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20";
            default: return "border-amber-500 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20";
        }
    };

    return (
        <div className="mt-4 mb-1" dir={isRtl ? "rtl" : "ltr"}>
            <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mb-2 font-medium uppercase tracking-wider">
                {isRtl ? "إلى أين تريد الذهاب بعد ذلك؟" : "Where do you want to go?"}
            </div>
            <div className="flex flex-col gap-1.5">
                {followups.map((chip, idx) => {
                    const icon = chip.type === 'deeper_dive' ? '1️⃣' :
                        chip.type === 'risk_probe' ? '2️⃣' :
                            chip.type === 'comparison' ? '3️⃣' :
                                chip.type === 'catalyst' ? '🚀' :
                                    chip.type === 'macro_link' ? '🌍' :
                                        chip.type === 'historical' ? '🕰️' :
                                            chip.type === 'sector_view' ? '🏢' : '🎯';

                    return (
                        <button
                            key={`followup-${idx}`}
                            onClick={() => onAction && onAction(chip.payload)}
                            className="text-start flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[10px] px-3.5 py-2.5 transition-all hover:bg-teal-50 hover:border-teal-500 dark:hover:bg-teal-900/20 dark:hover:border-teal-500"
                        >
                            <span className="text-[13px] min-w-[20px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5 shrink-0 select-none">{icon}</span>
                            <span className="text-[13px] leading-[1.4] text-slate-600 dark:text-slate-300">
                                {chip.text}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
} 
