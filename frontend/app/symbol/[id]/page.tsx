"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders,
    fetchCorporateActions, fetchFairValues, fetchIntraday,
    fetchYahooProfile, fetchLocalCompanyProfile, fetchNews, Ticker,
    fetchEgxTechnicals, fetchEgxEstimates, fetchEgxFinancialsTV, fetchEgxDividendsTV
} from "@/lib/api";
import {
    sanitizeNewsText,
    resolveNewsImageSrc,
    buildNewsSnippet,
    getNewsBrandedCover
} from "@/lib/news-display";

import {
    TrendingUp, TrendingDown, Building2, Users, BarChart3,
    FileText, ArrowUpRight, ArrowDownRight, Activity,
    Target, Zap, PieChart, AlertCircle, Wallet,
    Briefcase, Calendar, ArrowUp, ArrowDown, Globe, Award, Landmark, CheckCircle, ShieldAlert,
    DollarSign, Newspaper, ChevronRight, TrendingDown as TrendDown, Info,
    ExternalLink, BookOpen, Star, Gauge, Crosshair, Minus
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

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

function yoyDelta(curr: number | null, prev: number | null): string {
    if (!curr || !prev || prev === 0) return "-";
    const delta = ((curr - prev) / Math.abs(prev)) * 100;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
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
    const angle = -90 + (v + 1) * 90; // -90 (sell) .. +90 (buy)
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
                {arc(180, 240, "#ef4444")}
                {arc(240, 300, "#f59e0b")}
                {arc(300, 360, "#10b981")}
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
                                <span className="text-sm font-extrabold tabular">{r.value == null ? "-" : r.value.toFixed(2)}</span>
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
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    const growth = prev && prev.value !== 0 ? ((last.value - prev.value) / Math.abs(prev.value)) * 100 : null;
    return (
        <div className="premium-glass rounded-3xl p-6">
            <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
                {growth != null && <span className={`text-xs font-extrabold ${growth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{growth >= 0 ? "+" : ""}{growth.toFixed(1)}% YoY</span>}
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

// ─── MAIN PAGE COMPONENT ─────────────────────────────────────────────────────
export default function SymbolDetailPage() {
    const params = useParams();
    const router = useRouter();
    const symbol = (params.id as string).toUpperCase();
    const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

    const isEgx = useMemo(() => symbol.match(/^[a-zA-Z]/) !== null, [symbol]);
    const currency = isEgx ? "EGP" : "SAR";
    const marketName = isEgx ? "EGX" : "Tadawul";

    const [lang, setLang] = useState<"en" | "ar">("en");
    useEffect(() => {
        const savedLang = localStorage.getItem("starta-lang") || localStorage.getItem("lang") || "en";
        setLang(savedLang as "en" | "ar");
        document.documentElement.lang = savedLang;
        document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    }, []);

    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const handleLangToggle = () => {
        const nextLang = lang === "en" ? "ar" : "en";
        setLang(nextLang);
        localStorage.setItem("starta-lang", nextLang);
        localStorage.setItem("lang", nextLang);
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

    type TabId = "overview" | "financials" | "technicals" | "forecasts" | "ratios" | "dividends" | "news" | "profile";
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [chartPeriod, setChartPeriod] = useState("3m");
    const [financialPeriod, setFinancialPeriod] = useState<"annual" | "quarterly">("annual");
    const [financialSubTab, setFinancialSubTab] = useState<"income" | "balance" | "cashflow">("income");
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

    const { data: yahooProfile } = useQuery({
        queryKey: ["yahoo-profile", symbol],
        queryFn: () => fetchYahooProfile(symbol),
        enabled: !!symbol
    });

    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod],
        queryFn: () => chartPeriod === "1D" ? fetchIntraday(symbol, "5m", 300) : fetchOHLC(symbol, chartPeriod),
        enabled: !!symbol
    });

    const { data: financials = [] } = useQuery({
        queryKey: ["financials", symbol], queryFn: () => fetchFinancials(symbol), enabled: !!symbol
    });

    const { data: corporateActions = [] } = useQuery({
        queryKey: ["corporate-actions", symbol], queryFn: () => fetchCorporateActions(symbol), enabled: !!symbol
    });

    const { data: allFairValues = [] } = useQuery({
        queryKey: ["fair-values", symbol], queryFn: () => fetchFairValues(symbol), enabled: !!symbol
    });

    const { data: newsData = [] } = useQuery({
        queryKey: ["news", symbol, lang],
        queryFn: () => fetchNews({ symbol, limit: 20, language: lang } as any),
        enabled: !!symbol
    });

    const { data: shareholders = [] } = useQuery({
        queryKey: ["shareholders", symbol],
        queryFn: () => fetchShareholders(symbol),
        enabled: !!symbol
    });

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

    const fairValues = useMemo(() =>
        Array.isArray(allFairValues) ? allFairValues.filter((f: any) => f.symbol === symbol) : [],
        [allFairValues, symbol]);

    const dividendActions = useMemo(() => {
        const arr = Array.isArray(corporateActions) ? corporateActions : [];
        return arr.filter((a: any) => a.action_type === "Dividend");
    }, [corporateActions]);

    const otherActions = useMemo(() => {
        const arr = Array.isArray(corporateActions) ? corporateActions : [];
        return arr.filter((a: any) => a.action_type !== "Dividend");
    }, [corporateActions]);

    const stats = useMemo(() => parseNumericFields(localProfile?.statistics), [localProfile]);

    const isBank = useMemo(() => {
        const sec = (localProfile?.profile?.sector || (stockData as any)?.sector_name || "").toLowerCase();
        return sec.includes("bank") || sec.includes("financial services");
    }, [localProfile, stockData]);

    const officers = useMemo(() => {
        const raw = localProfile?.profile?.officers;
        if (!raw) return [];
        try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
        catch { return []; }
    }, [localProfile]);

    const parsedFinancials = useMemo(() => {
        const arr = Array.isArray(financials) ? financials : [];
        return arr.map((f: any) => {
            const rp = parseFinancialsRawData(f.raw_data);
            return {
                ...f,
                net_income: f.net_income || rp.net_income,
                total_assets: f.total_assets || rp.total_assets,
                total_equity: f.total_equity || rp.total_equity,
                gross_profit: f.gross_profit || rp.gross_profit,
                total_liabilities: f.total_liabilities || rp.total_liabilities,
                operating_cashflow: f.operating_cashflow || rp.operating_cashflow,
            };
        });
    }, [financials]);

    const filteredFinancials = useMemo(() => {
        const arr = Array.isArray(parsedFinancials) ? parsedFinancials : [];
        return arr.filter((f: any) => f.period_type === financialPeriod);
    }, [parsedFinancials, financialPeriod]);

    const chartData = useMemo(() => {
        const arr = Array.isArray(ohlcData) ? ohlcData : [];
        if (arr.length === 0) return [];
        return [...arr].sort((a: any, b: any) =>
            new Date(a.time || a.date || a.timestamp).getTime() -
            new Date(b.time || b.date || b.timestamp).getTime()
        ).map((item: any) => {
            const dateValue = item.time || item.date || item.timestamp;
            const timeValue = chartPeriod === "1D"
                ? new Date(dateValue).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: '2-digit', minute: '2-digit', hour12: false })
                : new Date(dateValue).toISOString().split('T')[0];
            return { time: timeValue, open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume) };
        });
    }, [ohlcData, chartPeriod, lang]);

    const chartStats = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1];
        const previous = chartData[chartData.length - 2];
        const first = chartData[0];
        const highs = chartData.map((d: any) => d.high).filter((h: number) => h > 0);
        const lows = chartData.map((d: any) => d.low).filter((l: number) => l > 0);
        
        const change = current.close - previous.close;
        const changePercent = previous.close > 0 ? (change / previous.close) * 100 : 0;
        
        return {
            high52: highs.length > 0 ? Math.max(...highs) : current.close,
            low52: lows.length > 0 ? Math.min(...lows) : current.close,
            periodReturn: ((current.close - first.close) / first.close) * 100,
            current,
            change,
            changePercent
        };
    }, [chartData]);

    const latestAnnualStatement = useMemo(() => {
        if (!parsedFinancials || parsedFinancials.length === 0) return null;
        return parsedFinancials.find((f: any) => f.period_type === "annual") || parsedFinancials[0];
    }, [parsedFinancials]);

    const profileData = useMemo(() => localProfile?.profile || yahooProfile?.profile || {}, [localProfile, yahooProfile]);
    const fundamentalsData = useMemo(() => yahooProfile?.fundamentals || {}, [yahooProfile]);

    const longBusinessSummary = useMemo(() => profileData.description || profileData.longBusinessSummary || (stockData as any)?.name_en || "", [profileData, stockData]);
    const website = useMemo(() => profileData.website || "", [profileData]);
    const industry = useMemo(() => profileData.industry || (stockData as any)?.sector_name || "", [profileData, stockData]);
    const employees = useMemo(() => profileData.employees || null, [profileData]);
    const city = useMemo(() => profileData.headquarters_city || profileData.city || profileData.headquarters || "", [profileData]);
    const country = useMemo(() => profileData.country || "", [profileData]);
    const phone = useMemo(() => profileData.phone || "-", [profileData]);
    const address = useMemo(() => profileData.address || "-", [profileData]);
    const founded = useMemo(() => profileData.founded || null, [profileData]);

    // ─── COMPUTED METRICS ──────────────────────────────────────────────────
    const marketCap = useMemo(() => Number(stats.market_cap || profileData.market_cap || (stockData as any)?.market_cap || 0), [stats, profileData, stockData]);
    const peRatio = useMemo(() => Number(stats.pe_ratio || fundamentalsData.pe_ratio || (stockData as any)?.pe_ratio || 0), [stats, fundamentalsData, stockData]);
    const pbRatio = useMemo(() => Number(stats.pb_ratio || fundamentalsData.price_to_book || (stockData as any)?.pb_ratio || 0), [stats, fundamentalsData, stockData]);
    const dividendYield = useMemo(() => Number(stats.dividend_yield || fundamentalsData.dividend_yield || (stockData as any)?.dividend_yield || 0), [stats, fundamentalsData, stockData]);
    const betaValue = useMemo(() => Number(stats.beta_5y || fundamentalsData.beta || (stockData as any)?.beta || 0), [stats, fundamentalsData, stockData]);
    const sharesOutstanding = useMemo(() => Number(stats.shares_outstanding || profileData.shares_outstanding || latestAnnualStatement?.shares_outstanding || 0), [stats, profileData, latestAnnualStatement]);
    const totalCash = useMemo(() => Number(stats.cash_ttm || fundamentalsData.total_cash || latestAnnualStatement?.cash || 0), [stats, fundamentalsData, latestAnnualStatement]);
    const totalDebt = useMemo(() => Number(stats.total_debt || fundamentalsData.total_debt || latestAnnualStatement?.long_term_debt || 0), [stats, fundamentalsData, latestAnnualStatement]);
    const netCash = useMemo(() => Number(stats.net_cash || 0), [stats]);
    const enterpriseValue = useMemo(() => {
        const val = Number(stats.enterprise_value || fundamentalsData.enterprise_value || 0);
        if (val > 0) return val;
        return marketCap > 0 ? (marketCap + totalDebt - totalCash) : 0;
    }, [stats, fundamentalsData, marketCap, totalDebt, totalCash]);
    const fcf = useMemo(() => Number(stats.fcf_ttm || fundamentalsData.free_cash_flow || latestAnnualStatement?.free_cashflow || 0), [stats, fundamentalsData, latestAnnualStatement]);
    const profitMargin = useMemo(() => {
        const val = Number(stats.profit_margin || fundamentalsData.profit_margin || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.net_income && latestAnnualStatement?.revenue) {
            return latestAnnualStatement.net_income / latestAnnualStatement.revenue;
        }
        return 0;
    }, [stats, fundamentalsData, latestAnnualStatement]);
    const debtEquity = useMemo(() => {
        const val = Number(stats.debt_equity || fundamentalsData.debt_to_equity || 0);
        if (val > 0) return val;
        const equity = latestAnnualStatement?.total_equity || 0;
        return totalDebt > 0 && equity > 0 ? (totalDebt / equity) : 0;
    }, [stats, fundamentalsData, totalDebt, latestAnnualStatement]);
    const roe = useMemo(() => Number(stats.roe || fundamentalsData.return_on_equity || 0), [stats, fundamentalsData]);
    const roa = useMemo(() => Number(stats.roa || fundamentalsData.return_on_assets || 0), [stats, fundamentalsData]);
    const pegRatio = useMemo(() => Number(stats.peg_ratio || fundamentalsData.peg_ratio || 0), [stats, fundamentalsData]);
    const currentRatio = useMemo(() => Number(stats.current_ratio || fundamentalsData.current_ratio || 0), [stats, fundamentalsData]);
    const quickRatio = useMemo(() => Number(stats.quick_ratio || fundamentalsData.quick_ratio || 0), [stats, fundamentalsData]);
    const operatingMargin = useMemo(() => Number(stats.operating_margin || fundamentalsData.operating_margin || 0), [stats, fundamentalsData]);
    const pretaxMargin = useMemo(() => Number(stats.pretax_margin || 0), [stats]);
    const grossMargin = useMemo(() => {
        const val = Number(stats.gross_margin || fundamentalsData.gross_margin || 0);
        if (val > 0) return val;
        if (latestAnnualStatement?.gross_profit && latestAnnualStatement?.revenue) {
            return latestAnnualStatement.gross_profit / latestAnnualStatement.revenue;
        }
        return 0;
    }, [stats, fundamentalsData, latestAnnualStatement]);
    const effectiveTaxRate = useMemo(() => Number(stats.effective_tax_rate || 0), [stats]);
    const evToRevenue = useMemo(() => {
        const val = Number(stats.ev_revenue || fundamentalsData.enterprise_to_revenue || 0);
        if (val > 0) return val;
        const rev = latestAnnualStatement?.revenue || 0;
        return enterpriseValue > 0 && rev > 0 ? (enterpriseValue / rev) : 0;
    }, [stats, fundamentalsData, enterpriseValue, latestAnnualStatement]);
    const evToEbitda = useMemo(() => Number(stats.ev_ebitda || fundamentalsData.enterprise_to_ebitda || 0), [stats, fundamentalsData]);
    const trailingEps = useMemo(() => {
        const val = Number(stats.eps_ttm || fundamentalsData.trailing_eps || 0);
        if (val !== 0) return val;
        return latestAnnualStatement?.eps || 0;
    }, [stats, fundamentalsData, latestAnnualStatement]);
    const bookValue = useMemo(() => Number(stats.bvps || stats.book_value || fundamentalsData.book_value || latestAnnualStatement?.book_value_per_share || 0), [stats, fundamentalsData, latestAnnualStatement]);
    const dividendRate = useMemo(() => Number(stats.dps || fundamentalsData.dividend_rate || 0), [stats, fundamentalsData]);
    const payoutRatio = useMemo(() => Number(stats.payout_ratio || fundamentalsData.payout_ratio || 0), [stats, fundamentalsData]);
    const floatShares = useMemo(() => Number(stats.float_shares || profileData.float_shares || 0), [stats, profileData]);
    const priceToSales = useMemo(() => {
        const val = Number(stats.ps_ratio || fundamentalsData.price_to_sales || 0);
        if (val > 0) return val;
        const rev = latestAnnualStatement?.revenue || 0;
        return marketCap > 0 && rev > 0 ? (marketCap / rev) : 0;
    }, [stats, fundamentalsData, marketCap, latestAnnualStatement]);
    const revenueTtm = useMemo(() => Number(stats.revenue_ttm || 0), [stats]);
    const netIncomeTtm = useMemo(() => Number(stats.net_income_ttm || 0), [stats]);
    const avgVolume20d = useMemo(() => Number(stats.avg_volume_20d || 0), [stats]);
    const fcfPerShare = useMemo(() => Number(stats.fcf_per_share || 0), [stats]);
    const institutionalOwnership = useMemo(() => Number(stats.institutional_ownership || 0), [stats]);
    const insiderOwnership = useMemo(() => Number(stats.insider_ownership || 0), [stats]);
    const fcfYield = useMemo(() => Number(stats.fcf_yield || 0), [stats]);
    const earningsYield = useMemo(() => Number(stats.earnings_yield || 0), [stats]);
    const debtFcf = useMemo(() => Number(stats.debt_fcf || 0), [stats]);
    const ocfTtm = useMemo(() => Number(stats.ocf_ttm || 0), [stats]);
    const forwardPe = useMemo(() => Number(stats.forward_pe || 0), [stats]);
    const pTbv = useMemo(() => Number(stats.p_tbv || 0), [stats]);
    const revenueGrowth = useMemo(() => stats.revenue_growth != null ? Number(stats.revenue_growth) : null, [stats]);
    const epsGrowth = useMemo(() => stats.eps_growth != null ? Number(stats.eps_growth) : null, [stats]);
    const profitGrowth = useMemo(() => stats.profit_growth != null ? Number(stats.profit_growth) : null, [stats]);

    // tooltip
    useEffect(() => {
        let tooltipDiv = document.getElementById("chartTooltip");
        if (!tooltipDiv) {
            tooltipDiv = document.createElement("div");
            tooltipDiv.id = "chartTooltip";
            tooltipDiv.className = "chart-tooltip";
            document.body.appendChild(tooltipDiv);
        }
        (window as any).showChartTooltip = (event: any, title: string, value: string) => {
            if (!tooltipDiv) return;
            tooltipDiv.style.display = "block";
            tooltipDiv.innerHTML = `<span>${title}</span><strong>${value}</strong>`;
            (window as any).moveChartTooltip(event);
        };
        (window as any).moveChartTooltip = (event: any) => {
            if (!tooltipDiv) return;
            tooltipDiv.style.left = `${event.pageX + 15}px`;
            tooltipDiv.style.top = `${event.pageY - 40}px`;
        };
        (window as any).hideChartTooltip = () => {
            if (!tooltipDiv) return;
            tooltipDiv.style.display = "none";
        };
        return () => {
            delete (window as any).showChartTooltip;
            delete (window as any).moveChartTooltip;
            delete (window as any).hideChartTooltip;
        };
    }, []);

    // SVG Chart Drawing
    useEffect(() => {
        if (activeTab !== "overview" || chartData.length === 0 || !svgElement) return;
        const width = 760, height = 350, pad = { top: 18, right: 48, bottom: 25, left: 8 };
        const plotWidth = width - pad.left - pad.right;
        const maxCandles = 96;
        const cleanRows = chartData.filter((item: any) => {
            const o = Number(item.open), h = Number(item.high), l = Number(item.low), c = Number(item.close);
            return o >= 0 && h >= 0 && l >= 0 && c >= 0;
        });
        if (cleanRows.length < 2) return;
        const groupSize = Math.max(1, Math.ceil(cleanRows.length / maxCandles));
        const candles: any[] = [];
        for (let index = 0; index < cleanRows.length; index += groupSize) {
            const group = cleanRows.slice(index, index + groupSize);
            candles.push({
                date: group[group.length - 1].time as string,
                time: group[group.length - 1].time as string,
                open: Number(group[0].open),
                high: Math.max(...group.map((item) => Number(item.high))),
                low: Math.min(...group.map((item) => Number(item.low))),
                close: Number(group[group.length - 1].close),
                volume: group.reduce((sum, item) => sum + (Number(item.volume) || 0), 0)
            });
        }
        const hasHistoricalVolume = candles.some((item) => item.volume > 0);
        const volumeHeight = hasHistoricalVolume ? 54 : 0;
        const dividerGap = hasHistoricalVolume ? 16 : 0;
        const priceBottom = height - pad.bottom - volumeHeight - dividerGap;
        const priceHeight = priceBottom - pad.top;
        const highs = candles.map((item) => item.high).filter(h => h > 0);
        const lows = candles.map((item) => item.low).filter(l => l > 0);
        let maximum = highs.length > 0 ? Math.max(...highs) : 100;
        let minimum = lows.length > 0 ? Math.min(...lows) : 0;
        const range = maximum - minimum || 1;
        maximum += range * .02; minimum -= range * .02;
        const y = (value: number) => pad.top + ((maximum - value) / (maximum - minimum)) * priceHeight;
        const slot = plotWidth / candles.length;
        const candleWidth = Math.max(2, Math.min(8, slot * .58));
        const maxVolume = Math.max(1, ...candles.map((item) => item.volume));
        const localeStr = lang === "ar" ? "ar-EG" : "en-US";
        const grid = [0, .25, .5, .75, 1].map((ratio) => {
            const axisY = pad.top + ratio * priceHeight;
            const value = maximum - ratio * (maximum - minimum);
            return `<path d="M ${pad.left} ${axisY} H ${width - pad.right}" class="gridline"/><text x="${width - pad.right + 7}" y="${axisY + 4}" class="axis">${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}</text>`;
        }).join("");
        const marks = candles.map((item, idx) => {
            const x = pad.left + slot * idx + slot / 2;
            const rising = item.close >= item.open;
            const classSuffix = rising ? "up" : "down";
            const bodyTop = Math.min(y(item.open), y(item.close));
            const bodyHeight = Math.max(1.5, Math.abs(y(item.close) - y(item.open)));
            const volumeBarHeight = hasHistoricalVolume ? (item.volume / maxVolume) * volumeHeight : 0;
            return `<line x1="${x}" x2="${x}" y1="${y(item.high)}" y2="${y(item.low)}" class="candle-${classSuffix} wick"/>
                <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="1" class="candle-${classSuffix}"/>
                ${hasHistoricalVolume ? `<rect x="${x - candleWidth / 2}" y="${height - pad.bottom - volumeBarHeight}" width="${candleWidth}" height="${volumeBarHeight}" rx="1" class="volume-${classSuffix}"/>` : ""}`;
        }).join("");
        const dateIndexes = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
        const dates = dateIndexes.map((index) => {
            if (index >= candles.length) return "";
            const x = pad.left + slot * index + slot / 2;
            const anchor = index === 0 ? "start" : index === candles.length - 1 ? "end" : "middle";
            const label = chartPeriod === "1D" ? candles[index].time : new Intl.DateTimeFormat(localeStr, { month: "short", day: "numeric" }).format(new Date(candles[index].date));
            return `<text x="${x}" y="${height - 7}" text-anchor="${anchor}" class="axis">${label}</text>`;
        }).join("");
        const hoverBars = candles.map((item, index) => {
            const barX = pad.left + slot * index;
            const title = chartPeriod === "1D" ? item.time : new Intl.DateTimeFormat(localeStr, { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.date));
            const valueStr = `O: ${item.open.toFixed(2)} | H: ${item.high.toFixed(2)} | L: ${item.low.toFixed(2)} | C: ${item.close.toFixed(2)}`;
            return `<rect x="${barX.toFixed(2)}" y="0" width="${slot.toFixed(2)}" height="${height}" fill="transparent" class="hover-bar" onmouseover="window.showChartTooltip(event, '${title}', '${valueStr}')" onmousemove="window.moveChartTooltip(event)" onmouseout="window.hideChartTooltip()"/>`;
        }).join("");
        svgElement.innerHTML = `${grid}${hasHistoricalVolume ? `<path d="M ${pad.left} ${priceBottom + 9} H ${width - pad.right}" class="chart-divider"/>` : ""}${marks}${dates}${hoverBars}`;
    }, [chartData, activeTab, theme, lang, svgElement, chartPeriod]);

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

    const rawLastPrice = Number((stockData as any).last_price || 0);
    const rawChange = Number((stockData as any).change || 0);
    const rawChangePercent = Number((stockData as any).change_percent || 0);

    const lastPrice = chartStats?.current?.close && chartStats.current.close > 0 ? chartStats.current.close : rawLastPrice;
    const change = chartStats ? chartStats.change : rawChange;
    const changePercent = chartStats ? chartStats.changePercent : rawChangePercent;
    const isPositive = change >= 0;
    const volume = Number((stockData as any)?.volume || 0);
    const loading = chartLoading;
    const relativeVolume = avgVolume20d > 0 ? volume / avgVolume20d : 0;

    const TABS: { id: TabId; label: string; icon: any }[] = [
        { id: "overview", label: t.tab_overview, icon: Activity },
        { id: "financials", label: t.tab_financials, icon: FileText },
        { id: "technicals", label: t.tab_technicals, icon: Gauge },
        { id: "forecasts", label: t.tab_forecasts, icon: Crosshair },
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
                                {(stockData as any).last_updated && (
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {lang === "ar" ? "آخر تحديث: " : "Last updated: "}
                                        {new Date((stockData as any).last_updated).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                )}
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

                    {/* OHLC Quick Strip */}
                    <div className="mt-6 pt-5 border-t border-slate-200/30 dark:border-slate-800/50 grid grid-cols-3 md:grid-cols-6 gap-4">
                        {[
                            { l: lang === "ar" ? "حجم التداول" : "Volume", v: volume > 0 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(volume) : "--" },
                            { l: lang === "ar" ? "متوسط ​الحجم ٢٠ي" : "Avg Vol 20D", v: avgVolume20d > 0 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(avgVolume20d) : "--" },
                            { l: lang === "ar" ? "الحجم النسبي" : "Rel. Volume", v: relativeVolume > 0 ? `${relativeVolume.toFixed(2)}x` : "--" },
                            { l: lang === "ar" ? "أعلى ٥٢ أسبوع" : "52W High", v: chartStats?.high52 ? chartStats.high52.toFixed(2) : (stats.price_change_52w ? "--" : "--") },
                            { l: lang === "ar" ? "أدنى ٥٢ أسبوع" : "52W Low", v: chartStats?.low52 ? chartStats.low52.toFixed(2) : "--" },
                            { l: lang === "ar" ? "عائد الفترة" : "Period Return", v: chartStats?.periodReturn ? `${chartStats.periodReturn >= 0 ? "+" : ""}${chartStats.periodReturn.toFixed(1)}%` : "--" },
                        ].map((item, i) => (
                            <div key={i} className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.l}</p>
                                <p className="font-extrabold text-sm mt-0.5 tabular">{item.v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* QUICK STATS ROW */}
            <div className="max-w-[1536px] mx-auto px-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { l: t.market_cap, v: marketCap > 0 ? formatCurrency(marketCap, currency) : "-", icon: Landmark, color: "text-[#14b8a6]" },
                        { l: t.pe_ratio, v: peRatio > 0 ? peRatio.toFixed(2) : "-", icon: Target, color: "text-amber-500" },
                        { l: t.div_yield, v: dividendYield > 0 ? `${pct(dividendYield)}` : "-", icon: Wallet, color: "text-emerald-500" },
                        { l: t.eps_ttm, v: trailingEps !== 0 ? `${currency} ${trailingEps.toFixed(2)}` : "-", icon: DollarSign, color: "text-indigo-500" },
                        { l: t.bvps, v: bookValue > 0 ? `${currency} ${bookValue.toFixed(2)}` : "-", icon: BookOpen, color: "text-blue-500" },
                        { l: t.beta, v: betaValue !== 0 ? betaValue.toFixed(2) : "-", icon: Activity, color: "text-rose-500" },
                    ].map((card, i) => (
                        <div key={i} className="premium-glass rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{card.l}</p>
                                <p className="font-extrabold text-sm mt-0.5 tabular">{card.v}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TABS */}
            <div className="max-w-[1536px] mx-auto px-6 mb-8">
                <div className="premium-glass rounded-2xl p-2 flex gap-2 overflow-x-auto shadow-sm">
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
                                {/* TradingView signal strip */}
                                {isEgx && (() => {
                                    const dt = Array.isArray(tvTechnicals?.timeframes) ? tvTechnicals.timeframes.find((x: any) => x.timeframe === "1D") : null;
                                    const hasT = dt && dt.recommend_all != null;
                                    const hasE = tvEstimates?.covered && Number(tvEstimates.target_average) > 0;
                                    if (!hasT && !hasE) return null;
                                    const m = recMeta(dt?.recommend_all);
                                    const up = hasE && lastPrice > 0 ? ((Number(tvEstimates.target_average) - lastPrice) / lastPrice) * 100 : null;
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
                                                <button onClick={() => setActiveTab("forecasts")} className="flex items-center gap-3 group">
                                                    <Crosshair className="w-5 h-5 text-[#14b8a6]" />
                                                    <div className="text-left rtl:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{lang === "ar" ? "هدف المحللين" : "Analyst Target"}</p>
                                                        <p className="font-extrabold group-hover:underline">{currency} {Number(tvEstimates.target_average).toFixed(2)} {up != null && <span className={up >= 0 ? "text-emerald-500" : "text-rose-500"}>({up >= 0 ? "+" : ""}{up.toFixed(1)}%)</span>}</p></div>
                                                </button>
                                            )}
                                            <span className="text-[10px] font-bold text-slate-400 ml-auto rtl:ml-0 rtl:mr-auto">TradingView · {lang === "ar" ? "مؤجل ١٥ د" : "15-min delayed"}</span>
                                        </div>
                                    );
                                })()}
                                {/* Chart */}
                                <div className="premium-glass rounded-3xl p-6 relative">
                                    <div className="ohlc-metrics mb-4 border-b border-slate-200/10 pb-4">
                                        {[
                                            { l: lang === "ar" ? "سعر الفتح" : "Open", v: chartData[chartData.length - 1]?.open },
                                            { l: lang === "ar" ? "أعلى سعر" : "High", v: chartData[chartData.length - 1]?.high },
                                            { l: lang === "ar" ? "أدنى سعر" : "Low", v: chartData[chartData.length - 1]?.low },
                                            { l: lang === "ar" ? "سعر الإغلاق" : "Close", v: chartData[chartData.length - 1]?.close },
                                            { l: lang === "ar" ? "حجم التداول" : "Volume", v: chartData[chartData.length - 1]?.volume, isVol: true },
                                        ].map((m, i) => (
                                            <div key={i}>
                                                <span>{m.l}</span>
                                                <strong className="tabular">
                                                    {m.v ? (m.isVol
                                                        ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(m.v)
                                                        : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.v))
                                                        : "--"}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-200/10 pb-4">
                                        <div className="flex gap-1 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl">
                                            {[
                                                { id: "1d", label: "1D" }, { id: "1m", label: "1M" }, { id: "3m", label: "3M" },
                                                { id: "6m", label: "6M" }, { id: "1y", label: "1Y" }, { id: "3y", label: "3Y" }, { id: "max", label: "MAX" }
                                            ].map((tf) => (
                                                <button key={tf.id} type="button"
                                                    onClick={() => setChartPeriod(tf.id === "1d" ? "1D" : tf.id)}
                                                    className={`min-w-[2.65rem] border-0 rounded-lg py-1.5 px-3 font-bold text-xs transition-all ${(chartPeriod === tf.id || (chartPeriod === "1D" && tf.id === "1d")) ? "bg-[#14b8a6]/10 text-[#14b8a6]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
                                                    {tf.label}
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-400 font-bold">{t.historical_prices}</span>
                                    </div>
                                    <figure className="price-figure relative w-full h-[350px]">
                                        {loading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm z-10">
                                                <div className="w-12 h-12 border-4 border-[#14b8a6]/20 border-t-[#14b8a6] rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {chartData.length === 0 && !loading && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center py-20 text-slate-400 z-10">
                                                <AlertCircle className="w-12 h-12 mb-3" />
                                                <p className="text-sm font-semibold">{t.chart_unavailable}</p>
                                            </div>
                                        )}
                                        <svg ref={setSvgElement} id="stockChart" viewBox="0 0 760 350" preserveAspectRatio="none" className="w-full h-full block overflow-visible" />
                                    </figure>
                                </div>

                                {/* Technical Momentum */}
                                {stats && (stats.ma_50d || stats.ma_200d || stats.rsi_14) && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Activity} title={t.technical_momentum} />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MetricCard label={t.ma_50d} value={stats.ma_50d ? formatCurrency(stats.ma_50d, currency) : "-"} icon={TrendingUp} color="text-[#14b8a6]" />
                                            <MetricCard label={t.ma_200d} value={stats.ma_200d ? formatCurrency(stats.ma_200d, currency) : "-"} icon={TrendingUp} color="text-blue-500" />
                                            <MetricCard label={t.rsi_14}
                                                value={stats.rsi_14 ? `${Number(stats.rsi_14).toFixed(1)}` : "-"}
                                                icon={Target}
                                                color={stats.rsi_14 > 70 ? "text-rose-500" : stats.rsi_14 < 30 ? "text-emerald-500" : "text-amber-500"}
                                                subtitle={stats.rsi_14 > 70 ? "Overbought" : stats.rsi_14 < 30 ? "Oversold" : "Neutral"} />
                                            <MetricCard label={lang === "ar" ? "عائد ٥٢ أسبوع" : "52W Return"}
                                                value={stats.price_change_52w ? `${stats.price_change_52w >= 0 ? "+" : ""}${(stats.price_change_52w * 100).toFixed(1)}%` : "-"}
                                                icon={Activity}
                                                color={stats.price_change_52w >= 0 ? "text-emerald-500" : "text-rose-500"} />
                                        </div>
                                        {/* Additional Technical Row */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                            <MetricCard label={t.avg_vol_20d} value={avgVolume20d > 0 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(avgVolume20d) : "-"} icon={BarChart3} color="text-slate-400" />
                                            <MetricCard label={t.rel_vol} value={relativeVolume > 0 ? `${relativeVolume.toFixed(2)}x` : "-"} icon={BarChart3} color={relativeVolume > 1.5 ? "text-amber-500" : "text-slate-400"} subtitle={relativeVolume > 2 ? "High Activity" : relativeVolume > 0 && relativeVolume < 0.5 ? "Low Activity" : undefined} />
                                            <MetricCard label={lang === "ar" ? "الحجم اليومي" : "Today Volume"} value={volume > 0 ? volume.toLocaleString() : "-"} icon={BarChart3} color="text-[#14b8a6]" />
                                        </div>
                                    </div>
                                )}

                                {/* Key Metrics expanded */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Target} title={t.metrics} color="text-amber-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.market_cap} value={marketCap > 0 ? formatCurrency(marketCap, currency) : "-"} icon={Landmark} color="text-[#14b8a6]" />
                                        <MetricCard label={t.pe_ratio} value={peRatio > 0 ? peRatio.toFixed(2) : "-"} icon={Target} color="text-amber-500" />
                                        <MetricCard label={t.forward_pe} value={forwardPe > 0 ? forwardPe.toFixed(2) : "-"} icon={Target} color="text-amber-400" />
                                        <MetricCard label={t.pb_ratio} value={pbRatio > 0 ? pbRatio.toFixed(2) : "-"} icon={FileText} color="text-indigo-500" />
                                        <MetricCard label={t.tangible_book} value={pTbv > 0 ? pTbv.toFixed(2) : "-"} icon={FileText} color="text-blue-500" />
                                        <MetricCard label={t.peg_ratio} value={pegRatio > 0 ? pegRatio.toFixed(2) : "-"} icon={TrendingUp} color="text-purple-500" />
                                        <MetricCard label={t.eps_ttm} value={trailingEps !== 0 ? `${currency} ${trailingEps.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                        <MetricCard label={t.bvps} value={bookValue > 0 ? `${currency} ${bookValue.toFixed(2)}` : "-"} icon={BookOpen} color="text-blue-500" />
                                        <MetricCard label={t.revenue_ttm} value={revenueTtm > 0 ? formatCurrency(revenueTtm, currency) : "-"} icon={BarChart3} color="text-teal-500" />
                                        <MetricCard label={t.net_income_ttm} value={netIncomeTtm > 0 ? formatCurrency(netIncomeTtm, currency) : "-"} icon={Award} color="text-emerald-500" />
                                        <MetricCard label={t.total_debt} value={totalDebt > 0 ? formatCurrency(totalDebt, currency) : "-"} icon={TrendDown} color="text-rose-500" />
                                        <MetricCard label={t.net_cash} value={netCash !== 0 ? formatCurrency(netCash, currency) : "-"} icon={Wallet} color="text-cyan-500" />
                                    </div>
                                </div>

                                {/* Ownership Summary Strip */}
                                {(institutionalOwnership > 0 || insiderOwnership > 0 || floatShares > 0 || sharesOutstanding > 0) && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Users} title={lang === "ar" ? "هيكل الملكية" : "Ownership Structure"} color="text-indigo-500" />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {sharesOutstanding > 0 && <MetricCard label={t.outstanding} value={formatNumber(sharesOutstanding)} icon={Users} color="text-slate-400" />}
                                            {floatShares > 0 && <MetricCard label={t.float_shares} value={formatNumber(floatShares)} icon={Users} color="text-blue-500" />}
                                            {institutionalOwnership > 0 && <MetricCard label={t.institutional_ownership} value={`${(institutionalOwnership * 100).toFixed(1)}%`} icon={Briefcase} color="text-indigo-500" />}
                                            {insiderOwnership > 0 && <MetricCard label={t.insider_ownership} value={`${(insiderOwnership * 100).toFixed(3)}%`} icon={Users} color="text-orange-500" />}
                                        </div>
                                    </div>
                                )}

                                {/* Fair Value Comparison (conditional — only when data exists) */}
                                {fairValues.length > 0 && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Star} title={t.fair_value_models} color="text-amber-500" />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-5">
                                            {lang === "ar" ? "نماذج التقييم الداخلي المستقل" : "Independent internal valuation models"}
                                            {fairValues[0]?.valuation_date && ` · ${new Date(fairValues[0].valuation_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", year: "numeric" })}`}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {fairValues.map((fv: any, i: number) => {
                                                const upside = Number(fv.upside_percent || 0);
                                                const isUp = upside >= 0;
                                                return (
                                                    <div key={i} className={`p-5 rounded-2xl border ${isUp ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/20" : "bg-rose-50/50 dark:bg-rose-500/5 border-rose-500/20"}`}>
                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{fv.valuation_model}</p>
                                                        <p className="text-2xl font-black tabular">{currency} {Number(fv.fair_value).toFixed(2)}</p>
                                                        <div className={`flex items-center gap-1 mt-2 text-sm font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                            {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                            <span>{isUp ? "+" : ""}{upside.toFixed(1)}% {lang === "ar" ? "من السعر الحالي" : "vs current price"}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ═══════════════════════ FINANCIALS TAB ═══════════════════════ */}
                        {activeTab === "financials" && (
                            <div className="space-y-6">
                                {Array.isArray(tvFinancials?.years) && tvFinancials.years.length >= 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <MiniBarChart title={lang === "ar" ? "الإيرادات · ٢٠ سنة" : "Revenue · 20Y"} color="#14b8a6" currency={currency} lang={lang}
                                            data={tvFinancials.years.map((y: any) => ({ year: y.fiscal_year, value: y.revenue != null ? Number(y.revenue) : null }))} />
                                        <MiniBarChart title={lang === "ar" ? "صافي الدخل · ٢٠ سنة" : "Net Income · 20Y"} color="#10b981" currency={currency} lang={lang}
                                            data={tvFinancials.years.map((y: any) => ({ year: y.fiscal_year, value: y.net_income != null ? Number(y.net_income) : null }))} />
                                        <MiniBarChart title={lang === "ar" ? "إجمالي الأصول · ٢٠ سنة" : "Total Assets · 20Y"} color="#6366f1" currency={currency} lang={lang}
                                            data={tvFinancials.years.map((y: any) => ({ year: y.fiscal_year, value: y.total_assets != null ? Number(y.total_assets) : null }))} />
                                    </div>
                                )}
                            <div className="premium-glass rounded-3xl p-8 space-y-6">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/10 pb-6">
                                    <div>
                                        <h3 className="text-xl font-extrabold flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-[#14b8a6]" /> {t.financial_statement}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                                            {isBank ? "Banking-Format Audited Disclosures" : "Corporate Audited Statements"} · {currency}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                            <button onClick={() => setFinancialPeriod("annual")} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${financialPeriod === "annual" ? "bg-[#14b8a6] text-white shadow-sm" : "text-slate-450"}`}>{t.annual_view}</button>
                                            <button onClick={() => setFinancialPeriod("quarterly")} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${financialPeriod === "quarterly" ? "bg-[#14b8a6] text-white shadow-sm" : "text-slate-450"}`}>{t.quarterly_view}</button>
                                        </div>
                                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                            {[
                                                { id: "income", label: t.income_statement },
                                                { id: "balance", label: t.balance_sheet },
                                                { id: "cashflow", label: t.cash_flow }
                                            ].map((sTab) => (
                                                <button key={sTab.id} onClick={() => setFinancialSubTab(sTab.id as any)}
                                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap ${financialSubTab === sTab.id ? "bg-[#14b8a6] text-white shadow-sm" : "text-slate-450"}`}>
                                                    {sTab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {filteredFinancials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider text-right">
                                                    <th className="text-left py-4 px-4 min-w-[100px]">{lang === "ar" ? "الفترة المالية" : "Period"}</th>

                                                    {/* INCOME HEADERS */}
                                                    {financialSubTab === "income" && (isBank ? (
                                                        <>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_interest_income}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.interest_expense}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.net_interest_income}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.provision_credit_losses}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.trading_income}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{lang === "ar" ? "صافي الدخل" : "Net Income"}</th>
                                                            <th className="py-4 px-4 min-w-[80px]">{lang === "ar" ? "ربحية السهم" : "EPS"}</th>
                                                            <th className="py-4 px-4 min-w-[80px] text-amber-500">{t.yoy_change}</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "الإيرادات" : "Revenue"}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "إجمالي الربح" : "Gross Profit"}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "الربح التشغيلي" : "Operating Income"}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{lang === "ar" ? "صافي الدخل" : "Net Income"}</th>
                                                            <th className="py-4 px-4 min-w-[80px]">{lang === "ar" ? "ربحية السهم" : "EPS"}</th>
                                                            <th className="py-4 px-4 min-w-[80px] text-amber-500">{t.yoy_change}</th>
                                                        </>
                                                    ))}

                                                    {/* BALANCE HEADERS */}
                                                    {financialSubTab === "balance" && (isBank ? (
                                                        <>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.cash_equivalents}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.net_loans}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.investment_securities}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.deposits}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_equity}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_assets}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.book_value_ps}</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_current_assets}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_assets}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_current_liabilities}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_liabilities}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{t.total_equity}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.book_value_ps}</th>
                                                        </>
                                                    ))}

                                                    {/* CASH FLOW HEADERS */}
                                                    {financialSubTab === "cashflow" && (
                                                        <>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "التدفقات التشغيلية" : "Operating CF"}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "التدفقات الاستثمارية" : "Investing CF"}</th>
                                                            <th className="py-4 px-4 min-w-[130px]">{lang === "ar" ? "التدفقات التمويلية" : "Financing CF"}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.capex}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.dividends_paid}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.da}</th>
                                                            <th className="py-4 px-4 min-w-[110px]">{t.fcf}</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredFinancials.slice(0, 10).map((f: any, i: number) => {
                                                    const prevF = filteredFinancials[i + 1];
                                                    return (
                                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold text-sm text-right">
                                                            <td className="py-5 px-4 text-left text-slate-850 dark:text-white whitespace-nowrap">
                                                                {f.period_type === "annual" ? `FY ${f.fiscal_year}` : `Q${f.fiscal_quarter || "—"} ${f.fiscal_year}`}
                                                            </td>

                                                            {/* INCOME ROWS */}
                                                            {financialSubTab === "income" && (isBank ? (
                                                                <>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{formatCurrency(f.total_interest_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-500">{formatCurrency(f.interest_expense, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{formatCurrency(f.net_interest_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-rose-500/80">{formatCurrency(f.provision_credit_losses, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-600 dark:text-slate-400">{formatCurrency(f.trading_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{formatCurrency(f.net_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular">{f.eps ? `${currency} ${Number(f.eps).toFixed(2)}` : "-"}</td>
                                                                    <td className={`py-5 px-4 tabular text-xs ${yoyDelta(f.net_income, prevF?.net_income).startsWith("+") ? "text-emerald-500" : "text-rose-500"}`}>
                                                                        {yoyDelta(f.net_income, prevF?.net_income)}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-200">{formatCurrency(f.revenue, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{formatCurrency(f.gross_profit, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{formatCurrency(f.operating_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{formatCurrency(f.net_income, currency)}</td>
                                                                    <td className="py-5 px-4 tabular">{f.eps ? `${currency} ${Number(f.eps).toFixed(2)}` : "-"}</td>
                                                                    <td className={`py-5 px-4 tabular text-xs ${yoyDelta(f.revenue, prevF?.revenue).startsWith("+") ? "text-emerald-500" : "text-rose-500"}`}>
                                                                        {yoyDelta(f.revenue, prevF?.revenue)}
                                                                    </td>
                                                                </>
                                                            ))}

                                                            {/* BALANCE ROWS */}
                                                            {financialSubTab === "balance" && (isBank ? (
                                                                <>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{formatCurrency(f.cash_equivalents, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{formatCurrency(f.net_loans, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-600 dark:text-slate-400">{formatCurrency(f.total_investments || f.investment_securities, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-indigo-500 dark:text-indigo-400">{formatCurrency(f.deposits, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{formatCurrency(f.total_equity, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{formatCurrency(f.total_assets, currency)}</td>
                                                                    <td className="py-5 px-4 tabular">{f.book_value_per_share ? `${currency} ${Number(f.book_value_per_share).toFixed(2)}` : "-"}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="py-5 px-4 tabular text-slate-600 dark:text-slate-400">{formatCurrency(f.total_current_assets, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-800 dark:text-slate-200">{formatCurrency(f.total_assets, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-500">{formatCurrency(f.total_current_liabilities, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{formatCurrency(f.total_liabilities, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{formatCurrency(f.total_equity, currency)}</td>
                                                                    <td className="py-5 px-4 tabular">{f.book_value_per_share ? `${currency} ${Number(f.book_value_per_share).toFixed(2)}` : "-"}</td>
                                                                </>
                                                            ))}

                                                            {/* CASH FLOW ROWS */}
                                                            {financialSubTab === "cashflow" && (
                                                                <>
                                                                    <td className="py-5 px-4 tabular text-slate-700 dark:text-slate-300">{formatCurrency(f.cash_flow_operating || f.operating_cashflow, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-500">{formatCurrency(f.cash_from_investing, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-500">{formatCurrency(f.cash_from_financing, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-rose-500">{formatCurrency(f.capex, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-amber-500">{formatCurrency(f.dividends_paid, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-slate-400">{formatCurrency(f.depreciation_amortization, currency)}</td>
                                                                    <td className="py-5 px-4 tabular text-emerald-600 dark:text-emerald-400">{formatCurrency(f.free_cashflow, currency)}</td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
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
                                        <span className="text-[11px] font-bold text-slate-400 ml-auto">{lang === "ar" ? "مصدر: TradingView · مؤجل ١٥ دقيقة" : "Source: TradingView · 15-min delayed"}</span>
                                    </div>
                                    {/* gauges */}
                                    <div className="premium-glass rounded-3xl p-6 md:p-8">
                                        <SectionHeader icon={Gauge} title={t.tech_summary} color="text-[#14b8a6]" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <RecommendationGauge value={tf.recommend_other} title={t.tech_oscillators} lang={lang} />
                                            <RecommendationGauge value={tf.recommend_all} title={lang === "ar" ? "الملخص" : "Summary"} lang={lang} />
                                            <RecommendationGauge value={tf.recommend_ma} title={t.tech_mas} lang={lang} />
                                        </div>
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

                        {/* ═══════════════════════ FORECASTS TAB ═══════════════════════ */}
                        {activeTab === "forecasts" && (
                            <div className="space-y-6">
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
                                                current={lastPrice} currency={currency} lang={lang} />
                                        )}
                                        <RecommendationDistribution buy={Number(tvEstimates.rec_buy) || 0} over={Number(tvEstimates.rec_over) || 0}
                                            hold={Number(tvEstimates.rec_hold) || 0} under={Number(tvEstimates.rec_under) || 0} sell={Number(tvEstimates.rec_sell) || 0}
                                            total={Number(tvEstimates.rec_total) || 0} lang={lang} />
                                        <div className="premium-glass rounded-3xl p-6 md:p-8">
                                            <SectionHeader icon={TrendingUp} title={lang === "ar" ? "توقعات الأرباح" : "Earnings Forecasts"} color="text-emerald-500" />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <MetricCard label={t.fc_eps_next} value={tvEstimates.eps_fcst_next_fq ? `${currency} ${Number(tvEstimates.eps_fcst_next_fq).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                                <MetricCard label={t.fc_rev_next} value={tvEstimates.rev_fcst_next_fq ? formatCurrency(Number(tvEstimates.rev_fcst_next_fq), currency) : "-"} icon={BarChart3} color="text-[#14b8a6]" />
                                                <MetricCard label={t.fc_eps_y} value={tvEstimates.eps_fcst_next_fy ? `${currency} ${Number(tvEstimates.eps_fcst_next_fy).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-400" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════════ RATIOS & RISK TAB ═══════════════════════ */}
                        {activeTab === "ratios" && (
                            <div className="space-y-6">
                                {/* Valuation Multiples */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Award} title={t.valuation_multiples} color="text-amber-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.market_cap} value={marketCap > 0 ? formatCurrency(marketCap, currency) : "-"} icon={Landmark} color="text-[#14b8a6]" />
                                        <MetricCard label={t.pe_ratio} value={peRatio > 0 ? peRatio.toFixed(2) : "-"} icon={Target} color="text-amber-500" />
                                        <MetricCard label={t.forward_pe} value={forwardPe > 0 ? forwardPe.toFixed(2) : "-"} icon={Target} color="text-amber-400" />
                                        <MetricCard label={t.pb_ratio} value={pbRatio > 0 ? pbRatio.toFixed(2) : "-"} icon={FileText} color="text-indigo-500" />
                                        <MetricCard label={t.tangible_book} value={pTbv > 0 ? pTbv.toFixed(2) : "-"} icon={FileText} color="text-blue-500" />
                                        <MetricCard label={lang === "ar" ? "مكرر المبيعات P/S" : "Price / Sales (P/S)"} value={priceToSales > 0 ? priceToSales.toFixed(2) : "-"} icon={BarChart3} color="text-cyan-500" />
                                        <MetricCard label={t.peg_ratio} value={pegRatio > 0 ? pegRatio.toFixed(2) : "-"} icon={TrendingUp} color="text-purple-500" />
                                        <MetricCard label={lang === "ar" ? "EV/Revenue" : "EV / Revenue"} value={evToRevenue > 0 ? evToRevenue.toFixed(2) : "-"} icon={Landmark} color="text-orange-500" />
                                        <MetricCard label={lang === "ar" ? "EV/EBITDA" : "EV / EBITDA"} value={evToEbitda > 0 ? evToEbitda.toFixed(2) : "-"} icon={Landmark} color="text-indigo-600" />
                                        <MetricCard label={t.earnings_yield} value={earningsYield !== 0 ? pct(earningsYield) : "-"} icon={Target} color="text-emerald-500" />
                                        <MetricCard label={t.eps_ttm} value={trailingEps !== 0 ? `${currency} ${trailingEps.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                        <MetricCard label={t.forward_eps} value={forwardPe > 0 && lastPrice > 0 ? `${currency} ${(lastPrice / forwardPe).toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-400" />
                                    </div>
                                </div>

                                {/* Per-Share Metrics */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={DollarSign} title={t.per_share} color="text-emerald-500" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <MetricCard label={t.eps_ttm} value={trailingEps !== 0 ? `${currency} ${trailingEps.toFixed(2)}` : "-"} icon={DollarSign} color="text-emerald-500" />
                                        <MetricCard label={t.bvps} value={bookValue > 0 ? `${currency} ${bookValue.toFixed(2)}` : "-"} icon={BookOpen} color="text-blue-500" />
                                        <MetricCard label={t.dps} value={dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-"} icon={Wallet} color="text-teal-500" />
                                        <MetricCard label={t.fcf_per_share} value={fcfPerShare !== 0 ? `${currency} ${fcfPerShare.toFixed(2)}` : "-"} icon={Activity} color="text-orange-500" />
                                    </div>
                                </div>

                                {/* Profitability */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Zap} title={t.profitability_margins} color="text-emerald-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.profit_margin} value={profitMargin !== 0 ? pct(profitMargin) : "-"} icon={Award} color="text-emerald-500" />
                                        <MetricCard label={t.operating_margin} value={operatingMargin !== 0 ? pct(operatingMargin) : "-"} icon={Activity} color="text-blue-500" />
                                        {!isBank && <MetricCard label={lang === "ar" ? "هامش إجمالي الربح" : "Gross Margin"} value={grossMargin !== 0 ? pct(grossMargin) : "-"} icon={BarChart3} color="text-indigo-500" />}
                                        <MetricCard label={t.pretax_margin} value={pretaxMargin !== 0 ? pct(pretaxMargin) : "-"} icon={Activity} color="text-purple-500" />
                                        <MetricCard label={t.effective_tax} value={effectiveTaxRate !== 0 ? pct(effectiveTaxRate) : "-"} icon={FileText} color="text-slate-400" />
                                        <MetricCard label={t.roe} value={roe !== 0 ? pct(roe) : "-"} icon={CheckCircle} color="text-teal-500" />
                                        <MetricCard label={t.roa} value={roa !== 0 ? pct(roa) : "-"} icon={Activity} color="text-purple-500" />
                                        {isBank && <MetricCard label={lang === "ar" ? "صافي هامش الفائدة" : "Net Interest Margin"} value={latestAnnualStatement?.net_interest_income && latestAnnualStatement?.revenue ? pct(latestAnnualStatement.net_interest_income / latestAnnualStatement.revenue) : "-"} icon={BarChart3} color="text-cyan-500" />}
                                        <MetricCard label={t.revenue_ttm} value={revenueTtm > 0 ? formatCurrency(revenueTtm, currency) : "-"} icon={BarChart3} color="text-teal-500" />
                                        <MetricCard label={t.net_income_ttm} value={netIncomeTtm > 0 ? formatCurrency(netIncomeTtm, currency) : "-"} icon={Award} color="text-emerald-500" />
                                    </div>
                                </div>

                                {/* Liquidity & Solvency */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Wallet} title={t.liquidity_solvency} color="text-indigo-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {!isBank && <MetricCard label={t.debt_equity} value={debtEquity > 0 ? debtEquity.toFixed(2) : lang === "ar" ? "ينطبق على البنوك" : "N/A (Bank)"} icon={TrendDown} color="text-rose-500" />}
                                        {!isBank && <MetricCard label={t.current_ratio} value={currentRatio > 0 ? currentRatio.toFixed(2) : "-"} icon={Wallet} color="text-teal-500" />}
                                        {!isBank && <MetricCard label={lang === "ar" ? "النسبة السريعة" : "Quick Ratio"} value={quickRatio > 0 ? quickRatio.toFixed(2) : "-"} icon={Wallet} color="text-cyan-500" />}
                                        <MetricCard label={t.total_debt} value={totalDebt > 0 ? formatCurrency(totalDebt, currency) : "-"} icon={TrendDown} color="text-rose-500" />
                                        <MetricCard label={t.net_cash} value={netCash !== 0 ? formatCurrency(netCash, currency) : "-"} icon={Wallet} color="text-cyan-500" />
                                        <MetricCard label={t.fcf} value={fcf !== 0 ? formatCurrency(fcf, currency) : "-"} icon={Activity} color="text-emerald-500" />
                                        <MetricCard label={lang === "ar" ? "التدفق التشغيلي" : "Operating CF (TTM)"} value={ocfTtm !== 0 ? formatCurrency(ocfTtm, currency) : "-"} icon={Activity} color="text-blue-500" />
                                        {debtFcf !== 0 && <MetricCard label={lang === "ar" ? "الدين / التدفق النقدي الحر" : "Debt / FCF"} value={debtFcf.toFixed(2)} icon={TrendDown} color="text-orange-500" />}
                                    </div>
                                </div>

                                {/* Dividends & Risk */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Briefcase} title={t.dividends_risk} color="text-purple-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <MetricCard label={t.div_yield} value={dividendYield > 0 ? pct(dividendYield) : "-"} icon={Wallet} color="text-emerald-500" />
                                        <MetricCard label={t.dps} value={dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : "-"} icon={Wallet} color="text-teal-500" />
                                        <MetricCard label={t.payout_ratio} value={payoutRatio > 0 ? pct(payoutRatio) : "-"} icon={FileText} color="text-amber-500" />
                                        <MetricCard label={t.beta} value={betaValue !== 0 ? betaValue.toFixed(2) : "-"} icon={Activity} color="text-rose-500" subtitle={betaValue > 1 ? "Higher than market" : betaValue > 0 ? "Lower than market" : undefined} />
                                        <MetricCard label={t.outstanding} value={sharesOutstanding > 0 ? formatNumber(sharesOutstanding) : "-"} icon={Users} color="text-blue-500" />
                                        <MetricCard label={t.float_shares} value={floatShares > 0 ? formatNumber(floatShares) : "-"} icon={Users} color="text-indigo-500" />
                                        <MetricCard label={t.institutional_ownership} value={institutionalOwnership > 0 ? `${(institutionalOwnership * 100).toFixed(1)}%` : "-"} icon={Briefcase} color="text-indigo-500" />
                                        <MetricCard label={t.insider_ownership} value={insiderOwnership > 0 ? `${(insiderOwnership * 100).toFixed(3)}%` : "-"} icon={Users} color="text-orange-500" />
                                        <MetricCard label={t.fcf_yield} value={fcfYield !== 0 ? pct(fcfYield) : "-"} icon={Activity} color="text-orange-500" />
                                        <MetricCard label={t.earnings_yield} value={earningsYield !== 0 ? pct(earningsYield) : "-"} icon={Target} color="text-emerald-500" />
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
                                            <SectionHeader icon={Calendar} title={lang === "ar" ? "التوزيعات (TradingView)" : "Dividends (TradingView)"} color="text-[#14b8a6]" />
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
                                {/* Dividend History */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Calendar} title={t.dividend_history} color="text-emerald-500" />
                                    {dividendActions.length > 0 ? (
                                        <div className="space-y-3">
                                            {/* Dividend summary strip */}
                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 text-center">
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{t.dps}</p>
                                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular">{dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : `${currency} ${Number(dividendActions[0]?.amount || 0).toFixed(2)}`}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-500/5 border border-teal-200 dark:border-teal-500/20 text-center">
                                                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">{t.div_yield}</p>
                                                    <p className="text-xl font-black text-teal-700 dark:text-teal-300 tabular">{dividendYield > 0 ? pct(dividendYield) : lastPrice > 0 && dividendRate > 0 ? pct(dividendRate / lastPrice) : "-"}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-center">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === "ar" ? "عدد التوزيعات" : "Total Records"}</p>
                                                    <p className="text-xl font-black tabular">{dividendActions.length}</p>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                            <th className="text-left py-3 px-4">{lang === "ar" ? "تاريخ الاستحقاق" : "Ex-Date"}</th>
                                                            <th className="text-right py-3 px-4">{lang === "ar" ? "مبلغ التوزيع" : "Amount"}</th>
                                                            <th className="text-right py-3 px-4">{lang === "ar" ? "العائد التقريبي" : "Approx. Yield"}</th>
                                                            <th className="text-right py-3 px-4">{lang === "ar" ? "تاريخ الدفع" : "Pay Date"}</th>
                                                            <th className="text-left py-3 px-4">{lang === "ar" ? "الوصف" : "Description"}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dividendActions.map((a: any, i: number) => {
                                                            const approxYield = lastPrice > 0 && a.amount ? ((Number(a.amount) / lastPrice) * 100).toFixed(2) : null;
                                                            return (
                                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold">
                                                                    <td className="py-4 px-4 text-left">
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase mr-2">DIV</span>
                                                                        {a.ex_date ? new Date(a.ex_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular text-base font-black">
                                                                        {a.amount ? `${a.currency || currency} ${Number(a.amount).toFixed(4)}` : "-"}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right tabular text-slate-500">
                                                                        {approxYield ? `${approxYield}%` : "-"}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right tabular text-slate-500">
                                                                        {a.payment_date ? new Date(a.payment_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short" }) : "-"}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-left text-slate-500 text-xs font-medium max-w-[200px] truncate">{a.description || "-"}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-16 text-slate-400">
                                            <AlertCircle className="w-12 h-12 mb-3" />
                                            <p className="text-sm font-semibold">{t.empty_state}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Other Corporate Actions */}
                                {otherActions.length > 0 && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Zap} title={t.other_actions} color="text-[#14b8a6]" />
                                        <div className="space-y-3">
                                            {otherActions.map((a: any, i: number) => (
                                                <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#14b8a6]/10 text-[#14b8a6] uppercase tracking-wider">{a.action_type}</span>
                                                            <span className="text-xs text-slate-400 font-bold uppercase">{a.ex_date ? new Date(a.ex_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
                                                        </div>
                                                        <p className="font-extrabold text-base mt-2">{a.description}</p>
                                                    </div>
                                                    {a.amount && (
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-emerald-500 tabular">{formatCurrency(a.amount, a.currency || currency)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fair Value Models (conditional) */}
                                {fairValues.length > 0 && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Star} title={t.fair_value_models} color="text-amber-500" />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider -mt-3 mb-6">
                                            {lang === "ar" ? "نماذج التقييم الداخلي" : "Internal independent valuation models"}
                                            {fairValues[0]?.valuation_date && ` · ${new Date(fairValues[0].valuation_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" })}`}
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                        <th className="text-left py-3 px-4">{lang === "ar" ? "نموذج التقييم" : "Valuation Model"}</th>
                                                        <th className="text-right py-3 px-4">{lang === "ar" ? "القيمة العادلة" : "Fair Value"}</th>
                                                        <th className="text-right py-3 px-4">{lang === "ar" ? "السعر الحالي" : "Current Price"}</th>
                                                        <th className="text-right py-3 px-4">{lang === "ar" ? "الصعود المحتمل" : "Upside / Downside"}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fairValues.map((fv: any, i: number) => {
                                                        const upside = Number(fv.upside_percent || 0);
                                                        const isUp = upside >= 0;
                                                        return (
                                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all font-bold">
                                                                <td className="py-4 px-4 text-left font-extrabold">{fv.valuation_model}</td>
                                                                <td className="py-4 px-4 text-right tabular text-lg font-black text-[#14b8a6]">{currency} {Number(fv.fair_value).toFixed(2)}</td>
                                                                <td className="py-4 px-4 text-right tabular text-slate-500">{currency} {Number(fv.current_price || lastPrice).toFixed(2)}</td>
                                                                <td className={`py-4 px-4 text-right tabular font-black ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                                    <span className={`flex items-center justify-end gap-1 ${isUp ? "" : ""}`}>
                                                                        {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                                        {isUp ? "+" : ""}{upside.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
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
                                                                <span className="text-xs text-slate-400 font-semibold tracking-wide">
                                                                    {article.published_at ? new Date(article.published_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                                                </span>
                                                            </div>

                                                            {/* Internal Route Link ONLY - Absolutely no external URL exposed */}
                                                            <Link href={`/news/${article.id}`}
                                                                className="font-extrabold text-base text-slate-900 dark:text-white hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors leading-snug block mb-2">
                                                                {cleanHeadline}
                                                            </Link>

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

                        {/* ═══════════════════════ PROFILE TAB ═══════════════════════ */}
                        {activeTab === "profile" && (
                            <div className="space-y-8">
                                {/* Company Identity */}
                                <div className="premium-glass rounded-3xl p-8">
                                    <SectionHeader icon={Building2} title={t.profile} color="text-[#14b8a6]" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {[
                                            { l: t.website, v: website ? <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[#14b8a6] hover:underline flex items-center gap-1 font-bold">{website.replace("https://", "").replace("http://", "")} <Globe className="w-4 h-4" /></a> : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.industry, v: industry || "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.employees, v: employees ? employees.toLocaleString() : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: t.location, v: city ? `${city}${country ? `, ${country}` : ""}` : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: lang === "ar" ? "تأسست عام" : "Founded", v: founded ? String(founded) : "-", bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: lang === "ar" ? "الهاتف" : "Phone", v: phone, bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: lang === "ar" ? "الرمز" : "Ticker", v: symbol, bg: "bg-slate-50 dark:bg-slate-900/50" },
                                            { l: lang === "ar" ? "البورصة" : "Exchange", v: marketName, bg: "bg-slate-50 dark:bg-slate-900/50" },
                                        ].map((item, i) => (
                                            <div key={i} className={`p-4 rounded-2xl ${item.bg} border border-slate-200/50 dark:border-slate-800/50`}>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{item.l}</p>
                                                <div className="font-extrabold text-sm truncate">{item.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Business Description */}
                                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">{lang === "ar" ? "نبذة عن الشركة" : "About the Company"}</p>
                                        <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed font-medium">
                                            {longBusinessSummary || t.desc_not_found}
                                        </p>
                                    </div>
                                </div>

                                {/* Management Officers */}
                                {officers && officers.length > 0 && (
                                    <div className="premium-glass rounded-3xl p-8">
                                        <SectionHeader icon={Users} title={t.management_officers} color="text-indigo-500" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {officers.map((officer: any, idx: number) => (
                                                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4 hover:border-[#14b8a6]/40 transition-all duration-300">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14b8a6]/20 to-[#0f766e]/20 border border-[#14b8a6]/20 flex items-center justify-center text-[#14b8a6] font-black text-lg flex-shrink-0">
                                                        {officer.name?.slice(0, 1) || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-base">{officer.name}</p>
                                                        <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">{officer.position || t.ex_board}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                    { l: lang === "ar" ? "متوسط الحجم ٢٠ي" : "Avg Vol 20D", v: avgVolume20d > 0 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(avgVolume20d) : "-", c: "text-slate-600 dark:text-slate-400" },
                                    { l: lang === "ar" ? "أعلى ٥٢ أسبوع" : "52W High", v: chartStats?.high52 ? `${currency} ${chartStats.high52.toFixed(2)}` : "-", c: "text-emerald-600 dark:text-emerald-400" },
                                    { l: lang === "ar" ? "أدنى ٥٢ أسبوع" : "52W Low", v: chartStats?.low52 ? `${currency} ${chartStats.low52.toFixed(2)}` : "-", c: "text-rose-600 dark:text-rose-400" },
                                    { l: lang === "ar" ? "السوق المالي" : "Exchange", v: marketName.toUpperCase(), c: "text-[#14b8a6]" },
                                    { l: lang === "ar" ? "القطاع" : "Sector", v: industry || "-", c: "text-slate-600 dark:text-slate-400" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                        <span className="text-slate-400 text-xs">{item.l}</span>
                                        <span className={`tabular text-xs font-black ${item.c}`}>{item.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dividends Quick Card */}
                        {(dividendRate > 0 || dividendYield > 0 || dividendActions.length > 0) && (
                            <div className="premium-glass rounded-3xl p-6">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-5">
                                    <Wallet className="w-5 h-5 text-emerald-500" /> {lang === "ar" ? "التوزيعات النقدية" : "Dividends"}
                                </h4>
                                <div className="space-y-3 text-sm font-bold">
                                    {[
                                        { l: t.dps, v: dividendRate > 0 ? `${currency} ${dividendRate.toFixed(2)}` : dividendActions.length > 0 ? `${currency} ${Number(dividendActions[0]?.amount || 0).toFixed(2)}` : "-" },
                                        { l: t.div_yield, v: dividendYield > 0 ? pct(dividendYield) : "-" },
                                        { l: t.payout_ratio, v: payoutRatio > 0 ? pct(payoutRatio) : "-" },
                                        { l: lang === "ar" ? "آخر تاريخ استحقاق" : "Last Ex-Date", v: dividendActions.length > 0 && dividendActions[0]?.ex_date ? new Date(dividendActions[0].ex_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-" },
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

                        {/* Fair Value Quick Card */}
                        {fairValues.length > 0 && (
                            <div className="premium-glass rounded-3xl p-6">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-4">
                                    <Star className="w-5 h-5 text-amber-500" /> {t.fair_value}
                                </h4>
                                <div className="space-y-3">
                                    {fairValues.map((fv: any, i: number) => {
                                        const upside = Number(fv.upside_percent || 0);
                                        return (
                                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                                <span className="text-slate-400 text-xs font-bold truncate">{fv.valuation_model}</span>
                                                <span className={`tabular text-xs font-black ${upside >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                    {currency} {Number(fv.fair_value).toFixed(0)} ({upside >= 0 ? "+" : ""}{upside.toFixed(0)}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-3">{lang === "ar" ? "نماذج تقييم داخلية. ليست توصية." : "Internal models only. Not investment advice."}</p>
                            </div>
                        )}

                        {/* Ownership Quick Card */}
                        {(institutionalOwnership > 0 || insiderOwnership > 0 || (Array.isArray(shareholders) && shareholders.length > 0)) && (
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
                                    {institutionalOwnership > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                            <span className="text-slate-400 text-xs">{t.institutional_ownership}</span>
                                            <span className="tabular text-xs font-black text-indigo-500">{(institutionalOwnership * 100).toFixed(1)}%</span>
                                        </div>
                                    )}
                                    {insiderOwnership > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-b-0">
                                            <span className="text-slate-400 text-xs">{t.insider_ownership}</span>
                                            <span className="tabular text-xs font-black text-orange-500">{(insiderOwnership * 100).toFixed(3)}%</span>
                                        </div>
                                    )}

                                    {/* Detailed Ownership Structure (Top Shareholders) */}
                                    {Array.isArray(shareholders) && shareholders.length > 0 && (
                                        <div className="mt-5 pt-5 border-t border-slate-200/50 dark:border-slate-800/50">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">
                                                {lang === "ar" ? "هيكل الملكية (كبار المساهمين)" : "Ownership Structure"}
                                            </p>
                                            <div className="space-y-4">
                                                {shareholders.map((sh: any, i: number) => {
                                                    const percent = Number(sh.ownership_percent || 0);
                                                    const shares = Number(sh.shares_held || 0);
                                                    const name = lang === "ar" && sh.shareholder_name_ar ? sh.shareholder_name_ar : sh.shareholder_name_en;
                                                    return (
                                                        <div key={i} className="space-y-1 font-bold">
                                                            <div className="flex justify-between items-center text-xs font-bold gap-2">
                                                                <span className="text-slate-700 dark:text-slate-350 truncate text-[11px] leading-tight" title={name}>{name}</span>
                                                                <span className="tabular text-indigo-600 dark:text-indigo-400 font-black text-[11px] flex-shrink-0">{percent.toFixed(2)}%</span>
                                                            </div>
                                                            {shares > 0 && (
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    {formatNumber(shares)} {lang === "ar" ? "سهم" : "shares"}
                                                                </p>
                                                            )}
                                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Financial Quality Scores & Growth Metrics (shown only on Ratios & Risk tab) */}
                        {activeTab === "ratios" && (
                            <>
                                {/* Financial Quality Scores Card */}
                                {stats && (stats.piotroski_f_score !== undefined || stats.altman_z_score !== null) && (
                                    <div className="premium-glass rounded-3xl p-6">
                                        <h4 className="text-lg font-black flex items-center gap-2 mb-4">
                                            <ShieldAlert className="w-5 h-5 text-teal-500" /> {lang === "ar" ? "مؤشرات الجودة المالية" : "Financial Quality Scores"}
                                        </h4>
                                        <div className="space-y-3 font-bold text-sm">
                                            {stats.piotroski_f_score !== undefined && (
                                                <div className="py-2.5 border-b border-slate-200/50 dark:border-slate-800/50">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-slate-400 text-xs">{t.piotroski_score}</span>
                                                        <span className={`tabular text-xs font-black px-2 py-0.5 rounded-md ${stats.piotroski_f_score >= 6 ? "bg-emerald-500/10 text-emerald-400" : stats.piotroski_f_score <= 3 ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                            {stats.piotroski_f_score} / 9
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {stats.piotroski_f_score >= 6 ? "Strong" : stats.piotroski_f_score <= 3 ? "Weak" : "Moderate"} • {lang === "ar" ? "جودة المحاسبة الإجمالية" : "Overall accounting quality"}
                                                    </p>
                                                </div>
                                            )}
                                            {stats.altman_z_score !== undefined && stats.altman_z_score !== null && (
                                                <div className="py-2.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-slate-400 text-xs">{t.altman_z_score}</span>
                                                        <span className={`tabular text-xs font-black px-2 py-0.5 rounded-md ${stats.altman_z_score > 2.9 ? "bg-emerald-500/10 text-emerald-400" : stats.altman_z_score < 1.1 ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                            {Number(stats.altman_z_score).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {stats.altman_z_score > 2.9 ? "Safe Zone" : stats.altman_z_score < 1.1 ? "Distress Zone" : "Grey Zone"} • {lang === "ar" ? "احتمالية الضائقة المالية" : "Distress probability"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Growth Metrics Card */}
                                {(revenueGrowth !== null || epsGrowth !== null || profitGrowth !== null) && (
                                    <div className="premium-glass rounded-3xl p-6">
                                        <h4 className="text-lg font-black flex items-center gap-2 mb-4">
                                            <TrendingUp className="w-5 h-5 text-teal-500" /> {t.growth_metrics}
                                        </h4>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl mb-4 text-[10px] font-bold text-amber-750 dark:text-amber-400">
                                            {lang === "ar" ? "بيانات النمو محتسبة برمجياً." : "Figures system-computed. Verify with filings."}
                                        </div>
                                        <div className="space-y-3 font-bold text-sm">
                                            {revenueGrowth !== null && (
                                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                                    <span className="text-slate-400 text-xs">{lang === "ar" ? "نمو الإيرادات (سنوي)" : "Revenue Growth (YoY)"}</span>
                                                    <span className={`tabular text-xs font-black ${revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {revenueGrowth >= 0 ? "+" : ""}{(revenueGrowth * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            )}
                                            {epsGrowth !== null && (
                                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                                    <span className="text-slate-400 text-xs">{lang === "ar" ? "نمو ربحية السهم" : "EPS Growth (YoY)"}</span>
                                                    <span className={`tabular text-xs font-black ${epsGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {epsGrowth >= 0 ? "+" : ""}{(epsGrowth * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            )}
                                            {profitGrowth !== null && (
                                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                                    <span className="text-slate-400 text-xs">{lang === "ar" ? "نمو الأرباح" : "Profit Growth (YoY)"}</span>
                                                    <span className={`tabular text-xs font-black ${profitGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {profitGrowth >= 0 ? "+" : ""}{(profitGrowth * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
