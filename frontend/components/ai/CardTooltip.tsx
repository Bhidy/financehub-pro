"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import clsx from "clsx";

type TooltipLanguage = "en" | "ar" | "mixed";

interface TooltipContent {
    title: string;
    summary: string;
    bullets: string[];
}

interface CardTooltipShellProps {
    cardType?: string;
    cardTitle?: string;
    data?: unknown;
    language?: TooltipLanguage;
    children: React.ReactNode;
    className?: string;
}

interface CardFamilyMeta {
    types: string[];
    title: {
        en: string;
        ar: string;
    };
    summary: {
        en: string;
        ar: string;
    };
    tips: {
        en: string[];
        ar: string[];
    };
}

interface MetricMeta {
    regex: RegExp;
    bullet: {
        en: string;
        ar: string;
    };
}

const TOOLTIP_WIDTH = 360;
const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 12;

const CARD_FAMILIES: CardFamilyMeta[] = [
    {
        types: ["stock_header"],
        title: {
            en: "About This Company Card",
            ar: "شرح بطاقة الشركة",
        },
        summary: {
            en: "This card identifies the company, exchange, currency, and sector context for the analysis that follows.",
            ar: "توضح هذه البطاقة الشركة والسوق والعملة والقطاع الذي يعتمد عليه التحليل التالي.",
        },
        tips: {
            en: [
                "Confirm the symbol, exchange, and currency first so the rest of the analysis is anchored to the right security.",
                "Sector or description labels explain which peer set the later comparisons should use.",
            ],
            ar: [
                "ابدأ بتأكيد الرمز والسوق والعملة حتى يكون باقي التحليل مرتبطا بالسهم الصحيح.",
                "وصف القطاع يحدد مجموعة المقارنة التي يجب الاعتماد عليها لاحقا.",
            ],
        },
    },
    {
        types: ["snapshot", "price_display", "chart", "stats", "statistics", "metric", "ratios"],
        title: {
            en: "How To Read This Market Card",
            ar: "كيفية قراءة بطاقة السوق",
        },
        summary: {
            en: "This card summarizes the latest market data and headline ratios used to frame the stock quickly.",
            ar: "تلخص هذه البطاقة أحدث بيانات السوق وأهم النسب المستخدمة لفهم السهم بسرعة.",
        },
        tips: {
            en: [
                "Read the latest price together with the displayed period or session, not in isolation.",
                "Ratios are most useful when compared against the stock's own history and peer group.",
            ],
            ar: [
                "اقرأ السعر الحالي مع الفترة أو الجلسة المعروضة، وليس بشكل منفصل.",
                "تصبح النسب أكثر فائدة عند مقارنتها بتاريخ السهم وبمجموعة أقرانه.",
            ],
        },
    },
    {
        types: [
            "deep_health",
            "deep_valuation",
            "valuation_score",
            "deep_efficiency",
            "deep_growth",
            "macro_score",
            "score_breakdown",
            "score_detail",
            "starta_score",
            "market_timing",
        ],
        title: {
            en: "How To Read This Score Card",
            ar: "كيفية قراءة بطاقة التقييم",
        },
        summary: {
            en: "This card breaks a composite score into the drivers behind quality, valuation, risk, or market conditions.",
            ar: "تقوم هذه البطاقة بتفكيك الدرجة المركبة إلى العوامل التي تقود الجودة أو التقييم أو المخاطر أو ظروف السوق.",
        },
        tips: {
            en: [
                "Use the factor-level view to see what is helping the score and what is dragging it down.",
                "Scores are relative within the same model, so compare them inside the same framework rather than across unrelated cards.",
            ],
            ar: [
                "استخدم تفاصيل العوامل لمعرفة ما الذي يدعم الدرجة وما الذي يضغط عليها.",
                "الدرجات نسبية داخل النموذج نفسه، لذلك يجب مقارنتها داخل الإطار نفسه لا عبر بطاقات غير مرتبطة.",
            ],
        },
    },
    {
        types: [
            "screener_results",
            "stock_list",
            "sector_list",
            "hidden_gems",
            "gem_list",
            "discovery_list",
            "undervalued_screen",
            "index_composition",
            "index_view",
            "fund_list",
            "fund_movers",
            "movers",
            "movers_table",
        ],
        title: {
            en: "How To Read This Ranking Card",
            ar: "كيفية قراءة بطاقة الترتيب",
        },
        summary: {
            en: "This card ranks a peer set or shortlist using the screen logic behind the response.",
            ar: "ترتب هذه البطاقة مجموعة من الأقران أو قائمة مختصرة وفق منطق الفلترة المستخدم في الإجابة.",
        },
        tips: {
            en: [
                "Compare stocks inside the same list because the ranking is relative to that peer universe.",
                "A cheap multiple matters more when profitability, leverage, and cash quality also support the case.",
            ],
            ar: [
                "قارن الأسهم داخل نفس القائمة لأن الترتيب نسبي داخل مجموعة الأقران نفسها.",
                "المضاعف المنخفض يصبح أكثر أهمية عندما تدعمه الربحية والرافعة وجودة التدفقات النقدية.",
            ],
        },
    },
    {
        types: ["compare", "compare_table", "comparison_table", "radar_compare"],
        title: {
            en: "How To Read This Comparison Card",
            ar: "كيفية قراءة بطاقة المقارنة",
        },
        summary: {
            en: "This card compares multiple names side by side on the same metrics and observation window.",
            ar: "تقارن هذه البطاقة عدة شركات جنبا إلى جنب باستخدام نفس المؤشرات ونفس الإطار الزمني.",
        },
        tips: {
            en: [
                "Focus on the same metric across all names before moving to the next row or axis.",
                "Check that the comparison is using the same period and accounting context for every company.",
            ],
            ar: [
                "ركز على المؤشر نفسه عبر كل الشركات قبل الانتقال إلى الصف أو المحور التالي.",
                "تأكد من أن المقارنة تستخدم نفس الفترة ونفس السياق المحاسبي لكل شركة.",
            ],
        },
    },
    {
        types: [
            "financials",
            "financial_explorer",
            "financials_table",
            "revenue_breakdown",
            "cost_breakdown",
            "debt_structure",
            "assets_breakdown",
            "cashflow_waterfall",
            "growth_trend",
            "ratio_history_chart",
            "fcf_vs_income",
            "earnings_quality",
            "working_capital_card",
            "ebitda_breakdown",
            "equity_breakdown",
            "ppe_breakdown",
            "debt_activity",
            "dynamic_data_card",
            "advanced_stats",
            "ownership_structure",
        ],
        title: {
            en: "How To Read This Financial Card",
            ar: "كيفية قراءة البطاقة المالية",
        },
        summary: {
            en: "This card shows statement data or historical trends pulled from company filings and normalized for analysis.",
            ar: "تعرض هذه البطاقة بيانات القوائم المالية أو الاتجاهات التاريخية المستخرجة من إفصاحات الشركة والمهيأة للتحليل.",
        },
        tips: {
            en: [
                "Always read the unit and period labels first so you do not confuse millions, billions, quarterly, or trailing data.",
                "Trend cards are strongest when you compare direction, stability, and quality together rather than one line alone.",
            ],
            ar: [
                "ابدأ دائما بقراءة الوحدة والفترة حتى لا تخلط بين الملايين والمليارات أو بين الربع السنوي والفترة المتحركة.",
                "تكون بطاقات الاتجاهات أقوى عندما تقارن الاتجاه والاستقرار والجودة معا وليس خطا واحدا فقط.",
            ],
        },
    },
    {
        types: [
            "bull_case",
            "bear_case",
            "insight",
            "my_framework",
            "framework_card",
            "key_insight",
            "warning_card",
            "quantified_drivers",
            "macro_context",
            "fair_value",
            "fund_nav",
        ],
        title: {
            en: "How To Read This Insight Card",
            ar: "كيفية قراءة بطاقة الرؤية",
        },
        summary: {
            en: "This card converts the raw figures into an analytical takeaway, including upside, downside, or the main drivers of the thesis.",
            ar: "تحول هذه البطاقة الأرقام الخام إلى خلاصة تحليلية تشمل العوامل الداعمة أو المخاطر أو جوهر الفكرة الاستثمارية.",
        },
        tips: {
            en: [
                "Treat this as an interpretation layer built on the data cards, not as a substitute for them.",
                "Pay attention to what would need to be true for the thesis to hold, especially when the card mentions catalysts or risks.",
            ],
            ar: [
                "اعتبر هذه البطاقة طبقة تفسير مبنية على بطاقات البيانات وليست بديلا عنها.",
                "ركز على الشروط التي يجب أن تتحقق حتى تصح الفرضية، خصوصا عند ذكر المحفزات أو المخاطر.",
            ],
        },
    },
    {
        types: ["educational", "define_term", "definition", "learning_section", "methodology", "screening_criteria", "help", "suggestions"],
        title: {
            en: "How To Use This Learning Card",
            ar: "كيفية استخدام بطاقة التعلّم",
        },
        summary: {
            en: "This card explains a concept, formula, prompt idea, or methodology used elsewhere in the response.",
            ar: "تشرح هذه البطاقة مفهوما أو معادلة أو فكرة سؤال أو منهجية مستخدمة في موضع آخر من الإجابة.",
        },
        tips: {
            en: [
                "Use the definition first, then connect it back to the stock or screen you were reviewing.",
                "If a formula appears, the most important step is knowing when that metric is useful and when it can mislead.",
            ],
            ar: [
                "ابدأ بالتعريف ثم اربطه بالسهم أو الفلتر الذي كنت تراجعه.",
                "عند ظهور معادلة، فإن الأهم هو معرفة متى يكون المؤشر مفيدا ومتى قد يكون مضللا.",
            ],
        },
    },
    {
        types: ["disclaimer", "disclaimer_card", "news_list"],
        title: {
            en: "About This Context Card",
            ar: "عن بطاقة السياق",
        },
        summary: {
            en: "This card adds context, source framing, or decision-use limits around the core analysis.",
            ar: "تضيف هذه البطاقة سياقا عاما أو توضيحا للمصدر أو حدود استخدام التحليل في اتخاذ القرار.",
        },
        tips: {
            en: [
                "Use this card to understand the boundaries, freshness, or practical limits of the answer.",
            ],
            ar: [
                "استخدم هذه البطاقة لفهم حدود الإجابة وحداثة البيانات وكيفية التعامل معها عمليا.",
            ],
        },
    },
];

