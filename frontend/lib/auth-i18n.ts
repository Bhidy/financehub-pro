/**
 * ============================================================================
 * AUTH COPY DICTIONARY (EN / AR) — /login, /register, /forgot-password + nav
 * ============================================================================
 *
 * These three pages are SINGLE-URL pages: there is no /ar/login twin and none
 * should be invented. They follow i18n mechanism #2 — the language comes from
 * storage (`useStoredLang`, which mirrors public/assets/starta-lang-boot.js).
 * That is what makes a footer "Login" link on an Arabic page land on an ARABIC
 * login screen instead of silently flipping the visitor to English.
 *
 * Every user-visible string on those pages lives here. If you add copy to an
 * auth screen, add it to `AuthLabels` — TypeScript then forces the Arabic
 * translation to exist, so a page can never be half-translated.
 */

import type { StoredLang } from "@/hooks/useStoredLang";
import authNav from "@/lib/auth-nav.json";

export interface AuthLabels {
    /** Shared across all three auth screens. */
    common: {
        or: string;
        googleContinue: string;
        googleSignUp: string;
        secureFooter: string;
        emailLabel: string;
        emailPlaceholder: string;
        passwordLabel: string;
        confirmPasswordLabel: string;
        emailRequired: string;
        emailInvalid: string;
        passwordsMismatch: string;
    };
    /** Site navigation auth affordances. */
    nav: {
        signIn: string;
        createAccount: string;
        signOut: string;
        account: string;
    };
    login: {
        heroLine1: string;
        heroLine2: string;
        heroDescription: string;
        features: readonly [string, string, string];
        socialProof: string;
        title: string;
        subtitle: string;
        passwordPlaceholder: string;
        rememberMe: string;
        forgotPassword: string;
        submit: string;
        noAccount: string;
        createFreeAccount: string;
        errors: {
            passwordRequired: string;
            loginFailed: string;
            googleFailed: string;
        };
    };
    register: {
        heroLine1: string;
        heroLine2: string;
        heroDescription: string;
        benefits: readonly [
            { title: string; description: string },
            { title: string; description: string },
            { title: string; description: string },
        ];
        socialProof: string;
        title: string;
        subtitle: string;
        backToHome: string;
        mobileSubtitle: string;
        fullNameLabel: string;
        fullNamePlaceholder: string;
        phoneLabel: string;
        phoneOptional: string;
        phonePlaceholder: string;
        passwordPlaceholder: string;
        confirmPasswordPlaceholder: string;
        submit: string;
        haveAccount: string;
        signInLink: string;
        strength: {
            weak: string;
            fair: string;
            good: string;
            strong: string;
            excellent: string;
        };
        errors: {
            nameRequired: string;
            passwordTooShort: string;
            registrationFailed: string;
            googleFailed: string;
        };
    };
    forgot: {
        heroLine1: string;
        heroLine2: string;
        heroDescription: string;
        benefits: readonly [
            { title: string; description: string },
            { title: string; description: string },
            { title: string; description: string },
        ];
        socialProof: string;
        backToLogin: string;
        back: string;
        emailTitle: string;
        emailSubtitle: string;
        sendCode: string;
        otpTitle: string;
        otpSubtitlePrefix: string;
        noCode: string;
        resend: string;
        newPasswordTitle: string;
        newPasswordSubtitle: string;
        newPasswordLabel: string;
        newPasswordPlaceholder: string;
        confirmPasswordPlaceholder: string;
        resetPassword: string;
        successTitle: string;
        successBody: string;
        backToLoginCta: string;
        errors: {
            invalidEmail: string;
            sendCodeFailed: string;
            incompleteCode: string;
            invalidCode: string;
            passwordTooShort: string;
            resetFailed: string;
        };
    };
}

