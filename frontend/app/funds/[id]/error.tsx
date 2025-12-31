'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service if available
        console.error('Fund Detail Page Crashed:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Something went wrong
                </h2>

                <p className="text-slate-500 mb-8 leading-relaxed">
                    We encountered an error while loading the fund analysis. This might be due to a temporary data issue.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => reset()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>

                    <button
                        onClick={() => window.location.href = '/funds'}
                        className="w-full px-6 py-3 bg-white text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
                    >
                        Back to Funds List
                    </button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 p-4 bg-slate-900 text-slate-300 text-xs font-mono text-left rounded-xl overflow-auto max-h-40">
                        <p className="text-red-400 font-bold mb-1">Error Details:</p>
                        {error.message}
                    </div>
                )}
            </div>
        </div>
    );
}
