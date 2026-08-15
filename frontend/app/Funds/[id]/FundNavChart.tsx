'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findGaps, splitAtGaps, withGapBreaks, type NavPoint } from '@/lib/nav-gaps';

/**
 * Interactive NAV history chart — the premium fund page's centrepiece, rebuilt
 * on lightweight-charts v5 (the in-repo charting engine). NAV history is fetched
 * client-side (progressive enhancement); all SEO-relevant numbers are already in
 * the server-rendered HTML, so the chart never gates indexable content.
 *
 * Hover model (world-class, RTL/LTR-identical):
 *   The chart NEVER relies on the native crosshair for the tooltip. Instead a
 *   transparent overlay OWNS hit-testing: for any cursor x over the plot it
 *   resolves the NEAREST real data point via the time scale's own
 *   coordinate→logical mapping, drives the crosshair marker AND the tooltip from
 *   that single resolved point, and clamps the index to [0, n-1]. Consequences:
 *     • The latest NAV is always reachable — the right edge resolves to the last
 *       point instead of dying in the `rightOffset` whitespace gutter.
 *     • The tooltip can never "vanish" while the cursor is over the plot.
 *     • Marker, crosshair and tooltip always agree (no detachment).
 *   The chart container is pinned to `direction: ltr` (defense-in-depth): the
 *   plot itself is inherently LTR, so this immunises the hit-testing against any
 *   current or future RTL layout quirk while the surrounding UI stays RTL.
 *
 * Defensive by design: guards the container, tears the chart + listeners down on
 * unmount, and falls back to a premium empty state when there isn't enough
 * history.
 */

type Point = { time: string; value: number };