const METRIC_BULLETS: MetricMeta[] = [
    {
        regex: /\bp\/?e\b|price[\s-]?to[\s-]?earnings/i,
        bullet: {
            en: "P/E compares share price to earnings per share. Lower can indicate cheaper valuation, but only if earnings are sustainable.",
            ar: "مضاعف الربحية يقارن سعر السهم بربحية السهم. الانخفاض قد يعني تقييما أقل، لكن فقط إذا كانت الأرباح مستدامة.",
        },
    },
    {
        regex: /\bp\/?b\b|price[\s-]?to[\s-]?book/i,
        bullet: {
            en: "P/B compares market value with book equity. It is especially useful for banks, financials, and asset-heavy businesses.",
            ar: "مضاعف القيمة الدفترية يقارن القيمة السوقية بحقوق الملكية الدفترية، ويكون مهما خصوصا للبنوك والشركات كثيفة الأصول.",
        },
    },
    {
        regex: /\broe\b|return on equity/i,
        bullet: {
            en: "ROE shows how efficiently management converts shareholders' equity into profit.",
            ar: "العائد على حقوق الملكية يوضح كفاءة الإدارة في تحويل حقوق المساهمين إلى أرباح.",
        },
    },
    {
        regex: /\broa\b|return on assets/i,
        bullet: {
            en: "ROA measures profit generated from the asset base and helps compare capital intensity across businesses.",
            ar: "العائد على الأصول يقيس الأرباح المتولدة من قاعدة الأصول ويساعد في مقارنة كثافة رأس المال بين الشركات.",
        },
    },
    {
        regex: /\bev\/ebitda\b/i,
        bullet: {
            en: "EV/EBITDA compares enterprise value with operating earnings before non-cash and financing effects.",
            ar: "مضاعف قيمة المنشأة إلى الأرباح التشغيلية يقارن قيمة الشركة بأرباح التشغيل قبل البنود غير النقدية وتكاليف التمويل.",
        },
    },
    {
        regex: /\beps\b|earnings per share/i,
        bullet: {
            en: "EPS is profit attributable to each share, and it often drives valuation multiples such as P/E.",
            ar: "ربحية السهم هي نصيب السهم من الأرباح، وغالبا ما تؤثر مباشرة في مضاعفات التقييم مثل مضاعف الربحية.",
        },
    },
    {
        regex: /\bttm\b|trailing twelve months/i,
        bullet: {
            en: "TTM means trailing twelve months, so it uses the most recent rolling year instead of a single quarter or last fiscal year.",
            ar: "TTM تعني آخر اثني عشر شهرا، أي أنها تستخدم سنة متحركة حديثة بدلا من ربع واحد أو سنة مالية قديمة.",
        },
    },
    {
        regex: /market cap|capitalization/i,
        bullet: {
            en: "Market cap is the market value of the company's equity and helps frame size, liquidity, and index relevance.",
            ar: "القيمة السوقية هي القيمة السوقية لحقوق ملكية الشركة وتساعد في فهم الحجم والسيولة والأهمية داخل المؤشرات.",
        },
    },
    {
        regex: /\bprice\b|last traded|close/i,
        bullet: {
            en: "Price is the latest quoted or traded value, so always pair it with the as-of time and change period.",
            ar: "السعر هو آخر قيمة متداولة أو معلنة، لذلك يجب ربطه دائما بوقت التحديث وفترة التغير.",
        },
    },
    {
        regex: /change|return|gain|loss/i,
        bullet: {
            en: "Change shows direction and magnitude over the displayed period; the same number can mean very different things over a day versus a year.",
            ar: "يوضح التغير الاتجاه والحجم خلال الفترة المعروضة؛ والرقم نفسه قد يحمل معنى مختلفا بين يوم واحد وسنة كاملة.",
        },
    },
    {
        regex: /volume|turnover|liquidity/i,
        bullet: {
            en: "Volume shows how much trading activity supported the move; weak volume can make price action less convincing.",
            ar: "يوضح الحجم مقدار النشاط الذي دعم الحركة السعرية؛ وضعف التداول قد يجعل الحركة أقل إقناعا.",
        },
    },
    {
        regex: /yield|dividend/i,
        bullet: {
            en: "Yield turns cash distributions into a return rate, but it should be checked against payout sustainability.",
            ar: "العائد يحول التوزيعات النقدية إلى معدل عائد، لكن يجب تقييمه مع استدامة التوزيع.",
        },
    },
    {
        regex: /revenue|sales/i,
        bullet: {
            en: "Revenue measures top-line business activity and is best read with growth, margins, and cash conversion.",
            ar: "الإيرادات تقيس نشاط الأعمال في أعلى قائمة الدخل، وتصبح أكثر فائدة عند قراءتها مع النمو والهوامش وجودة التحصيل النقدي.",
        },
    },
    {
        regex: /net income|profit/i,
        bullet: {
            en: "Net income captures profit after major expenses and is more informative when you also assess earnings quality.",
            ar: "صافي الربح يعكس الربح بعد المصروفات الرئيسية ويصبح أكثر دقة عند تقييم جودة الأرباح معه.",
        },
    },
    {
        regex: /cash flow|free cash flow|operating cash/i,
        bullet: {
            en: "Cash-flow figures test whether reported earnings are turning into cash that can fund operations, dividends, or debt service.",
            ar: "تقيس التدفقات النقدية ما إذا كانت الأرباح المعلنة تتحول فعلا إلى نقد يمول التشغيل أو التوزيعات أو خدمة الدين.",
        },
    },
    {
        regex: /debt|leverage|interest coverage|debt[-\s]?to[-\s]?equity/i,
        bullet: {
            en: "Debt metrics show balance-sheet pressure and refinancing risk, so they matter most when growth depends on borrowed capital.",
            ar: "توضح مؤشرات الدين ضغط الميزانية ومخاطر إعادة التمويل، وتصبح أهم عندما يعتمد النمو على رأس مال مقترض.",
        },
    },
    {
        regex: /margin|gross|operating|ebitda margin/i,
        bullet: {
            en: "Margins show how much of each revenue unit becomes profit, which helps distinguish scale from real economic strength.",
            ar: "الهوامش توضح كم يتحول من كل وحدة إيراد إلى ربح، وهو ما يساعد على التمييز بين الحجم والقوة الاقتصادية الحقيقية.",
        },
    },
    {
        regex: /score|rating|rank/i,
        bullet: {
            en: "Scores and ranks are relative inside the same model or screen; they are not absolute ratings across the whole market.",
            ar: "الدرجات والترتيبات نسبية داخل النموذج أو الفلتر نفسه، وليست تصنيفا مطلقا لكل السوق.",
        },
    },
    {
        regex: /peer|sector|industry|median|average/i,
        bullet: {
            en: "Peer, sector, and industry benchmarks are only meaningful if the comparison set is clean and uses the same metric definition.",
            ar: "تصبح مقارنات القطاع والأقران والصناعة ذات معنى فقط عندما تكون مجموعة المقارنة نظيفة وتستخدم نفس تعريف المؤشر.",
        },
    },
    {
        regex: /year|quarter|annual|q1|q2|q3|q4|fy/i,
        bullet: {
            en: "Period labels matter. Make sure you know whether the figures are annual, quarterly, or trailing before drawing conclusions.",
            ar: "تسميات الفترات مهمة. تأكد مما إذا كانت الأرقام سنوية أو ربع سنوية أو لفترة متحركة قبل استخلاص النتيجة.",
        },
    },
    {
        regex: /egp|usd|currency|million|billion|mn|bn/i,
        bullet: {
            en: "Units matter as much as the number itself, so read the currency and scale before comparing amounts.",
            ar: "الوحدة لا تقل أهمية عن الرقم نفسه، لذا اقرأ العملة وحجم القياس قبل مقارنة المبالغ.",
        },
    },
    {
        regex: /altman|z[-\s]?score/i,
        bullet: {
            en: "Altman Z-Score is a distress-screening tool for non-financial companies and should not be treated the same way for banks.",
            ar: "مؤشر ألتمان Z هو أداة لرصد التعثر في الشركات غير المالية ولا يجب استخدامه بنفس الطريقة مع البنوك.",
        },
    },
];

