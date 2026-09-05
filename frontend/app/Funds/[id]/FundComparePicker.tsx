'use client';

/**
 * Fund-comparison picker — opened from the profile "Compare" CTA. Lets the user
 * search and select the fund(s) to compare the current fund against, then routes
 * to the bilingual comparison tool (/Funds/Compare) IN THE CURRENT LANGUAGE.
 *
 * Why this design:
 *   • Fixes two real defects — (1) the old CTA jumped to an EN-only /Funds/vs
 *     page (language flipped for AR users); (2) it auto-picked one peer instead of
 *     letting the user choose. This modal keeps the language (lang param + the
 *     shell's persisted localStorage) and puts the user in control of the shortlist.
 *   • Reuses the existing, proven bilingual comparison view rather than forking a
 *     second implementation.
 * Mounted only while open (fresh state each time). Accessible: role=dialog,
 * focus-managed, Esc + backdrop close, scroll-locked, RTL-safe via CSS logical props.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FundLabels, Lang } from './fund-i18n';
import { signedPct, interp } from './fund-format';

// The comparison tool renders at most 4 funds; the current fund takes one slot.
const MAX_OPPONENTS = 3;

type PickerFund = { id: string; name: string; manager: string; ytd: number | null; nav: number | null; currency: string };

const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

function Icon({ d }: { d: string }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

export default function FundComparePicker({
    onClose,
    currentId,
    currentName,
    lang,
    t,
}: {
    onClose: () => void;
    currentId: string;
    currentName: string;
    lang: Lang;
    t: FundLabels;
}) {
    const cp = t.ax.comparePicker;
    const [funds, setFunds] = useState<PickerFund[] | null>(null);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    // Lazy-load the fund universe once on mount (mounted only while open).
    useEffect(() => {
        let alive = true;
        fetch('/api/v1/funds?market=EGX')
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('funds fetch failed'))))
            .then((rows: Array<Record<string, unknown>>) => {
                if (!alive) return;
                const norm: PickerFund[] = (Array.isArray(rows) ? rows : [])
                    .map((f) => ({
                        id: String(f.fund_id ?? ''),
                        name:
                            (lang === 'ar'
                                ? (f.fund_name as string) || (f.fund_name_en as string)
                                : (f.fund_name_en as string) || (f.fund_name as string)) || '',
                        manager:
                            (lang === 'ar'
                                ? (f.manager_name as string) || (f.manager_name_en as string)
                                : (f.manager_name_en as string) || (f.manager_name as string)) || '',
                        ytd: num(f.returns_ytd ?? f.ytd_return),
                        nav: num(f.latest_nav),
                        currency: (f.currency as string) || 'EGP',
                    }))
                    .filter((f) => f.id && f.name && f.id !== String(currentId));
                norm.sort((a, b) => (b.ytd ?? -Infinity) - (a.ytd ?? -Infinity));
                setFunds(norm);
            })
            .catch(() => {
                if (alive) setError(true);
            });
        return () => {
            alive = false;
        };
    }, [lang, currentId]);

    // Scroll-lock, focus the search, Esc to close; restore on unmount.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 60);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
            window.clearTimeout(focusTimer);
        };
    }, [onClose]);

    const filtered = useMemo(() => {
        if (!funds) return [];
        const q = query.trim().toLowerCase();
        if (!q) return funds;
        return funds.filter((f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q));
    }, [funds, query]);

    const loading = funds === null && !error;
    const atMax = selected.length >= MAX_OPPONENTS;
    const toggle = (id: string) =>
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_OPPONENTS ? s : [...s, id]));

    const go = () => {
        if (!selected.length) return;
        const ids = [String(currentId), ...selected].join(',');
        window.location.href = `${lang === 'ar' ? '/ar' : ''}/Funds/Compare?ids=${encodeURIComponent(ids)}&lang=${lang}`;
    };

    return (
        <div
            className="cmp-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={cp.title}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="cmp-modal">
                <div className="cmp-head">
                    <div className="min-w-0">
                        <h2 className="cmp-title">{cp.title}</h2>
                        <p className="cmp-sub">{interp(cp.hint, { n: MAX_OPPONENTS })}</p>
                    </div>
                    <button type="button" className="cmp-close" aria-label={t.ax.explainClose} onClick={onClose}>
                        <Icon d="M6 6l12 12M18 6L6 18" />
                    </button>
                </div>

                {/* Pinned current fund + selected opponents */}
                <div className="cmp-pins">
                    <span className="cmp-pin cmp-pin-base">
                        <span className="cmp-pin-tag">{cp.thisFund}</span>
                        <span className="cmp-pin-name">{currentName}</span>
                    </span>
                    {selected.map((id) => {
                        const f = funds?.find((x) => x.id === id);
                        if (!f) return null;
                        return (
                            <button key={id} type="button" className="cmp-pin cmp-pin-sel" onClick={() => toggle(id)} aria-label={`${f.name} ✕`}>
                                <span className="cmp-pin-name">{f.name}</span>
                                <Icon d="M6 6l12 12M18 6L6 18" />
                            </button>
                        );
                    })}
                </div>

                <div className="cmp-search">
                    <Icon d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={cp.search}
                        aria-label={cp.search}
                    />
                </div>

                <div className="cmp-list">
                    {loading && <div className="cmp-state">{cp.loading}</div>}
                    {error && <div className="cmp-state">{cp.error}</div>}
                    {!loading && !error && filtered.length === 0 && <div className="cmp-state">{cp.noMatch}</div>}
                    {!error &&
                        filtered.map((f) => {
                            const isSel = selected.includes(f.id);
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={`cmp-row${isSel ? ' selected' : ''}`}
                                    onClick={() => toggle(f.id)}
                                    aria-pressed={isSel}
                                    disabled={!isSel && atMax}
                                >
                                    <span className="cmp-row-main">
                                        <span className="cmp-row-name">{f.name}</span>
                                        {f.manager && <span className="cmp-row-mgr">{f.manager}</span>}
                                    </span>
                                    <span className="cmp-row-stats">
                                        {f.ytd != null && <span className={`cmp-ytd${f.ytd < 0 ? ' neg' : ''}`}>{signedPct(f.ytd)}</span>}
                                        {f.nav != null && (
                                            <span className="cmp-nav">
                                                {f.currency} {f.nav.toFixed(2)}
                                            </span>
                                        )}
                                    </span>
                                    <span className={`cmp-check${isSel ? ' on' : ''}`} aria-hidden="true">
                                        <Icon d={isSel ? 'M5 13l4 4L19 7' : 'M12 5v14M5 12h14'} />
                                    </span>
                                </button>
                            );
                        })}
                </div>

                <div className="cmp-foot">
                    <span className="cmp-count">{selected.length ? interp(cp.selected, { n: selected.length }) : cp.pickPrompt}</span>
                    <button type="button" className="cmp-go" onClick={go} disabled={!selected.length}>
                        {cp.go}
                    </button>
                </div>
            </div>
        </div>
    );
}