const RANGES = ['1M', '3M', 'YTD', '1Y', '3Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];

/** Below this, a window is not a chart — it is two dots joined by a line. */
const MIN_POINTS_TO_DRAW = 2;

const EN = {
    all: 'All',
    noData: 'Not enough published NAV history for this period',
    loading: 'Loading NAV history…',
    loadingSub: 'Fetching the full saved NAV series for this fund.',
    error: 'Chart unavailable right now.',
    errorSub: 'The NAV history could not be loaded. Please try again shortly.',
    empty: 'Not enough chart history yet.',
    emptySub: 'This chart appears automatically once enough NAV history is saved.',
    gapNotice: (n: number, longest: number) =>
        n === 1
            ? `The line breaks where no NAV was published — a gap of ${longest} days. Nothing has been estimated across it.`
            : `The line breaks in ${n} places where no NAV was published, the longest ${longest} days. Nothing has been estimated across them.`,
};

// Typed against EN so a key added to one language and forgotten in the other is a
// build error, not a silent English string on an Arabic page (bilingual parity).
const AR: typeof EN = {
    all: 'الكل',
    noData: 'لا يوجد سجل معلن كافٍ لصافي قيمة الأصول لهذه الفترة',
    loading: 'جارٍ تحميل سجل صافي قيمة الأصول…',
    loadingSub: 'يتم جلب السلسلة الكاملة المحفوظة لهذا الصندوق.',
    error: 'الرسم البياني غير متاح حاليًا.',
    errorSub: 'تعذّر تحميل سجل صافي قيمة الأصول. يُرجى المحاولة بعد قليل.',
    empty: 'لا يوجد سجل كافٍ لعرض الرسم البياني بعد.',
    emptySub: 'يظهر هذا الرسم تلقائيًا بمجرد حفظ سجل كافٍ لصافي قيمة الأصول.',
    gapNotice: (n: number, longest: number) =>
        n === 1
            ? `ينقطع الخط حيث لم يُعلن عن صافي قيمة الأصول — فجوة مدتها ${longest} يومًا. لم يُقدَّر أي رقم عبرها.`
            : `ينقطع الخط في ${n} مواضع لم يُعلن فيها عن صافي قيمة الأصول، أطولها ${longest} يومًا. لم يُقدَّر أي رقم عبرها.`,
};

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
    lang = 'en',
}: {
    fundId: string | number;
    currency?: string;
    lang?: 'en' | 'ar';
}) {
    const dateLocale = lang === 'ar' ? 'ar-EG' : 'en-GB';
    // Chart chrome was hardcoded English even on /ar pages despite receiving `lang`.
    const L = lang === 'ar' ? AR : EN;
    const wrapRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesRef = useRef<any>(null);
    // Extra series, one per contiguous run after the primary. A gap is rendered by
    // there being no series across it — structural, not a library-behaviour bet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extraSeriesRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeSeriesRef = useRef<(() => any) | null>(null);
    // The currently-drawn (range-filtered) series — read by the hover overlay so
    // cursor→index resolution always matches what's on screen.
    const viewRef = useRef<Point[]>([]);

    const [all, setAll] = useState<Point[] | null>(null);
    const [range, setRange] = useState<Range>('YTD');
    const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

    // Which ranges this fund's history can actually support. A button for a window
    // holding fewer than two observations is disabled rather than lying.
    const supported = useMemo(() => {
        const ok = new Set<Range>();
        if (!all) return ok;
        for (const r of RANGES) {
            const c = rangeCutoff(r);
            const n = c === null ? all.length : all.filter((p) => Date.parse(`${p.time}T00:00:00Z`) >= c).length;
            if (n >= MIN_POINTS_TO_DRAW) ok.add(r);
        }
        return ok;
    }, [all]);

    // Holes worth telling the reader about, within the window on screen.
    const visibleGaps = useMemo(() => {
        if (!all) return [];
        const c = rangeCutoff(range);
        const win = c === null ? all : all.filter((p) => Date.parse(`${p.time}T00:00:00Z`) >= c);
        return win.length >= MIN_POINTS_TO_DRAW ? findGaps(win as NavPoint[]) : [];
    }, [all, range]);

    // If the remembered range is not supported by this fund, fall back to the
    // widest one that is — and reflect that in the buttons, not just the canvas.
    useEffect(() => {
        if (!all || supported.size === 0 || supported.has(range)) return;
        const fallback = ([...RANGES].reverse().find((r) => supported.has(r)) ?? 'ALL') as Range;
        setRange(fallback);
    }, [all, supported, range]);

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

            // A range the data cannot support is DISABLED in the UI, never silently
            // swapped for a different window. The old code fell back to the entire
            // series here while leaving the button visually active — so "1M" could
            // render twenty years of history under a one-month label.
            if (filtered.length < MIN_POINTS_TO_DRAW) return;

            viewRef.current = filtered;

            // Drop any segment series from the previous range before redrawing.
            for (const s of extraSeriesRef.current) {
                try { chart.removeSeries(s); } catch { /* already gone */ }
            }
            extraSeriesRef.current = [];

            // One series per contiguous run: across a real hole there is simply no
            // series to draw, so nothing can be interpolated. Whitespace still goes
            // to the PRIMARY series so the time scale gives the hole its true width.
            const runs = splitAtGaps(filtered as NavPoint[]);
            let spaced = withGapBreaks(filtered as NavPoint[]) as { time: string; value?: number }[];

            // Pad back to the window's start when the fund has no data that early.
            // setVisibleRange REFUSES a range extending beyond the series (it throws,
            // and the catch below then falls back to fitContent) — which is how a
            // fund holding five weeks of history still filled a chart labelled "3Y".
            // A leading whitespace point at the cutoff makes the requested window
            // real to the time scale, so the emptiness renders as emptiness.
            if (cutoff !== null) {
                const cutIso = new Date(cutoff).toISOString().slice(0, 10);
                if (cutIso < spaced[0].time) spaced = [{ time: cutIso }, ...spaced];
            }

            if (runs.length <= 1) {
                series.setData(spaced);
            } else {
                // Primary carries run 0 plus the whitespace that spans every hole,
                // so the axis keeps calendar-honest spacing end to end.
                const holeSlots = spaced.filter((p) => p.value === undefined);
                const head = [...runs[0], ...holeSlots]
                    .filter((p, i, arr) => i === 0 || p.time !== arr[i - 1].time)
                    .sort((a, b) => (a.time < b.time ? -1 : 1));
                series.setData(head as { time: string; value?: number }[]);
                for (const run of runs.slice(1)) {
                    const extra = makeSeriesRef.current?.();
                    if (!extra) break;
                    extra.setData(run);
                    extraSeriesRef.current.push(extra);
                }
            }

            // Pin the axis to the REQUESTED window, not to the data's own extent.
            // fitContent() rescaled to [first drawn point, last drawn point], which is
            // why six weeks of history filled a chart labelled "3Y" and looked normal.
            const lastIso = filtered[filtered.length - 1].time;
            if (cutoff === null) {
                chart.timeScale().fitContent();
            } else {
                try {
                    chart.timeScale().setVisibleRange({
                        from: new Date(cutoff).toISOString().slice(0, 10),
                        to: lastIso,
                    } as never);
                } catch {
                    chart.timeScale().fitContent();
                }
            }
        },
        [all]
    );

    // Build the chart once history is available; tear down on unmount.
    useEffect(() => {
        if (!all || all.length < 2 || !wrapRef.current) return;
        let cancelled = false;
        let resizeObserver: ResizeObserver | undefined;
        let detachOverlay: (() => void) | undefined;

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
                    // No right whitespace gutter: the latest NAV sits flush at the
                    // plot's right edge and stays hoverable (the overlay resolves
                    // the edge to the last point regardless).
                    rightOffset: 0,
                    // Keep the pinned range stable when the card reflows.
                    lockVisibleTimeRangeOnResize: true,
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

            const seriesOptions = {
                lineColor: '#14B8A6',
                topColor: 'rgba(20, 184, 166, 0.24)',
                bottomColor: 'rgba(20, 184, 166, 0.02)',
                lineWidth: 3,
                priceLineVisible: true,
                priceLineColor: 'rgba(20, 184, 166, 0.5)',
                priceLineStyle: 2,
                lastValueVisible: true,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 5,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            } as const;
            const series = chart.addSeries(LWC.AreaSeries, seriesOptions);
            // Segment series share the styling but must not each stamp their own
            // price line / last-value label, or the chart grows duplicate markers.
            makeSeriesRef.current = () =>
                chart.addSeries(LWC.AreaSeries, {
                    ...seriesOptions,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

            chartRef.current = chart;
            seriesRef.current = series;
            applyRange(range);

            // Force the internal coordinate space to match the rendered canvas.
            // A plain applyOptions({width}) with an UNCHANGED width is a no-op, so
            // once the 2-column layout settles the time scale can stay desynced
            // from the pane — which strands the newest points off the visible
            // canvas (only reachable by hovering PAST the plot frame). Toggling the
            // width by 1px forces a real relayout, exactly like the card charts.
            const syncWidth = () => {
                const c = chartRef.current;
                if (!c || !host) return;
                const w = host.clientWidth;
                try {
                    if (w > 1) {
                        c.applyOptions({ width: w - 1 });
                        c.applyOptions({ width: w });
                    }
                    c.timeScale().fitContent();
                } catch {
                    /* torn down */
                }
            };
            syncWidth();
            requestAnimationFrame(syncWidth);
            window.setTimeout(syncWidth, 200);

            // ── Robust nearest-point hover — the overlay owns hit-testing ──────
            const overlay = overlayRef.current;
            const tip = tipRef.current;
            if (overlay) {
                const fmtDate = (iso: string) =>
                    new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                    });

                // Resolve the nearest real data point for a viewport clientX.
                //
                // We map the cursor using the ACTUAL drawn positions of the first and
                // last points (timeToCoordinate), NOT coordinateToLogical. Rationale:
                // timeToCoordinate is always consistent with the rendered line, whereas
                // coordinateToLogical can drift into its own coordinate space after the
                // grid settles — which is exactly what pushed the latest point's
                // hit-target ~30–100px past the visible plot edge. With uniform
                // (index-based) bar spacing the map is linear, so this is exact and the
                // right edge always resolves to the latest NAV, inside the plot.
                const resolve = (clientX: number): { pt: Point; idx: number; xAt: (i: number) => number | null } | null => {
                    const view = viewRef.current;
                    if (!view.length) return null;
                    const paneCanvas = host.querySelector('canvas') as HTMLCanvasElement | null;
                    const rect = (paneCanvas ?? host).getBoundingClientRect();
                    // Convert the cursor from on-screen (visual) px to the chart's
                    // internal CSS px. A CSS `zoom` on an ancestor (the desktop
                    // zoom-out) scales getBoundingClientRect but NOT the width
                    // lightweight-charts draws into — so timeToCoordinate returns
                    // UNSCALED px while the raw cursor is SCALED. Without this the
                    // last ~10% of the plot maps past the visible edge (the latest
                    // NAV becomes reachable only by hovering outside the frame).
                    const cssW = paneCanvas
                        ? parseFloat(paneCanvas.style.width) || paneCanvas.offsetWidth || rect.width
                        : rect.width;
                    const scale = rect.width > 0 ? cssW / rect.width : 1;
                    const x = (clientX - rect.left) * scale;
                    const n = view.length;
                    const ts = chart.timeScale();
                    const xAt = (i: number) => ts.timeToCoordinate(view[i].time) as number | null;
                    const xFirst = xAt(0);
                    const xLast = xAt(n - 1);
                    let idx: number;
                    if (n > 1 && xFirst != null && xLast != null && xLast > xFirst) {
                        idx = Math.round(((x - xFirst) / (xLast - xFirst)) * (n - 1));
                    } else {
                        idx = n - 1;
                    }
                    if (idx < 0) idx = 0;
                    if (idx > n - 1) idx = n - 1;
                    return { pt: view[idx], idx, xAt };
                };

                const showAt = (clientX: number) => {
                    if (!tip) return;
                    const res = resolve(clientX);
                    if (!res || !Number.isFinite(Number(res.pt.value))) {
                        hide();
                        return;
                    }
                    const { pt, idx, xAt } = res;
                    // Crosshair marker + tooltip both anchor on the point's drawn x, so
                    // they stay glued to each other and to the rendered line.
                    try {
                        // setCrosshairPosition lives on the chart, not the series.
                        chart.setCrosshairPosition(Number(pt.value), pt.time, series);
                    } catch {
                        /* chart torn down mid-move */
                    }
                    const px = xAt(idx);
                    const py = series.priceToCoordinate(Number(pt.value));
                    const dEl = tip.querySelector('[data-d]');
                    const vEl = tip.querySelector('[data-v]');
                    if (dEl) dEl.textContent = fmtDate(pt.time);
                    if (vEl) vEl.textContent = `${currency} ${Number(pt.value).toFixed(4)}`;
                    const w = host.clientWidth;
                    const left = px == null ? clientX : px;
                    // Anchor tooltip on the resolved point (never the raw cursor),
                    // clamped inside the plot so it can't overflow the card.
                    tip.style.left = `${Math.min(Math.max(left, 78), Math.max(w - 78, 78))}px`;
                    tip.style.top = `${Math.max((py == null ? 24 : py) - 12, 6)}px`;
                    tip.classList.add('visible');
                };

                const hide = () => {
                    try {
                        chart.clearCrosshairPosition();
                    } catch {
                        /* already disposed */
                    }
                    tip?.classList.remove('visible');
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onMove = (e: any) => showAt(e.clientX);
                overlay.addEventListener('pointermove', onMove, { passive: true });
                overlay.addEventListener('mousemove', onMove, { passive: true });
                overlay.addEventListener('pointerleave', hide, { passive: true });
                overlay.addEventListener('mouseleave', hide, { passive: true });
                overlay.addEventListener('touchend', hide, { passive: true });
                detachOverlay = () => {
                    overlay.removeEventListener('pointermove', onMove);
                    overlay.removeEventListener('mousemove', onMove);
                    overlay.removeEventListener('pointerleave', hide);
                    overlay.removeEventListener('mouseleave', hide);
                    overlay.removeEventListener('touchend', hide);
                };
            }

            resizeObserver = new ResizeObserver(() => {
                // Re-sync with the 1px toggle so a same-width reflow still relayouts.
                syncWidth();
            });
            resizeObserver.observe(host);
        })();

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            detachOverlay?.();
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch {
                    /* already disposed */
                }
            }
            chartRef.current = null;
            // chart.remove() above disposes every series with it; just drop the refs.
            extraSeriesRef.current = [];
            makeSeriesRef.current = null;
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
                {RANGES.map((r) => {
                    const usable = supported.has(r);
                    return (
                        <button
                            key={r}
                            type="button"
                            onClick={() => usable && setRange(r)}
                            disabled={!usable}
                            title={usable ? undefined : L.noData}
                            className={`range-btn rounded-full px-3.5 py-2 text-sm font-semibold ${range === r ? 'active' : ''} ${usable ? '' : 'cursor-not-allowed opacity-40'}`}
                            aria-pressed={range === r}
                            aria-disabled={!usable}
                        >
                            {r === 'ALL' ? L.all : r}
                        </button>
                    );
                })}
            </div>
            {visibleGaps.length > 0 && (
                <p className="mt-3 text-[0.78rem] leading-relaxed text-muted">
                    <span
                        aria-hidden="true"
                        className="mr-2 inline-block h-[2px] w-4 translate-y-[-3px] border-t-2 border-dashed border-current align-middle"
                    />
                    {L.gapNotice(visibleGaps.length, visibleGaps.reduce((n, g) => (g.days > n ? g.days : n), 0))}
                </p>
            )}

            <div className="relative mt-4">
                <div
                    ref={wrapRef}
                    dir="ltr"
                    className="w-full overflow-hidden rounded-[1.4rem] border border-border bg-surface"
                    style={{ minHeight: '340px', direction: 'ltr' }}
                />
                {status === 'ready' && (
                    <div
                        ref={overlayRef}
                        className="absolute inset-0 rounded-[1.4rem]"
                        style={{ cursor: 'crosshair', zIndex: 4, touchAction: 'pan-y' }}
                        aria-hidden="true"
                    />
                )}
                {status !== 'ready' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[1.4rem] border border-dashed border-border bg-surface text-center">
                        <div className="px-6">
                            <div className="text-base font-display font-bold text-main">
                                {status === 'loading' ? L.loading : status === 'error' ? L.error : L.empty}
                            </div>
                            <p className="mt-2 text-sm text-muted">
                                {status === 'loading' ? L.loadingSub : status === 'error' ? L.errorSub : L.emptySub}
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