function normalizeCardType(value: string | undefined): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^cardtype\./i.test(raw)) return raw.replace(/^cardtype\./i, "").toLowerCase();
    if (/^CardType\./.test(raw)) return raw.replace(/^CardType\./, "").toLowerCase();
    return raw.toLowerCase();
}

function safeSerialize(value: unknown): string {
    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

function getCardFamily(cardType: string): CardFamilyMeta | undefined {
    return CARD_FAMILIES.find((family) => family.types.includes(cardType));
}

function dedupe(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value.trim();
        if (!normalized) continue;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

export function deriveCardTooltipContent({
    cardType,
    cardTitle,
    data,
    language = "en",
}: {
    cardType?: string;
    cardTitle?: string;
    data?: unknown;
    language?: TooltipLanguage;
}): TooltipContent {
    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const normalizedType = normalizeCardType(cardType);
    const family = getCardFamily(normalizedType);
    const searchableText = [
        normalizedType,
        cardTitle || "",
        safeSerialize(data),
    ].join(" ");

    const dynamicBullets = METRIC_BULLETS
        .filter((metric) => metric.regex.test(searchableText))
        .map((metric) => metric.bullet[resolvedLanguage]);

    const familyBullets = family?.tips?.[resolvedLanguage] || [];
    const bullets = dedupe([
        ...dynamicBullets,
        ...familyBullets,
    ]).slice(0, 4);

    return {
        title: family?.title?.[resolvedLanguage]
            || (resolvedLanguage === "ar" ? "كيفية قراءة هذه البطاقة" : "How To Read This Card"),
        summary: family?.summary?.[resolvedLanguage]
            || (resolvedLanguage === "ar"
                ? "تشرح هذه البطاقة البيانات الرئيسية المعروضة هنا وكيفية تفسيرها ضمن سياق التحليل."
                : "This card explains the key data shown here and how to interpret it in the context of the analysis."),
        bullets: bullets.length
            ? bullets
            : [
                resolvedLanguage === "ar"
                    ? "اقرأ عنوان البطاقة ثم اربط الأرقام بالسياق العام للإجابة قبل اتخاذ أي استنتاج."
                    : "Read the card title first, then connect the figures back to the overall answer before drawing a conclusion.",
            ],
    };
}

function computePosition(button: HTMLButtonElement | null, panelHeight: number, isRtl: boolean) {
    if (!button || typeof window === "undefined") {
        return {
            top: 0,
            left: 0,
            width: TOOLTIP_WIDTH,
        };
    }

    const rect = button.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, Math.max(280, window.innerWidth - VIEWPORT_MARGIN * 2));
    let left = isRtl ? rect.right - width : rect.left + rect.width - width;
    left = Math.min(Math.max(VIEWPORT_MARGIN, left), window.innerWidth - width - VIEWPORT_MARGIN);

    let top = rect.bottom + TOOLTIP_GAP;
    if (top + panelHeight + VIEWPORT_MARGIN > window.innerHeight) {
        top = Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - TOOLTIP_GAP);
    }

    return { top, left, width };
}

