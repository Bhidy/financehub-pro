"use client";

import { useTheme } from "./ThemeProvider";
import { motion } from "framer-motion";

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative z-50 cursor-pointer flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-800/50
            `}
            aria-label="Toggle Theme"
        >
            <div className="relative w-5 h-5 overflow-hidden">
                {/* Sun Icon */}
                <motion.div
                    initial={false}
                    animate={{
                        y: theme === "light" ? 0 : 20,
                        opacity: theme === "light" ? 1 : 0,
                        rotate: theme === "light" ? 0 : 90
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center text-yellow-500"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                </motion.div>

                {/* Moon Icon */}
                <motion.div
                    initial={false}
                    animate={{
                        y: theme === "dark" ? 0 : -20,
                        opacity: theme === "dark" ? 1 : 0,
                        rotate: theme === "dark" ? 0 : -90
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center text-blue-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                </motion.div>
            </div>
        </button>
    );
};

export default ThemeToggle;
