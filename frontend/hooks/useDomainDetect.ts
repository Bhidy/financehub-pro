/**
 * ============================================================================
 * DOMAIN DETECTION HOOK
 * ============================================================================
 * 
 * Detects the current domain to enable domain-specific experiences.
 * 
 * Usage:
 *   const { isStartaMarkets, isFinhubPro } = useDomainDetect();
 *   
 * CRITICAL:
 * - startamarkets.com → New responsive desktop/mobile experience
 * - finhub-pro.vercel.app → Original mobile experience (UNCHANGED)
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";

interface DomainInfo {
    domain: string;
    isStartaMarkets: boolean;
    isFinhubPro: boolean;
    isLocalhost: boolean;
    isSSR: boolean;
}

export function useDomainDetect(): DomainInfo {
    const [domainInfo, setDomainInfo] = useState<DomainInfo>({
        domain: "",
        isStartaMarkets: false,
        isFinhubPro: false,
        isLocalhost: false,
        isSSR: true,
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname.toLowerCase();

            setDomainInfo({
                domain: hostname,
                isStartaMarkets: hostname.includes("startamarkets.com"),
                isFinhubPro: hostname.includes("finhub-pro.vercel.app") || hostname.includes("finhub") && !hostname.includes("startamarkets"),
                isLocalhost: hostname === "localhost" || hostname === "127.0.0.1",
                isSSR: false,
            });
        }
    }, []);

    return domainInfo;
}
