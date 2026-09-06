/**
 * ============================================================================
 * /settings — THE ACCOUNT CONSOLE
 * ============================================================================
 *
 * DIRECTION
 * The calm, instrument-panel sibling of the sign-in screen: the site's own
 * theme tokens and brand lockup, a quiet two-column rail, and content that
 * never shouts. A settings screen earns its keep by being legible and
 * predictable, not by being decorated.
 *
 * WHAT THIS REPLACED, AND WHY
 * The previous version was a private design that had drifted away from the
 * product in five measurable ways. Each is worth naming so it is not
 * reintroduced:
 *
 *  1. BRAND. It drew a lucide TrendingUp glyph in a teal tile beside a
 *     mixed-case "Starta" — neither the mark nor the wordmark the landing page
 *     uses. Worse, the glyph was `text-slate-900 dark:text-white`, so in the
 *     LIGHT theme a near-black icon sat on a teal tile. It now uses the ONE
 *     lockup, components/brand/StartaLogo.tsx.
 *  2. LANGUAGE. There was no language support at all: every string was an
 *     English literal, so a visitor reading the site in Arabic — the site's
 *     DEFAULT — clicked into their own account and landed in English. And the
 *     screen's own Language card listed Arabic as "Coming Soon" behind a Saudi
 *     flag, on an Egyptian product, months after Arabic shipped site-wide.
 *     Copy now lives in lib/settings-i18n.ts and the switch actually works.
 *  3. COLOUR. It used the off-brand teal throughout — one digit off `#14B8A6`,
 *     which reads as a slightly different green beside the real one. That value
 *     had spread to 204 places in 11 files, including four token definitions in
 *     globals.css, and one conic-gradient carried BOTH spellings three stops
 *     apart. All of them are now the brand teal.
 *  4. SURFACES. `bg-white dark:bg-[#0B1121]`, `bg-slate-50`, `slate-*` text.
 *     The page decided privately what the product looks like and rendered on a
 *     background (#f1f5f9) that no other page uses. It now takes the theme
 *     tokens — bg-page / bg-surface / text-main / text-muted / border-border —
 *     so it follows light and dark like every other surface.
 *  5. SCALE. `rounded-[2rem]` and `shadow-2xl` on every card, plus a decorative
 *     masked-gradient border on each one. One radius family, one shadow, used
 *     deliberately, is the house style.
 *
 * See DESIGN_SYSTEM.md. The brand and typography rules here are build-gated in
 * scripts/verify-route-aliases.mjs.
 *
 * ONE RESPONSIVE TREE. The previous file carried a full desktop layout and a
 * full mobile layout as separate component trees — every field, label and
 * handler written twice, which is how the two fell out of step. The rail
 * collapses to a scrollable row below `lg`; there is one of everything.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    Loader2, User as UserIcon, Phone, Lock, Check, AlertCircle, Sun, Moon, Mail,
    LogOut, Globe, Shield, ChevronLeft, ChevronRight, Bell, CreditCard,
    HelpCircle, Users, ArrowLeft, ArrowRight,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import {
    updateProfile, changePassword, createCustomerPortalSession,
    createCheckoutSession, fetchNotificationPreferences, updateNotificationPreferences,
} from "@/lib/api";
import type { NotificationPreferences } from "@/lib/api";
import { StartaLogo } from "@/components/brand/StartaLogo";
import { useStoredLang, LANG_CHANGE_EVENT, type StoredLang } from "@/hooks/useStoredLang";
import { SETTINGS_LABELS, type SettingsLabels } from "@/lib/settings-i18n";

type Section = "personal" | "billing" | "security" | "app" | "notifications";

const ANALYST_PRICE_ID = "price_1T66bq2UXuH5fA2IQIuSelxJ";

/* ══ SHARED PRIMITIVES ═══════════════════════════════════════════════════════
   Three small components carry the whole screen. Every card, field and button
   below is one of these, so the radius, border and spacing scale cannot drift
   between sections the way they did when each tab styled itself. */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-main">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-1.5 leading-relaxed">{subtitle}</p>}
            <div className="mt-7">{children}</div>
        </section>
    );
}

