'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Interactive NAV history chart — the premium fund page's centrepiece, rebuilt
 * on lightweight-charts v5 (the in-repo charting engine). NAV history is fetched
 * client-side (progressive enhancement); all SEO-relevant numbers are already in
 * the server-rendered HTML, so the chart never gates indexable content.
 *
 * Defensive by design: guards the container, tears the chart down on unmount,
 * and falls back to a premium empty state when there isn't enough history.
 */

type Point = { time: string; value: number };

const RANGES = ['1M', '3M', 'YTD', '1Y', '3Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];

function rangeCutoff(range: Range): number | null {
    const day = 86_400_000;
    const now = Date.now();
    switch (range) {
        case '1M':
            return now - 31 * day;
        case '3M':
            return now - 92 * day;
        case 'YTD':
            return Date.UTC(new Date().getUTCFullYear(), 0, 1);
        case '1Y':
            return now - 365 * day;
        case '3Y':
            return now - 3 * 365 * day;
        case 'ALL':
            return null;
    }
}

export default function FundNavChart({
    fundId,
    currency = 'EGP',
}: {
    fundId: string | number;
    currency?: string;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesRef = useRef<any>(null);

    const [all, setAll] = useState<Point[] | null>(null);
    const [range, setRange] = useState<Range>('YTD');
    const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

    // Fetch NAV history once.
    useEffect(() => {
        let alive = true;
        fetch(`/api/v1/funds/${encodeURIComponent(String(fundId))}/nav?limit=2200`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nav fetch failed'))))
            .then((rows: Array<{ date?: string; nav?: string | number }>) => {
                if (!alive) return;
                const pts = (Array.isArray(rows) ? rows : [])
                    .map((x) => ({ time: String(x.date ?? '').slice(0, 10), value: Number(x.nav) }))
                    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.time) && Number.isFinite(p.value))
                    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
                setAll(pts);
                setStatus(pts.length >= 2 ? 'ready' : 'empty');
            })
            .catch(() => {
                if (alive) setStatus('error');
            });
        return () => {
            alive = false;
        };
    }, [fundId]);

    const applyRange = useCallback(
        (r: Range) => {
            const series = seriesRef.current;
            const chart = chartRef.current;
            if (!series || !chart || !all) return;
            const cutoff = rangeCutoff(r);
            const filtered = cutoff === null ? all : all.filter((p) => Date.parse(`${p.time}T00:00:00Z`) >= cutoff);
            // Fall back to the full series if the window is too sparse to draw.
            const view = filtered.length >= 2 ? filtered : all;
            series.setData(view);
            chart.timeScale().fitContent();
        },
        [all]
    );

    // Build the chart once history is available; tear down on unmount.
    useEffect(() => {
        if (!all || all.length < 2 || !wrapRef.current) return;
        let cancelled = false;
        let resizeObserver: ResizeObserver | undefined;

        (async () => {
            const LWC = await import('lightweight-charts');
            const host = wrapRef.current;
            if (cancelled || !host) return;

            const textColor =
                getComputedStyle(document.documentElement).getPropertyValue('--c-text-muted').trim() || '#5b6677';

            const chart = LWC.createChart(host, {
                layout: {
                    background: { type: LWC.ColorType.Solid, color: 'transparent' },
                    textColor,
                    fontFamily: "'Manrope', sans-serif",
                    attributionLogo: false,
                },
                width: host.clientWidth,
                height: 340,
                rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.16)', minimumWidth: 64 },
                timeScale: {
                    borderColor: 'rgba(148, 163, 184, 0.16)',
                    timeVisible: false,
                    secondsVisible: false,
                    rightOffset: 3,
                },
                grid: {
                    vertLines: { color: 'rgba(148, 163, 184, 0.07)' },
                    horzLines: { color: 'rgba(148, 163, 184, 0.07)' },
                },
                crosshair: {
                    mode: LWC.CrosshairMode.Magnet,
                    vertLine: { color: 'rgba(20, 184, 166, 0.3)', width: 1, labelVisible: false },
                    horzLine: { color: 'rgba(20, 184, 166, 0.3)', width: 1, labelVisible: false },
                },
                handleScroll: false,
                handleScale: false,
            });

            const series = chart.addSeries(LWC.AreaSeries, {
                lineColor: '#14B8A6',
                topColor: 'rgba(20, 184, 166, 0.24)',
                bottomColor: 'rgba(20, 184, 166, 0.02)',
                lineWidth: 3,
                priceLineVisible: true,
                priceLineColor: 'rgba(20, 184, 166, 0.5)',
                priceLineStyle: 2,
                lastValueVisible: true,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });

            chartRef.current = chart;
            seriesRef.current = series;
            applyRange(range);

            const tip = tipRef.current;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chart.subscribeCrosshairMove((param: any) => {
                if (!tip) return;
                if (!param.point || param.time == null || param.point.x < 0) {
                    tip.classList.remove('visible');
                    return;
                }
                const bar = param.seriesData.get(series);
                const value = bar && (bar.value ?? bar.close);
                if (value == null || !Number.isFinite(Number(value))) {
                    tip.classList.remove('visible');
                    return;
                }
                const iso = typeof param.time === 'string' ? param.time : String(param.time);
                const dEl = tip.querySelector('[data-d]');
                const vEl = tip.querySelector('[data-v]');
                if (dEl)
                    dEl.textContent = new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                    });
                if (vEl) vEl.textContent = `${currency} ${Number(value).toFixed(4)}`;
                const w = host.clientWidth;
                tip.style.left = `${Math.min(Math.max(param.point.x, 78), w - 78)}px`;
                tip.style.top = `${Math.max(param.point.y - 10, 6)}px`;
                tip.classList.add('visible');
            });

            resizeObserver = new ResizeObserver(() => {
                if (!chartRef.current || !wrapRef.current) return;
                chartRef.current.applyOptions({ width: wrapRef.current.clientWidth });
                chartRef.current.timeScale().fitContent();
            });
            resizeObserver.observe(host);
        })();

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch {
                    /* already disposed */
                }
            }
            chartRef.current = null;
            seriesRef.current = null;
        };
        // Rebuild only when the dataset identity changes, not on range flips.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [all]);

    // Re-draw the visible window when the range changes.
    useEffect(() => {
        applyRange(range);
    }, [range, applyRange]);

    return (
        <div className="glass-premium rounded-[2rem] p-4 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center gap-2">
                {RANGES.map((r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => setRange(r)}
                        className={`range-btn rounded-full px-3.5 py-2 text-sm font-semibold ${range === r ? 'active' : ''}`}
                        aria-pressed={range === r}
                    >
                        {r === 'ALL' ? 'All' : r}
                    </button>
                ))}
            </div>

            <div className="relative mt-4">
                <div
                    ref={wrapRef}
                    className="w-full overflow-hidden rounded-[1.4rem] border border-border bg-surface"
                    style={{ minHeight: '340px' }}
                />
                {status !== 'ready' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[1.4rem] border border-dashed border-border bg-surface text-center">
                        <div className="px-6">
                            <div className="text-base font-display font-bold text-main">
                                {status === 'loading' ? 'Loading NAV history…' : status === 'error' ? 'Chart unavailable right now.' : 'Not enough chart history yet.'}
                            </div>
                            <p className="mt-2 text-sm text-muted">
                                {status === 'loading'
                                    ? 'Fetching the full saved NAV series for this fund.'
                                    : status === 'error'
                                      ? 'The NAV history could not be loaded. Please try again shortly.'
                                      : 'This chart appears automatically once enough NAV history is saved.'}
                            </p>
                        </div>
                    </div>
                )}
                <div ref={tipRef} className="chart-tooltip">
                    <div data-d className="text-[0.68rem] uppercase tracking-[0.18em] text-muted" />
                    <div data-v className="mt-1 text-sm font-semibold text-main" />
                </div>
            </div>
        </div>
    );
}
