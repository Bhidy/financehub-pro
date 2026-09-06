/**
 * GATE: structured data cannot ship a dangling reference or an invalid Dataset.
 *   npx tsx scripts/test-structured-data.ts
 *
 * WHY THIS EXISTS. Search Console, 2026-09-06: "Datasets — Invalid object type
 * for field creator" and "Missing field license" on startamarkets.com.
 *
 * The cause was structural. 25 files named the publisher with a bare
 * cross-document pointer — `creator: { '@id': '…/#organization' }` — while the
 * `#organization` node itself was declared in exactly ONE document, the static
 * `public/home.html`. A JSON-LD `@id` resolves only inside the document that
 * carries it, so on every one of those pages Google saw an object with an
 * identifier and no type: an invalid `creator`. Six Datasets also shipped with
 * no `license` at all.
 *
 * A one-time repair of eleven files would have been undone by the twelfth
 * Dataset somebody adds next month, so the repair is enforced here:
 *
 *   1. `lib/structured-data.ts` is the only place the organisation is defined,
 *      and it agrees with the static homepage on identity.
 *   2. `PublicPageShell` emits that graph, so an `@id` reference resolves in
 *      the same document on every server-rendered page.
 *   3. Every Dataset literal in the tree carries a typed `creator` and a
 *      `license` — spelled as the shared helpers, not hand-written.
 *
 * Static analysis on purpose: it runs in `verify:all` before a build exists.
 * The rendered counterpart is `JSONLD_DANGLING_REF` / `JSONLD_DATASET_INVALID`
 * in scripts/seo/audit.mjs, which checks the same contract on the live site.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { organizationNode, websiteNode, ORGANIZATION_ID, WEBSITE_ID, datasetNode, publisherRef, DATA_LICENSE_URL } from '../lib/structured-data';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
    if (!ok) failures++;
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

/* ── 1. the organisation is defined once, and matches the static homepage ── */
console.log('\n[1] one organisation identity, shared with the static shell');
const org = organizationNode() as Record<string, unknown>;
check('organizationNode has @type Organization', org['@type'] === 'Organization');
check('organizationNode has @id', org['@id'] === ORGANIZATION_ID);
check('websiteNode has @id', (websiteNode() as Record<string, unknown>)['@id'] === WEBSITE_ID);

const home = readFileSync(path.join(root, 'public/home.html'), 'utf8');
// [\s\S] rather than the `s` flag: the tsconfig target predates dotAll.
const graphMatch = /<script type="application\/ld\+json">(\{"@context"[\s\S]*?"@graph"[\s\S]*?)<\/script>/.exec(home);
check('public/home.html still carries a JSON-LD @graph', graphMatch !== null);
if (graphMatch) {
    const staticGraph = JSON.parse(graphMatch[1]) as { '@graph': Array<Record<string, unknown>> };
    const staticOrg = staticGraph['@graph'].find((n) => n['@type'] === 'Organization');
    check('the static shell declares the same @id', staticOrg?.['@id'] === org['@id'], `${staticOrg?.['@id']} vs ${org['@id']}`);
    check('…the same name', staticOrg?.name === org.name);
    check('…the same url', staticOrg?.url === org.url);
    check('…the same logo url',
        JSON.stringify((staticOrg?.logo as Record<string, unknown>)?.url) === JSON.stringify((org.logo as Record<string, unknown>)?.url));
}

/* ── 2. the shell emits the graph, so references resolve ─────────────────── */
console.log('\n[2] the page shell emits the identity graph');
const shell = readFileSync(path.join(root, 'components/seo/PublicPageShell.tsx'), 'utf8');
check('PublicPageShell imports siteGraph', /import \{[^}]*siteGraph[^}]*\} from '@\/lib\/structured-data'/.test(shell));
check('PublicPageShell renders siteGraph() as ld+json',
    /application\/ld\+json[\s\S]{0,200}siteGraph\(\)/.test(shell));

/* ── 3. every Dataset carries a typed creator and a licence ──────────────── */
console.log('\n[3] every Dataset literal in the tree is Google-valid');
const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(path.join(root, dir))) {
        if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
        const rel = `${dir}/${entry}`;
        if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out);
        else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
    }
    return out;
};
const files = [...walk('app'), ...walk('components'), ...walk('lib')];
const datasetFiles = files.filter((f) => /'@type':\s*'Dataset'/.test(readFileSync(path.join(root, f), 'utf8')));
check('the tree still contains Dataset emitters', datasetFiles.length > 0, `${datasetFiles.length}`);
for (const f of datasetFiles) {
    if (f.endsWith('lib/structured-data.ts')) continue;
    const text = readFileSync(path.join(root, f), 'utf8');
    // Each Dataset literal must be followed, inside the same object, by the
    // shared publisher helper and the shared licence constant.
    // Dataset literals appear both as a named const (`};`) and inline as a JSX
    // prop (`}}` / `}}/>`), so the block terminator has to accept both.
    const blocks = [...text.matchAll(/'@type':\s*'Dataset',([\s\S]{0,1600}?)\n\s*\}[,;)\}]/g)].map((m) => m[1]);
    check(`${f} — Dataset block found`, blocks.length > 0);
    for (const [i, b] of blocks.entries()) {
        check(`${f} [${i}] creator: publisherRef()`, /creator:\s*publisherRef\(\)/.test(b), 'a bare { \'@id\': … } creator is what Google rejected');
        check(`${f} [${i}] license: DATA_LICENSE_URL`, /license:\s*DATA_LICENSE_URL/.test(b), 'Dataset requires a licence');
    }
}

/* ── 4. no file may hand-write a dangling organisation pointer ───────────── */
console.log('\n[4] no hand-written bare @id publisher pointers');
for (const f of files) {
    if (f.endsWith('lib/structured-data.ts')) continue;
    const text = readFileSync(path.join(root, f), 'utf8');
    const bare = [...text.matchAll(/(creator|publisher|provider):\s*\{\s*'@id':\s*`\$\{SITE_URL\}\/#organization`\s*\}/g)];
    check(`${f} has no bare @id creator/publisher/provider`, bare.length === 0, `${bare.length} found — use publisherRef()`);
}

/* ── 5. the builders themselves produce valid output ─────────────────────── */
console.log('\n[5] datasetNode() output satisfies the Dataset contract');
const ds = datasetNode({ name: 'X', description: 'Y', url: 'https://startamarkets.com/x', lang: 'ar' }) as Record<string, unknown>;
check('has name', typeof ds.name === 'string' && !!ds.name);
check('has description', typeof ds.description === 'string' && !!ds.description);
check('creator is a typed Organization', (ds.creator as Record<string, unknown>)?.['@type'] === 'Organization');
check('creator carries the org @id', (ds.creator as Record<string, unknown>)?.['@id'] === ORGANIZATION_ID);
check('license is the terms URL', ds.license === DATA_LICENSE_URL);
check('inLanguage follows the page language', ds.inLanguage === 'ar-EG');
check('publisherRef is typed', (publisherRef() as Record<string, unknown>)['@type'] === 'Organization');

console.log(failures === 0 ? '\nPASS: structured-data gate\n' : `\nFAIL: ${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
