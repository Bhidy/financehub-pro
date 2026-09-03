import { slugify, arabicSlug, hasArabicScript } from '@/lib/seo';

/**
 * FUND PROVIDERS — banks and asset managers, derived from the fund data itself.
 *
 * WHY THIS IS THE HIGHEST-VALUE PAGE TYPE WE DID NOT HAVE:
 * Egyptians search for funds by the institution that offers them —
 * "صناديق بنك مصر", "أسعار صناديق البنك الأهلي اليوم", "صناديق استثمار CIB".
 * Forensics on the Egyptian SERP found those queries held by the banks' own
 * marketing pages and by Facebook posts; the one competitor that built such
 * pages built four of them, and they are that site's only genuinely
 * server-rendered assets. Meanwhile investing.com's Egypt funds listing
 * returns "There are no results available" and stockanalysis has no Egyptian
 * fund coverage at all.
 *
 * The provider list is NOT hardcoded. It is computed from funds_view on every
 * request, so a new manager or a newly-listed bank gets a page the moment its
 * funds appear — and a provider that drops below the publish threshold stops
 * being advertised. The slugs are deterministic, so URLs stay stable.
 *
 * Two roles are folded into one concept deliberately: `owner_name` (the bank
 * or house that offers the fund) and `manager_name` (the firm that runs it)
 * are frequently the same entity, and a searcher does not distinguish them.
 */

export type FundProvider = {
    /** Deterministic English slug — the URL contract. */
    slug: string;
    nameEn: string;
    nameAr: string;
    /** Arabic slug, or '' when no Arabic name exists (then the AR URL uses the EN slug). */
    slugAr: string;
    fundCount: number;
    /** 'owner' when the institution offers the funds, 'manager' when it runs them. */
    role: 'owner' | 'manager';
};

/** Below this a provider page would be thin, so it is not published at all. */
export const MIN_FUNDS_PER_PROVIDER = 3;

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Strip the legal-form suffix from a display name.
 *
 * The register carries "بنك مصر ش.م.م" and "Banque Misr S.A.E", but nobody
 * searches for the legal form — the query is "صناديق بنك مصر". Leaving it in
 * pushes the heading and the title away from the phrase they exist to match.
 * Only the suffix is removed; the entity name itself is never altered, and the
 * SLUG is unaffected so no URL changes.
 */
const LEGAL_SUFFIX =
    /\s*[-–—,]?\s*(?:ش\s*\.?\s*م\s*\.?\s*م\s*\.?|ش\.م\.م|S\.?A\.?E\.?|SAE|S\.?A\.?E\.? *\(.*?\)|Co\.?|Company|Holding Co\.?)\s*$/iu;

export function displayName(name: string): string {
    let out = name.trim();
    // Twice: some names carry both a bracketed form and a suffix.
    for (let i = 0; i < 2; i++) out = out.replace(LEGAL_SUFFIX, '').trim();
    return out.replace(/[-–—,\s]+$/u, '').trim() || name;
}

/**
 * Build the provider list from fund rows.
 *
 * Owners win over managers on a name collision: the institution a saver
 * recognises ("بنك مصر") is the one they search for, and listing the same
 * entity twice under two roles would split its funds across two competing URLs.
 */
export function buildProviders(rows: Array<Record<string, unknown>>): FundProvider[] {
    type Acc = { nameEn: string; nameAr: string; count: number; role: 'owner' | 'manager' };
    const bySlug = new Map<string, Acc>();

    const add = (nameEn: string, nameAr: string, role: 'owner' | 'manager') => {
        const slug = slugify(nameEn);
        if (!slug) return;
        const existing = bySlug.get(slug);
        if (existing) {
            existing.count += 1;
            // An owner record supersedes a manager record for the same entity.
            if (role === 'owner') existing.role = 'owner';
            if (!existing.nameAr && nameAr) existing.nameAr = nameAr;
            return;
        }
        bySlug.set(slug, { nameEn, nameAr, count: 1, role });
    };

    for (const r of rows) {
        const ownerEn = clean(r.owner_name_en);
        const ownerAr = clean(r.owner_name);
        const mgrEn = clean(r.manager_name_en);
        const mgrAr = clean(r.manager_name);
        if (ownerEn) add(ownerEn, ownerAr, 'owner');
        // Only count the manager separately when it is a DIFFERENT entity, or
        // a house that both owns and manages would be double-counted.
        if (mgrEn && slugify(mgrEn) !== slugify(ownerEn)) add(mgrEn, mgrAr, 'manager');
    }

    return [...bySlug.entries()]
        .filter(([, a]) => a.count >= MIN_FUNDS_PER_PROVIDER)
        .map(([slug, a]) => ({
            slug,
            nameEn: displayName(a.nameEn),
            nameAr: displayName(hasArabicScript(a.nameAr) ? a.nameAr : a.nameEn),
            slugAr: hasArabicScript(a.nameAr) ? arabicSlug(a.nameAr) : '',
            fundCount: a.count,
            role: a.role,
        }))
        .sort((x, y) => y.fundCount - x.fundCount || x.nameEn.localeCompare(y.nameEn));
}

/** Does this fund belong to this provider (either role)? */
export function fundBelongsToProvider(row: Record<string, unknown>, provider: FundProvider): boolean {
    const o = slugify(clean(row.owner_name_en));
    const m = slugify(clean(row.manager_name_en));
    return o === provider.slug || m === provider.slug;
}

export const providerPath = (p: FundProvider, lang: 'en' | 'ar' = 'en'): string =>
    lang === 'ar' ? `/ar/Funds/provider/${p.slugAr || p.slug}` : `/Funds/provider/${p.slug}`;

/** Resolve a URL slug in EITHER language back to its provider. */
export function findProvider(providers: FundProvider[], slug: string): FundProvider | null {
    let decoded = slug;
    try {
        decoded = decodeURIComponent(slug);
    } catch {
        // malformed escapes: compare raw
    }
    return providers.find((p) => p.slug === decoded || (p.slugAr && p.slugAr === decoded)) ?? null;
}