function Field({
    icon: Icon, label, hint, ...input
}: {
    icon: React.ElementType;
    label: string;
    hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</span>
            <span className="relative flex items-center">
                {/* `start-0` / `ps-11`, not left/pl: the rail mirrors under RTL and
                    a hardcoded left inset put the icon on top of Arabic text. */}
                <Icon className="w-[1.05rem] h-[1.05rem] text-muted absolute start-4 pointer-events-none" aria-hidden="true" />
                <input
                    {...input}
                    className={clsx(
                        "w-full bg-page border border-border rounded-xl ps-11 pe-4 py-3.5 text-sm text-main",
                        "placeholder:text-muted/70 outline-none transition-colors",
                        "focus:border-starta-teal focus:ring-1 focus:ring-starta-teal",
                        input.disabled && "opacity-60 cursor-not-allowed"
                    )}
                />
            </span>
            {hint && <span className="block text-xs text-muted mt-2">{hint}</span>}
        </label>
    );
}

function PrimaryButton({
    busy, children, ...rest
}: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...rest}
            disabled={busy || rest.disabled}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-starta-teal text-white text-xs font-bold tracking-widest uppercase transition-colors hover:bg-starta-darkTeal disabled:opacity-55 disabled:cursor-not-allowed"
        >
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}

function Status({ ok, error }: { ok?: string; error?: string }) {
    if (!ok && !error) return null;
    return (
        <p
            role="status"
            className={clsx(
                "flex items-start gap-2 text-sm rounded-xl px-4 py-3 border",
                ok
                    ? "text-starta-darkTeal border-starta-teal/30 bg-starta-teal/[0.07]"
                    : "text-red-600 dark:text-red-400 border-red-500/25 bg-red-500/[0.06]"
            )}
        >
            {ok
                ? <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}
            <span>{ok || error}</span>
        </p>
    );
}

/** A labelled switch. Native checkbox underneath, so it is keyboard- and
 *  screen-reader-operable without any ARIA of our own. */
function Toggle({
    checked, onChange, label, hint,
}: { checked: boolean; onChange: () => void; label: string; hint: string }) {
    return (
        <label className="flex items-start gap-4 py-4 cursor-pointer group">
            <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
            <span
                aria-hidden="true"
                className={clsx(
                    "mt-0.5 w-11 h-6 rounded-full shrink-0 relative transition-colors",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-starta-teal peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[color:var(--c-surface)]",
                    checked ? "bg-starta-teal" : "bg-border"
                )}
            >
                <span
                    className={clsx(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                        // start/end rather than left/right so the knob travels the
                        // correct way when the page is mirrored.
                        checked ? "start-6" : "start-1"
                    )}
                />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-main">{label}</span>
                <span className="block text-xs text-muted mt-0.5 leading-relaxed">{hint}</span>
            </span>
        </label>
    );
}

/* ══ SECTIONS ════════════════════════════════════════════════════════════════ */

function PersonalSection({ t, user, updateUser }: { t: SettingsLabels; user: any; updateUser: (d: any) => void }) {
    const [busy, setBusy] = useState(false);
    const [ok, setOk] = useState("");
    const [error, setError] = useState("");
    const [form, setForm] = useState({ full_name: user?.full_name || "", phone: user?.phone || "" });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true); setOk(""); setError("");
        try {
            await updateProfile(form);
            updateUser(form);
            setOk(t.personal.saved);
        } catch (err: any) {
            setError(err?.response?.data?.detail || t.errors.generic);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card title={t.personal.title} subtitle={t.personal.subtitle}>
            <form onSubmit={submit} className="space-y-5">
                <Field
                    icon={UserIcon}
                    label={t.personal.fullName}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder={t.personal.fullNamePlaceholder}
                />
                {/* dir="ltr" on the number itself: a phone number is a Latin-digit
                    sequence and reads backwards inside an RTL field. */}
                <Field
                    icon={Phone}
                    label={t.personal.phone}
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={t.personal.phonePlaceholder}
                />
                <Field icon={Mail} label={t.personal.email} type="email" dir="ltr" value={user?.email || ""} disabled readOnly />
                <Status ok={ok} error={error} />
                <div className="pt-1">
                    <PrimaryButton type="submit" busy={busy}>
                        {busy ? t.personal.saving : t.personal.save}
                    </PrimaryButton>
                </div>
            </form>
        </Card>
    );
}

