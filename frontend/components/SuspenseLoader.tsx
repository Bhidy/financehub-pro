'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SuspenseLoaderProps {
    message?: string;
}

export const SuspenseLoader = ({ message = 'Loading Data...' }: SuspenseLoaderProps) => {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] w-full gap-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <p
                    className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse"
                >
                    {message}
                </p>
            </motion.div>
        </div>
    );
};
