'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary for the symbol page.
 * Previously an unhandled render error in ANY tab (e.g. `value.toFixed is not a
 * function` in Technicals) unmounted the entire application, forcing a reload.
 * This boundary contains the failure to the page and offers a one-click retry,
 * so a single bad field can never take the whole experience down again.
 */
export default function SymbolError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Surface to the console / monitoring without crashing the tree.
        console.error('[symbol page error boundary]', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="premium-glass rounded-3xl p-10 max-w-md">
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
                    Something went wrong loading this view
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    A section of this page failed to render. The rest of the platform is
                    unaffected — try again, or go back to the markets.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => reset()}
                        className="px-5 py-2.5 rounded-xl bg-[#14b8a6] text-white font-bold text-sm hover:bg-[#0d9488] transition-colors"
                    >
                        Try again
                    </button>
                    <a
                        href="/"
                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Back to markets
                    </a>
                </div>
            </div>
        </div>
    );
}
