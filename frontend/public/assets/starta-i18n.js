/**
 * SHARED i18n — the single source of truth for every string that appears on
 * MORE THAN ONE page (site chrome: primary nav + footer).
 *
 * WHY THIS FILE EXISTS
 * Each static page carries its OWN inline dictionary. The footer markup was
 * copy-pasted across pages but its translations were not, so five pages
 * (learn, learn-topic, news, news-article, fund-compare) rendered a permanently
 * ENGLISH footer in Arabic: an applier does `if (dict[key])`, and a key the
 * page has never heard of is silently skipped, leaving the English markup
 * default on screen forever. Duplicating chrome markup will always outpace
 * duplicating chrome translations, so chrome strings live HERE, once.
 *
 * SCOPE — deliberately narrow. Only strings that are identical on every page
 * belong here. Page-specific copy (empty states, closing CTAs, hero text) stays
 * in the page dictionary: a conflict scan found 20 cases where pages define the
 * same key with intentionally DIFFERENT copy, and hoisting those would have
 * replaced bespoke copy with generic text.
 *
 * CONTRACT
 *   · A string shown on 2+ pages identically -> here. Anything else -> page.
 *   · A page dictionary may still override; its applier runs after this one.
 *   · Both languages must define the same key set.
 *   · Enforced by scripts/verify-i18n-coverage.mjs — do not weaken it.
 */
(function () {
    "use strict";

    var SHARED = {
        en: {
            footer_copy_short: "&copy; 2026 Starta Financial Intelligence.",
            footer_lnk_about: "About",
            footer_lnk_companies: "EGX Companies",
            footer_lnk_contact: "Contact",
            footer_col1_title: "PLATFORM",
            footer_col2_title: "RESEARCH",
            footer_col3_title: "RESOURCES",
            footer_copy: "&copy; 2026 Starta Markets. All Rights Reserved.",
            footer_cta_btn: "Explore Funds",
            footer_desc: "Everything you need on mutual funds: prices, comparison, scorecards, news and investing tools.",
            footer_disc_title: "Regulatory Disclaimer",
            footer_disclaimer: "Starta Markets is a financial data and technology platform. All content, tools, and analytics provided are for informational and educational purposes only, and should not be construed as investment advice, recommendations, or endorsements to buy or sell any security or mutual fund. Financial markets carry high volatility and risks; every investor is fully responsible for their own investment due diligence.",
            footer_lnk_account: "Create Account",
            footer_lnk_calc: "Wealth Calculators",
            footer_lnk_funds: "Mutual Funds",
            footer_lnk_home: "Home",
            footer_lnk_learn: "Learn Catalog",
            footer_lnk_login: "Sign In",
            footer_lnk_news: "Market News",
            footer_lnk_privacy: "Privacy Policy",
            footer_lnk_risk: "Risk Assessment",
            footer_lnk_terms: "Terms of Service",
            nav_calculators: "WEALTH CALCULATORS",
            nav_cta: "ASSESS YOUR PROFILE",
            nav_funds: "MUTUAL FUNDS",
            nav_home: "HOME",
            nav_learn: "LEARN",
            nav_mobile: "MUTUAL FUNDS",
            nav_news: "MARKET NEWS",
        },
        ar: {
            footer_copy_short: "&copy; 2026 ستارتا للذكاء المالي.",
            footer_lnk_about: "عن ستارتا",
            footer_lnk_companies: "شركات البورصة",
            footer_lnk_contact: "تواصل معنا",
            footer_col1_title: "المنصة",
            footer_col2_title: "الأبحاث",
            footer_col3_title: "المصادر",
            footer_copy: "&copy; ٢٠٢٦ ستارتا ماركتس. جميع الحقوق محفوظة.",
            footer_cta_btn: "استكشف الصناديق",
            footer_desc: "كل اللي تحتاجه عن صناديق الاستثمار: أسعار، مقارنة، تقييم، أخبار وأدوات استثمارية.",
            footer_disc_title: "إخلاء المسؤولية القانونية",
            footer_disclaimer: "منصة ستارتا ماركتس هي منصة للبيانات والتقنيات المالية. جميع المحتويات والأدوات والتحليلات المقدَّمة هي لأغراض معلوماتية وتعليمية فقط، ولا ينبغي تفسيرها كاستشارات استثمارية أو توصيات بالشراء أو البيع لأي ورقة مالية أو صندوق استثماري. أسواق المال تنطوي على مخاطر وتذبذبات عالية؛ ويتحمل كل مستثمر المسؤولية الكاملة عن قراراته بعد الدراسة والدقة.",
            footer_lnk_account: "إنشاء حساب",
            footer_lnk_calc: "حاسبات الثروة",
            footer_lnk_funds: "الصناديق الاستثمارية",
            footer_lnk_home: "الرئيسية",
            footer_lnk_learn: "أكاديمية ستارتا",
            footer_lnk_login: "تسجيل الدخول",
            footer_lnk_news: "أخبار السوق",
            footer_lnk_privacy: "سياسة الخصوصية",
            footer_lnk_risk: "تقييم المخاطر",
            footer_lnk_terms: "شروط الخدمة",
            nav_calculators: "حاسبات الثروة",
            nav_cta: "قيّم ملفك الاستثماري",
            nav_funds: "الصناديق الاستثمارية",
            nav_home: "الرئيسية",
            nav_learn: "تعلّم",
            nav_mobile: "الصناديق الاستثمارية",
            nav_news: "أخبار السوق",
        }
    };

    window.STARTA_I18N = SHARED;

    function apply() {
        var dict = SHARED[document.documentElement.lang === "en" ? "en" : "ar"];
        document.querySelectorAll("[data-key]").forEach(function (el) {
            var key = el.getAttribute("data-key");
            if (Object.prototype.hasOwnProperty.call(dict, key)) el.innerHTML = dict[key];
        });
    }

    window.startaApplySharedI18n = apply;

    // <html lang> is the one signal every page already changes on toggle,
    // whatever its own i18n implementation looks like.
    function start() {
        apply();
        new MutationObserver(apply).observe(document.documentElement, {
            attributes: true, attributeFilter: ["lang"]
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
