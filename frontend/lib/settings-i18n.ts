/**
 * ============================================================================
 * SETTINGS COPY DICTIONARY (EN / AR)
 * ============================================================================
 *
 * /settings is a SINGLE-URL page — there is no /ar/settings twin and none
 * should be invented. It follows i18n mechanism #2: the language comes from
 * storage via `useStoredLang()`, exactly as /login, /register and
 * /forgot-password do (see lib/auth-i18n.ts and hooks/useStoredLang.ts).
 *
 * WHY THIS FILE EXISTS
 * The settings screen had NO language support at all. Every string was an
 * English literal in the JSX, so a visitor reading the site in Arabic — the
 * site's DEFAULT language — clicked through to their own account and landed in
 * English. Worse, the screen's own Language card listed Arabic as "Coming Soon"
 * and greyed it out, while the entire rest of the site had shipped in Arabic
 * for months. It told the truth about itself and a falsehood about the product.
 *
 * The interface is exhaustive on purpose: TypeScript then refuses a
 * half-translated screen. If you add a visible string to /settings, add it here
 * and the Arabic will be required of you.
 */

import type { StoredLang } from "@/hooks/useStoredLang";

export interface SettingsLabels {
    /** Page chrome. */
    page: {
        title: string;
        subtitle: string;
        backHome: string;
        signOut: string;
    };
    /** The section rail. */
    nav: {
        personal: string;
        billing: string;
        security: string;
        app: string;
        notifications: string;
        help: string;
        adminArea: string;
        userManagement: string;
    };
    personal: {
        title: string;
        subtitle: string;
        fullName: string;
        fullNamePlaceholder: string;
        phone: string;
        phonePlaceholder: string;
        email: string;
        save: string;
        saving: string;
        saved: string;
    };
    security: {
        title: string;
        subtitle: string;
        changePassword: string;
        current: string;
        next: string;
        minChars: string;
        update: string;
        updating: string;
        updated: string;
        signOutEverywhere: string;
        signOutEverywhereHint: string;
    };
    appearance: {
        title: string;
        subtitle: string;
        light: string;
        lightHint: string;
        dark: string;
        darkHint: string;
    };
    language: {
        title: string;
        subtitle: string;
        active: string;
        /** Each language is named in its OWN script — never translated, and
         *  never represented by a flag: a language is not a country, and the
         *  screen previously used a Saudi flag for the Arabic of an Egyptian
         *  product. */
        english: string;
        arabic: string;
        switchHint: string;
    };
    notifications: {
        title: string;
        subtitle: string;
        /** Keyed by lib/api.ts NotificationPreferences so a label can never be
         *  shown against a different flag from the one being written. */
        items: Record<
            "price_alerts" | "volume_spikes" | "weekly_report" | "academy_news" | "push_notifs" | "security_alert",
            { label: string; hint: string }
        >;
    };
    billing: {
        title: string;
        subtitle: string;
        paymentSecurity: string;
        stripeNote: string;
    };
    help: {
        title: string;
        subtitle: string;
    };
    errors: {
        generic: string;
        passwordTooShort: string;
    };
}

const en: SettingsLabels = {
    page: {
        title: "Settings",
        subtitle: "Manage your account preferences",
        backHome: "Back to home",
        signOut: "Sign out",
    },
    nav: {
        personal: "Personal details",
        billing: "Subscription & billing",
        security: "Security",
        app: "App settings",
        notifications: "Notifications",
        help: "Help & support",
        adminArea: "Admin area",
        userManagement: "User management",
    },
    personal: {
        title: "Personal details",
        subtitle: "Manage your identity information.",
        fullName: "Full name",
        fullNamePlaceholder: "Enter your full name",
        phone: "Phone number",
        phonePlaceholder: "Enter your phone number",
        email: "Email address",
        save: "Save changes",
        saving: "Saving…",
        saved: "Your details have been saved.",
    },
    security: {
        title: "Security",
        subtitle: "Keep your account secure with a strong password.",
        changePassword: "Change password",
        current: "Current password",
        next: "New password",
        minChars: "At least 6 characters",
        update: "Update password",
        updating: "Updating…",
        updated: "Your password has been changed.",
        signOutEverywhere: "Sign out",
        signOutEverywhereHint: "End this session on this device.",
    },
    appearance: {
        title: "Appearance",
        subtitle: "Choose how Starta looks on this device.",
        light: "Light",
        lightHint: "The default across the site",
        dark: "Dark",
        darkHint: "Easier on the eyes at night",
    },
    language: {
        title: "Language",
        subtitle: "Choose the language you read the site in.",
        active: "Active",
        english: "English",
        arabic: "العربية",
        switchHint: "Applies across the whole site, on this device.",
    },
    notifications: {
        title: "Notifications",
        subtitle: "Choose what Starta tells you about.",
        items: {
            price_alerts: { label: "Price alerts", hint: "When a fund or share reaches a level you set." },
            volume_spikes: { label: "Volume spikes", hint: "Unusual trading activity on names you follow." },
            weekly_report: { label: "Weekly report", hint: "A digest of the week on the Egyptian Exchange." },
            academy_news: { label: "Academy", hint: "New explainers and guides as they publish." },
            push_notifs: { label: "Push notifications", hint: "Alerts on this device rather than by email." },
            security_alert: { label: "Security alerts", hint: "Sign-ins and changes to your account. Always recommended." },
        },
    },
    billing: {
        title: "Subscription & billing",
        subtitle: "Manage your plan and payment method.",
        paymentSecurity: "Payment security",
        stripeNote: "Payments are processed by Stripe. Starta never stores your card details.",
    },
    help: {
        title: "Help & support",
        subtitle: "Get in touch, or read how our data is produced.",
    },
    errors: {
        generic: "Something went wrong. Please try again.",
        passwordTooShort: "Your new password must be at least 6 characters.",
    },
};

