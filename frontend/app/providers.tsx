"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MarketProvider } from "@/contexts/MarketContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MarketProvider>
                    <ThemeProvider>
                        {children}
                    </ThemeProvider>
                </MarketProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
