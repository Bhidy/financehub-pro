"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    title?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * 🛡️ SafeChatCard - Error Boundary
 * Prevents a single crashing card from taking down the entire chat interface.
 */
export class SafeChatCard extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("💥 ChatCard Crash Caught:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 my-2">
                    <div className="flex items-center gap-2 font-bold mb-1 uppercase tracking-tighter text-xs">
                        <AlertTriangle size={14} />
                        System Display Error
                    </div>
                    <div className="text-[10px] opacity-80 font-mono">
                        {this.props.title ? `Failed to render: ${this.props.title}` : "This card could not be displayed."}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
