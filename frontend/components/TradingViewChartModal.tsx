"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Fullscreen TradingView Advanced Chart modal — the professional charting widget
 * (drawing tools, indicators, multi-timeframe). Used as the "enlarge chart"
 * experience; the inline page chart stays our own native SVG (fast / never-fail),
 * and this opens TradingView's full pro chart on demand.
 *
 * tvSymbol e.g. "EGX:COMI" or "EGX:EGX30".
 */
export function TradingViewChartModal({
    open,
    onClose,
    tvSymbol,
    title,
    lang = "en",
}: {
    open: boolean;
    onClose: () => void;
    tvSymbol: string;
    title?: string;
    lang?: "en" | "ar";
}) {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || !hostRef.current) return;
        const host = hostRef.current;
        const theme = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
            ? "dark" : "light";

        host.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "tradingview-widget-container";
        wrap.style.height = "100%";
        wrap.style.width = "100%";
        const widget = document.createElement("div");
        widget.className = "tradingview-widget-container__widget";
        widget.style.height = "100%";
        widget.style.width = "100%";
        wrap.appendChild(widget);

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.async = true;
        script.text = JSON.stringify({
            autosize: true,
            symbol: tvSymbol,
            interval: "D",
            timezone: "Africa/Cairo",
            theme,
            style: "1",
            locale: lang === "ar" ? "ar" : "en",
            allow_symbol_change: false,
            hide_side_toolbar: false, // show the drawing-tools toolbar
            withdateranges: true,
            details: true,
            calendar: false,
            support_host: "https://www.tradingview.com",
        });
        wrap.appendChild(script);
        host.appendChild(wrap);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            host.innerHTML = "";
        };
    }, [open, tvSymbol, lang, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-5 py-3 bg-[#0b1220] border-b border-slate-800 flex-shrink-0">
                <span className="font-extrabold text-white text-sm md:text-base">
                    {title || tvSymbol.replace("EGX:", "")} · {lang === "ar" ? "الرسم البياني المتقدم" : "Advanced Chart"}
                </span>
                <button
                    onClick={onClose}
                    aria-label={lang === "ar" ? "إغلاق" : "Close"}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div ref={hostRef} className="flex-1 min-h-0" />
        </div>
    );
}
