"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, message, type, duration };

        setToasts((prev) => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={clsx(
                            "pointer-events-auto min-w-[300px] max-w-md px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl",
                            "border-2 font-bold text-sm transition-all duration-300 animate-in slide-in-from-right",
                            {
                                "bg-emerald-50/95 border-emerald-600 text-emerald-900": toast.type === 'success',
                                "bg-red-50/95 border-red-600 text-red-900": toast.type === 'error',
                                "bg-blue-50/95 border-blue-600 text-blue-900": toast.type === 'info',
                                "bg-amber-50/95 border-amber-600 text-amber-900": toast.type === 'warning',
                            }
                        )}
                        onClick={() => removeToast(toast.id)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">
                                {toast.type === 'success' && '✅'}
                                {toast.type === 'error' && '❌'}
                                {toast.type === 'info' && 'ℹ️'}
                                {toast.type === 'warning' && '⚠️'}
                            </div>
                            <div className="flex-1">{toast.message}</div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                }}
                                className="text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
