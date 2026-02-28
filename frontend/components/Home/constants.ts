import {
    benefitIcon1,
    benefitIcon2,
    benefitIcon3,
    benefitIcon4,
    benefitImage2,
    chromecast,
    disc02,
    discord,
    discordBlack,
    facebook,
    figma,
    file02,
    framer,
    homeSmile,
    instagram,
    notification2,
    notification3,
    notification4,
    notion,
    photoshop,
    plusSquare,
    protopie,
    raindrop,
    recording01,
    recording03,
    roadmap1,
    roadmap2,
    roadmap3,
    roadmap4,
    roadmap2Light,
    roadmap3Light,
    roadmap4Light,
    searchMd,
    slack,
    sliders04,
    telegram,
    twitter,
    yourlogo,
} from "./assets";

export const navigation = [
    {
        id: "0",
        title: "Capabilities",
        url: "#features",
    },
    {
        id: "about",
        title: "About Us",
        url: "#about",
    },
    {
        id: "1",
        title: "Membership",
        url: "#pricing",
        hidden: true,
    },
    {
        id: "2",
        title: "Intelligence",
        url: "#how-to-use",
    },
    {
        id: "3",
        title: "Vision",
        url: "#roadmap",
    },
    {
        id: "4",
        title: "New account",
        url: "#signup",
        onlyMobile: true,
    },
    {
        id: "5",
        title: "Sign in",
        url: "#login",
        onlyMobile: true,
    },
];

export const heroIcons = [homeSmile, file02, searchMd, plusSquare];

export const notificationImages = [notification4, notification3, notification2];

export const companyLogos = [yourlogo, yourlogo, yourlogo, yourlogo, yourlogo];

export const brainwaveServices = [
    "CFA-Level Analysis",
    "Real-time EGX Data",
    "Zero Hallucinations",
];

export const brainwaveServicesIcons = [
    recording03,
    recording01,
    disc02,
    chromecast,
    sliders04,
];

export const roadmap = [
    {
        id: "0",
        title: "Starta AI Voice",
        text: "Voice-activated financial assistant. Chat or talk with Starta AI to analyze markets, execute trades, and get real-time insights.",
        date: "Q2 2026",
        status: "done",
        imageUrl: roadmap1,
        colorful: true,
        customVisual: "voice",
    },
    {
        id: "1",
        title: "Technical Analysis v2",
        text: "Advanced chart pattern recognition (Head & Shoulders, Double Bottoms) with real-time breakout alerts.",
        date: "Q3 2026",
        status: "progress",
        imageUrl: roadmap2,
        imageUrlLight: roadmap2Light,
    },
    {
        id: "2",
        title: "Sector Rotation AI",
        text: "Predictive modeling to identify capital flow shifts between EGX sectors (e.g., Banking to Real Estate).",
        date: "Q4 2026",
        status: "done",
        imageUrl: roadmap3,
        imageUrlLight: roadmap3Light,
    },
    {
        id: "3",
        title: "Earnings Call Synthesis",
        text: "Instant extraction of forward-looking statements from PDF disclosures and earnings call transcripts.",
        date: "Q1 2027",
        status: "progress",
        imageUrl: roadmap4,
        imageUrlLight: roadmap4Light,
        customVisual: "pipeline",
    },
];

export const collabText =
    "Institutional-grade intelligence for the individual investor. Powered by Starta Markets, refined by AI.";

export const collabContent = [
    {
        id: "0",
        title: "Live Data Stream",
        text: "Institutional-grade intelligence for the individual investor. Powered by exchange feeds, refined by AI.",
    },
    {
        id: "1",
        title: "CFA Level 3 Logic",
    },
    {
        id: "2",
        title: "Vector-Based RAG",
    },
];

export const collabApps = [
    {
        id: "0",
        title: "CIB",
        ticker: "COMI",
        color: "#004D87", // CIB Blue
        width: 26,
        height: 36,
    },
    {
        id: "1",
        title: "Telecom Egypt",
        ticker: "ETEL",
        color: "#673190", // WE Purple
        width: 34,
        height: 36,
    },
    {
        id: "2",
        title: "EFG Hermes",
        ticker: "HRHO",
        color: "#B4925A", // Hermes Gold
        width: 36,
        height: 28,
    },
    {
        id: "3",
        title: "Talaat Moustafa",
        ticker: "TMGH",
        color: "#1E3A8A", // TMG Blue
        width: 34,
        height: 35,
    },
    {
        id: "4",
        title: "Elsewedy Electric",
        ticker: "SWDY",
        color: "#CA0813", // Elsewedy Red
        width: 34,
        height: 34,
    },
    {
        id: "5",
        title: "Eastern Company",
        ticker: "EAST",
        color: "#0F5132", // Eastern Green
        width: 34,
        height: 34,
    },
    {
        id: "6",
        title: "Orascom Construction",
        ticker: "ORAS",
        color: "#F59E0B", // Orascom Orange
        width: 26,
        height: 34,
    },
    {
        id: "7",
        title: "Palm Hills",
        ticker: "PHDC",
        color: "#374151", // Palm Hills Dark Gray
        width: 38,
        height: 32,
    },
];

