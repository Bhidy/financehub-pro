"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api } from "@/lib/api";

// ============================================================
// TYPES
// ============================================================

export interface User {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    getToken: () => string | null;
}

interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// CONSTANTS
// ============================================================

const TOKEN_KEY = "fh_auth_token";
const USER_KEY = "fh_user";

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem(USER_KEY);
        const savedToken = localStorage.getItem(TOKEN_KEY);

        if (savedUser && savedToken) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse saved user:", e);
                localStorage.removeItem(USER_KEY);
                localStorage.removeItem(TOKEN_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const getToken = useCallback((): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            // CRITICAL FIX: Use backend API URL, not relative Next.js route
            const API_URL = "https://starta.46-224-223-172.sslip.io/api/v1";
            const response = await fetch(`${API_URL}/auth/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData.toString(),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return { success: false, error: error.detail || "Login failed" };
            }

            const data = await response.json();

            localStorage.setItem(TOKEN_KEY, data.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);

            return { success: true };
        } catch (error: any) {
            console.error("Login error:", error);
            return { success: false, error: error.message || "Login failed" };
        }
    }, []);

    const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
        try {
            // CRITICAL FIX: Use backend API URL, not relative Next.js route
            const API_URL = "https://starta.46-224-223-172.sslip.io/api/v1";
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return { success: false, error: error.detail || "Registration failed" };
            }

            const result = await response.json();

            localStorage.setItem(TOKEN_KEY, result.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.user));
            setUser(result.user);

            return { success: true };
        } catch (error: any) {
            console.error("Registration error:", error);
            return { success: false, error: error.message || "Registration failed" };
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                getToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
