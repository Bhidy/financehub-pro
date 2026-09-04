#!/usr/bin/env node
/**
 * SEO EXPERIMENT LEDGER — what we changed, what we expected, what happened.
 *
 *     node scripts/seo/experiments.mjs list [--status open|measured|all]
 *     node scripts/seo/experiments.mjs add --id <slug> --hypothesis "…" \
 *          --urls "/a,/b" --change "…" --expect "…" [--baseline k=v,k=v] [--review 28]
 *     node scripts/seo/experiments.mjs measure --id <slug> --result k=v,k=v --outcome confirmed|refuted|inconclusive [--note "…"]
 *     node scripts/seo/experiments.mjs due          # what is ready to measure today
 *
 * WHY A LEDGER AND NOT A COMMIT LOG. Git says what changed; it does not say
 * what we EXPECTED to change, or whether it did. Without that, a team re-runs
 * the same failed idea every few months and reads normal ranking noise as
 * proof of whatever it shipped most recently. This repo has already
 * accumulated several search interventions whose effect nobody can now state.
 *
 * THE ONE RULE: the expected outcome and the baseline are recorded BEFORE the
 * change is measured, and `measure` refuses to write a result for an entry that
 * never declared one. An experiment scored after the fact is a story, not a
 * measurement — this is where SEO work quietly turns into superstition.
 *
 * The ledger is committed JSON so it survives sessions, machines and people.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LEDGER = path.join(root, 'content/seo-experiments.json');

const argv = process.argv.slice(2);
const cmd = argv[0] ?? 'list';
const arg = (name, dflt = null) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const load = () => {
    if (!existsSync(LEDGER)) return { version: 1, experiments: [] };
    try {
        return JSON.parse(readFileSync(LEDGER, 'utf8'));
    } catch (e) {
        console.error(`[experiments] ledger is unreadable (${e.message}). Refusing to overwrite it.`);
        process.exit(1);
    }
};
const save = (data) => {
    mkdirSync(path.dirname(LEDGER), { recursive: true });
    writeFileSync(LEDGER, `${JSON.stringify(data, null, 2)}\n`);
};

/** "clicks=120,position=7.4" → { clicks: 120, position: 7.4 } — numbers stay numbers. */
const kv = (s) =>
    Object.fromEntries(
        (s ?? '')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => {
                const [k, ...rest] = p.split('=');
                const v = rest.join('=');
                const n = Number(v);
                return [k.trim(), v !== '' && Number.isFinite(n) ? n : v];
            })
    );

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

function cmdAdd() {
    const id = arg('id');
    const hypothesis = arg('hypothesis');
    const change = arg('change');
    const expect = arg('expect');
    if (!id || !hypothesis || !change || !expect) {
        console.error('[experiments] add requires --id, --hypothesis, --change and --expect.');
        console.error('              --expect is not optional: an experiment with no declared expectation cannot be refuted.');
        process.exit(1);
    }
    const data = load();
    if (data.experiments.some((e) => e.id === id)) {
        console.error(`[experiments] "${id}" already exists. Ledger entries are append-only; use a new id.`);
        process.exit(1);
    }
    const reviewDays = Number(arg('review', '28'));
    const entry = {
        id,
        status: 'open',
        opened: today(),
        // 28 days by default: shorter than one indexing+ranking cycle and the
        // result is noise, which is how a neutral change gets called a win.
        reviewAfter: addDays(today(), reviewDays),
        hypothesis,
        urls: (arg('urls') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        change,
        expected: expect,
        baseline: kv(arg('baseline')),
        result: null,
        outcome: null,
        note: null,
    };
    data.experiments.push(entry);
    save(data);
    console.log(`[experiments] opened "${id}" — measure on or after ${entry.reviewAfter}`);
}

function cmdMeasure() {
    const id = arg('id');
    const outcome = arg('outcome');
    if (!id || !outcome) {
        console.error('[experiments] measure requires --id and --outcome (confirmed|refuted|inconclusive).');
        process.exit(1);
    }
    if (!['confirmed', 'refuted', 'inconclusive'].includes(outcome)) {
        console.error(`[experiments] unknown outcome "${outcome}".`);
        process.exit(1);
    }
    const data = load();
    const e = data.experiments.find((x) => x.id === id);
    if (!e) {
        console.error(`[experiments] no experiment "${id}".`);
        process.exit(1);
    }
    if (!e.expected) {
        console.error(`[experiments] "${id}" declared no expected outcome, so it cannot be scored. Close it instead.`);
        process.exit(1);
    }
    if (today() < e.reviewAfter) {
        // A warning, not a block: sometimes a result is unambiguous early. But
        // it is recorded, so an early read cannot later be presented as a full
        // measurement window.
        console.warn(`[experiments] WARNING: review window ends ${e.reviewAfter}; measuring early.`);
        e.measuredEarly = true;
    }
    e.result = kv(arg('result'));
    e.outcome = outcome;
    e.note = arg('note');
    e.measured = today();
    e.status = 'measured';
    save(data);
    console.log(`[experiments] "${id}" → ${outcome}`);
}

function cmdList() {
    const want = arg('status', 'all');
    const data = load();
    const rows = data.experiments.filter((e) => want === 'all' || e.status === want);
    if (!rows.length) {
        console.log(`[experiments] no entries${want === 'all' ? '' : ` with status "${want}"`}.`);
        return;
    }
    for (const e of rows) {
        const mark = e.status === 'open' ? '·' : e.outcome === 'confirmed' ? '✓' : e.outcome === 'refuted' ? '✗' : '~';
        console.log(`${mark} ${e.id.padEnd(30)} ${e.status.padEnd(9)} opened ${e.opened}${e.measured ? ` measured ${e.measured} (${e.outcome})` : ` review ${e.reviewAfter}`}`);
        console.log(`    hypothesis: ${e.hypothesis}`);
        if (e.status === 'measured') {
            console.log(`    expected:   ${e.expected}`);
            console.log(`    baseline:   ${JSON.stringify(e.baseline)}`);
            console.log(`    result:     ${JSON.stringify(e.result)}`);
            if (e.note) console.log(`    note:       ${e.note}`);
        }
    }
    const refuted = data.experiments.filter((e) => e.outcome === 'refuted');
    if (refuted.length) {
        console.log(`\n[experiments] ${refuted.length} refuted idea(s) — do not re-run these without a new hypothesis:`);
        for (const e of refuted) console.log(`    ✗ ${e.id}: ${e.hypothesis}`);
    }
}

function cmdDue() {
    const data = load();
    const due = data.experiments.filter((e) => e.status === 'open' && e.reviewAfter <= today());
    if (!due.length) {
        console.log('[experiments] nothing due for measurement today.');
        return;
    }
    console.log(`[experiments] ${due.length} experiment(s) ready to measure:`);
    for (const e of due) {
        console.log(`  ${e.id} (opened ${e.opened}) — expected: ${e.expected}`);
        console.log(`    urls: ${e.urls.join(', ') || '(none recorded)'}`);
        console.log(`    baseline: ${JSON.stringify(e.baseline)}`);
    }
}

const COMMANDS = { add: cmdAdd, measure: cmdMeasure, list: cmdList, due: cmdDue };
const run = COMMANDS[cmd];
if (!run) {
    console.error(`[experiments] unknown command "${cmd}". Use: ${Object.keys(COMMANDS).join(' | ')}`);
    process.exit(1);
}
run();
