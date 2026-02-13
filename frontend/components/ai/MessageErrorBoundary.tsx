"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * MessageErrorBoundary
 * 
 * Captures rendering errors within the Chat Message component tree
 * to prevent the entire application from crashing (White Screen of Death).
 */
export class MessageErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in Chat Message:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="p-4 my-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                                Message Rendering Error
                            </h3>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                We couldn't display this message correctly.
                            </p>
                            {/* Retry Button */}
                            <button
                                onClick={() => this.setState({ hasError: false })}
                                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <RefreshCcw className="w-3 h-3" />
                                Try Again
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