const EN: AuthLabels = {
    common: {
        or: "or",
        googleContinue: "Continue with Google",
        googleSignUp: "Sign up with Google",
        secureFooter: "© 2026 Starta. Secure & Encrypted.",
        emailLabel: "Email address",
        emailPlaceholder: "name@company.com",
        passwordLabel: "Password",
        confirmPasswordLabel: "Confirm Password",
        emailRequired: "Please enter your email",
        emailInvalid: "Please enter a valid email address",
        passwordsMismatch: "Passwords do not match",
    },
    nav: {
        ...authNav.labels.en,
    },
    login: {
        heroLine1: "Egypt's Mutual Funds",
        heroLine2: "In One Place.",
        heroDescription:
            "Compare every Egyptian mutual fund, track real NAV history, and plan with tools built for long-term investors.",
        features: [
            "Every Egyptian mutual fund, one comparison",
            "Real NAV history and returns",
            "Free wealth & risk tools",
        ],
        socialProof: "Built for Egyptian investors",
        title: "Welcome back",
        subtitle: "Sign in to your account to continue",
        passwordPlaceholder: "Enter your password",
        rememberMe: "Remember me",
        forgotPassword: "Forgot password?",
        submit: "Sign In",
        noAccount: "Don't have an account?",
        createFreeAccount: "Create free account",
        errors: {
            passwordRequired: "Please enter your password",
            loginFailed: "Login failed",
            googleFailed: "Google login failed. Please try again.",
        },
    },
    register: {
        heroLine1: "Start Investing",
        heroLine2: "With Clarity.",
        heroDescription:
            "Create your free account to compare Egyptian mutual funds, save your shortlist, and unlock the full fund scorecards.",
        benefits: [
            { title: "Full Fund Scorecards", description: "Performance, risk, cost and stability" },
            { title: "Compare Side by Side", description: "Up to 4 funds at once" },
            { title: "Wealth & Retirement Tools", description: "Plan with your own numbers" },
        ],
        socialProof: "Built for Egyptian investors",
        title: "Create Account",
        subtitle: "Start your journey with Starta today",
        backToHome: "Back to Starta",
        mobileSubtitle: "Compare Egyptian mutual funds with Starta",
        fullNameLabel: "Full Name",
        fullNamePlaceholder: "John Doe",
        phoneLabel: "Phone Number",
        phoneOptional: "optional",
        phonePlaceholder: "+20 100 000 0000",
        passwordPlaceholder: "Min 8 characters",
        confirmPasswordPlaceholder: "Confirm your password",
        submit: "Get Started",
        haveAccount: "Already have an account?",
        signInLink: "Sign in",
        strength: {
            weak: "Weak",
            fair: "Fair",
            good: "Good",
            strong: "Strong",
            excellent: "Excellent",
        },
        errors: {
            nameRequired: "Please enter your full name",
            passwordTooShort: "Password must be at least 8 characters",
            registrationFailed: "Registration failed",
            googleFailed: "Google sign-up failed. Please try again.",
        },
    },
    forgot: {
        heroLine1: "Start Investing",
        heroLine2: "With Clarity.",
        heroDescription:
            "Recover your account to keep comparing Egyptian mutual funds and planning with your own numbers.",
        benefits: [
            { title: "Full Fund Scorecards", description: "Performance, risk, cost and stability" },
            { title: "Compare Side by Side", description: "Up to 4 funds at once" },
            { title: "Wealth & Retirement Tools", description: "Plan with your own numbers" },
        ],
        socialProof: "Built for Egyptian investors",
        backToLogin: "Back to login",
        back: "Back",
        emailTitle: "Forgot Password?",
        emailSubtitle:
            "Enter your email address and we'll send you a verification code to reset your password.",
        sendCode: "Send Code",
        otpTitle: "Check your Email",
        otpSubtitlePrefix: "We sent a 4-digit code to",
        noCode: "Didn't receive code?",
        resend: "Resend Email",
        newPasswordTitle: "Create New Password",
        newPasswordSubtitle: "Your identity is verified. Set your new password below.",
        newPasswordLabel: "New Password",
        newPasswordPlaceholder: "Min. 6 characters",
        confirmPasswordPlaceholder: "Re-enter password",
        resetPassword: "Reset Password",
        successTitle: "Password Reset!",
        successBody:
            "Your account has been successfully recovered. You can now log in with your new password.",
        backToLoginCta: "Back to Login",
        errors: {
            invalidEmail: "Please enter a valid email address",
            sendCodeFailed: "Failed to send code. Please try again.",
            incompleteCode: "Please enter the complete 4-digit code",
            invalidCode: "Invalid code. Please check your email.",
            passwordTooShort: "Password must be at least 6 characters",
            resetFailed: "Failed to reset password.",
        },
    },
};

