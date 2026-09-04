/**
 * FUND COMPARISON PAIRS — one definition, used by every surface that needs them.
 *
 * WHY THIS MODULE EXISTS. The pair set was computed inside the sitemap builder
 * from its OWN `funds_view` query while nothing else could see it. That is the
 * shape of the defect that shipped 404ing provider hubs: one concept, two
 * queries, silently disagreeing — the sitemap advertised URLs the page could
 * not produce. The comparison hub now links the same pairs the sitemap
 * advertises because both call this function on the same rows.
 *
 * SELECTION RULE, and why:
 *  - WITHIN a fund type only. Comparing a money-market fund against an equity
 *    fund is a comparison nobody is making; it would also imply the two are
 *    alternatives, which for a risk-matched reader they are not.
 *  - Top N per type by 1-year return, so every pair is between funds a reader
 *    might actually be choosing between.
 *  - Ids ordered low-high, so `a-vs-b` and `b-vs-a` can never both exist.
 *
 * The ordering is deterministic for a given input, which is what lets the
 * sitemap's `lastmod` and the hub's links stay in agreement between deploys.
 */

type Row = Record<string, unknown>;

export type FundPair = {
    a: number;
    b: number;
    type: string;
    /** `{a}-vs-{b}` — the URL segment for /Funds/vs/{pair}. */
    slug: string;
};

/** Coalesced 1-year return. `return_1y` is all-NULL in funds_view; the populated
 *  columns are `returns_1y` / `one_year_return`. A gate written against
 *  `return_1y` alone once emptied the entire comparison sitemap segment. */
const oneYear = (r: Row): number => {
    const raw = r.return_1y ?? r.returns_1y ?? r.one_year_return;
    return raw === null || raw === undefined ? NaN : Number(raw);
};

const numericId = (r: Row): number => {
    const id = r.fund_id;
    return /^\d+$/.test(String(id ?? '')) ? Number(id) : NaN;
};

/**
 * @param rows   Fund rows (anything with fund_id, fund_type_en and a 1y return).
 * @param perType How many funds per type enter the pairing. C(8,2) = 28 pairs
 *   per type. Raising this is quadratic — 8 is the ceiling that keeps the
 *   comparison segment a curated set rather than a crawl trap.
 */
export function rankFundPairs(rows: Row[], perType = 8): FundPair[] {
    const ranked = rows
        .map((r) => ({ id: numericId(r), type: (r.fund_type_en as string | null) || 'other', r1y: oneYear(r) }))
        .filter((r) => Number.isFinite(r.id) && Number.isFinite(r.r1y))
        .sort((a, b) => (a.type === b.type ? b.r1y - a.r1y : a.type.localeCompare(b.type)));

    const byType = new Map<string, number[]>();
    for (const r of ranked) {
        if (!byType.has(r.type)) byType.set(r.type, []);
        const arr = byType.get(r.type) as number[];
        if (arr.length < perType) arr.push(r.id);
    }

    const pairs: FundPair[] = [];
    for (const [type, ids] of byType) {
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
                pairs.push({ a, b, type, slug: `${a}-vs-${b}` });
            }
        }
    }
    return pairs;
}

/**
 * The subset worth SHOWING on the comparison hub.
 *
 * The full set is ~150 pairs; a wall of them is a link dump, not a shortcut.
 * This takes the highest-ranked pairs from each type in round-robin order, so
 * the visible set spans every fund category instead of being 28 money-market
 * pairs followed by nothing else.
 */
export function featuredFundPairs(rows: Row[], limit = 12): FundPair[] {
    const all = rankFundPairs(rows);
    const byType = new Map<string, FundPair[]>();
    for (const p of all) {
        if (!byType.has(p.type)) byType.set(p.type, []);
        (byType.get(p.type) as FundPair[]).push(p);
    }
    const queues = [...byType.values()];
    const out: FundPair[] = [];
    for (let round = 0; out.length < limit; round++) {
        let added = false;
        for (const q of queues) {
            if (round < q.length) {
                out.push(q[round]);
                added = true;
                if (out.length >= limit) break;
            }
        }
        if (!added) break; // every queue exhausted
    }
    return out;
}
