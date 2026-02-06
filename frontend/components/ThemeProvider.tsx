"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark"); // Default to dark

    useEffect(() => {
        // Check localStorage or System Preference on mount
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
            if (savedTheme === "light") document.documentElement.classList.add("light");
        } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
            // Default to Dark unless user explicitly prefers light OR saved light
            // But user requested "Don't touch current", so default is Dark.
            // If system is Light, we can auto-switch to Light?
            // "Don't touch current dark version" implies Dark by default.
            // But "Ultra Premium" implies respecting system pref.
            // Let's safe-default to "dark" unless saved "light".
            setTheme("dark");
        } else {
            setTheme("dark");
        }
    }, []);

    const toggleTheme = () => {
        // Source of Truth: React State
        const newTheme = theme === "dark" ? "light" : "dark";

        // 1. Update State (Trigger UI Re-render)
        setTheme(newTheme);

        // 2. Persist
        localStorage.setItem("theme", newTheme);

        // 3. Sync DOM
        if (newTheme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
