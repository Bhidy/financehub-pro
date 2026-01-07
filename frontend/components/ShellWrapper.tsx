"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import ConditionalGlobalSearch from "@/components/ConditionalGlobalSearch";

interface ShellWrapperProps {
    children: React.ReactNode;
}

// Routes that should be completely isolated (no sidebar, no search)
const ISOLATED_ROUTES = ["/mobile-ai-analyst"];

export default function ShellWrapper({ children }: ShellWrapperProps) {
    const pathname = usePathname();

    // Check if current route should be isolated
    const isIsolated = ISOLATED_ROUTES.some(route => pathname.startsWith(route));

    if (isIsolated) {
        // Render children directly without any shell
        return <>{children}</>;
    }

    // Standard app shell with sidebar
    return (
        <>
            <AppSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <ConditionalGlobalSearch />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        </>
    );
}
