"use client";

import { useEffect, useRef } from "react";

/**
 * Inline TradingView Advanced Chart — the page's PRIMARY price chart.
 *
 * June-2026 TV-only mandate: the previous native SVG chart drew bars from our
 * ohlc_data table (Yahoo-sourced history), which is not TradingView data. This
 * embeds TradingView's own chart, so every candle, timeframe and indicator on
 * the symbol page is 100% TradingView — identical to tradingview.com.
 *
 * Re-embeds on theme flips (watches <html data-theme>) and on symbol/lang change.
 * tvSymbol e.g. "EGX:COMI".
 */
export function TradingViewInlineChart({
    tvSymbol,
    lang = "en",
    height = 480,
    variant = "advanced",
}: {
    tvSymbol: string;
    lang?: "en" | "ar";
    height?: number;
    /** "advanced" = full chart; "mini" = lightweight symbol-overview line chart
     *  (used in compact surfaces like the mobile quick-sheet). */
    variant?: "advanced" | "mini";
}) {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const embed = () => {
            const dark = document.documentElement.getAttribute("data-theme") === "dark"
                || document.documentElement.classList.contains("dark");
            const theme = dark ? "dark" : "light";
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
            script.async = true;
            if (variant === "mini") {
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                script.text = JSON.stringify({
                    symbol: tvSymbol,
                    width: "100%",
                    height: "100%",
                    locale: lang === "ar" ? "ar" : "en",
                    dateRange: "3M",
                    colorTheme: theme,
                    isTransparent: true,
                    autosize: true,
                    largeChartUrl: "",
                });
            } else {
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
                script.text = JSON.stringify({
                    autosize: true,
                    symbol: tvSymbol,
                    interval: "D",
                    timezone: "Africa/Cairo",
                    theme,
                    style: "1",
                    locale: lang === "ar" ? "ar" : "en",
                    allow_symbol_change: false,
                    hide_side_toolbar: true,
                    hide_top_toolbar: false,
                    save_image: false,
                    withdateranges: true,
                    support_host: "https://www.tradingview.com",
                });
            }
            wrap.appendChild(script);
            host.appendChild(wrap);
        };

        embed();
        // Re-embed when the site theme toggles so the widget always matches.
        const observer = new MutationObserver((muts) => {
            if (muts.some((m) => m.attributeName === "data-theme" || m.attributeName === "class")) embed();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
        return () => {
            observer.disconnect();
            host.innerHTML = "";
        };
    }, [tvSymbol, lang, variant]);

    return <div ref={hostRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden" />;
}
