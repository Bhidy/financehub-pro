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
    avatar_url?: string | null;
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
    updateUser: (userData: Partial<User>) => void;
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
const REFRESH_TOKEN_KEY = "fh_refresh_token";

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
        const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const savedAvatar = localStorage.getItem('user_avatar_url');

        if (savedUser && savedToken) {
            try {
                const parsedUser = JSON.parse(savedUser);
                if (savedAvatar) {
                    parsedUser.avatar_url = savedAvatar;
                }
                setUser(parsedUser);

                // Legacy-session bridge:
                // If a logged-in user has no persisted refresh token yet, mint one silently.
                if (!savedRefreshToken) {
                    void fetch(`/api/proxy/auth/bootstrap-refresh`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${savedToken}`,
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    })
                        .then(async (res) => {
                            if (!res.ok) return null;
                            return res.json().catch(() => null);
                        })
                        .then((data) => {
                            if (!data) return;
                            if (data.access_token) {
                                localStorage.setItem(TOKEN_KEY, data.access_token);
                            }
                            if (data.refresh_token) {
                                localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
                            }
                            if (data.user) {
                                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                                setUser(data.user);
                            }
                        })
                        .catch(() => {
                            // No-op: keep the existing session state; hard failures are handled by normal auth flow.
                        });
                }
            } catch (e) {
                console.error("Failed to parse saved user:", e);
                localStorage.removeItem(USER_KEY);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
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

            const response = await fetch(`/api/v1/auth/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData.toString(),
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return { success: false, error: error.detail || "Login failed" };
            }

            const data = await response.json();

            localStorage.setItem(TOKEN_KEY, data.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            if (data.refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
            }
            setUser(data.user);

            return { success: true };
        } catch (error: any) {
            console.error("Login error:", error);
            return { success: false, error: error.message || "Login failed" };
        }
    }, []);

    const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(`/api/v1/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return { success: false, error: error.detail || "Registration failed" };
            }

            const result = await response.json();

            localStorage.setItem(TOKEN_KEY, result.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.user));
            if (result.refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
            }
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
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('user_avatar_url');
        localStorage.removeItem("fh_chat_session"); // Prevent session cross-contamination
        setUser(null);
    }, []);

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...userData };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
            return updated;
        });
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
                updateUser,
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
