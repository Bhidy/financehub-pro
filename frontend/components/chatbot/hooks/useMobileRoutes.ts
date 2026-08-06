"use client";

import { useEffect, useState } from "react";

/**
 * Unified Routing Hook (Consolidated to Root)
 * 
 * All domains now use the root paths.
 * The /mobile-ai-analyst prefix is DEPRECATED and removed.
 */

// Route mappings - All unified to root.
// `home` is the SITE home: the chatbot is hidden from the website (2026-08),
// so no logo/back/post-auth path may land users on /AiChat anymore.
export const APP_ROUTES = {
    home: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    setting: "/settings", // Corrected to plural to match app/settings
} as const;

export type RouteKey = keyof typeof APP_ROUTES;

/**
 * Hook to get the Unified route path
 */
export function useMobileRoutes() {
    // Keep isCleanDomain for API compatibility but it's always true effectively
    const isCleanDomain = true;
    const mounted = true;

    const getRoute = (routeKey: RouteKey): string => {
        return APP_ROUTES[routeKey];
    };

    return {
        isCleanDomain,
        mounted,
        getRoute,
        routes: APP_ROUTES,
    };
}

/**
 * Static function to get route
 */
export function getMobileRoute(routeKey: RouteKey, hostname?: string): string {
    return APP_ROUTES[routeKey];
}

/**
 * Check if current hostname is a clean URL domain
 * (Always true now as we consolidated)
 */
export function isCleanUrlDomain(hostname: string): boolean {
    return true;
}
