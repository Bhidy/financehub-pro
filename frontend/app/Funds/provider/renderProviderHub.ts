import { notFound } from 'next/navigation';
import { ltrNum } from '@/lib/bidi';
import { getAllFundsRanked } from '@/lib/public-data';
import { renderFundHub } from '@/lib/fund-hub';
import { buildProviders, findProvider, fundBelongsToProvider, providerPath } from '@/content/fund-providers';
import { clampTitle, clampDescription } from '@/lib/seo';

/**
 * FUND PROVIDER HUBS — /Funds/provider/{slug} and /ar/Funds/provider/{arabic}.
 *
 * Egyptians search for funds by the institution that offers them: "صناديق بنك
 * مصر", "أسعار صناديق البنك الأهلي اليوم", "صناديق استثمار CIB". SERP
 * forensics found those queries held by the banks' own marketing pages and by
 * Facebook posts — no comparison platform serves them. The one competitor that
 * built such pages built four, and they are that site's only genuinely
 * server-rendered assets. Meanwhile investing.com's Egypt funds listing
 * returns "There are no results available" and stockanalysis.com has no
 * Egyptian fund coverage at all.
 *
 * The provider set is derived from the fund data on every request, so a newly
 * listed bank gets a page as soon as its funds appear.
 */

// ANSWER-FIRST (2026-09-05). The SERP for "صناديق استثمار بنك مصر" asks "what
// is the best fund at bank X" and "unit prices today"; the intro answers both
// with the hub's own data before the general description.
const introEn = (name: string, n: number, role: string, asOf: string, lead: { name: string; ret: number } | null) =>
    `${name} ${role === 'owner' ? 'offers' : 'manages'} ${n} Egyptian mutual fund${n === 1 ? '' : 's'}${lead ? `; the best-performing over the last 12 months is ${lead.name} at ${lead.ret >= 0 ? '+' : ''}${lead.ret.toFixed(2)}%` : ''}. Unit prices (NAV), trailing returns and management fees come from the manager's official disclosures${asOf ? `, current to ${asOf}` : ''}. Ordering is mechanical by trailing one-year return and is not a recommendation.`;

const introAr = (name: string, n: number, role: string, asOf: string, lead: { name: string; ret: number } | null) =>
    `${role === 'owner' ? 'يطرح' : 'يدير'} ${name} ${n} صندوق استثمار في مصر${lead ? `؛ أفضلها أداءً خلال آخر 12 شهرًا «${lead.name}» بعائد ${ltrNum(`${lead.ret >= 0 ? '+' : ''}${lead.ret.toFixed(2)}%`)}` : ''}. أسعار الوثائق (صافي قيمة الأصول) والعوائد ورسوم الإدارة من الإفصاحات الرسمية${asOf ? ` حتى ${asOf}` : ''}. الترتيب آلي حسب عائد سنة وليس توصية.`;

export async function renderProviderHub(slug: string, lang: 'en' | 'ar'): Promise<Response> {
    const isAr = lang === 'ar';
    let all: Array<Record<string, unknown>> = [];
    try {
        all = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:fund-provider] query failed:', (error as Error).message);
    }
    const providers = buildProviders(all);
    const provider = findProvider(providers, slug);
    if (!provider) notFound();

    const funds = all.filter((f) => fundBelongsToProvider(f, provider));
    if (funds.length === 0) notFound();
    // funds is already ranked by trailing 1-year return (getAllFundsRanked).
    const leadRow = funds.find((f) => typeof f.return_1y === 'number' && Number.isFinite(f.return_1y as number));
    const lead = leadRow
        ? { name: String((isAr ? leadRow.fund_name || leadRow.fund_name_en : leadRow.fund_name_en || leadRow.fund_name) || ''), ret: leadRow.return_1y as number }
        : null;

    const name = isAr ? provider.nameAr : provider.nameEn;
    const asOfMs = funds.reduce<number | null>((mx, f) => {
        const t = f.last_nav_date ? Date.parse(String(f.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    const asOf =
        asOfMs === null
            ? ''
            : new Date(asOfMs).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Titles lead with the query shape people type: the institution, then
    // "funds", then the price intent.
    // The brand suffix rides along only while the whole title fits 60; long
    // institution names ("CI Capital Asset Management") drop it, then the tail.
    const baseTitle = isAr ? `صناديق ${name} — أسعار الوثائق والعوائد اليوم` : `${name} Funds — NAVs, Returns & Fees`;
    const title = clampTitle([
        `${baseTitle} | Starta Markets`,
        baseTitle,
        isAr ? `صناديق ${name} — الأسعار والعوائد` : `${name} Funds — NAVs & Returns`,
        isAr ? `صناديق ${name} — الأسعار` : `${name} Funds — NAVs`,
        isAr ? `صناديق ${name}` : `${name} Funds`,
    ], 60);
    const description = clampDescription(isAr
        ? `أسعار وثائق صناديق ${name} وعوائدها ورسوم الإدارة، محدثة من الإفصاحات الرسمية${asOf ? ` حتى ${asOf}` : ''}.`
        : `Net asset values, trailing returns and management fees for every ${name} mutual fund${asOf ? `, current to ${asOf}` : ''}.`);

    return renderFundHub({
        lang,
        canonical: providerPath(provider, lang),
        altPath: providerPath(provider, isAr ? 'en' : 'ar'),
        title,
        description,
        heading: isAr ? `صناديق ${name}` : `${name} funds`,
        intro: isAr
            ? introAr(name, funds.length, provider.role, asOf, lead)
            : introEn(name, funds.length, provider.role, asOf, lead),
        funds,
        crumbs: [
            { name: isAr ? 'الرئيسية' : 'Home', url: isAr ? '/ar' : '/' },
            { name: isAr ? 'صناديق الاستثمار' : 'Mutual Funds', url: isAr ? '/ar/Funds' : '/Funds' },
            { name: isAr ? `صناديق ${name}` : `${name} funds` },
        ],
        siblings: providers
            .filter((p) => p.slug !== provider.slug)
            .slice(0, 12)
            .map((p) => ({ href: providerPath(p, lang), label: isAr ? p.nameAr : p.nameEn })),
    });
}
