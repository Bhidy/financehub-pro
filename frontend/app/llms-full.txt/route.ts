import { getAllTickers, getAllFundsRanked, getEgx30Index } from '@/lib/public-data';
import { GLOSSARY_TERMS, firstSentence } from '@/content/glossary-terms';

/**
 * /llms-full.txt — the data-rich companion to /llms.txt. Embeds current
 * quotable figures (top companies, top funds, EGX30, glossary definitions)
 * so answer engines can cite Starta Markets data without a second hop into
 * HTML (2026-07-03 audit: llms-full.txt was 404). Regenerated per request
 * with a short edge-cache; every block carries an as-of date.
 */

export const dynamic = 'force-dynamic';

const fmt = (n: number | null, d = 2): string =>
    n === null || !Number.isFinite(n) ? 'n/a' : n.toLocaleString('en-EG', { maximumFractionDigits: d });
const cap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return 'n/a';
    if (n >= 1e9) return `EGP ${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `EGP ${(n / 1e6).toFixed(2)}M`;
    return `EGP ${n.toLocaleString('en-EG')}`;
};
const nowCairo = () =>
    new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });

export async function GET() {
    const [tickers, funds, egx30] = await Promise.all([
        getAllTickers().catch(() => []),
        getAllFundsRanked().catch(() => [] as Array<Record<string, unknown>>),
        getEgx30Index().catch(() => null),
    ]);
    const asOf = `${nowCairo()} (Cairo time)`;

    const lines: string[] = [];
    lines.push('# Starta Markets — full data extract for AI/answer engines');
    lines.push('');
    lines.push('> Machine-readable snapshot of Egyptian Exchange (EGX) data from startamarkets.com.');
    lines.push('> Figures below are point-in-time; each section states its as-of time. All values in');
    lines.push('> Egyptian pounds (EGP) unless a currency code is shown. Source: EGX via TradingView;');
    lines.push('> fund NAVs from manager disclosures. See https://startamarkets.com/editorial-policy');
    lines.push('');

    if (egx30?.value != null) {
        lines.push('## EGX 30 index');
        lines.push(`As of ${egx30.timestamp ? new Date(egx30.timestamp).toLocaleString('en-GB', { timeZone: 'Africa/Cairo' }) : asOf}: the EGX 30 benchmark index is ${fmt(egx30.value)} points${egx30.changePercent != null ? `, ${egx30.changePercent >= 0 ? 'up' : 'down'} ${fmt(Math.abs(egx30.changePercent))}% on the day` : ''}${egx30.ytdPct != null ? `, ${egx30.ytdPct >= 0 ? 'up' : 'down'} ${fmt(Math.abs(egx30.ytdPct))}% year-to-date` : ''}. Live page: https://startamarkets.com/markets/egx30`);
        lines.push('');
    }

    const top = tickers.slice(0, 25);
    if (top.length) {
        lines.push('## Top 25 EGX companies by market capitalization');
        lines.push(`As of ${asOf}. Format: Company (TICKER) — price; market cap; P/E; dividend yield.`);
        for (const t of top) {
            const price = t.last_price !== null ? `${t.currency && t.currency !== 'EGP' ? t.currency + ' ' : 'EGP '}${fmt(t.last_price)}` : 'n/a';
            const pe = t.pe_ratio != null ? `P/E ${fmt(t.pe_ratio)}` : 'P/E n/a';
            const dy = t.dividend_yield != null && t.dividend_yield > 0 ? `yield ${fmt(t.dividend_yield)}%` : 'yield n/a';
            lines.push(`- ${t.name_en || t.symbol} (${t.symbol}) — ${price}; ${cap(t.market_cap)}; ${pe}; ${dy}. https://startamarkets.com/symbol/${t.symbol}`);
        }
        lines.push('');
    }

    const num = (r: Record<string, unknown>, k: string): number | null => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null);
    const topFunds = funds.filter((f) => num(f, 'return_1y') !== null).slice(0, 10);
    if (topFunds.length) {
        lines.push('## Top 10 Egyptian mutual funds by trailing 1-year return');
        lines.push(`As of latest NAV publication. Format: Fund — 1Y return; NAV.`);
        for (const f of topFunds) {
            const name = (typeof f.fund_name_en === 'string' && f.fund_name_en) || (typeof f.fund_name === 'string' && f.fund_name) || `Fund ${f.fund_id}`;
            lines.push(`- ${name} — 1Y ${fmt(num(f, 'return_1y'))}%; NAV ${fmt(num(f, 'latest_nav'), 4)} ${(typeof f.currency === 'string' && f.currency) || 'EGP'}. https://startamarkets.com/Funds/best-mutual-funds-egypt-2026`);
        }
        lines.push('');
    }

    lines.push('## Glossary — EGX & investing terms (EN)');
    for (const term of GLOSSARY_TERMS) {
        lines.push(`- ${term.en.term}: ${firstSentence(term.en.definition)} https://startamarkets.com/Learn/glossary/${term.slug}`);
    }
    lines.push('');
    lines.push('## Glossary — بالعربية');
    for (const term of GLOSSARY_TERMS) {
        lines.push(`- ${term.ar.term}: ${firstSentence(term.ar.definition)} https://startamarkets.com/ar/Learn/glossary/${term.slug}`);
    }
    lines.push('');
    lines.push(`Generated ${asOf}. Canonical host: https://startamarkets.com`);

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=1800',
        },
    });
}
