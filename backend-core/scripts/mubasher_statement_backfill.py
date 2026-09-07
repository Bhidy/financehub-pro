#!/usr/bin/env python3
"""
mubasher_statement_backfill.py — write the newsroom NAV statements into nav_history.

WHAT THIS IS FOR
----------------
Closing the 2025-05-14 .. 2026-06-30 hole. Our own ingestion is exhaustive —
measured 2026-09-07, the Mubasher per-fund CSV offers 203,582 observations and
we already hold 203,581 — so the hole cannot be re-fetched. The newsroom
statement is the only source that still carries it. `mubasher_statement.py`
reads one; this decides whether any of it may be stored.

THE WRITE CONTRACT
------------------
  * `ON CONFLICT (fund_id, date) DO NOTHING` — a NAV already in the table is
    never overwritten. This backfill fills holes; it does not restate history.
  * every row is stamped `source = 'mubasher_statement'`, so the whole batch
    can be identified, audited and, if it ever has to be, purged by source.
  * `--commit` is required to write. The default is a dry run that reports
    exactly what WOULD be written.
  * per-fund all-or-nothing: `reconcile_series` either clears a fund's whole
    reconstructed series or the fund is skipped entirely. A series that does
    not arrive where our held data says reality is tells us nothing about which
    of its points were right.

WHY THE GATE IS SERIES-LEVEL AND NOT PER-ROW
--------------------------------------------
Step-by-step plausibility is not enough and assuming it was is the worst defect
this pipeline has had. Each filled point anchors to the previously accepted
point, so a bias far too small to trip a per-step band compounds: a +0.25%/day
drift filled a 412-day hole with 293 of 293 points accepted, zero rejections,
and landed 107.9% away from the truth at the far end. `reconcile_series` now
also checks the junction back onto real held data, which is the one comparison
a drifting series cannot survive.

USAGE
  python mubasher_statement_backfill.py --manifest fund_articles.json           # dry run
  python mubasher_statement_backfill.py --manifest fund_articles.json --commit
  python mubasher_statement_backfill.py --self-test
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from collections import defaultdict
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mubasher_statement import (            # noqa: E402
    SOURCE_TAG, StatementError, fetch_article, load_aliases, normalise_name,
    read_statement, reconcile_series,
)

DATABASE_URL = os.getenv("DATABASE_URL")

SQL_HELD = """
    SELECT fund_id, date::text AS date, nav::float8 AS nav
      FROM nav_history
     WHERE fund_id = ANY($1::text[])
"""

SQL_WRITE = """
    INSERT INTO nav_history (fund_id, date, nav, source, ingested_at)
    VALUES ($1::text, $2::date, $3::numeric, $4::text, NOW())
    ON CONFLICT (fund_id, date) DO NOTHING
