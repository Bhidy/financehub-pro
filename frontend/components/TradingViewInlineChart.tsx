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
}: {
    tvSymbol: string;
    lang?: "en" | "ar";
    height?: number;
}) {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const embed = () => {
            const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
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
                hide_side_toolbar: true,
                hide_top_toolbar: false,
                save_image: false,
                withdateranges: true,
                support_host: "https://www.tradingview.com",
            });
            wrap.appendChild(script);
            host.appendChild(wrap);
        };

        embed();
        // Re-embed when the site theme toggles so the widget always matches.
        const observer = new MutationObserver((muts) => {
            if (muts.some((m) => m.attributeName === "data-theme")) embed();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        return () => {
            observer.disconnect();
            host.innerHTML = "";
        };
    }, [tvSymbol, lang]);

    return <div ref={hostRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden" />;
}
