"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";

interface ShellWrapperProps {
    children: React.ReactNode;
}

// Routes that should be completely isolated (no sidebar, no search)
// Uses prefix matching for nested routes
const ISOLATED_ROUTE_PREFIXES = ["/mobile-ai-analyst"];

// Exact paths that are isolated (including root for mobile domains)
const ISOLATED_EXACT_PATHS = ["/login", "/register", "/forgot-password", "/setting", "/settings"];

// Domains that should always show mobile-only experience (no sidebar)
const MOBILE_ONLY_DOMAINS = ["startamarkets.com", "www.startamarkets.com"];

export default function ShellWrapper({ children }: ShellWrapperProps) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isMobileDomain, setIsMobileDomain] = useState(false);

    // Check if we're on a mobile-only domain - runs once on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname;
            const isMobile = MOBILE_ONLY_DOMAINS.includes(hostname);
            setIsMobileDomain(isMobile);
        }
        setMounted(true);
    }, []);

    // Check if current route should be isolated
    // Either matches a prefix (like /mobile-ai-analyst/anything) or exact path (like /login)
    const isIsolatedRoute =
        ISOLATED_ROUTE_PREFIXES.some(route => pathname.startsWith(route)) ||
        ISOLATED_EXACT_PATHS.includes(pathname);

    // Hide sidebar if on mobile domain OR on isolated route
    const isIsolated = isMobileDomain || isIsolatedRoute;

    // CRITICAL FIX: Prevent hydration flash for mobile domains
    // The problem: On startamarkets.com/, pathname is "/" (not "/mobile-ai-analyst")
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
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        );
    }

    // After mount, we know the domain - decide based on that
    if (isIsolated) {
        // Render children directly without any shell
        return <>{children}</>;
    }

    // Standard app shell with sidebar (only for main site non-isolated routes)
    return (
        <>
            <AppSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        </>
    );
}