"""


# ==========================================================================
# extraction
# ==========================================================================
def collect(article_ids, *, cache_dir=None, verbose=True, bridge=False):
    """
    (fund_id -> {iso date: nav}), plus a per-article report.

    A statement that cannot be read is skipped and counted, never guessed at.

    `bridge` additionally allows a printed name the alias table has never seen
    to be PROPOSED against a known one. Mubasher renamed its own columns
    between eras — "Horus M.M" on the 2025 sheets is "HORUS - AFIM" on the 2026
    ones — so the alias table, learned from recent statements, maps almost
    nothing on the older ones that cover the deepest part of the hole.

    A name resemblance is NOT evidence of identity, and this was proven the
    expensive way: bridging on names alone mapped rows onto fund 5989 whose own
    held value that day was 21.898 against a printed 0.83604 — 96% wrong — and
    onto 5809, 88% wrong. Different funds, similar names. The gate caught them,
    but a fund sitting inside the gap has no overlapping date for the gate to
    catch anything with.

    So `collect` no longer decides bridges. It records the unmapped rows WITH
    their values, and `run` accepts a bridge only when the proposed fund's own
    stored NAV corroborates the printed price on dates we already hold. The
    name only narrows the search; the value decides, exactly as the alias table
    itself is built.
    """
    aliases = load_aliases()
    by_fund: dict[str, dict[str, float]] = defaultdict(dict)
    bridged: dict[str, str] = {}
    unmapped_rows: dict[str, dict] = defaultdict(dict)
    report = {"read": 0, "refused": 0, "rows": 0, "mapped": 0, "bridged": bridged,
              "unmapped": defaultdict(int), "unmapped_rows": unmapped_rows,
              "errors": []}
    for aid in article_ids:
        try:
            page = fetch_article(aid, cache_dir=cache_dir)
            stmt_date, rows = read_statement(page, cache_key=str(aid),
                                             cache_dir=cache_dir)
        except StatementError as exc:
            report["refused"] += 1
            report["errors"].append((aid, str(exc)))
            if verbose:
                print(f"   {aid}  REFUSED: {exc}", flush=True)
            continue
        except Exception as exc:                       # network, decode, OCR
            report["refused"] += 1
            report["errors"].append((aid, f"{type(exc).__name__}: {exc}"))
            if verbose:
                print(f"   {aid}  ERROR: {type(exc).__name__}: {exc}", flush=True)
            continue
        report["read"] += 1
        report["rows"] += len(rows)
        iso = stmt_date.isoformat()
        for row in rows:
            key = normalise_name(row.name)
            fund_id = aliases.get(key)
            if not fund_id:
                report["unmapped"][row.name] += 1
                if bridge and row.decimals >= 4:
                    unmapped_rows[row.name][iso] = row.value
                continue
            report["mapped"] += 1
            # Two statements can carry the same fund on the same day (the
            # general sheet and a category graphic). Keep the more precise
            # read; they have agreed exactly everywhere we have checked.
            prev = by_fund[fund_id].get(iso)
            if prev is None or row.decimals >= 4:
                by_fund[fund_id][iso] = row.value
        if verbose:
            print(f"   {aid}  {iso}  {len(rows)} rows", flush=True)
    return by_fund, report


# ==========================================================================
# database
# ==========================================================================
async def load_held(conn, fund_ids):
    held: dict[str, dict[str, float]] = defaultdict(dict)
    for rec in await conn.fetch(SQL_HELD, list(fund_ids)):
        held[rec["fund_id"]][rec["date"]] = float(rec["nav"])
    return held


def load_held_archive(path: str, fund_ids=None):
    """
    Held NAVs from the permanent nav-archive snapshot instead of the database.

    The archive (nav-archive.yml, a GitHub Release asset) is a superset-checked
    export of nav_history, so it is a faithful stand-in for the reconciliation
    input. This exists so the gate can be exercised — and a backfill fully
    rehearsed — from a machine with no database credentials, which is where
    this work has to be reviewed.
    """
    import csv
    import gzip
    want = set(fund_ids) if fund_ids else None
    held: dict[str, dict[str, float]] = defaultdict(dict)
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt") as fh:
        for row in csv.DictReader(fh):
            fid = row["fund_id"]
            if want is not None and fid not in want:
                continue
            held[fid][row["date"]] = float(row["nav"])
    return held


def load_manifest(path: str) -> list:
    """
    Article ids from the statement manifest.

    Accepts a bare list, a bare {id: slug} map, or the documented wrapper
    {"articles": {...}, "_comment": ...}. The wrapper is why this exists: a
    naive `list(doc.keys())` would happily return "_comment" and "_built" as
    article ids and then report them as fetch failures, which reads like a
    source outage rather than a bug here.
    """
    doc = json.load(open(path, encoding="utf-8"))
    if isinstance(doc, list):
        raw = doc
    elif isinstance(doc, dict):
        raw = doc.get("articles", doc)
        raw = list(raw.keys()) if isinstance(raw, dict) else list(raw)
    else:
        raise SystemExit(f"unrecognised manifest shape: {path}")
    ids = [str(x) for x in raw if str(x).isdigit()]
    if not ids:
        raise SystemExit(f"manifest contains no article ids: {path}")
    return ids


async def learn_aliases(conn, article_ids, *, cache_dir, out_path, min_dates=3,
                        tol_pct=0.002):
    """
    Regenerate the printed-name -> fund_id table from the statements themselves.

    The alias table is the ceiling on how much of the hole can be filled: the
    first full pass mapped 4,214 of 8,709 rows and left 655 distinct names
    unmapped, some appearing ~100 times. Those are real funds we simply had no
    evidence for, because the table was learned from only 21 statements.

    So this is derived, never authored. A name is accepted only when the
    printed price equals our stored NAV — within `tol_pct`, because our archive
    keeps 4 decimals and the statement prints 5 — on at least `min_dates`
    DISTINCT dates, and the set of funds that could explain it intersects to
    exactly one. Coincidences do not survive that intersection; a money-market
    fund can collide with a sibling on one date, not on three.
    """
    from mubasher_statement import normalise_name  # local import: same package
    stmts = {}
    for aid in article_ids:
        try:
            page = fetch_article(aid, cache_dir=cache_dir)
            d, rows = read_statement(page, cache_key=str(aid), cache_dir=cache_dir)
        except Exception:
            continue
        stmts[aid] = (d.isoformat(), rows)
    print(f"learning from {len(stmts)} readable statements")

    # asyncpg binds a date[] from real date objects, not ISO strings — passing
    # strings raises DataError deep inside the driver, which reads like a query
    # problem rather than a type problem.
    dates = sorted({d for d, _ in stmts.values()})
    date_params = [date.fromisoformat(d) for d in dates]
    pool = defaultdict(list)
    for rec in await conn.fetch(
            "SELECT fund_id, date::text AS date, nav::float8 AS nav "
            "FROM nav_history WHERE date = ANY($1::date[])", date_params):
        pool[rec["date"]].append((rec["fund_id"], float(rec["nav"])))

    cands, seen_dates, printed = defaultdict(list), defaultdict(set), {}
    for _aid, (d, rows) in stmts.items():
        day = pool.get(d, [])
        if not day:
            continue
        for row in rows:
            key = normalise_name(row.name)
            if not key:
                continue
            printed.setdefault(key, row.name)
            match = {fid for fid, v in day
                     if v and abs(v - row.value) / v * 100 < tol_pct}
            if match:
                cands[key].append(match)
                seen_dates[key].add(d)

    aliases, quarantine = {}, {}
    for key, sets in cands.items():
        inter = set.intersection(*sets)
        n = len(seen_dates[key])
        if len(inter) == 1 and n >= min_dates:
            aliases[key] = {"fund_id": sorted(inter)[0], "printed": printed[key],
                            "dates": n, "disagreements": 0}
        elif len(inter) > 1:
            quarantine[key] = {"fund_id": None, "dates": n,
                               "why": f"ambiguous: {sorted(inter)}"}
        else:
            quarantine[key] = {"fund_id": (sorted(inter)[0] if inter else None),
                               "dates": n, "why": "below evidence floor"}

    doc = {"_comment": ("printed statement name (normalised) -> our fund_id, learned "
                        "ONLY by VALUE FINGERPRINT: the printed price equalled our "
                        "stored NAV (within 20 ppm; our archive keeps 4dp, the "
                        "statement prints 5) on >= 3 DISTINCT dates AND the candidate "
                        "set intersected to exactly one fund. Never hand-written, "
                        "never inferred from name similarity. Regenerate with "
                        "mubasher_statement_backfill.py --learn-aliases."),
           "_built": date.today().isoformat(), "_min_dates": min_dates,
           "_tolerance_pct": tol_pct, "_statements_used": len(stmts),
           "aliases": dict(sorted(aliases.items(), key=lambda kv: kv[1]["fund_id"])),
           "quarantine": quarantine}
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
    print(f"aliases: {len(aliases)}   quarantined: {len(quarantine)}   -> {out_path}")
    print(f"distinct funds covered: {len({a['fund_id'] for a in aliases.values()})}")
    return doc


def corroborate_bridges(unmapped_rows, aliases, held, *, min_hits=2, tol_pct=0.002):
    """
    Turn unmapped printed names into fund ids — by VALUE, with the name only
    narrowing the search.

    Mubasher renamed its columns between eras ("Horus M.M" -> "HORUS - AFIM"),
    so the alias table learned from recent statements maps little on the older
    ones. The tempting shortcut is to match those names by resemblance. It does
    not work: measured 2026-09-07, name-only bridging put rows on fund 5989
    whose own held NAV that day was 21.898 against a printed 0.83604, and on
    5809, 88% out. Similar names, different funds.

    So a proposal is only accepted when the candidate fund's OWN stored NAV
    equals the printed price on at least `min_hits` dates we already hold. That
    is the same standard the alias table is built to; the name merely says
    which funds are worth testing.

    Returns (accepted {name_key: fund_id}, rejected [(name, why)]).
    """
    from mubasher_statement import normalise_name, propose_bridge
    accepted, rejected = {}, []
    for name, series in unmapped_rows.items():
        proposals = propose_bridge(name, aliases)
        if not proposals:
            continue
        scored = []
        for fund_id in proposals:
            own = held.get(fund_id, {})
            hits = sum(1 for d, v in series.items()
                       if d in own and own[d]
                       and abs(v - own[d]) / own[d] * 100 < tol_pct)
            if hits:
                scored.append((hits, fund_id))
        if not scored:
            rejected.append((name, "no date where the printed price matches a candidate"))
            continue
        scored.sort(reverse=True)
        best_hits, best_fund = scored[0]
        if best_hits < min_hits:
            rejected.append((name, f"only {best_hits} corroborating date(s), need {min_hits}"))
            continue
        if len(scored) > 1 and scored[1][0] == best_hits:
            rejected.append((name, "two candidates corroborate equally well"))
            continue
        accepted[normalise_name(name)] = best_fund
    return accepted, rejected


def report_plan(candidate, held, *, show=12, inferred=frozenset(), quiet=False):
    """
    The dry-run report: what reconciliation would accept, and what it refuses.

    `inferred` names funds whose identity came from a BRIDGE rather than the
    fingerprinted alias table. Those are held to a stricter rule: their new
    points must be ENCLOSED by data we already hold, so the closure check has
    an anchor on both sides. Without a closing anchor a wrong bridge could
    extend a series off the end of our data unchallenged, and an inference is
    exactly the case where that must not be possible.
    """
    emit = (lambda *a, **k: None) if quiet else print
    accepted, refused, rejected_pts, unanchored = {}, [], 0, []
    for fund_id, series in sorted(candidate.items()):
        own = held.get(fund_id, {})
        if fund_id in inferred and series:
            first, last = min(series), max(series)
            before = any(d < first for d in own)
            after = any(d > last for d in own)
            if not (before and after):
                unanchored.append(fund_id)
                continue
        check = reconcile_series(fund_id, own, series)
        rejected_pts += len(check.rejected)
        if not check.ok:
            # Report the SHAPE of the refusal, not just two examples. Without
            # the overlap size and the conflict count a refusal cannot be told
            # apart from a mismatched fund, a stale vendor date, or simply too
            # little overlap for the rate rule to apply — which cost a whole
            # diagnostic round trip.
            overlap = sum(1 for d in series if d in own)
            refused.append((fund_id, len(check.conflicts), overlap,
                            check.conflicts[:2]))
            continue
        if check.accepted:
            accepted[fund_id] = check.accepted
    total = sum(len(v) for v in accepted.values())
    emit(f"\nfunds offered {len(candidate)}  cleared {len(accepted)}  "
          f"REFUSED by reconciliation {len(refused)}")
    emit(f"individual points rejected in-flight: {rejected_pts}")
    emit(f"NEW observations that would be written: {total}")
    if unanchored:
        emit(f"inferred funds skipped for want of a two-sided anchor: "
              f"{len(unanchored)} {unanchored[:8]}")
    for fund_id, n_conf, overlap, sample in refused[:show]:
        rate = (n_conf / overlap * 100) if overlap else 0.0
        why = ("overlap too thin for the rate rule"
               if overlap < 20 else f"conflict rate {rate:.1f}%")
        emit(f"   refused {fund_id}: {n_conf} conflict(s) in {overlap} overlapping "
             f"dates — {why}; e.g. {sample}")
    rank = sorted(accepted.items(), key=lambda kv: -len(kv[1]))
    for fund_id, rows in rank[:show]:
        ds = sorted(rows)
        emit(f"   +{len(rows):>4}  fund {fund_id:>6}  {ds[0]} .. {ds[-1]}")
    return accepted, total


async def run(article_ids, *, cache_dir, commit, held_archive=None,
              bridge=False, verbose=True):
    print(f"reading {len(article_ids)} statements ...")
    candidate, report = collect(article_ids, cache_dir=cache_dir,
                                verbose=verbose, bridge=bridge)
    print(f"\nstatements read {report['read']}, refused {report['refused']}, "
          f"rows {report['rows']}, mapped {report['mapped']}")
    if report["bridged"]:
        print(f"era-bridged names (proposed, still gated): {len(report['bridged'])}")
        for k, v in list(report["bridged"].items())[:10]:
            print(f"   {k[:40]:40} -> fund {v}")
    if report["unmapped"]:
        top = sorted(report["unmapped"].items(), key=lambda kv: -kv[1])[:8]
        print(f"unmapped printed names ({len(report['unmapped'])} distinct): "
              + ", ".join(f"{n!r}x{c}" for n, c in top))
    if not candidate:
        print("nothing to write.")
        return 0

    def _apply_bridges(held_all):
        """Second pass: value-corroborated bridges, merged into the candidate set."""
        if not bridge or not report["unmapped_rows"]:
            return
        from mubasher_statement import load_aliases as _la
        ok, bad = corroborate_bridges(report["unmapped_rows"], _la(), held_all)
        for key, fund_id in ok.items():
            report["bridged"][key] = fund_id
        for name, series in report["unmapped_rows"].items():
            from mubasher_statement import normalise_name as _nn
            fund_id = ok.get(_nn(name))
            if not fund_id:
                continue
            for d, v in series.items():
                candidate.setdefault(fund_id, {}).setdefault(d, v)
        print(f"\nbridges corroborated by value: {len(ok)}   rejected: {len(bad)}")
        for key, fund_id in list(ok.items())[:10]:
            print(f"   {key[:42]:42} -> fund {fund_id}")
        for name, why in bad[:6]:
            print(f"   rejected {name[:34]:34} {why}")

    # ---- offline rehearsal ------------------------------------------------
    if held_archive:
        if commit:
            raise SystemExit("--held-archive is a rehearsal against a snapshot; "
                             "it must never be combined with --commit.")
        held = load_held_archive(held_archive)      # all funds: bridges need them
        print(f"\n[offline rehearsal against {held_archive}]")
        _apply_bridges(held)
        report_plan(candidate, held, inferred=set(report['bridged'].values()))
        print("\nDRY RUN — no database was contacted, nothing written.")
        return 0

    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set — run this where the database "
                         "is reachable (the Hetzner runner), or pass "
                         "--held-archive to rehearse offline.")
    import asyncpg

    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        need = set(candidate)
        if bridge:
            need |= set(load_aliases().values())
        held = await load_held(conn, need)
        _apply_bridges(held)
        accepted, total_new = report_plan(
            candidate, held, inferred=set(report['bridged'].values()))

        if not commit:
            print("\nDRY RUN — nothing written. Re-run with --commit to write.")
            return 0
        if not accepted:
            print("\nnothing cleared reconciliation; nothing written.")
            return 0

        records = [(fund_id, date.fromisoformat(d), nav, SOURCE_TAG)
                   for fund_id, rows in accepted.items()
                   for d, nav in sorted(rows.items())]
        before = await conn.fetchval(
            "SELECT count(*) FROM nav_history WHERE source = $1", SOURCE_TAG)
        async with conn.transaction():
            await conn.executemany(SQL_WRITE, records)
        after = await conn.fetchval(
            "SELECT count(*) FROM nav_history WHERE source = $1", SOURCE_TAG)
        print(f"\noffered {len(records)} rows; rows stamped '{SOURCE_TAG}' "
              f"went {before} -> {after} (+{after - before}); the difference is "
              f"rows that already existed and were left untouched.")
        return 0
    finally:
        await conn.close()


# ==========================================================================
# self-test
# ==========================================================================
def _self_test() -> int:
    fails = []

    def check(label, cond):
        if not cond:
            fails.append(label)

    check("write is idempotent by construction",
          "ON CONFLICT (fund_id, date) DO NOTHING" in SQL_WRITE)
    check("never overwrites an existing NAV", "DO UPDATE" not in SQL_WRITE)
    check("every row is source-stamped", "$4::text" in SQL_WRITE
          and "source" in SQL_WRITE)
    check("source tag is the statement tag", SOURCE_TAG == "mubasher_statement")
    check("writes are explicitly typed", "$2::date" in SQL_WRITE
          and "$3::numeric" in SQL_WRITE)

    # A fund whose series cannot be reconciled must contribute NOTHING. Two
    # distinct ways that happens, and the writer must handle both:
    #   * every point rejected on the way in  -> ok stays True, accepted empty
    #   * the series drifts and fails closure -> ok False, accepted cleared
    # `ok` means "did not contradict data we already hold"; it is not a licence
    # to write. The writer must gate on `accepted`, which is what this asserts.
    held = {"2026-01-01": 10.0, "2026-01-02": 10.004, "2026-06-01": 12.0}
    runaway = {f"2026-0{m}-15": 10.0 * (1.5 ** m) for m in (2, 3, 4, 5)}
    r = reconcile_series("x", held, runaway)
    check("runaway series contributes nothing", not r.accepted)

    import inspect as _inspect
    src_plan = _inspect.getsource(report_plan)
    check("planner gates on accepted, not on ok", "if check.accepted:" in src_plan)
    check("planner skips funds that fail reconciliation", "if not check.ok:" in src_plan)
    check("refusals are surfaced", "REFUSED by reconciliation" in src_plan)

    # the offline rehearsal must be incapable of writing
    src_run2 = _inspect.getsource(run)
    check("rehearsal cannot be combined with --commit",
          "must never be combined with --commit" in src_run2)
    check("rehearsal contacts no database",
          "no database was contacted" in src_run2)
    check("write reports before/after counts so a no-op is visible",
          "before" in src_run2 and "after - before" in src_run2)

    # report_plan must not write anything, ever
    check("planner performs no writes",
          "INSERT" not in src_plan and "execute" not in src_plan)

    # manifest shapes — the wrapper form must not leak "_comment" as an id
    import tempfile as _tf

    def _mf(doc):
        with _tf.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            json.dump(doc, fh)
            return fh.name

    for label, doc, want in [
        ("wrapped", {"_comment": "x", "_count": 2,
                     "articles": {"4477495": "a", "4668930": "b"}},
         ["4477495", "4668930"]),
        ("bare map", {"4477495": "a"}, ["4477495"]),
        ("bare list", ["4477495", 4668930], ["4477495", "4668930"]),
    ]:
        path = _mf(doc)
        try:
            check(f"manifest shape: {label}", load_manifest(path) == want)
        finally:
            os.unlink(path)
    # -- era bridging --------------------------------------------------
    src_collect = _inspect.getsource(collect)
    check("bridge is opt-in", "bridge=False" in src_collect)
    check("collect never decides a bridge from a name",
          "propose_bridge" not in src_collect)
    check("collect records unmapped rows with their values",
          "unmapped_rows" in src_collect)

    # -- value-corroborated bridging -----------------------------------
    # Name resemblance is not identity. Name-only bridging put rows on fund
    # 5989 whose held NAV that day was 21.898 against a printed 0.83604.
    al2 = {normalise_name("HORUS - AFIM"): "5906",
           normalise_name("Aafaq Investment Fund"): "5751"}
    heldb = {"5906": {"2026-01-01": 20.0, "2026-01-02": 20.01, "2026-01-03": 20.02},
             "5751": {"2026-01-01": 250.0, "2026-01-02": 250.1, "2026-01-03": 250.2}}

    ok, bad = corroborate_bridges(
        {"Horus M.M": {"2026-01-01": 20.0, "2026-01-02": 20.01}}, al2, heldb)
    check("a bridge corroborated on 2 dates is accepted",
          ok.get(normalise_name("Horus M.M")) == "5906")

    ok, bad = corroborate_bridges(
        {"Horus M.M": {"2026-01-01": 20.0}}, al2, heldb)
    check("one corroborating date is not enough", not ok and bad)

    # the failure that motivated this: a similar name, wildly wrong values
    ok, bad = corroborate_bridges(
        {"Horus MM USD": {"2026-01-01": 0.836, "2026-01-02": 0.837}}, al2, heldb)
    check("a name match with no value agreement is refused", not ok)
    check("the refusal says why", bad and "match" in bad[0][1])

    src_learn2 = _inspect.getsource(learn_aliases)
    check("date[] is bound from date objects, not ISO strings",
          "date.fromisoformat(d) for d in dates" in src_learn2)

    src_bridge = _inspect.getsource(corroborate_bridges)
    check("bridging compares against held NAVs", "held.get(fund_id" in src_bridge)
    check("ties between candidates are refused", "corroborate equally well" in src_bridge)

    src_plan2 = _inspect.getsource(report_plan)
    check("inferred funds need a two-sided anchor",
          "before and after" in src_plan2)
    check("unanchored inferred funds are skipped and named",
          "unanchored" in src_plan2)

    # an inferred fund whose points run off the END of our data must be skipped:
    # closure has nothing to check against, which is exactly when a wrong bridge
    # would go unchallenged.
    held_x = {"2026-01-01": 10.0, "2026-01-02": 10.004, "2026-01-05": 10.016}
    tail = {"2026-02-01": 10.2, "2026-02-02": 10.21}          # beyond our last date
    acc, tot = report_plan({"9001": tail}, {"9001": held_x}, inferred={"9001"}, quiet=True)
    check("inferred fund with no closing anchor is skipped", tot == 0)

    middle = {"2026-01-03": 10.008, "2026-01-04": 10.012}     # enclosed
    acc, tot = report_plan({"9001": middle}, {"9001": held_x}, inferred={"9001"}, quiet=True)
    check("inferred fund enclosed by held data is allowed through", tot == 2)

    # the same tail is fine for a fingerprinted (non-inferred) fund
    acc, tot = report_plan({"9001": tail}, {"9001": held_x}, quiet=True)
    check("non-inferred funds are not held to the enclosure rule", tot >= 1)

    src_learn = _inspect.getsource(learn_aliases)
    check("alias learning writes no NAV rows",
          "INSERT" not in src_learn and "SQL_WRITE" not in src_learn)
    check("alias learning requires >=3 dates", "min_dates=3" in src_learn)
    check("alias learning intersects candidates across dates",
          "set.intersection" in src_learn)
    check("alias learning quarantines ambiguity", "ambiguous" in src_learn)

    check("metadata keys never become article ids",
          "_comment" not in load_manifest(_mf(
              {"_comment": "x", "articles": {"4477495": "a"}})))

    src = __import__("inspect").getsource(run)
    check("commit is opt-in", "if not commit:" in src)
    check("dry run reports before writing", "DRY RUN" in src)

    if fails:
        print("SELF-TEST FAILURES:")
        for f in fails:
            print("  -", f)
        return 1
    print("self-test: all checks passed")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", help="JSON object or list of article ids")
    ap.add_argument("--articles", nargs="*", default=None, help="explicit article ids")
    ap.add_argument("--cache-dir", default=None)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--bridge", action="store_true",
                    help="allow era-renamed fund names to be proposed against known "
                         "aliases; every proposal is still gated by reconciliation")
    ap.add_argument("--learn-aliases", metavar="OUT",
                    help="regenerate the alias table from the statements and write "
                         "it to OUT (reads the database, writes no NAV rows)")
    ap.add_argument("--held-archive",
                    help="rehearse offline against a nav-archive .csv.gz "
                         "snapshot instead of the database (implies dry run)")
    ap.add_argument("--commit", action="store_true",
                    help="actually write (default is a dry run)")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return _self_test()

    ids = list(args.articles or [])
    if args.manifest:
        ids += load_manifest(args.manifest)
    if not ids:
        ap.error("--manifest or --articles required")
    if args.limit:
        ids = ids[:args.limit]
    if args.learn_aliases:
        async def _learn():
            if not DATABASE_URL:
                raise SystemExit("DATABASE_URL is required to learn aliases.")
            import asyncpg
            conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
            try:
                await learn_aliases(conn, ids, cache_dir=args.cache_dir,
                                    out_path=args.learn_aliases)
            finally:
                await conn.close()
            return 0
        return asyncio.run(_learn())

    return asyncio.run(run(ids, cache_dir=args.cache_dir, commit=args.commit,
                           held_archive=args.held_archive, bridge=args.bridge))


if __name__ == "__main__":
    sys.exit(main())
