'use client';

/**
 * Wealth Calculators — page body. Hero header + segmented switch between the
 * Retirement Planner wizard and the Investment Growth simulator. Both tools
 * stay mounted (hidden panel) so switching never loses user input. Restrained
 * motion: CSS transitions only.
 */

import { useState } from 'react';
import type { CalcLabels, Lang } from './calculators-i18n';
import RetirementPlanner from './RetirementPlanner';
import InvestmentCalculator from './InvestmentCalculator';

const CALC_CSS = `
.starta-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:999px;background:var(--c-border);outline:none;cursor:pointer}
.starta-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:#14B8A6;border:3px solid var(--c-surface);box-shadow:0 0 0 1px rgba(20,184,166,.55),0 4px 10px rgba(20,184,166,.35);cursor:pointer;transition:transform .15s ease}
.starta-range::-webkit-slider-thumb:hover{transform:scale(1.15)}
.starta-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#14B8A6;border:3px solid var(--c-surface);box-shadow:0 0 0 1px rgba(20,184,166,.55),0 4px 10px rgba(20,184,166,.35);cursor:pointer;transition:transform .15s ease}
.starta-range::-moz-range-thumb:hover{transform:scale(1.15)}
.starta-range:focus-visible{box-shadow:0 0 0 3px rgba(20,184,166,.35)}
/* ── STRIP THE GLOBAL INPUT CHROME INSIDE A .starta-numfield ──────────────────
   app/globals.css styles every text input with
   input:not([type="checkbox"]):not([type="radio"]) — 3rem height, 1px border,
   card background, and a BLUE focus border + box-shadow. That selector scores
   (0,2,1), so a Tailwind "border-0" / "bg-transparent" (0,1,0) on the input
   loses to it: the field drew a second rounded rectangle inside the wrapper,
   and in dark mode the input painted a light card-coloured block inside a dark
   card. The field's chrome now belongs to the WRAPPER (border, radius,
   background, teal focus ring), so the input is stripped back to bare text.
   One extra :not() takes this to (0,4,1) so it wins on specificity — over the
   ".dark" variant too — rather than on source order. "height" is left alone:
   the 3rem is the site's input rhythm and the wrapper sizes to it. */
.starta-numfield input:not([type=checkbox]):not([type=radio]):not([readonly]){border:0;border-radius:0;background-color:transparent;box-shadow:none}
.starta-numfield input:not([type=checkbox]):not([type=radio]):not([readonly]):focus{border:0;box-shadow:none;outline:none}
/* type=number spin buttons render at the input's LTR right edge. Since the
   value is right-aligned on the Arabic page, they landed on top of it on hover;
   in English they crowded the unit that now sits inline beside the field.
   Suppressed — inputMode="decimal" still gives mobile a numeric keypad and the
   step attribute still drives arrow-key increments. */
.starta-numfield input::-webkit-outer-spin-button,
.starta-numfield input::-webkit-inner-spin-button{-webkit-appearance:none;appearance:none;margin:0}
.starta-numfield input[type=number]{-moz-appearance:textfield;appearance:textfield}
@keyframes calcFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.calc-fade{animation:calcFade .3s ease}
@media (prefers-reduced-motion: reduce){.calc-fade{animation:none}}
`;

type Tool = 'retirement' | 'investment';

export default function CalculatorsClient({ labels, lang }: { labels: CalcLabels; lang: Lang }) {
    // Investment Growth is the default (owner call): it answers the question most
    // visitors arrive with — "what does this become if I keep paying in" — in one
    // screen, where the retirement planner is a five-step commitment.
    const [tool, setTool] = useState<Tool>('investment');

    return (
        <div>
            <style dangerouslySetInnerHTML={{ __html: CALC_CSS }} />

            {/* hero */}
            <header className="mb-10 text-center">
                {/* One title per section — DESIGN_SYSTEM.md bans the small accent
                    eyebrow above a heading site-wide. "STARTA TOOLS" used to sit
                    here in teal; the page keeps a single dark title. */}
                <h1 className="text-3xl font-extrabold tracking-tight text-main sm:text-4xl">
                    {labels.hero.title}
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                    {labels.hero.subtitle}
                </p>

                {/* segmented switch */}
                <div
                    role="tablist"
                    aria-label={labels.hero.title}
                    className="mx-auto mt-8 flex w-full max-w-xl gap-1.5 rounded-2xl border border-border bg-panel/40 p-1.5"
                >
                    {/* Order matters: the first tab is the one the reader meets first
                        (rightmost in Arabic), so the default tool leads. */}
                    {(
                        [
                            { key: 'investment' as const, title: labels.tabs.investment, sub: labels.tabs.investmentSub },
                            { key: 'retirement' as const, title: labels.tabs.retirement, sub: labels.tabs.retirementSub },
                        ] satisfies Array<{ key: Tool; title: string; sub: string }>
                    ).map(({ key, title, sub }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`calc-tab-${key}`}
                            aria-selected={tool === key}
                            aria-controls={`calc-panel-${key}`}
                            onClick={() => setTool(key)}
                            className={`flex-1 rounded-xl px-4 py-3 text-center transition-all duration-200 ${
                                tool === key
                                    ? 'bg-starta-teal text-white shadow-lg shadow-starta-teal/25'
                                    : 'text-muted hover:text-main'
                            }`}
                        >
                            <span className="block text-sm font-bold">{title}</span>
                            <span className={`mt-0.5 block text-[11px] ${tool === key ? 'text-white/80' : 'opacity-80'}`}>
                                {sub}
                            </span>
                        </button>
                    ))}
                </div>
            </header>

            {/* panels — both stay mounted so inputs survive switching */}
            <div
                id="calc-panel-retirement"
                role="tabpanel"
                aria-labelledby="calc-tab-retirement"
                hidden={tool !== 'retirement'}
            >
                <RetirementPlanner L={labels} />
            </div>
            <div
                id="calc-panel-investment"
                role="tabpanel"
                aria-labelledby="calc-tab-investment"
                hidden={tool !== 'investment'}
            >
                <InvestmentCalculator L={labels} lang={lang} />
            </div>
        </div>
    );
}
