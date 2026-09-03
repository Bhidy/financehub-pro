import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { renderFundHub } from '@/lib/fund-hub';
import { buildProviders, findProvider, fundBelongsToProvider, providerPath } from '@/content/fund-providers';

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

const introEn = (name: string, n: number, role: string, asOf: string) =>
    `Every Egyptian mutual fund ${role === 'owner' ? 'offered by' : 'managed by'} ${name} — ${n} fund${n === 1 ? '' : 's'} with net asset value, trailing returns and management fee, taken from the manager's official disclosures${asOf ? ` and current to ${asOf}` : ''}. Ordering is mechanical by trailing one-year return and is not a recommendation.`;

const introAr = (name: string, n: number, role: string, asOf: string) =>
    `كل صناديق الاستثمار المصرية ${role === 'owner' ? 'التي يقدمها' : 'التي يديرها'} ${name} — ${n} صندوق مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة، مأخوذة من الإفصاحات الرسمية${asOf ? ` وحتى ${asOf}` : ''}. الترتيب آلي حسب عائد سنة وليس توصية.`;

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
    const title = isAr
        ? `صناديق ${name} — أسعار الوثائق والعوائد اليوم | Starta Markets`
        : `${name} Funds — NAVs, Returns & Fees | Starta Markets`;
    const description = isAr
        ? `أسعار وثائق صناديق ${name} وعوائدها ورسوم الإدارة، محدثة من الإفصاحات الرسمية${asOf ? ` حتى ${asOf}` : ''}.`
        : `Net asset values, trailing returns and management fees for every ${name} mutual fund${asOf ? `, current to ${asOf}` : ''}.`;

    return renderFundHub({
        lang,
        canonical: providerPath(provider, lang),
        altPath: providerPath(provider, isAr ? 'en' : 'ar'),
        title,
        description,
        heading: isAr ? `صناديق ${name}` : `${name} funds`,
        intro: isAr
            ? introAr(name, funds.length, provider.role, asOf)
            : introEn(name, funds.length, provider.role, asOf),
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
