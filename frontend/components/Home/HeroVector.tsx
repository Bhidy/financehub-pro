import React from "react";

const HeroVector = ({ className }: { className?: string }) => {
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
                    /* --- KEYFRAMES --- */
                    @keyframes levitate {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                    }
                    @keyframes levitate-reverse {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(10px); }
                    }
                    @keyframes pulse-core {
                        0%, 100% { opacity: 0.8; transform: scale(1); filter: url(#glow-intense); }
                        50% { opacity: 1; transform: scale(1.05); filter: url(#glow-max); }
                    }
                    @keyframes stream-flow {
                        0% { stroke-dashoffset: 1000; }
                        100% { stroke-dashoffset: 0; }
                    }
                    @keyframes particle-orbit {
                        0% { opacity: 0; transform: translate(0,0) scale(0.5); }
                        20% { opacity: 1; }
                        80% { opacity: 1; }
                        100% { opacity: 0; transform: translate(200px, -100px) scale(0); }
                    }
                    @keyframes rotate-ring {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }

                    /* --- CLASSES --- */
                    .animate-float-main { animation: levitate 8s ease-in-out infinite; }
                    .animate-float-sub { animation: levitate-reverse 9s ease-in-out infinite; }
                    .animate-pulse-core { animation: pulse-core 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                    .animate-stream { stroke-dasharray: 20 40; animation: stream-flow 20s linear infinite; }
                    .animate-ring { animation: rotate-ring 60s linear infinite; transform-box: fill-box; transform-origin: center; }
                `}
            </style>

            <defs>
                {/* --- SUPERIOR FILTERS --- */}
                <filter id="glass-frosted" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>

                <filter id="glow-intense" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <filter id="glow-max" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="15" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* --- LUXURY GRADIENTS --- */}
                <linearGradient id="cyber-glass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.9" className="dark:stop-color-[#1e293b]" />
                    <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.3" className="dark:stop-color-[#0f172a]" />
                    <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.8" className="dark:stop-color-[#1e293b]" />
                </linearGradient>

                <linearGradient id="neon-teal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#13b8a6" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#2dd4bf" stopOpacity="1" />
                    <stop offset="100%" stopColor="#13b8a6" stopOpacity="0.2" />
                </linearGradient>

                <linearGradient id="neon-cyan" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                </linearGradient>

                <radialGradient id="core-glow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="1" />
                    <stop offset="100%" stopColor="#13b8a6" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* --- SCENE: ISOMETRIC PROJECTION --- */}
            {/* Base Grid - Infinite Floor */}
            <g transform="translate(512, 300) scale(1, 0.5)">
                <circle cx="0" cy="0" r="450" fill="url(#core-glow)" opacity="0.1" />
                <path d="M-500 0 L500 0 M0 -500 L0 500" stroke="#13b8a6" strokeWidth="0.5" opacity="0.3" />
                <circle cx="0" cy="0" r="250" stroke="#13b8a6" strokeWidth="1" strokeDasharray="4 8" opacity="0.2" className="animate-ring" />
                <circle cx="0" cy="0" r="350" stroke="#06b6d4" strokeWidth="1" strokeDasharray="10 20" opacity="0.1" className="animate-ring" style={{ animationDirection: 'reverse', animationDuration: '80s' }} />
            </g>

            {/* --- THE NEURAL CORE (Center) --- */}
            <g transform="translate(512, 220)" className="animate-float-main">
                {/* Outer Glass Shell */}
                <path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z"
                    fill="url(#cyber-glass)" stroke="#2dd4bf" strokeWidth="1.5"
                    filter="url(#glass-frosted)" opacity="0.8"
                />

                {/* Inner Energy Core */}
                <circle cx="0" cy="0" r="25" fill="white" className="dark:fill-[#2dd4bf] animate-pulse-core" />

                {/* Orbiting Electrons */}
                <ellipse cx="0" cy="0" rx="60" ry="20" stroke="#13b8a6" strokeWidth="1" transform="rotate(60)" opacity="0.6" />
                <ellipse cx="0" cy="0" rx="60" ry="20" stroke="#06b6d4" strokeWidth="1" transform="rotate(-60)" opacity="0.6" />

                {/* Connection Nodes */}
                <circle cx="0" cy="-60" r="4" fill="#2dd4bf" filter="url(#glow-intense)" />
                <circle cx="52" cy="30" r="4" fill="#2dd4bf" filter="url(#glow-intense)" />
                <circle cx="-52" cy="30" r="4" fill="#2dd4bf" filter="url(#glow-intense)" />
            </g>

            {/* --- FLOATING MODULE: CHAT BOT (Left) --- */}
            <g transform="translate(260, 180)" className="animate-float-sub">
                {/* Glass Card */}
                <rect x="-80" y="-50" width="160" height="100" rx="12"
                    fill="url(#cyber-glass)" stroke="#13b8a6" strokeWidth="1"
                    filter="url(#glass-frosted)"
                />
                {/* Chat UI */}
                <rect x="-60" y="-30" width="80" height="24" rx="8" fill="#e2e8f0" className="dark:fill-[#334155]" />
                <rect x="-20" y="5" width="80" height="24" rx="8" fill="#13b8a6" fillOpacity="0.2" stroke="#13b8a6" />

                {/* Connector Cable */}
                <path d="M80 0 C 150 0, 180 40, 200 40" stroke="url(#neon-teal)" strokeWidth="2" fill="none" className="animate-stream" />
            </g>

            {/* --- FLOATING MODULE: MARKET DATA (Right) --- */}
            <g transform="translate(764, 260)" className="animate-float-sub" style={{ animationDelay: '1s' }}>
                {/* Glass Card */}
                <rect x="-90" y="-60" width="180" height="120" rx="12"
                    fill="url(#cyber-glass)" stroke="#06b6d4" strokeWidth="1"
                    filter="url(#glass-frosted)"
                />
                {/* Chart UI */}
                <path d="M-70 20 L-40 0 L-10 30 L20 -10 L50 10 L80 -20"
                    fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" filter="url(#glow-intense)"
                />
                <path d="M-70 20 L-40 0 L-10 30 L20 -10 L50 10 L80 -20 V 40 H -70 Z"
                    fill="url(#neon-teal)" opacity="0.3"
                />

                {/* Stats Header */}
                <rect x="-70" y="-40" width="40" height="6" rx="3" fill="#cbd5e1" className="dark:fill-[#475569]" />
                <rect x="-20" y="-40" width="90" height="6" rx="3" fill="#e2e8f0" className="dark:fill-[#334155]" />

                {/* Connector Cable */}
                <path d="M-90 0 C -160 0, -190 -40, -200 -40" stroke="url(#neon-cyan)" strokeWidth="2" fill="none" className="animate-stream" style={{ animationDirection: 'reverse' }} />
            </g>

            {/* --- PARTICLE FIELD --- */}
            {/* Random floating bits */}
            <circle cx="300" cy="350" r="2" fill="#13b8a6" className="animate-float-main">
                <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="700" cy="150" r="3" fill="#06b6d4" className="animate-float-sub">
                <animate attributeName="opacity" values="0;1;0" dur="5s" repeatCount="indefinite" />
            </circle>

        </svg>
    );
};

export default HeroVector;
