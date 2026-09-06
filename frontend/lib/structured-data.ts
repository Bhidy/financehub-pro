import { SITE_URL } from './seo';

/**
 * THE SITE'S STRUCTURED-DATA GRAPH — one definition of who publishes this site,
 * emitted on every server-rendered page.
 *
 * THE DEFECT THIS EXISTS TO END (Search Console, 2026-09-06: "Datasets — Invalid
 * object type for field creator", "Missing field license"):
 *
 * 25 files referenced the publisher as a bare cross-page pointer —
 * `creator: { '@id': 'https://startamarkets.com/#organization' }` — but the
 * `#organization` node itself was declared in exactly ONE place: the static
 * `public/home.html`. A JSON-LD `@id` only resolves WITHIN the document that
 * carries it, so on all 31 of those references Google saw an object with an
 * identifier, no `@type` and no properties: an invalid `creator`. The same
 * dangling pointer sat in `publisher` on Learn articles and `mainEntity` on the
 * about / contact / methodology / editorial-policy pages.
 *
 * The fix is structural, not per-page: `siteGraph()` is rendered by
 * `PublicPageShell`, so the Organization and WebSite nodes are present on every
 * page that references them, and `datasetNode()` builds a Dataset that carries
 * a fully-typed creator and a licence by construction. A page can no longer
 * emit a dangling reference without also emitting the node it points at.
 *
 * Gate: `npm run verify:schema` (`scripts/test-structured-data.ts`) fails the
 * build when a rendered graph references an `@id` it does not define, when a
 * Dataset is missing `creator`/`license`/`name`/`description`, or when this
 * module and `public/home.html` disagree about the organisation's identity.
 */

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Terms of use — the licence every published dataset is offered under. */
export const DATA_LICENSE_URL = `${SITE_URL}/terms`;

type Node = Record<string, unknown>;

/**
 * The publisher. Kept byte-compatible with the `@graph` in `public/home.html`
 * (the static shell cannot import TypeScript); the schema gate asserts the two
 * agree on `@id`, `name`, `url` and `logo`, so they cannot drift apart.
 */
export function organizationNode(): Node {
    return {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Starta Markets',
        alternateName: ['Starta', 'ستارتا', 'ستارتا ماركتس'],
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/app-icon.png` },
        description:
            'Bilingual (Arabic/English) mutual-fund platform for the Egyptian market: fund profiles with NAV history, performance and risk scorecards, fee transparency, side-by-side comparison of up to four funds, investment calculators, risk profiling, market news and an investing academy.',
        areaServed: 'EG',
        knowsLanguage: ['en', 'ar'],
        slogan: 'Bilingual mutual-fund intelligence for the Egyptian market',
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@startamarkets.com',
            areaServed: 'EG',
            availableLanguage: ['en', 'ar'],
        },
        sameAs: ['https://www.linkedin.com/company/starta-markets'],
    };
}

export function websiteNode(): Node {
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: 'Starta Markets',
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: ['en', 'ar'],
    };
}

/**
 * The site-identity graph every page carries, so that a page-level `@id`
 * reference to the organisation or the website resolves in its own document.
 */
export function siteGraph(): Node {
    return { '@context': 'https://schema.org', '@graph': [organizationNode(), websiteNode()] };
}

/**
 * A fully-typed publisher for use as `creator` / `publisher` / `provider`.
 *
 * It carries the `@id` (so it still unifies with the graph node above) AND the
 * `@type` and `name` inline, because a consumer that reads one node in
 * isolation — which is what Google's Dataset validator does — must be able to
 * tell what the object IS without resolving the reference.
 */
export function publisherRef(): Node {
    return { '@id': ORGANIZATION_ID, '@type': 'Organization', name: 'Starta Markets', url: SITE_URL };
}

export type DatasetInput = {
    name: string;
    description: string;
    /** Absolute canonical URL of the page the dataset is published on. */
    url: string;
    lang?: 'en' | 'ar';
    /** ISO-8601 interval or duration, e.g. "2009-01-02/2026-09-06" or "P10Y". */
    temporalCoverage?: string | null;
    dateModified?: string | null;
    variableMeasured?: unknown;
    /** Primary sources the series is built from. */
    isBasedOn?: string[] | null;
    keywords?: string[];
};

/**
 * A Google-valid Dataset node. `creator`, `license`, `name` and `description`
 * are structural: a caller cannot omit them, which is what the six pages that
 * shipped a Dataset without a licence had done.
 */
export function datasetNode(input: DatasetInput): Node {
    const node: Node = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: input.name,
        description: input.description,
        url: input.url,
        creator: publisherRef(),
        publisher: publisherRef(),
        license: DATA_LICENSE_URL,
        isAccessibleForFree: true,
        inLanguage: input.lang === 'ar' ? 'ar-EG' : 'en',
        creditText: 'Starta Markets',
    };
    if (input.temporalCoverage) node.temporalCoverage = input.temporalCoverage;
    if (input.dateModified) node.dateModified = input.dateModified;
    if (input.variableMeasured !== undefined && input.variableMeasured !== null) node.variableMeasured = input.variableMeasured;
    if (input.isBasedOn && input.isBasedOn.length) node.isBasedOn = input.isBasedOn.slice(0, 5);
    if (input.keywords && input.keywords.length) node.keywords = input.keywords;
    return node;
}