const AR: AuthLabels = {
    common: {
        or: "أو",
        googleContinue: "المتابعة باستخدام Google",
        googleSignUp: "إنشاء حساب باستخدام Google",
        secureFooter: "© 2026 ستارتا. آمن ومشفّر.",
        emailLabel: "البريد الإلكتروني",
        emailPlaceholder: "name@company.com",
        passwordLabel: "كلمة المرور",
        confirmPasswordLabel: "تأكيد كلمة المرور",
        emailRequired: "يرجى إدخال بريدك الإلكتروني",
        emailInvalid: "يرجى إدخال بريد إلكتروني صحيح",
        passwordsMismatch: "كلمتا المرور غير متطابقتين",
    },
    nav: {
        ...authNav.labels.ar,
    },
    login: {
        heroLine1: "صناديق مصر الاستثمارية",
        heroLine2: "في مكان واحد.",
        heroDescription:
            "قارن كل صناديق الاستثمار المصرية، وتابع تاريخ صافي قيمة الأصول الحقيقي، وخطط بأدوات مصممة للمستثمر طويل الأجل.",
        features: [
            "كل صناديق الاستثمار المصرية في مقارنة واحدة",
            "تاريخ حقيقي لصافي قيمة الأصول والعوائد",
            "أدوات مجانية للثروة والمخاطر",
        ],
        socialProof: "مصمم للمستثمر المصري",
        title: "مرحبًا بعودتك",
        subtitle: "سجّل الدخول إلى حسابك للمتابعة",
        passwordPlaceholder: "أدخل كلمة المرور",
        rememberMe: "تذكّرني",
        forgotPassword: "نسيت كلمة المرور؟",
        submit: "تسجيل الدخول",
        noAccount: "ليس لديك حساب؟",
        createFreeAccount: "أنشئ حسابًا مجانيًا",
        errors: {
            passwordRequired: "يرجى إدخال كلمة المرور",
            loginFailed: "فشل تسجيل الدخول",
            googleFailed: "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.",
        },
    },
    register: {
        heroLine1: "ابدأ الاستثمار",
        heroLine2: "بوضوح.",
        heroDescription:
            "أنشئ حسابك المجاني لمقارنة صناديق الاستثمار المصرية، وحفظ قائمتك المختارة، والاطلاع على بطاقات تقييم الصناديق كاملة.",
        benefits: [
            { title: "بطاقات تقييم الصناديق كاملة", description: "الأداء والمخاطر والتكلفة والاستقرار" },
            { title: "مقارنة جنبًا إلى جنب", description: "حتى 4 صناديق معًا" },
            { title: "أدوات الثروة والتقاعد", description: "خطط بأرقامك أنت" },
        ],
        socialProof: "مصمم للمستثمر المصري",
        title: "إنشاء حساب",
        subtitle: "ابدأ رحلتك مع ستارتا اليوم",
        backToHome: "العودة إلى ستارتا",
        mobileSubtitle: "قارن صناديق الاستثمار المصرية مع ستارتا",
        fullNameLabel: "الاسم الكامل",
        fullNamePlaceholder: "أحمد محمد",
        phoneLabel: "رقم الهاتف",
        phoneOptional: "اختياري",
        phonePlaceholder: "+20 100 000 0000",
        passwordPlaceholder: "8 أحرف على الأقل",
        confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
        submit: "ابدأ الآن",
        haveAccount: "لديك حساب بالفعل؟",
        signInLink: "تسجيل الدخول",
        strength: {
            weak: "ضعيفة",
            fair: "مقبولة",
            good: "جيدة",
            strong: "قوية",
            excellent: "ممتازة",
        },
        errors: {
            nameRequired: "يرجى إدخال اسمك الكامل",
            passwordTooShort: "يجب ألا تقل كلمة المرور عن 8 أحرف",
            registrationFailed: "فشل إنشاء الحساب",
            googleFailed: "فشل إنشاء الحساب عبر Google. يرجى المحاولة مرة أخرى.",
        },
    },
    forgot: {
        heroLine1: "ابدأ الاستثمار",
        heroLine2: "بوضوح.",
        heroDescription:
            "استعد حسابك لمواصلة مقارنة صناديق الاستثمار المصرية والتخطيط بأرقامك أنت.",
        benefits: [
            { title: "بطاقات تقييم الصناديق كاملة", description: "الأداء والمخاطر والتكلفة والاستقرار" },
            { title: "مقارنة جنبًا إلى جنب", description: "حتى 4 صناديق معًا" },
            { title: "أدوات الثروة والتقاعد", description: "خطط بأرقامك أنت" },
        ],
        socialProof: "مصمم للمستثمر المصري",
        backToLogin: "العودة إلى تسجيل الدخول",
        back: "رجوع",
        emailTitle: "نسيت كلمة المرور؟",
        emailSubtitle:
            "أدخل بريدك الإلكتروني وسنرسل إليك رمز تحقق لإعادة تعيين كلمة المرور.",
        sendCode: "إرسال الرمز",
        otpTitle: "تحقّق من بريدك الإلكتروني",
        otpSubtitlePrefix: "أرسلنا رمزًا مكوّنًا من 4 أرقام إلى",
        noCode: "لم يصلك الرمز؟",
        resend: "إعادة إرسال الرسالة",
        newPasswordTitle: "إنشاء كلمة مرور جديدة",
        newPasswordSubtitle: "تم التحقق من هويتك. عيّن كلمة المرور الجديدة أدناه.",
        newPasswordLabel: "كلمة المرور الجديدة",
        newPasswordPlaceholder: "6 أحرف على الأقل",
        confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
        resetPassword: "إعادة تعيين كلمة المرور",
        successTitle: "تم تغيير كلمة المرور!",
        successBody:
            "تم استرداد حسابك بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
        backToLoginCta: "العودة إلى تسجيل الدخول",
        errors: {
            invalidEmail: "يرجى إدخال بريد إلكتروني صحيح",
            sendCodeFailed: "تعذّر إرسال الرمز. يرجى المحاولة مرة أخرى.",
            incompleteCode: "يرجى إدخال الرمز المكوّن من 4 أرقام كاملًا",
            invalidCode: "رمز غير صحيح. يرجى مراجعة بريدك الإلكتروني.",
            passwordTooShort: "يجب ألا تقل كلمة المرور عن 6 أحرف",
            resetFailed: "تعذّرت إعادة تعيين كلمة المرور.",
        },
    },
};

/** Every auth string, keyed by the language `useStoredLang()` resolves. */
export const AUTH_LABELS: Record<StoredLang, AuthLabels> = { en: EN, ar: AR };

/** Stable per-language reference — safe to put in a hook dependency array. */
export function getAuthLabels(lang: StoredLang): AuthLabels {
    return AUTH_LABELS[lang];
}
