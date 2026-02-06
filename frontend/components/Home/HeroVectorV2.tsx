import React from "react";

const HeroVectorV2 = ({ className }: { className?: string }) => {
    return (
        <svg
            className={`w-full h-full ${className || ""}`}
            viewBox="0 0 1024 490"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            <style>
                {`
                    @keyframes orbit {
                        0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
                        100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
                    }
                    @keyframes orbit-rev {
                        0% { transform: rotate(360deg) translateX(180px) rotate(-360deg); }
                        100% { transform: rotate(0deg) translateX(180px) rotate(0deg); }
                    }
                    @keyframes float-hero {
                        0%, 100% { transform: translateY(0px) rotateX(0deg); }
                        50% { transform: translateY(-20px) rotateX(5deg); }
                    }
                    @keyframes pulse-beam {
                        0%, 100% { opacity: 0.3; stroke-width: 1; }
                        50% { opacity: 0.8; stroke-width: 2; }
                    }
                    @keyframes shimmer {
                        0% { stop-opacity: 0.1; }
                        50% { stop-opacity: 0.4; }
                        100% { stop-opacity: 0.1; }
                    }
                    
                    .hero-core { animation: float-hero 8s ease-in-out infinite; transform-origin: center; box-shadow: 0 0 50px #13b8a6; }
                    .orbiter-1 { animation: orbit 20s linear infinite; transform-origin: 512px 260px; }
                    .orbiter-2 { animation: orbit-rev 25s linear infinite; transform-origin: 512px 260px; }
                    .beam-pulse { animation: pulse-beam 3s ease-in-out infinite; }
                `}
            </style>

            <defs>
                {/* --- WORLD-CLASS LIGHTING & MATERIALS --- */}

                {/* 1. Volumetric Glow (The "Holy" Light) */}
                <filter id="god-rays" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
                    <feColorMatrix in="blur" type="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 18 -7
                    " result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>

                {/* 2. Prismatic Glass (Refraction Simulation) */}
                <linearGradient id="prism-glass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.8" className="dark:stop-color-[#1e293b]" />
                    <stop offset="25%" stopColor="#ccfbf1" stopOpacity="0.4" className="dark:stop-color-[#2dd4bf] dark:stop-opacity-20" />
                    <stop offset="50%" stopColor="#f0f9ff" stopOpacity="0.1" className="dark:stop-color-[#0f172a] dark:stop-opacity-50" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.6" className="dark:stop-color-[#334155]" />
                </linearGradient>

                <linearGradient id="prism-border" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#13b8a6" stopOpacity="0.3" />
                </linearGradient>

                {/* 3. The "Matrix" Data Stream Gradient */}
                <linearGradient id="data-stream" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#13b8a6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#2dd4bf" stopOpacity="1" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>

                {/* 4. Deep Space Background (Dark Mode) */}
                <radialGradient id="space-void" cx="0.5" cy="0.5" r="0.8">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" className="dark:stop-opacity-80" />
                </radialGradient>
            </defs>

            {/* --- LAYER 1: ATMOSPHERE --- */}
            {/* Dark Mode Vignette */}
            <rect width="100%" height="100%" fill="url(#space-void)" />

            {/* The Grid Floor (Infinite Data Plane) */}
            <g transform="translate(512, 400) scale(1, 0.4)">
                <circle cx="0" cy="0" r="600" fill="none" stroke="#13b8a6" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                <circle cx="0" cy="0" r="400" fill="none" stroke="#13b8a6" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                <circle cx="0" cy="0" r="200" fill="none" stroke="#13b8a6" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                {/* Radial Beams */}
                <path d="M0 0 L600 0 M0 0 L-600 0 M0 0 L0 600 M0 0 L0 -600" stroke="#13b8a6" strokeWidth="0.5" opacity="0.1" />
            </g>

            {/* --- LAYER 2: THE GLASS CITADEL (Central Dashboard) --- */}
            <g transform="translate(512, 260)" className="hero-core">

                {/* 2.1 Backend Glow */}
                <ellipse cx="0" cy="20" rx="180" ry="100" fill="#13b8a6" opacity="0.1" filter="url(#god-rays)" />

                {/* 2.2 Main Glass Monolith (Isometric) */}
                <path d="M-220 -80 L220 -80 L220 120 L-220 120 Z"
                    fill="url(#prism-glass)"
                    stroke="url(#prism-border)" strokeWidth="1"
                    className="backdrop-blur-xl"
                />

                {/* 2.3 UI: The Market Graph (Neon Pulse) */}
                <g transform="translate(-180, -40)">
                    {/* Grid Lines */}
                    <path d="M0 0 H360 M0 40 H360 M0 80 H360 M0 120 H360" stroke="#94a3b8" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 2" />

                    {/* The LIVE Chart Curve */}
                    <path d="M0 100 C 60 100, 80 40, 140 60 C 200 80, 240 20, 300 40 C 330 50, 360 0, 360 0"
                        fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round"
                        filter="url(#god-rays)"
                        className="animate-pulse"
                    />
                    {/* Area Fill */}
                    <path d="M0 100 C 60 100, 80 40, 140 60 C 200 80, 240 20, 300 40 C 330 50, 360 0, 360 0 V 140 H 0 Z"
                        fill="url(#data-stream)" opacity="0.2"
                    />
                </g>

                {/* 2.4 UI: Header Stats */}
                <rect x="-200" y="-120" width="100" height="30" rx="8" fill="white" className="dark:fill-[#1e293b] shadow-lg" />
                <rect x="-190" y="-112" width="20" height="14" rx="4" fill="#22c55e" />
                <rect x="-160" y="-110" width="50" height="4" rx="2" fill="#94a3b8" />
                <rect x="-160" y="-102" width="30" height="4" rx="2" fill="#cbd5e1" />

                <rect x="100" y="-120" width="100" height="30" rx="8" fill="white" className="dark:fill-[#1e293b] shadow-lg" />
                <rect x="110" y="-112" width="20" height="14" rx="4" fill="#13b8a6" />
                <rect x="140" y="-110" width="50" height="4" rx="2" fill="#94a3b8" />
            </g>

            {/* --- LAYER 3: ORBITAL INTELLIGENCE (Floating Satellites) --- */}

            {/* Satellite 1: "AI Chat Analysis" */}
            <g className="orbiter-1">
                <rect x="-60" y="-40" width="120" height="80" rx="12"
                    fill="white" className="dark:fill-[#0f172a]" stroke="#13b8a6" strokeWidth="1"
                    opacity="0.9" filter="url(#god-rays)"
                />

                {/* Chat Bubbles */}
                <rect x="-40" y="-20" width="60" height="16" rx="8" fill="#e2e8f0" className="dark:fill-[#334155]" />
                <rect x="0" y="5" width="40" height="16" rx="8" fill="#13b8a6" fillOpacity="0.2" />
                <text x="0" y="35" textAnchor="middle" fontSize="10" fill="#13b8a6" fontWeight="bold">AI ANALYST</text>
            </g>

            {/* Satellite 2: "Buy Signal" */}
            <g className="orbiter-2">
                <circle cx="0" cy="0" r="40" fill="white" className="dark:fill-[#0f172a]" stroke="#2dd4bf" strokeWidth="1" opacity="0.9" />
                <circle cx="0" cy="0" r="30" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="60 40" className="animate-spin" />
                <text x="0" y="5" textAnchor="middle" fontSize="10" fill="#22c55e" fontWeight="bold">BUY</text>
            </g>

            {/* --- LAYER 4: DATA CONNECTIONS (Beam Pulse) --- */}
            <line x1="512" y1="260" x2="632" y2="260" stroke="#13b8a6" strokeWidth="1" className="beam-pulse" transform="rotate(20 512 260)" />
            <line x1="512" y1="260" x2="692" y2="260" stroke="#06b6d4" strokeWidth="1" className="beam-pulse" transform="rotate(160 512 260)" />

        </svg>
    );
};

export default HeroVectorV2;
