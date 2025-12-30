"use client";

import { useState, useEffect } from 'react';

export type HealthStatus = 'online' | 'offline' | 'checking';

export function useBackendHealth() {
    const [status, setStatus] = useState<HealthStatus>('checking');

    useEffect(() => {
        const checkHealth = async () => {
            try {
                // ENTERPRISE DIAGNOSTICS check
                const res = await fetch('/api/diagnostics', {
                    method: 'GET',
                    cache: 'no-store'
                });
                if (res.ok) {
                    setStatus('online');
                } else {
                    setStatus('offline');
                }
            } catch (err) {
                console.error("Health Check Failed", err);
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
