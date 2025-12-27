'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface ServiceStatus {
    name: string;
    url: string;
    status: 'checking' | 'online' | 'offline';
    latency?: number;
}

export default function HealthCheck() {
    const baseURL = (api.defaults.baseURL || "http://localhost:8000/api/v1");
    // Remove /api/v1 suffix to get root URL
    const API_URL = baseURL.replace(/\/api\/v1\/?$/, '');

    const [mounted, setMounted] = useState(false);
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Backend API', url: `${API_URL}/`, status: 'checking' },
        { name: 'Database', url: `${API_URL}/api/v1/stats`, status: 'checking' },
    ]);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const checkServices = useCallback(async () => {
        const results = await Promise.all(
            services.map(async (service) => {
                const start = Date.now();
                try {
                    const res = await fetch(service.url, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000)
                    });
                    return {
                        ...service,
                        status: res.ok ? 'online' : 'offline',
                        latency: Date.now() - start,
                    } as ServiceStatus;
                } catch {
                    return { ...service, status: 'offline', latency: undefined } as ServiceStatus;
                }
            })
        );
        setServices(results);
        setLastCheck(new Date());
    }, [services]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            checkServices();
            const interval = setInterval(checkServices, 30000); // Check every 30s
            return () => clearInterval(interval);
        }
    }, [mounted, checkServices]);

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) return null;

    const allOnline = services.every((s) => s.status === 'online');
    const anyOffline = services.some((s) => s.status === 'offline');

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Status Indicator */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${allOnline
                    ? 'bg-green-500 text-white'
                    : anyOffline
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-yellow-500 text-white'
                    }`}
            >
                {allOnline ? (
                    <CheckCircle2 className="w-5 h-5" />
                ) : anyOffline ? (
                    <XCircle className="w-5 h-5" />
                ) : (
                    <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium text-sm">
                    {allOnline ? 'All Systems Online' : anyOffline ? 'Service Offline!' : 'Checking...'}
                </span>
            </button>

            {/* Expanded Panel */}
            {isOpen && (
                <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">System Health</h3>
                        <button
                            onClick={checkServices}
                            className="p-1 hover:bg-gray-100 rounded-lg transition"
                        >
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {services.map((service) => (
                            <div
                                key={service.name}
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-2">
                                    {service.status === 'online' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : service.status === 'offline' ? (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-500 animate-spin" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700">{service.name}</span>
                                </div>
                                {service.latency && (
                                    <span className="text-xs text-gray-400">{service.latency}ms</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {anyOffline && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 font-medium">
                                ⚠️ Backend API is offline. Run:
                            </p>
                            <code className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-1 block">
                                ./start_all.sh
                            </code>
                        </div>
                    )}

                    {lastCheck && (
                        <p className="text-xs text-gray-400 mt-3 text-right">
                            Last check: {lastCheck.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
