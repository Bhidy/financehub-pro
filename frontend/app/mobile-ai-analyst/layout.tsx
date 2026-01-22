"use client";

/**
 * ============================================================================
 * MOBILE AI ANALYST - DEDICATED LAYOUT
 * ============================================================================
 * 
 * This layout overrides the global body zoom: 0.85 styling that causes
 * the grey gap issue on mobile pages when viewed on desktop browsers.
 * 
 * ROOT CAUSE FIX:
 * - globals.css has "zoom: 0.85" on body which shrinks content to 85%
 * - This creates visible gaps around the content
 * - This layout applies a counter-zoom to the mobile container only
 * 
 * ============================================================================
 */

import { useEffect } from "react";

export default function MobileAIAnalystLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Apply zoom reset to body when this layout is mounted
    useEffect(() => {
        // Store original zoom value
        const originalZoom = document.body.style.zoom;
        const originalBackground = document.body.style.backgroundColor;
        const originalOverflow = document.body.style.overflow;

        // Override body zoom for mobile pages - CRITICAL FIX
        document.body.style.zoom = "1";
        document.body.style.backgroundColor = "transparent";
        document.body.style.overflow = "hidden";

        // Also set on html element for complete coverage
        document.documentElement.style.backgroundColor = "var(--background)";

        // Cleanup on unmount - restore original values
        return () => {
            document.body.style.zoom = originalZoom;
            document.body.style.backgroundColor = originalBackground;
            document.body.style.overflow = originalOverflow;
            document.documentElement.style.backgroundColor = "";
        };
    }, []);

    return (
        <div
            className="fixed inset-0 w-full h-full bg-[#F8FAFC] dark:bg-[#0F172A]"
            style={{
                // Ensure this container fills the entire viewport
                minHeight: '100dvh',
                minWidth: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            {children}
        </div>
    );
}
