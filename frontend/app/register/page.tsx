/**
 * ============================================================================
 * ULTRA-PREMIUM MOBILE REGISTER PAGE - WORLD-CLASS FINTECH DESIGN
 * ============================================================================
 * 
 * Enterprise-grade registration with:
 * - Desktop/Mobile responsive handling
 * - Animated gradients and glassmorphism
 * - Password strength meter
 * - Premium typography
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { StartaLogo } from "@/components/brand/StartaLogo";
import { track } from '@/lib/analytics';
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { writeSession } from "@/lib/auth-session";
import {
    User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, Loader2,
    AlertCircle, ArrowLeft, CheckCircle, ArrowLeftRight, Calculator,
    TrendingUp, Shield, Users
} from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";
import { useMobileRoutes } from "@/components/chatbot/hooks/useMobileRoutes";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";
import { useStoredLang } from "@/hooks/useStoredLang";
import { AUTH_LABELS, type AuthLabels } from "@/lib/auth-i18n";
import { createCheckoutSession } from "@/lib/api";
import {
    captureReturnPath,
    clearAuthHandoff,
    readAuthHandoff,
    resolvePostAuthDestination,
} from "@/lib/post-login";

function MobileRegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();
    const { getRoute } = useMobileRoutes();
    const { isDesktop, isSSR } = useDeviceDetect();

    // Language comes from STORAGE (mechanism #2) — /register has no /ar twin,
    // so an Arabic visitor must get Arabic copy on this same URL.
    const lang = useStoredLang();
    const isRtl = lang === "ar";
    const labels = AUTH_LABELS[lang];
    const t = labels.register;

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Remember where the user came from so we can return them there after
    // signing up (validated ?redirect= or same-origin referrer; default /Funds).
    useEffect(() => {
        captureReturnPath(searchParams.get("redirect"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle Google OAuth callback. Token params are scrubbed from the URL into
    // sessionStorage by the root layout before analytics see them — read the
    // hand-off stash first, raw query as fallback.
    useEffect(() => {
        const handoff = readAuthHandoff();
        const param = (key: string): string | null =>
            searchParams.get(key) ?? (handoff ? handoff[key as keyof typeof handoff] ?? null : null);

        const token = param("token");
        const refreshToken = param("refresh_token");
        const userStr = param("user");
        const googleAuth = param("google_auth");
        const errorParam = param("error");

        // Single-use stash: consume on first read so a partial payload can't
        // linger in sessionStorage and replay on the next mount.
        if (handoff) clearAuthHandoff();

        if (errorParam) {
            setError(t.errors.googleFailed);
            return;
        }

        if (googleAuth === "success" && token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                // writeSession (not raw localStorage) so every nav on the page —
                // including the vanilla renderer on the static pages — is told
                // about the new session instead of waiting for a reload.
                writeSession(token, user, refreshToken);
                clearAuthHandoff();

                const destination = resolvePostAuthDestination(param("redirect"));
                if (param("checkout") === "true" && param("plan") === "analyst") {
                    createCheckoutSession("price_1T66bq2UXuH5fA2IQIuSelxJ").then(data => {
                        if (data?.url) window.location.href = data.url;
                        else router.replace(destination);
                    }).catch(err => {
                        console.error("Checkout redirect failed", err);
                        router.replace(destination);
                    });
                    return;
                }

                router.replace(destination);
            } catch (e) {
                console.error("Failed to parse Google auth response", e);
                clearAuthHandoff();
                setError(t.errors.googleFailed);
            }
        }
    }, [searchParams, router, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // A double submit creates the account twice: the first request wins and
        // the second comes back "Email already registered", so an impatient
        // double-tap used to end on an error screen for an account that WAS
        // created. The in-flight flag is the guard.
        if (isLoading) return;
        setError(null);

        const fullName = formData.full_name.trim();
        const email = formData.email.trim();
        const phone = formData.phone.trim();

        if (!fullName) {
            setError(t.errors.nameRequired);
            return;
        }
        if (!email) {
            setError(labels.common.emailRequired);
            return;
        }
        // The browser's type="email" check accepts "ahmed@gmail" (no TLD) while
        // the API's validator rejects it, so validate here too and say so in the
        // user's own language instead of surfacing a Pydantic message.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setError(labels.common.emailInvalid);
            return;
        }
        if (formData.password.length < 8) {
            setError(t.errors.passwordTooShort);
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError(labels.common.passwordsMismatch);
            return;
        }

        setIsLoading(true);

        const result = await register({
            email,
            password: formData.password,
            full_name: fullName,
            ...(phone ? { phone } : {}),
        });

        if (result.success) {
            track('sign_up', { method: 'email' });
            if (searchParams.get("checkout") === "true" && searchParams.get("plan") === "analyst") {
                try {
                    const data = await createCheckoutSession("price_1T66bq2UXuH5fA2IQIuSelxJ");
                    if (data?.url) {
                        window.location.href = data.url;
                        return; // Keep loading spinner active during redirect
                    }
                } catch (err) {
                    console.error("Checkout failed:", err);
                }
            }
            setIsLoading(false);
            router.replace(resolvePostAuthDestination(searchParams.get("redirect")));
        } else {
            setIsLoading(false);
            setError(result.error || t.errors.registrationFailed);
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        const p = formData.password;
        if (!p) return { strength: 0, label: "", color: "" };
        let score = 0;
        if (p.length >= 6) score++;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;

        if (score <= 1) return { strength: 20, label: t.strength.weak, color: "bg-red-500" };
        if (score === 2) return { strength: 40, label: t.strength.fair, color: "bg-orange-500" };
        if (score === 3) return { strength: 60, label: t.strength.good, color: "bg-yellow-500" };
        if (score === 4) return { strength: 80, label: t.strength.strong, color: "bg-[#14B8A6]" };
        return { strength: 100, label: t.strength.excellent, color: "bg-green-500" };
    };

    const passwordStrength = getPasswordStrength();

    // Benefits for left panel (Desktop) — funds-first: these must describe what
    // the site SHIPS today. The AI analyst is hidden, so it is not sold here.
    const benefits = [
        { icon: Shield, text: t.benefits[0].title, description: t.benefits[0].description },
        { icon: ArrowLeftRight, text: t.benefits[1].title, description: t.benefits[1].description },
        { icon: Calculator, text: t.benefits[2].title, description: t.benefits[2].description },
    ];

    if (isSSR) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    // ========================================================================
    // DESKTOP LAYOUT - World-Class Split Screen
    // ========================================================================
    if (isDesktop) {
        return (
            <div
                dir={isRtl ? "rtl" : "ltr"}
                lang={lang}
                className={`fixed inset-0 flex overflow-hidden bg-white dark:bg-[#0A0F1C] ${isRtl ? "font-arabic" : ""}`}
            >
                {/* Left Panel - Premium Marketing */}
                <div className="hidden lg:flex w-[48%] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1425] to-[#0A1628]" />

                    {/* Floating Orbs */}
                    <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-[#14B8A6]/25 rounded-full blur-[140px] animate-pulse" />
                    <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-[#3B82F6]/15 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
                    <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-[#8B5CF6]/10 rounded-full blur-[100px] animate-pulse [animation-delay:3s]" />

                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.15)_0%,_transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />

                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }} />

                    <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 2xl:px-20 py-12 w-full h-full">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* The ONE brand lockup — this drew a lucide TrendingUp
                                glyph while /login two clicks away drew BarChart3. */}
                            <div className="flex items-center gap-3">
                                <StartaLogo size="lg" tone="onDark" href={getRoute('home')} />
                                <div className="ms-2 px-2 py-0.5 bg-[#14B8A6]/20 rounded-full">
                                    <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider">BETA</span>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex-1 flex flex-col justify-center -mt-8">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="mb-6"
                            >
                                <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold text-white leading-[1.05] tracking-tight mb-2">
                                    {t.heroLine1}
                                </h1>
                                <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold leading-[1.05] tracking-tight">
                                    <span className="bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">
                                        {t.heroLine2}
                                    </span>
                                </h1>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-slate-400 text-lg xl:text-xl leading-relaxed mb-10 max-w-[460px]"
                            >
                                {t.heroDescription}
                            </motion.p>

                            <div className="space-y-3">
                                {benefits.map((benefit, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                                        className="group relative"
                                    >
                                        <div className="relative flex items-center gap-4 p-4 xl:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#14B8A6]/40 transition-all duration-500 cursor-default overflow-hidden">
                                            <div className="absolute start-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#14B8A6] via-[#3B82F6] to-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 border border-[#14B8A6]/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-[#14B8A6]/10">
                                                <benefit.icon className="w-5 h-5 text-[#14B8A6]" />
                                            </div>
                                            <div className="relative">
                                                <span className="text-white font-semibold text-[15px] group-hover:text-[#14B8A6] transition-colors duration-300 block">
                                                    {benefit.text}
                                                </span>
                                                <span className="text-slate-500 text-sm">{benefit.description}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="flex items-center gap-4"
                        >
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 border-2 border-[#0A0F1C] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-[#14B8A6]" />
                                <p className="text-slate-400 text-sm">
                                    <span className="text-white font-semibold">{t.socialProof}</span>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Panel - Form (Shared Logic) */}
                <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-16 2xl:px-24 py-8 relative overflow-y-auto">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.06)_0%,_transparent_50%)]" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-[440px] mx-auto relative z-10"
                    >
                        {/* Desktop Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                {t.title}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                                {t.subtitle}
                            </p>
                        </div>

                        {renderSharedForm(formData, setFormData, showPassword, setShowPassword, isLoading, error, setError, focusedField, setFocusedField, passwordStrength, handleSubmit, getRoute, labels, lang, isRtl)}
                    </motion.div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // MOBILE LAYOUT - Ultra Premium Single Column
    // ========================================================================
    return (
        <div
            dir={isRtl ? "rtl" : "ltr"}
            lang={lang}
            className={`h-[100dvh] w-full bg-[#F8FAFC] dark:bg-[#0B1121] flex flex-col transition-colors duration-300 overflow-y-auto ${isRtl ? "font-arabic" : "font-sans"}`}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Background Effects */}
            <div className="fixed inset-0 bg-transparent dark:bg-[radial-gradient(circle_at_50%_0%,_#14B8A6_0%,_#0B1121_50%)] opacity-20 pointer-events-none" />

            <header className="px-4 py-4 relative z-10">
                <button
                    onClick={() => router.push(getRoute('home'))}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
                >
                    {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    <span>{t.backToHome}</span>
                </button>
            </header>

            <main className="flex-1 flex flex-col justify-center px-6 pb-10 overflow-y-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="py-6"
                >
                    {/* Logo area */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-5">
                            <StartaLogo size="lg" href={getRoute('home')} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white mb-2">{t.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center">{t.mobileSubtitle}</p>
                    </div>

                    {renderSharedForm(formData, setFormData, showPassword, setShowPassword, isLoading, error, setError, focusedField, setFocusedField, passwordStrength, handleSubmit, getRoute, labels, lang, isRtl)}
                </motion.div>
            </main>
        </div>
    );
}

// Helper to render form fields (Shared between Mobile/Desktop to ensure consistency)
function renderSharedForm(formData: any, setFormData: any, showPassword: boolean, setShowPassword: any, isLoading: boolean, error: string | null, setError: any, focusedField: any, setFocusedField: any, passwordStrength: any, handleSubmit: any, getRoute: any, labels: AuthLabels, lang: "en" | "ar", isRtl: boolean) {
    const t = labels.register;
    return (
        <>
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mb-5 overflow-hidden"
                    >
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t.fullNameLabel}
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'name' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <User className={`absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'name' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            name="name"
                            autoComplete="name"
                            required
                            maxLength={255}
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            onFocus={() => setFocusedField('name')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full ps-12 pe-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder={t.fullNamePlaceholder}
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {labels.common.emailLabel}
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'email' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Mail className={`absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            inputMode="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            required
                            maxLength={255}
                            dir="ltr"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full ps-12 pe-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder={labels.common.emailPlaceholder}
                        />
                    </div>
                </div>

                {/* Phone (optional). The users.phone column, the signup API field
                    and the Settings screen all already existed — registration was
                    the only step that never asked, so every account arrived with a
                    null phone and no way to reach the customer. */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t.phoneLabel}
                        <span className="ms-1.5 font-normal text-slate-400">({t.phoneOptional})</span>
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'phone' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Phone className={`absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'phone' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type="tel"
                            name="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            maxLength={20}
                            dir="ltr"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            onFocus={() => setFocusedField('phone')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full ps-12 pe-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder={t.phonePlaceholder}
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {labels.common.passwordLabel}
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Lock className={`absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="new-password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            dir="ltr"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full ps-12 pe-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder={t.passwordPlaceholder}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {/* Password Strength Meter */}
                    {formData.password && (
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${passwordStrength.color}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${passwordStrength.strength}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <span className={`text-xs font-semibold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                {passwordStrength.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {labels.common.confirmPasswordLabel}
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'confirm' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Lock className={`absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'confirm' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="confirm-password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            dir="ltr"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            onFocus={() => setFocusedField('confirm')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full ps-12 pe-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder={t.confirmPasswordPlaceholder}
                        />
                        {formData.confirmPassword && formData.password === formData.confirmPassword && (
                            <CheckCircle className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        )}
                    </div>
                </div>

                {/* Premium Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-4 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />
                    <span className="relative text-white flex items-center gap-2">
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {t.submit}
                                {isRtl
                                    ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                                    : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />}
                            </>
                        )}
                    </span>
                </button>
            </form>

            {/* Divider */}
            <div className="my-6">
                <OrDivider lang={lang} />
            </div>

            {/* Google Sign Up */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                <div className="relative">
                    <GoogleLoginButton
                        mode="register"
                        lang={lang}
                        onError={(err) => setError(err)}
                    />
                </div>
            </div>

            {/* Login link */}
            <div className="text-center mt-6">
                <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                    {t.haveAccount}{" "}
                    <Link href={getRoute('login')} className="text-[#14B8A6] font-bold hover:text-[#0D9488] transition-colors hover:underline underline-offset-2">
                        {t.signInLink}
                    </Link>
                </p>
            </div>
        </>
    );
}

export default function MobileRegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-white dark:bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <MobileRegisterPageContent />
        </Suspense>
    );
}
