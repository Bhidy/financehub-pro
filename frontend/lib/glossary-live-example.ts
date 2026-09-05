import { getAllFundsRanked, getAllTickers, getEgx30Index, getMovers, getDividendCalendar, type Ticker } from '@/lib/public-data';
import { categoryOfFund } from '@/content/fund-categories';
import { fundPath, symbolPath, symbolPathAr } from '@/lib/seo';
import { ltrNum } from '@/lib/bidi';

/**
 * A LIVE EGYPTIAN EXAMPLE FOR A GLOSSARY TERM (2026-09-05).
 *
 * The Arabic definitional queries ("ما هو صافي قيمة الأصول") are won by
 * machine-translated Investopedia, TradingView and Investor.gov pages: a
 * definition, a formula, no Egyptian example. Our term pages had the
 * definition and a written example. This adds the one thing none of them
 * can: today's number from the Egyptian market, linked to the page that
 * carries it — the same data the rest of the site shows, never typed.
 */
export type LiveExample = { text: string; href: string; asOf: string | null };
type Lang = 'en' | 'ar';

const pct = (v: number, lang: Lang) => {
    const s = `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    return lang === 'ar' ? ltrNum(s) : s;
};
const n2 = (v: number, lang: Lang) => (lang === 'ar' ? ltrNum(v.toFixed(2)) : v.toFixed(2));
const bn = (v: number, lang: Lang) => (lang === 'ar' ? ltrNum((v / 1e9).toFixed(1)) : (v / 1e9).toFixed(1));
const tName = (t: Ticker, lang: Lang) => (lang === 'ar' ? t.name_ar || t.name_en || t.symbol : t.name_en || t.symbol);
const tHref = (t: Ticker, lang: Lang) => (lang === 'ar' ? symbolPathAr(t.symbol, t.name_ar) : symbolPath(t.symbol));
const fName = (f: Record<string, unknown>, lang: Lang) =>
    String((lang === 'ar' ? f.fund_name || f.fund_name_en : f.fund_name_en || f.fund_name) || '');
const isoDay = (v: unknown): string | null => {
    const d = v instanceof Date ? v : v ? new Date(String(v)) : null;
    return d && Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
};
const humanDay = (iso: string | null, lang: Lang) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

async function fundExample(pick: (rows: Array<Record<string, unknown>>) => Record<string, unknown> | undefined, lang: Lang): Promise<LiveExample | null> {
    const rows = (await getAllFundsRanked()).filter((f) => typeof f.return_1y === 'number' && typeof f.latest_nav === 'number');
    const f = pick(rows);
    if (!f) return null;
    const nav = f.latest_nav as number;
    const r = f.return_1y as number;
    const asOf = isoDay(f.last_nav_date);
    const name = fName(f, lang);
    return {
        text:
            lang === 'ar'
                ? `صافي قيمة أصول «${name}» اليوم ${ltrNum(nav.toFixed(2))} جنيه${asOf ? ` (بتاريخ ${humanDay(asOf, lang)})` : ''}، بعائد ${pct(r, lang)} خلال آخر 12 شهرًا.`
                : `${name}'s NAV today is EGP ${nav.toFixed(2)}${asOf ? ` (as of ${humanDay(asOf, lang)})` : ''}, with a ${pct(r, lang)} return over the last 12 months.`,
        href: fundPath(Number(f.fund_id), String(f.fund_name_en || ''), String(f.fund_name || ''), lang),
        asOf,
    };
}

async function tickerExample(pick: (ts: Ticker[]) => Ticker | undefined, text: (t: Ticker) => string, lang: Lang): Promise<LiveExample | null> {
    const ts = await getAllTickers();
    const t = pick(ts);
    if (!t) return null;
    return { text: text(t), href: tHref(t, lang), asOf: isoDay(t.last_updated) };
}

