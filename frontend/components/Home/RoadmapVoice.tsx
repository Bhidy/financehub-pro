import React from "react";
import { notification4, loading1 } from "./assets";

const RoadmapVoice = () => {
    return (
        <div className="w-full h-[18rem] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Gradient/Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-gradient-to-r from-[#004D87]/20 to-[#13b8a6]/20 rounded-full blur-[6rem] pointer-events-none" />

            {/* Chat Bubble */}
            <div className="relative z-10 mb-8 transform translate-x-[-1rem]">
                <div className="relative bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 rounded-2xl rounded-bl-none px-6 py-4 shadow-2xl">
                    <p className="font-code text-sm text-white/90 tracking-wide">
                        Morning! Ask me anything
                    </p>
                    <span className="block text-[0.65rem] text-slate-400 mt-1 font-mono text-right">
                        1M AGO
                    </span>

                    {/* Tail */}
                    <svg
                        className="absolute -bottom-2 left-0 w-4 h-4 text-[#0F172A]/90 transform rotate-180" // Simple triangle fix or SVG tail
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path d="M0 0 L20 0 L20 20 Z" />
                    </svg>

                    {/* AI Icon Badge */}
                    <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-br from-[#004D87] to-[#13b8a6] rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                        <img
                            src={loading1}
                            className="w-5 h-5 opacity-90"
                            alt="AI"
                        />
                    </div>
                </div>
            </div>

            {/* Voice Waveform & Avatar */}
            <div className="relative z-10 flex items-center gap-6 w-full px-8 justify-center">

                {/* Waveform Visualization */}
                <div className="flex items-center gap-1 h-12">
                    {/* Generating random-looking bars */}
                    {[...Array(24)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-[#004D87] to-[#13b8a6] rounded-full animate-pulse"
                            style={{
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.05}s`,
                                opacity: 0.8
                            }}
                        />
                    ))}
                </div>

                {/* User Avatar */}
                <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl">
                        <img
                            src={notification4}
                            className="w-full h-full object-cover"
                            alt="User"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoadmapVoice;
