import type { Metadata } from 'next';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_URL, absUrl, OG_DEFAULTS } from '@/lib/seo';
import RiskAssessmentClient from './RiskAssessmentClient';
import RiskMethodology from '@/components/seo/RiskMethodology';
import { RISK_I18N, type Lang } from './risk-i18n';
import { HOME_PATH } from '@/lib/lang';

/**
 * Shared per-URL bilingual renderer for the Investment Risk Assessment —
 * same twin architecture as the fund pages: /RiskAssessment (lang 'en', LTR)
 * and /ar/RiskAssessment (lang 'ar', RTL) both delegate here. One language
 * per URL, hreflang alternates on both, x-default → Arabic (Arabic-first
 * site contract). persistLang keeps the client-i18n surfaces (e.g. /Funds,
 * which the results screen links into) in the same language after navigation.
 */

const PATH_EN = '/RiskAssessment';
const PATH_AR = '/ar/RiskAssessment';

const META = {
    en: {
        title: 'Investment Risk Profile Assessment',
        description:
            'Answer 7 questions to find your investor risk profile — Very Conservative to Aggressive — with a suggested allocation and matching Egyptian fund categories.',
    },
    ar: {
        title: 'تقييم ملف المخاطر الاستثماري',
        description:
            'أجب عن 7 أسئلة لتحديد ملف المخاطر الخاص بك — من متحفظ جداً إلى جريء — مع توزيع أصول مقترح وفئات صناديق الاستثمار المناسبة لك.',
    },
} as const satisfies Record<Lang, { title: string; description: string }>;

export function riskMetadata(lang: Lang): Metadata {
    const { title, description } = META[lang];
    const canonical = lang === 'ar' ? PATH_AR : PATH_EN;
    return {
        title,
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

export function renderRiskPage(lang: Lang) {
    const isAr = lang === 'ar';
    const t = RISK_I18N[lang];
    const canonical = isAr ? PATH_AR : PATH_EN;
    const altHref = isAr ? PATH_EN : PATH_AR;

    const crumbs = isAr
        ? [
              { url: HOME_PATH, href: HOME_PATH, label: 'الرئيسية' },
              { label: 'تقييم المخاطر' },
          ]
        : [
              { url: '/', href: '/', label: 'Home' },
              { label: 'Risk Assessment' },
          ];

    const webAppJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: t.landing.h1,
        description: META[lang].description,
        url: absUrl(canonical),
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: isAr ? 'ar' : 'en',
        isAccessibleForFree: true,
        provider: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: 'Starta Markets' },
    };

    return (
        <PublicPageShell lang={lang} altHref={altHref} persistLang>
            <JsonLd data={webAppJsonLd} />
            <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs} />
            <RiskAssessmentClient lang={lang} />
            {/* The published methodology, server-rendered. The wizard is a
                client component, so before this the server sent under 200 words
                and no content heading — a tool that assigns a risk profile and a
                model allocation while disclosing neither. */}
            <RiskMethodology lang={lang} />
        </PublicPageShell>
    );
}
