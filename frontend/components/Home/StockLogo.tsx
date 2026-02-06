import React from "react";

interface StockLogoProps {
    ticker: string;
    color?: string;
    className?: string;
}

const StockLogo = ({ ticker, color = "#0F172A", className = "" }: StockLogoProps) => {
    // Generate a subtle gradient based on the brand color
    const gradientStyle = {
        background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
    };

    return (
        <div
            className={`relative flex items-center justify-center rounded-full border-2 border-white/20 overflow-hidden ${className}`}
            style={gradientStyle}
        >
            {/* Glass Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

            <span className="font-sans font-black text-white text-[0.7rem] leading-none tracking-widest drop-shadow-md z-10">
                {ticker}
            </span>
        </div>
    );
};

// Helper to darken color for gradient
function adjustColor(color: string, amount: number) {
    if (!color.startsWith("#")) return color;

    let usePound = false;
    if (color[0] == "#") {
        color = color.slice(1);
        usePound = true;
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amount;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amount;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}

export default StockLogo;
