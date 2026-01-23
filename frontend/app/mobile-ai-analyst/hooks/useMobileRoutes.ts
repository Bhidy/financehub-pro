"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-Only Routing Hook
 * 
 * When accessed via startamarkets.com, URLs should be clean:
 * - /login instead of /mobile-ai-analyst/login
 * - /register instead of /mobile-ai-analyst/register
 * 
 * When accessed via finhub-pro.vercel.app, URLs keep the prefix.
 */

// Domains that use clean URLs (no /mobile-ai-analyst prefix)
const CLEAN_URL_DOMAINS = ["startamarkets.com", "www.startamarkets.com"];

// Route mappings
export const MOBILE_ROUTES = {
    home: "/mobile-ai-analyst",
    login: "/mobile-ai-analyst/login",
    register: "/mobile-ai-analyst/register",
    forgotPassword: "/mobile-ai-analyst/forgot-password",
    setting: "/mobile-ai-analyst/setting",
} as const;

// Clean route mappings (for startamarkets.com)
export const CLEAN_ROUTES = {
    home: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    setting: "/setting",
} as const;

export type RouteKey = keyof typeof MOBILE_ROUTES;

/**
 * Hook to get the correct route based on current domain
 * 
 * CRITICAL: To avoid hydration mismatches, this hook uses the pathname
 * to detect clean-URL domains during initial render. If the path doesn't
 * include /mobile-ai-analyst and we're on a known mobile page, we're on
 * a clean-URL domain.
 */
export function useMobileRoutes() {
    const [isCleanDomain, setIsCleanDomain] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname;
            setIsCleanDomain(CLEAN_URL_DOMAINS.includes(hostname));
        }
    }, []);

    /**
     * Get the correct route path based on current domain
     * 
     * CRITICAL FIX: During SSR and before mount, always return the full
     * mobile-ai-analyst paths to match what Next.js expects. The rewrites
     * will handle the clean URL display.
     */
    const getRoute = (routeKey: RouteKey): string => {
        // Before client mount, return prefixed routes (matches SSR output)
        if (!mounted) {
            return MOBILE_ROUTES[routeKey];
        }

        // After mount, return clean routes for clean domains
        if (isCleanDomain) {
            return CLEAN_ROUTES[routeKey];
        }
        return MOBILE_ROUTES[routeKey];
    };

    return {
        isCleanDomain,
        mounted,
        getRoute,
        routes: isCleanDomain ? CLEAN_ROUTES : MOBILE_ROUTES,
    };
}

/**
 * Static function to get route (for server components or initial render)
 * Falls back to mobile routes for SSR safety
 */
export function getMobileRoute(routeKey: RouteKey, hostname?: string): string {
    if (hostname && CLEAN_URL_DOMAINS.includes(hostname)) {
        return CLEAN_ROUTES[routeKey];
    }
    return MOBILE_ROUTES[routeKey];
}

/**
 * Check if current hostname is a clean URL domain
 */
export function isCleanUrlDomain(hostname: string): boolean {
    return CLEAN_URL_DOMAINS.includes(hostname);
}