function SecuritySection({ t, logout }: { t: SettingsLabels; logout: () => void }) {
    const [busy, setBusy] = useState(false);
    const [ok, setOk] = useState("");
    const [error, setError] = useState("");
    const [pass, setPass] = useState({ old_password: "", new_password: "" });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pass.new_password.length < 6) { setError(t.errors.passwordTooShort); setOk(""); return; }
        setBusy(true); setOk(""); setError("");
        try {
            await changePassword(pass);
            setOk(t.security.updated);
            setPass({ old_password: "", new_password: "" });
        } catch (err: any) {
            setError(err?.response?.data?.detail || t.errors.generic);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card title={t.security.changePassword} subtitle={t.security.subtitle}>
                <form onSubmit={submit} className="space-y-5">
                    <Field
                        icon={Lock}
                        label={t.security.current}
                        type="password"
                        autoComplete="current-password"
                        value={pass.old_password}
                        onChange={(e) => setPass({ ...pass, old_password: e.target.value })}
                    />
                    <Field
                        icon={Shield}
                        label={t.security.next}
                        type="password"
                        autoComplete="new-password"
                        hint={t.security.minChars}
                        value={pass.new_password}
                        onChange={(e) => setPass({ ...pass, new_password: e.target.value })}
                    />
                    <Status ok={ok} error={error} />
                    <div className="pt-1">
                        <PrimaryButton type="submit" busy={busy}>
                            {busy ? t.security.updating : t.security.update}
                        </PrimaryButton>
                    </div>
                </form>
            </Card>

            <Card title={t.security.signOutEverywhere} subtitle={t.security.signOutEverywhereHint}>
                <button
                    onClick={logout}
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-red-500/[0.08]"
                >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    {t.page.signOut}
                </button>
            </Card>
        </div>
    );
}

