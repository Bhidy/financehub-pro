import React from "react";

const HeroVectorV3 = ({ className }: { className?: string }) => {
    return (
        <div className={`relative w-full h-full perspective-2000 overflow-hidden ${className || ""}`}>
            {/* 
                THE QUANTUM CORE: HYBRID CSS-SVG ENGINE 
                Combines SVG Filters (for texture/shine) with CSS 3D Transforms (for geometry).
             */}
            <style>
                {`
                    .perspective-2000 { perspective: 2000px; }
                    .preserve-3d { transform-style: preserve-3d; }
                    
                    @keyframes rotate-tesseract {
                        0% { transform: rotateX(60deg) rotateZ(45deg) rotateY(0deg); }
                        100% { transform: rotateX(60deg) rotateZ(45deg) rotateY(360deg); }
                    }
                    @keyframes pulse-light {
                        0%, 100% { opacity: 0.5; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.2); }
                    }
                    @keyframes beam-sweep {
                        0% { transform: rotate(0deg); opacity: 0; }
                        50% { opacity: 0.3; }
                        100% { transform: rotate(360deg); opacity: 0; }
                    }
                    
                    .quantum-spin { animation: rotate-tesseract 20s linear infinite; }
                    .core-pulse { animation: pulse-light 4s ease-in-out infinite; }
                    .beam-rotate { animation: beam-sweep 10s linear infinite; transform-origin: center; }
                `}
            </style>

            <svg
                className="w-full h-full absolute inset-0"
                viewBox="0 0 1024 490"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* --- 1. THE "SHINING" ENGINE (Specular Filters) --- */}
                    <filter id="crystal-shine" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                        <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.5" specularExponent="30" lightingColor="#ffffff" result="specOut">
                            <fePointLight x="-5000" y="-10000" z="2000" />
                        </feSpecularLighting>
                        <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                        <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
                    </filter>

                    <filter id="neon-burn" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="1.2" k3="0.8" />
                    </filter>

                    <radialGradient id="halo-gradient" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#13b8a6" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="metal-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.9" className="dark:stop-color-[#334155]" />
                        <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.5" className="dark:stop-color-[#1e293b]" />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" className="dark:stop-color-[#0f172a]" />
                    </linearGradient>
                </defs>

                {/* --- 2. ATMOSPHERE --- */}
                {/* Background Floor Reflection */}
                <g transform="translate(512, 350) scale(1, 0.4)">
                    <circle cx="0" cy="0" r="500" fill="url(#halo-gradient)" opacity="0.3" />
                    <circle cx="0" cy="0" r="300" stroke="#13b8a6" strokeWidth="1" strokeDasharray="4 8" opacity="0.2" className="beam-rotate" />
                </g>

                {/* --- 3. THE "QUANTUM CORE" (Using CSS 3D for True Depth) --- */}
                {/* We use a foreignObject to inject HTML/CSS 3D scene inside SVG context */}
                <foreignObject x="312" y="50" width="400" height="400">
                    <div className="w-full h-full flex items-center justify-center preserve-3d quantum-spin">
                        {/* 3D Cube Faces constructed via CSS would go here if cleaner, 
                            but keeping it simple with nested SVGs for maximum compatibility/performance ratio */}

                        {/* Simulating 3D Geometry with layered SVG paths that rotate */}
                        <div className="w-48 h-48 relative preserve-3d">
                            {/* Face 1 */}
                            <div className="absolute inset-0 border-2 border-teal-400/50 bg-teal-500/10 backdrop-blur-md rounded-xl transform translate-z-12" style={{ transform: 'translateZ(60px)' }}></div>
                            {/* Face 2 */}
                            <div className="absolute inset-0 border-2 border-teal-400/50 bg-teal-500/10 backdrop-blur-md rounded-xl transform -translate-z-12" style={{ transform: 'translateZ(-60px)' }}></div>
                            {/* Face 3 */}
                            <div className="absolute inset-0 border-2 border-cyan-400/50 bg-cyan-500/10 backdrop-blur-md rounded-xl transform rotate-y-90 translate-z-12" style={{ transform: 'rotateY(90deg) translateZ(60px)' }}></div>
                            {/* Face 4 */}
                            <div className="absolute inset-0 border-2 border-cyan-400/50 bg-cyan-500/10 backdrop-blur-md rounded-xl transform rotate-y-90 -translate-z-12" style={{ transform: 'rotateY(90deg) translateZ(-60px)' }}></div>
                            {/* Face 5 */}
                            <div className="absolute inset-0 border-2 border-white/50 bg-white/5 backdrop-blur-md rounded-xl transform rotate-x-90 translate-z-12" style={{ transform: 'rotateX(90deg) translateZ(60px)' }}></div>
                            {/* Face 6 */}
                            <div className="absolute inset-0 border-2 border-white/50 bg-white/5 backdrop-blur-md rounded-xl transform rotate-x-90 -translate-z-12" style={{ transform: 'rotateX(90deg) translateZ(-60px)' }}></div>

                            {/* Inner "Singularity" */}
                            <div className="absolute inset-0 m-auto w-12 h-12 bg-white/90 rounded-full shadow-[0_0_50px_#2dd4bf] core-pulse"></div>
                        </div>
                    </div>
                </foreignObject>

                {/* --- 4. ORBITAL RINGS (SVG) --- */}
                <g transform="translate(512, 250)">
                    <ellipse cx="0" cy="0" rx="200" ry="60" stroke="#13b8a6" strokeWidth="2" fill="none" transform="rotate(-15)" opacity="0.5" filter="url(#neon-burn)" />
                    <ellipse cx="0" cy="0" rx="200" ry="60" stroke="#06b6d4" strokeWidth="2" fill="none" transform="rotate(15)" opacity="0.5" filter="url(#neon-burn)" />

                    {/* Data Particles */}
                    <circle cx="200" cy="0" r="4" fill="white" transform="rotate(-15)">
                        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="8s" repeatCount="indefinite" />
                    </circle>
                </g>

                {/* --- 5. FLOATING INTERFACE (App Context) --- */}
                {/* Left: Chat Intelligence */}
                <g transform="translate(200, 200)">
                    <rect x="0" y="0" width="140" height="80" rx="12" fill="white" className="dark:fill-[#1e293b]" fillOpacity="0.9" stroke="#13b8a6" filter="url(#crystal-shine)" />
                    <circle cx="30" cy="40" r="12" fill="#13b8a6" className="core-pulse" />
                    <rect x="60" y="30" width="60" height="8" rx="4" fill="#cbd5e1" className="dark:fill-[#475569]" />
                    <rect x="60" y="45" width="40" height="6" rx="3" fill="#e2e8f0" className="dark:fill-[#334155]" />
                </g>

                {/* Right: Market Signals */}
                <g transform="translate(680, 240)">
                    <rect x="0" y="0" width="160" height="100" rx="12" fill="white" className="dark:fill-[#1e293b]" fillOpacity="0.9" stroke="#06b6d4" filter="url(#crystal-shine)" />
                    <path d="M20 70 L50 40 L80 60 L140 20" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" filter="url(#neon-burn)" />
                    <text x="30" y="30" fontSize="12" fontWeight="bold" fill="#2dd4bf">EGX30 +2.1%</text>
                </g>

            </svg>
        </div>
    );
};

export default HeroVectorV3;
