'use client';

/**
 * Sidebar "key facts" widget — folds the fund's CAGR highlight and the full fund-details
 * grid into one compact card sized for the profile sidebar. Ungated + fully in the DOM
 * (SEO-safe). Replaces the old full-width CAGR card + fund-details grid.
 */

import type { FundLabels } from './fund-i18n';
import { interp } from './fund-format';

type LabelValue = { label: string; value: string };

export default function FundKeyFacts({
    facts, cagr, t,
}: {
    facts: LabelValue[];
    cagr: { value: string; years: number | null; sinceInception: string | null } | null;
    t: FundLabels;
}) {
    const ax = t.ax;
    // The card always renders with the same structure: CAGR highlight (an honest
    // '—' + note when history is too short) followed by the fixed fact rows.
    return (
        <section className="glass-premium keyfacts rounded-[1.6rem] p-5" aria-label={t.fundDetails}>
            <h3 className="text-base font-display font-bold tracking-[-0.02em] text-main">{t.fundDetails}</h3>

            <div className="keyfacts-cagr mt-3">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-muted">{ax.cagrTitle}</div>
                {cagr ? (
                    <>
                        <div className="keyfacts-cagr-value">{cagr.value}<span>/yr</span></div>
                        <div className="keyfacts-cagr-meta">
                            {cagr.sinceInception && <span>{ax.cagrSinceInception}: <b>{cagr.sinceInception}</b></span>}
                            {cagr.years != null && <span>{interp(ax.cagrOverYears, { v: Math.round(cagr.years) })}</span>}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="keyfacts-cagr-value">—</div>
                        <div className="keyfacts-cagr-meta"><span>{ax.noData}</span></div>
                    </>
                )}
            </div>

            {facts.length > 0 ? (
                <dl className="keyfacts-list mt-4">
                    {facts.map((f) => (
                        <div key={f.label} className="keyfacts-row">
                            <dt>{f.label}</dt>
                            <dd>{f.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="ax-pending mt-4">{t.dataPending}</p>
            )}
        </section>
    );
}
