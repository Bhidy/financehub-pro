"use client";

import { useState, useEffect } from 'react';
import { env } from '@/lib/env';

export type HealthStatus = 'online' | 'offline' | 'checking';

export function useBackendHealth() {
    const [status, setStatus] = useState<HealthStatus>('checking');

    useEffect(() => {
        const checkHealth = async () => {
            try {
                // We use a simple lightweight call (e.g. root or health)
                // Note: env.NEXT_PUBLIC_API_URL typically ends in /api/v1, so we might need to trim for root health check
                // But for simplicity, let's try an OPTIONS request or a non-existent endpoint that returns 404 (which means server is up)
                // Or better, let's use the explicit health endpoint if available. 
                // Based on previous files, backend root has a health check at /health but that's at root, not /api/v1

                // Let's assume the API base is valid.
                // We'll verify against /sectors or similar light public endpoint, 
                // OR just hit the API root if it exists.

                const res = await fetch(`${env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')}/health`, { method: 'GET', cache: 'no-store' });
                if (res.ok) {
                    setStatus('online');
                } else {
                    setStatus('offline');
                }
            } catch (err) {
                console.error("Backend Health Check Failed", err);
                setStatus('offline');
            }
        };

        // Initial check
        checkHealth();

        // Periodic check (every 30s)
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    return status;
}
