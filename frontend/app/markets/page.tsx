'use client';

import { Suspense } from 'react';
import { SuspenseLoader } from '@/components/SuspenseLoader';
import { MarketOverview } from '@/features/markets/components/MarketOverview';

export default function MarketOverviewPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Market Command</h1>
                    <p className="text-slate-500 font-medium">Real-time overview of the Egyptian Exchange (EGX)</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* 
                  React 19 Suspense Boundary
                  - Handles the loading state of useSuspenseQuery
                  - No useEffect or manual loading management required
                */}
                <Suspense fallback={<SuspenseLoader message="Analyzing Market Pulse..." />}>
                    <MarketOverview />
                </Suspense>
            </main>
        </div>
    );
}