export function CardTooltipShell({
    cardType,
    cardTitle,
    data,
    language = "en",
    children,
    className,
}: CardTooltipShellProps) {
    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const content = deriveCardTooltipContent({ cardType, cardTitle, data, language });
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: TOOLTIP_WIDTH });
    const tooltipId = useId();
    const isRtl = resolvedLanguage === "ar";

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen || typeof window === "undefined") return;

        const syncPosition = () => {
            const panelHeight = panelRef.current?.offsetHeight || 220;
            setPosition(computePosition(buttonRef.current, panelHeight, isRtl));
        };

        syncPosition();
        window.addEventListener("resize", syncPosition);
        window.addEventListener("scroll", syncPosition, true);

        return () => {
            window.removeEventListener("resize", syncPosition);
            window.removeEventListener("scroll", syncPosition, true);
        };
    }, [isOpen, isRtl]);

    useEffect(() => {
        if (!isOpen || typeof document === "undefined") return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            setIsPinned(false);
            setIsOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setIsPinned(false);
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const clearCloseTimeout = () => {
        if (!closeTimeoutRef.current) return;
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
    };

    const openTooltip = () => {
        clearCloseTimeout();
        setIsOpen(true);
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        if (isPinned) return;
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 110);
    };

    const tooltipPanel = typeof document !== "undefined" && isOpen
        ? createPortal(
            <div
                ref={panelRef}
                id={tooltipId}
                role="tooltip"
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleClose}
                className="fixed z-[120] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#08111f]/95 dark:shadow-black/50"
                style={{
                    top: position.top,
                    left: position.left,
                    width: position.width,
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                            {content.title}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {content.summary}
                        </p>
                    </div>
                    {isPinned && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsPinned(false);
                                setIsOpen(false);
                            }}
                            className="shrink-0 rounded-full border border-slate-200 bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                        >
                            {resolvedLanguage === "ar" ? "إغلاق" : "Close"}
                        </button>
                    )}
                </div>
                <div className="mt-3 h-px bg-slate-200/80 dark:bg-white/10" />
                <ul className="mt-3 space-y-2">
                    {content.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>,
            document.body
        )
        : null;

    return (
        <div className={clsx("relative", className)} dir={isRtl ? "rtl" : "ltr"}>
            <div className={clsx("mb-1 flex", isRtl ? "justify-start" : "justify-end")}>
                <button
                    ref={buttonRef}
                    type="button"
                    aria-label={resolvedLanguage === "ar" ? "شرح البطاقة" : "Explain this card"}
                    aria-describedby={isOpen ? tooltipId : undefined}
                    onMouseEnter={openTooltip}
                    onMouseLeave={scheduleClose}
                    onFocus={openTooltip}
                    onBlur={scheduleClose}
                    onClick={() => {
                        clearCloseTimeout();
                        if (isPinned) {
                            setIsPinned(false);
                            setIsOpen(false);
                            return;
                        }
                        setIsPinned(true);
                        setIsOpen(true);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 hover:shadow-md dark:border-white/10 dark:bg-[#111827]/80 dark:text-slate-300 dark:hover:border-sky-400/60 dark:hover:text-sky-300"
                >
                    <HelpCircle size={16} className={clsx(isOpen ? "text-sky-600 dark:text-sky-300" : "")} />
                </button>
            </div>
            {children}
            {tooltipPanel}
        </div>
    );
}
