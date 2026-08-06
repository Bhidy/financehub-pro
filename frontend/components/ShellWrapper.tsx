"use client";

import { useEffect, useState } from "react";

interface ShellWrapperProps {
    children: React.ReactNode;
}

// The legacy desktop "Pro Terminal" AppSidebar shell has been PERMANENTLY
// removed (2026-08-06). Production never showed it — the startamarkets.com
// domain check isolated every route — but on localhost and preview domains any
// route missing from the old isolation lists leaked the sidebar and squished
// the page. Every surface now renders exactly as production always has: no
// sidebar, no per-route isolation lists to maintain. Do NOT reintroduce a
// global app shell here — pages own their own chrome (PublicPageShell for the
// public site, the mobile app its own frame). A build gate in
// scripts/verify-route-aliases.mjs fails the build if AppSidebar returns.
export default function ShellWrapper({ children }: ShellWrapperProps) {
    const [isFinhubDomain, setIsFinhubDomain] = useState(false);

    // Legacy finhub-pro preview domain keeps its content wrapper (styling only).
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname.toLowerCase();
            setIsFinhubDomain(
                hostname.includes("finhub-pro.vercel.app") ||
                (hostname.includes("finhub") && !hostname.includes("startamarkets"))
            );
        }
    }, []);

    if (isFinhubDomain) {
        return <div className="finhub-shell finhub-content min-h-[100dvh]">{children}</div>;
    }

    return <>{children}</>;
}