const ar: SettingsLabels = {
    page: {
        title: "الإعدادات",
        subtitle: "إدارة تفضيلات حسابك",
        backHome: "العودة إلى الرئيسية",
        signOut: "تسجيل الخروج",
    },
    nav: {
        personal: "البيانات الشخصية",
        billing: "الاشتراك والفواتير",
        security: "الأمان",
        app: "إعدادات التطبيق",
        notifications: "الإشعارات",
        help: "المساعدة والدعم",
        adminArea: "منطقة الإدارة",
        userManagement: "إدارة المستخدمين",
    },
    personal: {
        title: "البيانات الشخصية",
        subtitle: "إدارة بيانات هويتك.",
        fullName: "الاسم بالكامل",
        fullNamePlaceholder: "أدخل اسمك بالكامل",
        phone: "رقم الهاتف",
        phonePlaceholder: "أدخل رقم هاتفك",
        email: "البريد الإلكتروني",
        save: "حفظ التغييرات",
        saving: "جارٍ الحفظ…",
        saved: "تم حفظ بياناتك.",
    },
    security: {
        title: "الأمان",
        subtitle: "حافظ على أمان حسابك بكلمة مرور قوية.",
        changePassword: "تغيير كلمة المرور",
        current: "كلمة المرور الحالية",
        next: "كلمة المرور الجديدة",
        minChars: "٦ أحرف على الأقل",
        update: "تحديث كلمة المرور",
        updating: "جارٍ التحديث…",
        updated: "تم تغيير كلمة المرور.",
        signOutEverywhere: "تسجيل الخروج",
        signOutEverywhereHint: "إنهاء الجلسة على هذا الجهاز.",
    },
    appearance: {
        title: "المظهر",
        subtitle: "اختر شكل ستارتا على هذا الجهاز.",
        light: "فاتح",
        lightHint: "الوضع الافتراضي في الموقع",
        dark: "داكن",
        darkHint: "أريح للعين ليلاً",
    },
    language: {
        title: "اللغة",
        subtitle: "اختر اللغة التي تقرأ بها الموقع.",
        active: "مفعّلة",
        english: "English",
        arabic: "العربية",
        switchHint: "يُطبَّق على الموقع بالكامل على هذا الجهاز.",
    },
    notifications: {
        title: "الإشعارات",
        subtitle: "اختر ما تريد أن يخبرك به ستارتا.",
        items: {
            price_alerts: { label: "تنبيهات الأسعار", hint: "عند وصول صندوق أو سهم إلى مستوى تحدده." },
            volume_spikes: { label: "ارتفاع أحجام التداول", hint: "نشاط تداول غير معتاد على ما تتابعه." },
            weekly_report: { label: "التقرير الأسبوعي", hint: "ملخص أسبوع التداول في البورصة المصرية." },
            academy_news: { label: "الأكاديمية", hint: "الشروحات والأدلة الجديدة فور نشرها." },
            push_notifs: { label: "الإشعارات الفورية", hint: "تنبيهات على هذا الجهاز بدلاً من البريد." },
            security_alert: { label: "تنبيهات الأمان", hint: "تسجيلات الدخول والتغييرات على حسابك. يُنصح بإبقائها مفعّلة." },
        },
    },
    billing: {
        title: "الاشتراك والفواتير",
        subtitle: "إدارة باقتك ووسيلة الدفع.",
        paymentSecurity: "أمان الدفع",
        stripeNote: "تتم معالجة المدفوعات عبر Stripe، ولا تحتفظ ستارتا ببيانات بطاقتك.",
    },
    help: {
        title: "المساعدة والدعم",
        subtitle: "تواصل معنا، أو اطّلع على طريقة إعداد بياناتنا.",
    },
    errors: {
        generic: "حدث خطأ ما. برجاء المحاولة مرة أخرى.",
        passwordTooShort: "يجب ألا تقل كلمة المرور الجديدة عن ٦ أحرف.",
    },
};

/** Every settings string, keyed by the language `useStoredLang()` resolves. */
export const SETTINGS_LABELS: Record<StoredLang, SettingsLabels> = { en, ar };
