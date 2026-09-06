import type { Metadata } from 'next';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_URL, absUrl, OG_DEFAULTS } from '@/lib/seo';
import CalculatorsClient from './CalculatorsClient';
import { calcLabels, type Lang } from './calculators-i18n';
import { HOME_PATH } from '@/lib/lang';

/**
 * Shared, per-URL bilingual renderer for the Wealth Calculators page. Both
 * routes delegate here: /Calculators (lang 'en', LTR) and /ar/Calculators
 * (lang 'ar', RTL) — mirroring the fund-page architecture at smaller scale.
 * Content is shown in ONE language per URL; the nav shows the EN/AR switcher
 * (PublicPageShell altHref) and the URL language is persisted (persistLang)
 * so client-i18n surfaces stay in the same language after navigation.
 */

const PATH_EN = '/Calculators';
const PATH_AR = '/ar/Calculators';

export function calculatorsMetadata(lang: Lang): Metadata {
    const title =
        lang === 'ar'
            ? 'حاسبات الثروة — تخطيط التقاعد والاستثمار | ستارتا'
            : 'Wealth Calculators — Retirement & Investment Planning | Starta';
    const description =
        lang === 'ar'
            ? 'حاسبات ثروة مجانية: مخطط تقاعد من 5 خطوات مع مقارنة السيناريوهات، ومحاكي نمو الاستثمار بنطاقات مونت كارلو — للمستثمر المصري وبالجنيه.'
            : 'Free wealth calculators: a 5-step retirement planner with scenario comparison and an investment growth simulator with Monte Carlo ranges — in EGP.';
    const canonical = lang === 'ar' ? PATH_AR : PATH_EN;
    return {
        // The root layout template appends "| Starta Markets"; these titles carry
        // their own brand suffix by spec, so use them verbatim.
        title: { absolute: title },
        description,
        alternates: {
            canonical,
            // x-default = Arabic: the site's default language is Arabic (Egypt-first).
            languages: { en: PATH_EN, ar: PATH_AR, 'x-default': PATH_AR },
        },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
            title,
            description,
            url: canonical,
        },
    };
}

export function renderCalculatorsPage(lang: Lang) {
    const labels = calcLabels(lang);
    const canonical = lang === 'ar' ? PATH_AR : PATH_EN;
    const altHref = lang === 'ar' ? PATH_EN : PATH_AR;

    const crumbs =
        lang === 'ar'
            ? [{ href: HOME_PATH, label: labels.breadcrumbs.home }, { label: labels.breadcrumbs.calculators }]
            : [{ href: '/', label: labels.breadcrumbs.home }, { label: labels.breadcrumbs.calculators }];
    const crumbLd =
        lang === 'ar'
            ? [{ url: HOME_PATH, label: labels.breadcrumbs.home }, { label: labels.breadcrumbs.calculators }]
            : [{ url: '/', label: labels.breadcrumbs.home }, { label: labels.breadcrumbs.calculators }];

    const appJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: lang === 'ar' ? 'حاسبات الثروة من ستارتا' : 'Starta Wealth Calculators',
        description:
            lang === 'ar'
                ? 'مخطط تقاعد من 5 خطوات ومحاكي نمو استثماري بمحاكاة مونت كارلو.'
                : 'A 5-step retirement planner and an investment growth simulator with Monte Carlo ranges.',
        url: absUrl(canonical),
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        inLanguage: lang === 'ar' ? 'ar' : 'en',
        isAccessibleForFree: true,
        provider: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: 'Starta Markets' },
    };

    return (
        <PublicPageShell lang={lang} altHref={altHref} persistLang>
            <JsonLd data={appJsonLd} />
            <JsonLd data={breadcrumbJsonLd(crumbLd, SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs} />
            <CalculatorsClient labels={labels} lang={lang} />
        </PublicPageShell>
    );
}
