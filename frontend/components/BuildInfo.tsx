"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function BuildInfo() {
    const searchParams = useSearchParams();
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Show if ?debug=true is in URL
        if (searchParams?.get('debug') === 'true') {
            setIsVisible(true);
        }

        // Detect mobile user agent
        const checkMobile = () => {
            const ua = window.navigator.userAgent;
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
            setIsMobile(mobile);
        };
        checkMobile();
    }, [searchParams]);

    if (!isVisible) return null;

    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'Unknown';
    const commit = process.env.NEXT_PUBLIC_GIT_COMMIT || 'Unknown';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/90 text-white p-4 font-mono text-xs border-t border-red-500 shadow-[0_-4px_20px_rgba(239,68,68,0.5)]">
            <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                    <span className="font-bold text-red-400">🚨 PRODUCTION DEBUGGER</span>
                    <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-500">Build Time:</span>
                    <span className="text-green-400">{buildTime}</span>

                    <span className="text-gray-500">Commit SHA:</span>
                    <span className="text-yellow-400">{commit.substring(0, 7)}</span>

                    <span className="text-gray-500">Environment:</span>
                    <span className="text-blue-400">{process.env.NODE_ENV}</span>

                    <span className="text-gray-500">Detected Mobile:</span>
                    <span className={isMobile ? "text-green-400 font-bold" : "text-red-400"}>
                        {isMobile ? 'YES' : 'NO'}
                    </span>

                    <span className="text-gray-500">Window Width:</span>
                    <span>{typeof window !== 'undefined' ? window.innerWidth : 0}px</span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
                    If Build Time is OLD, you are seeing a CACHED version.
                    <br />
                    Force flush cache: npx vercel --prod --force
                </div>
            </div>
        </div>
    );
}
