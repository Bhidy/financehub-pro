import { symbolPath, symbolPathAr } from '@/lib/seo';
import { NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * The company page family, in one place.
 *
 * Sub-page URLs differ by language because the ARABIC company URL carries the
 * Arabic company slug (/ar/symbol/COMI-البنك-التجاري-الدولي/technicals) while
 * the English one is the bare ticker. Building those by hand at each call site
 * is how an /ar link ends up pointing at an /en page — so every sub-page URL
 * and every tab label comes from here.
 */

export type SymbolTab =
    | 'overview' | 'statistics' | 'financials' | 'dividends' | 'technicals' | 'history'
    | 'seasonality';

/** Base company URL for the language. */
export function symbolBase(symbol: string, lang: Lang, nameAr?: string | null): string {
    return lang === 'ar' ? symbolPathAr(symbol, nameAr) : symbolPath(symbol);
}

/** A sub-page URL: the language-correct base plus the tab segment. */
export function symbolTabPath(symbol: string, tab: SymbolTab, lang: Lang, nameAr?: string | null): string {
    const base = symbolBase(symbol, lang, nameAr);
    return tab === 'overview' ? base : `${base}/${tab}`;
}

/**
 * The sibling tab strip rendered at the foot of every sub-page. `current` is
 * omitted so a page never links to itself, and the tabs are the internal-link
 * mesh that ties a company's pages together for crawling.
 */
export function symbolSiblings(
    symbol: string,
    current: SymbolTab,
    lang: Lang,
    nameAr?: string | null,
    opts?: { seasonality?: boolean }
): Array<{ href: string; label: string }> {
    const tabs: SymbolTab[] = ['overview', 'statistics', 'financials', 'dividends', 'technicals', 'history'];
    // Seasonality is OPT-IN, never a default tab: only ~192 of 318 symbols have
    // the five years of history the page needs, so linking it unconditionally
    // would point every company at a 404. Callers pass the answer from the one
    // cached getSeasonalitySymbols() set.
    if (opts?.seasonality) tabs.push('seasonality');
    return tabs
        .filter((tab) => tab !== current)
        .map((tab) => ({
            href: encodeURI(symbolTabPath(symbol, tab, lang, nameAr)),
            label: t(NAV[tab === 'overview' ? 'overview' : tab], lang),
        }));
}

/** Breadcrumb trail shared by every sub-page. */
export function symbolCrumbs(
    symbol: string,
    name: string,
    leaf: string,
    lang: Lang,
    nameAr?: string | null
): Array<{ href?: string; url?: string; label: string }> {
    const base = encodeURI(symbolBase(symbol, lang, nameAr));
    const companies = lang === 'ar' ? '/ar/companies' : '/companies';
    const home = lang === 'ar' ? '/ar' : '/';
    return [
        { href: home, url: home, label: t(NAV.home, lang) },
        { href: companies, url: companies, label: t(NAV.companies, lang) },
        { href: base, url: base, label: name },
        { label: leaf },
    ];
}
