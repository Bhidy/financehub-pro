"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// MARKET CONTEXT
// Provides global market selection state (SAUDI / EGX)
// Persists selection to localStorage for user preference retention
// ============================================================================

export type Market = 'SAUDI' | 'EGX';

interface MarketConfig {
    code: Market;
    name: string;
    nameAr: string;
    currency: string;
    flag: string;
    defaultSymbol: string;
}

export const MARKET_CONFIGS: Record<Market, MarketConfig> = {
    SAUDI: {
        code: 'SAUDI',
        name: 'Saudi Arabia (Tadawul)',
        nameAr: 'السعودية (تداول)',
        currency: 'SAR',
        flag: '🇸🇦',
        defaultSymbol: '2222'
    },
    EGX: {
        code: 'EGX',
        name: 'Egypt (EGX)',
        nameAr: 'مصر (البورصة)',
        currency: 'EGP',
        flag: '🇪🇬',
        defaultSymbol: 'COMI'
    }
};

interface MarketContextType {
    market: Market;
    setMarket: (market: Market) => void;
    config: MarketConfig;
    isEgypt: boolean;
    isSaudi: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedMarket';

export function MarketProvider({ children }: { children: ReactNode }) {
    const [market, setMarketState] = useState<Market>('SAUDI');
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'SAUDI' || stored === 'EGX') {
                setMarketState(stored);
            }
            setMounted(true);
        }
    }, []);

    // Save to localStorage on change
    const setMarket = (newMarket: Market) => {
        setMarketState(newMarket);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, newMarket);
        }
    };

    const value: MarketContextType = {
        market,
        setMarket,
        config: MARKET_CONFIGS[market],
        isEgypt: market === 'EGX',
        isSaudi: market === 'SAUDI'
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <MarketContext.Provider value={value}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketProvider');
    }
    return context;
}

// Optional: Safe hook for use outside provider (returns default)
export function useMarketSafe(): MarketContextType {
    const context = useContext(MarketContext);
    return context ?? {
        market: 'SAUDI',
        setMarket: () => { },
        config: MARKET_CONFIGS.SAUDI,
        isEgypt: false,
        isSaudi: true
    };
}
