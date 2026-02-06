import React from "react";

const HeroVectorV4 = ({ className }: { className?: string }) => {
    return (
        <div className={`relative w-full h-full perspective-2000 overflow-hidden ${className || ""}`}>
            {/* 
                V5 FLAGSHIP: THE ULTRA-PREMIUM HOLOGRAPHIC PRODUCT
                Enhanced with "Apple-Style" physical lighting, noise textures, and refined physics.
             */}
            <style>
                {`
                    .perspective-2000 { perspective: 2000px; }
                    .preserve-3d { transform-style: preserve-3d; }
                    
                    @keyframes float-slab-premium {
                        0%, 100% { transform: rotateX(60deg) rotateZ(35deg) translateZ(0px); }
                        50% { transform: rotateX(60deg) rotateZ(35deg) translateZ(30px); }
                    }
                    @keyframes float-card-premium {
                        0%, 100% { transform: translateZ(50px) translateY(0px); }
                        50% { transform: translateZ(70px) translateY(-10px); }
                    }
                    @keyframes pulse-signal-premium {
                        0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 30px rgba(34, 197, 94, 0.3); }
                        50% { opacity: 0.9; transform: scale(0.98); box-shadow: 0 0 15px rgba(34, 197, 94, 0.1); }
                    }
                    @keyframes shimmer-glint {
                        0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
                        10% { opacity: 0.5; }
                        40% { transform: translateX(150%) skewX(-20deg); opacity: 0; }
                        100% { transform: translateX(150%) skewX(-20deg); opacity: 0; }
                    }
                    
                    .holo-slab { animation: float-slab-premium 12s ease-in-out infinite; }
                    .holo-card-float { animation: float-card-premium 8s ease-in-out infinite; }
                    .signal-pulse { animation: pulse-signal-premium 4s ease-in-out infinite; }
                    .glint-anim { animation: shimmer-glint 6s ease-in-out infinite; }
                `}
            </style>

            <svg
                className="w-full h-full absolute inset-0 pointer-events-none"
                viewBox="0 0 1024 490"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* --- PREMIUM MATERIALS --- */}
                    <filter id="noise-texture">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.1" />
                        </feComponentTransfer>
                    </filter>

                    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <linearGradient id="neon-teal-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#13b8a6" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#2dd4bf" stopOpacity="1" />
                        <stop offset="100%" stopColor="#13b8a6" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                {/* Background Grid - The "Floor" */}
                <g transform="translate(512, 450) scale(1, 0.4)">
                    <circle cx="0" cy="0" r="600" fill="none" stroke="#2dd4bf" strokeWidth="0.5" opacity="0.05" strokeDasharray="4 4" />
                    <circle cx="0" cy="0" r="400" fill="none" stroke="#2dd4bf" strokeWidth="0.5" opacity="0.05" strokeDasharray="4 4" />
                    {/* Floor Reflection Blob */}
                    <ellipse cx="0" cy="0" rx="300" ry="100" fill="#2dd4bf" opacity="0.1" filter="url(#soft-glow)" />
                </g>
            </svg>

            {/* --- 3D SCENE --- */}
            <div className="absolute inset-0 flex items-center justify-center preserve-3d">

                {/* THE DEVICE (Flagship Glass Slab) */}
                <div className="w-[320px] h-[520px] relative preserve-3d holo-slab group">

                    {/* 1. The Glass Body (Multi-Layer Material) */}
                    <div className="absolute inset-0 rounded-[36px] overflow-hidden backdrop-blur-3xl transition-all duration-500
                        bg-gradient-to-br from-white/10 to-white/5 
                        dark:from-slate-800/40 dark:to-slate-900/40
                        border-t border-t-white/40 border-l border-l-white/20 border-r border-r-black/10 border-b border-b-black/30
                        shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]
                    ">
                        {/* Noise Texture Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
                            style={{ filter: 'url(#noise-texture)' }}></div>

                        {/* Shimmer/Glint Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 glint-anim mix-blend-overlay pointer-events-none"></div>

                        {/* 2. The Holographic UI Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between">

                            {/* Header */}
                            <div className="flex justify-between items-center opacity-40">
                                <div className="w-12 h-1 bg-current rounded-full" />
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                </div>
                            </div>

                            {/* Conversation Area */}
                            <div className="flex flex-col gap-6 mt-12 mb-auto">

                                {/* AI Response (Left) */}
                                <div className="self-start relative group/bubble">
                                    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full opacity-40 group-hover/bubble:opacity-60 transition-opacity" />
                                    <div className="relative bg-white/40 dark:bg-slate-800/60 border border-white/20 rounded-2xl p-4 backdrop-blur-md shadow-sm max-w-[90%]">
                                        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-cyan-500 shadow-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="h-1.5 w-16 bg-slate-400/30 rounded-full" />
                                                <div className="h-1.5 w-24 bg-slate-400/20 rounded-full" />
                                            </div>
                                        </div>

                                        {/* The Live Chart */}
                                        <div className="w-full h-32 relative rounded-lg overflow-hidden border border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-transparent">
                                            <svg className="w-full h-full absolute inset-0" viewBox="0 0 200 100" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M0 80 C 30 80, 50 50, 80 60 C 110 70, 140 20, 200 10"
                                                    stroke="#2dd4bf" strokeWidth="2" fill="none" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                                                <path d="M0 80 C 30 80, 50 50, 80 60 C 110 70, 140 20, 200 10 V 100 H 0 Z"
                                                    fill="url(#chart-fill)" />
                                                {/* Scanning Line */}
                                                <line x1="100" y1="0" x2="100" y2="100" stroke="#white" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="2 2" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* User Query (Right) */}
                                <div className="self-end bg-teal-500/10 border border-teal-500/20 rounded-2xl rounded-tr-sm p-4 backdrop-blur-md">
                                    <div className="h-2 w-32 bg-teal-600/30 rounded-full mb-2" />
                                    <div className="h-2 w-20 bg-teal-600/20 rounded-full" />
                                </div>

                            </div>

                            {/* Input Area (Bottom) */}
                            <div className="h-14 rounded-2xl bg-white/20 dark:bg-black/20 border border-white/5 backdrop-blur-md flex items-center px-4 gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10" />
                                <div className="h-2 w-32 bg-white/10 rounded-full" />
                            </div>

                        </div>
                    </div>

                    {/* --- FLOATING 3D ELEMENTS (Z-Axis Layers) --- */}

                    {/* "Strong Buy" Notification - Floating Higher */}
                    <div className="absolute -right-24 top-32 transform preserve-3d holo-card-float hover:scale-105 transition-transform duration-300 cursor-pointer">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] border border-green-500/30 flex items-center gap-4 signal-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-green-500/5 mix-blend-overlay" />
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping absolute" />
                                <div className="w-5 h-5 rounded-full bg-green-500" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-green-500 tracking-wider">STRONG BUY</div>
                                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">COMI.CA Breakout Detected</div>
                            </div>
                        </div>
                    </div>

                    {/* "Net Income" Pill */}
                    <div className="absolute -left-12 bottom-32 w-40 bg-white/90 dark:bg-slate-900/90 rounded-full p-2 pr-4 shadow-xl border border-teal-500/20 transform preserve-3d holo-card-float" style={{ animationDelay: '2s', transform: 'translateZ(30px)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold">
                                +24%
                            </div>
                            <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Net Income Growth</div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default HeroVectorV4;
