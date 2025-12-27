import { api } from "./api";

const TOKEN_KEY = "financehub_access_token";

export interface User {
    email: string;
    role: string;
}

export const auth = {
    setToken(token: string) {
        if (typeof window !== "undefined") {
            localStorage.setItem(TOKEN_KEY, token);
        }
    },

    getToken() {
        if (typeof window !== "undefined") {
            return localStorage.getItem(TOKEN_KEY);
        }
        return null;
    },

    removeToken() {
        if (typeof window !== "undefined") {
            localStorage.removeItem(TOKEN_KEY);
        }
    },

    isAuthenticated() {
        const token = this.getToken();
        return !!token;
    },

    // Helper to add header to requests
    getAuthHeader() {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};

// Interceptor to add token to all requests
api.interceptors.request.use((config) => {
    const token = auth.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor to handle 401s (Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            auth.removeToken();
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);
