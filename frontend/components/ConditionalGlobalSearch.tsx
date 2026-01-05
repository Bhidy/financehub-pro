"use client";

import { usePathname } from "next/navigation";
import GlobalSearchWidget from "./GlobalSearchWidget";

/**
 * Conditional Global Search Widget
 * Hides on /funds pages since they have their own search
 */
export default function ConditionalGlobalSearch() {
    const pathname = usePathname();

    // Hide on /funds pages (they have their own search)
    if (pathname?.startsWith('/funds')) {
        return null;
    }

    return (
        <div className="absolute top-5 right-8 z-50 pointer-events-none">
            <div className="pointer-events-auto">
                <GlobalSearchWidget />
            </div>
        </div>
    );
}
