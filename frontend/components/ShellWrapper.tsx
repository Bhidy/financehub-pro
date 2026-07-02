"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import AppSidebar from "@/components/AppSidebar";

interface ShellWrapperProps {
    children: React.ReactNode;
}

// Routes that are ALWAYS isolated (no sidebar, no search) on EVERY domain.
// Prefix-matched so nested routes are covered (e.g. /symbol/COMI, /mobile/...).
//
// These are intrinsically full-bleed React surfaces:
//   /mobile  — the self-contained Capacitor mobile app (its own device frame)
//   /symbol  — the canonical company/stock profile page
//   /shared  — public share links (shared AI chats / messages); standalone
// They must NEVER be wrapped in the desktop AppSidebar shell. Isolation MUST be
// route-based (not domain-based): the domain check below only fires on
// startamarkets.com, so on localhost dev and *.vercel.app previews these routes
// would otherwise leak the legacy sidebar and squish the page. Keying on the
// route makes dev/preview faithfully match production. (cf. /AiChat below, which
// was already exact-listed for this same reason.)
// The SEO/public server-rendered routes (news articles, fund pages, learn
// topics, directory/authority pages) carry their own PublicPageShell chrome.
const ISOLATED_ROUTE_PREFIXES: string[] = [
    "/mobile", "/symbol", "/shared",
    "/News", "/Funds", "/Learn", "/ar", "/companies", "/about", "/contact",
];

// Exact paths that are isolated (including root for mobile domains)
const ISOLATED_EXACT_PATHS = ["/", "/login", "/register", "/forgot-password", "/setting", "/settings", "/Home", "/home", "/AiChat"];

// Domains that should always show mobile-only experience (no sidebar)
const MOBILE_ONLY_DOMAINS = ["startamarkets.com", "www.startamarkets.com"];

export default function ShellWrapper({ children }: ShellWrapperProps) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isMobileDomain, setIsMobileDomain] = useState(false);
    const [isFinhubDomain, setIsFinhubDomain] = useState(false);

    // Check if we're on a mobile-only domain - runs once on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname.toLowerCase();
            const isMobile = MOBILE_ONLY_DOMAINS.includes(hostname);
            const isFinhub =
                hostname.includes("finhub-pro.vercel.app") ||
                (hostname.includes("finhub") && !hostname.includes("startamarkets"));

            setIsMobileDomain(isMobile);
            setIsFinhubDomain(isFinhub);
        }
        setMounted(true);
    }, []);

    // Either matches a prefix or exact path (like /login)
    const isIsolatedRoute =
        ISOLATED_ROUTE_PREFIXES.some(route => pathname.startsWith(route)) ||
        ISOLATED_EXACT_PATHS.includes(pathname);

    // Hide sidebar if on mobile domain OR on isolated route
    const isIsolated = isMobileDomain || isIsolatedRoute;

    // The problem: On startamarkets.com/, pathname is "/"
    // So isIsolatedRoute is false during SSR, causing sidebar to render
    // Solution: Don't render sidebar until mounted, only render content wrapper
    if (!mounted) {
        // For known isolated routes, render children immediately (no sidebar ever)
        if (isIsolatedRoute) {
            return <>{children}</>;
        }

        // CRITICAL: For root path or unknown paths, don't render sidebar
        // Just render children in a neutral wrapper to prevent flash
        // This prevents the sidebar from appearing during hydration
        return (
            <div className={clsx(
                "flex-1 flex flex-col min-h-screen relative",
                isFinhubDomain && "finhub-shell"
            )}>
                <main className="flex-1">
                    {children}
                </main>
            </div>
        );
    }

    // After mount, we know the domain - decide based on that
    if (isIsolated) {
        if (isFinhubDomain) {
            return <div className="finhub-shell finhub-content min-h-[100dvh]">{children}</div>;
        }
        // Render children directly without any shell
        return <>{children}</>;
    }

    // Standard app shell with sidebar (only for main site non-isolated routes)
    return (
        <div className={clsx(
            "flex w-full overflow-hidden",
            isFinhubDomain ? "h-[100dvh] finhub-shell" : "h-screen bg-[var(--background)]"
        )}>
            <AppSidebar defaultCollapsed={isFinhubDomain} />
            <div className={clsx(
                "flex-1 flex flex-col min-w-0 overflow-hidden relative",
                isFinhubDomain ? "h-[100dvh] finhub-main" : "h-screen"
            )}>
                <main
                    className={clsx(
                        "flex-1 overflow-y-auto overflow-x-hidden",
                        isFinhubDomain && "finhub-content"
                    )}
                    data-lenis-prevent="true"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
