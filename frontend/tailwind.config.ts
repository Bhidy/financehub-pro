import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                color: {
                    1: "var(--color-brand-accent)", // #13b8a6 (Teal)
                    2: "var(--color-trust-blue)",   // #3B82F6 (Blue)
                    3: "#FF776F",                   // Red/Orange (Keep for alerts)
                    4: "#7ADB78",                   // Green (Keep for success)
                    5: "var(--color-trust-blue)",   // Replaced Purple with Trust Blue
                    6: "var(--color-brand-accent)", // Replaced Pink with Teal
                    fade: "var(--color-bg-fade)",   // Gradient Fade End (Dark/Light Adaptive)
                },
                stroke: {
                    1: "var(--color-stroke-1)", // Dynamic: #26242C (Dark) / #E2E8F0 (Light)
                },
                n: {
                    1: "var(--color-n-1)",
                    2: "var(--color-n-2)",
                    3: "var(--color-n-3)",
                    4: "var(--color-n-4)",
                    5: "var(--color-n-5)",
                    6: "var(--color-n-6)",
                    7: "var(--color-n-7)",
                    8: "var(--color-n-8)",
                    9: "var(--color-n-9)",
                    10: "var(--color-n-10)",
                    11: "var(--color-n-11)",
                    12: "var(--color-n-12)",
                    13: "var(--color-n-13)",
                },
            },
            fontFamily: {
                sans: ["var(--font-manrope)", "sans-serif"],
                heading: ["var(--font-manrope)", "sans-serif"],
                mono: ["var(--font-jetbrains)", "monospace"],
                arabic: ["var(--font-arabic)", "sans-serif"],
            },
            letterSpacing: {
                tagline: ".15em",
            },
            spacing: {
                0.25: "0.0625rem",
                7.5: "1.875rem",
                15: "3.75rem",
            },
            opacity: {
                15: ".15",
            },
            transitionDuration: {
                DEFAULT: "200ms",
            },
            transitionTimingFunction: {
                DEFAULT: "linear",
            },
            zIndex: {
                1: "1",
                2: "2",
                3: "3",
                4: "4",
                5: "5",
                6: "6",
            },
            borderWidth: {
                DEFAULT: "0.0625rem",
            },
            backgroundImage: {
                "radial-gradient": "radial-gradient(var(--tw-gradient-stops))",
                "conic-gradient":
                    "conic-gradient(from 225deg, var(--color-brand-accent), var(--color-trust-blue), var(--color-brand-primary), var(--color-brand-accent-dark), var(--color-brand-accent))",
            },
        },
        container: {
            center: true,
            padding: {
                DEFAULT: "1rem", // Mobile padding
                lg: "2rem",      // Desktop padding
                xl: "3rem",      // Wide screen padding
            },
            screens: {
                sm: "640px",
                md: "768px",
                lg: "1024px",
                xl: "1280px",
                "2xl": "1400px", // Brainwave usually caps around here
            },
        },
    },
    // Keep darkMode selector for consistency
    darkMode: "selector",
};
export default config;
