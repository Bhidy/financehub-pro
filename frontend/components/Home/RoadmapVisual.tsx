import React from "react";
import { loading1 } from "./assets";
import StockLogo from "./StockLogo";

const RoadmapVisual = () => {
    return (
        <div className="w-full h-[18rem] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Glows (Subtle) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[20rem] bg-n-3/5 rounded-full blur-3xl pointer-events-none" />

            {/* Status Pill */}
            <div className="relative z-10 flex items-center px-6 py-4 bg-white/50 dark:bg-n-6/50 backdrop-blur-xl rounded-full border border-n-1/10 dark:border-white/10 shadow-2xl mb-8">
                <img
                    className="w-5 h-5 mr-4 animate-spin opacity-70"
                    src={loading1}
                    alt="Loading"
                />
                <span className="text-n-1 dark:text-white font-code text-sm tracking-wider uppercase">
                    Connecting Live Feeds
                </span>
            </div>

            {/* Stock Pipeline */}
            <div className="relative z-10 flex items-center justify-center gap-12 w-full px-4">
                {/* Source 1 */}
                <div className="group relative transition-transform duration-500 hover:scale-110">
                    <StockLogo
                        ticker="COMI"
                        color="#004D87"
                        className="w-20 h-20 text-xl shadow-[0_10px_20px_-5px_rgba(0,77,135,0.4)]"
                    />
                    {/* Connector Line */}
                    <div className="absolute top-1/2 -right-12 w-12 h-[2px] bg-gradient-to-r from-[#004D87] to-n-3/30" />
                </div>

                {/* Source 2 (Central) */}
                <div className="relative z-20 scale-125 transition-transform duration-500 hover:scale-150">
                    <div className="absolute inset-0 bg-white/20 dark:bg-white/5 rounded-full blur-xl" />
                    <StockLogo
                        ticker="EGX"
                        color="#13b8a6"
                        className="w-24 h-24 text-2xl ring-8 ring-white/50 dark:ring-n-6 shadow-[0_0_40px_-10px_rgba(19,184,166,0.5)]"
                    />
                </div>

                {/* Source 3 */}
                <div className="group relative transition-transform duration-500 hover:scale-110">
                    {/* Connector Line */}
                    <div className="absolute top-1/2 -left-12 w-12 h-[2px] bg-gradient-to-l from-[#B4925A] to-n-3/30" />
                    <StockLogo
                        ticker="HRHO"
                        color="#B4925A"
                        className="w-20 h-20 text-xl shadow-[0_10px_20px_-5px_rgba(180,146,90,0.4)]"
                    />
                </div>
            </div>
        </div>
    );
};

export default RoadmapVisual;
