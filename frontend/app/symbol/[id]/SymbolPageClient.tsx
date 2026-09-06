"use client";

import { useParams, useRouter } from "next/navigation";
import { symbolFromArParam } from "@/lib/seo";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    fetchTickers, fetchLocalCompanyProfile, fetchNews, Ticker,
    fetchEgxTechnicals, fetchEgxEstimates, fetchEgxFinancialsTV, fetchEgxDividendsTV, fetchEgxNewsTV
} from "@/lib/api";
import {
    sanitizeNewsText,
    resolveNewsImageSrc,
    buildNewsSnippet,
    getNewsBrandedCover
} from "@/lib/news-display";

import {
    TrendingUp, TrendingDown, Building2, Users, BarChart3,
    FileText, Activity,
    Target, Zap, PieChart, AlertCircle, Wallet,
    Briefcase, Calendar, ArrowUp, ArrowDown, Globe, Award, Landmark, CheckCircle,
    DollarSign, Newspaper, ChevronRight, TrendingDown as TrendDown, Info,
    ExternalLink, BookOpen, Gauge, Crosshair, Minus, Maximize2
} from "lucide-react";
import { TradingViewChartModal } from "@/components/TradingViewChartModal";
import { TradingViewInlineChart } from "@/components/TradingViewInlineChart";
import { readStoredLang, type StoredLang } from "@/hooks/useStoredLang";
import { useTheme } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { sectorAr } from '@/content/sector-names-ar';

// ─── BILINGUAL TRANSLATIONS ────────────────────────────────────────────────
const TRANSLATIONS = {
    en: {
        nav_home: "HOME", nav_funds: "MUTUAL FUNDS", nav_pulse: "MARKET PULSE",
        nav_news: "MARKET NEWS", nav_portfolio: "PORTFOLIO", nav_learn: "LEARN", nav_about: "ABOUT US",
        delayed: "Delayed 5 min",
        tab_overview: "Overview", tab_financials: "Financials",
        tab_ratios: "Ratios & Risk", tab_dividends: "Dividends & Actions",
        tab_news: "News", tab_profile: "Profile",
        tab_technicals: "Technicals", tab_forecasts: "Forecasts",
        tech_summary: "Technical Summary", tech_oscillators: "Oscillators", tech_mas: "Moving Averages",
        tech_no_data: "Technical signals are not available for this stock.",
        fc_no_coverage: "No analyst coverage for this stock yet.",
        fc_eps_next: "EPS Forecast (Next Q)", fc_rev_next: "Revenue Forecast (Next Q)", fc_eps_y: "EPS Forecast (Next Y)",
        tf_1h: "1H", tf_4h: "4H", tf_1d: "1D", tf_1w: "1W",
        stock_info: "Stock Information", name: "Name", sector: "Sector",
        market: "Market", currency: "Currency",
        profile: "Company Profile", desc_not_found: "Company description is currently being synchronized.",
        website: "Website", industry: "Industry", employees: "Employees", location: "Headquarters",
        metrics: "Key Metrics", market_cap: "Market Cap", pe_ratio: "P/E Ratio",
        pb_ratio: "P/B Ratio", div_yield: "Div Yield", beta: "Beta",
        outstanding: "Shares Outstanding", fcf: "Free Cash Flow",
        profit_margin: "Profit Margin", debt_equity: "Debt / Equity",
        roe: "Return on Equity", roa: "Return on Assets", peg_ratio: "PEG Ratio",
        current_ratio: "Current Ratio", target_price: "Target Price",
        recommendation: "Recommendation", fair_value: "Fair Value",
        empty_state: "Information is currently being backfilled from our production feeds.",
        vol: "Volume", high52: "52W High", low52: "52W Low", period_return: "Period Return",
        price_chart: "Price History", chart_style: "Style",
        trading_info: "Trading Info", market_breadth: "Market Breadth",
        valuation_multiples: "Valuation Multiples", profitability_margins: "Profitability & Margins",
        liquidity_solvency: "Liquidity & Solvency", dividends_risk: "Dividends & Risk",
        company_details: "Company Details", historical_prices: "Historical Prices",
        chart_unavailable: "Chart data is currently unavailable for this symbol.",
        total_interest_income: "Total Interest Income", interest_expense: "Interest Expense",
        net_interest_income: "Net Interest Income", provision_credit_losses: "Loan Loss Provisions",
        trading_income: "Trading Income", fee_income: "Fee Income",
        salaries_benefits: "Salaries & Benefits", deposits: "Customer Deposits",
        gross_loans: "Gross Loans", allowance_loans: "Allowance for Loan Losses",
        net_loans: "Net Loans", investment_securities: "Investment Securities",
        cash_equivalents: "Cash & Equivalents", total_investments: "Total Investments",
        property_ppe: "Property, Plant & Equipment", goodwill_intangibles: "Goodwill & Intangibles",
        short_term_debt: "Short Term Debt", long_term_debt: "Long Term Debt",
        total_current_liabilities: "Total Current Liabilities", total_current_assets: "Total Current Assets",
        fcf_yield: "FCF Yield", earnings_yield: "Earnings Yield",
        piotroski_score: "Piotroski F-Score", altman_z_score: "Altman Z-Score",
        institutional_ownership: "Institutional Ownership", insider_ownership: "Insider Ownership",
        tangible_book: "P / Tangible BV (P/TBV)", technical_momentum: "Technical Momentum",
        ma_50d: "50-Day Moving Avg", ma_200d: "200-Day Moving Avg", rsi_14: "RSI (14-Day)",
        management_officers: "Management & Leadership",
        annual_view: "Annual", quarterly_view: "Quarterly",
        income_statement: "Income Statement", balance_sheet: "Balance Sheet",
        cash_flow: "Cash Flow", financial_statement: "Financial Statements",
        ex_board: "Executive Officer", fair_value_models: "Valuation Models",
        dividend_history: "Dividend History", other_actions: "Other Corporate Actions",
        per_share: "Per-Share Metrics", growth_metrics: "Growth Metrics",
        share_structure: "Share Structure", net_cash: "Net Cash Position",
        avg_vol_20d: "Avg Volume 20D", rel_vol: "Relative Volume",
        news_sentiment: "News & Sentiment", read_more: "Read More",
        no_news: "No recent news available for this stock.",
        positive: "Positive", negative: "Negative", neutral: "Neutral",
        yoy_change: "YoY Δ", capex: "Capital Expenditure",
        dividends_paid: "Dividends Paid (CF)", da: "Depreciation & Amortization",
        total_equity: "Total Equity", total_liabilities: "Total Liabilities",
        total_assets: "Total Assets", book_value_ps: "Book Value / Share",
        eps_ttm: "EPS (TTM)", forward_pe: "Forward P/E",
        forward_eps: "Forward EPS", pretax_margin: "Pretax Margin",
        effective_tax: "Effective Tax Rate", net_income_ttm: "Net Income (TTM)",
        revenue_ttm: "Revenue (TTM)", operating_margin: "Operating Margin",
        trading_income_total: "Trading & Fee Income", bvps: "Book Value/Share",
        dps: "Dividend Per Share", payout_ratio: "Payout Ratio",
        fcf_per_share: "FCF Per Share", float_shares: "Float Shares",
        total_debt: "Total Debt",
    },
    ar: {
        nav_home: "الرئيسية", nav_funds: "الصناديق الاستثمارية", nav_pulse: "نبض السوق",
        nav_news: "أخبار السوق", nav_portfolio: "المحفظة", nav_learn: "تعلم", nav_about: "من نحن",
        delayed: "متأخر ٥ دقائق",
        tab_overview: "نظرة عامة", tab_financials: "القوائم المالية",
        tab_ratios: "المؤشرات والمخاطر", tab_dividends: "التوزيعات والإجراءات",
        tab_news: "الأخبار", tab_profile: "ملف الشركة",
        tab_technicals: "التحليل الفني", tab_forecasts: "التوقعات",
        tech_summary: "الملخص الفني", tech_oscillators: "المذبذبات", tech_mas: "المتوسطات المتحركة",
        tech_no_data: "المؤشرات الفنية غير متوفرة لهذا السهم.",
        fc_no_coverage: "لا توجد تغطية من المحللين لهذا السهم بعد.",
        fc_eps_next: "توقع ربحية السهم (الربع القادم)", fc_rev_next: "توقع الإيرادات (الربع القادم)", fc_eps_y: "توقع ربحية السهم (العام القادم)",
        tf_1h: "ساعة", tf_4h: "٤ ساعات", tf_1d: "يوم", tf_1w: "أسبوع",
        stock_info: "بيانات السهم", name: "الاسم", sector: "القطاع",
        market: "السوق", currency: "العملة",
        profile: "الملف التعريفي", desc_not_found: "الملف التعريفي قيد المزامنة حالياً.",
        website: "الموقع الإلكتروني", industry: "الصناعة", employees: "عدد الموظفين", location: "المقر الرئيسي",
        metrics: "المؤشرات الرئيسية", market_cap: "القيمة السوقية", pe_ratio: "مكرر الأرباح P/E",
        pb_ratio: "المضاعف الدفتري P/B", div_yield: "عائد التوزيعات", beta: "معامل بيتا",
        outstanding: "الأسهم القائمة", fcf: "التدفق النقدي الحر",
        profit_margin: "هامش الربح", debt_equity: "الدين إلى حقوق الملكية",
        roe: "العائد على حقوق الملكية", roa: "العائد على الأصول", peg_ratio: "PEG",
        current_ratio: "النسبة السريعة", target_price: "السعر المستهدف",
        recommendation: "التوصية", fair_value: "القيمة العادلة",
        empty_state: "يتم حالياً سحب البيانات من خطوط الإنتاج.",
        vol: "حجم التداول", high52: "أعلى ٥٢ أسبوع", low52: "أدنى ٥٢ أسبوع", period_return: "عائد الفترة",
        price_chart: "تاريخ الأسعار", chart_style: "النمط",
        trading_info: "بيانات التداول", market_breadth: "اتساع السوق",
        valuation_multiples: "مضاعفات التقييم", profitability_margins: "الربحية والهوامش",
        liquidity_solvency: "السيولة والملاءة", dividends_risk: "التوزيعات والمخاطر",
        company_details: "تفاصيل الشركة", historical_prices: "حركة الأسعار التاريخية",
        chart_unavailable: "بيانات الرسم البياني غير متوفرة لهذا السهم.",
        total_interest_income: "إجمالي عائدات الفوائد", interest_expense: "مصروفات الفوائد",
        net_interest_income: "صافي عائدات الفوائد", provision_credit_losses: "مخصصات خسائر القروض",
        trading_income: "أرباح التداول", fee_income: "إيرادات الرسوم",
        salaries_benefits: "الرواتب والمزايا", deposits: "ودائع العملاء",
        gross_loans: "إجمالي القروض", allowance_loans: "مخصص خسائر الائتمان",
        net_loans: "صافي القروض", investment_securities: "الأوراق المالية الاستثمارية",
        cash_equivalents: "النقد وما في حكمه", total_investments: "إجمالي الاستثمارات",
        property_ppe: "العقارات والآلات والمعدات", goodwill_intangibles: "الشهرة والأصول غير الملموسة",
        short_term_debt: "ديون قصيرة الأجل", long_term_debt: "ديون طويلة الأجل",
        total_current_liabilities: "إجمالي الالتزامات المتداولة", total_current_assets: "إجمالي الأصول المتداولة",
        fcf_yield: "عائد التدفق النقدي الحر", earnings_yield: "عائد الأرباح",
        piotroski_score: "Piotroski F-Score", altman_z_score: "Altman Z-Score",
        institutional_ownership: "ملكية المؤسسات", insider_ownership: "ملكية المطلعين",
        tangible_book: "P/TBV", technical_momentum: "التحليل الفني والزخم",
        ma_50d: "متوسط متحرك ٥٠ يوم", ma_200d: "متوسط متحرك ٢٠٠ يوم", rsi_14: "RSI-14",
        management_officers: "الهيئة الإدارية",
        annual_view: "سنوي", quarterly_view: "ربعي",
        income_statement: "قائمة الدخل", balance_sheet: "الميزانية العمومية",
        cash_flow: "التدفقات النقدية", financial_statement: "القوائم المالية",
        ex_board: "مدير تنفيذي", fair_value_models: "نماذج التقييم",
        dividend_history: "تاريخ التوزيعات", other_actions: "إجراءات مؤسسية أخرى",
        per_share: "مؤشرات السهم", growth_metrics: "مؤشرات النمو",
        share_structure: "هيكل الأسهم", net_cash: "صافي النقد",
        avg_vol_20d: "متوسط الحجم ٢٠ يوم", rel_vol: "الحجم النسبي",
        news_sentiment: "الأخبار والتحليل", read_more: "قراءة المزيد",
        no_news: "لا توجد أخبار حديثة لهذا السهم.",
        positive: "إيجابي", negative: "سلبي", neutral: "محايد",
        yoy_change: "تغير سنوي", capex: "النفقات الرأسمالية",
        dividends_paid: "التوزيعات المدفوعة (تدفقات)", da: "الإهلاك والاستهلاك",
        total_equity: "حقوق المساهمين", total_liabilities: "إجمالي المطلوبات",
        total_assets: "إجمالي الأصول", book_value_ps: "القيمة الدفترية للسهم",
        eps_ttm: "ربحية السهم (EPS)", forward_pe: "مكرر الأرباح المستقبلي",
        forward_eps: "EPS المستقبلي", pretax_margin: "هامش ما قبل الضريبة",
        effective_tax: "نسبة الضريبة الفعلية", net_income_ttm: "صافي الدخل (TTM)",
        revenue_ttm: "الإيرادات (TTM)", operating_margin: "هامش التشغيل",
        trading_income_total: "دخل التداول والعمولات", bvps: "القيمة الدفترية للسهم",
        dps: "التوزيع للسهم", payout_ratio: "نسبة التوزيع",
        fcf_per_share: "التدفق الحر للسهم", float_shares: "الأسهم المتداولة",
        total_debt: "إجمالي الديون",
    }
};

