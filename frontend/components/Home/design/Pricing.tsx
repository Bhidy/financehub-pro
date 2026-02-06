import { lines } from "../assets";

export const LeftLine = () => {
    return (
        <div className="hidden lg:block absolute top-1/2 right-full w-[92.5rem] h-[11.0625rem] -translate-y-1/2 pointer-events-none">
            <img
                className="w-full"
                src={lines}
                width={1480}
                height={177}
                alt="Lines"
            />
        </div>
    );
};

export const RightLine = () => {
    return (
        <div className="hidden lg:block absolute top-1/2 left-full w-[92.5rem] h-[11.0625rem] -translate-y-1/2 -scale-x-100 pointer-events-none">
            <img
                className="w-full"
                src={lines}
                width={1480}
                height={177}
                alt="Lines"
            />
        </div>
    );
};

export const PremiumGlobalSphere = () => {
    return (
        <div className="relative w-[400px] h-[400px] flex items-center justify-center scale-90">
            {/* 1. Deep Ambient Glow (Behind) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#13b8a6]/20 blur-[90px] rounded-full" />

            {/* 2. Main Sphere SVG (Complex 3D Shader) */}
            <svg
                viewBox="0 0 400 400"
                className="relative z-10 w-[320px] h-[320px] drop-shadow-[0_20px_50px_rgba(19,184,166,0.3)]"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Base Body Gradient */}
                    <radialGradient id="sphereBody" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                        <stop offset="0%" stopColor="#5eead4" stopOpacity="0.8" /> {/* Highlight */}
                        <stop offset="40%" stopColor="#13b8a6" stopOpacity="0.9" /> {/* Midtone */}
                        <stop offset="100%" stopColor="#0f766e" stopOpacity="1" /> {/* Shadow */}
                    </radialGradient>

                    {/* Rim Light (Fresnel Effect) */}
                    <radialGradient id="rimLight" cx="50%" cy="50%" r="50%">
                        <stop offset="85%" stopColor="transparent" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.6" />
                    </radialGradient>

                    {/* Specular Highlight (Glossy Reflection) */}
                    <linearGradient id="specular" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                        <stop offset="20%" stopColor="white" stopOpacity="0" />
                    </linearGradient>

                    {/* Grid Gradient */}
                    <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="white" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.1" />
                    </linearGradient>
                </defs>

                {/* Layer 1: Base Sphere */}
                <circle cx="200" cy="200" r="158" fill="url(#sphereBody)" />

                {/* Layer 2: Wireframe Grid (Rotated for 3D effect) */}
                <g fill="none" stroke="url(#gridGrad)" strokeWidth="0.8" opacity="0.6" transform="rotate(-15, 200, 200)">
                    {/* Meridians */}
                    <ellipse cx="200" cy="200" rx="158" ry="158" />
                    <ellipse cx="200" cy="200" rx="110" ry="158" />
                    <ellipse cx="200" cy="200" rx="60" ry="158" />
                    <line x1="200" y1="42" x2="200" y2="358" />

                    {/* Parallels (Curved) */}
                    <path d="M 42,200 Q 200,280 358,200" strokeOpacity="0.8" />
                    <path d="M 42,200 Q 200,120 358,200" strokeOpacity="0.8" />
                    <path d="M 70,280 Q 200,340 330,280" strokeOpacity="0.5" />
                    <path d="M 70,120 Q 200,60 330,120" strokeOpacity="0.5" />
                </g>

                {/* Layer 3: Inner Depth/Shadows */}
                <circle cx="200" cy="200" r="158" fill="url(#rimLight)" />

                {/* Layer 4: Top Gloss Reflection */}
                <ellipse cx="140" cy="100" rx="60" ry="30" fill="url(#specular)" transform="rotate(-20, 140, 100)" filter="blur(2px)" />

                {/* Floating Data Nodes */}
                <g fill="white">
                    <circle cx="200" cy="200" r="3" className="animate-pulse">
                        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="120" cy="160" r="2" opacity="0.8" />
                    <circle cx="280" cy="240" r="2" opacity="0.8" />
                </g>
            </svg>

            {/* 3. Orbit Rings (Thinner, tech-blended) */}
            <div className="absolute inset-20 border-[1px] border-[#13b8a6]/40 rounded-full scale-[1.3] rotate-12 opacity-60 animate-[spin_20s_linear_infinite]"
                style={{ borderStyle: 'solid', maskImage: 'linear-gradient(to right, transparent, black)' }} />
            <div className="absolute inset-24 border-[1px] border-cyan-400/30 rounded-full scale-[1.2] -rotate-12 opacity-50 animate-[spin_25s_linear_infinite_reverse]" />


            {/* 4. Ultra Premium Floating Card: MARKET SENTIMENT (Top Right) */}
            <div className="absolute top-[20%] -right-12 w-36 bg-white/70 dark:bg-n-8/80 backdrop-blur-xl border border-white/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-float">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-n-4 uppercase tracking-wider">Sentiment</span>
                        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-green-600 dark:text-green-400">BULLISH</span>
                        </div>
                    </div>
                    {/* Mini Sparkline */}
                    <svg className="w-full h-8 overflow-visible mt-1" viewBox="0 0 100 30">
                        <path d="M0,30 Q20,28 40,15 T100,5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="100" cy="5" r="3" fill="#10b981" className="animate-ping" style={{ animationDuration: '2s' }} />
                        <circle cx="100" cy="5" r="2" fill="white" />
                        {/* Area Fill */}
                        <path d="M0,30 Q20,28 40,15 T100,5 V30 H0 Z" fill="url(#sparkGradient)" opacity="0.2" />
                        <defs>
                            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* 5. Ultra Premium Floating Card: REAL-TIME VOL (Bottom Left) */}
            <div className="absolute bottom-[20%] -left-10 bg-white/70 dark:bg-n-8/80 backdrop-blur-xl border border-white/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-float-delayed">
                <div className="flex items-center gap-3">
                    {/* Live Candlestick Visual */}
                    <div className="flex items-end gap-[3px] h-8">
                        <div className="w-1.5 h-4 bg-red-400 rounded-[1px] relative">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-red-400" />
                        </div>
                        <div className="w-1.5 h-6 bg-[#13b8a6] rounded-[1px] relative">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[1px] h-9 bg-[#13b8a6]" />
                        </div>
                        <div className="w-1.5 h-3 bg-red-400 rounded-[1px]" />
                        <div className="w-1.5 h-7 bg-[#13b8a6] rounded-[1px] shadow-[0_0_8px_rgba(19,184,166,0.6)]" />
                    </div>
                    <div>
                        <div className="text-[9px] font-bold text-n-4 uppercase">Volume</div>
                        <div className="text-xs font-bold text-n-8 dark:text-n-1">2.4M</div>
                    </div>
                </div>
            </div>

            {/* 6. NEW FLOATING CARD: AI FORECAST (Top Left) */}
            <div className="absolute top-[25%] -left-12 bg-white/70 dark:bg-n-8/80 backdrop-blur-xl border border-white/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-float-slow">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-[9px] font-bold text-n-4 uppercase">Forecast</div>
                        <div className="text-xs font-bold text-n-8 dark:text-n-1">+12.8%</div>
                    </div>
                </div>
            </div>

            {/* 7. NEW FLOATING CARD: RSI INDICATOR (Bottom Right) */}
            <div className="absolute bottom-[28%] -right-10 bg-white/70 dark:bg-n-8/80 backdrop-blur-xl border border-white/40 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-float-reverse">
                <div className="flex flex-col items-center">
                    <div className="text-[9px] font-bold text-n-4 uppercase w-full text-left">RSI (14)</div>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                        <div className="w-[60%] h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-[pulse_3s_ease-in-out_infinite]" />
                    </div>
                    <div className="text-[10px] font-bold text-n-8 dark:text-n-1 mt-1 w-full text-right">62.4</div>
                </div>
            </div>

            {/* 6. Decoration: Floating Particles */}
            <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute bottom-20 right-20 w-1.5 h-1.5 bg-[#13b8a6] rounded-full blur-[1px] animate-pulse delay-1000" />

        </div>
    );
};
