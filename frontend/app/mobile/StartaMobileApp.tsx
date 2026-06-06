"use client";

import {
  Activity,
  ArrowUp,
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coins,
  Crown,
  FileText,
  Fingerprint,
  GitCompare,
  GraduationCap,
  Home,
  Landmark,
  Languages,
  LineChart,
  Mail,
  Menu,
  Moon,
  Newspaper,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  User,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Capacitor } from "@capacitor/core";
import styles from "./mobile.module.css";
// ── Unified AI chat rendering — the SAME pipeline the website /AiChat uses,
//    so mobile responses are identical to the web (one renderer, one data shape).
import { WorldClassMessage, FollowUpPrompt, FollowUpChips } from "@/components/ai/WorldClassMessage";
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { FactExplanations } from "@/components/ai/FactExplanations";
import { sanitizeChatResponse, type ChatResponse } from "@/hooks/useAIChat";

type Lang = "en" | "ar";
type Theme = "light" | "dark";
type TabId = "home" | "markets" | "funds" | "news" | "portfolio" | "more";
type PushName =
  | "market-pulse"
  | "stock"
  | "fund"
  | "article"
  | "compare"
  | "watchlist"
  | "search"
  | "alerts"
  | "learn"
  | "course"
  | "profile"
  | "settings"
  | "subscription"
  | "help"
  | "about"
  | "privacy"
  | "terms"
  | "portfolio-intel"
  | "portfolio-detail"
  | "company-profile";

type Stock = {
  symbol: string;
  name: string;
  nameAr?: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  trend: number[];
};

type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Fund = {
  id: string;
  name: string;
  nameAr?: string;
  house: string;
  houseAr?: string;
  type: string;
  typeAr?: string;
  ytd: number;
  return1m?: number;
  return3m?: number;
  return1y?: number;
  return3y?: number;
  return5y?: number;
  nav: number;
  currency?: string;
  risk?: number;
  liquidity: string;
  min: string;
  expense: string;
  aum: string;
  benchmark?: string;
  eligibility?: string;
  isin?: string;
  owner?: string;
  issuer?: string;
  shariah?: boolean;
  inceptionDate?: string;
  trend: number[];
  strategy?: string;
  objective?: string;
  lastNavDate?: string;
  lastUpdateDate?: string;
  raw?: Record<string, unknown>;
};

type NewsItem = {
  id: number;
  headline: string;
  body: string[];
  category: string;
  symbol?: string;
  source: string;
  time: string;
  image?: string;
  publishedAt?: string;
};

type LearnTopic = {
  slug: string;
  accent?: string;
  icon?: string;
  coverImageEn?: string;
  coverImageAr?: string;
  en: { category: string; title: string; summary: string; readTime?: string; intro?: string; sections?: LearnSection[] };
  ar: { category: string; title: string; summary: string; readTime?: string; intro?: string; sections?: LearnSection[] };
};

type LearnSection = {
  heading: string;
  body: string;
  bullets?: string[];
  image?: { src?: string; alt?: string; caption?: string };
};

type PortfolioPosition = {
  symbol: string;
  name: string;
  quantity: number;
  value: number;
  price: number;
  dayPct: number;
  plPct: number;
  weight: number;
  color: string;
  avgPrice?: number;
  sector?: string;
};

type MarketSummary = {
  market_status?: "OPEN" | "CLOSED";
  index_value?: number;
  index_change?: number;
  index_change_percent?: number;
  total_volume?: number;
  total_turnover?: number;
  advancing?: number;
  declining?: number;
  new_highs?: number;
  new_lows?: number;
  total_stocks?: number;
};

type EgxIndex = {
  available?: boolean;
  quote?: {
    value?: number | null;
    change?: number | null;
    changePercent?: number | null;
    volume?: number | null;
  };
  history?: Array<{ close?: number | null }>;
};

type PushScreen = { name: PushName; props?: Record<string, unknown> };
type AiMessage = { role: "user" | "assistant"; text: string; kind?: "snapshot" | "comparison" | "screen" | "api"; response?: ChatResponse };
type CompanyProfileBundle = {
  profile?: Record<string, unknown>;
  marketData?: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  financials: Record<string, unknown>[];
  ratios: Record<string, unknown>[];
  shareholders: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  // TradingView-native parity (mirrors the website /symbol page).
  financialsTv: Record<string, unknown>[];
  technicals: Record<string, unknown>[];
  estimates?: Record<string, unknown>;
  // Monthly seasonality + per-symbol TradingView news.
  seasonals?: SeasonalsResponse;
  newsTv?: Record<string, unknown>[];
};
type SeasonalMonth = {
  month: number;
  label: string;
  avg_return: number | null;
  positive_rate: number | null;
  years: number;
};
type SeasonalsResponse = {
  available: boolean;
  years_covered: number;
  window_years?: number;
  months: SeasonalMonth[];
};
type NavController = {
  push: (name: PushName, props?: Record<string, unknown>) => void;
  pop: () => void;
  setTab: (tab: TabId) => void;
  openAI: (seed?: string) => void;
  openStock: (symbol: string) => void;
  back: () => boolean;
};

const EMPTY_STOCKS: Stock[] = [];
const EMPTY_FUNDS: Fund[] = [];
const EMPTY_NEWS: NewsItem[] = [];