const FIELD_MAPPINGS: Record<string, string> = {
    "صافى الربح": "net_income", "صافي الربح": "net_income",
    "مجمل الربح": "gross_profit", "إجمالي الأصول": "total_assets",
    "إجمالي المطلوبات": "total_liabilities", "إجمالي حقوق المساهمين": "total_equity",
    "صافي التغير في النقد": "operating_cashflow", "netIncome": "net_income",
    "grossProfit": "gross_profit", "totalAssets": "total_assets",
    "totalLiab": "total_liabilities", "totalStockholderEquity": "total_equity",
    "totalRevenue": "revenue", "operatingIncome": "operating_income"
};

function parseFinancialsRawData(rawData: any): Record<string, number> {
    if (!rawData) return {};
    try {
        const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const result: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
            const mappedKey = FIELD_MAPPINGS[k];
            if (mappedKey && typeof v === "number") result[mappedKey] = v;
        }
        return result;
    } catch { return {}; }
}

function parseNumericFields(obj: any): any {
    if (!obj) return {};
    const parsed: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined || value === "") {
            parsed[key] = null;
        } else if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed === "") { parsed[key] = null; }
            else { const num = Number(trimmed); parsed[key] = isNaN(num) ? value : num; }
        } else { parsed[key] = value; }
    }
    return parsed;
}

function formatNumber(num: number | string | null | undefined): string {
    if (num === null || num === undefined || num === "") return "-";
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(n)) return "-";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

function formatCurrency(num: number | string | null | undefined, curr: string = "EGP"): string {
    if (num === null || num === undefined || num === "") return "-";
    return `${curr} ${formatNumber(num)}`;
}

function pct(val: number | null | undefined, decimals = 2): string {
    if (!val && val !== 0) return "-";
    const scaled = Math.abs(val) < 1 ? val * 100 : val;
    return `${scaled >= 0 ? "" : ""}${scaled.toFixed(decimals)}%`;
}

// ─── METRIC CARD COMPONENT ──────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color, subtitle }: {
    label: string; value: string; icon: any; color: string; subtitle?: string;
}) {
    return (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 hover:border-[#14b8a6]/30 transition-all duration-200">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex-shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="min-w-0">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate">{label}</p>
                <p className="font-extrabold text-base mt-0.5 tabular truncate">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
            </div>
        </div>
    );
}

// ─── SECTION HEADER ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = "text-[#14b8a6]" }: { icon: any; title: string; color?: string }) {
    return (
        <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
            <Icon className={`w-5 h-5 ${color}`} /> {title}
        </h3>
    );
}

// ─── TRADINGVIEW-STYLE TECHNICAL / FORECAST COMPONENTS ──────────────────────
type RecMeta = { label: string; labelAr: string; color: string; ring: string };
function recMeta(v: number | null | undefined): RecMeta {
    if (v == null) return { label: "No Data", labelAr: "لا تتوفر", color: "#94a3b8", ring: "#94a3b8" };
    if (v >= 0.5) return { label: "Strong Buy", labelAr: "شراء قوي", color: "#059669", ring: "#10b981" };
    if (v >= 0.1) return { label: "Buy", labelAr: "شراء", color: "#16a34a", ring: "#22c55e" };
    if (v <= -0.5) return { label: "Strong Sell", labelAr: "بيع قوي", color: "#dc2626", ring: "#ef4444" };
    if (v <= -0.1) return { label: "Sell", labelAr: "بيع", color: "#e11d48", ring: "#f43f5e" };
    return { label: "Neutral", labelAr: "محايد", color: "#d97706", ring: "#f59e0b" };
}

// Semicircular TV-style recommendation gauge (−1..+1)
function RecommendationGauge({ value, title, lang }: { value: number | null; title: string; lang: "en" | "ar" }) {
    const m = recMeta(value);
    const v = Math.max(-1, Math.min(1, value ?? 0));
    const angle = 180 + (v + 1) * 90; // 180° (sell, left) → 270° (neutral, top) → 360° (buy, right)
    const r = 78, cx = 100, cy = 96;
    const arc = (start: number, end: number, color: string) => {
        const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
        const [x1, y1] = p(start), [x2, y2] = p(end);
        return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth="13" fill="none" strokeLinecap="round" />;
    };
    const needle = [cx + (r - 14) * Math.cos((angle * Math.PI) / 180), cy + (r - 14) * Math.sin((angle * Math.PI) / 180)];
    return (
        <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 200 116" className="w-full max-w-[260px]">
                {arc(180, 225, "#dc2626")}
                {arc(225, 261, "#ef4444")}
                {arc(261, 279, "#f59e0b")}
                {arc(279, 315, "#22c55e")}
                {arc(315, 360, "#16a34a")}
                {value != null && (
                    <>
                        <line x1={cx} y1={cy} x2={needle[0]} y2={needle[1]} stroke={m.color} strokeWidth="4" strokeLinecap="round" />
                        <circle cx={cx} cy={cy} r="7" fill={m.color} />
                    </>
                )}
            </svg>
            <div className="text-center -mt-3">
                <p className="text-lg font-extrabold" style={{ color: m.color }}>{lang === "ar" ? m.labelAr : m.label}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{title}</p>
            </div>
        </div>
    );
}

// Buy/Neutral/Sell pill for indicator rows
function SignalPill({ v, kind, lang }: { v: number | null; kind: "osc" | "ma"; lang: "en" | "ar" }) {
    // crude per-indicator signal from raw value where useful; falls back to neutral
    let sig: "buy" | "sell" | "neutral" = "neutral";
    if (v != null) {
        if (kind === "osc") sig = "neutral";
    }
    const map = {
        buy: { en: "Buy", ar: "شراء", c: "#16a34a", bg: "rgba(34,197,94,0.12)" },
        sell: { en: "Sell", ar: "بيع", c: "#e11d48", bg: "rgba(244,63,94,0.12)" },
        neutral: { en: "Neutral", ar: "محايد", c: "#d97706", bg: "rgba(245,158,11,0.12)" },
    }[sig];
    return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ color: map.c, background: map.bg }}>{lang === "ar" ? map.ar : map.en}</span>;
}