export const pricing = [
    {
        id: "0",
        title: "The Starter",
        description: "Essential market data for the casual investor",
        price: "Free",
        features: [
            "5 chats per day with Starta AI Analyst",
            "3 Institutional Spreadsheet Downloads / month",
            "3 Full Balance Sheet Downloads / month",
            "3 5-Year Cash Flow Downloads / month",
            "Financial Statements (Annually, Quarterly & TTM)",
            "All Financial Ratios & KPIs",
            "Comprehensive Company Information",
            "3 PDF Report Exports",
        ],
    },
    {
        id: "1",
        title: "The Analyst",
        description: "Real-time intelligence for active traders",
        price: "69 EGP",
        priceDetails: "Monthly or 662 EGP Annually (20% off)",
        features: [
            "Unlimited AI Analyst Chat",
            "Unlimited 5-Year Income Statements",
            "Unlimited 5-Year Balance Sheets",
            "Unlimited 5-Year Cash Flow Statements",
            "Full Financial History (Annually, Quarterly & TTM)",
            "Complete Financial Ratios & KPIs",
            "Advanced Excel Export (All Financials)",
            "Unlimited PDF Report Generation",
            "Daily Market News Briefing",
        ],
    },
    {
        id: "2",
        title: "Institutional",
        description: "API access and raw data for funds",
        price: null,
        features: [
            "Direct API access to vector database",
            "Custom risk modeling pipelines",
            "Dedicated account manager",
            "White-label reports",
            "Custom Data Integration",
            "Full Historical Tick Data Access",
            "Custom AI Model Fine-Tuning",
            "SLA-Backed 99.9% Uptime",
            "Priority 24/7 Engineering Support",
        ],
    },
];

export const benefits = [
    {
        id: "0",
        title: "Deep Fundamental Analysis",
        text: "Starta acts as a CFA Level 3 analyst, dissecting balance sheets and cash flows to find true value beyond the noise.",
        backgroundUrl: "/assets/benefits/card-1.svg",
        iconUrl: benefitIcon1,
        imageUrl: benefitImage2,
    },
    {
        id: "1",
        title: "Real-Time Signal Detection",
        text: "Powered by live exchange feeds, identifying breakouts, volume spikes, and unusual block trades as they happen.",
        backgroundUrl: "/assets/benefits/card-2.svg",
        iconUrl: benefitIcon2,
        imageUrl: benefitImage2,
        light: true,
    },
    {
        id: "2",
        title: "Zero Hallucination Guarantee",
        text: "Our RAG architecture anchors every insight to verified financial documents. If we don't know, we say we don't know.",
        backgroundUrl: "/assets/benefits/card-3.svg",
        iconUrl: benefitIcon3,
        imageUrl: benefitImage2,
    },
    {
        id: "3",
        title: "Macro to Micro Context",
        text: "Understanding how global oil prices affect EGX petrochemicals, or how CBE interest rates impact your banking stocks.",
        backgroundUrl: "/assets/benefits/card-4.svg",
        iconUrl: benefitIcon4,
        imageUrl: benefitImage2,
        light: true,
    },
    {
        id: "4",
        title: "Smart Screener",
        text: "Filter 200+ EGX companies not just by P/E, but by 'Undervalued Growth' or 'High Dividend Safety' concepts.",
        backgroundUrl: "/assets/benefits/card-5.svg",
        iconUrl: benefitIcon1,
        imageUrl: benefitImage2,
    },
    {
        id: "5",
        title: "Localized Intelligence",
        text: "Built specifically for the Egyptian market. We understand T+2 settlement, GDR arbitrage, and local regulatory nuances.",
        backgroundUrl: "/assets/benefits/card-6.svg",
        iconUrl: benefitIcon2,
        imageUrl: benefitImage2,
    },
];

export const socials = [
    {
        id: "0",
        title: "Discord",
        iconUrl: discordBlack,
        url: "#",
    },
    {
        id: "1",
        title: "Twitter",
        iconUrl: twitter,
        url: "#",
    },
    {
        id: "2",
        title: "Instagram",
        iconUrl: instagram,
        url: "#",
    },
    {
        id: "3",
        title: "Telegram",
        iconUrl: telegram,
        url: "#",
    },
    {
        id: "4",
        title: "Facebook",
        iconUrl: facebook,
        url: "#",
    },
];
