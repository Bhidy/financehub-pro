/**
 * ============================================================================
 * REGISTRATION GATE COPY (EN / AR)
 * ============================================================================
 *
 * One dictionary for every place the site asks a visitor to create an account.
 * See REGISTRATION_STRATEGY.md for which surfaces may use these and which may
 * never be gated at all.
 *
 * WRITING RULE FOR THIS FILE
 * Each gate names the ONE thing the account unlocks, in the visitor's own terms,
 * and says why it needs an account. "Unlock the full analysis" is acceptable on
 * a page whose analysis is genuinely withheld; it is not acceptable as generic
 * filler on a watchlist, where the honest sentence is that a list kept in one
 * browser disappears when that browser is cleared. A gate that cannot explain
 * itself in one sentence is a gate in the wrong place.
 *
 * Every reason must state a LIMIT the visitor has actually reached, or a feature
 * that genuinely cannot work without an account. Never invent scarcity.
 */

import type { StoredLang } from "@/hooks/useStoredLang";

/** Why a visitor is being asked to register. One per gated capability. */
export type GateReason =
    /** Watchlist past the free symbol allowance. */
    | "watchlist"
    /** Comparing more funds than the free allowance. */
    | "compareFunds"
    /** Comparing more companies than the free allowance. */
    | "compareCompanies"
    /** Price / NAV alerts — cannot exist without an account to notify. */
    | "alerts"
    /** Saved filters and screens. */
    | "savedFilters"
    /** Bulk data export. */
    | "export";

export interface GateCopy {
    /** Headline. A statement of what is on the other side, never a scold. */
    title: string;
    /** One sentence: what an account changes, concretely. */
    body: string;
    /** Primary action. Always says the account is free. */
    cta: string;
    /** Secondary action for people who already have one. */
    signin: string;
    /** One-line variant for narrow slots, where the panel would not fit. */
    compact: string;
}

/** The soft, dismissible invitation — Tier 3. Never attached to a blocked action. */
export interface InviteCopy {
    title: string;
    body: string;
    cta: string;
    dismiss: string;
}

interface GateLabels {
    reasons: Record<GateReason, GateCopy>;
    invite: InviteCopy;
    /** Shown next to a limit, e.g. "2 of 3". */
    remaining: (used: number, total: number) => string;
}

const en: GateLabels = {
    reasons: {
        watchlist: {
            title: "Keep more than three on your list",
            body: "A watchlist kept in this browser disappears the moment you clear it, and it never follows you to your phone. A free account keeps it, on every device you sign in from.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to watch more than three.",
        },
        compareFunds: {
            title: "Compare more than two funds",
            body: "Two funds is a glance; a shortlist is research. A free account holds your comparison so you can come back to it instead of rebuilding it.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to compare more than two funds.",
        },
        compareCompanies: {
            title: "Compare more than two companies",
            body: "A free account keeps your comparison set between visits, so the work you have already done is still here tomorrow.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to compare more than two companies.",
        },
        alerts: {
            title: "Get told when the number moves",
            body: "Set a level on a fund or a share and we will tell you when it is reached. That needs an account, because it needs somewhere to send it.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to set an alert.",
        },
        savedFilters: {
            title: "Save this search",
            body: "Keep the filters you have set and open them again in one click, instead of rebuilding them each visit.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to save this search.",
        },
        export: {
            title: "Download this data",
            body: "Exports are available to anyone with a free account, so we know who is taking the data and can tell you when it changes.",
            cta: "Create a free account",
            signin: "Sign in",
            compact: "Sign in to download.",
        },
    },
    invite: {
        title: "Keep what you are reading",
        body: "You have looked at a few of these. A free account keeps your list and your comparisons between visits.",
        cta: "Create a free account",
        dismiss: "Not now",
    },
    remaining: (used, total) => `${used} of ${total} free`,
};

const ar: GateLabels = {
    reasons: {
        watchlist: {
            title: "تابع أكثر من ثلاثة",
            body: "قائمة المتابعة المحفوظة في هذا المتصفح تختفي بمجرد مسح بياناته، ولا تنتقل معك إلى هاتفك. الحساب المجاني يحتفظ بها على كل جهاز تسجّل الدخول منه.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول لمتابعة أكثر من ثلاثة.",
        },
        compareFunds: {
            title: "قارن أكثر من صندوقين",
            body: "صندوقان نظرة سريعة، أما القائمة المختصرة فهي بحث. الحساب المجاني يحفظ مقارنتك لتعود إليها بدل أن تبنيها من جديد.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول لمقارنة أكثر من صندوقين.",
        },
        compareCompanies: {
            title: "قارن أكثر من شركتين",
            body: "الحساب المجاني يحتفظ بمجموعة المقارنة بين الزيارات، فيبقى ما أنجزته موجودًا غدًا.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول لمقارنة أكثر من شركتين.",
        },
        alerts: {
            title: "اعرف فور تحرّك الرقم",
            body: "حدّد مستوى على صندوق أو سهم ونخبرك عند بلوغه. هذا يحتاج حسابًا، لأنه يحتاج جهة نرسل إليها التنبيه.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول لضبط تنبيه.",
        },
        savedFilters: {
            title: "احفظ هذا البحث",
            body: "احتفظ بالفلاتر التي ضبطتها وافتحها بنقرة واحدة بدل إعادة ضبطها كل زيارة.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول لحفظ هذا البحث.",
        },
        export: {
            title: "نزّل هذه البيانات",
            body: "التنزيل متاح لكل من لديه حساب مجاني، حتى نعرف من يأخذ البيانات ونخبره عند تغيّرها.",
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            compact: "سجّل الدخول للتنزيل.",
        },
    },
    invite: {
        title: "احتفظ بما تقرأه",
        body: "اطّلعت على عدد منها. الحساب المجاني يحفظ قائمتك ومقارناتك بين الزيارات.",
        cta: "أنشئ حسابًا مجانيًا",
        dismiss: "ليس الآن",
    },
    // Arabic-Indic digits keep the count in the same numeral system as the page.
    remaining: (used, total) =>
        `${used.toLocaleString("ar-EG")} من ${total.toLocaleString("ar-EG")} مجانًا`,
};

export const GATE_LABELS: Record<StoredLang, GateLabels> = { en, ar };

/**
 * THE WRAPPER CLASS, and the contract behind it.
 *
 * Every gated block carries this class, and it is the `cssSelector` named in the
 * paywall structured data (see lib/paywall-jsonld.ts). Google requires that
 * markup whenever content is present in the HTML but withheld from the visitor;
 * without it, serving a crawler more than a person is cloaking. Change this
 * string and you must change it in the JSON-LD in the same commit — a build gate
 * checks that they still agree.
 */
export const GATED_CLASS = "starta-gated";