function IndicatorTable({ title, icon: Icon, color, rows, lang }: {
    title: string; icon: any; color: string; lang: "en" | "ar";
    rows: { name: string; value: number | null; signal?: "buy" | "sell" | "neutral" }[];
}) {
    const sigMeta = (s?: string) => s === "buy" ? { t: lang === "ar" ? "شراء" : "Buy", c: "#16a34a", bg: "rgba(34,197,94,0.12)" }
        : s === "sell" ? { t: lang === "ar" ? "بيع" : "Sell", c: "#e11d48", bg: "rgba(244,63,94,0.12)" }
            : { t: lang === "ar" ? "محايد" : "Neutral", c: "#d97706", bg: "rgba(245,158,11,0.12)" };
    return (
        <div className="premium-glass rounded-3xl p-6 md:p-8">
            <SectionHeader icon={Icon} title={title} color={color} />
            <div className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                {rows.map((r, i) => {
                    const sm = sigMeta(r.signal);
                    return (
                        <div key={i} className="flex items-center justify-between py-3">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{r.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-extrabold tabular">{r.value == null || !Number.isFinite(Number(r.value)) ? "-" : Number(r.value).toFixed(2)}</span>
                                {r.signal && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold w-[64px] text-center" style={{ color: sm.c, background: sm.bg }}>{sm.t}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Analyst price-target range bar with current marker
function AnalystTargetBar({ low, avg, high, current, currency, lang }: {
    low: number; avg: number; high: number; current: number; currency: string; lang: "en" | "ar";
}) {
    const min = Math.min(low, current) * 0.97, max = Math.max(high, current) * 1.03;
    const pos = (x: number) => `${((x - min) / (max - min)) * 100}%`;
    const upside = current > 0 ? ((avg - current) / current) * 100 : 0;
    return (
        <div className="premium-glass rounded-3xl p-6 md:p-8">
            <SectionHeader icon={Crosshair} title={lang === "ar" ? "السعر المستهدف للمحللين" : "Analyst Price Target"} color="text-[#14b8a6]" />
            <div className="flex items-end justify-between mb-2">
                <div><p className="text-xs font-bold text-slate-400 uppercase">{lang === "ar" ? "المتوسط" : "Average"}</p><p className="text-2xl font-extrabold text-[#14b8a6]">{currency} {avg.toFixed(2)}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase">{lang === "ar" ? "الإمكانية" : "Upside"}</p><p className={`text-2xl font-extrabold ${upside >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{upside >= 0 ? "+" : ""}{upside.toFixed(1)}%</p></div>
            </div>
            <div className="relative h-3 rounded-full mt-6 mb-8" style={{ background: "linear-gradient(90deg,#f43f5e,#f59e0b,#10b981)" }}>
                {[{ x: low, l: lang === "ar" ? "أدنى" : "Low" }, { x: avg, l: lang === "ar" ? "متوسط" : "Avg" }, { x: high, l: lang === "ar" ? "أعلى" : "High" }].map((p, i) => (
                    <div key={i} className="absolute -top-1.5 -translate-x-1/2" style={{ left: pos(p.x) }}>
                        <div className="w-1.5 h-6 bg-white dark:bg-slate-900 border-2 border-slate-400 rounded-full" />
                        <p className="text-[10px] font-bold text-slate-400 mt-1 text-center whitespace-nowrap">{p.l}<br />{p.x.toFixed(1)}</p>
                    </div>
                ))}
                <div className="absolute -bottom-9 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(current) }}>
                    <p className="text-[10px] font-extrabold text-[#0ea5e9] whitespace-nowrap mb-0.5">{lang === "ar" ? "الحالي" : "Current"} {current.toFixed(1)}</p>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#0ea5e9]" />
                </div>
            </div>
        </div>
    );
}

// Analyst recommendation distribution (stacked horizontal bar)
function RecommendationDistribution({ buy, over, hold, under, sell, total, lang }: {
    buy: number; over: number; hold: number; under: number; sell: number; total: number; lang: "en" | "ar";
}) {
    const segs = [
        { n: lang === "ar" ? "شراء قوي" : "Strong Buy", v: buy, c: "#059669" },
        { n: lang === "ar" ? "شراء" : "Buy", v: over, c: "#22c55e" },
        { n: lang === "ar" ? "احتفاظ" : "Hold", v: hold, c: "#f59e0b" },
        { n: lang === "ar" ? "بيع" : "Sell", v: under, c: "#fb7185" },
        { n: lang === "ar" ? "بيع قوي" : "Strong Sell", v: sell, c: "#dc2626" },
    ];
    return (
        <div className="premium-glass rounded-3xl p-6 md:p-8">
            <SectionHeader icon={Users} title={lang === "ar" ? `توصيات المحللين (${total})` : `Analyst Ratings (${total})`} color="text-indigo-500" />
            <div className="flex h-4 rounded-full overflow-hidden mb-5">
                {segs.map((s, i) => s.v > 0 && <div key={i} style={{ width: `${(s.v / Math.max(total, 1)) * 100}%`, background: s.c }} title={`${s.n}: ${s.v}`} />)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {segs.map((s, i) => (
                    <div key={i} className="text-center">
                        <p className="text-2xl font-extrabold" style={{ color: s.c }}>{s.v || 0}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{s.n}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Data-freshness pill: shows users exactly how current the price/chart is, so
// a stale number is never presented as if live. <30min = Live; <3 days = "as of
// <time>" (covers the Thu→Sun EGX weekend, neutral); older = amber "Delayed".
function dataFreshness(ts: any, lang: string): { text: string; dot: string; cls: string } | null {
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const ageH = (Date.now() - d.getTime()) / 3.6e6;
    const isAr = lang === "ar";
    const when = d.toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const day = d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });
    if (ageH < 0.5) return { text: isAr ? "مباشر" : "Live", dot: "bg-emerald-500 animate-pulse", cls: "text-emerald-600 dark:text-emerald-400" };
    if (ageH < 72) return { text: (isAr ? "حتى " : "as of ") + when, dot: "bg-slate-400", cls: "text-slate-400" };
    return { text: (isAr ? "بيانات متأخرة · حتى " : "Delayed · as of ") + day, dot: "bg-amber-500", cls: "text-amber-600 dark:text-amber-400" };
}

// 20-year financial history bar chart (pure SVG, TV-style)
function MiniBarChart({ title, data, color, currency, lang }: {
    title: string; color: string; currency: string; lang: "en" | "ar";
    data: { year: number; value: number | null }[];
}) {
    const pts = data.filter((d) => d.value != null) as { year: number; value: number }[];
    if (pts.length < 2) return null;
    const vals = pts.map((p) => p.value);
    const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
    const range = max - min || 1;
    const fmt = (v: number) => {
        const a = Math.abs(v);
        if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
        if (a >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
        return v.toFixed(1);
    };
    const last = pts[pts.length - 1];
    return (
        <div className="premium-glass rounded-3xl p-6">
            <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
            </div>
            <p className="text-2xl font-extrabold mb-3" style={{ color }}>{currency} {fmt(last.value)}</p>
            <div className="flex items-end gap-[3px] h-24" dir="ltr">
                {pts.slice(-12).map((p, i, a) => {
                    const h = ((p.value - min) / range) * 100;
                    const isLast = i === a.length - 1;
                    return (
                        <div key={p.year} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(h, 3)}%`, background: isLast ? color : `${color}66` }} title={`${p.year}: ${fmt(p.value)}`} />
                            <span className="text-[8px] text-slate-400 mt-1 font-bold">{`'${String(p.year).slice(2)}`}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Monthly seasonality — diverging bar chart (avg % return per calendar month).
// Pure SVG/flex, matches the page's bespoke chart idiom (TradingView Seasonals style).
function SeasonalChart({ months }: {
    months: { month: number; label: string; avg_return: number | null; positive_rate: number | null; years: number }[];
}) {
    const range = Math.max(...months.map((m) => Math.abs(m.avg_return ?? 0)), 1);
    return (
        <div className="flex items-stretch gap-1.5 h-56" dir="ltr">
            {months.map((m) => {
                const v = m.avg_return ?? 0;
                const up = v >= 0;
                const pct = (Math.abs(v) / range) * 50;
                return (
                    <div key={m.month} className="flex-1 flex flex-col items-center">
                        <div className="relative flex-1 w-full">
                            <div className="absolute left-0 right-0 rounded"
                                style={{
                                    top: `${up ? 50 - pct : 50}%`,
                                    bottom: `${up ? 50 : 50 - pct}%`,
                                    background: up ? "#10b981" : "#f43f5e",
                                    opacity: 0.88,
                                }}
                                title={`${m.label}: ${up ? "+" : ""}${v.toFixed(1)}%  ·  ${m.positive_rate ?? 0}% positive (${m.years}y)`} />
                            <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300 dark:bg-slate-600" />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1.5 font-bold">{m.label}</span>
                        <span className={`text-[9px] font-extrabold tabular ${up ? "text-emerald-500" : "text-rose-500"}`}>{up ? "+" : ""}{v.toFixed(1)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── MAIN PAGE COMPONENT ─────────────────────────────────────────────────────
export default function SymbolDetailPage() {
    const params = useParams();
    const router = useRouter();
    // The Arabic route is slugged (/ar/symbol/COMI-البنك-التجاري-الدولي) and the
    // param arrives PERCENT-ENCODED, so the raw value is not a ticker. Recover
    // it exactly the way the server route does — split at the first dash
    // followed by Arabic script — or this component asks the API for a symbol
    // called "COMI-%D8%A7…" and renders "Symbol Not Found" on a page the
    // server rendered successfully.
    const symbol = symbolFromArParam(params.id as string);
    const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

    const isEgx = useMemo(() => symbol.match(/^[a-zA-Z]/) !== null, [symbol]);
    // Statements/fundamentals are reported in the market currency (TV
    // fundamental_currency_code = EGP for every EGX line).
    const fundamentalsCurrency = isEgx ? "EGP" : "SAR";
    const marketName = isEgx ? "EGX" : "Tadawul";

    // The company page is a single-URL surface: its language comes from storage,
    // and it MUST resolve it with the site's one rule (lib/lang.ts R4). It used
    // to fall back to "en" and to cast whatever string it found, so a visitor
    // with no stored preference — the site default is ARABIC — got an English
    // company page, and a corrupted value was rendered as a language.
    const [lang, setLang] = useState<StoredLang>("ar");
    useEffect(() => {
        const savedLang = readStoredLang();
        setLang(savedLang);
        document.documentElement.lang = savedLang;
        document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    }, []);

    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const handleLangToggle = () => {
        const nextLang = lang === "en" ? "ar" : "en";
        setLang(nextLang);
        localStorage.setItem("starta-lang", nextLang);
        localStorage.setItem("lang", nextLang);
        // Cookie mirror too, so every surface reads the same preference.
        try { document.cookie = `starta-lang=${nextLang};path=/;max-age=31536000;samesite=lax`; } catch { /* private mode */ }
        document.documentElement.lang = nextLang;
        document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    };

    const { theme } = useTheme();
    useEffect(() => {
        if (theme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.style.colorScheme = "dark";
        }
    }, [theme]);

    type TabId = "overview" | "financials" | "technicals" | "ratios" | "dividends" | "news" | "profile";
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [chartFullscreen, setChartFullscreen] = useState(false);
    const [expandedNews, setExpandedNews] = useState<Set<number>>(new Set());

    // ─── QUERY PARAMETER TAB INITIALIZATION ──────────────────────────────
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab");
            if (tabParam && ["overview", "financials", "ratios", "dividends", "news", "profile"].includes(tabParam)) {
                setActiveTab(tabParam as TabId);
            }
        }
    }, []);

    // ─── DATA QUERIES ──────────────────────────────────────────────────────
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({
        queryKey: ["tickers"], queryFn: fetchTickers, staleTime: 30000
    });
    const stockData = useMemo(() => {
        const arr = Array.isArray(tickers) ? tickers : [];
        return arr.find((t: Ticker) => t.symbol === symbol);
    }, [tickers, symbol]);

    // Per-line TRADING currency (market_tickers.currency, fed from TradingView):
    // most EGX lines are EGP, but FAITA/EGBE/VLMRA trade in USD — labeling those
    // EGP is a misleading price. Fundamentals stay in fundamentalsCurrency.
    const currency = (stockData as any)?.currency || fundamentalsCurrency;

    // logo: use screener logo_url field if available from tickers
    const logoUrl = useMemo(() => {
        const arr = Array.isArray(tickers) ? tickers : [];
        const td = arr.find((t: Ticker) => t.symbol === symbol) as any;
        return td?.logo_url || `https://startamarkets.com/logos/${symbol}.svg`;
    }, [tickers, symbol]);

    const { data: localProfile } = useQuery({
        queryKey: ["local-profile", symbol],
        queryFn: () => fetchLocalCompanyProfile(symbol),
        enabled: !!symbol
    });

    // TV-ONLY MANDATE (June-2026): the audited-financials, corporate-actions,
    // OHLC/intraday and Yahoo-profile fetches were removed — every number on this
    // page now comes from TradingView feeds. The price chart is TradingView's own
    // embedded Advanced Chart (100% TV candles, not our ohlc_data).
    const { data: newsData = [] } = useQuery({
        queryKey: ["news-tv", symbol, lang],
        queryFn: () => fetchEgxNewsTV(symbol, lang),
        enabled: !!symbol
    });

    // Per-holder shareholders list removed (June-2026 audit): the major_shareholders
    // table held 6 fabricated demo rows that leaked onto EVERY symbol via a
    // return-all fallback, and TradingView has no per-holder data for EGX.
    // Ownership now shows TV-sourced float % / float shares / holders count.

    // TradingView technicals (multi-timeframe) + analyst estimates
    const { data: tvTechnicals } = useQuery({
        queryKey: ["egx-technicals", symbol],
        queryFn: () => fetchEgxTechnicals(symbol),
        enabled: !!symbol && isEgx, staleTime: 60000
    });
    const { data: tvEstimates } = useQuery({
        queryKey: ["egx-estimates", symbol],
        queryFn: () => fetchEgxEstimates(symbol),
        enabled: !!symbol && isEgx, staleTime: 300000
    });
    // Seasonals tab removed — it was computed from our own price history,
    // not TradingView data (TV exposes no seasonals via API).
    const { data: tvFinancials } = useQuery({
        queryKey: ["egx-financials-tv", symbol],
        queryFn: () => fetchEgxFinancialsTV(symbol),
        enabled: !!symbol && isEgx, staleTime: 600000
    });
    const { data: tvDividends } = useQuery({
        queryKey: ["egx-dividends-tv", symbol],
        queryFn: () => fetchEgxDividendsTV(symbol),
        enabled: !!symbol && isEgx, staleTime: 300000
    });
    const [techTf, setTechTf] = useState<"60" | "240" | "1D" | "1W">("1D");

    // Dividend history is TradingView's per-year DPS (egx_financials.dps) — the
    // legacy corporate_actions list (stockanalysis-era rows) is no longer shown.
    const dpsHistory = useMemo(() => {
        const yrs = Array.isArray(tvFinancials?.years) ? tvFinancials.years : [];
        return yrs
            .filter((y: any) => y.dps != null && Number(y.dps) > 0)
            .sort((a: any, b: any) => b.fiscal_year - a.fiscal_year)
            .slice(0, 15);
    }, [tvFinancials]);

    const stats = useMemo(() => parseNumericFields(localProfile?.statistics), [localProfile]);

    const isBank = useMemo(() => {
        const sec = (localProfile?.profile?.sector || (stockData as any)?.sector_name || "").toLowerCase();
        return sec.includes("bank") || sec.includes("financial services");
    }, [localProfile, stockData]);

    // Summary mini-chart series — TradingView-native (egx_financials) ONLY.
    // The audited-statements fallback was removed under the TV-only mandate.
    const cardSeries = useMemo(() => {
        if (Array.isArray(tvFinancials?.years) && tvFinancials.years.length >= 2) {
            return {
                source: "tradingview",
                rows: [...tvFinancials.years].sort((a: any, b: any) => a.fiscal_year - b.fiscal_year),
            };
        }
        return null;
    }, [tvFinancials]);

    // TV-only identity: company name / sector / market / currency / ISIN / logo all
    // come from the TradingView feeds (market_tickers + symbol_map). The old
    // description / officers / HQ / employees / founded / website / phone fields
    // (stale stockanalysis snapshot + Yahoo proxy) were removed — TradingView does
    // not provide them for EGX, so they are not shown.
    // sector_name is stored in English; the label beside it is Arabic, so the
    // raw value produced "القطاع: Finance". sectorAr() is a pure lookup and
    // falls back to the original for an unmapped sector.
    const sectorName = useMemo(() => {
        const raw = (stockData as any)?.sector_name || localProfile?.profile?.sector || "";
        return (lang === "ar" ? sectorAr(raw) : raw) || "";
    }, [stockData, localProfile, lang]);
    const isinCode = useMemo(() => (stockData as any)?.isin || "", [stockData]);

    // ─── DISPLAYED METRICS — TradingView-sourced ONLY (June-2026 audit) ─────
    // Every number below reads our TradingView-fed view (stats) or the TV tickers
    // row. The Yahoo proxy fallbacks were removed (Yahoo is provably wrong for
    // EGX: MASR mcap 9.07B vs real 14.84B, P/B 0.69 vs 1.17, quoteType "MUTUALFUND")
    // and house-computed fallbacks (EV, P/S, debt/equity, margins-from-statements)
    // are gone under the source-only display policy. Yahoo remains ONLY for
    // qualitative Profile text (description / officers / HQ).
    const marketCap = useMemo(() => Number(stats.market_cap || (stockData as any)?.market_cap || 0), [stats, stockData]);
    const peRatio = useMemo(() => Number(stats.pe_ratio || (stockData as any)?.pe_ratio || 0), [stats, stockData]);
    const pbRatio = useMemo(() => Number(stats.pb_ratio || (stockData as any)?.pb_ratio || 0), [stats, stockData]);
    const dividendYield = useMemo(() => Number(stats.dividend_yield || (stockData as any)?.dividend_yield || 0), [stats, stockData]);
    const betaValue = useMemo(() => Number(stats.beta_1y || 0), [stats]);
    const sharesOutstanding = useMemo(() => Number(stats.shares_outstanding || 0), [stats]);
    const totalDebt = useMemo(() => Number(stats.total_debt || 0), [stats]);
    const profitMargin = useMemo(() => Number(stats.profit_margin || 0), [stats]);
    const roe = useMemo(() => Number(stats.roe || 0), [stats]);
    const roa = useMemo(() => Number(stats.roa || 0), [stats]);
    const operatingMargin = useMemo(() => Number(stats.operating_margin || 0), [stats]);
    const grossMargin = useMemo(() => Number(stats.gross_margin || 0), [stats]);
    // TTM-first with FY fallback — value and label always agree (the old code
    // showed FY values under "(TTM)" labels for the whole universe).
    const epsDisplay = useMemo(() => {
        const ttm = Number(stats.eps_ttm || 0), fy = Number(stats.eps_fy || 0);
        return ttm !== 0 ? { v: ttm, basis: "TTM" } : { v: fy, basis: "FY" };
    }, [stats]);
    const revenueDisplay = useMemo(() => {
        const ttm = Number(stats.revenue_ttm || 0), fy = Number(stats.revenue_fy || 0);
        return ttm > 0 ? { v: ttm, basis: "TTM" } : { v: fy, basis: "FY" };
    }, [stats]);
    const netIncomeDisplay = useMemo(() => {
        const ttm = Number(stats.net_income_ttm || 0), fy = Number(stats.net_income_fy || 0);
        return ttm !== 0 ? { v: ttm, basis: "TTM" } : { v: fy, basis: "FY" };
    }, [stats]);
    const fcfDisplay = useMemo(() => {
        const ttm = Number(stats.fcf_ttm || 0), fy = Number(stats.fcf_fy || 0);
        return ttm !== 0 ? { v: ttm, basis: "TTM" } : { v: fy, basis: "FY" };
    }, [stats]);
    const trailingEps = epsDisplay.v;
    // stats.bvps is the TRUE per-share book value from the view; stats.book_value is
    // ABSOLUTE total equity (not per-share) so it is intentionally NOT a BVPS source.
    const bookValue = useMemo(() => Number(stats.bvps || 0), [stats]);
    const dividendRate = useMemo(() => Number(stats.dps || 0), [stats]);
    const payoutRatio = useMemo(() => Number(tvDividends?.payout_ratio_ttm || 0), [tvDividends]);
    const floatShares = useMemo(() => Number(stats.float_shares || 0), [stats]);
    const floatSharesPercent = useMemo(() => Number(stats.float_shares_percent || 0), [stats]);
    const shareholdersCount = useMemo(() => Number(stats.shareholders_count || 0), [stats]);
    const forwardPe = useMemo(() => Number(stats.forward_pe || 0), [stats]);

    // The native SVG chart (drawn from our ohlc_data — Yahoo-sourced history) was
    // removed under the TV-only mandate. The Overview chart is now TradingView's
    // own embedded Advanced Chart (see TradingViewInlineChart).

    // ─── LOADING & NOT FOUND STATES ──────────────────────────────────────
    if (tickersLoading) {
        return (
            <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0b0f19] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#14b8a6]/20 border-t-[#14b8a6] rounded-full animate-spin" />
            </div>
        );
    }

    if (!stockData) {
        return (
            <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0b0f19] flex items-center justify-center p-6 text-center">
                <div className="premium-glass max-w-md p-10 rounded-3xl border border-red-500/10">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Symbol Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">The requested EGX stock "{symbol}" could not be located.</p>
                    <button onClick={() => router.push("/Market-Pulse")} className="px-6 py-2.5 bg-[#14b8a6] text-white font-bold rounded-xl shadow-lg hover:bg-[#14b8a6]/90 transition-all">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    // Source-of-truth: the TradingView feed's own price/change — no chart-derived fallbacks.
    const lastPrice = Number((stockData as any).last_price || 0);
    const change = Number((stockData as any).change || 0);
    const changePercent = Number((stockData as any).change_percent || 0);
    const isPositive = change >= 0;
    const volume = Number((stockData as any)?.volume || 0);

    const TABS: { id: TabId; label: string; icon: any }[] = [
        { id: "overview", label: t.tab_overview, icon: Activity },
        { id: "financials", label: t.tab_financials, icon: FileText },
        { id: "technicals", label: lang === "ar" ? "الفني والتوقعات" : "Technicals & Forecasts", icon: Gauge },
        { id: "ratios", label: t.tab_ratios, icon: Target },
        { id: "dividends", label: t.tab_dividends, icon: Calendar },
        { id: "news", label: t.tab_news, icon: Newspaper },
        { id: "profile", label: t.tab_profile, icon: Building2 },
    ];

    return (
        <div className="min-h-screen text-[#10182d] dark:text-[#f1f5f9] font-sans pb-16 relative overflow-x-hidden transition-colors duration-300">
            <div className="grid-backdrop" />
            <div className="atmosphere" />

            <style jsx global>{`
                body { background: var(--page) !important; color: var(--ink) !important; transition: background 0.3s ease, color 0.3s ease; }
                .ohlc-metrics { min-height: 2.9rem; display: flex; flex-wrap: wrap; gap: 1.1rem; }
                .ohlc-metrics div { display: grid; gap: .18rem; }
                .ohlc-metrics span { color: var(--faint); font-size: .61rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .ohlc-metrics strong { font-size: .72rem; font-weight: 700; }
                .price-figure { position: relative; width: 100%; height: 350px; overflow: visible; }
                #stockChart { display: block; width: 100%; height: 100%; overflow: visible; }
                .gridline { fill: none; stroke: rgba(148, 163, 184, .16); stroke-width: 1; vector-effect: non-scaling-stroke; }
                .axis { fill: var(--faint); font: 10px "IBM Plex Mono", ui-monospace, monospace; font-weight: 700; }
                .candle-up { fill: var(--green); stroke: var(--green); }
                .candle-down { fill: var(--red); stroke: var(--red); }
                .wick { stroke-width: 1.3; vector-effect: non-scaling-stroke; }
                .volume-up { fill: rgba(7, 150, 105, .33); }
                .volume-down { fill: rgba(223, 83, 97, .3); }
                .chart-divider { stroke: rgba(148, 163, 184, .18); stroke-width: 1; vector-effect: non-scaling-stroke; }
                .chart-tooltip { position: absolute; border-radius: 10px; padding: 10px 14px; font-size: 0.72rem; pointer-events: none; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 1000; transition: opacity 120ms ease; display: none; text-align: left; }
                .chart-tooltip strong { display: block; font-size: 0.85rem; margin-top: 4px; font-family: "IBM Plex Mono", ui-monospace, monospace; font-weight: 600; }
                .chart-tooltip span { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
                html[data-theme="dark"] .chart-tooltip { background: rgba(16, 24, 45, 0.93); border: 1px solid rgba(20, 184, 166, 0.45); color: #f8fafc; box-shadow: 0 16px 36px rgba(15, 23, 42, 0.25); }
                html[data-theme="dark"] .chart-tooltip span { color: #94a3b8; }
                html[data-theme="dark"] .chart-tooltip strong { color: #14b8a6; }
                html[data-theme="light"] .chart-tooltip { background: rgba(255, 255, 255, 0.93); border: 1px solid rgba(20, 184, 166, 0.35); color: #0f172a; box-shadow: 0 16px 36px rgba(148, 163, 184, 0.18); }
                html[data-theme="light"] .chart-tooltip span { color: #64748b; }
                html[data-theme="light"] .chart-tooltip strong { color: #0d9488; }
                .hover-bar { cursor: pointer; }
                .hover-bar:hover { fill: rgba(20, 184, 166, 0.055) !important; }
                .premium-glass { background: var(--surface-soft); backdrop-filter: blur(20px); border: 1px solid var(--line); box-shadow: var(--shadow); transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
                .premium-glass:hover { box-shadow: var(--shadow-high); border-color: rgba(20, 184, 166, 0.25); }
                .site-nav { position: fixed; inset: 0 0 auto; z-index: 50; height: 5rem; border-bottom: 1px solid var(--line); background: var(--surface-soft); backdrop-filter: blur(20px); transition: background 0.3s, border-color 0.3s; }
                .nav-inner { max-width: 1536px; height: 5rem; margin: 0 auto; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; }
                .brand { display: flex; align-items: center; gap: 0.75rem; }
                .brand-mark { display: grid; place-items: center; width: 2.15rem; height: 2.15rem; border-radius: 0.62rem; background: var(--teal); color: #ffffff; font-size: 1.35rem; font-weight: 800; font-family: Sora, sans-serif; }
                .brand-name { font-size: 1.1rem; letter-spacing: 0.17em; font-weight: 800; font-family: Sora, sans-serif; color: var(--ink); }
                .nav-links { display: flex; gap: clamp(1.05rem, 1.9vw, 2rem); align-items: center; }
                .nav-links a { position: relative; color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; white-space: nowrap; transition: color 180ms ease; }
                html[dir="rtl"] .nav-links a { font-family: "IBM Plex Sans Arabic", sans-serif; font-size: 13px; letter-spacing: 0; }
                .nav-links a:hover, .nav-links a.active { color: var(--teal-dark); }
                .nav-links a.active::after { content: ""; position: absolute; inset: auto 0 -0.72rem; height: 2px; border-radius: 2px; background: var(--teal); }
                .lang-toggle { border: 1px solid var(--line); border-radius: 999px; padding: 0.5rem 0.9rem; background: var(--surface); font-weight: 700; font-size: 0.8rem; color: var(--ink); transition: border-color 180ms ease, box-shadow 180ms ease; }
                .lang-toggle:hover { border-color: rgba(20,184,166,0.38); box-shadow: 0 12px 24px rgba(20,184,166,0.1); }
                .grid-backdrop { position: fixed; inset: 0; z-index: -2; background-image: linear-gradient(rgba(15, 23, 42, .01) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, .015) 1px, transparent 1px); background-size: 42px 42px; }
                html[data-theme="dark"] .grid-backdrop { background-image: linear-gradient(rgba(148, 163, 184, .02) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, .025) 1px, transparent 1px); }
                .atmosphere { position: fixed; inset: 0; z-index: -1; pointer-events: none; background: radial-gradient(circle at 1% 0%, rgba(20, 184, 166, .06), transparent 28%), radial-gradient(circle at 100% 4%, rgba(45, 212, 191, .04), transparent 26%); }
                html[data-theme="dark"] .atmosphere { background: radial-gradient(circle at 1% 0%, rgba(20, 184, 166, .12), transparent 28%), radial-gradient(circle at 100% 4%, rgba(45, 212, 191, .07), transparent 26%); }
                .news-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .news-card:hover { transform: translateY(-2px); }
                .sentiment-positive { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
                .sentiment-negative { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
                .sentiment-neutral { background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }
                table { border-collapse: collapse; }
            `}</style>

            {/* NAVIGATION */}
            <nav className="site-nav">
                <div className="nav-inner">
                    <a className="brand" href="/"><span className="brand-mark">S</span><span className="brand-name">STARTA</span></a>
                    <div className="nav-links hidden lg:flex">
                        <a href="/">{t.nav_home}</a>
                        <a href="/Funds">{t.nav_funds}</a>
                        <a className="active" href="/Market-Pulse">{t.nav_pulse}</a>
                        <a href="/News">{t.nav_news}</a>
                        <a href="/Learn">{t.nav_learn}</a>
                        <a href="/Portfolio">{t.nav_portfolio}</a>
                        <a href="#about-us">{t.nav_about}</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button onClick={handleLangToggle} className="lang-toggle" type="button">{lang === "en" ? "AR" : "EN"}</button>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <div className="max-w-[1536px] mx-auto px-6 pt-28 pb-4">
                <div className="premium-glass rounded-3xl p-8 border relative overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] opacity-5 blur-3xl" />
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                        {/* Left: Logo + Name */}
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black shadow-lg flex-shrink-0 ${isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                                <img
                                    src={logoUrl}
                                    alt={symbol}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        (e.target as HTMLImageElement).parentElement!.textContent = symbol.slice(0, 2);
                                    }}
                                    className="w-full h-full object-contain p-2"
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl font-black tracking-tight uppercase">{symbol}</h1>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">{marketName}</span>
                                </div>
                                <h2 className="text-slate-500 dark:text-slate-400 font-semibold text-lg mt-1.5">
                                    {lang === "ar" && (stockData as any).name_ar ? (stockData as any).name_ar : ((stockData as any).name_en || symbol)}
                                </h2>
                                {(() => {
                                    const f = dataFreshness((stockData as any).last_updated || (stockData as any).updated_at, lang);
                                    return f ? (
                                        <p className={`text-xs font-semibold mt-1 inline-flex items-center gap-1.5 ${f.cls}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                                            {f.text}
                                        </p>
                                    ) : null;
                                })()}
                            </div>
                        </div>

                        {/* Right: Price */}
                        <div className="flex items-center gap-6 lg:text-right">
                            <div>
                                <div className="flex items-baseline gap-2 justify-start lg:justify-end">
                                    <span className="text-5xl font-black tracking-tight tabular">{lastPrice.toFixed(2)}</span>
                                    <span className="text-slate-500 font-bold text-sm">{currency}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-extrabold mt-1 justify-start lg:justify-end flex">
                                    {lang === "ar" ? "(سعر الإغلاق)" : "(Closing Price)"}
                                </div>
                                <div className={`flex items-center gap-2 mt-2 font-bold text-sm justify-start lg:justify-end ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    <span className={`px-2.5 py-1 rounded-lg ${isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}>
                                        {Math.abs(change) >= 0.005 ? `${isPositive ? "+" : ""}${change.toFixed(2)} ` : ""}
                                        ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OHLC Quick Strip removed — Volume / Avg Vol 20D / Rel. Volume / 52W High /
                        52W Low / Period Return are already shown in the Overview "Technical
                        Momentum" section, the price-chart strip, and the right sidebar. */}
                </div>
            </div>

            {/* QUICK STATS ROW removed — Market Cap / P/E / Div Yield / EPS / BVPS / Beta
                are already shown in Overview "Key Metrics", the Ratios & Risk tab, and the
                right sidebar, so this duplicate header strip is hidden. */}

            {/* TABS */}
            <div className="max-w-[1536px] mx-auto px-6 mb-8">
                <div className="premium-glass rounded-2xl p-2 flex gap-1.5 overflow-x-auto scrollbar-hide shadow-sm">
                    {TABS.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === tab.id ? "bg-[#14b8a6] text-white shadow-lg" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                            <tab.icon className="w-4 h-4" />{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="max-w-[1536px] mx-auto px-6">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* LEFT COL */}
                    <div className="xl:col-span-3 space-y-8">

                        {/* ═══════════════════════ OVERVIEW TAB ═══════════════════════ */}
                        {activeTab === "overview" && (
                            <>
                                {/* Chart — TradingView's own embedded Advanced Chart (100% TV data). */}
                                <div className="premium-glass rounded-3xl p-4 relative">
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <span className="text-xs text-slate-400 font-bold">{t.price_chart}</span>
                                        <button type="button" onClick={() => setChartFullscreen(true)}
                                            title={lang === "ar" ? "تكبير الرسم البياني" : "Enlarge chart"} aria-label={lang === "ar" ? "تكبير الرسم البياني" : "Enlarge chart"}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#14b8a6] hover:bg-[#14b8a6]/10 transition-colors">
                                            <Maximize2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <TradingViewInlineChart tvSymbol={`EGX:${symbol}`} lang={lang} height={480} />
                                </div>

                                <TradingViewChartModal open={chartFullscreen} onClose={() => setChartFullscreen(false)} tvSymbol={`EGX:${symbol}`} title={symbol} lang={lang} />

                                {/* TradingView signal strip — Technical Rating + Analyst Target, under the chart */}
                                {isEgx && (() => {
                                    const dt = Array.isArray(tvTechnicals?.timeframes) ? tvTechnicals.timeframes.find((x: any) => x.timeframe === "1D") : null;
                                    const hasT = dt && dt.recommend_all != null;
                                    const hasE = tvEstimates?.covered && Number(tvEstimates.target_average) > 0;
                                    if (!hasT && !hasE) return null;
                                    const m = recMeta(dt?.recommend_all);
                                    return (
                                        <div className="premium-glass rounded-3xl p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                                            {hasT && (
                                                <button onClick={() => setActiveTab("technicals")} className="flex items-center gap-3 group">
                                                    <Gauge className="w-5 h-5" style={{ color: m.color }} />
                                                    <div className="text-left rtl:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{lang === "ar" ? "التقييم الفني" : "Technical Rating"}</p>
                                                        <p className="font-extrabold group-hover:underline" style={{ color: m.color }}>{lang === "ar" ? m.labelAr : m.label}</p></div>
                                                </button>
                                            )}
                                            {hasE && (
                                                <button onClick={() => setActiveTab("technicals")} className="flex items-center gap-3 group">
                                                    <Crosshair className="w-5 h-5 text-[#14b8a6]" />
                                                    <div className="text-left rtl:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{lang === "ar" ? "هدف المحللين" : "Analyst Target"}</p>
                                                        <p className="font-extrabold group-hover:underline">{currency} {Number(tvEstimates.target_average).toFixed(2)}</p></div>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Technical Momentum card removed — house-computed MA/RSI/52W-return/relative-volume duplicated the attributed TradingView technicals tab; source-only policy. */}

                                {/* Key Metrics expanded */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Target} title={t.metrics} color="text-amber-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.market_cap} value={marketCap > 0 ? formatCurrency(marketCap, fundamentalsCurrency) : "-"} icon={Landmark} color="text-[#14b8a6]" />
                                        <MetricCard label={t.pe_ratio} value={peRatio > 0 ? peRatio.toFixed(2) : "-"} icon={Target} color="text-amber-500" />
                                        <MetricCard label={t.forward_pe} value={forwardPe > 0 ? forwardPe.toFixed(2) : "-"} icon={Target} color="text-amber-400" />
                                        <MetricCard label={t.pb_ratio} value={pbRatio > 0 ? pbRatio.toFixed(2) : "-"} icon={FileText} color="text-indigo-500" />
                                        <MetricCard label={`${lang === "ar" ? "ربحية السهم" : "EPS"} (${epsDisplay.basis})`} value={epsDisplay.v !== 0 ? `${fundamentalsCurrency} ${epsDisplay.v.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                        <MetricCard label={t.bvps} value={bookValue > 0 ? `${fundamentalsCurrency} ${bookValue.toFixed(2)}` : "-"} icon={BookOpen} color="text-blue-500" />
                                        <MetricCard label={`${lang === "ar" ? "الإيرادات" : "Revenue"} (${revenueDisplay.basis})`} value={revenueDisplay.v > 0 ? formatCurrency(revenueDisplay.v, fundamentalsCurrency) : "-"} icon={BarChart3} color="text-teal-500" />
                                        <MetricCard label={`${lang === "ar" ? "صافي الدخل" : "Net Income"} (${netIncomeDisplay.basis})`} value={netIncomeDisplay.v !== 0 ? formatCurrency(netIncomeDisplay.v, fundamentalsCurrency) : "-"} icon={Award} color="text-emerald-500" />
                                        <MetricCard label={t.total_debt} value={totalDebt > 0 ? formatCurrency(totalDebt, fundamentalsCurrency) : "-"} icon={TrendDown} color="text-rose-500" />
                                    </div>
                                </div>

                                {/* Ownership Summary Strip — TradingView fields only */}
                                {(floatSharesPercent > 0 || floatShares > 0 || sharesOutstanding > 0) && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Users} title={lang === "ar" ? "هيكل الملكية" : "Ownership Structure"} color="text-indigo-500" />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {sharesOutstanding > 0 && <MetricCard label={t.outstanding} value={formatNumber(sharesOutstanding)} icon={Users} color="text-slate-400" />}
                                            {floatShares > 0 && <MetricCard label={t.float_shares} value={formatNumber(floatShares)} icon={Users} color="text-blue-500" />}
                                            {floatSharesPercent > 0 && <MetricCard label={lang === "ar" ? "نسبة التداول الحر" : "Free Float"} value={`${floatSharesPercent.toFixed(2)}%`} icon={PieChart} color="text-indigo-500" />}
                                            {shareholdersCount > 0 && <MetricCard label={lang === "ar" ? "عدد المساهمين" : "Shareholders"} value={formatNumber(shareholdersCount)} icon={Briefcase} color="text-orange-500" />}
                                        </div>
                                    </div>
                                )}

                                {/* Internal valuation models (DCF / DDM / P-E target + "% vs current price") removed — house-generated price targets are model opinion, not source data. */}
                            </>
                        )}

                        {/* ═══════════════════════ FINANCIALS TAB ═══════════════════════ */}
                        {activeTab === "financials" && (
                            <div className="space-y-6">
                                {cardSeries && cardSeries.rows.length >= 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <MiniBarChart title={lang === "ar" ? "الإيرادات السنوية" : "Revenue (Annual)"} color="#14b8a6" currency={fundamentalsCurrency} lang={lang}
                                            data={cardSeries.rows.map((y: any) => ({ year: y.fiscal_year, value: y.revenue != null ? Number(y.revenue) : null }))} />
                                        <MiniBarChart title={lang === "ar" ? "صافي الدخل السنوي" : "Net Income (Annual)"} color="#10b981" currency={fundamentalsCurrency} lang={lang}
                                            data={cardSeries.rows.map((y: any) => ({ year: y.fiscal_year, value: y.net_income != null ? Number(y.net_income) : null }))} />
                                        <MiniBarChart title={lang === "ar" ? "إجمالي الأصول السنوي" : "Total Assets (Annual)"} color="#6366f1" currency={fundamentalsCurrency} lang={lang}
                                            data={cardSeries.rows.map((y: any) => ({ year: y.fiscal_year, value: y.total_assets != null ? Number(y.total_assets) : null }))} />
                                    </div>
                                )}
                            {(() => {
                                const yrs = Array.isArray(tvFinancials?.years)
                                    ? [...tvFinancials.years].sort((a: any, b: any) => b.fiscal_year - a.fiscal_year).slice(0, 12)
                                    : [];
                                if (yrs.length === 0) {
                                    return (
                                        <div className="premium-glass rounded-3xl p-8">
                                            <div className="flex flex-col items-center py-16 text-slate-400">
                                                <AlertCircle className="w-12 h-12 mb-3" />
                                                <p className="text-sm font-semibold">{t.empty_state}</p>
                                            </div>
                                        </div>
                                    );
                                }
                                const col = (v: any) => (v != null ? formatCurrency(v, fundamentalsCurrency) : "-");
                                const ps = (v: any) => (v != null ? `${fundamentalsCurrency} ${Number(v).toFixed(2)}` : "-");
                                return (
                                    <div className="premium-glass rounded-3xl p-8 space-y-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/10 pb-6">
                                            <div>
                                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-[#14b8a6]" /> {lang === "ar" ? "الملخص المالي" : "Financial Summary"}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">{lang === "ar" ? "سنوي · " : "Annual · "}{fundamentalsCurrency}</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider text-right">
                                                        <th className="text-left py-4 px-4 min-w-[90px]">{lang === "ar" ? "الفترة" : "Period"}</th>
                                                        <th className="py-4 px-4 min-w-[120px]">{lang === "ar" ? "الإيرادات" : "Revenue"}</th>
                                                        <th className="py-4 px-4 min-w-[120px]">{lang === "ar" ? "إجمالي الربح" : "Gross Profit"}</th>
                                                        <th className="py-4 px-4 min-w-[110px]">EBITDA</th>
                                                        <th className="py-4 px-4 min-w-[120px]">{lang === "ar" ? "صافي الدخل" : "Net Income"}</th>
                                                        <th className="py-4 px-4 min-w-[80px]">{lang === "ar" ? "ربحية السهم" : "EPS"}</th>
                                                        <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "التدفق النقدي الحر" : "Free Cash Flow"}</th>
                                                        <th className="py-4 px-4 min-w-[120px]">{lang === "ar" ? "إجمالي الأصول" : "Total Assets"}</th>
                                                        <th className="py-4 px-4 min-w-[110px]">{lang === "ar" ? "إجمالي الديون" : "Total Debt"}</th>
                                                        <th className="py-4 px-4 min-w-[80px]">{lang === "ar" ? "التوزيع" : "DPS"}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {yrs.map((f: any) => {
                                                        return (
                                                            <tr key={f.fiscal_year} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold text-sm text-right">
                                                                <td className="py-5 px-4 text-left text-slate-850 dark:text-white whitespace-nowrap">FY {f.fiscal_year}</td>
                                                                <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-200">{col(f.revenue)}</td>
                                                                <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{col(f.gross_profit)}</td>
                                                                <td className="py-5 px-4 tabular text-slate-600 dark:text-slate-400">{col(f.ebitda)}</td>
                                                                <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{col(f.net_income)}</td>
                                                                <td className="py-5 px-4 tabular">{ps(f.eps_diluted)}</td>
                                                                <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{col(f.free_cash_flow)}</td>
                                                                <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{col(f.total_assets)}</td>
                                                                <td className="py-5 px-4 tabular text-rose-500/80">{col(f.total_debt)}</td>
                                                                <td className="py-5 px-4 tabular text-amber-600 dark:text-amber-400">{ps(f.dps)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                            </div>
                        )}

                        {/* ═══════════════════════ TECHNICALS TAB ═══════════════════════ */}
                        {activeTab === "technicals" && (() => {
                            const tfs = Array.isArray(tvTechnicals?.timeframes) ? tvTechnicals.timeframes : [];
                            const tf = tfs.find((x: any) => x.timeframe === techTf) || tfs.find((x: any) => x.timeframe === "1D") || tfs[0];
                            if (!tf) {
                                return (
                                    <div className="premium-glass rounded-3xl p-12 text-center">
                                        <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">{t.tech_no_data}</p>
                                    </div>
                                );
                            }
                            const sig = (cond: boolean | null, inv = false): "buy" | "sell" | "neutral" =>
                                cond == null ? "neutral" : (cond !== inv ? "buy" : "sell");
                            const rsiSig = tf.rsi == null ? "neutral" : tf.rsi > 70 ? "sell" : tf.rsi < 30 ? "buy" : "neutral";
                            const stochSig = tf.stoch_k == null ? "neutral" : tf.stoch_k > 80 ? "sell" : tf.stoch_k < 20 ? "buy" : "neutral";
                            const cciSig = tf.cci20 == null ? "neutral" : tf.cci20 > 100 ? "buy" : tf.cci20 < -100 ? "sell" : "neutral";
                            const macdSig = (tf.macd_macd == null || tf.macd_signal == null) ? "neutral" : sig(tf.macd_macd > tf.macd_signal);
                            const momSig = tf.mom == null ? "neutral" : sig(tf.mom > 0);
                            const maSig = (ma: number | null) => ma == null || !lastPrice ? "neutral" as const : sig(lastPrice > ma);
                            const TF_BTNS: { id: typeof techTf; label: string }[] = [
                                { id: "60", label: t.tf_1h }, { id: "240", label: t.tf_4h }, { id: "1D", label: t.tf_1d }, { id: "1W", label: t.tf_1w },
                            ];
                            return (
                                <div className="space-y-6">
                                    {/* timeframe selector */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {TF_BTNS.map((b) => (
                                            <button key={b.id} onClick={() => setTechTf(b.id)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${techTf === b.id ? "bg-[#14b8a6] text-white shadow-lg shadow-[#14b8a6]/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[#14b8a6]"}`}>
                                                {b.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* gauges */}
                                    <div className="premium-glass rounded-3xl p-6 md:p-8">
                                        <SectionHeader icon={Gauge} title={t.tech_summary} color="text-[#14b8a6]" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <RecommendationGauge value={tf.recommend_other} title={t.tech_oscillators} lang={lang} />
                                            <RecommendationGauge value={tf.recommend_all} title={lang === "ar" ? "الملخص" : "Summary"} lang={lang} />
                                            <RecommendationGauge value={tf.recommend_ma} title={t.tech_mas} lang={lang} />
                                        </div>
                                        {tf.updated_at && (
                                            <p className="text-[11px] text-slate-400 text-center mt-4 font-medium">
                                                {lang === "ar" ? "آخر تحديث" : "Last updated"}{" "}
                                                {new Date(tf.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "short", timeStyle: "short" })}
                                                {lang === "ar" ? " · بيانات مؤجلة ١٥ دقيقة" : " · 15min delayed"}
                                            </p>
                                        )}
                                    </div>
                                    {/* indicator tables */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <IndicatorTable title={t.tech_oscillators} icon={Activity} color="text-amber-500" lang={lang} rows={[
                                            { name: "RSI (14)", value: tf.rsi, signal: rsiSig },
                                            { name: "Stochastic %K", value: tf.stoch_k, signal: stochSig },
                                            { name: "Stochastic %D", value: tf.stoch_d, signal: "neutral" },
                                            { name: "CCI (20)", value: tf.cci20, signal: cciSig },
                                            { name: "MACD", value: tf.macd_macd, signal: macdSig },
                                            { name: "ADX (14)", value: tf.adx, signal: "neutral" },
                                            { name: "Momentum", value: tf.mom, signal: momSig },
                                        ]} />
                                        <IndicatorTable title={t.tech_mas} icon={TrendingUp} color="text-indigo-500" lang={lang} rows={[
                                            { name: "EMA 50", value: tf.ema50, signal: maSig(tf.ema50) },
                                            { name: "EMA 200", value: tf.ema200, signal: maSig(tf.ema200) },
                                            { name: "SMA 50", value: tf.sma50, signal: maSig(tf.sma50) },
                                            { name: "SMA 200", value: tf.sma200, signal: maSig(tf.sma200) },
                                        ]} />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ════════ FORECASTS — merged into the "Technicals & Forecasts" tab ════════ */}
                        {activeTab === "technicals" && (
                            <div className="space-y-6 mt-6">
                                {(!tvEstimates || tvEstimates.covered === false) ? (
                                    <div className="premium-glass rounded-3xl p-12 text-center">
                                        <Crosshair className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">{t.fc_no_coverage}</p>
                                    </div>
                                ) : (
                                    <>
                                        {tvEstimates.target_average > 0 && lastPrice > 0 && (
                                            <AnalystTargetBar low={Number(tvEstimates.target_low) || Number(tvEstimates.target_average)}
                                                avg={Number(tvEstimates.target_average)} high={Number(tvEstimates.target_high) || Number(tvEstimates.target_average)}
                                                current={lastPrice} currency={fundamentalsCurrency} lang={lang} />
                                        )}
                                        <RecommendationDistribution buy={Number(tvEstimates.rec_buy) || 0} over={Number(tvEstimates.rec_over) || 0}
                                            hold={Number(tvEstimates.rec_hold) || 0} under={Number(tvEstimates.rec_under) || 0} sell={Number(tvEstimates.rec_sell) || 0}
                                            total={Number(tvEstimates.rec_total) || 0} lang={lang} />
                                        <div className="premium-glass rounded-3xl p-6 md:p-8">
                                            <SectionHeader icon={TrendingUp} title={lang === "ar" ? "توقعات الأرباح" : "Earnings Forecasts"} color="text-emerald-500" />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <MetricCard label={t.fc_eps_next} value={tvEstimates.eps_fcst_next_fq ? `${fundamentalsCurrency} ${Number(tvEstimates.eps_fcst_next_fq).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                                <MetricCard label={t.fc_rev_next} value={tvEstimates.rev_fcst_next_fq ? formatCurrency(Number(tvEstimates.rev_fcst_next_fq), fundamentalsCurrency) : "-"} icon={BarChart3} color="text-[#14b8a6]" />
                                                <MetricCard label={t.fc_eps_y} value={tvEstimates.eps_fcst_next_fy ? `${fundamentalsCurrency} ${Number(tvEstimates.eps_fcst_next_fy).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-400" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Seasonals tab removed (TV-only mandate): monthly seasonality was computed
                            from our own price history — TradingView exposes no seasonals via API. */}

                        {/* ═══════════════════════ RATIOS & RISK TAB ═══════════════════════ */}
                        {activeTab === "ratios" && (
                            <div className="space-y-6">
                                {/* Valuation Multiples */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Award} title={t.valuation_multiples} color="text-amber-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.market_cap} value={marketCap > 0 ? formatCurrency(marketCap, fundamentalsCurrency) : "-"} icon={Landmark} color="text-[#14b8a6]" />
                                        <MetricCard label={t.pe_ratio} value={peRatio > 0 ? peRatio.toFixed(2) : "-"} icon={Target} color="text-amber-500" />
                                        <MetricCard label={t.forward_pe} value={forwardPe > 0 ? forwardPe.toFixed(2) : "-"} icon={Target} color="text-amber-400" />
                                        <MetricCard label={t.pb_ratio} value={pbRatio > 0 ? pbRatio.toFixed(2) : "-"} icon={FileText} color="text-indigo-500" />
                                        <MetricCard label={`${lang === "ar" ? "ربحية السهم" : "EPS"} (${epsDisplay.basis})`} value={epsDisplay.v !== 0 ? `${fundamentalsCurrency} ${epsDisplay.v.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                    </div>
                                </div>

                                {/* Per-Share Metrics */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={DollarSign} title={t.per_share} color="text-emerald-500" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <MetricCard label={`${lang === "ar" ? "ربحية السهم" : "EPS"} (${epsDisplay.basis})`} value={epsDisplay.v !== 0 ? `${fundamentalsCurrency} ${epsDisplay.v.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                        <MetricCard label={t.bvps} value={bookValue > 0 ? `${fundamentalsCurrency} ${bookValue.toFixed(2)}` : "-"} icon={BookOpen} color="text-blue-500" />
                                        <MetricCard label={t.dps} value={dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-"} icon={Wallet} color="text-teal-500" />
                                    </div>
                                </div>

                                {/* Profitability — TradingView margins only */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Zap} title={t.profitability_margins} color="text-emerald-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.profit_margin} value={profitMargin !== 0 ? pct(profitMargin) : "-"} icon={Award} color="text-emerald-500" />
                                        <MetricCard label={t.operating_margin} value={operatingMargin !== 0 ? pct(operatingMargin) : "-"} icon={Activity} color="text-blue-500" />
                                        {!isBank && <MetricCard label={lang === "ar" ? "هامش إجمالي الربح" : "Gross Margin"} value={grossMargin !== 0 ? pct(grossMargin) : "-"} icon={BarChart3} color="text-indigo-500" />}
                                        <MetricCard label={t.roe} value={roe !== 0 ? pct(roe) : "-"} icon={CheckCircle} color="text-teal-500" />
                                        <MetricCard label={t.roa} value={roa !== 0 ? pct(roa) : "-"} icon={Activity} color="text-purple-500" />
                                        <MetricCard label={`${lang === "ar" ? "الإيرادات" : "Revenue"} (${revenueDisplay.basis})`} value={revenueDisplay.v > 0 ? formatCurrency(revenueDisplay.v, fundamentalsCurrency) : "-"} icon={BarChart3} color="text-teal-500" />
                                        <MetricCard label={`${lang === "ar" ? "صافي الدخل" : "Net Income"} (${netIncomeDisplay.basis})`} value={netIncomeDisplay.v !== 0 ? formatCurrency(netIncomeDisplay.v, fundamentalsCurrency) : "-"} icon={Award} color="text-emerald-500" />
                                    </div>
                                </div>

                                {/* Debt & Cash Flow — TradingView fields only */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Wallet} title={t.liquidity_solvency} color="text-indigo-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.total_debt} value={totalDebt > 0 ? formatCurrency(totalDebt, fundamentalsCurrency) : "-"} icon={TrendDown} color="text-rose-500" />
                                        <MetricCard label={`${lang === "ar" ? "التدفق النقدي الحر" : "Free Cash Flow"} (${fcfDisplay.basis})`} value={fcfDisplay.v !== 0 ? formatCurrency(fcfDisplay.v, fundamentalsCurrency) : "-"} icon={Activity} color="text-emerald-500" />
                                    </div>
                                </div>

                                {/* Dividends & Risk */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Briefcase} title={t.dividends_risk} color="text-purple-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.div_yield} value={dividendYield > 0 ? pct(dividendYield) : "-"} icon={Wallet} color="text-emerald-500" />
                                        <MetricCard label={t.dps} value={dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-"} icon={Wallet} color="text-teal-500" />
                                        <MetricCard label={t.payout_ratio} value={payoutRatio > 0 ? pct(payoutRatio) : "-"} icon={FileText} color="text-amber-500" />
                                        <MetricCard label={`${t.beta} (1Y)`} value={betaValue !== 0 ? betaValue.toFixed(2) : "-"} icon={Activity} color="text-rose-500" />
                                        <MetricCard label={t.outstanding} value={sharesOutstanding > 0 ? formatNumber(sharesOutstanding) : "-"} icon={Users} color="text-blue-500" />
                                        <MetricCard label={t.float_shares} value={floatShares > 0 ? formatNumber(floatShares) : "-"} icon={Users} color="text-indigo-500" />
                                        <MetricCard label={lang === "ar" ? "نسبة التداول الحر" : "Free Float"} value={floatSharesPercent > 0 ? `${floatSharesPercent.toFixed(2)}%` : "-"} icon={PieChart} color="text-indigo-500" />
                                        <MetricCard label={lang === "ar" ? "عدد المساهمين" : "Shareholders"} value={shareholdersCount > 0 ? formatNumber(shareholdersCount) : "-"} icon={Briefcase} color="text-orange-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════ DIVIDENDS & ACTIONS TAB ═══════════════════════ */}
                        {activeTab === "dividends" && (
                            <div className="space-y-8">
                                {/* TradingView dividend snapshot + forward calendar */}
                                {isEgx && tvDividends?.pays_dividend && (() => {
                                    const fmtD = (u: number | null) => u ? new Date(u * 1000).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";
                                    const dv = tvDividends;
                                    return (
                                        <div className="premium-glass rounded-3xl p-6 md:p-8">
                                            <SectionHeader icon={Calendar} title={lang === "ar" ? "التوزيعات" : "Dividends"} color="text-[#14b8a6]" />
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <MetricCard label={lang === "ar" ? "عائد التوزيع" : "Dividend Yield"} value={dv.div_yield != null ? `${Number(dv.div_yield).toFixed(2)}%` : "-"} icon={TrendingUp} color="text-[#14b8a6]" />
                                                <MetricCard label={lang === "ar" ? "آخر توزيع" : "Last Dividend"} value={dv.amount_recent != null ? `${currency} ${Number(dv.amount_recent).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" subtitle={lang === "ar" ? `تاريخ الاستحقاق ${fmtD(dv.ex_date_recent)}` : `Ex-date ${fmtD(dv.ex_date_recent)}`} />
                                                <MetricCard label={lang === "ar" ? "نسبة التوزيع" : "Payout Ratio"} value={dv.payout_ratio_ttm != null && Number(dv.payout_ratio_ttm) > 0 ? `${Number(dv.payout_ratio_ttm).toFixed(1)}%` : "-"} icon={PieChart} color="text-amber-500" />
                                                <MetricCard label={lang === "ar" ? "سنوات النمو" : "Growth Streak"} value={dv.continuous_growth != null && Number(dv.continuous_growth) > 0 ? `${Number(dv.continuous_growth)} ${lang === "ar" ? "سنة" : "yrs"}` : "-"} icon={Award} color="text-indigo-500" />
                                            </div>
                                            {(dv.ex_date_upcoming || dv.payment_date_upcoming) && (
                                                <div className="mt-4 p-4 rounded-2xl bg-[#14b8a6]/8 border border-[#14b8a6]/20 flex flex-wrap items-center gap-x-8 gap-y-2">
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#14b8a6]">{lang === "ar" ? "التوزيع القادم" : "Upcoming Dividend"}</span>
                                                    {dv.amount_upcoming != null && <span className="text-sm font-bold">{currency} {Number(dv.amount_upcoming).toFixed(2)}</span>}
                                                    {dv.ex_date_upcoming && <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{lang === "ar" ? "الاستحقاق" : "Ex-date"}: {fmtD(dv.ex_date_upcoming)}</span>}
                                                    {dv.payment_date_upcoming && <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{lang === "ar" ? "الدفع" : "Payment"}: {fmtD(dv.payment_date_upcoming)}</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {/* Dividend History — TradingView's per-year DPS (egx_financials.dps).
                                    The legacy corporate_actions list and "Other Corporate Actions"
                                    (non-TV sources) were removed under the TV-only mandate. */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Calendar} title={t.dividend_history} color="text-emerald-500" />
                                    {dpsHistory.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 text-center">
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{t.dps}</p>
                                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular">{dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-"}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200 dark:border-teal-500/20 text-center">
                                                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">{t.div_yield}</p>
                                                    <p className="text-xl font-black text-teal-700 dark:text-teal-300 tabular">{dividendYield > 0 ? pct(dividendYield) : "-"}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-center">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === "ar" ? "سنوات التوزيع" : "Paying Years"}</p>
                                                    <p className="text-xl font-black tabular">{dpsHistory.length}</p>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                            <th className="text-left py-3 px-4">{lang === "ar" ? "السنة المالية" : "Fiscal Year"}</th>
                                                            <th className="text-right py-3 px-4">{lang === "ar" ? "التوزيع للسهم (DPS)" : "Dividend / Share (DPS)"}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dpsHistory.map((y: any) => (
                                                            <tr key={y.fiscal_year} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold">
                                                                <td className="py-4 px-4 text-left">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase mr-2">DIV</span>
                                                                    FY {y.fiscal_year}
                                                                </td>
                                                                <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular text-base font-black">
                                                                    {currency} {Number(y.dps).toFixed(4)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-[11px] text-slate-400">{lang === "ar" ? "توزيعات لكل سنة مالية" : "Dividends per fiscal year"}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-16 text-slate-400">
                                            <AlertCircle className="w-12 h-12 mb-3" />
                                            <p className="text-sm font-semibold">{t.empty_state}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════ NEWS TAB ═══════════════════════ */}
                        {activeTab === "news" && (
                            <div className="premium-glass rounded-3xl p-8">
                                <SectionHeader icon={Newspaper} title={t.news_sentiment} color="text-blue-500" />
                                {Array.isArray(newsData) && newsData.length > 0 ? (
                                    <div className="space-y-4">
                                        {newsData.map((article: any, i: number) => {
                                            const score = Number(article.sentiment_score || 0);
                                            const sentimentLabel = score > 0.3 ? t.positive : score < -0.3 ? t.negative : t.neutral;
                                            const sentimentClass = score > 0.3 ? "sentiment-positive" : score < -0.3 ? "sentiment-negative" : "sentiment-neutral";
                                            const isExpanded = expandedNews.has(i);
                                            
                                            // Sanitize headlines and summaries to prevent external brand exposure
                                            const cleanHeadline = sanitizeNewsText(article.headline);
                                            const cleanBody = sanitizeNewsText(article.article_body);
                                            const resolvedImg = getNewsBrandedCover(article, lang, symbol);

                                            return (
                                                <div key={i} className="news-card p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
                                                    <div className="flex items-start gap-5">
                                                        {/* Premium Visual Fallback & Proxied Image Cover */}
                                                        <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 hidden md:flex items-center justify-center relative bg-white dark:bg-white border border-slate-200 dark:border-slate-800 shadow-inner">
                                                            {resolvedImg ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={resolvedImg}
                                                                    alt=""
                                                                    className="w-full h-full object-contain transition-transform duration-500 hover:scale-102"
                                                                    onError={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.display = "none";
                                                                        const parent = e.currentTarget.parentElement;
                                                                        if (parent) {
                                                                            const placeholder = parent.querySelector(".news-fallback-placeholder") as HTMLElement;
                                                                            if (placeholder) placeholder.style.display = "flex";
                                                                        }
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                className="news-fallback-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#14b8a6]/20 to-[#0f766e]/20 text-[#14b8a6]"
                                                                style={{ display: resolvedImg ? "none" : "flex" }}
                                                            >
                                                                <Newspaper className="w-5 h-5 opacity-70 mb-1" />
                                                                <span className="text-[9px] font-black uppercase tracking-wider">{symbol}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${sentimentClass}`}>{sentimentLabel}</span>
                                                                {article.source && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                                                        {article.origin === "tradingview"
                                                    ? (article.source && !/tradingview/i.test(String(article.source)) ? article.source : (lang === "ar" ? "أخبار السوق" : "Market Wire"))
                                                    : article.source}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-slate-400 font-semibold tracking-wide">
                                                                    {article.published_at ? new Date(article.published_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                                                </span>
                                                            </div>

                                                            {/* Local items -> in-app reader (/news/{id}); TV items -> source link (new tab) */}
                                                            {article.id ? (
                                                                <Link href={`/news/${article.id}`}
                                                                    className="font-extrabold text-base text-slate-900 dark:text-white hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors leading-snug block mb-2">
                                                                    {cleanHeadline}
                                                                </Link>
                                                            ) : article.url ? (
                                                                <a href={article.url} target="_blank" rel="noopener noreferrer"
                                                                    className="font-extrabold text-base text-slate-900 dark:text-white hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors leading-snug block mb-2">
                                                                    {cleanHeadline}
                                                                </a>
                                                            ) : (
                                                                <span className="font-extrabold text-base text-slate-900 dark:text-white leading-snug block mb-2">
                                                                    {cleanHeadline}
                                                                </span>
                                                            )}

                                                            {cleanBody && (
                                                                <>
                                                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                                        {isExpanded ? cleanBody : `${cleanBody.slice(0, 250)}${cleanBody.length > 250 ? "..." : ""}`}
                                                                    </p>
                                                                    <div className="flex items-center gap-4 mt-2">
                                                                        {cleanBody.length > 250 && (
                                                                            <button
                                                                                onClick={() => setExpandedNews(prev => {
                                                                                    const next = new Set(prev);
                                                                                    if (next.has(i)) next.delete(i); else next.add(i);
                                                                                    return next;
                                                                                })}
                                                                                className="text-[#14b8a6] text-xs font-bold hover:underline">
                                                                                {isExpanded ? (lang === "ar" ? "إخفاء" : "Show less") : t.read_more}
                                                                            </button>
                                                                        )}
                                                                        <Link href={`/news/${article.id}`} className="text-slate-400 dark:text-slate-500 text-xs font-bold hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors flex items-center gap-1">
                                                                            {lang === "ar" ? "عرض المقال كاملاً ←" : "Read Full Article →"}
                                                                        </Link>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-16 text-slate-400">
                                        <Newspaper className="w-12 h-12 mb-3" />
                                        <p className="text-sm font-semibold">{t.no_news}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════════ PROFILE TAB — TradingView identity ONLY ═══════════
                            Description / officers / HQ / employees / founded / website / phone were
                            removed: TradingView provides none of them for EGX (the old values came
                            from a stale stockanalysis snapshot + the Yahoo proxy). */}
                        {activeTab === "profile" && (
                            <div className="space-y-8">
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Building2} title={t.profile} color="text-[#14b8a6]" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                                        {[
                                            { l: lang === "ar" ? "الرمز" : "Ticker", v: symbol },
                                            { l: lang === "ar" ? "اسم الشركة" : "Company Name", v: (stockData as any)?.name_en || symbol },
                                            { l: lang === "ar" ? "الاسم بالعربية" : "Arabic Name", v: (stockData as any)?.name_ar || "-" },
                                            { l: t.sector, v: sectorName || "-" },
                                            { l: lang === "ar" ? "البورصة" : "Exchange", v: marketName },
                                            { l: t.currency, v: currency },
                                            { l: "ISIN", v: isinCode || "-" },
                                        ].map((item, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{item.l}</p>
                                                <div className="font-extrabold text-sm truncate">{item.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
                    <div className="space-y-6">
                        {/* Trading Info */}
                        <div className="premium-glass rounded-3xl p-6">
                            <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                <Wallet className="w-5 h-5 text-[#14b8a6]" /> {t.trading_info}
                            </h4>
                            <div className="space-y-3 font-bold text-sm">
                                {[
                                    { l: lang === "ar" ? "سعر الإغلاق" : "Closing Price", v: formatCurrency(lastPrice, currency), c: "text-slate-800 dark:text-white" },
                                    { l: lang === "ar" ? "التغير اليومي" : "Daily Change", v: Math.abs(change) >= 0.005 ? `${isPositive ? "+" : ""}${change.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)` : `(${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`, c: isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
                                    { l: lang === "ar" ? "حجم التداول" : "Volume", v: volume.toLocaleString(), c: "text-slate-700 dark:text-slate-350" },
                                    // 52W High/Low removed — these were Math.max/min over the loaded candles (our calc, mislabeled as 52-week) with no source 52-week field to re-point to.
                                    { l: lang === "ar" ? "السوق المالي" : "Exchange", v: marketName.toUpperCase(), c: "text-[#14b8a6]" },
                                    { l: lang === "ar" ? "القطاع" : "Sector", v: sectorName || "-", c: "text-slate-600 dark:text-slate-400" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                        <span className="text-slate-400 text-xs">{item.l}</span>
                                        <span className={`tabular text-xs font-black ${item.c}`}>{item.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dividends Quick Card — TradingView snapshot fields only */}
                        {(dividendRate > 0 || dividendYield > 0) && (
                            <div className="premium-glass rounded-3xl p-6">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                    <Wallet className="w-5 h-5 text-emerald-500" /> {lang === "ar" ? "التوزيعات النقدية" : "Dividends"}
                                </h4>
                                <div className="space-y-3 text-sm font-bold">
                                    {[
                                        { l: t.dps, v: dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-" },
                                        { l: t.div_yield, v: dividendYield > 0 ? pct(dividendYield) : "-" },
                                        { l: t.payout_ratio, v: payoutRatio > 0 ? pct(payoutRatio) : "-" },
                                        { l: lang === "ar" ? "آخر تاريخ استحقاق" : "Last Ex-Date", v: tvDividends?.ex_date_recent ? new Date(Number(tvDividends.ex_date_recent) * 1000).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                            <span className="text-slate-400 text-xs">{item.l}</span>
                                            <span className="tabular text-xs font-black text-emerald-600 dark:text-emerald-400">{item.v}</span>
                                        </div>
                                    ))}
                                    <button onClick={() => setActiveTab("dividends")} className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-[#14b8a6] hover:text-[#0f766e] transition-colors">
                                        {lang === "ar" ? "عرض تاريخ التوزيعات كاملاً" : "View Full Dividend History"}
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fair Value quick card removed — internal valuation models are house opinion, not source data. */}

                        {/* Ownership Quick Card — TradingView fields ONLY (June-2026 audit: the
                            old per-holder list rendered 6 fabricated demo rows on every symbol;
                            TradingView has no per-holder data for EGX, so no holder list is shown). */}
                        {(sharesOutstanding > 0 || floatShares > 0 || floatSharesPercent > 0) && (
                            <div className="premium-glass rounded-3xl p-6">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                    <PieChart className="w-5 h-5 text-indigo-500" /> {lang === "ar" ? "ملاك الأسهم" : "Share Ownership"}
                                </h4>
                                <div className="space-y-3 text-sm font-bold">
                                    {sharesOutstanding > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                            <span className="text-slate-400 text-xs">{t.outstanding}</span>
                                            <span className="tabular text-xs font-black">{formatNumber(sharesOutstanding)}</span>
                                        </div>
                                    )}
                                    {floatShares > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                            <span className="text-slate-400 text-xs">{t.float_shares}</span>
                                            <span className="tabular text-xs font-black text-blue-500">{formatNumber(floatShares)}</span>
                                        </div>
                                    )}
                                    {floatSharesPercent > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                            <span className="text-slate-400 text-xs">{lang === "ar" ? "نسبة التداول الحر" : "Free Float"}</span>
                                            <span className="tabular text-xs font-black text-indigo-500">{floatSharesPercent.toFixed(2)}%</span>
                                        </div>
                                    )}
                                    {shareholdersCount > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-b-0">
                                            <span className="text-slate-400 text-xs">{lang === "ar" ? "عدد المساهمين" : "Shareholders"}</span>
                                            <span className="tabular text-xs font-black text-orange-500">{formatNumber(shareholdersCount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Financial Quality Scores (Piotroski F / Altman Z) and Growth Metrics removed — both were house-computed scores/figures with their own threshold verdicts, not source data. */}
                    </div>
                </div>
            </div>
        </div>
    );
}