const HOLDING_COLORS = ["#00D2B4", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6"];

const aboutContent = {
  en: [
    ["Market-first intelligence", "Starta Markets unifies EGX prices, fund intelligence, market news, learning, portfolio analytics, and an AI analyst in one product surface."],
    ["Institutional grade by design", "The platform is built around clean data, bilingual access, risk-aware analysis, and transparent disclaimers so investors can think with better context."],
    ["Egypt now, MENA next", "Starta begins with the Egyptian Exchange and is designed to expand across regional markets without losing local language, market structure, or regulatory nuance."],
  ],
  ar: [
    ["ذكاء سوقي أولاً", "تجمع Starta Markets أسعار البورصة المصرية، وبيانات الصناديق، وأخبار السوق، والتعليم، وتحليلات المحافظ، ومحلل الذكاء الاصطناعي في تجربة واحدة."],
    ["مستوى مؤسسي في التصميم", "يرتكز المنتج على بيانات واضحة، ودعم ثنائي اللغة، وتحليل واعٍ بالمخاطر، وإخلاء مسؤولية شفاف لمساعدة المستثمر على التفكير بسياق أفضل."],
    ["مصر الآن، والمنطقة لاحقاً", "تبدأ Starta من البورصة المصرية وهي مهيأة للتوسع إقليمياً مع الحفاظ على اللغة المحلية وبنية السوق والاعتبارات التنظيمية."],
  ],
};

const legalContent = {
  privacy: {
    en: [
      ["1. Core Privacy Philosophy", "Starta Markets treats financial activity, portfolio inputs, preferences, and AI prompts as sensitive data. We design the product to minimize unnecessary collection and to keep user-controlled data clearly separated from public market data."],
      ["2. Portfolio Data", "Portfolio positions, watchlists, alerts, and local preferences are used to render analytics, benchmark comparison, and AI context. Production storage should remain access-controlled and auditable."],
      ["3. AI Analyst Privacy", "Prompts may include market symbols, article headlines, and portfolio context so Starta AI can answer accurately. Do not submit passwords, national IDs, bank credentials, or private third-party data."],
      ["4. Security Requests", "Privacy questions or deletion requests should be directed to privacy@startamarkets.com."],
    ],
    ar: [
      ["١. فلسفة الخصوصية", "تتعامل Starta Markets مع نشاطك المالي ومدخلات المحفظة والتفضيلات وأسئلة الذكاء الاصطناعي كبيانات حساسة. صُمم المنتج لتقليل جمع البيانات غير الضرورية وفصل بيانات المستخدم عن بيانات السوق العامة."],
      ["٢. بيانات المحفظة", "تُستخدم المراكز وقوائم المتابعة والتنبيهات والتفضيلات لعرض التحليلات والمقارنة بالمؤشر وسياق الذكاء الاصطناعي. يجب أن يبقى التخزين الإنتاجي مضبوط الصلاحيات وقابلاً للمراجعة."],
      ["٣. خصوصية محلل الذكاء الاصطناعي", "قد تشمل الأسئلة رموز السوق أو عناوين الأخبار أو سياق المحفظة لتحسين دقة الإجابة. لا تُدخل كلمات مرور أو أرقام هوية أو بيانات بنكية أو بيانات خاصة بأطراف أخرى."],
      ["٤. طلبات الخصوصية", "للاستفسارات أو طلبات الحذف، تواصل عبر privacy@startamarkets.com."],
    ],
  },
  terms: {
    en: [
      ["1. Acceptance of Terms", "By using Starta Markets, including the website, mobile app, fund tools, portfolio dashboards, and AI Analyst, you agree to these service terms."],
      ["2. Informational Use Only", "All market data, fund analytics, news, education, portfolio calculations, and AI output are informational and educational only. They are not investment advice or a recommendation to buy or sell any security or fund."],
      ["3. Market Risk", "Financial markets are volatile. You are responsible for independent due diligence, suitability assessment, and any investment decision you make."],
      ["4. Governing Framework", "The service is operated for users following applicable laws and regulatory expectations in the Arab Republic of Egypt where relevant."],
    ],
    ar: [
      ["١. قبول الشروط", "باستخدام Starta Markets، بما في ذلك الموقع والتطبيق وأدوات الصناديق ولوحات المحافظ ومحلل الذكاء الاصطناعي، فإنك توافق على شروط الخدمة."],
      ["٢. استخدام معلوماتي فقط", "كل بيانات السوق وتحليلات الصناديق والأخبار والتعليم وحسابات المحفظة ومخرجات الذكاء الاصطناعي معلوماتية وتعليمية فقط، وليست توصية شراء أو بيع لأي ورقة مالية أو صندوق."],
      ["٣. مخاطر السوق", "الأسواق المالية متقلبة. أنت مسؤول عن العناية الواجبة وتقييم الملاءمة وأي قرار استثماري تتخذه."],
      ["٤. الإطار الحاكم", "تُشغل الخدمة للمستخدمين وفق القوانين والتوقعات التنظيمية ذات الصلة في جمهورية مصر العربية عند انطباقها."],
    ],
  },
};

const copy = {
  en: {
    morning: "Good morning",
    user: "Investor",
    home: "Home",
    pulse: "Pulse",
    markets: "Markets",
    news: "News",
    funds: "Funds",
    portfolio: "Portfolio",
    more: "More",
    live: "Live",
    marketPulse: "Market Pulse",
    marketNews: "Market News",
    mutualFunds: "Mutual Funds",
    holdings: "Holdings & Performance",
    explore: "Explore",
    learn: "Learn",
    compare: "Compare",
    askAi: "Ask AI",
    topMovers: "Top Movers",
    topFunds: "Top Funds",
    watchlist: "Watchlist",
    alerts: "Alerts",
    settings: "Settings",
    profile: "Profile",
    subscription: "Subscription",
    about: "About Starta",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    portfolioIntel: "Portfolio Intelligence",
    companyProfile: "Company Profile",
    upgrade: "Upgrade to Analyst",
    disclaimer: "Informational only · not investment advice.",
    searchNews: "Search headlines or symbols",
    all: "All",
    market: "Market",
    gainers: "Gainers",
    losers: "Losers",
    darkMode: "Dark mode",
    arabic: "Arabic",
    welcomeTitleA: "A smarter vision for",
    welcomeTitleB: "investing.",
    welcomeSub: "Institutional market intelligence for EGX investors, funds, news, education, portfolios, and AI analysis.",
    createAccount: "Enter live app",
    haveAccount: "I already have an account",
    guest: "Local workspace · live public data · no trading",
    aiTitle: "Starta AI",
    aiOnline: "Analyst online",
    aiEmpty: "Ask anything about the Egyptian market.",
  },
  ar: {
    morning: "صباح الخير",
    user: "مستثمر",
    home: "الرئيسية",
    pulse: "النبض",
    markets: "الأسواق",
    news: "الأخبار",
    funds: "الصناديق",
    portfolio: "المحفظة",
    more: "المزيد",
    live: "مباشر",
    marketPulse: "نبض السوق",
    marketNews: "أخبار السوق",
    mutualFunds: "الصناديق الاستثمارية",
    holdings: "المراكز والأداء",
    explore: "استكشف",
    learn: "تعلّم",
    compare: "قارن",
    askAi: "اسأل الذكاء",
    topMovers: "الأكثر حركة",
    topFunds: "أفضل الصناديق",
    watchlist: "قائمة المتابعة",
    alerts: "التنبيهات",
    settings: "الإعدادات",
    profile: "الملف الشخصي",
    subscription: "الاشتراك",
    about: "عن Starta",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    portfolioIntel: "ذكاء المحفظة",
    companyProfile: "ملف الشركة",
    upgrade: "الترقية إلى Analyst",
    disclaimer: "للمعلومات فقط · ليست توصية استثمارية.",
    searchNews: "ابحث في الأخبار أو الرموز",
    all: "الكل",
    market: "السوق",
    gainers: "الرابحون",
    losers: "الخاسرون",
    darkMode: "الوضع الداكن",
    arabic: "العربية",
    welcomeTitleA: "رؤية أذكى من أجل",
    welcomeTitleB: "الاستثمار.",
    welcomeSub: "ذكاء سوقي بمستوى مؤسسي لمستثمري البورصة المصرية: أسعار، صناديق، أخبار، تعليم، محافظ، وتحليل ذكي.",
    createAccount: "الدخول إلى التطبيق",
    haveAccount: "لدي حساب بالفعل",
    guest: "مساحة محلية · بيانات عامة حية · بدون تداول",
    aiTitle: "Starta AI",
    aiOnline: "المحلل متصل",
    aiEmpty: "اسأل عن أي شيء يخص السوق المصري.",
  },
};

const icons: Record<string, LucideIcon> = {
  activity: Activity,
  "arrow-up": ArrowUp,
  bell: Bell,
  bookmark: Bookmark,
  check: Check,
  "check-check": CheckCheck,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-help": CircleHelp,
  coins: Coins,
  crown: Crown,
  "file-text": FileText,
  fingerprint: Fingerprint,
  "git-compare": GitCompare,
  "graduation-cap": GraduationCap,
  home: Home,
  landmark: Landmark,
  languages: Languages,
  "line-chart": LineChart,
  mail: Mail,
  menu: Menu,
  moon: Moon,
  newspaper: Newspaper,
  pencil: Pencil,
  phone: Phone,
  plus: Plus,
  search: Search,
  send: Send,
  settings: Settings,
  "share-2": Share2,
  "shield-check": ShieldCheck,
  sliders: SlidersHorizontal,
  star: Star,
  sun: Sun,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "triangle-alert": TriangleAlert,
  user: User,
  wallet: Wallet,
  x: X,
  zap: Zap,
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Icon({ name, size = 18, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  const Cmp = icons[name] ?? Activity;
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

function AIGlyph({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-32 12 12)" stroke={color} strokeWidth="1.5" opacity="0.55" />
      <circle cx="20.2" cy="6.6" r="1.5" fill={color} />
      <path d="M12 4.6c.42 3.6 1.4 4.58 5 5-3.6.42-4.58 1.4-5 5-.42-3.6-1.4-4.58-5-5 3.6-.42 4.58-1.4 5-5Z" fill={color} />
    </svg>
  );
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function firstString(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function isIdentifierBlob(value?: string) {
  if (!value) return true;
  const text = value.trim();
  if (!text || text === "—") return true;
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((part) => /^[A-Z0-9.:-]+$/i.test(part))) return true;
  if (/^[A-Z]{2,8}(?:\.CA)?$/i.test(text)) return true;
  if (/^0P[A-Z0-9]+$/i.test(text) || /^\d{5,}$/.test(text)) return true;
  return false;
}

function cleanCompanyName(value?: string) {
  if (!value) return "";
  const text = cleanUiText(value)
    .replace(/\s+/g, " ")
    .trim();
  return isIdentifierBlob(text) ? "" : text;
}

function companyNameFromDescription(description?: string) {
  const text = cleanUiText(description ?? "");
  if (!text) return "";
  const match = text.match(/^(.+?)\s+(?:provides|operates|engages|offers|develops|manufactures|distributes|invests|owns|manages|produces|was founded|is headquartered|is listed)\b/i);
  return cleanCompanyName(match?.[1] ?? "");
}

function firstCompanyName(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = cleanCompanyName(String(row[key] ?? ""));
    if (value) return value;
  }
  return cleanCompanyName(fallback) || fallback;
}

function cleanUiText(value: string) {
  return value
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Like cleanUiText but preserves line/paragraph breaks so AI answers can render
// as real paragraphs and bullet lists instead of one collapsed run of text.
function cleanAiText(value: string) {
  return value
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+[-•]\s+(?=\*\*)/g, "\n- ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = optionalNumber(row[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

const NUMBER_LOCALE = "en-US";
const ARABIC_TEXT_LATIN_NUMBER_LOCALE = "ar-EG-u-nu-latn";

function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(NUMBER_LOCALE, options).format(value || 0);
}

function compact(value: number, _lang: Lang) {
  return formatNumber(value, { notation: "compact", maximumFractionDigits: 1 });
}

function money(value: number, lang: Lang, digits = 0) {
  return `${formatNumber(value, { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${lang === "ar" ? "جنيه" : "EGP"}`;
}

function pct(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function pctRatio(value: number | undefined, digits = 1) {
  if (value === undefined || !Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(digits)}%`;
}

function formatDate(value: unknown, lang: Lang) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(lang === "ar" ? ARABIC_TEXT_LATIN_NUMBER_LOCALE : NUMBER_LOCALE, { year: "numeric", month: "short", day: "numeric" });
}

function relTime(value: string | undefined, lang: Lang) {
  if (!value) return lang === "ar" ? "اليوم" : "Today";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return lang === "ar" ? "اليوم" : "Today";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days === 0) return lang === "ar" ? "اليوم" : "Today";
  return new Intl.RelativeTimeFormat(lang === "ar" ? ARABIC_TEXT_LATIN_NUMBER_LOCALE : NUMBER_LOCALE, { numeric: "auto" }).format(-days, "day");
}

// Direct backend API base. The bundled native app injects an absolute origin
// (https://startamarkets.com) at build time, so it calls the production API
// directly; the web route leaves it empty and uses same-origin relative paths.
declare const __API_BASE__: string | undefined;
const API_BASE = typeof __API_BASE__ !== "undefined" && __API_BASE__ ? __API_BASE__ : "";

const jsonMemoryCache = new Map<string, { at: number; value: unknown }>();

async function getJson<T>(url: string, options: { ttl?: number; fresh?: boolean } = {}): Promise<T | null> {
  try {
    const ttl = options.ttl ?? 0;
    if (!options.fresh && ttl > 0) {
      const cached = jsonMemoryCache.get(url);
      if (cached && Date.now() - cached.at < ttl) return cached.value as T;
    }
    const res = await fetch(`${API_BASE}${url}`, { cache: options.fresh ? "no-store" : "default" });
    if (!res.ok) return null;
    const value = (await res.json()) as T;
    if (ttl > 0) jsonMemoryCache.set(url, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

async function postJson<T>(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function normalizeStock(row: Record<string, unknown>): Stock {
  const symbol = String(row.symbol ?? row.s ?? "").toUpperCase();
  const price = toNumber(row.last_price ?? row.price ?? row.px);
  const changePct = toNumber(row.change_percent ?? row.changePct ?? row.chg);
  const rawName = firstCompanyName(row, ["name_en", "company_name_en", "company_name", "name"], symbol);
  return {
    symbol,
    name: rawName || symbol,
    nameAr: typeof row.name_ar === "string" ? row.name_ar : undefined,
    sector: String(row.sector_name ?? row.sector ?? "EGX"),
    price,
    change: toNumber(row.change),
    changePct,
    volume: toNumber(row.volume),
    marketCap: toNumber(row.market_cap, 0) || undefined,
    pe: toNumber(row.pe_ratio, 0) || undefined,
    trend: [], // filled with real daily closes via loadSparklines()
  };
}

function normalizeFund(row: Record<string, unknown>, _index: number): Fund {
  const id = String(row.fund_id ?? row.id ?? row.isin ?? "");
  const ytd = firstNumber(row, ["returns_ytd", "return_ytd", "ytd_return", "returns_1y", "one_year_return"]) ?? 0;
  const type = firstString(row, ["fund_type_en", "classification_en", "type", "category_en"], "Mutual Fund");
  const typeAr = firstString(row, ["fund_type", "classification"], "");
  const riskText = firstString(row, ["risk_level_en", "risk_level"], "").toLowerCase();
  const risk = riskText.includes("high") || riskText.includes("مرتفع") || riskText.includes("عالية")
    ? 4
    : riskText.includes("low") || riskText.includes("منخفض")
      ? 1
      : riskText.includes("medium") || riskText.includes("متوسط")
        ? 2
        : undefined;
  return {
    id,
    name: String(row.fund_name_en ?? row.fund_name ?? ""),
    nameAr: typeof row.fund_name === "string" ? row.fund_name : typeof row.fund_name_ar === "string" ? row.fund_name_ar : undefined,
    house: firstString(row, ["manager_name_en", "manager", "asset_manager_en", "management_company", "fund_manager", "house"], "—"),
    houseAr: firstString(row, ["manager_name", "issuer", "owner_name"], ""),
    type,
    typeAr,
    ytd,
    return1m: firstNumber(row, ["returns_1m", "return_1m", "profit_month"]),
    return3m: firstNumber(row, ["returns_3m", "return_3m", "profit_3month"]),
    return1y: firstNumber(row, ["returns_1y", "return_1y", "one_year_return"]),
    return3y: firstNumber(row, ["returns_3y", "return_3y", "three_year_return"]),
    return5y: firstNumber(row, ["returns_5y", "return_5y", "five_year_return"]),
    nav: toNumber(row.latest_nav ?? row.nav),
    currency: firstString(row, ["currency"], "EGP"),
    risk,
    liquidity: firstString(row, ["liquidity", "nav_frequency_en", "nav_frequency", "redemption_frequency"], "—"),
    min: firstString(row, ["minimum_investment", "min_subscription", "min_investment", "minimum_subscription"], "—"),
    expense: row.expense_ratio ? `${row.expense_ratio}%` : firstString(row, ["fee_management"], "—"),
    aum: row.aum_millions ? `${compact(toNumber(row.aum_millions), "en")}m` : row.aum ? compact(toNumber(row.aum), "en") : "—",
    benchmark: firstString(row, ["benchmark_en", "benchmark"], ""),
    eligibility: firstString(row, ["eligibility_en", "eligibility"], ""),
    isin: firstString(row, ["isin"], ""),
    owner: firstString(row, ["owner_name_en", "owner_name", "owner"], ""),
    issuer: firstString(row, ["issuer_en", "issuer"], ""),
    shariah: Boolean(row.is_shariah) || /sharia|شريعة/i.test(`${type} ${typeAr} ${row.fund_name_en ?? ""} ${row.fund_name ?? ""}`),
    inceptionDate: firstString(row, ["inception_date", "establishment_date"], ""),
    trend: [], // filled with real NAV history via loadFundSparklines()
    strategy: firstString(row, ["investment_strategy_en", "strategy_en", "investment_strategy", "description_en"], ""),
    objective: firstString(row, ["objective_en", "objective"], ""),
    lastNavDate: typeof row.last_nav_date === "string" ? row.last_nav_date : undefined,
    lastUpdateDate: firstString(row, ["last_update_date", "last_updated", "updated_at"], ""),
    raw: row,
  };
}

function safeDecodeUri(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function normalizeNews(row: Record<string, unknown>, lang: Lang): NewsItem {
  const body = String(row.article_body ?? "")
    .split(/\n{2,}|\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
  const section = safeDecodeUri(String(row.source_section ?? row.symbol ?? "Markets"))
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "ar");
  return {
    id: toNumber(row.id),
    headline: String(row.headline ?? ""),
    body: body.length ? body : [String(row.headline ?? "")],
    category: section.pop() ?? "Markets",
    symbol: typeof row.symbol === "string" ? row.symbol : undefined,
    source: (typeof row.source === "string" && row.source.trim()) ? row.source.trim() : "",
    time: relTime(typeof row.published_at === "string" ? row.published_at : undefined, lang),
    image: typeof row.image_url === "string" ? row.image_url : undefined,
    publishedAt: typeof row.published_at === "string" ? row.published_at : undefined,
  };
}

async function loadCompanyProfile(symbol: string, lang: Lang): Promise<CompanyProfileBundle> {
  const clean = encodeURIComponent(symbol);
  const [websiteProfile, financials, ratios, shareholders, actions, egxStats, financialsTv, technicals, estimates, seasonals, newsTv] = await Promise.all([
    getJson<{ profile?: Record<string, unknown>; market_data?: Record<string, unknown>; statistics?: Record<string, unknown> }>(`/api/v1/company/${clean}/profile`, { ttl: 60_000 }),
    getJson<Record<string, unknown>[]>(`/api/v1/financials/${clean}`, { ttl: 60_000 }),
    getJson<Record<string, unknown>[]>(`/api/v1/ratios?symbol=${clean}&limit=6`, { ttl: 60_000 }),
    getJson<Record<string, unknown>[]>(`/api/v1/shareholders?symbol=${clean}&limit=8`, { ttl: 60_000 }),
    getJson<Record<string, unknown>[]>(`/api/v1/corporate-actions?symbol=${clean}`, { ttl: 60_000 }),
    // Real TradingView-sourced valuation/technical stats (beta, MAs, RSI, P/E, P/B, 52w…).
    getJson<Record<string, unknown>>(`/api/v1/egx/statistics/${clean}`, { ttl: 60_000 }),
    // TradingView-native parity — same feeds the website /symbol page consumes.
    getJson<{ years?: Record<string, unknown>[] }>(`/api/v1/egx/financials-tv/${clean}`, { ttl: 60_000 }),
    getJson<{ timeframes?: Record<string, unknown>[] }>(`/api/v1/egx/technicals/${clean}`, { ttl: 60_000 }),
    getJson<Record<string, unknown>>(`/api/v1/egx/estimates/${clean}`, { ttl: 60_000 }),
    // Monthly seasonality (avg return / positive-rate per calendar month).
    getJson<SeasonalsResponse>(`/api/v1/egx/seasonals/${clean}`, { ttl: 60_000 }),
    // Per-symbol TradingView news (same feed the website /symbol page consumes).
    getJson<Record<string, unknown>[]>(`/api/v1/egx/news-tv/${clean}?lang=${lang}`, { ttl: 60_000 }),
  ]);
  return {
    profile: { ...(websiteProfile?.profile ?? {}) },
    marketData: websiteProfile?.market_data,
    // Merge: egx_statistics fills the snapshot; website statistics (if any) wins.
    statistics: { ...(egxStats ?? {}), ...(websiteProfile?.statistics ?? {}) },
    financials: Array.isArray(financials) ? financials : [],
    ratios: Array.isArray(ratios) ? ratios : [],
    shareholders: Array.isArray(shareholders) ? shareholders : [],
    actions: Array.isArray(actions) ? actions : [],
    financialsTv: Array.isArray(financialsTv?.years) ? financialsTv.years : [],
    technicals: Array.isArray(technicals?.timeframes) ? technicals.timeframes : [],
    estimates: estimates ?? undefined,
    seasonals: seasonals ?? undefined,
    newsTv: Array.isArray(newsTv) ? newsTv : [],
  };
}

// ---- Real chart data (no mock / no seeded trends) ----

/** Batch real daily closes for many stock symbols in one request. */
async function loadSparklines(symbols: string[], period = "1m"): Promise<Record<string, number[]>> {
  const uniq = Array.from(new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean)));
  if (!uniq.length) return {};
  const res = await getJson<Record<string, Array<number | string>>>(
    `/api/v1/sparklines?symbols=${encodeURIComponent(uniq.join(","))}&period=${period}`,
    { ttl: 60_000 },
  );
  const out: Record<string, number[]> = {};
  if (res) {
    for (const key of Object.keys(res)) {
      out[key.toUpperCase().replace(".CA", "")] = (res[key] || []).map(Number).filter((n) => Number.isFinite(n));
    }
  }
  return out;
}

/** Batch real NAV history for many funds in one request. */
async function loadFundSparklines(ids: string[], period = "1y"): Promise<Record<string, number[]>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  if (!uniq.length) return {};
  const res = await getJson<Record<string, Array<number | string>>>(
    `/api/v1/fund-sparklines?ids=${encodeURIComponent(uniq.join(","))}&period=${period}`,
    { ttl: 300_000 },
  );
  const out: Record<string, number[]> = {};
  if (res) {
    for (const key of Object.keys(res)) {
      out[String(key)] = (res[key] || []).map(Number).filter((n) => Number.isFinite(n));
    }
  }
  return out;
}

const TF_TO_PERIOD: Record<string, string> = { "1D": "1w", "1W": "1w", "1M": "1m", "3M": "3m", "6M": "6m", "1Y": "1y", "3Y": "3y", MAX: "max" };

function normalizeOhlc(row: Record<string, unknown>): OhlcBar | null {
  const close = toNumber(row.close ?? row.adj_close, NaN);
  if (!Number.isFinite(close) || close <= 0) return null;
  const openRaw = toNumber(row.open, close);
  const highRaw = toNumber(row.high, Math.max(openRaw, close));
  const lowRaw = toNumber(row.low, Math.min(openRaw, close));
  const high = Math.max(highRaw, openRaw, close);
  const low = Math.min(lowRaw, openRaw, close);
  return {
    date: String(row.date ?? row.time ?? row.t ?? ""),
    open: openRaw,
    high,
    low,
    close,
    volume: toNumber(row.volume),
  };
}

/** Real OHLC stock history, matching the public website chart feed. */
async function loadOhlcRows(symbol: string, tf: string): Promise<OhlcBar[]> {
  const clean = encodeURIComponent(symbol);
  const period = TF_TO_PERIOD[tf] ?? "1y";
  const rows = await getJson<Record<string, unknown>[]>(`/api/v1/ohlc/${clean}?period=${period}`, { ttl: 60_000 });
  if (!Array.isArray(rows)) return [];
  return rows
    .map(normalizeOhlc)
    .filter((row): row is OhlcBar => !!row)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Real OHLC/intraday close series for a single symbol at a timeframe. */
async function loadPriceSeries(symbol: string, tf: string): Promise<number[]> {
  return (await loadOhlcRows(symbol, tf)).map((row) => row.close);
}

/** Real NAV history for a single fund (chronological). */
async function loadFundNav(id: string): Promise<number[]> {
  const rows = await getJson<Record<string, unknown>[]>(`/api/v1/funds/${encodeURIComponent(id)}/nav?limit=160`, { ttl: 300_000 });
  if (Array.isArray(rows) && rows.length) {
    // The nav endpoint returns newest-first; reverse to chronological order.
    return rows.map((r) => toNumber(r.nav)).filter((n) => Number.isFinite(n) && n > 0).reverse();
  }
  return [];
}

function isArabicText(value?: string) {
  return !!value && /[\u0600-\u06FF]/.test(value);
}

function stockLabel(stock: Stock, lang: Lang) {
  if (lang === "ar" && isArabicText(stock.nameAr)) return stock.nameAr!;
  return cleanCompanyName(stock.name) || stock.symbol;
}

function fundLabel(fund: Fund, lang: Lang) {
  return lang === "ar" && isArabicText(fund.nameAr) ? fund.nameAr! : fund.name;
}

function fundHouseLabel(fund: Fund, lang: Lang) {
  return lang === "ar" && isArabicText(fund.houseAr) ? fund.houseAr! : fund.house;
}

function fundTypeLabel(fund: Fund, lang: Lang) {
  return lang === "ar" && isArabicText(fund.typeAr) ? fund.typeAr! : fund.type;
}

function fundReturn(fund: Fund, key: "1M" | "3M" | "YTD" | "1Y" | "3Y" | "All") {
  if (key === "1M") return fund.return1m;
  if (key === "3M") return fund.return3m;
  if (key === "1Y") return fund.return1y;
  if (key === "3Y") return fund.return3y;
  if (key === "All") return fund.return5y;   // best proxy for "all time" from API fields; chart calculates exact value from NAV history
  return fund.ytd;
}

// ---- Local watchlist (persisted in localStorage; shared across all surfaces) ----
const WATCH_KEY = "starta-mobile-watchlist";
const WATCH_EVENT = "starta-watchlist-change";
const LOCAL_PORTFOLIO_KEY = "starta-mobile-portfolio-positions";
const MOBILE_THEME_KEY = "starta-mobile-theme";

const storage = {
  get(key: string) {
    try {
      return typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(key, value);
    } catch {
      /* ignore unavailable storage */
    }
  },
  remove(key: string) {
    try {
      if (typeof window !== "undefined" && window.localStorage) window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// ============================================================================
// Auth — real account system (mirrors the website: JWT + guest freemium gate).
// Talks to the same prod backend the app already uses; CapacitorHttp makes the
// cross-origin calls + custom headers CORS-safe.
// ============================================================================
type AuthUser = {
  id?: number;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: string;
  subscription_status?: string;
  subscription_plan?: string;
};

const AUTH_TOKEN_KEY = "fh_auth_token";
const AUTH_REFRESH_KEY = "fh_refresh_token";
const AUTH_USER_KEY = "fh_user";
const GUEST_USAGE_KEY = "fh_guest_usage";

// Free guest allowances before the register popup (authed users are unlimited).
const GUEST_LIMITS: Record<string, number> = { ai: 3, research: 3, compare: 2 };
// Pushed screens that consume a guest "premium" allowance.
const GATED_PUSH: Record<string, string> = { "company-profile": "research", stock: "research", compare: "compare" };
// Google sign-in ships once the web callback is deployed + @capacitor/app is wired.
const GOOGLE_ENABLED = false;

function getAuthToken() {
  return storage.get(AUTH_TOKEN_KEY);
}
function getStoredUser(): AuthUser | null {
  try {
    const raw = storage.get(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
function saveAuth(token: string, refresh: string | undefined, user: AuthUser) {
  storage.set(AUTH_TOKEN_KEY, token);
  if (refresh) storage.set(AUTH_REFRESH_KEY, refresh);
  storage.set(AUTH_USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  [AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, AUTH_USER_KEY].forEach((k) => storage.remove(k));
}

// Authorization header when signed in (guests gated locally, not via the server).
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ---- Guest freemium gate (per-action local counters) ----
function guestUsage(): Record<string, number> {
  try { return JSON.parse(storage.get(GUEST_USAGE_KEY) || "{}") as Record<string, number>; } catch { return {}; }
}
function guestRemaining(action: string): number {
  return Math.max(0, (GUEST_LIMITS[action] ?? 0) - (guestUsage()[action] ?? 0));
}
function bumpGuest(action: string) {
  const u = guestUsage();
  u[action] = (u[action] ?? 0) + 1;
  storage.set(GUEST_USAGE_KEY, JSON.stringify(u));
}
function resetGuestUsage() { storage.remove(GUEST_USAGE_KEY); }

type AuthResult = { ok: boolean; user?: AuthUser; error?: string };

async function authSignup(email: string, password: string, fullName: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.detail === "string" ? data.detail : "Could not create your account." };
    if (data.access_token && data.user) saveAuth(data.access_token, data.refresh_token, data.user);
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

async function authLogin(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.detail === "string" ? data.detail : "Incorrect email or password." };
    if (data.access_token && data.user) saveAuth(data.access_token, data.refresh_token, data.user);
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

// Validate a stored token on launch; returns the fresh user or null if invalid.
async function authMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      const refreshed = await authRefresh();
      return refreshed;
    }
    if (!res.ok) return null;
    const user = (await res.json()) as AuthUser;
    storage.set(AUTH_USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return getStoredUser(); // offline: trust the cached user
  }
}

async function authRefresh(): Promise<AuthUser | null> {
  const refresh = storage.get(AUTH_REFRESH_KEY);
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token && data.user) { saveAuth(data.access_token, data.refresh_token, data.user); return data.user; }
    return null;
  } catch {
    return null;
  }
}

async function authForgotPassword(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/forgot-password`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.detail === "string" ? data.detail : "Could not send the code." };
    return { ok: true };
  } catch { return { ok: false, error: "Network error. Please try again." }; }
}

async function authVerifyOtp(email: string, code: string): Promise<{ ok: boolean; resetToken?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/verify-otp`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.detail === "string" ? data.detail : "Invalid or expired code." };
    return { ok: true, resetToken: data.reset_token };
  } catch { return { ok: false, error: "Network error. Please try again." }; }
}

async function authResetPassword(resetToken: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/auth/reset-password-confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, new_password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data.detail === "string" ? data.detail : "Could not reset your password." };
    return { ok: true };
  } catch { return { ok: false, error: "Network error. Please try again." }; }
}

// Google OAuth: ask the backend for the consent URL (reuses the web callback,
// with state.mobile so the web route bounces tokens back to our app scheme).
const GOOGLE_WEB_CALLBACK = "https://startamarkets.com/api/auth/google/callback";
const APP_OAUTH_SCHEME = "com.mubasher.startamarkets://oauth";
async function authGoogleUrl(): Promise<string | null> {
  try {
    const state = encodeURIComponent(JSON.stringify({ mobile: true, returnTo: APP_OAUTH_SCHEME }));
    const res = await fetch(`${API_BASE}/api/proxy/auth/google/url?redirect_uri=${encodeURIComponent(GOOGLE_WEB_CALLBACK)}&state=${state}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.auth_url === "string" ? data.auth_url : null;
  } catch { return null; }
}

function readWatch(): string[] {
  try {
    const raw = storage.get(WATCH_KEY);
    if (raw == null) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function readLocalPortfolioRows(): Record<string, unknown>[] {
  try {
    const raw = storage.get(LOCAL_PORTFOLIO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

function saveLocalPortfolioRows(rows: Record<string, unknown>[]) {
  storage.set(LOCAL_PORTFOLIO_KEY, JSON.stringify(rows));
}

/** Reactive watchlist bound to localStorage; stays in sync across components via a custom event. */
function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);
  useEffect(() => {
    setSymbols(readWatch());
    const sync = () => setSymbols(readWatch());
    window.addEventListener(WATCH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const has = (symbol: string) => symbols.includes(symbol.toUpperCase());
  const toggle = (symbol: string) => {
    const up = symbol.toUpperCase();
    const next = symbols.includes(up) ? symbols.filter((s) => s !== up) : [up, ...symbols];
    setSymbols(next);
    storage.set(WATCH_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(WATCH_EVENT));
  };
  return { symbols, has, toggle };
}

function MiniChart({ data, color = "var(--c-brand)", height = 74, grid = false, dot = false }: { data: number[]; color?: string; height?: number; grid?: boolean; dot?: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  const width = 260;
  const pad = 8;
  const series = Array.isArray(data) ? data.filter((n) => Number.isFinite(n)) : [];
  if (series.length < 2) {
    // Never draw a placeholder chart. Callers with enough real history render;
    // callers without it should show an empty state or leave the sparkline blank.
    return null;
  }
  const max = Math.max(...series);
  const min = Math.min(...series);
  const points = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * width;
    const y = height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = points.reduce((path, [x, y], i) => `${path}${i ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`, "");
  const last = points[points.length - 1] ?? [0, 0];
  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ "--chart": color, height } as CSSProperties}>
      <defs>
        <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && [0.34, 0.68].map((n) => <line key={n} x1="0" x2={width} y1={height * n} y2={height * n} className={styles.gridLine} />)}
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#fill-${gradientId})`} />
      <path d={d} className={styles.chartLine} />
      {dot && <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="var(--c-surface)" strokeWidth="2" />}
    </svg>
  );
}

function MultiLineChart({ series, colors, height = 116 }: { series: number[][]; colors: string[]; height?: number }) {
  const width = 260;
  const pad = 10;
  const normalized = series
    .map((item) => item.filter((n) => Number.isFinite(n) && n > 0))
    .filter((item) => item.length > 1)
    .map((item) => item.map((value) => (value / item[0]) * 100));
  if (!normalized.length) {
    return null;
  }
  const flat = normalized.flat();
  const max = Math.max(...flat);
  const min = Math.min(...flat);
  const pathFor = (item: number[]) => item.reduce((path, value, index) => {
    const x = (index / Math.max(1, item.length - 1)) * width;
    const y = height - pad - ((value - min) / Math.max(1, max - min)) * (height - pad * 2);
    return `${path}${index ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }, "");
  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height } as CSSProperties}>
      {[0.34, 0.68].map((n) => <line key={n} x1="0" x2={width} y1={height * n} y2={height * n} className={styles.gridLine} />)}
      {normalized.map((item, index) => (
        <path key={index} d={pathFor(item)} fill="none" stroke={colors[index] ?? "var(--c-brand)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

const CHART_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function chartShortDate(d?: string) {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
  return m ? `${CHART_MONTHS[Math.max(0, Math.min(11, +m[2] - 1))]} ${+m[3]}` : "";
}

// Premium real-price line/area chart with a price (Y) axis and date (X) axis —
// drawn from actual OHLC closes so it reads as a genuine chart, not a sparkline.
function PriceLineChart({ bars, fallback, color, height = 188, lang }: { bars: OhlcBar[]; fallback: number[]; color: string; height?: number; lang: Lang }) {
  const hasBars = bars.length > 1;
  const series = (hasBars ? bars.map((b) => b.close) : fallback).filter((n) => Number.isFinite(n) && n > 0);
  if (series.length < 2) return <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا توجد بيانات تاريخية كافية" : "Not enough historical data"}</div>;
  const W = 320;
  const axisW = 42;        // right gutter for price labels
  const padT = 10;
  const padB = 20;         // bottom gutter for date labels
  const plotW = W - axisW;
  const plotH = height - padT - padB;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = Math.max(1e-9, max - min);
  const decimals = max < 10 ? 2 : max < 1000 ? 2 : 1;
  const xAt = (i: number) => (i / (series.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - (v - min) / span) * plotH;
  const line = series.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const area = `${line} L${plotW.toFixed(1)} ${(padT + plotH).toFixed(1)} L0 ${(padT + plotH).toFixed(1)} Z`;
  const gid = `pl-${color.replace(/[^a-z0-9]/gi, "")}`;
  const yLevels = [1, 0.66, 0.33, 0].map((f) => min + span * f);
  const lastX = xAt(series.length - 1);
  const lastY = yAt(series[series.length - 1]);
  const dateIdx = hasBars ? [0, Math.floor((series.length - 1) / 2), series.length - 1] : [];
  return (
    <svg className={styles.priceChart} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* horizontal price gridlines + Y labels */}
      {yLevels.map((lvl, i) => (
        <g key={i}>
          <line x1="0" x2={plotW} y1={yAt(lvl)} y2={yAt(lvl)} className={styles.priceGrid} />
          <text x={W - 4} y={yAt(lvl) + 3} className={styles.priceYLabel} textAnchor="end">{lvl.toFixed(decimals)}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="3.6" fill={color} stroke="var(--c-surface)" strokeWidth="2" />
      {/* X date labels */}
      {dateIdx.map((idx, i) => (
        <text key={i} x={Math.max(14, Math.min(plotW - 14, xAt(idx)))} y={height - 6} className={styles.priceXLabel} textAnchor={i === 0 ? "start" : i === dateIdx.length - 1 ? "end" : "middle"}>{chartShortDate(bars[idx]?.date)}</text>
      ))}
    </svg>
  );
}

const LOGO_ALIASES: Record<string, string> = {
  AIHC: "AIH",
  CCAPP: "CCAP",
  FAITA: "FAIT",
  VLMRA: "VLMR",
};

const KNOWN_MISSING_LOGOS = new Set(["ALRA", "FERC", "GPIM", "NAPR", "PHGC", "SEIGA", "TYCN"]);

function StockLogo({ symbol, className, style }: { symbol: string; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const clean = symbol.toUpperCase().replace(/\.CA$/, "");
  const logoSymbol = LOGO_ALIASES[clean] ?? clean;
  const useFallback = failed || KNOWN_MISSING_LOGOS.has(clean);
  return (
    <span className={cx(styles.stockLogo, className)} style={style}>
      {!useFallback ? <img src={`/logos/${encodeURIComponent(logoSymbol)}.svg`} alt="" onError={() => setFailed(true)} /> : <b>{clean.slice(0, 2)}</b>}
    </span>
  );
}

function CandleChart({ rows, height = 160, lang = "en" }: { rows: OhlcBar[]; height?: number; lang?: Lang }) {
  const width = 320;
  const pad = { top: 14, right: 48, bottom: 22, left: 6 };
  const sorted = rows
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.high) && Number.isFinite(row.low) && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) {
    return null;
  }

  const maxCandles = 58;
  const groupSize = Math.max(1, Math.ceil(sorted.length / maxCandles));
  const candles: OhlcBar[] = [];
  for (let i = 0; i < sorted.length; i += groupSize) {
    const group = sorted.slice(i, i + groupSize);
    candles.push({
      date: group[group.length - 1].date,
      open: group[0].open,
      high: Math.max(...group.map((item) => item.high)),
      low: Math.min(...group.map((item) => item.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, item) => sum + (item.volume || 0), 0),
    });
  }

  const hasVolume = candles.some((item) => item.volume > 0);
  const volumeHeight = hasVolume ? 26 : 0;
  const dividerGap = hasVolume ? 11 : 0;
  const priceBottom = height - pad.bottom - volumeHeight - dividerGap;
  const plotHeight = priceBottom - pad.top;
  const highs = candles.map((item) => item.high);
  const lows = candles.map((item) => item.low);
  let max = Math.max(...highs);
  let min = Math.min(...lows);
  const range = max - min || 1;
  max += range * 0.02;
  min -= range * 0.02;
  const y = (value: number) => pad.top + ((max - value) / (max - min || 1)) * plotHeight;
  const plotWidth = width - pad.left - pad.right;
  const slot = plotWidth / candles.length;
  const candleWidth = Math.max(2, Math.min(7, slot * 0.56));
  const maxVolume = Math.max(1, ...candles.map((item) => item.volume));
  const locale = lang === "ar" ? ARABIC_TEXT_LATIN_NUMBER_LOCALE : NUMBER_LOCALE;
  const dateIndexes = Array.from(new Set([0, Math.floor((candles.length - 1) / 2), candles.length - 1]));
  const axisColor = "var(--c-fg-3)";
  const gridColor = "rgba(148, 163, 184, .17)";
  const upColor = "var(--c-up)";
  const downColor = "var(--c-down)";

  return (
    <svg className={styles.candleChart} viewBox={`0 0 ${width} ${height}`} style={{ height }} aria-hidden="true">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const axisY = pad.top + ratio * plotHeight;
        const value = max - ratio * (max - min);
        return (
          <g key={ratio}>
            <line x1={pad.left} x2={width - pad.right} y1={axisY} y2={axisY} stroke={gridColor} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={width - pad.right + 7} y={axisY + 3.5} fill={axisColor} fontSize="8.5" fontFamily="IBM Plex Mono, ui-monospace, monospace">{value.toFixed(value >= 100 ? 0 : 2)}</text>
          </g>
        );
      })}
      {hasVolume ? <line x1={pad.left} x2={width - pad.right} y1={priceBottom + 7} y2={priceBottom + 7} stroke="rgba(148, 163, 184, .18)" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      {candles.map((item, index) => {
        const x = pad.left + slot * index + slot / 2;
        const rising = item.close >= item.open;
        const bodyTop = Math.min(y(item.open), y(item.close));
        const bodyHeight = Math.max(1.5, Math.abs(y(item.close) - y(item.open)));
        const volumeBarHeight = hasVolume ? (item.volume / maxVolume) * volumeHeight : 0;
        const color = rising ? upColor : downColor;
        const volumeColor = rising ? "color-mix(in srgb, var(--c-up) 32%, transparent)" : "color-mix(in srgb, var(--c-down) 30%, transparent)";
        return (
          <g key={`${item.date}-${index}`}>
            <line x1={x} x2={x} y1={y(item.high)} y2={y(item.low)} stroke={color} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" fill={color} stroke={color} />
            {hasVolume ? <rect x={x - candleWidth / 2} y={height - pad.bottom - volumeBarHeight} width={candleWidth} height={volumeBarHeight} rx="1" fill={volumeColor} /> : null}
          </g>
        );
      })}
      {dateIndexes.map((index) => {
        const x = pad.left + slot * index + slot / 2;
        const anchor = index === 0 ? "start" : index === candles.length - 1 ? "end" : "middle";
        const label = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(candles[index].date));
        return <text key={index} x={x} y={height - 5} textAnchor={anchor} fill={axisColor} fontSize="8.5" fontFamily="IBM Plex Mono, ui-monospace, monospace">{label}</text>;
      })}
    </svg>
  );
}

function LogoMark() {
  return <img src="/assets/starta-mobile/brand/logo-mark.svg" alt="" className={styles.logoMark} />;
}

function AppBar({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.appbar}>
      <div className={styles.appbarTitle}>
        <LogoMark />
        <div>
          <strong>{title}</strong>
          {sub ? <span>{sub}</span> : null}
        </div>
      </div>
      {action ? <div className={styles.roundAction}>{action}</div> : null}
    </div>
  );
}

function PushHeader({ title, sub, action, onBack }: { title: string; sub?: string; action?: React.ReactNode; onBack: () => void }) {
  return (
    <div className={styles.appbar}>
      <div className={styles.pushTitle}>
        <button className={styles.iconButton} onClick={onBack} aria-label="Back">
          <Icon name="chevron-left" />
        </button>
        <div>
          <strong>{title}</strong>
          {sub ? <span>{sub}</span> : null}
        </div>
      </div>
      {action ? <div className={styles.roundAction}>{action}</div> : null}
    </div>
  );
}

function PushTop({ title, sub, onBack, action }: { title: string; sub?: string; onBack?: () => void; action?: React.ReactNode }) {
  return (
    <div className={styles.pushTop}>
      {onBack ? <button className={styles.pushBack} onClick={onBack} aria-label="Back"><Icon name="chevron-left" /></button> : null}
      <div className={styles.pushTtl}><b>{title}</b>{sub ? <span>{sub}</span> : null}</div>
      {action ?? null}
    </div>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className={styles.sectionHead}>
      <span>{title}</span>
      {action ? (
        <button onClick={onAction}>
          {action}
          <Icon name="chevron-right" size={13} />
        </button>
      ) : null}
    </div>
  );
}

function Delta({ value }: { value: number }) {
  return <span className={value >= 0 ? styles.up : styles.down}>{value >= 0 ? "▲" : "▼"} {pct(value)}</span>;
}

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button className={cx(styles.pill, active && styles.pillActive)} onClick={onClick}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, ghost = false }: { children: React.ReactNode; onClick?: () => void; ghost?: boolean }) {
  return (
    <button className={ghost ? styles.ghostButton : styles.primaryButton} onClick={onClick}>
      {children}
    </button>
  );
}

function DataStat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "brand" }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong className={tone === "up" ? styles.up : tone === "down" ? styles.down : tone === "brand" ? styles.brandText : undefined}>{value}</strong>
    </div>
  );
}

const tabs: Array<{ id: TabId; icon: string }> = [
  { id: "home", icon: "home" },
  { id: "markets", icon: "activity" },
  { id: "funds", icon: "landmark" },
  { id: "news", icon: "newspaper" },
  { id: "portfolio", icon: "wallet" },
  { id: "more", icon: "menu" },
];

function TabBar({ active, setActive, lang }: { active: TabId; setActive: (tab: TabId) => void; lang: Lang }) {
  const t = copy[lang];
  return (
    <nav className={styles.tabbar} aria-label={lang === "ar" ? "التنقل الرئيسي" : "Primary"}>
      {tabs.map((tab) => (
        <button key={tab.id} className={cx(styles.tab, active === tab.id && styles.tabOn)} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined} aria-label={t[tab.id]}>
          <Icon name={tab.icon} size={21} strokeWidth={active === tab.id ? 2.4 : 2} />
          <span>{t[tab.id]}</span>
        </button>
      ))}
    </nav>
  );
}

// Animated count-up number (eased, replays whenever it becomes active).
function CountUp({ to, active, decimals = 1, className }: { to: number; active: boolean; decimals?: number; className?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 1300;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to]);
  return <div className={className}>{formatNumber(val, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</div>;
}

const ONB_EASE = [0.22, 1, 0.36, 1] as const;

// Slide 1 — live market: glass quote card with self-drawing chart + drifting ticker chips.
function OnbMarketVisual({ active }: { active: boolean }) {
  const line = "M0,70 L22,58 L44,63 L66,44 L88,50 L110,33 L132,39 L154,21 L176,27 L200,12";
  const area = `${line} L200,90 L0,90 Z`;
  return (
    <div className={styles.onbVisual}>
      <motion.div className={cx(styles.onbGlow, styles.onbGlowBrand)} animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.12, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className={styles.onbCard} initial={{ opacity: 0, y: 26, scale: 0.94 }} animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 26, scale: 0.94 }} transition={{ type: "spring", stiffness: 170, damping: 20 }}>
        <div className={styles.onbCardTop}>
          <span className={styles.onbMono}>EGX 30</span>
        </div>
        <CountUp to={52652.5} active={active} className={styles.onbBig} />
        <div className={styles.onbDelta}>▲ +1,984.80 <span>+3.92%</span></div>
        <svg className={styles.onbChart} viewBox="0 0 200 90" preserveAspectRatio="none">
          <defs>
            <linearGradient id="onbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--c-brand)" stopOpacity="0.34" />
              <stop offset="1" stopColor="var(--c-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={area} fill="url(#onbFill)" initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.9, duration: 0.7 }} />
          <motion.path d={line} fill="none" stroke="var(--c-brand)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} />
        </svg>
      </motion.div>
      <motion.span className={cx(styles.onbChip, styles.onbChipA)} animate={{ y: [0, -11, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>COMI <b className={styles.up}>+1.2%</b></motion.span>
      <motion.span className={cx(styles.onbChip, styles.onbChipB)} animate={{ y: [0, 12, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>SWDY <b className={styles.up}>+2.4%</b></motion.span>
      <motion.span className={cx(styles.onbChip, styles.onbChipC)} animate={{ y: [0, -9, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>HRHO <b className={styles.down}>-0.4%</b></motion.span>
    </div>
  );
}

const ONB_DONUT = (() => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const segs = [
    { w: 30, color: "var(--c-brand)" },
    { w: 24, color: "var(--c-info)" },
    { w: 19, color: "#a78bfa" },
    { w: 15, color: "var(--c-warn)" },
    { w: 12, color: "#f472b6" },
  ];
  let acc = 0;
  const arcs = segs.map((s) => {
    const len = (s.w / 100) * circ;
    const offset = -acc;
    acc += len;
    return { ...s, len, offset };
  });
  return { circ, arcs };
})();

// Slide 2 — funds & portfolio: animated allocation donut + floating legend chips.
function OnbFundsVisual({ active }: { active: boolean }) {
  return (
    <div className={styles.onbVisual}>
      <motion.div className={cx(styles.onbGlow, styles.onbGlowInfo)} animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.1, 1] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className={styles.onbCard} initial={{ opacity: 0, y: 26, scale: 0.94 }} animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 26, scale: 0.94 }} transition={{ type: "spring", stiffness: 170, damping: 20 }}>
        <div className={styles.onbCardTop}>
          <span className={styles.onbMono}>ALLOCATION</span>
          <span className={styles.onbPill}>5 STOCKS</span>
        </div>
        <div className={styles.onbDonutWrap}>
          <motion.svg viewBox="0 0 100 100" className={styles.onbDonut}
            initial={{ rotate: -110, scale: 0.6, opacity: 0 }}
            animate={active ? { rotate: 0, scale: 1, opacity: 1 } : { rotate: -110, scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}>
            <motion.g animate={{ rotate: 360 }} transition={{ duration: 48, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "50px 50px" }}>
              {ONB_DONUT.arcs.map((a, i) => (
                <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={a.color} strokeWidth="12"
                  strokeDasharray={`${a.len} ${ONB_DONUT.circ}`} strokeDashoffset={a.offset}
                  strokeLinecap="butt" transform="rotate(-90 50 50)" />
              ))}
            </motion.g>
          </motion.svg>
          <div className={styles.onbDonutCenter}><b>EGP</b><span>636K</span></div>
        </div>
      </motion.div>
      <motion.span className={cx(styles.onbChip, styles.onbChipA)} animate={{ y: [0, -10, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}><i style={{ background: "var(--c-brand)" }} />COMI 30%</motion.span>
      <motion.span className={cx(styles.onbChip, styles.onbChipB)} animate={{ y: [0, 11, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}><i style={{ background: "var(--c-info)" }} />SWDY 24%</motion.span>
      <motion.span className={cx(styles.onbChip, styles.onbChipC)} animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>+18.4% <b className={styles.up}>YTD</b></motion.span>
    </div>
  );
}

// Slide 3 — AI analyst: pulsing orb with concentric rings, orbiting dot, floating prompts.
function OnbAiVisual({ active }: { active: boolean }) {
  return (
    <div className={styles.onbVisual}>
      <motion.div className={cx(styles.onbGlow, styles.onbGlowBrand)} animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.15, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className={styles.onbRing} animate={active ? { scale: [0.9, 1.9], opacity: [0.5, 0] } : { opacity: 0 }} transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }} />
      ))}
      <motion.div className={styles.onbOrbit} animate={{ rotate: 360 }} transition={{ duration: 11, repeat: Infinity, ease: "linear" }}>
        <span className={styles.onbOrbitDot} />
        <span className={cx(styles.onbOrbitDot, styles.onbOrbitDot2)} />
      </motion.div>
      <motion.div className={styles.onbOrb} initial={{ scale: 0, opacity: 0 }} animate={active ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}><AIGlyph color="#fff" size={42} /></motion.div>
      </motion.div>
      <motion.span className={cx(styles.onbBubble, styles.onbBubbleA)} initial={{ opacity: 0, scale: 0.8 }} animate={active ? { opacity: 1, scale: 1, y: [0, -8, 0] } : { opacity: 0 }} transition={{ opacity: { delay: 0.5 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}>“Analyze COMI”</motion.span>
      <motion.span className={cx(styles.onbBubble, styles.onbBubbleB)} initial={{ opacity: 0, scale: 0.8 }} animate={active ? { opacity: 1, scale: 1, y: [0, 9, 0] } : { opacity: 0 }} transition={{ opacity: { delay: 0.75 }, y: { duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 } }}>“Summarize news”</motion.span>
    </div>
  );
}

function Onboarding({ lang, enter, setLang, onSignIn }: { lang: Lang; enter: () => void; setLang: (lang: Lang) => void; onSignIn?: () => void }) {
  const t = copy[lang];
  const rtl = lang === "ar";
  const [index, setIndex] = useState(0);
  const slides = [
    {
      kind: "market" as const,
      kicker: rtl ? "بيانات السوق" : "MARKET DATA",
      title: rtl ? "السوق المصري لحظة بلحظة" : "The Egyptian market, live.",
      sub: rtl ? "أسعار EGX، واتساع السوق، والأكثر حركة — بيانات مؤسسية." : "EGX prices, market breadth, and top movers — institutional data, instantly.",
    },
    {
      kind: "funds" as const,
      kicker: rtl ? "صناديق ومحافظ" : "FUNDS & PORTFOLIO",
      title: rtl ? "خصّص، تتبّع، وقارن" : "Allocate. Track. Compare.",
      sub: rtl ? "صناديق الاستثمار، وتخصيص المحفظة، ومقاييس المخاطر في مساحة واحدة هادئة." : "Mutual funds, portfolio allocation, and risk metrics in one calm workspace.",
    },
    {
      kind: "ai" as const,
      kicker: rtl ? "محلّل ذكي" : "AI ANALYST",
      title: rtl ? "اسأل، افهم، قرّر" : "Ask. Understand. Decide.",
      sub: rtl ? "محلّل Starta الذكي، وأخبار السوق، وأكاديمية التعلّم — في جيبك." : "Starta's AI analyst, market news, and academy — right in your pocket.",
    },
  ];
  const last = slides.length - 1;
  const go = (i: number) => setIndex(Math.max(0, Math.min(last, i)));
  const onDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const t2 = 55;
    if (info.offset.x < -t2 || info.velocity.x < -380) go(index + 1);
    else if (info.offset.x > t2 || info.velocity.x > 380) go(index - 1);
  };

  return (
    <div className={styles.onb}>
      {/* drifting ambient background orbs */}
      <div className={styles.onbBgWrap} aria-hidden="true">
        <motion.span className={styles.onbBgOrbA} animate={{ x: [0, 30, 0], y: [0, 24, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className={styles.onbBgOrbB} animate={{ x: [0, -26, 0], y: [0, 30, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      {/* top bar */}
      <div className={styles.onbTopBar}>
        <div className={styles.onbBrand}><span className={styles.onbBrandTile}><BrandGlyph /></span><b>STARTA</b></div>
        <div className={styles.onbTopActions}>
          <button className={styles.onbLang} onClick={() => setLang(rtl ? "en" : "ar")}>{rtl ? "EN" : "ع"}</button>
          <button className={styles.onbSkip} onClick={enter}>{rtl ? "تخطّي" : "Skip"}</button>
        </div>
      </div>

      {/* carousel */}
      <div className={styles.onbViewport}>
        <motion.div
          className={styles.onbTrack}
          drag="x"
          dragElastic={0.16}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          animate={{ x: `${-index * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
        >
          {slides.map((s, i) => (
            <div className={styles.onbSlide} key={s.kind}>
              {s.kind === "market" && <OnbMarketVisual active={index === i} />}
              {s.kind === "funds" && <OnbFundsVisual active={index === i} />}
              {s.kind === "ai" && <OnbAiVisual active={index === i} />}
              <div className={styles.onbCopy}>
                <AnimatePresence mode="wait">
                  {index === i && (
                    <motion.div key={s.kind} initial="hide" animate="show" exit="hide" variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}>
                      <motion.span className={styles.onbKicker} variants={{ hide: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { ease: ONB_EASE, duration: 0.5 } } }}>{s.kicker}</motion.span>
                      <motion.h1 variants={{ hide: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { ease: ONB_EASE, duration: 0.55 } } }}>{s.title}</motion.h1>
                      <motion.p variants={{ hide: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { ease: ONB_EASE, duration: 0.55 } } }}>{s.sub}</motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* dots */}
      <div className={styles.onbDots}>
        {slides.map((s, i) => (
          <button key={s.kind} className={cx(styles.onbDot, index === i && styles.onbDotOn)} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>

      {/* CTA */}
      <div className={styles.onbCta}>
        {index < last ? (
          <button className={styles.onbNext} onClick={() => go(index + 1)}>
            <span>{rtl ? "التالي" : "Next"}</span>
            <span className={styles.onbNextIcon} style={rtl ? { transform: "scaleX(-1)" } : undefined}><Icon name="chevron-right" size={18} /></span>
          </button>
        ) : (
          <motion.button className={styles.onbStart} onClick={enter} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: ONB_EASE, duration: 0.4 }}>
            <span className={styles.onbStartShine} />
            {t.createAccount}
          </motion.button>
        )}
        {onSignIn ? (
          <button className={styles.onbSignIn} onClick={onSignIn}>
            {rtl ? "لديك حساب؟ " : "Already have an account? "}<b>{rtl ? "تسجيل الدخول" : "Sign in"}</b>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function StartaMobileApp() {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  // `entered` = past the onboarding/welcome (guest OR signed-in). Signed-in users
  // and anyone who has already onboarded skip the welcome on subsequent launches.
  const [entered, setEntered] = useState<boolean>(() => !!getStoredUser() || storage.get("fh_onboarded") === "1");
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authScreen, setAuthScreen] = useState<null | "signin" | "signup" | "forgot">(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("home");
  const [stack, setStack] = useState<PushScreen[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<string | undefined>();
  const [aiRunId, setAiRunId] = useState(0);
  const [sheet, setSheet] = useState<string | null>(null);
  const [stocks, setStocks] = useState<Stock[]>(EMPTY_STOCKS);
  const [funds, setFunds] = useState<Fund[]>(EMPTY_FUNDS);
  const [news, setNews] = useState<NewsItem[]>(EMPTY_NEWS);
  const [topics, setTopics] = useState<LearnTopic[]>([]);
  const [summary, setSummary] = useState<MarketSummary>({});
  const [egxIndex, setEgxIndex] = useState<EgxIndex>({});
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedLang = (storage.get("starta-lang") || storage.get("lang")) as Lang | null;
    const storedTheme = storage.get(MOBILE_THEME_KEY) as Theme | null;
    if (storedLang === "ar" || storedLang === "en") setLang(storedLang);
    if (storedTheme === "dark" || storedTheme === "light") setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    storage.set("starta-lang", lang);
    storage.set("lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Bridge to Tailwind's `.dark` class so the shared web AI renderer
    // (WorldClassMessage + cards) matches the mobile light/dark theme.
    document.documentElement.classList.toggle("dark", theme === "dark");
    storage.set(MOBILE_THEME_KEY, theme);
  }, [theme]);

  // Default the native app to portrait. Info.plist permits landscape only so the
  // fullscreen Advanced Chart can rotate; lock portrait at launch so every other
  // screen stays upright regardless of how the device is held on cold start.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const so = (window as unknown as {
      Capacitor?: { Plugins?: { ScreenOrientation?: { lock?: (o: { orientation: string }) => Promise<unknown> } } };
    }).Capacitor?.Plugins?.ScreenOrientation;
    void so?.lock?.({ orientation: "portrait" })?.catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [tickersRaw, summaryRaw] = await Promise.all([
        getJson<Record<string, unknown>[]>("/api/v1/egx/stocks?limit=300", { ttl: 60_000 }),
        getJson<MarketSummary>("/api/v1/market-summary", { ttl: 15_000, fresh: true }),
      ]);
      if (!alive) return;
      const nextStocks = Array.isArray(tickersRaw) && tickersRaw.length ? tickersRaw.map(normalizeStock).filter((s) => s.symbol) : EMPTY_STOCKS;
      setStocks(nextStocks);
      setSummary(summaryRaw ?? {});
      setLoading(false);

      // Background pass: non-market sections and charts fill in without blocking the first market render.
      void getJson<EgxIndex>("/api/v1/egx30/index", { ttl: 60_000 }).then((nextIndex) => {
        if (alive && nextIndex) setEgxIndex(nextIndex);
      });
      const stockSparkPromise = loadSparklines(nextStocks.map((s) => s.symbol).slice(0, 180), "1m");
      const [fundsRaw, newsRaw, portfolioRaw, learnRaw] = await Promise.all([
        getJson<Record<string, unknown>[]>("/api/v1/funds?market=EGX", { ttl: 300_000 }),
        getJson<Record<string, unknown>[]>(`/api/v1/news?source_country=EG&days=0&limit=120&language=${lang}`, { ttl: 60_000 }),
        getJson<{ positions?: Record<string, unknown>[]; total_value?: number }>("/api/v1/portfolio/demo", { ttl: 60_000 }),
        fetch("/data/learn-topics.js", { cache: "force-cache" }).then((res) => (res.ok ? res.text() : "")).catch(() => ""),
      ]);
      if (!alive) return;
      const nextFunds = Array.isArray(fundsRaw) && fundsRaw.length ? fundsRaw.map(normalizeFund).filter((fund) => fund.id && fund.name.trim()) : EMPTY_FUNDS;
      const nextNews = Array.isArray(newsRaw) && newsRaw.length ? newsRaw.filter((row) => typeof row.headline === "string" && row.headline.trim()).map((row) => normalizeNews(row, lang)) : EMPTY_NEWS;
      let nextTopics: LearnTopic[] = [];
      if (learnRaw) {
        try {
          const holder: { STARTA_LEARN_TOPICS?: LearnTopic[] } = {};
          nextTopics = new Function("window", `${learnRaw}; return window.STARTA_LEARN_TOPICS || [];`)(holder) as LearnTopic[];
        } catch {
          nextTopics = [];
        }
      }
      setFunds(nextFunds);
      setNews(nextNews);
      setTopics(nextTopics);
      const localPortfolioRows = readLocalPortfolioRows();
      setPortfolio(buildPortfolio(localPortfolioRows.length ? localPortfolioRows : (portfolioRaw?.positions ?? []), nextStocks));
      const spark = await stockSparkPromise;
      if (!alive) return;
      if (Object.keys(spark).length) {
        setStocks((prev) => prev.map((s) => (spark[s.symbol]?.length ? { ...s, trend: spark[s.symbol] } : s)));
      }
      const fundSpark = await loadFundSparklines(nextFunds.map((f) => f.id), "1y");
      if (!alive) return;
      if (Object.keys(fundSpark).length) {
        setFunds((prev) => prev.map((f) => (fundSpark[f.id]?.length ? { ...f, trend: fundSpark[f.id] } : f)));
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [lang]);

  const handleBack = () => {
    if (aiOpen) {
      setAiOpen(false);
      setAiSeed(undefined);
      return true;
    }
    if (sheet) {
      setSheet(null);
      return true;
    }
    if (stack.length) {
      setStack((items) => items.slice(0, -1));
      return true;
    }
    if (tab !== "home") {
      setTab("home");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && handleBack()) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiOpen, sheet, stack.length, tab]);

  useEffect(() => {
    const appPlugin = (window as unknown as {
      Capacitor?: { Plugins?: { App?: { addListener?: (event: string, cb: () => void) => { remove?: () => void } | Promise<{ remove?: () => void }> } } };
    }).Capacitor?.Plugins?.App;
    if (!appPlugin?.addListener) return;
    let listener: { remove?: () => void } | undefined;
    const result = appPlugin.addListener("backButton", () => handleBack());
    if (result && typeof (result as Promise<{ remove?: () => void }>).then === "function") {
      void (result as Promise<{ remove?: () => void }>).then((next) => { listener = next; });
    } else {
      listener = result as { remove?: () => void };
    }
    return () => listener?.remove?.();
  }, [aiOpen, sheet, stack.length, tab]);

  // Validate any stored token on launch; refresh if the access token expired.
  useEffect(() => {
    if (!getAuthToken()) return;
    let alive = true;
    authMe().then((u) => {
      if (!alive) return;
      if (u) setUser(u);
      else { clearAuth(); setUser(null); }
    });
    return () => { alive = false; };
  }, []);

  const handleAuthed = (u: AuthUser) => {
    setUser(u);
    setAuthScreen(null);
    setRegisterOpen(false);
    resetGuestUsage();
  };
  const logout = () => {
    clearAuth();
    resetGuestUsage();
    setUser(null);
  };

  // Google sign-in: open the consent page in the system/in-app browser. The web
  // callback bounces tokens back to the app via the com.mubasher.startamarkets:// scheme.
  const startGoogle = async (): Promise<boolean> => {
    const url = await authGoogleUrl();
    if (!url) return false;
    // Open consent in the system browser. Capacitor routes window.open("_system")
    // to the native browser; the deep-link redirect (custom scheme) returns to the app.
    try { window.open(url, "_system"); } catch { window.open(url, "_blank"); }
    return true;
  };

  // Deep-link handler: capture tokens from the Google OAuth redirect.
  useEffect(() => {
    const consumeOAuth = (rawUrl: string) => {
      try {
        if (!/google_auth=success/.test(rawUrl)) return;
        const params = new URLSearchParams(rawUrl.split("?")[1] || "");
        const token = params.get("token");
        const refresh = params.get("refresh_token") || undefined;
        const userJson = params.get("user");
        if (token && userJson) {
          const u = JSON.parse(decodeURIComponent(userJson)) as AuthUser;
          saveAuth(token, refresh, u);
          handleAuthed(u);
        }
      } catch { /* ignore malformed deep link */ }
    };
    const appPlugin = (window as unknown as {
      Capacitor?: { Plugins?: { App?: { addListener?: (event: string, cb: (data: { url?: string }) => void) => { remove?: () => void } | Promise<{ remove?: () => void }> } } };
    }).Capacitor?.Plugins?.App;
    let listener: { remove?: () => void } | undefined;
    const result = appPlugin?.addListener?.("appUrlOpen", (data) => { if (data?.url) consumeOAuth(data.url); });
    if (result && typeof (result as Promise<{ remove?: () => void }>).then === "function") {
      void (result as Promise<{ remove?: () => void }>).then((l) => { listener = l; });
    } else if (result) {
      listener = result as { remove?: () => void };
    }
    if (typeof window !== "undefined") consumeOAuth(window.location.href);
    return () => listener?.remove?.();
  }, []);

  const nav = useMemo(() => ({
    push: (name: PushName, props?: Record<string, unknown>) => {
      // Guest freemium gate: a few free opens of premium surfaces, then register.
      if (!user) {
        const action = GATED_PUSH[name];
        if (action) {
          if (guestRemaining(action) <= 0) { setRegisterOpen(true); return; }
          bumpGuest(action);
        }
      }
      setStack((items) => [...items, { name, props }]);
    },
    pop: () => setStack((items) => items.slice(0, -1)),
    setTab: (id: TabId) => {
      setStack([]);
      setTab(id);
    },
    openAI: (seed?: string) => {
      setAiSeed(seed);
      setAiRunId((id) => id + 1);
      setAiOpen(true);
    },
    openStock: (symbol: string) => setSheet(symbol),
    back: handleBack,
  }), [aiOpen, sheet, stack.length, tab, user]);

  const current = stack[stack.length - 1];
  const t = copy[lang];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const content = document.querySelector(`.${styles.device} .${styles.content}`) as HTMLElement | null;
      content?.scrollTo({ top: 0, left: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, current?.name, stack.length, lang, theme]);

  return (
    <main className={styles.stage} data-theme={theme} dir={lang === "ar" ? "rtl" : "ltr"} data-lenis-prevent="true">
      <section className={styles.device} aria-label="Starta Markets mobile app">
        {!entered ? (
          <Onboarding lang={lang} setLang={setLang} enter={() => { storage.set("fh_onboarded", "1"); setEntered(true); }} onSignIn={() => { storage.set("fh_onboarded", "1"); setEntered(true); setAuthScreen("signin"); }} />
        ) : (
          <>
            <div className={styles.screen}>
              {current ? (
                <div key={`${current.name}-${stack.length}`} className={styles.screenMotion}>
                  <PushRouter screen={current} nav={nav} lang={lang} theme={theme} setTheme={setTheme} setLang={setLang} stocks={stocks} funds={funds} news={news} topics={topics} portfolio={portfolio} summary={summary} egxIndex={egxIndex} user={user} onAuth={setAuthScreen} logout={logout} />
                </div>
              ) : (
                <div key={tab} className={styles.screenMotion}>
                  {tab === "home" && <HomeScreen nav={nav} lang={lang} summary={summary} egxIndex={egxIndex} stocks={stocks} funds={funds} news={news} portfolio={portfolio} />}
                  {tab === "markets" && <MarketsScreen nav={nav} lang={lang} summary={summary} egxIndex={egxIndex} stocks={stocks} news={news} />}
                  {tab === "news" && <NewsScreen nav={nav} lang={lang} news={news} />}
                  {tab === "funds" && <FundsScreen nav={nav} lang={lang} funds={funds} />}
                  {tab === "portfolio" && <PortfolioScreen lang={lang} nav={nav} portfolio={portfolio} stocks={stocks} onPortfolioChange={setPortfolio} />}
                  {tab === "more" && <MoreScreen nav={nav} lang={lang} theme={theme} setTheme={setTheme} setLang={setLang} user={user} onAuth={setAuthScreen} logout={logout} />}
                </div>
              )}
            </div>
            {(current || (tab !== "home" && tab !== "markets" && tab !== "portfolio")) && current?.name !== "subscription" ? (
              <button className={cx(styles.aiFab, current && styles.aiFabPushed)} onClick={() => nav.openAI()} aria-label={t.askAi}>
                <AIGlyph color="#fff" size={21} />
              </button>
            ) : null}
            <TabBar active={tab} setActive={nav.setTab} lang={lang} />
            <StockSheet symbol={sheet} stocks={stocks} lang={lang} nav={nav} onClose={() => setSheet(null)} />
            <AIOverlay open={aiOpen} seed={aiSeed} runId={aiRunId} onClose={() => { setAiOpen(false); setAiSeed(undefined); }} lang={lang} stocks={stocks} funds={funds} news={news} summary={summary} isAuthed={!!user} onGuestLimit={() => { setAiOpen(false); setRegisterOpen(true); }} />
            <RegisterPopup open={registerOpen} lang={lang} onClose={() => setRegisterOpen(false)} onSignup={() => { setRegisterOpen(false); setAuthScreen("signup"); }} onSignin={() => { setRegisterOpen(false); setAuthScreen("signin"); }} />
            <AuthFlow screen={authScreen} lang={lang} onClose={() => setAuthScreen(null)} onAuthed={handleAuthed} setScreen={setAuthScreen} startGoogle={startGoogle} />
          </>
        )}
      </section>
    </main>
  );
}

function buildPortfolio(rows: Record<string, unknown>[], stocks: Stock[]): PortfolioPosition[] {
  const raw = rows;
  const total = raw.reduce((sum, row) => sum + toNumber(row.value ?? row.market_value), 0) || 1;
  return raw.map((row, i) => {
    const symbol = String(row.symbol ?? "").toUpperCase();
    const stock = stocks.find((item) => item.symbol === symbol);
    const value = toNumber(row.value ?? row.market_value) || (toNumber(row.quantity ?? row.shares) * (stock?.price ?? 0));
    const qty = toNumber(row.quantity ?? row.shares);
    const avg = toNumber(row.avg_price ?? row.average_price ?? row.avg);
    const price = stock?.price ?? (qty ? value / qty : 0);
    return {
      symbol,
      name: stock?.name ?? symbol,
      quantity: qty,
      value,
      price,
      dayPct: stock?.changePct ?? 0,
      plPct: avg ? ((price - avg) / avg) * 100 : stock?.changePct ?? 0,
      weight: (value / total) * 100,
      color: HOLDING_COLORS[i % HOLDING_COLORS.length],
      avgPrice: avg || undefined,
      sector: stock?.sector,
    };
  });
}

const DEMO_PORTFOLIO_CASH = 85_420.5;
const DEMO_PORTFOLIO_SPEC = [
  { symbol: "COMI", quantity: 1250, avgPrice: 82.25 },
  { symbol: "SWDY", quantity: 1800, avgPrice: 24.15 },
  { symbol: "TMGH", quantity: 1100, avgPrice: 43.75 },
  { symbol: "HRHO", quantity: 2001, avgPrice: 15.2 },
  { symbol: "EAST", quantity: 1700, avgPrice: 23.1 },
];

function buildDemoPortfolio(stocks: Stock[]): PortfolioPosition[] {
  const rows: PortfolioPosition[] = [];
  DEMO_PORTFOLIO_SPEC.forEach((item, index) => {
    const stock = stocks.find((candidate) => candidate.symbol === item.symbol);
    if (!stock) return;
    const value = item.quantity * stock.price;
    rows.push({
      symbol: stock.symbol,
      name: stock.name,
      quantity: item.quantity,
      value,
      price: stock.price,
      dayPct: stock.changePct,
      plPct: item.avgPrice ? ((stock.price - item.avgPrice) / item.avgPrice) * 100 : stock.changePct,
      weight: 0,
      color: HOLDING_COLORS[index % HOLDING_COLORS.length],
      avgPrice: item.avgPrice,
      sector: stock.sector,
    });
  });
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  return rows.map((item) => ({ ...item, weight: (item.value / total) * 100 }));
}

function BrandGlyph() {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M72 46C72 36 61 31 50 32C38 33 33 41 36 49C38 55 47 58 56 61C67 64 73 70 70 79C67 88 53 90 42 86" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 46L86 32" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
      <path d="M99 19L79 25L93 39Z" fill="#fff" />
    </svg>
  );
}

// ===================== Auth UI (sign in / sign up / forgot / register popup) ====
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.7 35.3 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function GoogleButton({ lang, startGoogle }: { lang: Lang; startGoogle: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={styles.authGoogle} disabled={busy} onClick={async () => { setBusy(true); await startGoogle(); setBusy(false); }}>
      <GoogleGlyph /> {busy ? (lang === "ar" ? "جارٍ الفتح…" : "Opening…") : (lang === "ar" ? "المتابعة عبر Google" : "Continue with Google")}
    </button>
  );
}

function AuthField({ label, type, value, onChange, placeholder, autoComplete, inputMode, maxLength }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; inputMode?: "text" | "email" | "numeric"; maxLength?: number }) {
  return (
    <label className={styles.authField}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} maxLength={maxLength} />
    </label>
  );
}

function SignInForm({ lang, onAuthed, setScreen, startGoogle }: { lang: Lang; onAuthed: (u: AuthUser) => void; setScreen: (s: "signin" | "signup" | "forgot") => void; startGoogle: () => Promise<boolean> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError(lang === "ar" ? "أدخل البريد وكلمة المرور." : "Enter your email and password."); return; }
    setLoading(true); setError("");
    const r = await authLogin(email, password);
    setLoading(false);
    if (r.ok && r.user) onAuthed(r.user); else setError(r.error || (lang === "ar" ? "تعذّر تسجيل الدخول." : "Sign in failed."));
  };
  return (
    <form className={styles.authForm} onSubmit={submit}>
      <h1 className={styles.authTitle}>{lang === "ar" ? "مرحباً بعودتك" : "Welcome back"}</h1>
      <p className={styles.authSub}>{lang === "ar" ? "سجّل الدخول للوصول الكامل إلى Starta." : "Sign in for full access to Starta."}</p>
      {GOOGLE_ENABLED ? (<>
        <GoogleButton lang={lang} startGoogle={startGoogle} />
        <div className={styles.authDivider}><span>{lang === "ar" ? "أو" : "or"}</span></div>
      </>) : null}
      <AuthField label={lang === "ar" ? "البريد الإلكتروني" : "Email"} type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" />
      <AuthField label={lang === "ar" ? "كلمة المرور" : "Password"} type="password" autoComplete="current-password" value={password} onChange={setPassword} placeholder="••••••••" />
      <button type="button" className={styles.authForgot} onClick={() => setScreen("forgot")}>{lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}</button>
      {error ? <div className={styles.authError}>{error}</div> : null}
      <button type="submit" className={styles.authSubmit} disabled={loading}>{loading ? (lang === "ar" ? "جارٍ تسجيل الدخول…" : "Signing in…") : (lang === "ar" ? "تسجيل الدخول" : "Sign in")}</button>
      <p className={styles.authSwitch}>{lang === "ar" ? "ليس لديك حساب؟ " : "New to Starta? "}<button type="button" onClick={() => setScreen("signup")}>{lang === "ar" ? "أنشئ حساباً" : "Create account"}</button></p>
    </form>
  );
}

function SignUpForm({ lang, onAuthed, setScreen, startGoogle }: { lang: Lang; onAuthed: (u: AuthUser) => void; setScreen: (s: "signin" | "signup" | "forgot") => void; startGoogle: () => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(lang === "ar" ? "أدخل اسمك." : "Enter your full name."); return; }
    if (!email.trim()) { setError(lang === "ar" ? "أدخل بريدك الإلكتروني." : "Enter your email."); return; }
    if (password.length < 6) { setError(lang === "ar" ? "كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError(lang === "ar" ? "كلمتا المرور غير متطابقتين." : "Passwords don't match."); return; }
    setLoading(true); setError("");
    const r = await authSignup(email, password, name);
    setLoading(false);
    if (r.ok && r.user) onAuthed(r.user); else setError(r.error || (lang === "ar" ? "تعذّر إنشاء الحساب." : "Sign up failed."));
  };
  return (
    <form className={styles.authForm} onSubmit={submit}>
      <h1 className={styles.authTitle}>{lang === "ar" ? "أنشئ حسابك المجاني" : "Create your free account"}</h1>
      <p className={styles.authSub}>{lang === "ar" ? "ذكاء سوقي غير محدود في دقيقة." : "Unlimited market intelligence in under a minute."}</p>
      {GOOGLE_ENABLED ? (<>
        <GoogleButton lang={lang} startGoogle={startGoogle} />
        <div className={styles.authDivider}><span>{lang === "ar" ? "أو" : "or"}</span></div>
      </>) : null}
      <AuthField label={lang === "ar" ? "الاسم الكامل" : "Full name"} type="text" autoComplete="name" value={name} onChange={setName} placeholder={lang === "ar" ? "محمد بهيدي" : "Mohamed Bhidy"} />
      <AuthField label={lang === "ar" ? "البريد الإلكتروني" : "Email"} type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" />
      <AuthField label={lang === "ar" ? "كلمة المرور" : "Password"} type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder={lang === "ar" ? "6 أحرف على الأقل" : "At least 6 characters"} />
      <AuthField label={lang === "ar" ? "تأكيد كلمة المرور" : "Confirm password"} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
      {error ? <div className={styles.authError}>{error}</div> : null}
      <button type="submit" className={styles.authSubmit} disabled={loading}>{loading ? (lang === "ar" ? "جارٍ الإنشاء…" : "Creating…") : (lang === "ar" ? "إنشاء حساب" : "Create account")}</button>
      <p className={styles.authSwitch}>{lang === "ar" ? "لديك حساب؟ " : "Already have an account? "}<button type="button" onClick={() => setScreen("signin")}>{lang === "ar" ? "تسجيل الدخول" : "Sign in"}</button></p>
    </form>
  );
}

function ForgotForm({ lang, setScreen, onAuthed }: { lang: Lang; setScreen: (s: "signin" | "signup" | "forgot") => void; onAuthed: (u: AuthUser) => void }) {
  const [step, setStep] = useState<"email" | "otp" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(lang === "ar" ? "أدخل بريدك." : "Enter your email."); return; }
    setLoading(true); setError("");
    const r = await authForgotPassword(email);
    setLoading(false);
    if (r.ok) setStep("otp"); else setError(r.error || "");
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) { setError(lang === "ar" ? "أدخل الرمز المرسل." : "Enter the code we emailed you."); return; }
    setLoading(true); setError("");
    const r = await authVerifyOtp(email, code);
    setLoading(false);
    if (r.ok && r.resetToken) { setResetToken(r.resetToken); setStep("reset"); } else setError(r.error || "");
  };
  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError(lang === "ar" ? "كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const r = await authResetPassword(resetToken, newPassword);
    if (!r.ok) { setLoading(false); setError(r.error || ""); return; }
    // auto sign in with the new password
    const li = await authLogin(email, newPassword);
    setLoading(false);
    if (li.ok && li.user) onAuthed(li.user); else setStep("done");
  };
  return (
    <div className={styles.authForm}>
      <h1 className={styles.authTitle}>{lang === "ar" ? "إعادة تعيين كلمة المرور" : "Reset your password"}</h1>
      {step === "email" && (
        <form onSubmit={sendCode}>
          <p className={styles.authSub}>{lang === "ar" ? "سنرسل رمز تحقق إلى بريدك." : "We'll email you a verification code."}</p>
          <AuthField label={lang === "ar" ? "البريد الإلكتروني" : "Email"} type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} placeholder="you@email.com" />
          {error ? <div className={styles.authError}>{error}</div> : null}
          <button type="submit" className={styles.authSubmit} disabled={loading}>{loading ? (lang === "ar" ? "جارٍ الإرسال…" : "Sending…") : (lang === "ar" ? "إرسال الرمز" : "Send code")}</button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={verify}>
          <p className={styles.authSub}>{lang === "ar" ? `أدخل الرمز المرسل إلى ${email}` : `Enter the code sent to ${email}`}</p>
          <AuthField label={lang === "ar" ? "رمز التحقق" : "Verification code"} type="text" inputMode="numeric" maxLength={6} value={code} onChange={setCode} placeholder="••••••" />
          {error ? <div className={styles.authError}>{error}</div> : null}
          <button type="submit" className={styles.authSubmit} disabled={loading}>{loading ? (lang === "ar" ? "جارٍ التحقق…" : "Verifying…") : (lang === "ar" ? "تحقّق" : "Verify")}</button>
        </form>
      )}
      {step === "reset" && (
        <form onSubmit={reset}>
          <p className={styles.authSub}>{lang === "ar" ? "اختر كلمة مرور جديدة." : "Choose a new password."}</p>
          <AuthField label={lang === "ar" ? "كلمة المرور الجديدة" : "New password"} type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} placeholder={lang === "ar" ? "6 أحرف على الأقل" : "At least 6 characters"} />
          {error ? <div className={styles.authError}>{error}</div> : null}
          <button type="submit" className={styles.authSubmit} disabled={loading}>{loading ? (lang === "ar" ? "جارٍ الحفظ…" : "Saving…") : (lang === "ar" ? "تعيين كلمة المرور" : "Set new password")}</button>
        </form>
      )}
      {step === "done" && (
        <>
          <p className={styles.authSub}>{lang === "ar" ? "تم تحديث كلمة المرور. سجّل الدخول الآن." : "Password updated. You can sign in now."}</p>
          <button className={styles.authSubmit} onClick={() => setScreen("signin")}>{lang === "ar" ? "تسجيل الدخول" : "Sign in"}</button>
        </>
      )}
      <p className={styles.authSwitch}><button type="button" onClick={() => setScreen("signin")}>{lang === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in"}</button></p>
    </div>
  );
}

function AuthFlow({ screen, lang, onClose, onAuthed, setScreen, startGoogle }: { screen: null | "signin" | "signup" | "forgot"; lang: Lang; onClose: () => void; onAuthed: (u: AuthUser) => void; setScreen: (s: null | "signin" | "signup" | "forgot") => void; startGoogle: () => Promise<boolean> }) {
  const go = (s: "signin" | "signup" | "forgot") => setScreen(s);
  return (
    <AnimatePresence>
      {screen ? (
        <motion.div className={styles.authWrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className={styles.authScrim} onClick={onClose} />
          <motion.div className={styles.authPanel} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}>
            <div className={styles.authHead}>
              <span className={styles.authBrandTile}><BrandGlyph /></span>
              <button className={styles.authClose} onClick={onClose} aria-label={lang === "ar" ? "إغلاق" : "Close"}><Icon name="x" size={18} /></button>
            </div>
            {screen === "signin" && <SignInForm lang={lang} onAuthed={onAuthed} setScreen={go} startGoogle={startGoogle} />}
            {screen === "signup" && <SignUpForm lang={lang} onAuthed={onAuthed} setScreen={go} startGoogle={startGoogle} />}
            {screen === "forgot" && <ForgotForm lang={lang} setScreen={go} onAuthed={onAuthed} />}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function RegisterPopup({ open, lang, onClose, onSignup, onSignin }: { open: boolean; lang: Lang; onClose: () => void; onSignup: () => void; onSignin: () => void }) {
  const benefits = lang === "ar"
    ? ["محادثات Starta AI بلا حدود", "بحث كامل: قوائم مالية وملكية", "تنبيهات ومقارنة صناديق متقدمة"]
    : ["Unlimited Starta AI conversations", "Full research: financials & ownership", "Advanced alerts & fund comparison"];
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.regWrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className={styles.regScrim} onClick={onClose} />
          <motion.div className={styles.regCard} initial={{ y: 24, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}>
            <span className={styles.regGlow} aria-hidden="true" />
            <div className={styles.regIcon}><AIGlyph color="#fff" size={26} /></div>
            <h2 className={styles.regTitle}>{lang === "ar" ? "أنشئ حسابك المجاني" : "Create your free account"}</h2>
            <p className={styles.regSub}>{lang === "ar" ? "لقد استخدمت محاولاتك المجانية. سجّل للوصول غير المحدود." : "You've used your free tries. Register for unlimited access."}</p>
            <ul className={styles.regBenefits}>
              {benefits.map((b) => <li key={b}><span className={styles.regCheck}><Icon name="check" size={13} /></span>{b}</li>)}
            </ul>
            <button className={styles.regPrimary} onClick={onSignup}>{lang === "ar" ? "إنشاء حساب مجاني" : "Register for free"}</button>
            <button className={styles.regSecondary} onClick={onSignin}>{lang === "ar" ? "لديك حساب؟ تسجيل الدخول" : "Already have an account? Sign in"}</button>
            <button className={styles.regLater} onClick={onClose}>{lang === "ar" ? "ليس الآن" : "Maybe later"}</button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MarketTopBar({ lang, nav, title, sub, actions }: { lang: Lang; nav: NavController; title: string; sub: string; actions?: React.ReactNode }) {
  return (
    <div className={styles.appTop}>
      <div className={styles.brandWrap}>
        <div className={styles.logoTile}><BrandGlyph /></div>
        <div className={styles.brandTtl}><b>{title}</b><span>{sub}</span></div>
      </div>
      <div className={styles.iconBtnRow}>
        {actions ?? (
          <>
            <button className={styles.iconBtn2} aria-label={lang === "ar" ? "بحث" : "Search"} onClick={() => nav.push("search")}><Icon name="search" size={20} /></button>
            <button className={styles.iconBtn2} aria-label={lang === "ar" ? "تنبيهات" : "Alerts"} onClick={() => nav.push("alerts")}><Icon name="bell" size={20} /></button>
          </>
        )}
      </div>
    </div>
  );
}

function TickerTape({ stocks, onPick }: { stocks: Stock[]; onPick: (symbol: string) => void }) {
  const tape = useMemo(() => {
    // Prefer stocks with a live price; fall back to any symbol with a non-negative price
    const withPrice = [...stocks].filter((s) => s.symbol && s.price > 0);
    const source = withPrice.length >= 2 ? withPrice : stocks.filter((s) => s.symbol && s.price >= 0);
    return source.sort((a, b) => b.volume - a.volume).slice(0, 16);
  }, [stocks]);
  if (tape.length < 2) return null;
  // Render the run twice so the CSS marquee loops seamlessly at translateX(-50%).
  const run = [...tape, ...tape];
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {run.map((stock, i) => {
          const up = stock.changePct >= 0;
          return (
            <button key={`${stock.symbol}-${i}`} className={styles.tickerItem} onClick={() => onPick(stock.symbol)} tabIndex={-1}>
              <b>{stock.symbol}</b>
              <span className={styles.tp}>{stock.price.toFixed(2)}</span>
              <span className={cx(styles.tc, up ? styles.up : styles.down)}>{up ? "▲" : "▼"} {pct(stock.changePct)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const INDEX_TF: Array<[string, number]> = [["1W", 7], ["1M", 22], ["3M", 66], ["1Y", 260], ["MAX", 100000]];

function IndexHero({ lang, egxIndex, summary }: { lang: Lang; egxIndex: EgxIndex; summary: MarketSummary }) {
  const [tf, setTf] = useState("3M");
  const full = useMemo(() => (egxIndex.history ?? []).map((p) => toNumber(p.close)).filter((n) => n > 0), [egxIndex]);
  const span = INDEX_TF.find(([k]) => k === tf)?.[1] ?? 66;
  const data = full.slice(-span);
  const value = toNumber(egxIndex.quote?.value, toNumber(summary.index_value));
  const change = toNumber(egxIndex.quote?.change);
  const changePct = toNumber(egxIndex.quote?.changePercent, toNumber(summary.index_change_percent));
  const up = changePct >= 0;
  // The headline delta reflects the SELECTED chart range (so the number and the
  // chart always agree); today's daily move is shown as a separate sub-line.
  const periodReturn = data.length > 1 && data[0] ? ((data[data.length - 1] - data[0]) / data[0]) * 100 : changePct;
  const periodAbs = data.length > 1 ? Math.abs(data[data.length - 1] - data[0]) : Math.abs(change);
  const periodUp = periodReturn >= 0;
  return (
    <div className={styles.heroCard}>
      <div className={styles.heroTopRow}>
        <div className={styles.lblMono}>{lang === "ar" ? "مؤشر EGX 30" : "EGX 30 Index"}</div>
        <span className={styles.liveTag}><i />{lang === "ar" ? "مباشر" : "LIVE"}</span>
      </div>
      <div className={styles.bigNum}>{formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
      <div className={cx(styles.deltaRow, periodUp ? styles.up : styles.down)}>
        {periodUp ? "▲" : "▼"} {periodAbs.toFixed(2)} <span className={periodUp ? styles.up : styles.down}>{pct(periodReturn)}</span>
        <span className={styles.deltaChip}>{tf}</span>
      </div>
      <div className={styles.lblMono} style={{ marginTop: 2 }}>{lang === "ar" ? "اليوم" : "Today"} {pct(changePct)}</div>
      <div className={cx(styles.chartFull, styles.indexChartFull)}>
        {data.length > 1
          ? <MiniChart data={data} color={up ? "var(--c-brand)" : "var(--c-down)"} height={166} dot />
          : <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا توجد بيانات تاريخية كافية" : "Not enough historical data"}</div>}
      </div>
      <div className={styles.tfBar}>{INDEX_TF.map(([k]) => <button key={k} className={tf === k ? styles.on : undefined} onClick={() => setTf(k)}>{k}</button>)}</div>
    </div>
  );
}

function MarketScope({ lang, summary }: { lang: Lang; summary: MarketSummary }) {
  const adv = toNumber(summary.advancing);
  const dec = toNumber(summary.declining);
  const total = adv + dec || 1;
  const open = summary.market_status === "OPEN";
  return (
    <>
      <div className={styles.secHead}>
        <h2>{lang === "ar" ? "نطاق السوق" : "Market Scope"}</h2>
        <span className={styles.lblMono}>{open ? (lang === "ar" ? "مفتوح" : "Open") : (lang === "ar" ? "مغلق" : "Closed")}</span>
      </div>
      <div className={styles.gridTwo}>
        <div className={cx(styles.statTile, styles.wide)}>
          <div className={styles.breadthHead}>
            <span className={styles.lblMono}>{lang === "ar" ? "اتساع السوق" : "Market Breadth"}</span>
            <b><span className={styles.up}>{adv}</span> <span style={{ color: "var(--c-fg-3)" }}>/</span> <span className={styles.down}>{dec}</span></b>
          </div>
          <div className={styles.breadthBar}><i style={{ width: `${((adv / total) * 100).toFixed(0)}%` }} /></div>
        </div>
        <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "التداول" : "Volume"}</div><div className={styles.tval}>{compact(toNumber(summary.total_volume), lang)}</div></div>
        <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "قيمة التداول" : "Turnover"}</div><div className={styles.tval}>{compact(toNumber(summary.total_turnover), lang)}</div></div>
        <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "قمم جديدة" : "New Highs"}</div><div className={cx(styles.tval, styles.up)}>{toNumber(summary.new_highs)}</div></div>
        <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "قيعان جديدة" : "New Lows"}</div><div className={cx(styles.tval, styles.down)}>{toNumber(summary.new_lows)}</div></div>
      </div>
    </>
  );
}

function MoverRow({ stock, lang, onClick }: { stock: Stock; lang: Lang; onClick: () => void }) {
  const up = stock.changePct >= 0;
  return (
    <button className={styles.listRow} onClick={onClick}>
      <StockLogo symbol={stock.symbol} className={styles.rowSym} />
      <div className={styles.rowWho}><b>{stock.symbol}</b><span>{stockLabel(stock, lang)}</span></div>
      <div className={styles.rowSpark}><MiniChart data={stock.trend} color={up ? "var(--c-up)" : "var(--c-down)"} height={30} /></div>
      <div className={styles.rowPx}><b>{stock.price.toFixed(2)}</b><span className={up ? styles.up : styles.down}>{pct(stock.changePct)}</span></div>
    </button>
  );
}

function MoversPanel({ lang, nav, stocks }: { lang: Lang; nav: NavController; stocks: Stock[] }) {
  const [seg, setSeg] = useState<"active" | "gainers" | "losers">("active");
  const list = useMemo(() => {
    const s = stocks.filter((x) => x.symbol);
    if (seg === "gainers") return [...s].sort((a, b) => b.changePct - a.changePct).slice(0, 6);
    if (seg === "losers") return [...s].sort((a, b) => a.changePct - b.changePct).slice(0, 6);
    return [...s].sort((a, b) => b.volume - a.volume).slice(0, 6);
  }, [stocks, seg]);
  const segs: Array<["active" | "gainers" | "losers", string]> = [
    ["active", lang === "ar" ? "الأنشط" : "Most Active"],
    ["gainers", lang === "ar" ? "الرابحون" : "Gainers"],
    ["losers", lang === "ar" ? "الخاسرون" : "Losers"],
  ];
  return (
    <>
      <div className={styles.secHead}>
        <h2>{lang === "ar" ? "الأكثر حركة" : "Top Movers"}</h2>
        <button onClick={() => nav.push("watchlist")}>{lang === "ar" ? "المتابعة ›" : "Watchlist ›"}</button>
      </div>
      <div className={styles.segBar}>
        {segs.map(([id, label]) => <button key={id} className={seg === id ? styles.on : undefined} onClick={() => setSeg(id)}>{label}</button>)}
      </div>
      {list.map((stock) => <MoverRow key={stock.symbol} stock={stock} lang={lang} onClick={() => nav.openStock(stock.symbol)} />)}
    </>
  );
}

function HomeMovers({ lang, nav, stocks }: { lang: Lang; nav: NavController; stocks: Stock[] }) {
  const [seg, setSeg] = useState<"active" | "gainers" | "losers">("active");
  const list = useMemo(() => {
    const s = stocks.filter((x) => x.symbol && x.price > 0);
    if (seg === "gainers") return [...s].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
    if (seg === "losers") return [...s].sort((a, b) => a.changePct - b.changePct).slice(0, 3);
    return [...s].sort((a, b) => b.volume - a.volume).slice(0, 3);
  }, [stocks, seg]);
  const segs: Array<["active" | "gainers" | "losers", string]> = [
    ["active", lang === "ar" ? "الأنشط" : "Most Active"],
    ["gainers", lang === "ar" ? "الرابحون" : "Gainers"],
    ["losers", lang === "ar" ? "الخاسرون" : "Losers"],
  ];
  return (
    <>
      <SectionHead title={copy[lang].topMovers} action={copy[lang].marketPulse} onAction={() => nav.setTab("markets")} />
      <div className={styles.segBar}>
        {segs.map(([id, label]) => <button key={id} className={seg === id ? styles.on : undefined} onClick={() => setSeg(id)}>{label}</button>)}
      </div>
      <div className={styles.homeMoverList}>
        {list.map((stock) => <MoverRow key={stock.symbol} stock={stock} lang={lang} onClick={() => nav.openStock(stock.symbol)} />)}
      </div>
    </>
  );
}

const INDEX_SELECTION = "__EGX30__";

// Famous / most-followed EGX names — drives the workspace selector rail order.
const FAMOUS_EGX = [
  "COMI", "HRHO", "TMGH", "SWDY", "EAST", "ETEL", "ABUK", "ESRS", "MNHD", "PHDC",
  "EKHO", "JUFO", "MFPC", "AMOC", "SKPC", "CIEB", "ADIB", "FWRY", "ISPH", "CCAP",
  "ORWE", "SAUD", "QNBE", "HELI", "AMER", "ORHD", "PHAR", "EGTS", "SIDI", "EFIH",
  "CLHO", "MTIE", "OLFI", "EFIC", "BINV", "GBCO", "RAYA", "EGAL", "SUGR", "DSCW",
];

function EquityWorkspace({ lang, nav, stocks, selectedId, setSelectedId, summary, egxIndex }: { lang: Lang; nav: NavController; stocks: Stock[]; selectedId: string; setSelectedId: (symbol: string) => void; summary: MarketSummary; egxIndex: EgxIndex }) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const workspaceSearchRef = useRef<HTMLInputElement>(null);
  const wl = useWatchlist();
  const isIndex = selectedId === INDEX_SELECTION;
  const picked = stocks.find((stock) => stock.symbol === selectedId) || stocks.find((stock) => stock.symbol === "COMI") || stocks[0];
  const q = query.trim().toLowerCase();
  // Default rail = famous EGX names first (in curated order), topped up by volume to ≥25.
  const railStocks = useMemo(() => {
    const bySymbol = new Map(stocks.map((stock) => [stock.symbol, stock] as const));
    const famous = FAMOUS_EGX.map((sym) => bySymbol.get(sym)).filter((stock): stock is Stock => !!stock && stock.price > 0);
    const seen = new Set(famous.map((stock) => stock.symbol));
    const extra = stocks.filter((stock) => stock.symbol && stock.price > 0 && !seen.has(stock.symbol)).sort((a, b) => b.volume - a.volume);
    return [...famous, ...extra].slice(0, 25);
  }, [stocks]);
  const matches = q
    ? stocks
        .filter((stock) => `${stock.symbol} ${stock.name} ${stock.nameAr ?? ""} ${stock.sector}`.toLowerCase().includes(q))
        .slice(0, 12)
    : railStocks;
  if (!picked && !isIndex) return null;
  const indexValue = toNumber(egxIndex.quote?.value, toNumber(summary.index_value));
  const indexChange = toNumber(egxIndex.quote?.changePercent, toNumber(summary.index_change_percent));
  const indexTrend = (egxIndex.history ?? []).map((point) => toNumber(point.close)).filter((value) => value > 0).slice(-66);
  const trend = isIndex ? indexTrend : picked.trend;
  const high = trend.length ? Math.max(...trend) : undefined;
  const low = trend.length ? Math.min(...trend) : undefined;
  const currentPrice = isIndex ? indexValue : picked.price;
  const currentChange = isIndex ? indexChange : picked.changePct;
  const range = high !== undefined && low !== undefined && high > low ? ((currentPrice - low) / (high - low)) * 100 : undefined;
  const up = currentChange >= 0;
  const rangeTf = isIndex ? "3M" : "1M";
  useEffect(() => {
    if (searchOpen) workspaceSearchRef.current?.focus();
  }, [searchOpen]);
  const toggleWorkspaceSearch = () => {
    if (searchOpen) setQuery("");
    setSearchOpen((open) => !open);
  };
  return (
    <>
      <div className={styles.secHead}>
        <h2>{lang === "ar" ? "مساحة الأسهم" : "Equity Workspace"}</h2>
        <div className={styles.secHeadActions}>
          <button className={cx(styles.secIconBtn, searchOpen && styles.iconBtnOn, query && styles.iconBtnMarked)} aria-label={lang === "ar" ? "بحث" : "Search"} onClick={toggleWorkspaceSearch}><Icon name={searchOpen ? "x" : "search"} size={16} /></button>
          <button onClick={() => isIndex ? nav.openAI("Analyze the EGX 30 index and market breadth") : nav.push("company-profile", { symbol: picked.symbol })}>{isIndex ? (lang === "ar" ? "حلل المؤشر ›" : "Analyze index ›") : (lang === "ar" ? "ملف الشركة ›" : "Company profile ›")}</button>
        </div>
      </div>
      <div className={styles.equityWorkspace}>
        {searchOpen ? (
          <label className={styles.workspaceSearch}>
            <Icon name="search" size={17} />
            <input ref={workspaceSearchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "ar" ? "ابحث عن شركة أو رمز" : "Search a company or symbol"} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={lang === "ar" ? "مسح" : "Clear"}><Icon name="x" size={15} /></button> : null}
          </label>
        ) : null}
        <article className={styles.selectedEquity}>
          <div className={styles.selectedEquityTop}>
            {isIndex ? <span className={cx(styles.stockLogo, styles.avatar)}><Icon name="activity" size={19} /></span> : <StockLogo symbol={picked.symbol} />}
            <button className={styles.selectedEquityName} onClick={() => isIndex ? nav.openAI("Analyze EGX 30 market context") : nav.push("company-profile", { symbol: picked.symbol })}>
              <span>{isIndex ? "EGX30" : picked.symbol}</span><strong>{isIndex ? (lang === "ar" ? "مؤشر EGX 30" : "EGX 30 Index") : stockLabel(picked, lang)}</strong><small>{isIndex ? (summary.market_status === "OPEN" ? copy[lang].live : (lang === "ar" ? "السوق مغلق" : "Market closed")) : picked.sector}</small>
            </button>
            {isIndex ? <span /> : (
              <button className={cx(styles.sheetStar, wl.has(picked.symbol) && styles.on)} aria-label={wl.has(picked.symbol) ? (lang === "ar" ? "إزالة من المتابعة" : "Remove from watchlist") : (lang === "ar" ? "إضافة للمتابعة" : "Add to watchlist")} onClick={() => wl.toggle(picked.symbol)}>
                <Star size={18} fill={wl.has(picked.symbol) ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          <div className={styles.selectedEquityQuote}>
            <strong>{formatNumber(currentPrice, { maximumFractionDigits: isIndex ? 1 : 2, minimumFractionDigits: isIndex ? 1 : 2 })} <small>{isIndex ? "" : "EGP"}</small></strong>
            <Delta value={currentChange} />
          </div>
          <div className={styles.chartFull}>
            {trend.length > 1
              ? <MiniChart data={trend} color={up ? "var(--c-brand)" : "var(--c-down)"} height={112} grid dot />
              : <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا توجد بيانات تاريخية كافية" : "Not enough historical data"}</div>}
          </div>
          <div className={styles.workspaceStats}>
            {isIndex ? (
              <>
                <DataStat label={lang === "ar" ? "الرابحون" : "Advancers"} value={String(toNumber(summary.advancing))} tone="up" />
                <DataStat label={lang === "ar" ? "الخاسرون" : "Decliners"} value={String(toNumber(summary.declining))} tone="down" />
                <DataStat label={lang === "ar" ? "قيمة التداول" : "Turnover"} value={compact(toNumber(summary.total_turnover), lang)} />
              </>
            ) : (
              <>
                <DataStat label={lang === "ar" ? "القيمة السوقية" : "Market Cap"} value={picked.marketCap ? compact(picked.marketCap, lang) : "—"} />
                <DataStat label="P/E" value={picked.pe ? `${picked.pe.toFixed(1)}×` : "—"} />
                <DataStat label={lang === "ar" ? "الحجم" : "Volume"} value={picked.volume ? compact(picked.volume, lang) : "—"} />
              </>
            )}
          </div>
        </article>
        <div className={styles.workspaceRail}>
          <button className={isIndex ? styles.on : undefined} onClick={() => { setSelectedId(INDEX_SELECTION); setQuery(""); }}>
            <span className={styles.workspaceIndexIcon}><Icon name="activity" size={15} /></span>
            <span>EGX30</span>
            <b className={indexChange >= 0 ? styles.up : styles.down}>{pct(indexChange)}</b>
          </button>
          {matches.map((stock) => (
            <button key={stock.symbol} className={!isIndex && stock.symbol === picked.symbol ? styles.on : undefined} onClick={() => { setSelectedId(stock.symbol); setQuery(""); }}>
              <StockLogo symbol={stock.symbol} />
              <span>{stock.symbol}</span>
              <b className={stock.changePct >= 0 ? styles.up : styles.down}>{pct(stock.changePct)}</b>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function WorkspaceDeepDive({ lang, nav, selectedId, stock, stocks, summary, egxIndex, setSelectedId }: { lang: Lang; nav: NavController; selectedId: string; stock?: Stock; stocks: Stock[]; summary: MarketSummary; egxIndex: EgxIndex; setSelectedId: (symbol: string) => void }) {
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const isIndex = selectedId === INDEX_SELECTION;
  useEffect(() => {
    if (isIndex || !stock?.symbol) {
      setBars([]);
      return;
    }
    let alive = true;
    loadOhlcRows(stock.symbol, "3M").then((rows) => { if (alive) setBars(rows); });
    return () => { alive = false; };
  }, [isIndex, stock?.symbol]);
  const closes = isIndex ? (egxIndex.history ?? []).map((point) => toNumber(point.close)).filter((value) => value > 0).slice(-66) : (bars.length > 1 ? bars.map((row) => row.close) : stock?.trend ?? []);
  const high = closes.length ? Math.max(...closes) : undefined;
  const low = closes.length ? Math.min(...closes) : undefined;
  const current = isIndex ? toNumber(egxIndex.quote?.value, toNumber(summary.index_value)) : stock?.price ?? 0;
  const momentum = closes.length > 1 && closes[0] ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : (isIndex ? toNumber(egxIndex.quote?.changePercent, toNumber(summary.index_change_percent)) : stock?.changePct ?? 0);
  const rets = closes.slice(1).map((value, index) => ((value - closes[index]) / (closes[index] || 1)) * 100);
  const vol = rets.length ? Math.sqrt(rets.reduce((sum, value) => sum + value ** 2, 0) / rets.length) : undefined;
  const rangePos = high !== undefined && low !== undefined && high > low ? ((current - low) / (high - low)) * 100 : undefined;
  const peers = isIndex ? [] : stocks.filter((item) => item.symbol !== stock?.symbol && item.sector === stock?.sector).sort((a, b) => b.volume - a.volume).slice(0, 4);
  const sectorAvg = peers.length && stock ? [...peers, stock].reduce((sum, item) => sum + item.changePct, 0) / (peers.length + 1) : undefined;
  const volumeRank = stock ? [...stocks].sort((a, b) => b.volume - a.volume).findIndex((item) => item.symbol === stock.symbol) + 1 : undefined;
  const changeRank = stock ? [...stocks].sort((a, b) => b.changePct - a.changePct).findIndex((item) => item.symbol === stock.symbol) + 1 : undefined;
  if (isIndex) {
    return (
      <>
        <SectionHead title={lang === "ar" ? "سياق المؤشر" : "Index workspace"} />
        <div className={styles.workspaceCommandGrid}>
          <DataStat label={lang === "ar" ? "زخم ٣ أشهر" : "3M Momentum"} value={pct(momentum, 1)} tone={momentum >= 0 ? "up" : "down"} />
          <DataStat label={lang === "ar" ? "تذبذب يومي" : "Daily Volatility"} value={vol === undefined ? "—" : `${vol.toFixed(2)}%`} />
          <DataStat label={lang === "ar" ? "اتساع السوق" : "Breadth"} value={`${toNumber(summary.advancing)} / ${toNumber(summary.declining)}`} tone="brand" />
          <DataStat label={lang === "ar" ? "موقع النطاق" : "Range Position"} value={rangePos === undefined ? "—" : `${rangePos.toFixed(0)}%`} />
        </div>
        <div className={styles.workspaceFeatureGrid}>
          <button onClick={() => nav.openAI("Explain EGX 30 breadth, turnover, and momentum today")}><Icon name="activity" /><b>{lang === "ar" ? "تحليل المؤشر" : "Index Brief"}</b><span>{lang === "ar" ? "زخم واتساع وقيمة تداول" : "Momentum, breadth, and turnover"}</span></button>
          <button onClick={() => setSelectedId("COMI")}><Icon name="search" /><b>{lang === "ar" ? "ابدأ بسهم" : "Start with COMI"}</b><span>{lang === "ar" ? "انتقل إلى مساحة الأسهم" : "Switch back to stock workspace"}</span></button>
        </div>
      </>
    );
  }
  if (!stock) return <EmptyPanel text={lang === "ar" ? "اختر سهماً لعرض مساحة العمل." : "Choose a stock to populate the workspace."} />;
  return (
    <>
      <SectionHead title={lang === "ar" ? "لوحة السهم" : "Stock cockpit"} />
      <div className={styles.workspaceCommandGrid}>
        <DataStat label={lang === "ar" ? "زخم ٣ أشهر" : "3M Momentum"} value={pct(momentum, 1)} tone={momentum >= 0 ? "up" : "down"} />
        <DataStat label={lang === "ar" ? "تذبذب يومي" : "Daily Volatility"} value={vol === undefined ? "—" : `${vol.toFixed(2)}%`} />
        <DataStat label={lang === "ar" ? "ترتيب الحجم" : "Volume Rank"} value={volumeRank ? `#${volumeRank}` : "—"} />
        <DataStat label={lang === "ar" ? "ترتيب الأداء" : "Change Rank"} value={changeRank ? `#${changeRank}` : "—"} tone="brand" />
        <DataStat label={lang === "ar" ? "متوسط القطاع" : "Sector Avg"} value={sectorAvg === undefined ? "—" : pct(sectorAvg, 1)} tone={sectorAvg === undefined ? undefined : sectorAvg >= 0 ? "up" : "down"} />
        <DataStat label={lang === "ar" ? "موقع النطاق" : "Range Position"} value={rangePos === undefined ? "—" : `${rangePos.toFixed(0)}%`} />
      </div>
      {peers.length ? (
        <>
          <SectionHead title={lang === "ar" ? "أسهم من نفس القطاع" : "Sector peers"} />
          <div className={styles.workspacePeerGrid}>
            {peers.map((peer) => (
              <button key={peer.symbol} onClick={() => setSelectedId(peer.symbol)}>
                <StockLogo symbol={peer.symbol} />
                <span>{peer.symbol}</span>
                <b className={peer.changePct >= 0 ? styles.up : styles.down}>{pct(peer.changePct)}</b>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function MarketsScreen({ nav, lang, summary, egxIndex, stocks }: { nav: NavController; lang: Lang; summary: MarketSummary; egxIndex: EgxIndex; stocks: Stock[]; news: NewsItem[] }) {
  const [selectedId, setSelectedId] = useState("COMI");
  useEffect(() => {
    if (selectedId === INDEX_SELECTION) return;
    if (stocks.length && !stocks.some((stock) => stock.symbol === selectedId)) setSelectedId(stocks.find((stock) => stock.symbol === "COMI")?.symbol ?? stocks[0].symbol);
  }, [selectedId, stocks]);
  const selectedStock = selectedId === INDEX_SELECTION ? undefined : stocks.find((stock) => stock.symbol === selectedId);
  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={lang === "ar" ? "نبض السوق" : "Market Pulse"}
        sub={lang === "ar" ? "مساحة عمل الأسهم" : "Stock workspace"}
        actions={<button className={styles.iconBtn2} aria-label={copy[lang].askAi} onClick={() => nav.openAI(selectedStock ? `Analyze ${selectedStock.symbol} in the stock workspace` : "Analyze the EGX 30 workspace")}><AIGlyph size={18} /></button>}
      />
      <div className={styles.content}>
        <EquityWorkspace lang={lang} nav={nav} stocks={stocks} selectedId={selectedId} setSelectedId={setSelectedId} summary={summary} egxIndex={egxIndex} />
        <WorkspaceDeepDive lang={lang} nav={nav} selectedId={selectedId} stock={selectedStock} stocks={stocks} summary={summary} egxIndex={egxIndex} setSelectedId={setSelectedId} />
        <div style={{ height: 16 }} />
      </div>
    </>
  );
}

function HomePortfolioCard({ nav, lang, activePortfolio, stocks, isDemoWorkspace }: { nav: NavController; lang: Lang; activePortfolio: PortfolioPosition[]; stocks: Stock[]; isDemoWorkspace: boolean }) {
  const total = activePortfolio.reduce((sum, p) => sum + p.value, 0);
  const weightedPl = activePortfolio.reduce((sum, p) => sum + p.plPct * (p.weight / 100), 0);
  const leader = useMemo(() => [...activePortfolio].sort((a, b) => b.weight - a.weight)[0], [activePortfolio]);
  const trend = useMemo(() => {
    const legs = activePortfolio.map((p) => {
      const st = stocks.find((s) => s.symbol === p.symbol);
      return st && st.trend.length > 1 ? { qty: p.quantity || 0, t: st.trend } : null;
    }).filter((x): x is { qty: number; t: number[] } => !!x);
    if (!legs.length) return [];
    const len = Math.min(...legs.map((l) => l.t.length));
    if (len < 2) return [];
    return Array.from({ length: len }, (_, i) => legs.reduce((s, l) => s + l.qty * l.t[l.t.length - len + i], 0));
  }, [activePortfolio, stocks]);
  const trendUp = trend.length > 1 ? trend[trend.length - 1] >= trend[0] : weightedPl >= 0;
  return (
    <button className={styles.homePortCard} onClick={() => nav.setTab("portfolio")}>
      <div className={styles.homePortTop}>
        <div className={styles.homePortLabel}>
          <span>{lang === "ar" ? "محفظتي" : "Portfolio"}</span>
          {isDemoWorkspace && <span className={styles.homePortSample}>{lang === "ar" ? "نموذج" : "SAMPLE"}</span>}
        </div>
        <span className={weightedPl >= 0 ? styles.up : styles.down}>{weightedPl >= 0 ? "▲" : "▼"} {pct(Math.abs(weightedPl))}</span>
      </div>
      <div className={styles.homePortValue}>{total ? money(total, lang, 0) : "—"}</div>
      {trend.length > 1 && (
        <div className={styles.homePortChart}>
          <MiniChart data={trend} color={trendUp ? "var(--c-brand)" : "var(--c-down)"} height={76} grid />
        </div>
      )}
      <div className={styles.homePortStats}>
        <div><span>{lang === "ar" ? "أعلى وزن" : "Top holding"}</span><strong>{leader?.symbol ?? "—"}</strong></div>
        <div><span>{lang === "ar" ? "الأسهم" : "Holdings"}</span><strong>{activePortfolio.length}</strong></div>
        <div><span>{lang === "ar" ? "العائد الكلي" : "Total return"}</span><strong className={weightedPl >= 0 ? styles.up : styles.down}>{pct(weightedPl)}</strong></div>
      </div>
    </button>
  );
}

function HomeScreen({ nav, lang, summary, egxIndex, stocks, funds, news, portfolio }: { nav: NavController; lang: Lang; summary: MarketSummary; egxIndex: EgxIndex; stocks: Stock[]; funds: Fund[]; news: NewsItem[]; portfolio: PortfolioPosition[] }) {
  const topStock = useMemo(() => [...stocks].filter((stock) => stock.price > 0).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0], [stocks]);
  const topFund = useMemo(() => [...funds].sort((a, b) => (fundReturn(b, "YTD") ?? -999) - (fundReturn(a, "YTD") ?? -999))[0], [funds]);
  // Use demo portfolio as fallback so the Home snapshot is never empty (matches PortfolioScreen behaviour)
  const activePortfolio = useMemo(() => portfolio.length ? portfolio : buildDemoPortfolio(stocks), [portfolio, stocks]);
  const totalPortfolio = activePortfolio.reduce((sum, item) => sum + item.value, 0);
  const weightedPl = activePortfolio.reduce((sum, p) => sum + p.plPct * (p.weight / 100), 0);
  const latestNews = news[0];
  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={copy[lang].home}
        sub={lang === "ar" ? "ملخصك اليومي" : "Daily command center"}
        actions={<button className={styles.iconBtn2} aria-label={copy[lang].askAi} onClick={() => nav.openAI(lang === "ar" ? "اعرض ملخص السوق اليوم" : "Show me today's market briefing")}><AIGlyph size={18} /></button>}
      />
      <TickerTape stocks={stocks} onPick={(symbol) => nav.openStock(symbol)} />
      <div className={styles.content}>
        <IndexHero lang={lang} egxIndex={egxIndex} summary={summary} />
        <div className={styles.homeQuickGrid}>
          <button onClick={() => nav.push("watchlist")}><Icon name="star" /><span>{copy[lang].watchlist}</span></button>
          <button onClick={() => nav.openAI()}><AIGlyph size={22} /><span>{copy[lang].aiTitle}</span></button>
          <button onClick={() => nav.push("alerts")}><Icon name="bell" /><span>{copy[lang].alerts}</span></button>
          <button onClick={() => nav.push("learn")}><Icon name="graduation-cap" /><span>{copy[lang].learn}</span></button>
        </div>
        <HomeMovers lang={lang} nav={nav} stocks={stocks} />
        {/* Portfolio — premium card with sparkline */}
        <SectionHead
          title={lang === "ar" ? "محفظتي" : "My Portfolio"}
          action={lang === "ar" ? "عرض التفاصيل" : "View details"}
          onAction={() => nav.setTab("portfolio")}
        />
        <HomePortfolioCard nav={nav} lang={lang} activePortfolio={activePortfolio} stocks={stocks} isDemoWorkspace={!portfolio.length} />
        {news.length ? (
          <>
            <SectionHead title={copy[lang].marketNews} action={lang === "ar" ? "عرض الكل" : "View all"} onAction={() => nav.setTab("news")} />
            <div className={styles.homeNewsFeed}>
              {/* Row 1 — large featured card */}
              {news[0] && (
                <button className={styles.homeNewsEntry} onClick={() => nav.push("article", { id: news[0].id })}>
                  <div className={styles.homeNewsEntryImg}><NewsImage item={news[0]} lang={lang} large /></div>
                  <div className={styles.homeNewsEntryBody}>
                    <strong className={styles.homeNewsEntryTitle}>{news[0].headline}</strong>
                    <div className={styles.homeNewsEntryMeta}>
                      <span>{news[0].time}</span>
                      <span className={styles.homeNewsReadMore}>{lang === "ar" ? "اقرأ ›" : "Read article →"}</span>
                    </div>
                  </div>
                </button>
              )}
              {/* Row 2 — two compact side-by-side cards */}
              {(news[1] || news[2]) && (
                <div className={styles.homeNewsRow2}>
                  {[news[1], news[2]].filter(Boolean).map((item) => (
                    <button key={item.id} className={styles.homeNewsSmall} onClick={() => nav.push("article", { id: item.id })}>
                      <div className={styles.homeNewsSmallImg}><NewsImage item={item} lang={lang} /></div>
                      <div className={styles.homeNewsSmallBody}>
                        <strong className={styles.homeNewsSmallTitle}>{item.headline}</strong>
                        <span className={styles.homeNewsSmallTime}>{item.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function StockSheet({ symbol, stocks, lang, nav, onClose }: { symbol: string | null; stocks: Stock[]; lang: Lang; nav: NavController; onClose: () => void }) {
  const wl = useWatchlist();
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [tf, setTf] = useState("3M");
  const stock = symbol ? stocks.find((s) => s.symbol === symbol) : undefined;
  const up = (stock?.changePct ?? 0) >= 0;
  const on = stock ? wl.has(stock.symbol) : false;
  // Reset the timeframe each time a different stock is opened.
  useEffect(() => { setTf("3M"); }, [symbol]);
  useEffect(() => {
    if (!stock?.symbol) {
      setBars([]);
      return;
    }
    let alive = true;
    loadOhlcRows(stock.symbol, tf).then((rows) => { if (alive) setBars(rows); });
    return () => { alive = false; };
  }, [stock?.symbol, tf]);
  // Line series = real daily closes for the selected timeframe (falls back to the sparkline).
  const closes = useMemo(
    () => (bars.length > 1 ? bars.map((r) => r.close).filter((n) => Number.isFinite(n) && n > 0) : (stock?.trend ?? [])),
    [bars, stock?.trend],
  );
  const periodReturn = closes.length > 1 && closes[0] ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : (stock?.changePct ?? 0);
  const periodAbs = closes.length > 1 ? Math.abs(closes[closes.length - 1] - closes[0]) : Math.abs(stock?.change ?? 0);
  const periodUp = periodReturn >= 0;
  return (
    <AnimatePresence>
      {stock ? (
        <motion.div className={styles.sheetWrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className={styles.sheetScrim} onClick={onClose} />
          <motion.div className={styles.sheetPanel} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 340 }}>
            <div className={styles.sheetGrab} />
            <div className={styles.sheetHead}>
              <StockLogo symbol={stock.symbol} className={styles.sheetSym} />
              <div className={styles.sheetWho}><b>{stock.symbol}</b><span>{stockLabel(stock, lang)} · {stock.sector}</span></div>
              <button className={cx(styles.sheetStar, on && styles.on)} aria-label={on ? (lang === "ar" ? "إزالة من المتابعة" : "Remove from watchlist") : (lang === "ar" ? "إضافة للمتابعة" : "Add to watchlist")} onClick={() => wl.toggle(stock.symbol)}>
                <Star size={20} fill={on ? "currentColor" : "none"} strokeWidth={2} />
              </button>
              <button className={styles.sheetClose} aria-label={lang === "ar" ? "إغلاق" : "Close"} onClick={onClose}><Icon name="x" size={18} /></button>
            </div>
            <div className={styles.sheetQuoteRow}>
              <div className={styles.sheetPx}><b>{stock.price.toFixed(2)}</b><span className={styles.unit}>EGP</span></div>
              <span className={cx(styles.sheetDayPill, up ? styles.up : styles.down)}>{up ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)} · {pct(stock.changePct)} <em>{lang === "ar" ? "اليوم" : "Today"}</em></span>
            </div>
            {/* Premium line chart + period selector — same design as the index/market-pulse cards */}
            <div className={styles.sheetChartCard}>
              <div className={styles.sheetChartTop}>
                <span className={cx(styles.sheetPeriodReturn, periodUp ? styles.up : styles.down)}>{periodUp ? "▲" : "▼"} {periodAbs.toFixed(2)} · {pct(periodReturn)}</span>
                <span className={styles.deltaChip}>{tf}</span>
              </div>
              <div className={styles.sheetChartArea}>
                <PriceLineChart bars={bars} fallback={stock.trend} color={periodUp ? "var(--c-brand)" : "var(--c-down)"} height={172} lang={lang} />
              </div>
              <div className={styles.tfBar}>{INDEX_TF.map(([k]) => <button key={k} className={tf === k ? styles.on : undefined} onClick={() => setTf(k)}>{k}</button>)}</div>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "حجم التداول" : "Volume"}</div><div className={styles.tval}>{stock.volume ? compact(stock.volume, lang) : "—"}</div></div>
              <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "القيمة السوقية" : "Market Cap"}</div><div className={styles.tval}>{stock.marketCap ? compact(stock.marketCap, lang) : "—"}</div></div>
              <div className={styles.statTile}><div className={styles.lblMono}>P / E</div><div className={styles.tval}>{stock.pe ? `${stock.pe.toFixed(1)}×` : "—"}</div></div>
              <div className={styles.statTile}><div className={styles.lblMono}>{lang === "ar" ? "القطاع" : "Sector"}</div><div className={styles.tval} style={{ fontSize: 15 }}>{stock.sector}</div></div>
            </div>
            <div className={styles.btnRow2} style={{ marginTop: 14 }}>
              <button className={cx(styles.btn2, styles.ghost)} onClick={() => { onClose(); nav.openAI(`Analyze ${stock.symbol} (${stockLabel(stock, lang)})`); }}><AIGlyph /> {copy[lang].askAi}</button>
              <button className={cx(styles.btn2, styles.primary)} onClick={() => { onClose(); nav.push("stock", { symbol: stock.symbol }); }}>{lang === "ar" ? "التفاصيل الكاملة" : "Full Detail"}</button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function newsBucket(item: NewsItem) {
  const h = `${item.headline} ${item.category} ${item.symbol ?? ""}`.toLowerCase();
  if (/\bbank|banking|insurance|loan|credit|بنك|مصرف/.test(h)) return "banking";
  if (/real.?estate|property|housing|developer|عقار|إسكان/.test(h)) return "realestate";
  if (/energy|oil|gas|solar|electric|power|طاقة|غاز|نفط|كهرباء/.test(h)) return "energy";
  if (/earnings|profit|dividend|revenue|results|أرباح|توزيعات|إيرادات/.test(h)) return "earnings";
  if (/egx|market|bourse|ipo|index|بورصة|السوق|مؤشر/.test(h)) return "markets";
  if (item.symbol) return "stocks";
  return "economy";
}

// Branded, category-specific cover for an article (on-brand, offline-safe).
function newsCover(item: NewsItem, lang: Lang) {
  return `/assets/news-covers/${lang}-${newsBucket(item)}.webp`;
}

// Real publisher photo, served same-origin through the allowlisted image proxy
// (cached + CapacitorHttp-safe). Empty when the row has no image_url.
function newsRealImage(item: NewsItem) {
  return item.image ? `${API_BASE}/api/v1/news-image?url=${encodeURIComponent(item.image)}` : "";
}

function NewsImage({ item: _item, lang, large = false }: { item: NewsItem; lang: Lang; large?: boolean }) {
  // Per product requirement: always show the single branded "News Insight" static cover
  // (the same image used on startamarkets.com) — no real scraped photos, no category variants.
  const src = `/assets/news-covers/${lang}-generic.webp`;
  const fallback = "/assets/news-covers/en-generic.webp";
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={errored ? fallback : src}
      alt=""
      loading="lazy"
      className={large ? styles.newsCoverLarge : undefined}
      onError={() => setErrored(true)}
    />
  );
}

function NewsRow({ item, lang, onClick }: { item: NewsItem; lang: Lang; onClick: () => void }) {
  return (
    <article className={styles.newsCard2} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className={styles.newsCardImg}><NewsImage item={item} lang={lang} large /></div>
      <div className={styles.newsCardBody}>
        <h3 className={styles.newsCardTitle}>{item.headline}</h3>
        <div className={styles.newsCardFoot}>
          <span className={styles.newsCardTime}>{item.time}{item.source ? ` · ${item.source}` : ""}</span>
          <span className={styles.newsCardReadMore}>{lang === "ar" ? "اقرأ ›" : "Read article →"}</span>
        </div>
      </div>
    </article>
  );
}

function NewsScreen({ nav, lang, news }: { nav: NavController; lang: Lang; news: NewsItem[] }) {
  const [query, setQuery] = useState("");
  const [days, setDays] = useState<7 | 30 | 90 | 0>(30);
  const [searchOpen, setSearchOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const dayFilters: Array<[7 | 30 | 90 | 0, string]> = [
    [7, lang === "ar" ? "الأحدث" : "Latest"],
    [30, lang === "ar" ? "30 يوم" : "30 days"],
    [90, lang === "ar" ? "90 يوم" : "90 days"],
    [0, lang === "ar" ? "الكل" : "All"],
  ];
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const filtered = news.filter((item) => {
    const q = query.trim().toLowerCase();
    const published = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
    const withinDays = !days || !published || Date.now() - published <= days * 86400000;
    const matchesQuery = !q || `${item.headline} ${item.body.join(" ")} ${item.category} ${item.symbol ?? ""}`.toLowerCase().includes(q);
    return withinDays && matchesQuery;
  });
  useEffect(() => {
    setPage(1);
  }, [days, query]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, filtered.length - 1) / pageSize));
  const listPage = filtered.slice(1 + (page - 1) * pageSize, 1 + page * pageSize);
  const top = filtered[0];
  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={copy[lang].marketNews}
        sub={lang === "ar" ? "تغطية سوقية مختارة" : "Curated market coverage"}
        actions={(
          <>
            <button className={cx(styles.iconBtn2, searchOpen && styles.iconBtnOn, query && styles.iconBtnMarked)} aria-label={lang === "ar" ? "بحث" : "Search"} onClick={() => setSearchOpen((value) => !value)}><Icon name={searchOpen ? "x" : "search"} size={20} /></button>
            <button className={cx(styles.iconBtn2, periodOpen && styles.iconBtnOn, days !== 30 && styles.iconBtnMarked)} aria-label={lang === "ar" ? "الفترة" : "Period filter"} onClick={() => setPeriodOpen((value) => !value)}><Icon name="sliders" size={20} /></button>
            <button className={styles.iconBtn2} aria-label={copy[lang].askAi} onClick={() => nav.openAI(lang === "ar" ? "لخّص أخبار السوق الحالية" : "Summarize current market news")}><AIGlyph size={18} /></button>
          </>
        )}
      />
      <div className={styles.content}>
        {searchOpen ? (
          <label className={styles.newsSearch2}>
            <Icon name="search" size={18} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy[lang].searchNews} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={lang === "ar" ? "مسح" : "Clear"}><Icon name="x" size={16} /></button> : null}
          </label>
        ) : null}
        {periodOpen ? (
          <div className={styles.newsChips2}>{dayFilters.map(([value, label]) => <button key={value} className={days === value ? styles.on : undefined} onClick={() => setDays(value)}>{label}</button>)}</div>
        ) : null}
        {top ? (
          <button className={styles.newsHero2} onClick={() => nav.push("article", { id: top.id })}>
            <div className={styles.newsHeroImage}><NewsImage item={top} lang={lang} large /></div>
            <span className={styles.liveTag}><i />{lang === "ar" ? "أهم خبر" : "TOP STORY"}</span>
            <strong>{top.headline}</strong>
            <small>{top.category} {top.symbol ? `· ${top.symbol}` : ""} · {top.time}</small>
          </button>
        ) : null}
        <div className={styles.newsMetaLine}>
          <span>{lang === "ar" ? "تغطية حديثة" : "Latest coverage"}</span>
          <b>{days ? (lang === "ar" ? `${days} يوم` : `${days} days`) : (lang === "ar" ? "كل الفترات" : "All time")}</b>
        </div>
        <div className={styles.newsList2}>
          {listPage.map((item) => <NewsRow key={item.id} item={item} lang={lang} onClick={() => nav.push("article", { id: item.id })} />)}
        </div>
        {filtered.length > pageSize + 1 ? (
          <div className={styles.paginationBar}>
            <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{lang === "ar" ? "السابق" : "Previous"}</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{lang === "ar" ? "التالي" : "Next"}</button>
          </div>
        ) : null}
        {!filtered.length ? <EmptyPanel text={lang === "ar" ? "لا توجد أخبار مطابقة لهذا البحث." : "No stories match this search."} /> : null}
      </div>
    </>
  );
}

const FUND_FILTERS = ["All", "Equity", "Sharia", "Balanced", "Fixed Income", "Money Market"] as const;
type FundFilter = typeof FUND_FILTERS[number];
type FundSort = "updated" | "return" | "nav" | "risk" | "aum" | "name";
type RiskBucket = "all" | "low" | "medium" | "high" | "unclassified";

function fundSearchBlob(fund: Fund) {
  return `${fund.name} ${fund.nameAr ?? ""} ${fund.house} ${fund.houseAr ?? ""} ${fund.type} ${fund.typeAr ?? ""} ${fund.strategy ?? ""} ${fund.objective ?? ""}`.toLowerCase();
}

function fundMatchesFilter(fund: Fund, filter: FundFilter) {
  if (filter === "All") return true;
  const blob = fundSearchBlob(fund);
  if (filter === "Sharia") return fund.shariah || /sharia|شريعة/.test(blob);
  if (filter === "Fixed Income") return /fixed|income|bond|debt|دخل|سند/.test(blob);
  if (filter === "Money Market") return /money|cash|liquidity|liquid|نقد|سيولة/.test(blob);
  if (filter === "Balanced") return /balanced|asset allocation|متوازن/.test(blob);
  return /equity|stock|listed|shares|أسهم|الاوراق المالية|الأوراق المالية/.test(blob);
}

function riskBucket(fund: Fund): Exclude<RiskBucket, "all"> {
  if (fund.risk === undefined) return "unclassified";
  if (fund.risk <= 1) return "low";
  if (fund.risk <= 2) return "medium";
  return "high";
}

function riskLabel(bucket: RiskBucket, lang: Lang) {
  const labels: Record<RiskBucket, { en: string; ar: string }> = {
    all: { en: "All risks", ar: "كل المخاطر" },
    low: { en: "Low", ar: "منخفضة" },
    medium: { en: "Medium", ar: "متوسطة" },
    high: { en: "High", ar: "مرتفعة" },
    unclassified: { en: "Unclassified", ar: "غير مصنفة" },
  };
  return labels[bucket][lang];
}

function FundRisk({ value, lang = "en" }: { value?: number; lang?: Lang }) {
  if (value === undefined) return <span className={styles.riskUnavailable}>{lang === "ar" ? "غير متاح" : "Unavailable"}</span>;
  return (
    <span className={styles.fundRisk} aria-label={`Risk ${value} of 4`}>
      {[1, 2, 3, 4].map((n) => <i key={n} className={n <= value ? styles.on : undefined} />)}
    </span>
  );
}

function FundCard({ fund, rank, lang, selected, onOpen, onToggle }: { fund: Fund; rank: number; lang: Lang; selected: boolean; onOpen: () => void; onToggle: () => void }) {
  const ret = fundReturn(fund, "YTD") ?? 0;
  const chartUp = fund.trend.length > 1 ? fund.trend[fund.trend.length - 1] >= fund.trend[0] : ret >= 0;
  const hasTrend = fund.trend.length > 1;
  return (
    <article className={cx(styles.fundCard2, selected && styles.fundCardSelected)}>
      <button className={styles.fundTap} onClick={onOpen}>
        <div className={styles.fundTop2}>
          <span className={styles.fundRank}>{String(rank + 1).padStart(2, "0")}</span>
          <div className={styles.fundName2}>
            <b>{fundLabel(fund, lang)}</b>
            <span>{fundHouseLabel(fund, lang)} · {fundTypeLabel(fund, lang)}</span>
          </div>
          <div className={styles.fundReturn}>
            <b className={ret >= 0 ? styles.up : styles.down}>{pct(ret, 1)}</b>
            <span>YTD</span>
          </div>
        </div>
        <div className={styles.fundBottom2}>
          <div className={styles.fundMetrics2}>
            <div><span>NAV</span><b>{fund.currency ?? "EGP"} {fund.nav ? fund.nav.toFixed(2) : "—"}</b></div>
            <div>{fund.risk !== undefined
              ? <><span>{lang === "ar" ? "المخاطر" : "RISK"}</span><FundRisk value={fund.risk} lang={lang} /></>
              : <><span>{lang === "ar" ? "آخر تحديث" : "AS OF"}</span><b>{fund.lastNavDate ? formatDate(fund.lastNavDate, lang) : "—"}</b></>}</div>
          </div>
          <div className={styles.fundSpark2}>
            {hasTrend
              ? <MiniChart data={fund.trend} color={chartUp ? "var(--c-up)" : "var(--c-down)"} height={34} />
              : <span className={styles.fundSparkEmpty}>{lang === "ar" ? "NAV فقط" : "NAV only"}</span>}
          </div>
        </div>
      </button>
      <div className={styles.fundActions2}>
        <button onClick={onToggle} className={selected ? styles.fundCompareOn : undefined}>
          <Icon name={selected ? "check" : "plus"} size={15} /> {selected ? (lang === "ar" ? "مضاف" : "Added") : (lang === "ar" ? "قارن" : "Compare")}
        </button>
        {fund.shariah ? <span>{lang === "ar" ? "شريعة" : "Shariah"}</span> : <span>{fund.liquidity}</span>}
      </div>
    </article>
  );
}

function FundsScreen({ nav, lang, funds }: { nav: NavController; lang: Lang; funds: Fund[] }) {
  const [filter, setFilter] = useState<FundFilter>("All");
  const [sort, setSort] = useState<FundSort>("updated");
  const [query, setQuery] = useState("");
  const [manager, setManager] = useState("all");
  const [risk, setRisk] = useState<RiskBucket>("all");
  const [shariahOnly, setShariahOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const fundSearchRef = useRef<HTMLInputElement>(null);
  const managers = useMemo(() => Array.from(new Set(funds.map((fund) => fundHouseLabel(fund, lang)).filter((value) => value && value !== "—"))).sort((a, b) => a.localeCompare(b, lang)), [funds, lang]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return funds
      .filter((fund) => fundMatchesFilter(fund, filter))
      .filter((fund) => manager === "all" || fundHouseLabel(fund, lang) === manager)
      .filter((fund) => risk === "all" || riskBucket(fund) === risk)
      .filter((fund) => !shariahOnly || fund.shariah)
      .filter((fund) => !q || fundSearchBlob(fund).includes(q))
      .sort((a, b) => {
        if (sort === "updated") {
          // Sort by most-recent NAV date (newest first) — matches the /Funds web default.
          // Use lastNavDate, fall back to lastUpdateDate.
          const da = new Date(a.lastNavDate || a.lastUpdateDate || 0).getTime();
          const db = new Date(b.lastNavDate || b.lastUpdateDate || 0).getTime();
          if (db !== da) return db - da;
          // Tiebreaker: YTD return descending (deterministic stable order for same-date funds).
          return (fundReturn(b, "YTD") ?? 0) - (fundReturn(a, "YTD") ?? 0);
        }
        if (sort === "nav") return b.nav - a.nav;
        if (sort === "risk") return (b.risk ?? -1) - (a.risk ?? -1);
        if (sort === "aum") return toNumber(b.raw?.aum_millions ?? b.raw?.aum) - toNumber(a.raw?.aum_millions ?? a.raw?.aum);
        if (sort === "name") return fundLabel(a, lang).localeCompare(fundLabel(b, lang));
        return (fundReturn(b, "YTD") ?? 0) - (fundReturn(a, "YTD") ?? 0);
      });
  }, [filter, funds, lang, manager, query, risk, shariahOnly, sort]);
  useEffect(() => {
    setVisibleCount(24);
  }, [filter, manager, query, risk, shariahOnly, sort]);
  useEffect(() => {
    if (searchOpen) fundSearchRef.current?.focus();
  }, [searchOpen]);
  const visibleFunds = filtered.slice(0, visibleCount);
  const toggleCompare = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]);
  };
  const sortLabels: Record<FundSort, string> = {
    updated: lang === "ar" ? "آخر تحديث" : "Latest update",
    return: lang === "ar" ? "العائد" : "Return",
    nav: "NAV",
    risk: lang === "ar" ? "المخاطر" : "Risk",
    aum: "AUM",
    name: lang === "ar" ? "الاسم" : "Name",
  };
  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={copy[lang].mutualFunds}
        sub={lang === "ar" ? `${funds.length} صندوق · EGX` : `${funds.length} funds · EGX`}
        actions={(
          <>
            <button className={cx(styles.iconBtn2, searchOpen && styles.iconBtnOn, query && styles.iconBtnMarked)} aria-label={lang === "ar" ? "بحث" : "Search"} onClick={() => setSearchOpen((value) => !value)}><Icon name={searchOpen ? "x" : "search"} size={20} /></button>
            <button className={cx(styles.iconBtn2, filterOpen && styles.iconBtnOn, (filter !== "All" || sort !== "updated" || manager !== "all" || risk !== "all" || shariahOnly) && styles.iconBtnMarked)} aria-label={lang === "ar" ? "الفلاتر" : "Filters"} onClick={() => setFilterOpen((value) => !value)}><Icon name="sliders" size={20} /></button>
            <button className={cx(styles.iconBtn2, selectedIds.length > 0 && styles.iconBtnMarked)} aria-label={copy[lang].compare} onClick={() => nav.push("compare", { ids: selectedIds })}><Icon name="git-compare" size={20} /></button>
          </>
        )}
      />
      <div className={styles.content}>
        {searchOpen ? (
          <label className={styles.fundSearch}>
            <Icon name="search" />
            <input ref={fundSearchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "ar" ? "ابحث عن صندوق أو مدير" : "Search funds or managers"} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={lang === "ar" ? "مسح" : "Clear"}><Icon name="x" size={16} /></button> : null}
          </label>
        ) : null}
        {filterOpen ? (
          <div className={styles.filterPanel2}>
            <div className={styles.fundTools}>
              <select value={sort} onChange={(e) => setSort(e.target.value as FundSort)} aria-label={lang === "ar" ? "ترتيب الصناديق" : "Sort funds"}>
                {(Object.keys(sortLabels) as FundSort[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
              </select>
              <button type="button" onClick={() => { setFilter("All"); setSort("updated"); setManager("all"); setRisk("all"); setShariahOnly(false); }}>{lang === "ar" ? "إعادة ضبط" : "Reset"}</button>
            </div>
            <div className={styles.fundAdvanced}>
              <select value={manager} onChange={(event) => setManager(event.target.value)} aria-label={lang === "ar" ? "مدير الصندوق" : "Fund manager"}>
                <option value="all">{lang === "ar" ? "كل المديرين" : "All managers"}</option>
                {managers.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={risk} onChange={(event) => setRisk(event.target.value as RiskBucket)} aria-label={lang === "ar" ? "مستوى المخاطر" : "Risk level"}>
                {(["all", "low", "medium", "high", "unclassified"] as RiskBucket[]).map((item) => <option key={item} value={item}>{riskLabel(item, lang)}</option>)}
              </select>
              <button className={shariahOnly ? styles.on : undefined} onClick={() => setShariahOnly((value) => !value)}>{lang === "ar" ? "شريعة فقط" : "Shariah only"}</button>
            </div>
            <div className={styles.fundChips}>
              {FUND_FILTERS.map((item) => (
                <button key={item} className={filter === item ? styles.on : undefined} onClick={() => setFilter(item)}>
                  {item === "All" ? copy[lang].all : item === "Sharia" && lang === "ar" ? "شريعة" : item === "Balanced" && lang === "ar" ? "متوازن" : item === "Fixed Income" && lang === "ar" ? "دخل ثابت" : item === "Money Market" && lang === "ar" ? "سوق نقدي" : item === "Equity" && lang === "ar" ? "أسهم" : item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.fundCountLine}>
          <span>{lang === "ar" ? `${filtered.length} نتيجة` : `${filtered.length} results`}</span>
          <b>{lang === "ar" ? "بيانات NAV حقيقية" : "Real NAV data"}</b>
        </div>
        <div className={styles.fundList2}>
          {visibleFunds.map((fund, i) => (
            <FundCard
              key={fund.id}
              fund={fund}
              rank={i}
              lang={lang}
              selected={selectedIds.includes(fund.id)}
              onOpen={() => nav.push("fund", { id: fund.id })}
              onToggle={() => toggleCompare(fund.id)}
            />
          ))}
        </div>
        {filtered.length > visibleFunds.length ? (
          <button className={styles.loadMoreBtn} onClick={() => setVisibleCount((count) => Math.min(filtered.length, count + 24))}>
            <span>{lang === "ar" ? "عرض المزيد من الصناديق" : "Show more funds"}</span>
            <b>{visibleFunds.length} / {filtered.length}</b>
          </button>
        ) : null}
        {!filtered.length ? <EmptyPanel text={lang === "ar" ? "لا توجد صناديق مطابقة لهذا البحث." : "No funds match this search."} /> : null}
      </div>
      {selectedIds.length ? (
        <div className={styles.fundTray}>
          <div><b>{lang === "ar" ? `${selectedIds.length} صناديق محددة` : `${selectedIds.length} funds selected`}</b><span>{lang === "ar" ? "حتى 4 صناديق للمقارنة" : "Tap funds to add · up to 4"}</span></div>
          <button onClick={() => nav.push("compare", { ids: selectedIds })}>{lang === "ar" ? "قارن ›" : "Compare ›"}</button>
        </div>
      ) : null}
    </>
  );
}

function portfolioStatsFromSeries(series: number[], portfolio: PortfolioPosition[], lang: Lang) {
  const returns = series.slice(1).map((value, index) => {
    const prev = series[index] || 0;
    return prev ? ((value - prev) / prev) * 100 : 0;
  });
  const best = returns.length ? Math.max(...returns) : undefined;
  const worst = returns.length ? Math.min(...returns) : undefined;
  const positives = returns.filter((value) => value > 0).length;
  let peak = series[0] ?? 0;
  let maxDrawdown = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  series.forEach((value, index) => {
    if (value > peak) {
      peak = value;
      peakIndex = index;
    }
    const drawdown = peak ? ((value - peak) / peak) * 100 : 0;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      troughIndex = index;
    }
  });
  const recoveredIndex = troughIndex > peakIndex ? series.findIndex((value, index) => index > troughIndex && value >= peak) : -1;
  const mean = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const volatility = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1))
    : undefined;
  const maxWeight = portfolio.length ? Math.max(...portfolio.map((item) => item.weight)) : 0;
  return {
    best,
    worst,
    maxDrawdown: returns.length ? maxDrawdown : undefined,
    recovery: recoveredIndex >= 0 ? `${recoveredIndex - troughIndex} ${lang === "ar" ? "أيام" : "days"}` : (returns.length ? (lang === "ar" ? "مفتوح" : "Open") : "—"),
    winRate: returns.length ? (positives / returns.length) * 100 : undefined,
    positives,
    totalDays: returns.length,
    volatility,
    maxWeight,
  };
}

const PORT_PERIODS: Array<[string, string]> = [["1W","1w"],["1M","1m"],["3M","3m"],["6M","6m"],["1Y","1y"],["All","max"]];

function PortfolioScreen({ nav, lang, portfolio, stocks, onPortfolioChange }: { nav: NavController; lang: Lang; portfolio: PortfolioPosition[]; stocks: Stock[]; onPortfolioChange?: (portfolio: PortfolioPosition[]) => void }) {
  const wl = useWatchlist();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("COMI");
  const [manualQty, setManualQty] = useState("100");
  const [manualAvg, setManualAvg] = useState("");
  const [csvRows, setCsvRows] = useState("");
  const [portfolioNotice, setPortfolioNotice] = useState("");
  const [chartPeriod, setChartPeriod] = useState("3M");
  const [periodTrends, setPeriodTrends] = useState<Record<string, number[]>>({});
  const demoPortfolio = useMemo(() => buildDemoPortfolio(stocks), [stocks]);
  const activePortfolio = portfolio.length ? portfolio : demoPortfolio;
  const isDemoWorkspace = !portfolio.length && demoPortfolio.length > 0;
  const activeCash = isDemoWorkspace ? DEMO_PORTFOLIO_CASH : 0;
  const total = activePortfolio.reduce((sum, item) => sum + item.value, activeCash);
  const [tab, setTab] = useState<"allocation" | "performance" | "holdings" | "dividends">("allocation");

  // Load sparklines for selected chart period. chartReady gates the chart render
  // so we never flash a wrong (stale-data) chart before the real period data lands.
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    const apiPeriod = PORT_PERIODS.find(([k]) => k === chartPeriod)?.[1] ?? "3m";
    const symbols = activePortfolio.map((p) => p.symbol);
    if (!symbols.length) return;
    let alive = true;
    setChartReady(false);
    loadSparklines(symbols, apiPeriod).then((spark) => {
      if (!alive) return;
      setPeriodTrends(spark);
      setChartReady(true);
    });
    return () => { alive = false; };
  }, [chartPeriod, activePortfolio.map(p => p.symbol).join(",")]);

  // Build portfolio trend ONLY from the period-specific sparklines (no stale
  // sparkline fallback — that was the source of the red flash on entry).
  const portfolioTrend = useMemo(() => {
    const legs = activePortfolio.map((p) => {
      const t = periodTrends[p.symbol] ?? [];
      return t.length > 1 ? { qty: p.quantity || 0, t } : null;
    }).filter((x): x is { qty: number; t: number[] } => !!x);
    if (!legs.length) return [];
    const len = Math.min(...legs.map((l) => l.t.length));
    if (len < 2) return [];
    return Array.from({ length: len }, (_, i) =>
      legs.reduce((sum, l) => sum + l.qty * l.t[l.t.length - len + i], activeCash),
    );
  }, [activePortfolio, activeCash, periodTrends]);

  const trendDelta = portfolioTrend.length > 1
    ? ((portfolioTrend[portfolioTrend.length - 1] - portfolioTrend[0]) / portfolioTrend[0]) * 100
    : 0;
  const realStats = portfolioStatsFromSeries(portfolioTrend, activePortfolio, lang);
  const weightedPl = activePortfolio.reduce((sum, p) => sum + p.plPct * (p.weight / 100), 0);
  const sharpeEst = realStats.volatility && realStats.volatility > 0 ? ((weightedPl / realStats.totalDays) * 252 / (realStats.volatility * Math.sqrt(252))).toFixed(2) : "—";
  const leader = [...activePortfolio].sort((a, b) => b.weight - a.weight)[0];
  const hasPortfolio = activePortfolio.length > 0;
  const watchlistStocks = wl.symbols.map((symbol) => stocks.find((item) => item.symbol === symbol)).filter((item): item is Stock => !!item);
  const watchlistReturn = watchlistStocks.length ? watchlistStocks.reduce((sum, item) => sum + item.changePct, 0) / watchlistStocks.length : undefined;
  const commitRows = (rows: Record<string, unknown>[], notice: string) => {
    saveLocalPortfolioRows(rows);
    onPortfolioChange?.(buildPortfolio(rows, stocks));
    setPortfolioNotice(notice);
    setOptionsOpen(true);
  };
  const currentRows = () => (portfolio.length ? portfolio.map((item) => ({
    symbol: item.symbol,
    quantity: item.quantity,
    avg_price: item.avgPrice ?? item.price,
  })) : readLocalPortfolioRows());
  const addManualHolding = () => {
    const symbol = manualSymbol.trim().toUpperCase();
    const quantity = Number(manualQty);
    const stock = stocks.find((item) => item.symbol === symbol);
    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !stock) {
      setPortfolioNotice(lang === "ar" ? "أدخل رمزاً صحيحاً وكمية أكبر من صفر." : "Enter a valid listed symbol and quantity above zero.");
      return;
    }
    const avg = Number(manualAvg) || stock.price;
    const rows = currentRows().filter((row) => String(row.symbol ?? "").toUpperCase() !== symbol);
    commitRows([...rows, { symbol, quantity, avg_price: avg }], lang === "ar" ? "تم تحديث المحفظة محلياً." : "Portfolio updated locally.");
  };
  const importCsvRows = () => {
    const rows = csvRows.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/[,\t;]/).map((cell) => cell.trim()))
      .map(([symbol, quantity, avg]) => ({ symbol: String(symbol ?? "").toUpperCase(), quantity: Number(quantity), avg_price: Number(avg) || undefined }))
      .filter((row) => row.symbol && Number.isFinite(row.quantity) && row.quantity > 0 && stocks.some((stock) => stock.symbol === row.symbol));
    if (!rows.length) {
      setPortfolioNotice(lang === "ar" ? "لم أجد صفوفاً صالحة. الصيغة: COMI,100,138" : "No valid rows found. Use: COMI,100,138");
      return;
    }
    commitRows(rows, lang === "ar" ? `تم استيراد ${rows.length} مراكز محلياً.` : `Imported ${rows.length} local holdings.`);
  };
  const buildFromWatchlist = () => {
    const rows = watchlistStocks.map((stock) => ({ symbol: stock.symbol, quantity: 100, avg_price: stock.price }));
    if (!rows.length) {
      setPortfolioNotice(lang === "ar" ? "أضف رموزاً إلى قائمة المتابعة أولاً." : "Add symbols to your watchlist first.");
      return;
    }
    commitRows(rows, lang === "ar" ? "تم إنشاء محفظة أولية من قائمة المتابعة." : "Created a starter portfolio from the watchlist.");
  };
  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={copy[lang].portfolio}
        sub={lang === "ar" ? "ذكاء المحفظة" : "Portfolio Intelligence"}
        actions={<button className={styles.iconBtn2} aria-label={optionsOpen ? (lang === "ar" ? "إغلاق خيارات المحفظة" : "Close portfolio options") : (lang === "ar" ? "خيارات المحفظة" : "Portfolio options")} onClick={() => setOptionsOpen((open) => !open)}><Icon name={optionsOpen ? "x" : "plus"} size={21} /></button>}
      />
      <div className={styles.content}>
        {/* ── Portfolio chart card with period selector ── */}
        <div className={cx(styles.chartCard, styles.portfolioPerformanceCard, styles.portfolioTopChart)}>
          <div className={styles.portfolioChartTop}>
            <div>
              <span className={styles.kicker}>{isDemoWorkspace ? (lang === "ar" ? "محفظة نموذجية" : "Sample portfolio") : (lang === "ar" ? "أداء المحفظة" : "Portfolio Performance")}</span>
              <strong className={styles.bigValue}>{hasPortfolio ? money(total, lang, 2) : "—"}</strong>
            </div>
            {isDemoWorkspace ? <span className={styles.sampleBadge}>{lang === "ar" ? "نموذج" : "SAMPLE"}</span> : null}
          </div>
          {chartReady ? <Delta value={trendDelta} /> : <span className={styles.deltaPlaceholder} aria-hidden="true">—</span>}
          {!chartReady
            ? <div className={styles.portfolioChartSkeleton} style={{ height: 176 }} />
            : portfolioTrend.length > 1
              ? <MiniChart data={portfolioTrend} color={trendDelta >= 0 ? "var(--c-brand)" : "var(--c-down)"} height={176} grid dot />
              : <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا توجد سلسلة أسعار كافية." : "Not enough price history."}</div>}
          {/* Period selector — same style as EGX30 chart */}
          <div className={styles.tfBar}>
            {PORT_PERIODS.map(([k]) => (
              <button key={k} className={chartPeriod === k ? styles.on : undefined} onClick={() => setChartPeriod(k)}>{k}</button>
            ))}
          </div>
          <div className={styles.portfolioMetricRow}>
            <span><b>{realStats.best === undefined ? "—" : pct(realStats.best)}</b>{lang === "ar" ? "أفضل يوم" : "Best day"}</span>
            <span><b>{realStats.worst === undefined ? "—" : pct(realStats.worst)}</b>{lang === "ar" ? "أسوأ يوم" : "Worst day"}</span>
            <span><b>{realStats.winRate === undefined ? "—" : `${realStats.winRate.toFixed(1)}%`}</b>{lang === "ar" ? "نسبة الفوز" : "Win rate"}</span>
            <span><b>{realStats.maxDrawdown === undefined ? "—" : pct(realStats.maxDrawdown)}</b>{lang === "ar" ? "أقصى تراجع" : "Max DD"}</span>
          </div>
        </div>

        {/* ── Tabs: Allocation | Performance | Holdings | Dividends ── */}
        <div className={styles.segment}>
          {([
            ["allocation", lang === "ar" ? "التخصيص" : "Allocation"],
            ["performance", lang === "ar" ? "الأداء" : "Performance"],
            ["holdings", lang === "ar" ? "الأرصدة" : "Holdings"],
            ["dividends", lang === "ar" ? "التوزيعات" : "Dividends"],
          ] as const).map(([key, label]) => <Pill key={key} active={tab === key} onClick={() => setTab(key)}>{label}</Pill>)}
        </div>

        {/* Allocation */}
        {tab === "allocation" && <Allocation portfolio={activePortfolio} lang={lang} />}

        {/* Performance: Top Contributors + Risk Metrics */}
        {tab === "performance" && (
          <>
            <SectionHead title={lang === "ar" ? "أفضل المساهمين" : "Top Contributors"} />
            <div className={styles.portContribGrid}>
              {[...activePortfolio].sort((a, b) => b.plPct - a.plPct).map((p) => (
                <button key={p.symbol} className={styles.portContribCard} onClick={() => nav.push("stock", { symbol: p.symbol })}>
                  <div className={styles.portContribTop}>
                    <StockLogo symbol={p.symbol} className={styles.rowSym} />
                    <div><b>{p.symbol}</b><span>{p.weight.toFixed(1)}%</span></div>
                  </div>
                  <div className={styles.portContribVal}>{compact(p.value, lang)}</div>
                  <div className={cx(styles.portContribPl, p.plPct >= 0 ? styles.up : styles.down)}>
                    {p.plPct >= 0 ? "▲" : "▼"} {pct(Math.abs(p.plPct))}
                  </div>
                </button>
              ))}
            </div>
            <SectionHead title={lang === "ar" ? "مقاييس المخاطر" : "Risk Metrics"} />
            <div className={styles.portRiskGrid}>
              {([
                [lang === "ar" ? "التذبذب السنوي" : "Volatility (Ann.)", realStats.volatility === undefined ? "—" : `${(realStats.volatility * Math.sqrt(252)).toFixed(2)}%`],
                [lang === "ar" ? "أقصى تراجع" : "Max Drawdown", realStats.maxDrawdown === undefined ? "—" : pct(realStats.maxDrawdown)],
                [lang === "ar" ? "نسبة شارب (تقريبي)" : "Sharpe (est.)", sharpeEst],
                [lang === "ar" ? "أيام الاسترداد" : "Recovery", realStats.recovery],
                [lang === "ar" ? "أيام إيجابية" : "Positive days", realStats.totalDays ? `${realStats.positives} / ${realStats.totalDays}` : "—"],
                [lang === "ar" ? "أكبر تركيز" : "Concentration", `${realStats.maxWeight.toFixed(1)}%`],
                [lang === "ar" ? "العائد الكلي" : "Weighted P/L", pct(weightedPl)],
                [lang === "ar" ? "عدد المراكز" : "Holdings", String(activePortfolio.length)],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} className={styles.portRiskTile}>
                  <span>{l}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Holdings */}
        {tab === "holdings" && (
          <div className={styles.portfolioHoldingsGrid}>{activePortfolio.map((p) => <HoldingRow key={p.symbol} item={p} lang={lang} onClick={() => nav.push("stock", { symbol: p.symbol })} />)}</div>
        )}

        {/* Dividends */}
        {tab === "dividends" && <DividendPanel lang={lang} />}

        {optionsOpen ? (
          <div className={styles.portfolioOptionsPanel}>
            <div className={styles.portfolioOptionsHead}>
              <span>{lang === "ar" ? "إدارة المحفظة" : "Portfolio tools"}</span>
              <button onClick={() => setOptionsOpen(false)}>{lang === "ar" ? "تم" : "Done"}</button>
            </div>
            <div className={styles.portfolioPickerGrid}>
              <button className={styles.portfolioPickCard} onClick={() => setOptionsOpen(false)}>
                <span>{lang === "ar" ? "محفظتي" : "My Portfolio"} <i>{lang === "ar" ? "افتراضي" : "Default"}</i></span>
                <strong>{hasPortfolio ? money(total, lang, 2) : "—"}</strong>
                <small>{lang === "ar" ? `${activePortfolio.length} مراكز · EGX30` : `${activePortfolio.length} holdings · EGX30`}</small>
                <Delta value={trendDelta} />
              </button>
              <button className={styles.portfolioPickCard} onClick={() => nav.push("watchlist")}>
                <span>{lang === "ar" ? "محفظة المتابعة" : "Watchlist Portfolio"}</span>
                <strong>{watchlistStocks.length ? `${watchlistStocks.length}` : "—"}</strong>
                <small>{lang === "ar" ? "حوّل قائمة المتابعة إلى بداية محفظة" : "Convert watched names into a starting portfolio"}</small>
                {watchlistReturn !== undefined ? <Delta value={watchlistReturn} /> : null}
              </button>
              <button className={styles.portfolioPickCard} onClick={() => nav.openAI(lang === "ar" ? "اشرح قالب رفع المحفظة: الرمز والكمية ومتوسط السعر" : "Explain the portfolio upload template: symbol, quantity, average price")}>
                <span>{lang === "ar" ? "رفع محفظة" : "Portfolio Upload"}</span>
                <strong>{lang === "ar" ? "CSV" : "CSV"}</strong>
                <small>{lang === "ar" ? "رمز، كمية، ومتوسط تكلفة" : "Symbol, quantity, and average cost"}</small>
                <em>{lang === "ar" ? "جاهز" : "Ready"}</em>
              </button>
            </div>
            <SectionHead title={lang === "ar" ? "ابدأ محفظة" : "Start a portfolio"} />
            <div className={styles.portfolioOptionGrid}>
              <button onClick={addManualHolding}>
                <span><Icon name="plus" /></span>
                <strong>{lang === "ar" ? "إنشاء يدوياً" : "Create Manually"}</strong>
                <small>{lang === "ar" ? "أضف الرمز والكمية ومتوسط السعر من الحقول أدناه." : "Add the symbol, quantity, and average price from the fields below."}</small>
              </button>
              <button onClick={importCsvRows}>
                <span><Icon name="file-text" /></span>
                <strong>{lang === "ar" ? "استيراد المراكز" : "Import Holdings"}</strong>
                <small>{lang === "ar" ? "الصق صفوف CSV: الرمز، الكمية، متوسط التكلفة." : "Paste CSV rows: symbol, quantity, average cost."}</small>
              </button>
              <button onClick={buildFromWatchlist}>
                <span><Icon name="star" /></span>
                <strong>{lang === "ar" ? "من قائمة المتابعة" : "From Watchlist"}</strong>
                <small>{lang === "ar" ? "استخدم الأسهم التي تتابعها كنقطة بداية." : "Use watched symbols as the first portfolio draft."}</small>
              </button>
            </div>
            <div className={styles.portfolioInputPanel}>
              <label>
                <span>{lang === "ar" ? "رمز" : "Symbol"}</span>
                <input value={manualSymbol} onChange={(event) => setManualSymbol(event.target.value.toUpperCase())} placeholder="COMI" />
              </label>
              <label>
                <span>{lang === "ar" ? "كمية" : "Quantity"}</span>
                <input inputMode="decimal" value={manualQty} onChange={(event) => setManualQty(event.target.value)} placeholder="100" />
              </label>
              <label>
                <span>{lang === "ar" ? "متوسط السعر" : "Avg price"}</span>
                <input inputMode="decimal" value={manualAvg} onChange={(event) => setManualAvg(event.target.value)} placeholder={lang === "ar" ? "اختياري" : "Optional"} />
              </label>
              <label className={styles.portfolioCsvField}>
                <span>{lang === "ar" ? "استيراد CSV" : "CSV import"}</span>
                <textarea value={csvRows} onChange={(event) => setCsvRows(event.target.value)} placeholder={"COMI,100,138\nSWDY,50,86.7"} />
              </label>
              {portfolioNotice ? <p>{portfolioNotice}</p> : null}
            </div>
            <SectionHead title={lang === "ar" ? "جاهزية البيانات" : "Data readiness"} />
            <div className={styles.statGrid}>
              <DataStat label={lang === "ar" ? "مصدر المراكز" : "Holdings source"} value={portfolio.length ? (lang === "ar" ? "متصل" : "Connected") : (lang === "ar" ? "نموذجية" : "Sample")} tone="brand" />
              <DataStat label={lang === "ar" ? "الأسعار" : "Prices"} value={stocks.length ? (lang === "ar" ? "حية" : "Live") : "—"} tone={stocks.length ? "up" : undefined} />
              <DataStat label={lang === "ar" ? "المتابعة" : "Watchlist"} value={String(wl.symbols.length)} />
              <DataStat label={lang === "ar" ? "الحالة" : "Status"} value={hasPortfolio ? (lang === "ar" ? "جاهز" : "Ready") : (lang === "ar" ? "بانتظار" : "Waiting")} />
            </div>
          </div>
        ) : null}

        <SectionHead title={lang === "ar" ? "رؤى الذكاء" : "AI Insights"} action="BETA" />
        <div className={styles.insightGrid}>
          <Insight icon="trending-up" title={lang === "ar" ? "أداء المحفظة" : "Portfolio Performance"} value={portfolioTrend.length > 1 ? pct(trendDelta) : "—"} text={portfolioTrend.length > 1 ? (lang === "ar" ? "محسوب من أسعار الإغلاق الحقيقية لمراكز المحفظة." : "Calculated from real closing prices for the current holdings.") : (lang === "ar" ? "سيظهر بعد تحميل السلاسل السعرية الحقيقية." : "Shown once real holding price series finish loading.")} />
          <Insight icon="triangle-alert" title={lang === "ar" ? "مخاطر التركّز" : "Concentration Risk"} value={`${realStats.maxWeight.toFixed(1)}%`} text={leader ? (lang === "ar" ? `أكبر وزن حالياً هو ${leader.symbol}.` : `${leader.symbol} is currently the largest portfolio weight.`) : "—"} warn={realStats.maxWeight >= 25} />
          <Insight icon="activity" title={lang === "ar" ? "التذبذب اليومي" : "Daily Volatility"} value={realStats.volatility === undefined ? "—" : `${realStats.volatility.toFixed(2)}%`} text={lang === "ar" ? "محسوب فقط من سلسلة قيمة المحفظة الحقيقية." : "Computed only from the real portfolio value series."} />
        </div>
      </div>
    </>
  );
}

function Insight({ icon, title, value, text, warn }: { icon: string; title: string; value: string; text: string; warn?: boolean }) {
  return (
    <div className={styles.insight}>
      <Icon name={icon} />
      <strong className={warn ? styles.warn : styles.up}>{value}</strong>
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}

function HoldingRow({ item, lang, onClick }: { item: PortfolioPosition; lang: Lang; onClick: () => void }) {
  return (
    <button className={styles.portfolioHoldingCard} onClick={onClick}>
      <StockLogo symbol={item.symbol} className={styles.avatar} />
      <div className={styles.stockName}>
        <strong>{item.symbol}</strong>
        <small>{formatNumber(item.quantity, { maximumFractionDigits: 0 })} · {item.weight.toFixed(1)}%</small>
      </div>
      <div className={styles.priceCell}>
        <strong>{money(item.value, lang, 0)}</strong>
        <Delta value={item.plPct} />
      </div>
    </button>
  );
}

function Allocation({ portfolio, lang }: { portfolio: PortfolioPosition[]; lang: Lang }) {
  const rows = useMemo(() => [...portfolio].sort((a, b) => b.weight - a.weight), [portfolio]);
  const [selected, setSelected] = useState<string | undefined>(rows[0]?.symbol);
  useEffect(() => {
    if (!rows.length) return;
    if (!selected || !rows.some((item) => item.symbol === selected)) setSelected(rows[0].symbol);
  }, [rows, selected]);
  const active = rows.find((item) => item.symbol === selected) ?? rows[0];
  let cursor = 0;
  const gradient = rows.length
    ? `conic-gradient(${rows.map((item) => {
      const start = cursor;
      cursor += Math.max(0, item.weight);
      return `${item.color} ${start}% ${cursor}%`;
    }).join(", ")}, var(--c-surface-3) ${Math.min(100, cursor)}% 100%)`
    : "conic-gradient(var(--c-surface-3) 0 100%)";
  return (
    <div className={styles.allocPanel}>
      <div className={styles.allocationHero}>
        <button
          className={styles.allocationDonut}
          style={{ "--alloc": gradient, "--active-color": active?.color ?? "var(--c-brand)" } as CSSProperties}
          onClick={() => active && setSelected(rows[(rows.findIndex((item) => item.symbol === active.symbol) + 1) % rows.length]?.symbol)}
          aria-label={lang === "ar" ? "تبديل التخصيص المحدد" : "Cycle selected allocation"}
        >
          <span>{active?.symbol ?? "—"}</span>
          <strong>{active ? `${active.weight.toFixed(1)}%` : "—"}</strong>
        </button>
      </div>
      <div className={styles.allocationCards}>
        {rows.map((p) => (
          <button key={p.symbol} className={cx(styles.allocationCard, selected === p.symbol && styles.allocationCardActive)} onClick={() => setSelected(p.symbol)}>
            <i style={{ background: p.color }} />
            <span>{p.symbol}</span>
            <strong>{p.weight.toFixed(1)}%</strong>
            <small>{money(p.value, lang, 0)}</small>
          </button>
        ))}
      </div>
      <p className={styles.disclaimer}>{lang === "ar" ? "التخصيص محسوب من مراكز المحفظة المتاحة والأسعار الحية." : "Allocation is calculated from available holdings and live prices."}</p>
    </div>
  );
}

function DividendPanel({ lang }: { lang: Lang }) {
  return (
    <EmptyPanel text={lang === "ar" ? "لا توجد بيانات توزيعات حقيقية مرتبطة بهذه المحفظة حالياً. لن نعرض رسماً أو قيمة تقديرية بدون مصدر بيانات." : "No real dividend feed is connected to this portfolio yet. No estimated dividend chart is shown without a data source."} />
  );
}

type MoreItem = { label: string; sub: string; icon: string; action: () => void; glyph?: "ai" };

function MoreCard({ item, lang }: { item: MoreItem; lang: Lang }) {
  return (
    <button className={styles.moreCard} onClick={item.action}>
      <span className={styles.moreIco}>{item.glyph === "ai" ? <AIGlyph size={20} /> : <Icon name={item.icon} size={20} />}</span>
      <b>{item.label}</b>
      <small>{item.sub}</small>
      <i className={styles.moreArrow}><Icon name={lang === "ar" ? "chevron-left" : "chevron-right"} size={15} /></i>
    </button>
  );
}

function MoreScreen({ nav, lang, theme, setTheme, setLang, logout, user, onAuth }: { nav: NavController; lang: Lang; theme: Theme; setTheme: (theme: Theme) => void; setLang: (lang: Lang) => void; logout: () => void; user?: AuthUser | null; onAuth?: (s: "signin" | "signup") => void }) {
  const t = copy[lang];
  const watchCount = readWatch().length;

  const ai: MoreItem = { label: t.aiTitle, sub: lang === "ar" ? "اسأل المحلل عن أي شيء" : "Ask the analyst anything", icon: "activity", glyph: "ai", action: () => nav.openAI() };
  const subscription: MoreItem = { label: lang === "ar" ? "خطط Starta" : "Starta Plans", sub: lang === "ar" ? "قارن Starter و Analyst" : "Compare Starter & Analyst", icon: "crown", action: () => nav.push("subscription") };
  const tools: MoreItem[] = [
    { label: t.watchlist, sub: lang === "ar" ? "الرموز المتابَعة" : "Tracked symbols", icon: "star", action: () => nav.push("watchlist") },
    { label: t.alerts, sub: lang === "ar" ? "إشارات بدون تداول" : "Signals, no trading", icon: "bell", action: () => nav.push("alerts") },
    { label: t.learn, sub: lang === "ar" ? "أكاديمية Starta" : "Starta Academy", icon: "graduation-cap", action: () => nav.push("learn") },
    { label: t.settings, sub: lang === "ar" ? "التفضيلات" : "Preferences", icon: "settings", action: () => nav.push("settings") },
  ];
  const prefs: MoreItem[] = [
    { label: lang === "ar" ? "English" : "العربية", sub: lang === "ar" ? "اللغة" : "Language", icon: "languages", action: () => setLang(lang === "ar" ? "en" : "ar") },
    { label: theme === "dark" ? (lang === "ar" ? "الوضع الفاتح" : "Light mode") : (lang === "ar" ? "الوضع الداكن" : "Dark mode"), sub: lang === "ar" ? "المظهر" : "Appearance", icon: theme === "dark" ? "sun" : "moon", action: () => setTheme(theme === "dark" ? "light" : "dark") },
  ];
  const footer: MoreItem[] = [
    { label: t.about, sub: "", icon: "landmark", action: () => nav.push("about") },
    { label: lang === "ar" ? "المساعدة" : "Help", sub: "", icon: "circle-help", action: () => nav.push("help") },
    { label: t.privacy, sub: "", icon: "shield-check", action: () => nav.push("privacy") },
    { label: t.terms, sub: "", icon: "file-text", action: () => nav.push("terms") },
  ];
  const secLabel = (text: string) => <div className={styles.moreSecLabel}>{text}</div>;

  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={t.more}
        sub={lang === "ar" ? "الحساب والإعدادات" : "Account & Settings"}
        actions={
          <>
            <button className={styles.iconBtn2} aria-label={lang === "ar" ? "English" : "العربية"} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              <Icon name="languages" size={20} />
            </button>
            <button className={styles.iconBtn2} aria-label={theme === "dark" ? (lang === "ar" ? "وضع فاتح" : "Light mode") : (lang === "ar" ? "وضع داكن" : "Dark mode")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
            </button>
          </>
        }
      />
      <div className={styles.content}>
        <div className={cx(styles.moreRevamp, styles.moreBento)}>
          <button className={styles.moreHero} onClick={() => (user ? nav.push("profile") : onAuth?.("signin"))}>
            <span className={styles.moreHeroGlow} aria-hidden="true" />
            <span className={styles.moreAvatar}>{user ? (user.full_name || user.email || "S").trim().charAt(0).toUpperCase() : "S"}</span>
            <span className={styles.moreHeroId}>
              <b>{user ? (user.full_name || user.email) : (lang === "ar" ? "زائر" : "Guest")}</b>
              {user ? <small>{user.email}</small> : <small>{lang === "ar" ? "سجّل الدخول أو أنشئ حساباً" : "Sign in or create an account"}</small>}
            </span>
            {user ? (
              <span className={styles.moreHeroStats}>
                <span><b>{watchCount}</b><small>{lang === "ar" ? "متابعة" : "Watch"}</small></span>
                <span><b>{lang === "ar" ? "مجاني" : "Free"}</b><small>{lang === "ar" ? "الخطة" : "Plan"}</small></span>
              </span>
            ) : (
              <span className={styles.moreHeroCta}>{lang === "ar" ? "دخول" : "Sign in"}<Icon name={lang === "ar" ? "chevron-left" : "chevron-right"} size={15} /></span>
            )}
          </button>

          {secLabel(lang === "ar" ? "مميز" : "Featured")}
          <div className={styles.moreFeatured}>
            <button className={cx(styles.moreCard, styles.moreAi)} onClick={ai.action}>
              <span className={styles.moreIco}><AIGlyph size={22} color="#fff" /></span>
              <b>{ai.label}</b>
              <small>{ai.sub}</small>
              <i className={styles.moreArrow}><Icon name={lang === "ar" ? "chevron-left" : "chevron-right"} size={15} /></i>
            </button>
            <button className={cx(styles.moreCard, styles.moreSub)} onClick={subscription.action}>
              <span className={styles.moreIco}><Icon name="crown" size={20} /></span>
              <b>{subscription.label}</b>
              <small>{subscription.sub}</small>
              <em>{lang === "ar" ? "معلومات" : "INFO"}</em>
            </button>
          </div>

          {secLabel(lang === "ar" ? "الأدوات" : "Tools")}
          <div className={styles.moreGrid}>
            {tools.map((item) => <MoreCard key={item.label} item={item} lang={lang} />)}
          </div>

          {secLabel(lang === "ar" ? "المنصة" : "About & legal")}
          <div className={styles.moreFooter}>
            {footer.map((item) => (
              <button key={item.label} onClick={item.action}>
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
                <Icon name={lang === "ar" ? "chevron-left" : "chevron-right"} size={14} />
              </button>
            ))}
          </div>

          {user
            ? <PrimaryButton ghost onClick={logout}>{lang === "ar" ? "تسجيل الخروج" : "Sign out"}</PrimaryButton>
            : <PrimaryButton onClick={() => onAuth?.("signup")}>{lang === "ar" ? "إنشاء حساب مجاني" : "Create free account"}</PrimaryButton>}
          <p className={styles.disclaimer}>Starta Markets v1.0 · {t.disclaimer}</p>
        </div>
      </div>
    </>
  );
}

function PushRouter({ screen, nav, lang, theme, setTheme, setLang, stocks, funds, news, topics, portfolio, summary, egxIndex, user, onAuth, logout }: {
  screen: PushScreen;
  nav: NavController;
  lang: Lang;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  setLang: (lang: Lang) => void;
  stocks: Stock[];
  funds: Fund[];
  news: NewsItem[];
  topics: LearnTopic[];
  portfolio: PortfolioPosition[];
  summary: MarketSummary;
  egxIndex: EgxIndex;
  user?: AuthUser | null;
  onAuth?: (s: "signin" | "signup") => void;
  logout?: () => void;
}) {
  const props = screen.props ?? {};
  if (screen.name === "market-pulse") return <MarketsScreen nav={nav} lang={lang} summary={summary} egxIndex={egxIndex} stocks={stocks} news={news} />;
  if (screen.name === "stock" || screen.name === "company-profile") {
    const stock = stocks.find((s) => s.symbol === props.symbol);
    return stock ? <CompanyProfile nav={nav} lang={lang} stock={stock} news={news} /> : <MissingDataScreen nav={nav} lang={lang} title={lang === "ar" ? "السهم غير متاح" : "Stock unavailable"} />;
  }
  if (screen.name === "fund") {
    const fund = funds.find((f) => f.id === props.id);
    return fund ? <FundDetail nav={nav} lang={lang} fund={fund} /> : <MissingDataScreen nav={nav} lang={lang} title={lang === "ar" ? "الصندوق غير متاح" : "Fund unavailable"} />;
  }
  if (screen.name === "article") {
    const item = news.find((n) => n.id === props.id);
    return item ? <ArticleDetail nav={nav} lang={lang} item={item} news={news} /> : <MissingDataScreen nav={nav} lang={lang} title={lang === "ar" ? "الخبر غير متاح" : "Article unavailable"} />;
  }
  if (screen.name === "compare") return <CompareFunds nav={nav} lang={lang} funds={funds} selectedIds={Array.isArray(props.ids) ? props.ids.filter((id): id is string => typeof id === "string") : undefined} />;
  if (screen.name === "watchlist") return <Watchlist nav={nav} lang={lang} stocks={stocks} portfolio={portfolio} />;
  if (screen.name === "search") return <Watchlist nav={nav} lang={lang} stocks={stocks} portfolio={portfolio} search />;
  if (screen.name === "alerts") return <Alerts nav={nav} lang={lang} />;
  if (screen.name === "learn") return <LearnScreen nav={nav} lang={lang} topics={topics} />;
  if (screen.name === "course") {
    const topic = topics.find((item) => item.slug === props.slug);
    return topic ? <CourseDetail nav={nav} lang={lang} topic={topic} /> : <MissingDataScreen nav={nav} lang={lang} title={lang === "ar" ? "المحتوى غير متاح" : "Content unavailable"} />;
  }
  if (screen.name === "profile") return <Profile nav={nav} lang={lang} portfolio={portfolio} user={user} onAuth={onAuth} logout={logout} />;
  if (screen.name === "settings") return <SettingsScreen nav={nav} lang={lang} theme={theme} setTheme={setTheme} setLang={setLang} />;
  if (screen.name === "subscription") return <Subscription nav={nav} lang={lang} />;
  if (screen.name === "help") return <HelpScreen nav={nav} lang={lang} />;
  if (screen.name === "about") return <AboutScreen nav={nav} lang={lang} />;
  if (screen.name === "privacy") return <LegalScreen nav={nav} lang={lang} kind="privacy" />;
  if (screen.name === "terms") return <LegalScreen nav={nav} lang={lang} kind="terms" />;
  if (screen.name === "portfolio-intel") return <PortfolioIntel nav={nav} lang={lang} portfolio={portfolio} />;
  if (screen.name === "portfolio-detail") return <PortfolioDetail nav={nav} lang={lang} portfolio={portfolio} stocks={stocks} />;
  return <MissingDataScreen nav={nav} lang={lang} title={lang === "ar" ? "الصفحة غير متاحة" : "Screen unavailable"} />;
}

function MissingDataScreen({ nav, lang, title }: { nav: NavController; lang: Lang; title: string }) {
  return (
    <>
      <PushHeader title={title} sub={lang === "ar" ? "بيانات حية" : "Live data"} onBack={nav.pop} />
      <div className={styles.content}>
        <EmptyPanel text={lang === "ar" ? "لا توجد بيانات متاحة الآن. جرّب التحديث أو ارجع للقائمة." : "No live data is available right now. Refresh or return to the list."} />
      </div>
    </>
  );
}

function AboutScreen({ nav, lang }: { nav: NavController; lang: Lang }) {
  return (
    <>
      <PushHeader title={copy[lang].about} sub={lang === "ar" ? "منصة ذكاء مالي" : "Financial intelligence platform"} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.brandPanel}>
          <LogoMark />
          <span>STARTA MARKETS</span>
          <h1>{lang === "ar" ? "رؤية أذكى للسوق المصري." : "A smarter vision for the Egyptian market."}</h1>
          <p>{lang === "ar" ? "تجربة استثمارية تجمع البيانات الحية والتحليل والتعليم والمحفظة في تصميم واحد هادئ وفاخر." : "A market-first investing experience that brings live data, analysis, education, and portfolio intelligence into one calm premium product."}</p>
        </div>
        <div className={styles.legalStack}>
          {aboutContent[lang].map(([title, desc]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{desc}</p>
            </article>
          ))}
        </div>
        <div className={styles.statGrid}>
          <DataStat label="EGX" value={lang === "ar" ? "تغطية السوق" : "Market coverage"} tone="brand" />
          <DataStat label="AR / EN" value={lang === "ar" ? "ثنائي اللغة" : "Bilingual"} />
          <DataStat label="AI" value={lang === "ar" ? "مساعد داعم" : "Supporting analyst"} tone="brand" />
          <DataStat label="Risk" value={lang === "ar" ? "إفصاح واضح" : "Clear disclaimers"} />
        </div>
      </div>
    </>
  );
}

function LegalScreen({ nav, lang, kind }: { nav: NavController; lang: Lang; kind: "privacy" | "terms" }) {
  const title = kind === "privacy" ? copy[lang].privacy : copy[lang].terms;
  const sub = kind === "privacy"
    ? (lang === "ar" ? "أمن البيانات والثقة" : "Data security & trust")
    : (lang === "ar" ? "الامتثال وقواعد المنصة" : "Platform compliance & rules");
  const rows = legalContent[kind][lang];
  return (
    <>
      <PushHeader title={title} sub={sub} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.legalHero}>
          <span>{sub}</span>
          <h1>{title}</h1>
          <p>{lang === "ar" ? "آخر تحديث: 29 مايو 2026" : "Last Updated: May 29, 2026"}</p>
        </div>
        <div className={styles.legalStack}>
          {rows.map(([heading, body]) => (
            <article key={heading}>
              <strong>{heading}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className={styles.disclaimer}>{copy[lang].disclaimer}</p>
      </div>
    </>
  );
}

function PortfolioIntel({ nav, lang, portfolio }: { nav: NavController; lang: Lang; portfolio: PortfolioPosition[] }) {
  const total = portfolio.reduce((sum, item) => sum + item.value, 0);
  const weightedPl = portfolio.reduce((sum, item) => sum + item.plPct * (item.weight / 100), 0);
  const largest = portfolio.length ? Math.max(...portfolio.map((item) => item.weight)) : 0;
  return (
    <>
      <PushHeader title={copy[lang].portfolioIntel} sub={lang === "ar" ? "بيانات المحفظة المتاحة" : "Available portfolio data"} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.brandPanel}>
          <Icon name="line-chart" size={32} />
          <span>{lang === "ar" ? "ذكاء المحفظة" : "Portfolio Intelligence"}</span>
          <h1>{lang === "ar" ? "تحليل فقط عندما تكون البيانات حقيقية." : "Analysis only when the data is real."}</h1>
          <p>{lang === "ar" ? "يعرض التطبيق المراكز المتاحة من مصدر المحفظة الحالي. لا يتم إنشاء قيم أو رسوم بيانية تقديرية عند غياب البيانات." : "The app displays holdings available from the current portfolio source. It does not invent values or charts when the feed is empty."}</p>
        </div>
        <button className={styles.portfolioCard} onClick={() => nav.setTab("portfolio")}>
          <span>{lang === "ar" ? "المحفظة الرئيسية" : "Primary Portfolio"}</span>
          <strong>{portfolio.length ? money(total, lang, 2) : "—"}</strong>
          {portfolio.length ? <Delta value={weightedPl} /> : <small>{lang === "ar" ? "لا توجد مراكز متاحة" : "No holdings available"}</small>}
        </button>
        <div className={styles.statGrid}>
          <DataStat label={lang === "ar" ? "محافظ" : "Portfolios"} value={total ? "1" : "0"} tone="brand" />
          <DataStat label={lang === "ar" ? "مراكز" : "Holdings"} value={String(portfolio.length)} />
          <DataStat label={lang === "ar" ? "العائد المرجح" : "Weighted P/L"} value={portfolio.length ? pct(weightedPl) : "—"} tone={portfolio.length ? (weightedPl >= 0 ? "up" : "down") : undefined} />
          <DataStat label={lang === "ar" ? "أكبر وزن" : "Largest Weight"} value={`${largest.toFixed(1)}%`} />
        </div>
        {!portfolio.length ? <EmptyPanel text={lang === "ar" ? "مصدر المحفظة لم يرسل مراكز حالياً. ستظهر التحليلات تلقائياً عند توفر مراكز حقيقية." : "The portfolio source is not returning positions right now. Analysis appears automatically when real holdings are available."} /> : null}
      </div>
    </>
  );
}

function PortfolioDetail({ nav, lang, portfolio, stocks }: { nav: NavController; lang: Lang; portfolio: PortfolioPosition[]; stocks: Stock[] }) {
  return (
    <>
      <PushHeader title={lang === "ar" ? "تفاصيل المحفظة" : "Portfolio Detail"} sub={lang === "ar" ? "الأداء والمراكز والتحليلات" : "Performance, holdings, analytics"} onBack={nav.pop} action={<Icon name="plus" />} />
      <PortfolioScreen nav={nav} lang={lang} portfolio={portfolio} stocks={stocks} />
    </>
  );
}

// Fullscreen TradingView Advanced Chart for an EGX symbol. Tapping the enlarge
// button opens this; on a native build it rotates the device to landscape and
// restores portrait on close. ScreenOrientation is reached through the Capacitor
// runtime-global Plugins bridge (same idiom the file uses for the App plugin),
// so no extra build-time dependency is required.
function ChartFullscreen({ symbol, lang, onClose }: { symbol: string; lang: Lang; onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    type OrientationPlugin = { lock?: (opts: { orientation: string }) => Promise<unknown>; unlock?: () => Promise<unknown> };
    const nativeOrientation = (): OrientationPlugin | undefined =>
      (window as unknown as { Capacitor?: { Plugins?: { ScreenOrientation?: OrientationPlugin } } }).Capacitor?.Plugins?.ScreenOrientation;
    // rotate to landscape (native) / best-effort (web)
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) await nativeOrientation()?.lock?.({ orientation: "landscape" });
        else { const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<unknown> } }).orientation; if (so && so.lock) so.lock("landscape").catch(() => {}); }
      } catch { /* ignore */ }
    })();
    const host = hostRef.current;
    if (host) {
      host.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "tradingview-widget-container";
      wrap.style.height = "100%"; wrap.style.width = "100%";
      const w = document.createElement("div");
      w.className = "tradingview-widget-container__widget";
      w.style.height = "100%"; w.style.width = "100%";
      wrap.appendChild(w);
      const isDark = document.documentElement.classList.contains("dark") || document.documentElement.dataset.theme === "dark";
      const s = document.createElement("script");
      s.type = "text/javascript"; s.async = true;
      s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      s.text = JSON.stringify({
        autosize: true, symbol: "EGX:" + symbol, interval: "D", timezone: "Africa/Cairo",
        theme: isDark ? "dark" : "light", style: "1", locale: lang === "ar" ? "ar" : "en",
        allow_symbol_change: false, hide_side_toolbar: false, withdateranges: true,
        details: false, calendar: false, support_host: "https://www.tradingview.com",
      });
      wrap.appendChild(s);
      host.appendChild(wrap);
    }
    return () => {
      (async () => {
        try {
          if (Capacitor.isNativePlatform()) await nativeOrientation()?.lock?.({ orientation: "portrait" });
          else { const so = (screen as unknown as { orientation?: { unlock?: () => void } }).orientation; if (so && so.unlock) so.unlock(); }
        } catch { /* ignore */ }
      })();
      if (host) host.innerHTML = "";
    };
  }, [symbol, lang]);
  return (
    <div className={styles.chartFs}>
      <button className={styles.chartFsCloseFloat} onClick={onClose} aria-label={lang === "ar" ? "إغلاق" : "Close"}>✕</button>
      <div ref={hostRef} className={styles.chartFsBody} />
    </div>
  );
}

// Merged Company Research page — combines the live quote / candle chart (formerly
// "Quote Detail") with full fundamentals (profile, financials, ownership, actions).
function CompanyProfile({ nav, lang, stock, news }: { nav: NavController; lang: Lang; stock?: Stock; news: NewsItem[] }) {
  const wl = useWatchlist();
  const [bundle, setBundle] = useState<CompanyProfileBundle>({ financials: [], ratios: [], shareholders: [], actions: [], financialsTv: [], technicals: [] });
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [tf, setTf] = useState<string>("3M");
  const [tab, setTab] = useState<"overview" | "financials" | "technicals" | "forecasts" | "seasonals" | "ownership" | "actions">("overview");
  const [chartFull, setChartFull] = useState(false);
  const symbol = stock?.symbol;

  // Fundamentals load once per symbol — the page is already usable from `stock`
  // (hero, chart, key stats), so this just fills the tabs in the background.
  useEffect(() => {
    if (!symbol) return;
    let active = true;
    loadCompanyProfile(symbol, lang).then((next) => { if (active) setBundle(next); });
    return () => { active = false; };
  }, [symbol, lang]);

  // OHLC reloads per selected timeframe (drives the candle chart + price signals).
  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    loadOhlcRows(symbol, tf).then((rows) => { if (alive) setBars(rows); });
    return () => { alive = false; };
  }, [symbol, tf]);

  if (!stock) return null;
  const profile = bundle.profile ?? {};
  const marketData = bundle.marketData ?? {};
  const stats = bundle.statistics ?? {};
  const latestFinancial = bundle.financials[0] ?? {};
  const latestRatio = bundle.ratios[0] ?? {};
  const description = firstString(profile, lang === "ar" ? ["description_ar", "business_description_ar", "description", "business_description"] : ["description_en", "business_description_en", "description", "business_description"], "");
  const displayName = lang === "ar"
    ? firstCompanyName(profile, ["name_ar", "company_name_ar", "company_name", "name_en"], stockLabel(stock, lang))
    : firstCompanyName(profile, ["company_name_en", "company_name", "name_en"], companyNameFromDescription(description) || stockLabel(stock, lang));
  const exchange = String(profile.exchange_code ?? "EGX");
  const currency = String(profile.currency ?? "EGP");
  const asOf = firstString(profile, ["updated_at", "last_updated", "as_of_date", "extracted_at"], firstString(stats, ["updated_at"], ""));
  const website = firstString(profile, ["website", "url", "company_website"], "");
  const address = firstString(profile, lang === "ar" ? ["headquarters_ar", "address_ar", "headquarters", "address"] : ["headquarters", "address_en", "address"], "");
  const industry = firstString(profile, ["industry", "industry_en"], stock.sector);
  const phone = firstString(profile, ["phone", "telephone"], "");
  const employees = firstNumber(profile, ["employees", "employee_count", "number_of_employees"]);
  const yearFounded = firstString(profile, ["founded", "year_founded", "established", "establishment_date"], "");
  const marketCap = firstNumber(profile, ["market_cap"]) ?? stock.marketCap;
  const peRatio = firstNumber(marketData, ["pe_ratio"]) ?? firstNumber(stats, ["pe_ratio"]) ?? stock.pe;
  const pbRatio = firstNumber(marketData, ["pb_ratio"]) ?? firstNumber(stats, ["pb_ratio"]) ?? firstNumber(latestRatio, ["pb_ratio", "price_book", "pb"]);
  const forwardPe = firstNumber(stats, ["forward_pe"]);
  const dividendYield = firstNumber(marketData, ["dividend_yield"]) ?? firstNumber(stats, ["dividend_yield"]);
  const beta = firstNumber(stats, ["beta_5y", "beta"]);
  const ma50 = firstNumber(stats, ["ma_50d"]);
  const ma200 = firstNumber(stats, ["ma_200d"]);
  const rsi = firstNumber(stats, ["rsi_14"]);
  const avgVolume20d = firstNumber(stats, ["avg_volume_20d"]);
  const relativeVolume = avgVolume20d && stock.volume ? stock.volume / avgVolume20d : undefined;
  const price52w = firstNumber(stats, ["price_change_52w"]);
  const revenueTtm = firstNumber(stats, ["revenue_ttm"]);
  const netIncomeTtm = firstNumber(stats, ["net_income_ttm"]);
  const epsTtm = firstNumber(stats, ["eps_ttm"]);
  const bvps = firstNumber(stats, ["bvps"]);
  const dps = firstNumber(stats, ["dps"]);
  const roe = firstNumber(stats, ["roe"]);
  const roa = firstNumber(stats, ["roa"]);
  const profitMargin = firstNumber(stats, ["profit_margin"]);
  const operatingMargin = firstNumber(stats, ["operating_margin"]);
  const totalDebt = firstNumber(stats, ["total_debt"]);
  const netCash = firstNumber(stats, ["net_cash"]);
  const sharesOutstanding = firstNumber(stats, ["shares_outstanding"]);
  const floatShares = firstNumber(stats, ["float_shares"]);
  const institutionalOwnership = firstNumber(stats, ["institutional_ownership"]);
  const insiderOwnership = firstNumber(stats, ["insider_ownership"]);
  const officers = (() => {
    const seen = new Set<string>();
    const unique: Record<string, unknown>[] = [];
    for (const record of asRecords(profile.officers)) {
      const name = String(record.name ?? "").trim().toLowerCase();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      unique.push(record);
    }
    return unique.slice(0, 4);
  })();
  const related = news.filter((item) => item.symbol === stock.symbol || item.headline.toUpperCase().includes(stock.symbol)).slice(0, 3);
  const chartCloses = bars.length > 1 ? bars.map((row) => row.close).filter((value) => Number.isFinite(value) && value > 0) : stock.trend;
  const chartHigh = chartCloses.length ? Math.max(...chartCloses) : undefined;
  const chartLow = chartCloses.length ? Math.min(...chartCloses) : undefined;
  const latestBar = bars[bars.length - 1];
  const rangePct = chartHigh !== undefined && chartLow !== undefined && chartHigh > chartLow ? ((stock.price - chartLow) / (chartHigh - chartLow)) * 100 : undefined;
  // Real price signals derived from the selected-timeframe series (no mock).
  const tfMomentum = chartCloses.length > 1 && chartCloses[0] ? ((chartCloses[chartCloses.length - 1] - chartCloses[0]) / chartCloses[0]) * 100 : stock.changePct;
  const tfRets = chartCloses.slice(1).map((v, i) => (v - chartCloses[i]) / (chartCloses[i] || 1));
  const tfVol = tfRets.length ? Math.sqrt(tfRets.reduce((a, b) => a + b ** 2, 0) / tfRets.length) * 100 : undefined;
  const tfTrendUp = chartCloses.length > 1 ? chartCloses[chartCloses.length - 1] >= chartCloses[0] : stock.changePct >= 0;
  const on = wl.has(stock.symbol);
  const up = stock.changePct >= 0;

  // ── TradingView-native: annual financial summary (sorted desc, ~8 years).
  const tvFinancialYears = [...bundle.financialsTv]
    .sort((a, b) => toNumber(b.fiscal_year) - toNumber(a.fiscal_year))
    .slice(0, 8);

  // ── TradingView-native: technicals (default to the 1D timeframe).
  const tvTech1D = bundle.technicals.find((t) => String(t.timeframe) === "1D");
  const techRec = recVerdict(tvTech1D ? optionalNumber(tvTech1D.recommend_all) : undefined);
  const techIndicators = tvTech1D
    ? [
        ["RSI", optionalNumber(tvTech1D.rsi)],
        ["MACD", optionalNumber(tvTech1D.macd_macd)],
        [lang === "ar" ? "ستوكاستيك %K" : "Stochastic %K", optionalNumber(tvTech1D.stoch_k)],
        ["CCI", optionalNumber(tvTech1D.cci20)],
        ["ADX", optionalNumber(tvTech1D.adx)],
        [lang === "ar" ? "الزخم" : "Momentum", optionalNumber(tvTech1D.mom)],
        ["EMA 50", optionalNumber(tvTech1D.ema50)],
        ["EMA 200", optionalNumber(tvTech1D.ema200)],
        ["SMA 50", optionalNumber(tvTech1D.sma50)],
        ["SMA 200", optionalNumber(tvTech1D.sma200)],
      ].map(([label, value]) => ({ label: String(label), value: value === undefined ? "—" : toNumber(value).toFixed(2) }))
    : [];

  // ── TradingView-native: analyst estimates / forecasts.
  const estimates = bundle.estimates ?? {};
  const estimatesCovered = estimates.covered === true;
  const targetAvg = optionalNumber(estimates.target_average);
  const targetLow = optionalNumber(estimates.target_low);
  const targetHigh = optionalNumber(estimates.target_high);
  const targetUpside = targetAvg !== undefined && stock.price > 0 ? ((targetAvg - stock.price) / stock.price) * 100 : undefined;
  const recBuySide = toNumber(estimates.rec_buy) + toNumber(estimates.rec_over);
  const recHold = toNumber(estimates.rec_hold);
  const recSellSide = toNumber(estimates.rec_sell) + toNumber(estimates.rec_under);
  const recTotal = toNumber(estimates.rec_total);
  const epsNextFq = optionalNumber(estimates.eps_fcst_next_fq);
  const revNextFq = optionalNumber(estimates.rev_fcst_next_fq);
  const epsNextFy = optionalNumber(estimates.eps_fcst_next_fy);

  // ── Monthly seasonality (avg return / positive-rate per calendar month).
  const seasonals = bundle.seasonals;
  const seasonalAvailable = seasonals?.available === true;
  const seasonalMonths = Array.isArray(seasonals?.months) ? seasonals.months : [];
  const seasonalMax = seasonalMonths.reduce((m, x) => Math.max(m, Math.abs(toNumber(x.avg_return))), 0) || 1;
  const seasonalBest = seasonalMonths.reduce<SeasonalMonth | undefined>((best, x) => (best === undefined || toNumber(x.avg_return) > toNumber(best.avg_return) ? x : best), undefined);
  const seasonalWorst = seasonalMonths.reduce<SeasonalMonth | undefined>((worst, x) => (worst === undefined || toNumber(x.avg_return) < toNumber(worst.avg_return) ? x : worst), undefined);
  const seasonalConsistent = seasonalMonths.reduce<SeasonalMonth | undefined>((top, x) => (top === undefined || toNumber(x.positive_rate) > toNumber(top.positive_rate) ? x : top), undefined);

  // ── Overview related news: prefer per-symbol TradingView feed, fall back to global.
  const newsTvItems = (bundle.newsTv ?? []).filter((item) => firstString(item, ["headline"], "")).slice(0, 4);

  return (
    <>
      <MarketTopBar
        lang={lang}
        nav={nav}
        title={stock.symbol}
        sub={stock.sector}
        actions={(
          <>
            <button className={styles.iconBtn2} aria-label={copy[lang].askAi} onClick={() => nav.openAI(`Analyze ${stock.symbol} (${stockLabel(stock, lang)}) using live market data`)}><AIGlyph size={18} /></button>
            <button className={cx(styles.iconBtn2, on && styles.iconBtnMarked)} aria-label={on ? (lang === "ar" ? "إزالة من المتابعة" : "Remove from watchlist") : (lang === "ar" ? "إضافة للمتابعة" : "Add to watchlist")} onClick={() => wl.toggle(stock.symbol)}><Star size={18} fill={on ? "currentColor" : "none"} strokeWidth={2} /></button>
          </>
        )}
      />
      <div className={styles.content}>
        {/* Premium identity + price hero */}
        <motion.div className={styles.crHero} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: ONB_EASE, duration: 0.45 }}>
          <span className={styles.crHeroGlow} aria-hidden="true" />
          <div className={styles.crHeroTop}>
            <StockLogo symbol={stock.symbol} className={styles.crLogo} />
            <div className={styles.crHeroId}>
              <h1>{displayName}</h1>
              <small>{stock.symbol} · {exchange} · {stock.sector}</small>
            </div>
          </div>
          <div className={styles.crHeroPrice}>
            <strong>{stock.price.toFixed(2)}<em>{currency}</em></strong>
            <span className={cx(styles.crDelta, up ? styles.up : styles.down)}>{up ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)} · {pct(stock.changePct)}</span>
          </div>
        </motion.div>

        {/* Interactive candle chart + timeframe selector */}
        <div className={styles.crChartCard}>
          <div className={styles.ohlcAndEnlarge}>
            {latestBar ? (
              <div className={styles.ohlcMiniGrid}>
                {[
                  [lang === "ar" ? "الافتتاح" : "Open", latestBar.open],
                  [lang === "ar" ? "الأعلى" : "High", latestBar.high],
                  [lang === "ar" ? "الأدنى" : "Low", latestBar.low],
                  [lang === "ar" ? "الإغلاق" : "Close", latestBar.close],
                ].map(([label, value]) => <span key={String(label)}><small>{label}</small><b>{Number(value).toFixed(2)}</b></span>)}
              </div>
            ) : null}
            {symbol && bars.length > 1 ? (
              <button
                type="button"
                className={styles.crEnlargeBtn}
                onClick={() => setChartFull(true)}
                aria-label={lang === "ar" ? "تكبير الرسم" : "Enlarge chart"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              </button>
            ) : null}
          </div>
          <div className={styles.crChartArea}>
            {bars.length > 1
              ? <CandleChart rows={bars} height={192} lang={lang} />
              : <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا توجد بيانات تاريخية كافية" : "Not enough historical data"}</div>}
          </div>
          <div className={styles.tfBar}>{["1M", "3M", "6M", "1Y", "3Y", "MAX"].map((x) => <button key={x} className={tf === x ? styles.on : undefined} onClick={() => setTf(x)}>{x}</button>)}</div>
        </div>
        <div className={styles.statGrid}>
          <DataStat label={lang === "ar" ? "القيمة السوقية" : "Market Cap"} value={marketCap ? compact(marketCap, lang) : "—"} tone="brand" />
          <DataStat label="P/E" value={peRatio ? `${peRatio.toFixed(2)}x` : "—"} />
          <DataStat label={lang === "ar" ? "العائد النقدي" : "Dividend Yield"} value={pctRatio(dividendYield)} tone="up" />
          <DataStat label="Beta" value={beta ? beta.toFixed(2) : "—"} />
        </div>
        <div className={styles.segment}>
          <Pill active={tab === "overview"} onClick={() => setTab("overview")}>{lang === "ar" ? "نظرة" : "Overview"}</Pill>
          <Pill active={tab === "financials"} onClick={() => setTab("financials")}>{lang === "ar" ? "القوائم" : "Financials"}</Pill>
          <Pill active={tab === "technicals"} onClick={() => setTab("technicals")}>{lang === "ar" ? "الفني والتوقعات" : "Technicals & Forecasts"}</Pill>
          <Pill active={tab === "seasonals"} onClick={() => setTab("seasonals")}>{lang === "ar" ? "الموسمية" : "Seasonals"}</Pill>
          <Pill active={tab === "ownership"} onClick={() => setTab("ownership")}>{lang === "ar" ? "الملكية" : "Ownership"}</Pill>
          <Pill active={tab === "actions"} onClick={() => setTab("actions")}>{lang === "ar" ? "الإجراءات" : "Actions"}</Pill>
        </div>
        {tab === "overview" && (
          <>
            <SectionHead title={lang === "ar" ? "إشارات السعر" : "Price Signals"} />
            <div className={styles.statGrid}>
              <DataStat label={lang === "ar" ? `زخم ${tf}` : `${tf} Momentum`} value={`${tfMomentum >= 0 ? "+" : ""}${tfMomentum.toFixed(1)}%`} tone={tfMomentum >= 0 ? "up" : "down"} />
              <DataStat label={lang === "ar" ? "التذبذب" : "Volatility"} value={tfVol === undefined ? "—" : `${tfVol.toFixed(1)}%`} />
              <DataStat label={lang === "ar" ? "موقع النطاق" : "Range Position"} value={rangePct === undefined ? "—" : `${rangePct.toFixed(0)}%`} tone="brand" />
              <DataStat label={lang === "ar" ? "الاتجاه" : "Trend"} value={chartCloses.length > 1 ? (tfTrendUp ? (lang === "ar" ? "صاعد" : "Uptrend") : (lang === "ar" ? "هابط" : "Downtrend")) : "—"} tone={tfTrendUp ? "up" : "down"} />
            </div>
            {rangePct !== undefined ? (
              <div className={styles.rangeBar}>
                <div className={styles.ends}>
                  <span>{lang === "ar" ? `أدنى ${tf}` : `${tf} Low`} <b>{chartLow?.toFixed(2)}</b></span>
                  <span>{lang === "ar" ? `أعلى ${tf}` : `${tf} High`} <b>{chartHigh?.toFixed(2)}</b></span>
                </div>
                <div className={styles.rangeTrack}><i style={{ width: `${Math.max(0, Math.min(100, rangePct)).toFixed(0)}%` }} /><b style={{ left: `${Math.max(0, Math.min(100, rangePct)).toFixed(0)}%` }} /></div>
                <p className={styles.rangeNote}>{lang === "ar" ? `السعر الحالي عند ${rangePct.toFixed(1)}% من نطاق ${tf}.` : `Current price is at ${rangePct.toFixed(1)}% of the ${tf} range.`}</p>
              </div>
            ) : null}
            <div className={styles.companyMetricPanel}>
              <div className={styles.panelTitle}>
                <strong>{lang === "ar" ? "مؤشرات التداول" : "Trading snapshot"}</strong>
                <span>{lang === "ar" ? "من صفحة السهم" : "Matched to website profile"}</span>
              </div>
              <div className={styles.profileFactsGrid}>
                <DataStat label={lang === "ar" ? "متوسط ٥٠ يوم" : "50D MA"} value={ma50 ? `${ma50.toFixed(2)} ${currency}` : "—"} />
                <DataStat label={lang === "ar" ? "متوسط ٢٠٠ يوم" : "200D MA"} value={ma200 ? `${ma200.toFixed(2)} ${currency}` : "—"} />
                <DataStat label="RSI 14" value={rsi ? rsi.toFixed(1) : "—"} tone={rsi && rsi > 70 ? "down" : rsi && rsi < 30 ? "up" : undefined} />
                <DataStat label={lang === "ar" ? "الحجم النسبي" : "Rel. Volume"} value={relativeVolume ? `${relativeVolume.toFixed(2)}x` : "—"} />
                <DataStat label={lang === "ar" ? "عائد ٥٢ أسبوع" : "52W Return"} value={pctRatio(price52w)} tone={price52w === undefined ? undefined : price52w >= 0 ? "up" : "down"} />
                <DataStat label={lang === "ar" ? "متوسط الحجم" : "Avg Vol 20D"} value={avgVolume20d ? compact(avgVolume20d, lang) : "—"} />
              </div>
            </div>
            <div className={styles.profileFactsGrid}>
              <DataStat label={lang === "ar" ? "القطاع" : "Sector"} value={stock.sector || "—"} />
              <DataStat label={lang === "ar" ? "الصناعة" : "Industry"} value={industry || "—"} />
              <DataStat label={lang === "ar" ? "الموظفون" : "Employees"} value={employees === undefined ? "—" : compact(employees, lang)} />
              <DataStat label={lang === "ar" ? "التأسيس" : "Founded"} value={yearFounded || "—"} />
              <DataStat label={lang === "ar" ? "الموقع" : "Website"} value={website ? website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "—"} />
              <DataStat label={lang === "ar" ? "الهاتف" : "Phone"} value={phone || "—"} />
            </div>
            <div className={styles.legalStack}>
              {officers.length ? (
                <article>
                  <strong>{lang === "ar" ? "الإدارة والقيادة" : "Management & Leadership"}</strong>
                  <div className={styles.officerGrid}>
                    {officers.map((officer, index) => (
                      <div key={`${String(officer.name ?? "")}-${index}`} className={styles.officerCard}>
                        <span>{String(officer.name ?? "?").slice(0, 1)}</span>
                        <div><b>{String(officer.name ?? "—")}</b><small>{String(officer.position ?? "")}</small></div>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {newsTvItems.length ? (
                <article>
                  <strong>{lang === "ar" ? "أخبار مرتبطة" : "Related stories"}</strong>
                  <div className={styles.relatedMiniList}>
                    {newsTvItems.map((item, i) => {
                      const headline = firstString(item, ["headline"], "");
                      const source = firstString(item, ["source", "origin"], "");
                      const when = formatDate(item.published_at, lang);
                      const meta = [source, when === "—" ? "" : when].filter(Boolean).join(" · ");
                      return (
                        <div key={`${headline.slice(0, 24)}-${i}`} className={styles.relatedTvRow}>
                          <span className={styles.relatedHeadline}>{headline}</span>
                          {meta ? <small className={styles.relatedMeta}>{meta}</small> : null}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ) : related.length ? (
                <article>
                  <strong>{lang === "ar" ? "أخبار مرتبطة" : "Related stories"}</strong>
                  <div className={styles.relatedMiniList}>
                    {related.map((item) => <button key={item.id} onClick={() => nav.push("article", { id: item.id })}>{item.headline}<Icon name="chevron-right" size={14} /></button>)}
                  </div>
                </article>
              ) : null}
              {address ? <article><strong>{lang === "ar" ? "العنوان" : "Address"}</strong><p>{address}</p></article> : null}
            </div>
          </>
        )}
        {tab === "financials" && (
          <>
            <div className={styles.statGrid}>
              <DataStat label="Revenue TTM" value={revenueTtm ? compact(revenueTtm, lang) : formatLarge(latestFinancial.revenue, lang)} />
              <DataStat label="Net Income TTM" value={netIncomeTtm ? compact(netIncomeTtm, lang) : formatLarge(latestFinancial.net_income, lang)} tone="brand" />
              <DataStat label="EPS TTM" value={epsTtm ? `${currency} ${epsTtm.toFixed(2)}` : "—"} />
              <DataStat label="BVPS" value={bvps ? `${currency} ${bvps.toFixed(2)}` : "—"} />
              <DataStat label="P/B" value={pbRatio ? `${pbRatio.toFixed(2)}x` : "—"} />
              <DataStat label="Forward P/E" value={forwardPe ? `${forwardPe.toFixed(2)}x` : "—"} />
              <DataStat label="ROE" value={pctRatio(roe)} />
              <DataStat label="ROA" value={pctRatio(roa)} />
              <DataStat label="Profit Margin" value={pctRatio(profitMargin)} />
              <DataStat label="Operating Margin" value={pctRatio(operatingMargin)} />
              <DataStat label="Total Debt" value={totalDebt ? compact(totalDebt, lang) : "—"} />
              <DataStat label="Net Cash" value={netCash ? compact(netCash, lang) : "—"} tone={netCash && netCash > 0 ? "up" : undefined} />
            </div>
            {/* TradingView-native annual summary (revenue, net income, EPS, assets, debt). */}
            <SectionHead title={lang === "ar" ? "الملخص السنوي" : "Annual Summary"} />
            {tvFinancialYears.length ? (
              <div className={styles.tvFinTable}>
                <div className={cx(styles.tvFinRow, styles.tvFinHead)}>
                  <span>{lang === "ar" ? "السنة" : "Year"}</span>
                  <span>{lang === "ar" ? "الإيرادات" : "Revenue"}</span>
                  <span>{lang === "ar" ? "صافي الدخل" : "Net Inc."}</span>
                  <span>EPS</span>
                  <span>{lang === "ar" ? "الأصول" : "Assets"}</span>
                  <span>{lang === "ar" ? "الديون" : "Debt"}</span>
                </div>
                {tvFinancialYears.map((row, i) => {
                  const eps = optionalNumber(row.eps_diluted);
                  return (
                    <div key={`${String(row.fiscal_year ?? i)}-${i}`} className={styles.tvFinRow}>
                      <span><b>{String(row.fiscal_year ?? "—")}</b></span>
                      <span>{formatLarge(row.revenue, lang)}</span>
                      <span>{formatLarge(row.net_income, lang)}</span>
                      <span>{eps === undefined ? "-" : eps.toFixed(2)}</span>
                      <span>{formatLarge(row.total_assets, lang)}</span>
                      <span>{formatLarge(row.total_debt, lang)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyPanel text={lang === "ar" ? "لا توجد بيانات مالية متاحة لهذا الرمز حالياً." : "No financial data is available for this symbol yet."} />}
          </>
        )}
        {tab === "technicals" && (
          <>
            {tvTech1D ? (
              <>
                <div className={styles.companyMetricPanel}>
                  <div className={styles.panelTitle}>
                    <strong>{lang === "ar" ? "التوصية الفنية" : "Technical Rating"}</strong>
                    <span>{lang === "ar" ? "إطار يومي · TradingView" : "1D · TradingView"}</span>
                  </div>
                  <div className={cx(styles.tvRating, techRec.tone === "up" ? styles.up : techRec.tone === "down" ? styles.down : undefined)}>
                    {lang === "ar" ? techRec.ar : techRec.en}
                  </div>
                </div>
                <div className={styles.tableStack}>
                  {techIndicators.map((item) => (
                    <div key={item.label} className={styles.financialRow}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : <EmptyPanel text={lang === "ar" ? "لا توجد بيانات فنية متاحة لهذا الرمز حالياً." : "No technical data is available for this symbol yet."} />}
          </>
        )}
        {tab === "technicals" && (
          <>
            {/* Forecasts — merged into the Technicals & Forecasts tab */}
            {estimatesCovered ? (
              <>
                <div className={styles.statGrid}>
                  <DataStat label={lang === "ar" ? "متوسط الهدف" : "Avg Target"} value={targetAvg !== undefined ? `${currency} ${targetAvg.toFixed(2)}` : "—"} tone="brand" />
                  <DataStat label={lang === "ar" ? "الصعود المحتمل" : "Upside"} value={targetUpside === undefined ? "—" : `${targetUpside >= 0 ? "+" : ""}${targetUpside.toFixed(1)}%`} tone={targetUpside === undefined ? undefined : targetUpside >= 0 ? "up" : "down"} />
                  <DataStat label={lang === "ar" ? "أدنى هدف" : "Low Target"} value={targetLow !== undefined ? `${currency} ${targetLow.toFixed(2)}` : "—"} />
                  <DataStat label={lang === "ar" ? "أعلى هدف" : "High Target"} value={targetHigh !== undefined ? `${currency} ${targetHigh.toFixed(2)}` : "—"} />
                </div>
                {targetAvg !== undefined && targetHigh !== undefined && targetLow !== undefined && targetHigh > targetLow ? (
                  <div className={styles.rangeBar}>
                    <div className={styles.ends}>
                      <span>{lang === "ar" ? "أدنى" : "Low"} <b>{targetLow.toFixed(2)}</b></span>
                      <span>{lang === "ar" ? "أعلى" : "High"} <b>{targetHigh.toFixed(2)}</b></span>
                    </div>
                    <div className={styles.rangeTrack}>
                      <i style={{ width: `${Math.max(0, Math.min(100, ((stock.price - targetLow) / (targetHigh - targetLow)) * 100)).toFixed(0)}%` }} />
                      <b style={{ left: `${Math.max(0, Math.min(100, ((targetAvg - targetLow) / (targetHigh - targetLow)) * 100)).toFixed(0)}%` }} />
                    </div>
                    <p className={styles.rangeNote}>{lang === "ar" ? `متوسط هدف المحللين ${targetAvg.toFixed(2)} ${currency} مقابل السعر الحالي ${stock.price.toFixed(2)}.` : `Analyst average target ${targetAvg.toFixed(2)} ${currency} vs current ${stock.price.toFixed(2)}.`}</p>
                  </div>
                ) : null}
                <div className={styles.companyMetricPanel}>
                  <div className={styles.panelTitle}>
                    <strong>{lang === "ar" ? "توصيات المحللين" : "Analyst Ratings"}</strong>
                    <span>{recTotal} {lang === "ar" ? "محلل" : "analysts"}</span>
                  </div>
                  <div className={styles.profileFactsGrid}>
                    <DataStat label={lang === "ar" ? "شراء" : "Buy"} value={String(recBuySide)} tone="up" />
                    <DataStat label={lang === "ar" ? "محايد" : "Hold"} value={String(recHold)} />
                    <DataStat label={lang === "ar" ? "بيع" : "Sell"} value={String(recSellSide)} tone="down" />
                    <DataStat label={lang === "ar" ? "الإجمالي" : "Total"} value={String(recTotal)} tone="brand" />
                  </div>
                </div>
                <div className={styles.statGrid}>
                  <DataStat label={lang === "ar" ? "ربحية السهم (ربع قادم)" : "EPS Next Q"} value={epsNextFq !== undefined ? `${currency} ${epsNextFq.toFixed(2)}` : "—"} />
                  <DataStat label={lang === "ar" ? "الإيرادات (ربع قادم)" : "Rev Next Q"} value={revNextFq !== undefined ? compact(revNextFq, lang) : "—"} />
                  <DataStat label={lang === "ar" ? "ربحية السهم (سنة قادمة)" : "EPS Next FY"} value={epsNextFy !== undefined ? `${currency} ${epsNextFy.toFixed(2)}` : "—"} />
                </div>
              </>
            ) : <EmptyPanel text={lang === "ar" ? "لا توجد تغطية من المحللين لهذا الرمز." : "No analyst coverage for this symbol."} />}
          </>
        )}
        {tab === "seasonals" && (
          <>
            {seasonalAvailable ? (
              <>
                <div className={styles.companyMetricPanel}>
                  <div className={styles.panelTitle}>
                    <strong>{lang === "ar" ? "الموسمية الشهرية" : "Monthly Seasonality"}</strong>
                    <span>{lang === "ar" ? `تاريخ ${toNumber(seasonals?.years_covered)} سنوات` : `${toNumber(seasonals?.years_covered)}-year history`}</span>
                  </div>
                  <div className={styles.seasonalChart}>
                    {seasonalMonths.map((m) => {
                      const avg = toNumber(m.avg_return);
                      const up = avg >= 0;
                      const height = Math.max(6, Math.round((Math.abs(avg) / seasonalMax) * 100));
                      return (
                        <div key={m.month} className={styles.seasonalCol} title={`${m.label} ${avg >= 0 ? "+" : ""}${avg.toFixed(1)}%`}>
                          <b className={cx(styles.seasonalVal, up ? styles.up : styles.down)}>{avg >= 0 ? "+" : ""}{avg.toFixed(1)}</b>
                          <i className={cx(styles.seasonalBar, up ? styles.up : styles.down)} style={{ height: `${height}%` }} />
                          <small className={styles.seasonalLabel}>{m.label}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.tableStack}>
                  <div className={styles.financialRow}>
                    <span>{lang === "ar" ? "أفضل شهر" : "Best Month"}</span>
                    <strong className={styles.up}>{seasonalBest ? `${seasonalBest.label} · ${toNumber(seasonalBest.avg_return) >= 0 ? "+" : ""}${toNumber(seasonalBest.avg_return).toFixed(1)}%` : "—"}</strong>
                  </div>
                  <div className={styles.financialRow}>
                    <span>{lang === "ar" ? "أضعف شهر" : "Weakest Month"}</span>
                    <strong className={styles.down}>{seasonalWorst ? `${seasonalWorst.label} · ${toNumber(seasonalWorst.avg_return) >= 0 ? "+" : ""}${toNumber(seasonalWorst.avg_return).toFixed(1)}%` : "—"}</strong>
                  </div>
                  <div className={styles.financialRow}>
                    <span>{lang === "ar" ? "الأكثر ثباتاً" : "Most Consistent"}</span>
                    <strong>{seasonalConsistent ? `${seasonalConsistent.label} · ${toNumber(seasonalConsistent.positive_rate).toFixed(0)}%` : "—"}</strong>
                  </div>
                </div>
              </>
            ) : <EmptyPanel text={lang === "ar" ? "لا يوجد تاريخ أسعار كافٍ لحساب الموسمية." : "Not enough price history for seasonality"} />}
          </>
        )}
        {tab === "ownership" && (
          <>
            <div className={styles.statGrid}>
              <DataStat label={lang === "ar" ? "الأسهم القائمة" : "Shares Out"} value={sharesOutstanding ? compact(sharesOutstanding, lang) : "—"} />
              <DataStat label={lang === "ar" ? "الأسهم الحرة" : "Float"} value={floatShares ? compact(floatShares, lang) : "—"} />
              <DataStat label={lang === "ar" ? "ملكية المؤسسات" : "Institutional"} value={pctRatio(institutionalOwnership)} tone="brand" />
              <DataStat label={lang === "ar" ? "ملكية المطلعين" : "Insider"} value={pctRatio(insiderOwnership)} />
            </div>
            <div className={styles.tableStack}>
              {bundle.shareholders.length ? bundle.shareholders.map((holder, i) => {
                const name = lang === "ar" && holder.shareholder_name_ar ? holder.shareholder_name_ar : holder.shareholder_name_en;
                const percent = toNumber(holder.ownership_percent);
                const shares = firstNumber(holder, ["shares_held"]);
                return (
                  <div key={`${name}-${i}`} className={styles.ownerRow}>
                    <div><strong>{String(name ?? "—")}</strong><small>{shares ? `${compact(shares, lang)} ${lang === "ar" ? "سهم" : "shares"}` : String(holder.shareholder_type ?? "")}</small></div>
                    <span>{percent ? `${percent.toFixed(2)}%` : "—"}</span>
                    <i><b style={{ width: `${Math.min(100, percent)}%` }} /></i>
                  </div>
                );
              }) : <EmptyPanel text={lang === "ar" ? "لا توجد بيانات ملكية متاحة لهذا الرمز حالياً." : "No ownership rows are available for this symbol yet."} />}
            </div>
          </>
        )}
        {tab === "actions" && (
          <>
            <div className={styles.statGrid}>
              <DataStat label="DPS" value={dps ? `${currency} ${dps.toFixed(2)}` : "—"} tone="up" />
              <DataStat label={lang === "ar" ? "العائد النقدي" : "Dividend Yield"} value={pctRatio(dividendYield)} tone="up" />
              <DataStat label={lang === "ar" ? "نسبة التوزيع" : "Payout Ratio"} value={pctRatio(firstNumber(stats, ["payout_ratio"]))} />
              <DataStat label={lang === "ar" ? "إجمالي الإجراءات" : "Actions"} value={String(bundle.actions.length)} />
            </div>
            <div className={styles.tableStack}>
              {bundle.actions.length ? bundle.actions.slice(0, 10).map((action, i) => (
                <div key={`${action.id}-${i}`} className={styles.financialRow}>
                  <span>{String(action.action_type ?? "Action")}</span>
                  <strong>{action.amount ? `${action.amount} ${action.currency ?? "EGP"}` : String(action.description ?? "—")}</strong>
                  <small>{formatDate(action.ex_date ?? action.announcement_date, lang)}</small>
                </div>
              )) : <EmptyPanel text={lang === "ar" ? "لا توجد إجراءات أو توزيعات متاحة لهذا الرمز حالياً." : "No corporate actions or dividends are available for this symbol yet."} />}
            </div>
          </>
        )}
      </div>
      <AnimatePresence>
        {chartFull && symbol ? (
          <ChartFullscreen symbol={symbol} lang={lang} onClose={() => setChartFull(false)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function formatLarge(value: unknown, lang: Lang) {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return "—";
  return compact(n, lang);
}

// Maps a TradingView recommend_all score (-1..1) to a verdict — same thresholds
// the website /symbol page uses (>=.5 Strong Buy … <=-.5 Strong Sell).
function recVerdict(value: number | undefined): { en: string; ar: string; tone?: "up" | "down" } {
  if (value === undefined || !Number.isFinite(value)) return { en: "Neutral", ar: "محايد" };
  if (value >= 0.5) return { en: "Strong Buy", ar: "شراء قوي", tone: "up" };
  if (value >= 0.1) return { en: "Buy", ar: "شراء", tone: "up" };
  if (value <= -0.5) return { en: "Strong Sell", ar: "بيع قوي", tone: "down" };
  if (value <= -0.1) return { en: "Sell", ar: "بيع", tone: "down" };
  return { en: "Neutral", ar: "محايد" };
}

function EmptyPanel({ text }: { text: string }) {
  return <div className={styles.emptyPanel}>{text}</div>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];
}

function richProfile(fund: Fund) {
  return asRecord(asRecord(fund.raw?.rich_profile).azimut);
}

function richText(item: Record<string, unknown>, key: string, lang: Lang) {
  return firstString(item, lang === "ar" ? [`${key}_ar`, `${key}_en`, key] : [`${key}_en`, `${key}_ar`, key], "");
}

const FUND_ALLOC_PALETTE = ["var(--c-brand)", "var(--c-info)", "#a78bfa", "var(--c-warn)", "#f472b6", "#34d399", "#fbbf24", "#fb7185"];

// Premium donut + legend for a fund's published asset allocation.
function FundAllocationChart({ items, lang }: { items: Record<string, unknown>[]; lang: Lang }) {
  const rows = items.map((item, i) => ({
    key: richText(item, "key", lang),
    value: toNumber(item.value),
    color: typeof item.color === "string" && item.color.trim() ? String(item.color) : FUND_ALLOC_PALETTE[i % FUND_ALLOC_PALETTE.length],
  }));
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const nonZero = sorted.filter((r) => r.value > 0);
  const total = nonZero.reduce((s, r) => s + r.value, 0) || 1;
  const R = 38;
  const C = 2 * Math.PI * R;
  const GAP = nonZero.length > 1 ? 2.6 : 0; // small gap between slices for a segmented look
  let acc = 0;
  const arcs = nonZero.map((seg) => {
    const len = (seg.value / total) * C;
    const dash = Math.max(0.5, len - GAP);
    const offset = -acc;
    acc += len;
    return { color: seg.color, dash, offset };
  });
  const top = nonZero[0];
  return (
    <div className={styles.fundAllocCard}>
      <div className={styles.fundAllocDonutWrap}>
        <svg viewBox="0 0 100 100" className={styles.fundAllocDonut} aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--c-surface-2)" strokeWidth="11" />
          {arcs.map((a, i) => (
            <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={a.color} strokeWidth="11"
              strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={a.offset} strokeLinecap="round" transform="rotate(-90 50 50)" />
          ))}
        </svg>
        <div className={styles.fundAllocCenter}>
          <b>{top ? `${top.value.toFixed(0)}%` : "—"}</b>
          <span>{top ? top.key : (lang === "ar" ? "التوزيع" : "Asset mix")}</span>
        </div>
      </div>
      <div className={styles.fundAllocLegend}>
        {sorted.map((r2, i) => (
          <div key={`${r2.key}-${i}`} className={cx(styles.fundAllocLegRow, r2.value === 0 && styles.fundAllocLegMuted)}>
            <i style={{ background: r2.color }} />
            <span>{r2.key}</span>
            <strong>{r2.value.toFixed(0)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundDetail({ nav, lang, fund }: { nav: NavController; lang: Lang; fund?: Fund }) {
  const [series, setSeries] = useState<number[]>([]);
  const [tab, setTab] = useState<"profile" | "allocation" | "rules" | "docs">("profile");
  const fundId = fund?.id;
  useEffect(() => {
    if (!fundId) return;
    let alive = true;
    loadFundNav(fundId).then((s) => { if (alive) setSeries(s); });
    return () => { alive = false; };
  }, [fundId]);
  if (!fund) return null;
  const navSeries = series.length > 1 ? series : fund.trend;
  const hasNavHistory = navSeries.length > 1;
  const rich = richProfile(fund);
  const allocation = asRecords(asRecord(rich.allocation).assets);
  const managers = asRecords(rich.managers);
  const docs = [...asRecords(lang === "ar" ? rich.documents_ar : rich.documents), ...asRecords(rich.documents)].filter((doc, i, arr) => {
    const url = String(doc.url ?? "");
    return url && arr.findIndex((x) => String(x.url ?? "") === url) === i;
  });
  const distributors = asRecords(rich.distributors);
  const details = asRecords(rich.details);
  const objective = firstString(rich, lang === "ar" ? ["objective_ar", "objective_en"] : ["objective_en", "objective_ar"], "") || fund.objective || fund.strategy;
  const rangeRet = navSeries.length > 1 ? ((navSeries[navSeries.length - 1] - navSeries[0]) / navSeries[0]) * 100 : fund.ytd;
  return (
    <>
      <PushTop title={lang === "ar" ? "تفاصيل الصندوق" : "Fund Detail"} sub={`${fundTypeLabel(fund, lang)} · ${fund.currency ?? "EGP"}`} onBack={nav.pop} action={<button className={styles.iconBtn2} aria-label={copy[lang].compare} onClick={() => nav.push("compare", { ids: [fund.id] })}><Icon name="git-compare" /></button>} />
      <div className={styles.content}>
        <div className={styles.fundDetailHero}>
          <span className={styles.liveTag}><i />{lang === "ar" ? "بيانات حية" : "LIVE DATA"}</span>
          <h1>{fundLabel(fund, lang)}</h1>
          <p>{fundHouseLabel(fund, lang)} · {fund.shariah ? (lang === "ar" ? "متوافق مع الشريعة" : "Shariah compliant") : fundTypeLabel(fund, lang)}</p>
        </div>
        <div className={styles.heroCard}>
          <div className={styles.heroTopRow}>
            <span className={styles.lblMono}>NAV / UNIT</span>
            <Delta value={rangeRet} />
          </div>
          <div className={styles.bigNum}>{fund.nav ? fund.nav.toFixed(2) : "—"} <span className={styles.unit}>{fund.currency ?? "EGP"}</span></div>
          <div className={styles.chartFull}>
            {hasNavHistory
              ? <MiniChart data={navSeries} color={rangeRet >= 0 ? "var(--c-brand)" : "var(--c-down)"} height={118} grid dot />
              : <div className={styles.navHistoryEmpty}>{lang === "ar" ? "لا يوجد سجل NAV كافٍ لرسم الرسم البياني." : "Not enough NAV history to draw a chart."}</div>}
          </div>
          <div className={styles.legendRow}>
            <span><i style={{ background: "var(--c-brand)" }} />{lang === "ar" ? "آخر تحديث" : "Updated"} {formatDate(fund.lastNavDate || fund.lastUpdateDate, lang)}</span>
          </div>
        </div>
        <div className={styles.segBar}>
          {[
            ["profile", lang === "ar" ? "الملف" : "Profile"],
            ["allocation", lang === "ar" ? "التوزيع" : "Allocation"],
            ["rules", lang === "ar" ? "القواعد" : "Rules"],
            ["docs", lang === "ar" ? "المستندات" : "Docs"],
          ].map(([id, label]) => <button key={id} className={tab === id ? styles.on : undefined} onClick={() => setTab(id as typeof tab)}>{label}</button>)}
        </div>
        {tab === "profile" ? (
          <>
            <div className={styles.fundReturnGrid}>
              {(["1M", "3M", "YTD", "1Y", "3Y", "All"] as const).map((key) => {
                const ret = fundReturn(fund, key);
                return <DataStat key={key} label={key} value={ret === undefined ? "—" : pct(ret, 1)} tone={ret === undefined ? undefined : ret >= 0 ? "up" : "down"} />;
              })}
            </div>
            <div className={styles.legalStack}>
              <article><strong>{lang === "ar" ? "أطروحة الاستثمار" : "Investment thesis"}</strong><p>{objective || (lang === "ar" ? "يعرض Starta الصندوق حسب البيانات المتاحة: العائد، NAV، المخاطر، السيولة، والحد الأدنى للاستثمار." : "Starta presents the available fund profile: return, NAV, risk, liquidity, and minimum investment.")}</p></article>
              <article><strong>{lang === "ar" ? "تفاصيل أساسية" : "Core details"}</strong><p>{[fund.benchmark && `${lang === "ar" ? "المؤشر" : "Benchmark"}: ${fund.benchmark}`, fund.eligibility && `${lang === "ar" ? "الأهلية" : "Eligibility"}: ${fund.eligibility}`, fund.isin && `ISIN: ${fund.isin}`].filter(Boolean).join(" · ") || (lang === "ar" ? "سيتم عرض تفاصيل إضافية عند توفرها في البيانات." : "Additional verified profile fields appear here when available.")}</p></article>
            </div>
          </>
        ) : null}
        {tab === "allocation" ? (
          allocation.length ? (
            <FundAllocationChart items={allocation} lang={lang} />
          ) : <EmptyPanel text={lang === "ar" ? "لا يوجد توزيع أصول منشور لهذا الصندوق حالياً." : "No published asset allocation is available for this fund yet."} />
        ) : null}
        {tab === "rules" ? (
          <div className={styles.legalStack}>
            {details.length ? details.map((item, i) => <article key={i}><strong>{richText(item, "key", lang)}</strong><p>{richText(item, "value", lang)}</p></article>) : null}
            <article><strong>{lang === "ar" ? "الشراء والاسترداد" : "Buying and selling"}</strong><p>{lang === "ar" ? `السيولة: ${fund.liquidity}. الحد الأدنى: ${fund.min}. رسوم الإدارة: ${fund.expense}.` : `Liquidity: ${fund.liquidity}. Minimum subscription: ${fund.min}. Management fee: ${fund.expense}.`}</p></article>
            <article><strong>{lang === "ar" ? "إفصاح المخاطر" : "Risk disclosure"}</strong><p>{fund.risk === undefined ? (lang === "ar" ? "مستوى المخاطر غير منشور في البيانات الحالية. لا يعرض التطبيق تقديراً بديلاً." : "Risk level is not published in the current feed. The app does not display an estimated substitute.") : (lang === "ar" ? `مستوى المخاطر ${fund.risk} من 4. العوائد السابقة وNAV التاريخي لا يضمنان الأداء المستقبلي.` : `Risk level ${fund.risk} of 4. Prior returns and historical NAV do not guarantee future performance.`)}</p></article>
          </div>
        ) : null}
        {tab === "docs" ? (
          <>
            {managers.length ? <><SectionHead title={lang === "ar" ? "مديرو المحفظة" : "Portfolio managers"} /><div className={styles.managerGrid}>{managers.map((item, i) => <div key={i} className={styles.managerCard}>{typeof item.img === "string" ? <img src={item.img} alt="" /> : <span>{richText(item, "name", lang).slice(0, 2)}</span>}<b>{richText(item, "name", lang)}</b><small>{richText(item, "title", lang)}</small></div>)}</div></> : null}
            {distributors.length ? <><SectionHead title={lang === "ar" ? "قنوات الشراء" : "Official distributors"} /><div className={styles.distributorGrid}>{distributors.map((item, i) => <a key={i} href={String(item.link ?? "#")} target="_blank" rel="noreferrer">{typeof item.logo === "string" ? <img src={item.logo} alt="" /> : null}<span>{richText(item, "name", lang)}</span></a>)}</div></> : null}
            {docs.length ? <><SectionHead title={lang === "ar" ? "النشرات والتقارير" : "Factsheets and prospectus"} /><div className={styles.docList}>{docs.map((item, i) => <a key={i} href={String(item.url).replace(/\\/g, "/")} target="_blank" rel="noreferrer"><Icon name="file-text" /><span>{richText(item, "name", lang) || (lang === "ar" ? "مستند صندوق" : "Fund document")}</span><Icon name="chevron-right" size={16} /></a>)}</div></> : <EmptyPanel text={lang === "ar" ? "لا توجد مستندات منشورة لهذا الصندوق حالياً." : "No published documents are available for this fund yet."} />}
          </>
        ) : null}
        <div className={styles.btnRow2}>
          <button className={cx(styles.btn2, styles.ghost)} onClick={() => nav.openAI(`Analyze mutual fund ${fundLabel(fund, "en")}`)}><AIGlyph /> {copy[lang].askAi}</button>
          <button className={cx(styles.btn2, styles.primary)} onClick={() => nav.push("compare", { ids: [fund.id] })}>{copy[lang].compare}</button>
        </div>
        <p className={styles.disclaimer}>{copy[lang].disclaimer}</p>
      </div>
    </>
  );
}

function ArticleDetail({ nav, lang, item, news }: { nav: NavController; lang: Lang; item?: NewsItem; news: NewsItem[] }) {
  if (!item) return null;
  const related = news.filter((story) => story.id !== item.id && (newsBucket(story) === newsBucket(item) || story.symbol === item.symbol)).slice(0, 3);
  return (
    <>
      <PushTop title={lang === "ar" ? "خبر السوق" : "Market Story"} sub={item.category} onBack={nav.pop} action={<button className={styles.iconBtn2} aria-label={lang === "ar" ? "حفظ" : "Save"}><Icon name="bookmark" /></button>} />
      <div className={styles.content}>
        <article className={styles.articleWrap2}>
          {/* Hero: cover image takes full card width */}
          <div className={styles.articleHeroImg}><NewsImage item={item} lang={lang} large /></div>
          <div className={styles.articleInner2}>
            <span className={styles.articleBadge2}>{item.category}{item.symbol ? ` · ${item.symbol}` : ""}</span>
            <h1 className={styles.articleH12}>{item.headline}</h1>
            <p className={styles.articleMeta2}>{[item.source, item.time].filter(Boolean).join(" · ")}</p>
            <div className={styles.articleDivider2} />
            {item.body.map((p, i) => <p key={i} className={styles.articlePara2}>{p.endsWith(".") || p.endsWith("؟") ? p : `${p}.`}</p>)}
          </div>
        </article>
        <button className={styles.newsAiCard2} onClick={() => nav.openAI(`Summarize this article: ${item.headline}`)}>
          <span><AIGlyph color="#fff" /></span>
          <div><b>{lang === "ar" ? "لخّص مع Starta AI" : "Summarize with Starta AI"}</b><small>{lang === "ar" ? "نقاط رئيسية ومخاطر مرتبطة" : "Key points and market context"}</small></div>
          <Icon name="chevron-right" />
        </button>
        {related.length ? (
          <>
            <SectionHead title={lang === "ar" ? "أخبار مرتبطة" : "Related stories"} />
            <div className={styles.newsList2}>{related.map((story) => <NewsRow key={story.id} item={story} lang={lang} onClick={() => nav.push("article", { id: story.id })} />)}</div>
          </>
        ) : null}
      </div>
    </>
  );
}

function CompareFunds({ nav, lang, funds, selectedIds }: { nav: NavController; lang: Lang; funds: Fund[]; selectedIds?: string[] }) {
  const initial = selectedIds?.length ? selectedIds : [];
  const [ids, setIds] = useState<string[]>(initial.slice(0, 4));
  const selected = ids.map((id) => funds.find((fund) => fund.id === id)).filter((fund): fund is Fund => !!fund);
  const selectedWithSeries = selected.filter((fund) => fund.trend.length > 1);
  const compareColors = ["var(--c-brand)", "var(--c-info)", "var(--c-warn)", "var(--c-up)"];
  const toggle = (id: string) => {
    setIds((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length >= 4 ? current : [...current, id]);
  };
  const rows = [
    [lang === "ar" ? "المدير" : "Manager", (fund: Fund) => fundHouseLabel(fund, lang)],
    [lang === "ar" ? "النوع" : "Type", (fund: Fund) => fundTypeLabel(fund, lang)],
    ["NAV", (fund: Fund) => `${fund.currency ?? "EGP"} ${fund.nav ? fund.nav.toFixed(2) : "—"}`],
    [lang === "ar" ? "عائد YTD" : "YTD return", (fund: Fund) => pct(fund.ytd, 1)],
    ["1Y", (fund: Fund) => fund.return1y === undefined ? "—" : pct(fund.return1y, 1)],
    ["3Y", (fund: Fund) => fund.return3y === undefined ? "—" : pct(fund.return3y, 1)],
    [lang === "ar" ? "المخاطر" : "Risk", (fund: Fund) => fund.risk === undefined ? (lang === "ar" ? "غير متاح" : "Unavailable") : `${fund.risk}/4`],
    [lang === "ar" ? "رسوم الإدارة" : "Management fee", (fund: Fund) => fund.expense],
    [lang === "ar" ? "الحد الأدنى" : "Minimum", (fund: Fund) => fund.min],
    [lang === "ar" ? "السيولة" : "Liquidity", (fund: Fund) => fund.liquidity],
    [lang === "ar" ? "آخر تحديث" : "Updated", (fund: Fund) => formatDate(fund.lastNavDate || fund.lastUpdateDate, lang)],
  ] as const;
  return (
    <>
      <PushTop title={copy[lang].compare} sub={lang === "ar" ? `${selected.length} / 4 محدد` : `${selected.length} / 4 selected`} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.fundChips}>
          {funds.map((fund) => (
            <button key={fund.id} className={ids.includes(fund.id) ? styles.on : undefined} onClick={() => toggle(fund.id)}>
              {fundLabel(fund, lang)}
            </button>
          ))}
        </div>
        {selected.length < 2 ? <EmptyPanel text={lang === "ar" ? "اختر صندوقين على الأقل للمقارنة." : "Choose at least two funds to compare."} /> : null}
        <div className={styles.compareHero2}>
          {selected.map((fund, i) => (
            <button key={fund.id} onClick={() => nav.push("fund", { id: fund.id })}>
              <span>{lang === "ar" ? "صندوق" : "Fund"} {i + 1}</span>
              <strong>{fundLabel(fund, lang)}</strong>
              <small>{fundHouseLabel(fund, lang)}</small>
              <Delta value={fund.ytd} />
            </button>
          ))}
        </div>
        {selected.length >= 2 ? (
          selectedWithSeries.length ? (
            <div className={styles.compareChart2}>
              <MultiLineChart series={selectedWithSeries.map((fund) => fund.trend)} colors={compareColors} height={118} />
              <div className={styles.compareLegend}>
                {selected.map((fund, i) => (
                  <span key={fund.id}><i style={{ background: compareColors[i] }} />{fundLabel(fund, lang)}</span>
                ))}
              </div>
              {selected.filter((fund) => fund.trend.length < 2).map((fund) => <div key={fund.id} className={styles.compareChartEmpty}>{fundLabel(fund, lang)} · {lang === "ar" ? "لا يوجد سجل NAV" : "No NAV history"}</div>)}
            </div>
          ) : <EmptyPanel text={lang === "ar" ? "الصناديق المحددة لا تحتوي على سجل NAV كافٍ للرسم البياني." : "The selected funds do not have enough NAV history for a comparison chart."} />
        ) : null}
        {selected.length >= 2 ? rows.map(([metric, getter]) => (
          <div key={metric} className={styles.compareRow2} style={{ gridTemplateColumns: `1.1fr repeat(${selected.length}, 1fr)` }}>
            <span>{metric}</span>
            {selected.map((fund) => <strong key={fund.id}>{getter(fund)}</strong>)}
          </div>
        )) : null}
        <p className={styles.disclaimer}>{copy[lang].disclaimer}</p>
      </div>
    </>
  );
}

function WatchRow({ stock, lang, onOpen, trailing }: { stock: Stock; lang: Lang; onOpen: () => void; trailing: React.ReactNode }) {
  const up = stock.changePct >= 0;
  return (
    <div className={styles.watchRow}>
      <button className={styles.watchMain} onClick={onOpen}>
        <StockLogo symbol={stock.symbol} className={styles.rowSym} />
        <div className={styles.rowWho}><b>{stock.symbol}</b><span>{stockLabel(stock, lang)}</span></div>
        <div className={styles.rowSpark}><MiniChart data={stock.trend} color={up ? "var(--c-up)" : "var(--c-down)"} height={30} /></div>
        <div className={styles.rowPx}><b>{stock.price.toFixed(2)}</b><span className={up ? styles.up : styles.down}>{pct(stock.changePct)}</span></div>
      </button>
      {trailing}
    </div>
  );
}

function Watchlist({ nav, lang, stocks, portfolio, search, isTab }: { nav: NavController; lang: Lang; stocks: Stock[]; portfolio: PortfolioPosition[]; search?: boolean; isTab?: boolean }) {
  const wl = useWatchlist();
  const [view, setView] = useState<"custom" | "portfolio">("custom");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(!!search);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const openSearch = () => {
    setView("custom");
    setSearchOpen(true);
  };
  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery("");
    } else {
      openSearch();
    }
  };

  const watched = wl.symbols
    .map((sym) => stocks.find((s) => s.symbol === sym))
    .filter((s): s is Stock => !!s);
  const q = query.trim().toLowerCase();
  const results = q
    ? stocks
        .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.nameAr ?? "").includes(query.trim()))
        .slice(0, 24)
    : [];
  // Mirror PortfolioScreen: fall back to the sample portfolio so the Portfolio
  // tab shows the same holdings as the main Portfolio page (never "no holdings").
  const activePortfolio = portfolio.length ? portfolio : buildDemoPortfolio(stocks);
  const holdings = activePortfolio
    .map((p) => ({ p, stock: stocks.find((s) => s.symbol === p.symbol) }))
    .filter((x): x is { p: PortfolioPosition; stock: Stock } => !!x.stock);

  const headerActions = (
    <>
      <button className={cx(styles.iconBtn2, searchOpen && styles.iconBtnOn)} aria-label={lang === "ar" ? "بحث" : "Search"} onClick={toggleSearch}><Icon name={searchOpen ? "x" : "search"} size={20} /></button>
      <button className={styles.iconBtn2} aria-label={lang === "ar" ? "إضافة رمز" : "Add symbol"} onClick={openSearch}><Icon name="plus" size={20} /></button>
    </>
  );
  const sub = lang === "ar" ? `${watched.length} رمز` : `${watched.length} symbols`;
  return (
    <>
      <MarketTopBar lang={lang} nav={nav} title={copy[lang].watchlist} sub={sub} actions={headerActions} />
      <div className={styles.content}>
        <div className={styles.segBar}>
          <button className={view === "custom" ? styles.on : undefined} onClick={() => setView("custom")}>{lang === "ar" ? "المخصصة" : "Custom"}</button>
          <button className={view === "portfolio" ? styles.on : undefined} onClick={() => setView("portfolio")}>{copy[lang].portfolio}</button>
        </div>

        {view === "custom" ? (
          <>
            {searchOpen ? (
              <label className={styles.search}>
                <Icon name="search" />
                <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "ar" ? "ابحث وأضف رمزاً" : "Search symbols to add"} />
                {query ? <button type="button" aria-label={lang === "ar" ? "مسح" : "Clear"} onClick={() => setQuery("")}><Icon name="x" size={16} /></button> : null}
              </label>
            ) : null}
            {q ? (
              results.length ? (
                results.map((s) => {
                  const added = wl.has(s.symbol);
                  return (
                    <WatchRow
                      key={s.symbol}
                      stock={s}
                      lang={lang}
                      onOpen={() => nav.openStock(s.symbol)}
                      trailing={
                        <button className={cx(styles.watchTrail, added ? styles.watchAdded : styles.watchAdd)} aria-label={added ? "remove" : "add"} onClick={() => wl.toggle(s.symbol)}>
                          <Icon name={added ? "check" : "plus"} size={20} />
                        </button>
                      }
                    />
                  );
                })
              ) : (
                <EmptyPanel text={lang === "ar" ? "لا توجد نتائج مطابقة." : "No matching symbols."} />
              )
            ) : watched.length ? (
              watched.map((s) => (
                <WatchRow
                  key={s.symbol}
                  stock={s}
                  lang={lang}
                  onOpen={() => nav.openStock(s.symbol)}
                  trailing={
                    <button className={styles.watchTrail} aria-label="remove" onClick={() => wl.toggle(s.symbol)}><Icon name="x" size={18} /></button>
                  }
                />
              ))
            ) : (
              <EmptyPanel text={lang === "ar" ? "قائمتك فارغة. ابحث عن رمز لإضافته." : "Your watchlist is empty. Search for a symbol to add it."} />
            )}
          </>
        ) : holdings.length ? (
          holdings.map(({ p, stock }) => (
            <WatchRow
              key={p.symbol}
              stock={stock}
              lang={lang}
              onOpen={() => nav.openStock(p.symbol)}
              trailing={
                <div className={styles.watchVal}><b>{money(p.value, lang, 0)}</b><span className={p.plPct >= 0 ? styles.up : styles.down}>{pct(p.plPct)}</span></div>
              }
            />
          ))
        ) : (
          <EmptyPanel text={lang === "ar" ? "لا توجد مراكز في المحفظة بعد." : "No portfolio holdings yet."} />
        )}
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

function Alerts({ nav, lang }: { nav: NavController; lang: Lang }) {
  return (
    <>
      <MarketTopBar lang={lang} nav={nav} title={copy[lang].alerts} sub={lang === "ar" ? "تنبيهات حقيقية فقط" : "Real alerts only"} />
      <div className={styles.content}>
        <EmptyPanel text={lang === "ar" ? "لا توجد تنبيهات محفوظة لهذا الجهاز حالياً. لن نعرض صفوفاً افتراضية داخل التطبيق." : "No alerts are configured on this device yet. Placeholder alert rows are not shown in the app."} />
      </div>
    </>
  );
}

function LearnScreen({ nav, lang, topics }: { nav: NavController; lang: Lang; topics: LearnTopic[] }) {
  const rows = topics.length ? topics : [];
  return (
    <>
      <MarketTopBar lang={lang} nav={nav} title={copy[lang].learn} sub={lang === "ar" ? "أكاديمية Starta" : "Starta Academy"} />
      <div className={styles.content}>
        <div className={styles.fundCards}>
          {rows.map((topic, i) => {
            const local = topic[lang];
            const cover = lang === "ar" ? topic.coverImageAr || topic.coverImageEn : topic.coverImageEn || topic.coverImageAr;
            return (
              <button key={topic.slug} className={styles.courseCard} onClick={() => nav.push("course", { slug: topic.slug })}>
                {cover ? <img className={styles.courseCover} src={cover} alt="" /> : <span className={styles.courseIcon}><Icon name={learnIcon(topic, i)} /></span>}
                <small>{String(i + 1).padStart(2, "0")} · {local.category}</small>
                <strong>{local.title}</strong>
                <p>{local.summary}</p>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CourseDetail({ nav, lang, topic }: { nav: NavController; lang: Lang; topic?: LearnTopic }) {
  if (!topic) return <LearnScreen nav={nav} lang={lang} topics={[]} />;
  const local = topic[lang];
  const cover = lang === "ar" ? topic.coverImageAr || topic.coverImageEn : topic.coverImageEn || topic.coverImageAr;
  return (
    <>
      <PushTop title={local.category} sub={local.readTime} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.detailHero}>
          {cover ? <img className={styles.detailHeroImage} src={cover} alt="" /> : <span><Icon name={learnIcon(topic, 0)} /></span>}
          <strong>{local.title}</strong>
          <p>{local.intro || local.summary}</p>
        </div>
        <div className={styles.listStack}>
          {(local.sections ?? []).map((section, i) => <div key={section.heading} className={styles.lessonRow}><span>{i + 1}</span><div>{section.image?.src ? <img className={styles.lessonImage} src={section.image.src} alt={section.image.alt || ""} /> : null}<strong>{section.heading}</strong><small>{section.body}</small>{section.image?.caption ? <em>{section.image.caption}</em> : null}{section.bullets?.length ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div></div>)}
        </div>
        <PrimaryButton onClick={() => nav.openAI(`Explain this Starta Learn topic: ${local.title}`)}><AIGlyph /> {copy[lang].askAi}</PrimaryButton>
      </div>
    </>
  );
}

function learnIcon(topic: LearnTopic, index: number) {
  const blob = `${topic.slug} ${topic.en?.title ?? ""} ${topic.en?.category ?? ""}`.toLowerCase();
  if (/fund|nav|dividend/.test(blob)) return "landmark";
  if (/risk|support|resistance/.test(blob)) return "triangle-alert";
  if (/trading|stock|market/.test(blob)) return "activity";
  return ["graduation-cap", "line-chart", "coins", "shield-check"][index % 4];
}

function Profile({ nav, lang, portfolio, user, onAuth, logout }: { nav: NavController; lang: Lang; portfolio: PortfolioPosition[]; user?: AuthUser | null; onAuth?: (s: "signin" | "signup") => void; logout?: () => void }) {
  const watchCount = readWatch().length;
  const displayName = user ? (user.full_name || user.email) : (lang === "ar" ? "زائر" : "Guest");
  const initial = (user ? (user.full_name || user.email || "S") : "S").trim().charAt(0).toUpperCase();
  const stats: Array<{ icon: string; label: string; value: string; onClick: () => void }> = [
    { icon: "wallet", label: lang === "ar" ? "المراكز" : "Positions", value: String(portfolio.length), onClick: () => nav.setTab("portfolio") },
    { icon: "star", label: lang === "ar" ? "المتابعة" : "Watchlist", value: String(watchCount), onClick: () => nav.push("watchlist") },
    { icon: "bell", label: lang === "ar" ? "التنبيهات" : "Alerts", value: "—", onClick: () => nav.push("alerts") },
    { icon: "graduation-cap", label: lang === "ar" ? "الدروس" : "Courses", value: "—", onClick: () => nav.push("learn") },
  ];
  return (
    <>
      <PushTop title={copy[lang].profile} onBack={nav.pop} action={<button className={styles.iconBtn2} aria-label={copy[lang].settings} onClick={() => nav.push("settings")}><Icon name="settings" size={20} /></button>} />
      <div className={styles.content}>
        <div className={styles.profileHero2}>
          <span className={styles.profileHeroGlow} aria-hidden="true" />
          <div className={styles.profileAvatar2}>{initial}</div>
          <strong className={styles.profileName2}>{displayName}</strong>
          {user ? <small className={styles.profileEmail}>{user.email}</small> : null}
          <div className={styles.profileChips}>
            <span className={styles.profileChip}>{lang === "ar" ? "خطة مجانية" : "Free plan"}</span>
            <span className={styles.profileChip}>{user ? (lang === "ar" ? "حساب موثّق" : "Verified account") : (lang === "ar" ? "زائر" : "Guest")}</span>
          </div>
          {user ? (
            <button className={styles.profileUpgrade} onClick={() => nav.push("subscription")}>
              <Icon name="crown" size={16} /> {lang === "ar" ? "الترقية إلى Analyst" : "Upgrade to Analyst"}
            </button>
          ) : (
            <button className={styles.profileUpgrade} onClick={() => onAuth?.("signup")}>
              {lang === "ar" ? "إنشاء حساب مجاني" : "Create free account"}
            </button>
          )}
        </div>
        <div className={styles.profileStatGrid}>
          {stats.map((s) => (
            <button key={s.label} className={styles.profileStatTile} onClick={s.onClick}>
              <span className={styles.profileStatIcon}><Icon name={s.icon} size={18} /></span>
              <span className={styles.profileStatText}><b>{s.value}</b><small>{s.label}</small></span>
            </button>
          ))}
        </div>
        {user ? (
          <button className={styles.profileSignout} onClick={() => { logout?.(); nav.pop(); }}>
            {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        ) : (
          <button className={styles.profileSigninRow} onClick={() => onAuth?.("signin")}>
            {lang === "ar" ? "لديك حساب؟ تسجيل الدخول" : "Already have an account? Sign in"}
          </button>
        )}
      </div>
    </>
  );
}

function SettingsScreen({ nav, lang, theme, setTheme, setLang }: { nav: NavController; lang: Lang; theme: Theme; setTheme: (theme: Theme) => void; setLang: (lang: Lang) => void }) {
  return (
    <>
      <MarketTopBar lang={lang} nav={nav} title={copy[lang].settings} sub={lang === "ar" ? "التفضيلات" : "Preferences"} />
      <div className={styles.content}>
        <ToggleRow icon={theme === "dark" ? "moon" : "sun"} label={copy[lang].darkMode} active={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
        <ToggleRow icon="languages" label={copy[lang].arabic} active={lang === "ar"} onClick={() => setLang(lang === "ar" ? "en" : "ar")} />
        <ToggleRow icon="bell" label={lang === "ar" ? "إشعارات فورية" : "Push notifications"} meta={lang === "ar" ? "غير مفعلة حتى يتم ربط خدمة الإشعارات" : "Not enabled until notification service is connected"} />
        <ToggleRow icon="fingerprint" label={lang === "ar" ? "الدخول بالبصمة" : "Biometric unlock"} meta={lang === "ar" ? "يعتمد على ربط تسجيل الدخول الأصلي" : "Requires native account sign-in integration"} />
      </div>
    </>
  );
}

function ToggleRow({ icon, label, active, meta, onClick }: { icon: string; label: string; active?: boolean; meta?: string; onClick?: () => void }) {
  const disabled = !onClick;
  return <button type="button" className={styles.toggleRow} onClick={onClick} disabled={disabled} role="switch" aria-checked={!!active} aria-disabled={disabled}><span><Icon name={icon} /></span><strong>{label}{meta ? <small>{meta}</small> : null}</strong><i className={active ? styles.switchOn : ""} /></button>;
}

function HelpScreen({ nav, lang }: { nav: NavController; lang: Lang }) {
  const rows = lang === "ar"
    ? [
        ["نطاق التطبيق", "يعرض التطبيق صفحات Starta العامة فقط: الأسواق، الصناديق، الأخبار، التعلم، والمحفظة."],
        ["البيانات", "كل الأرقام والرسوم تأتي من واجهات Starta الحية. عند غياب المصدر يظهر التطبيق حالة فارغة واضحة."],
        ["الدعم", "للاستفسارات استخدم قنوات Starta الرسمية على الموقع العام."],
      ]
    : [
        ["App scope", "The app mirrors Starta public sections only: Markets, Funds, News, Learn, and Portfolio."],
        ["Data", "Numbers and charts come from live Starta APIs. When a feed is missing, the app shows an explicit empty state."],
        ["Support", "For questions, use the official Starta contact channels on the public website."],
      ];
  return (
    <>
      <PushHeader title={lang === "ar" ? "المساعدة والدعم" : "Help & Support"} sub={lang === "ar" ? "إرشادات واضحة" : "Clear guidance"} onBack={nav.pop} />
      <div className={styles.content}>
        <div className={styles.legalStack}>
          {rows.map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}
        </div>
      </div>
    </>
  );
}

function Subscription({ nav, lang }: { nav: NavController; lang: Lang }) {
  // Feature matrix grounded in what the app actually ships today: live EGX data,
  // Starta AI, full company research (financials/ownership/actions), charts +
  // technical indicators, portfolio analytics, fund comparison, alerts, exports.
  const features = lang === "ar"
    ? [
        ["أسعار ومؤشر EGX اللحظية", "فوري", "فوري"],
        ["نبض السوق والأكثر حركة", "مشمول", "مشمول"],
        ["مساعد Starta AI", "5 محادثات/يوم", "غير محدود"],
        ["تحليل وموجز يومي بالذكاء", "—", "مشمول"],
        ["رموز قائمة المتابعة", "10", "غير محدود"],
        ["القوائم المالية للشركات", "آخر فترة", "كاملة + تاريخية"],
        ["النسب والملكية والإجراءات", "نسب أساسية", "كاملة"],
        ["الرسوم والمؤشرات الفنية", "حتى سنة", "كامل + إشارات"],
        ["تحليلات المحفظة والمخاطر", "التوزيع", "مخاطر + إسناد"],
        ["مقارنة الصناديق وسجل NAV", "—", "حتى 4 صناديق"],
        ["تنبيهات الأسعار والإشارات", "3", "غير محدود"],
        ["تصدير PDF / Excel", "—", "متقدم"],
      ]
    : [
        ["Live EGX prices & index", "Real-time", "Real-time"],
        ["Market Pulse & top movers", "Included", "Included"],
        ["Starta AI assistant", "5 chats / day", "Unlimited"],
        ["AI analysis & daily briefing", "—", "Included"],
        ["Watchlist symbols", "10", "Unlimited"],
        ["Company financials", "Latest period", "Full + history"],
        ["Ratios, ownership & actions", "Key ratios", "Complete"],
        ["Charts & technical indicators", "Up to 1Y", "Full + signals"],
        ["Portfolio analytics & risk", "Allocation", "Risk + attribution"],
        ["Fund comparison & NAV history", "—", "Up to 4 funds"],
        ["Price & signal alerts", "3", "Unlimited"],
        ["PDF / Excel exports", "—", "Advanced"],
      ];
  const positive = (v: string) => /unlimited|included|complete|advanced|full|real.?time|غير محدود|مشمول|كاملة|كامل|متقدم|فوري/i.test(v);
  const renderVal = (v: string, accent: boolean) => {
    if (v === "—") return <span className={styles.planCellMuted}>—</span>;
    if (positive(v)) return <span className={cx(styles.planCellGood, accent && styles.planCellAccent)}><Icon name="check" size={13} /> {v}</span>;
    return <span className={accent ? styles.planCellAccent : undefined}>{v}</span>;
  };
  return (
    <>
      <MarketTopBar lang={lang} nav={nav} title={lang === "ar" ? "خطط Starta" : "Starta Plans"} sub={lang === "ar" ? "اختر ميزتك" : "Choose your edge"} />
      <div className={styles.content}>
        {/* Plan cards */}
        <div className={styles.planCards2}>
          <div className={styles.planCard2}>
            <span className={styles.planKicker2}>{lang === "ar" ? "المبتدئ" : "THE STARTER"}</span>
            <strong className={styles.planPrice2}>{lang === "ar" ? "مجاني" : "Free"}</strong>
            <small className={styles.planDesc2}>{lang === "ar" ? "بيانات أساسية للمستثمر المتابع" : "Essential market data for the casual investor"}</small>
            <span className={styles.planCurrentTag}>{lang === "ar" ? "خطتك الحالية" : "Current plan"}</span>
          </div>
          <div className={cx(styles.planCard2, styles.planCard2Popular)}>
            <span className={styles.planPopularTag}>★ {lang === "ar" ? "الأكثر شيوعاً" : "POPULAR"}</span>
            <span className={styles.planKicker2}>{lang === "ar" ? "المحلّل" : "THE ANALYST"}</span>
            <strong className={styles.planPrice2}>69 <em>{lang === "ar" ? "ج.م/شهر" : "EGP/mo"}</em></strong>
            <small className={styles.planDesc2}>{lang === "ar" ? "بحث كامل و Starta AI بلا حدود" : "Full research & unlimited Starta AI"}</small>
            <span className={styles.planAnnual}>{lang === "ar" ? "أو 662 جنيه سنوياً" : "or 662 EGP billed annually"}</span>
          </div>
        </div>

        {/* Comparison table */}
        <div className={styles.planTable}>
          <div className={cx(styles.planRow, styles.planRowHead)}>
            <span>{lang === "ar" ? "الميزة" : "Feature"}</span>
            <span>{lang === "ar" ? "مجاني" : "Free"}</span>
            <span className={styles.planColAnalyst}>{lang === "ar" ? "المحلّل" : "Analyst"}</span>
          </div>
          {features.map(([feature, starter, analyst]) => (
            <div key={feature} className={styles.planRow}>
              <span className={styles.planFeatureName}>{feature}</span>
              {renderVal(starter, false)}
              <span className={styles.planColAnalyst}>{renderVal(analyst, true)}</span>
            </div>
          ))}
        </div>

        <p className={styles.disclaimer}>{lang === "ar" ? "هذه الخطط للعرض المعلوماتي فقط داخل التطبيق. لا توجد ميزات مقفلة في تجربة Starta الحالية." : "Plans are shown for information only inside the app. No current Starta mobile feature is locked."}</p>
      </div>
    </>
  );
}

function AIOverlay({ open, seed, runId, onClose, lang, stocks, funds, news, summary, isAuthed, onGuestLimit }: { open: boolean; seed?: string; runId: number; onClose: () => void; lang: Lang; stocks: Stock[]; funds: Fund[]; news: NewsItem[]; summary: MarketSummary; isAuthed?: boolean; onGuestLimit?: () => void }) {
  const t = copy[lang];
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && seed) {
      ask(seed);
    }
  }, [open, seed, runId]);
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, open]);
  // Smooth-pin to the newest content as the typewriter writes (mirrors web /AiChat onTyping).
  const scrollToEnd = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  async function ask(text: string) {
    const prompt = text.trim();
    if (!prompt || loading) return;
    // Guest freemium gate: a few free AI questions, then the register popup.
    if (!isAuthed) {
      if (guestRemaining("ai") <= 0) { onGuestLimit?.(); return; }
      bumpGuest("ai");
    }
    const history = messages.map((message) => ({ role: message.role, content: message.text }));
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);
    // Same endpoint the website calls; normalize with the SAME sanitizer so the
    // response object is byte-for-byte what /AiChat renders (cards, followups, etc.).
    const raw = await postJson<any>("/api/v1/ai/chat", { message: prompt, history, language: lang }, authHeaders());
    const safe = raw ? sanitizeChatResponse(raw) : null;
    const answerText = safe
      ? (lang === "ar"
          ? (raw?.message_text_ar || safe.message_text || safe.conversational_text || "")
          : (safe.message_text || safe.conversational_text || ""))
      : "";
    const answer: AiMessage = safe && (answerText || (safe.cards && safe.cards.length > 0))
      ? { role: "assistant", text: cleanAiText(answerText), kind: "api", response: safe }
      : {
          role: "assistant",
          text: lang === "ar"
            ? "خدمة Starta AI غير متاحة الآن. لم يتم إنشاء تحليل تقديري بديل."
            : "Starta AI is not available right now. No estimated analysis was generated as a substitute.",
        };
    setMessages((m) => [...m, answer]);
    setLoading(false);
  }
  // Only the newest assistant message runs the typewriter; older messages render in full.
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") { lastAssistantIdx = i; break; }
  }
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.aiOverlay} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
          <div className={styles.aiHeader}>
            <span><AIGlyph color="#fff" /></span>
            <div><strong>{t.aiTitle}</strong><small>{t.aiOnline}</small></div>
            <button onClick={onClose}><Icon name="x" /></button>
          </div>
          <div className={styles.aiMessages}>
            {!messages.length ? (
              <div className={styles.aiEmpty}>
                <AIGlyph size={44} />
                <h2>{t.aiEmpty}</h2>
                {[
                  lang === "ar" ? "ما أكثر الأسهم نشاطاً اليوم؟" : "What are today’s most active stocks?",
                  lang === "ar" ? "قارن أفضل صناديق الأسهم" : "Compare the top equity funds",
                  lang === "ar" ? "لخّص أخبار السوق" : "Summarize market news",
                  lang === "ar" ? "قيّم مخاطر محفظتي" : "Assess my portfolio risk",
                ].map((q) => <button key={q} onClick={() => ask(q)}>{q}<Icon name="chevron-right" size={14} /></button>)}
              </div>
            ) : (
              <>
                {messages.map((m, i) =>
                  m.role === "user"
                    ? <div key={i} className={styles.userBubble}><p>{m.text}</p></div>
                    : <MobileAiResponse key={i} message={m} lang={lang} onAsk={ask} isLatest={i === lastAssistantIdx && !loading} onTyping={scrollToEnd} />
                )}
                {loading ? <div className={styles.aiBubble}><p>{lang === "ar" ? "يحلل Starta AI البيانات الحية..." : "Starta AI is analyzing live data..."}</p></div> : null}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); if (input.trim()) ask(input.trim()); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={lang === "ar" ? "اسأل Starta AI..." : "Ask Starta AI..."} />
            <button disabled={loading}><Icon name="arrow-up" /></button>
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// =============================================================================
// UNIFIED AI RESPONSE — renders an assistant message with the EXACT same
// pipeline as the website /AiChat (ResponsivePage → MessageRenderer):
//   WorldClassMessage → leftover ChatCards → FactExplanations → FollowUps → Actions
// Same component, same normalized data ⇒ mobile responses are identical to web.
// =============================================================================
const MOBILE_WORLDCLASS_CARD_TYPES = new Set<string>([
  "bull_case", "bear_case", "learning_section", "disclaimer", "disclaimer_card",
  "follow_up_prompt", "follow_up", "error",
  "stock_list", "stock_ranking", "hidden_gems", "undervalued_stocks",
  "comparison_table", "compare_table", "peer_comparison", "financials_table", "earnings_table",
  "educational", "educational_card", "define_term", "definition", "metric_explanation",
  "positives", "concerns", "mixed_signals", "headwinds", "tailwinds",
  "price_display", "current_position", "stock_position", "index_composition", "egx_constituents",
  "insight", "insights", "warning_card", "reality_check", "character_cards", "stock_personalities",
  "macro_score", "market_environment", "framework_card", "methodology", "screening_criteria",
  "stock_header",
]);
function mobileCanonicalCardType(value: unknown): string {
  return String(value ?? "").trim().replace(/^cardtype\./i, "").toLowerCase();
}

function MobileAiResponse({ message, lang, onAsk, isLatest = false, onTyping }: { message: AiMessage; lang: Lang; onAsk: (query: string) => void; isLatest?: boolean; onTyping?: () => void }) {
  const resp = message.response;
  // Mirror WorldClassMessage's typewriter length so we know if it will animate.
  // (When there is no narrative to type, WCM completes instantly WITHOUT firing
  // onTypingComplete — so reveal the extras immediately in that case.)
  const sn = (resp as { structured_narrative?: Record<string, unknown> } | undefined)?.structured_narrative;
  const narrativeLen = sn
    ? ["personal_greeting", "context_bridge", "human_opening", "core_narrative", "risk_warning"]
        .reduce((n, k) => n + (typeof sn[k] === "string" ? (sn[k] as string).length : 0), 0)
    : (resp?.conversational_text || message.text || "").length;
  const willType = isLatest && narrativeLen > 0;
  // Reveal cards/followups/actions only AFTER the narrative finishes typing
  // (mirrors the web MessageRenderer, which gates these behind isTypingCompleted).
  const [typingDone, setTypingDone] = useState(!willType);
  useEffect(() => { if (!willType) setTypingDone(true); }, [willType]);
  // Cards WorldClassMessage already renders inline are excluded here (mirrors web).
  const leftoverCards = (resp?.cards || []).filter(
    (card) => !MOBILE_WORLDCLASS_CARD_TYPES.has(mobileCanonicalCardType((card as { type?: unknown })?.type)),
  );
  const followups = resp?.followups || [];
  const hasExtras = leftoverCards.length > 0 || !!resp?.fact_explanations || followups.length > 0 || !!resp?.follow_up_prompt || (!!resp?.actions && resp.actions.length > 0);
  return (
    <div className="flex gap-2.5 w-full" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-serif">S</div>
      <div className="flex-1 min-w-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-3 text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-200 shadow-sm">
        <WorldClassMessage
          conversationalText={resp?.conversational_text || message.text}
          response={resp}
          lang={lang}
          isLatest={isLatest}
          onTyping={onTyping}
          onTypingComplete={() => setTypingDone(true)}
        />
        {typingDone && hasExtras ? (
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {leftoverCards.length > 0 ? (
              <ChatCards
                cards={leftoverCards}
                language={lang}
                onSymbolClick={(symbol: string) => onAsk(lang === "ar" ? `حلّل سهم ${symbol}` : `Analyze ${symbol}`)}
                onExampleClick={onAsk}
              />
            ) : null}
            {resp?.fact_explanations ? (
              <div className="mt-1 pt-2 border-t border-slate-100 dark:border-white/10">
                <FactExplanations explanations={resp.fact_explanations} language={lang} />
              </div>
            ) : null}
            {followups.length > 0 ? (
              <FollowUpChips followups={followups} onAction={onAsk} language={lang} />
            ) : resp?.follow_up_prompt ? (
              <FollowUpPrompt content={resp.follow_up_prompt} />
            ) : null}
            {resp?.actions && resp.actions.length > 0 && followups.length === 0 ? (
              <ActionsBar
                actions={resp.actions}
                language={lang}
                onAction={(action: { label?: string; payload?: string }) => onAsk(String(action?.label || action?.payload || ""))}
              />
            ) : null}
          </motion.div>
        ) : null}
        <small className={styles.aiDisclaimer}>{lang === "ar" ? "للأغراض المعلوماتية فقط · ليست نصيحة استثمارية" : "Informational only · not investment advice"}</small>
      </div>
    </div>
  );
}