function AppSection({ t, lang, setLang }: { t: SettingsLabels; lang: StoredLang; setLang: (l: StoredLang) => void }) {
    const { theme, setTheme } = useTheme();

    const choice = (active: boolean) =>
        clsx(
            "flex items-start gap-4 w-full text-start p-5 rounded-xl border transition-colors",
            active
                ? "border-starta-teal bg-starta-teal/[0.07]"
                : "border-border bg-page hover:border-starta-teal/40"
        );

    const tick = (active: boolean) =>
        active ? (
            <span className="ms-auto w-5 h-5 rounded-full bg-starta-teal flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" aria-hidden="true" />
            </span>
        ) : null;

    return (
        <div className="space-y-6">
            <Card title={t.appearance.title} subtitle={t.appearance.subtitle}>
                <div className="grid sm:grid-cols-2 gap-4">
                    <button type="button" onClick={() => setTheme("light")} className={choice(theme === "light")} aria-pressed={theme === "light"}>
                        <Sun className="w-5 h-5 text-starta-teal shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                            <span className="block text-sm font-semibold text-main">{t.appearance.light}</span>
                            <span className="block text-xs text-muted mt-0.5">{t.appearance.lightHint}</span>
                        </span>
                        {tick(theme === "light")}
                    </button>
                    <button type="button" onClick={() => setTheme("dark")} className={choice(theme === "dark")} aria-pressed={theme === "dark"}>
                        <Moon className="w-5 h-5 text-starta-teal shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                            <span className="block text-sm font-semibold text-main">{t.appearance.dark}</span>
                            <span className="block text-xs text-muted mt-0.5">{t.appearance.darkHint}</span>
                        </span>
                        {tick(theme === "dark")}
                    </button>
                </div>
            </Card>

            {/* Each language is named in its OWN script and carries no flag. The
                previous card put a Saudi flag on the Arabic of an Egyptian
                product, and marked it "Coming Soon" months after Arabic shipped
                across the whole site. */}
            <Card title={t.language.title} subtitle={t.language.subtitle}>
                <div className="grid sm:grid-cols-2 gap-4">
                    {(["en", "ar"] as const).map((code) => {
                        const active = lang === code;
                        const name = code === "en" ? t.language.english : t.language.arabic;
                        return (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setLang(code)}
                                className={choice(active)}
                                aria-pressed={active}
                                lang={code}
                            >
                                <Globe className="w-5 h-5 text-starta-teal shrink-0 mt-0.5" aria-hidden="true" />
                                <span>
                                    <span className="block text-sm font-semibold text-main">{name}</span>
                                    {active && <span className="block text-xs text-starta-darkTeal dark:text-starta-accent mt-0.5">{t.language.active}</span>}
                                </span>
                                {tick(active)}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-muted mt-4">{t.language.switchHint}</p>
            </Card>
        </div>
    );
}

function NotificationsSection({ t }: { t: SettingsLabels }) {
    const [prefs, setPrefs] = useState<NotificationPreferences>({
        price_alerts: true, volume_spikes: false, weekly_report: true,
        academy_news: true, push_notifs: false, security_alert: true,
    });

    useEffect(() => {
        let alive = true;
        fetchNotificationPreferences()
            .then((data) => { if (alive) setPrefs(data); })
            .catch((err) => console.error("[settings] notification preferences failed to load:", err));
        return () => { alive = false; };
    }, []);

    const toggle = async (key: keyof NotificationPreferences) => {
        const next = !prefs[key];
        setPrefs((p) => ({ ...p, [key]: next }));
        try {
            await updateNotificationPreferences({ [key]: next });
        } catch (err) {
            // Put the switch back rather than leaving the UI asserting a
            // preference the backend never accepted.
            console.error("[settings] notification toggle failed:", err);
            setPrefs((p) => ({ ...p, [key]: !next }));
        }
    };

    const keys = Object.keys(t.notifications.items) as (keyof NotificationPreferences)[];

    return (
        <Card title={t.notifications.title} subtitle={t.notifications.subtitle}>
            <div className="divide-y divide-border">
                {keys.map((key) => (
                    <Toggle
                        key={key}
                        checked={Boolean(prefs[key])}
                        onChange={() => toggle(key)}
                        label={t.notifications.items[key].label}
                        hint={t.notifications.items[key].hint}
                    />
                ))}
            </div>
        </Card>
    );
}

function BillingSection({ t, user }: { t: SettingsLabels; user: any }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const isAnalyst = user?.subscription_plan === "analyst" || user?.subscription_status === "active";

    const open = async () => {
        setBusy(true); setError("");
        try {
            const { url } = isAnalyst
                ? await createCustomerPortalSession()
                : await createCheckoutSession(ANALYST_PRICE_ID);
            if (url) window.location.href = url;
        } catch (err) {
            console.error("[settings] billing portal failed:", err);
            setError(t.errors.generic);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card title={t.billing.title} subtitle={t.billing.subtitle}>
            <div className="space-y-5">
                <Status error={error} />
                <PrimaryButton onClick={open} busy={busy}>{t.billing.title}</PrimaryButton>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-page p-4">
                    <Shield className="w-4 h-4 text-starta-teal mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-muted leading-relaxed">
                        <span className="font-semibold text-main">{t.billing.paymentSecurity}. </span>
                        {t.billing.stripeNote}
                    </p>
                </div>
            </div>
        </Card>
    );
}

/* ══ PAGE ════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading, updateUser } = useAuth();
    const [section, setSection] = useState<Section>("personal");

    // Language comes from STORAGE: /settings is a single-URL page with no /ar
    // twin, exactly like the auth screens. See hooks/useStoredLang.ts.
    const lang = useStoredLang();
    const isRtl = lang === "ar";
    const t = SETTINGS_LABELS[lang];

    const setLang = useCallback((next: StoredLang) => {
        try { window.localStorage.setItem("starta-lang", next); } catch { /* private mode */ }
        // Every other surface reads the same key; the event makes the switch
        // take effect in this document without a reload (the native `storage`
        // event only fires in OTHER tabs).
        window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-page flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-starta-teal" aria-hidden="true" />
                <span className="sr-only">{t.page.title}</span>
            </div>
        );
    }

    const isAdmin = user?.role === "admin";
    const Back = isRtl ? ArrowRight : ArrowLeft;
    const Chevron = isRtl ? ChevronLeft : ChevronRight;

    const rail: { id: Section; label: string; icon: React.ElementType }[] = [
        { id: "personal", label: t.nav.personal, icon: UserIcon },
        { id: "billing", label: t.nav.billing, icon: CreditCard },
        { id: "security", label: t.nav.security, icon: Shield },
        { id: "app", label: t.nav.app, icon: Globe },
        { id: "notifications", label: t.nav.notifications, icon: Bell },
    ];

    const initial = (user?.full_name || user?.email || "S").trim().charAt(0).toUpperCase();

    return (
        <div dir={isRtl ? "rtl" : "ltr"} lang={lang} className="min-h-screen bg-page text-main">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="border-b border-border bg-surface">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between gap-4">
                    <StartaLogo size="sm" href="/" />
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted hover:text-starta-teal transition-colors"
                    >
                        <Back className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{t.page.backHome}</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-main">{t.page.title}</h1>
                    <p className="text-muted mt-2">{t.page.subtitle}</p>
                </div>

                <div className="grid lg:grid-cols-[17rem_1fr] gap-8 lg:gap-12 items-start">
                    {/* ── Rail ───────────────────────────────────────────── */}
                    <nav aria-label={t.page.title} className="lg:sticky lg:top-10">
                        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-11 h-11 rounded-xl bg-starta-teal/10 border border-starta-teal/30 flex items-center justify-center text-starta-darkTeal dark:text-starta-accent font-bold text-lg shrink-0">
                                    {initial}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-main truncate">{user?.full_name || t.nav.personal}</span>
                                    {/* dir="ltr" so an address is not reordered in RTL. */}
                                    <span dir="ltr" className="block text-xs text-muted truncate text-start">{user?.email}</span>
                                </span>
                            </div>
                            {/* The previous version showed a green "VERIFIED" chip here
                                unconditionally. The session carries no verification
                                field (see SessionUser in lib/auth-session.ts), so the
                                chip asserted a fact about the account that nothing in
                                the system had established. A badge with no data behind
                                it is worse than no badge, so it is gone until there is
                                a signal to render. */}
                        </div>

                        {/* Horizontally scrollable on small screens, a column above lg. */}
                        <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-5 px-5 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
                            {rail.map(({ id, label, icon: Icon }) => {
                                const active = section === id;
                                return (
                                    <li key={id} className="shrink-0 lg:shrink">
                                        <button
                                            type="button"
                                            onClick={() => setSection(id)}
                                            aria-current={active ? "page" : undefined}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors",
                                                active
                                                    ? "bg-starta-teal/10 text-starta-darkTeal dark:text-starta-accent"
                                                    : "text-muted hover:text-main hover:bg-surface"
                                            )}
                                        >
                                            <Icon className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
                                            {label}
                                            {active && <Chevron className="w-4 h-4 ms-auto hidden lg:block" aria-hidden="true" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                            <Link
                                href="/contact"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted hover:text-main hover:bg-surface transition-colors"
                            >
                                <HelpCircle className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
                                {t.nav.help}
                            </Link>
                            {isAdmin && (
                                <Link
                                    href="/admin/users"
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted hover:text-main hover:bg-surface transition-colors"
                                >
                                    <Users className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
                                    {t.nav.userManagement}
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/[0.08] transition-colors"
                            >
                                <LogOut className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
                                {t.page.signOut}
                            </button>
                        </div>
                    </nav>

                    {/* ── Panel ──────────────────────────────────────────── */}
                    <div className="min-w-0">
                        {section === "personal" && <PersonalSection t={t} user={user} updateUser={updateUser} />}
                        {section === "billing" && <BillingSection t={t} user={user} />}
                        {section === "security" && <SecuritySection t={t} logout={logout} />}
                        {section === "app" && <AppSection t={t} lang={lang} setLang={setLang} />}
                        {section === "notifications" && <NotificationsSection t={t} />}
                    </div>
                </div>
            </main>
        </div>
    );
}