export async function glossaryLiveExample(slug: string, lang: Lang): Promise<LiveExample | null> {
    const ar = lang === 'ar';
    try {
        switch (slug) {
            case 'nav':
            case 'mutual-fund':
                return fundExample((rows) => rows[0], lang);
            case 'money-market-fund':
                return fundExample((rows) => rows.find((f) => categoryOfFund(f)?.key === 'money-market'), lang);
            case 'shariah-compliant':
                return fundExample((rows) => rows.find((f) => categoryOfFund(f)?.key === 'shariah' || f.is_shariah === true), lang);
            case 'market-cap':
                return tickerExample(
                    (ts) => [...ts].filter((t) => typeof t.market_cap === 'number' && t.market_cap > 0).sort((a, b) => (b.market_cap as number) - (a.market_cap as number))[0],
                    (t) => (ar ? `أكبر شركة مقيدة في البورصة المصرية بالقيمة السوقية اليوم هي ${tName(t, lang)} (${t.symbol}) بقيمة ${bn(t.market_cap as number, lang)} مليار جنيه.` : `The largest EGX-listed company by market capitalisation today is ${tName(t, lang)} (${t.symbol}) at EGP ${bn(t.market_cap as number, lang)} billion.`),
                    lang
                );
            case 'pe-ratio':
                return tickerExample(
                    (ts) => [...ts].filter((t) => typeof t.pe_ratio === 'number' && t.pe_ratio > 0 && typeof t.market_cap === 'number').sort((a, b) => (b.market_cap as number) - (a.market_cap as number))[0],
                    (t) => (ar ? `مضاعف ربحية سهم ${tName(t, lang)} (${t.symbol}) اليوم ${n2(t.pe_ratio as number, lang)} مرة عند سعر ${n2(t.last_price as number, lang)} جنيه.` : `${tName(t, lang)} (${t.symbol}) trades at a P/E of ${n2(t.pe_ratio as number, lang)} today, at EGP ${n2(t.last_price as number, lang)} a share.`),
                    lang
                );
            case 'pb-ratio':
                return tickerExample(
                    (ts) => [...ts].filter((t) => typeof t.pb_ratio === 'number' && t.pb_ratio > 0 && typeof t.market_cap === 'number').sort((a, b) => (b.market_cap as number) - (a.market_cap as number))[0],
                    (t) => (ar ? `مضاعف القيمة الدفترية لسهم ${tName(t, lang)} (${t.symbol}) اليوم ${n2(t.pb_ratio as number, lang)} مرة.` : `${tName(t, lang)} (${t.symbol}) trades at ${n2(t.pb_ratio as number, lang)} times book value today.`),
                    lang
                );
            case 'dividend-yield':
                return tickerExample(
                    (ts) => [...ts].filter((t) => typeof t.dividend_yield === 'number' && t.dividend_yield > 0 && typeof t.market_cap === 'number').sort((a, b) => (b.market_cap as number) - (a.market_cap as number))[0],
                    (t) => (ar ? `عائد التوزيعات لسهم ${tName(t, lang)} (${t.symbol}) اليوم ${pct(t.dividend_yield as number, lang)} عند سعر ${n2(t.last_price as number, lang)} جنيه.` : `${tName(t, lang)} (${t.symbol}) yields ${pct(t.dividend_yield as number, lang)} in dividends today at EGP ${n2(t.last_price as number, lang)} a share.`),
                    lang
                );
            case 'stock':
            case 'liquidity': {
                const m = await getMovers(5);
                const t = m.active[0];
                if (!t) return null;
                return {
                    text: ar
                        ? `الأكثر نشاطًا في البورصة المصرية اليوم: ${tName(t, lang)} (${t.symbol}) بحجم تداول ${ltrNum(Number(t.volume || 0).toLocaleString('en-EG'))} سهم${typeof t.change_percent === 'number' ? ` وتغير ${pct(t.change_percent, lang)}` : ''}.`
                        : `The most actively traded EGX stock today is ${tName(t, lang)} (${t.symbol}), ${Number(t.volume || 0).toLocaleString('en-EG')} shares${typeof t.change_percent === 'number' ? ` and ${pct(t.change_percent, lang)}` : ''}.`,
                    href: tHref(t, lang),
                    asOf: isoDay(t.last_updated),
                };
            }
            case 'volatility':
            case 'bull-market':
            case 'bear-market':
            case 'egx-30':
            case 'stock-market': {
                const q = await getEgx30Index();
                if (!q || q.value === null) return null;
                return {
                    text: ar
                        ? `مؤشر EGX 30 اليوم عند ${ltrNum(q.value.toLocaleString('en-EG', { maximumFractionDigits: 2 }))} نقطة${typeof q.changePercent === 'number' ? ` بتغير ${pct(q.changePercent, lang)}` : ''}${typeof q.ytdPct === 'number' ? `، و${pct(q.ytdPct, lang)} منذ بداية العام` : ''}.`
                        : `The EGX 30 index stands at ${q.value.toLocaleString('en-EG', { maximumFractionDigits: 2 })} today${typeof q.changePercent === 'number' ? ` (${pct(q.changePercent, lang)})` : ''}${typeof q.ytdPct === 'number' ? `, ${pct(q.ytdPct, lang)} year to date` : ''}.`,
                    href: ar ? '/ar/markets/egx30' : '/markets/egx30',
                    asOf: isoDay(q.timestamp),
                };
            }
            case 'dividend':
            case 'ex-dividend-date': {
                const cal = await getDividendCalendar();
                const d = cal.upcoming[0];
                if (!d) return null;
                const name = String((ar ? d.name_ar || d.name_en : d.name_en || d.name_ar) || d.symbol);
                const amount = Number(d.amount_upcoming);
                const ex = isoDay(d.ex_date_upcoming);
                return {
                    text: ar
                        ? `أقرب توزيع نقدي في البورصة المصرية: ${name} (${String(d.symbol)}) بقيمة ${ltrNum(amount.toFixed(2))} جنيه للسهم${ex ? `، وتاريخ الاستحقاق ${humanDay(ex, lang)}` : ''}.`
                        : `The next cash dividend on the EGX: ${name} (${String(d.symbol)}), EGP ${amount.toFixed(2)} a share${ex ? `, ex-dividend on ${humanDay(ex, lang)}` : ''}.`,
                    href: ar ? '/ar/markets/dividend-calendar' : '/markets/dividend-calendar',
                    asOf: ex,
                };
            }
            default:
                return null;
        }
    } catch (error) {
        console.error('[glossary] live example failed:', slug, (error as Error).message);
        return null;
    }
}
