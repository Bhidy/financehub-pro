"use client";

/**
 * ============================================================================
 * ADMIN SHELL — the console's chrome
 * ============================================================================
 *
 * WHY THIS EXISTS
 * /admin had no navigation of any kind. app/admin/layout.tsx rendered its
 * children bare, so each page drew a standalone header and nothing linked to
 * anything: /admin/users existed but was reachable only by typing the URL.
 * The console was, in practice, one page.
 *
 * THE DESIGN
 * The same design system as the rest of the site, applied to a console
 * layout — owner instruction, and it is also what DESIGN_SYSTEM.md §4 already
 * required: surfaces come from the theme tokens (bg-page / bg-surface /
 * text-main / text-muted / border-border), the one accent is the brand teal,
 * and the shapes are the public chrome's shapes (rounded-2xl cards, rounded-xl
 * controls, font-display headings, font-mono uppercase meta labels).
 *
 * The console is LIGHT ONLY (owner decision). Rather than mutate <html
 * data-theme> on entry and restore it on exit — which fights the theme boot
 * script and can strand the visitor's own preference if the restore never
 * runs — the `admin-light` class on this root redeclares the runtime theme
 * variables for the subtree. Everything inside resolves light; the visitor's
 * site-wide choice is untouched. See globals.css.
 *
 * WHY IT IS NOT THE BANNED SIDEBAR
 * components/AppSidebar.tsx — the "Pro Terminal" shell — is permanently
 * removed by owner decision, and verify-route-aliases.mjs fails the build if
 * it, or a ShellWrapper mount of it, returns. That ban is about a sidebar that
 * leaked onto PUBLIC routes: it lived in the global ShellWrapper and appeared
 * on any route missing from a hand-maintained isolation list. This component
 * is mounted only by app/admin/layout.tsx, so the route segment IS the
 * isolation — there is no list to fall out of, and it cannot render outside
 * /admin even in principle. ShellWrapper is not touched.
 *
 * LTR is forced. Every string in the console is English; inheriting dir=rtl
 * from a stored Arabic preference would mirror the layout around English text.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { StartaLogo } from "@/components/brand/StartaLogo";
import { useAuth } from "@/contexts/AuthContext";
import { VISIBLE_ADMIN_NAV, activeAdminItem } from "@/lib/admin-nav";

function RailContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const active = activeAdminItem(pathname);

    return (
        <div className="flex h-full flex-col">
            <div className="px-5 pt-6 pb-7">
                <StartaLogo size="sm" href="/" />
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                    Admin console
                </p>
            </div>

            <nav className="flex-1 px-3" aria-label="Admin sections">
                <ul className="space-y-1">
                    {VISIBLE_ADMIN_NAV.map((item) => {
                        const Icon = item.icon;
                        const isActive = active?.href === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    prefetch={false}
                                    onClick={onNavigate}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                        isActive
                                            ? "bg-starta-teal/10 font-semibold text-main"
                                            : "font-medium text-muted hover:bg-page hover:text-main"
                                    }`}
                                >
                                    {isActive && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-starta-teal"
                                        />
                                    )}
                                    <Icon
                                        className={`h-[1.05rem] w-[1.05rem] shrink-0 ${isActive ? "text-starta-teal" : ""}`}
                                        aria-hidden="true"
                                    />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="mt-6 border-t border-border px-3 py-4">
                <div className="px-3 pb-3">
                    <p className="truncate text-xs font-medium text-main" title={user?.email}>
                        {user?.email}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-starta-teal">
                        {user?.role}
                    </p>
                </div>

                <Link
                    href="/"
                    prefetch={false}
                    onClick={onNavigate}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-page hover:text-main"
                >
                    <ArrowUpRight className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden="true" />
                    View the site
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        logout();
                        router.replace("/");
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-page hover:text-main"
                >
                    <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden="true" />
                    Sign out
                </button>
            </div>
        </div>
    );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const closeRef = useRef<HTMLButtonElement | null>(null);

    // Route change closes the drawer. Without this, tapping a link on mobile
    // navigates behind a drawer that stays open over the page you asked for.
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setDrawerOpen(false);
        };
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [drawerOpen]);

    return (
        <div dir="ltr" className="admin-light min-h-screen bg-page">
            {/* Desktop rail. Fixed, so the work surface scrolls under a rail
                that never moves. */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-e border-border bg-surface lg:block">
                <RailContent />
            </aside>

            {/* Mobile drawer */}
            <div
                className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
                aria-hidden={!drawerOpen}
            >
                <div
                    onClick={() => setDrawerOpen(false)}
                    className={`absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none ${
                        drawerOpen ? "opacity-100" : "opacity-0"
                    }`}
                />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Admin sections"
                    className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-e border-border bg-surface transition-transform duration-200 ease-out motion-reduce:transition-none ${
                        drawerOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Close menu"
                        className="absolute right-2 top-4 flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-main"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <RailContent onNavigate={() => setDrawerOpen(false)} />
                </div>
            </div>

            <div className="lg:pl-[264px]">
                {/* Mobile top bar. Desktop does not get one: the rail already
                    says where you are, and a second title bar would repeat it. */}
                <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={drawerOpen}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:text-main"
                    >
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {/* The brand mark, not the section name: every page under
                        here renders its own <h1>, and stacking the two put the
                        word "Users" on screen twice, 40px apart. */}
                    <StartaLogo size="sm" href="/" />
                </div>

                {children}
            </div>
        </div>
    );
}

export default AdminShell;
