#!/usr/bin/env python3
"""
Fund-name matching between EIMA's English names and our Mubasher catalogue.

WHY A DEDICATED MODULE
----------------------
The first EIMA backfill matched only 90 of 186 report names, so 96 funds were
skipped before any data check could even run. The failures were not noise — they
were six repeatable patterns, all visible in the live log:

  EIMA name                    our catalogue name                        problem
  ---------------------------  ----------------------------------------  ---------------
  CIB Fund I (Osoul)           Commercial International Bank Money Mkt   abbreviation
  ALEXBANK Fund I              Bank of Alexandria Mutual Fund 1          abbrev + numeral
  Banque Misr Fund III         Banque Misr Mutual Fund 3                 roman vs arabic
  Momentum                     Cairo Capital Cumulative Fund Momentum    brand buried
  SAIB & ADIB Fund (Sanabel)   Sanabel Equity Fund Islamic Sharia        different prefix
  Ebank Fund II                (no counterpart)                          genuinely absent

The root cause of most of them is the scorer. `SequenceMatcher.ratio()` divides
by TOTAL length, so a short name fully contained in a long one scores badly:
"sanabel" inside "sanabel equity fund islamic sharia compliant" scored 0.30 and
lost to an unrelated fund at 0.48. Length difference was dominating identity.

WHAT THIS DOES INSTEAD
----------------------
  * IDF-weighted token overlap. "bank", "fund", "money", "market" appear in
    almost every Egyptian fund name and carry nearly no information; "sanabel",
    "osoul", "wethaq" identify a fund almost by themselves. Weighting by rarity
    is what lets a one-word brand match a seven-word official title.
  * Containment rather than symmetric similarity, because EIMA's names are short
    and ours are long by convention, not by disagreement.
  * Institution aliases (CIB, ALEXBANK, NBE, ABK, SAIB, AAIB...). Domain fact,
    stable, and the abbreviation is exactly the token IDF would rate highest.
  * Roman-to-arabic numerals, MATCHED not ignored — "Fund I" and "Fund II" are
    different funds, and conflating them would be worse than not matching at all.
  * The management company as a second signal. Two similarly-named funds run by
    different houses are different funds; agreement is corroboration, and
    disagreement is a red flag rather than a disqualifier (EIMA and Mubasher
    sometimes record a manager mid-transfer).

PRECISION STILL COMES FROM THE DATA, NOT FROM HERE. Every match this module
proposes is only a hypothesis; eima_backfill.reconcile() checks it against NAV we
already hold and rejects anything that disagrees. So this module is deliberately
tuned for RECALL — a wrong guess costs a rejected candidate, while a missed match
costs a fund its history.

PURE (stdlib only) so the rules are unit tested against the real names.
"""
from __future__ import annotations

import math
import re
from collections import Counter

# Words carried by so many Egyptian fund names that they identify nothing. Kept
# separate from IDF because a small catalogue can make even these look rare.
STOPWORDS = {
    "fund", "funds", "investment", "investments", "open", "end", "ended",
    "the", "of", "for", "and", "egypt", "egyptian", "mutual", "co", "company",
    "sae", "s", "a", "e", "with", "in", "by", "cumulative", "periodic",
    "return", "returns", "income", "daily", "capital", "asset", "management",
}

# Institution abbreviations. EIMA writes the market abbreviation, our catalogue
# writes the legal name; without this they share no tokens at all.
ALIASES: dict[str, tuple[str, ...]] = {
    "cib": ("commercial", "international", "bank"),
    "alexbank": ("bank", "alexandria"),
    "nbe": ("national", "bank"),
    "nbk": ("national", "bank", "kuwait"),
    "abk": ("ahli", "bank", "kuwait"),
    "aaib": ("arab", "african", "international", "bank"),
    "saib": ("societe", "arabe", "internationale", "banque"),
    "adib": ("abu", "dhabi", "islamic", "bank"),
    "qnb": ("qatar", "national", "bank"),
    "fab": ("first", "abu", "dhabi"),
    "hdb": ("housing", "development", "bank"),
    "sib": ("suez", "canal", "bank"),
    "eg": ("egypt",),
    "az": ("azimut",),
    "ci": ("commercial", "international"),
    "hc": ("hc",),
    "gig": ("gig",),
    "kfh": ("kuwait", "finance", "house"),
    "fibe": ("faisal", "islamic", "bank"),
    "banque": ("bank",),
    "misr": ("misr",),
}

_ROMAN = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
          "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10"}


def tokens(name: str) -> list[str]:
    """
    Normalised, alias-expanded, numeral-unified tokens.

    Series numbers survive as digits on purpose: "Fund I" -> "1" and
    "Mutual Fund 1" -> "1" must meet, while "Fund II" -> "2" must not.
    """
    s = (name or "").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    out: list[str] = []
    for t in s.split():
        if t in _ROMAN:
            out.append(_ROMAN[t])
            continue
        if t in ALIASES:
            out.extend(ALIASES[t])
            continue
        # Single characters are noise EXCEPT digits: our catalogue writes
        # "Mutual Fund 1" while EIMA writes "Fund I". Dropping the bare "1"
        # while keeping the roman-mapped "1" made the comparison asymmetric, so
        # a series number existed on one side only and could never disagree —
        # which silently disabled the series check entirely.
        if t in STOPWORDS or (len(t) < 2 and not t.isdigit()):
            continue
        out.append(t)
    return out


def idf(corpus: list[list[str]]) -> dict[str, float]:
    """Inverse document frequency over the catalogue's own token distribution."""
    n = max(1, len(corpus))
    df: Counter = Counter()
    for toks in corpus:
        df.update(set(toks))
    return {t: math.log(1.0 + n / (1.0 + c)) for t, c in df.items()}


def _series_number(toks: list[str]) -> str | None:
    """The fund's series number, if it has one. 'Fund 2' must never match 'Fund 3'."""
    nums = [t for t in toks if t.isdigit() and len(t) <= 2]
    return nums[-1] if nums else None


def score(a_toks: list[str], b_toks: list[str], weights: dict[str, float]) -> float:
    """
    IDF-weighted containment in [0, 1].

    Containment against the SMALLER side, because EIMA writes "Sanabel" where we
    write "Sanabel Equity Fund Islamic Sharia Compliant" — that is a naming
    convention, not a disagreement, and symmetric similarity punishes it.
    """
    a, b = set(a_toks), set(b_toks)
    if not a or not b:
        return 0.0
    shared = a & b
    if not shared:
        return 0.0
    # A shared series number is not identity. "Ebank Fund II" and "Banque Misr
    # Mutual Fund 2" have nothing in common but the digit 2, and matching on that
    # alone would hand one fund's history to another. Require agreement on at
    # least one real word.
    if not any(not t.isdigit() for t in shared):
        return 0.0
    # A token absent from the catalogue is MAXIMALLY distinctive, not averagely
    # so. Defaulting unknowns to 1.0 put them mid-range, which let
    # "Some Bank Money Market Fund" and "Other Bank Money Market Fund" score 0.75
    # on nothing but the boilerplate they share — the words that actually
    # distinguished them were the ones being discounted.
    default = max(weights.values(), default=1.0)
    w = lambda ts: sum(weights.get(t, default) for t in ts)  # noqa: E731
    wa, wb = w(a), w(b)
    if wa <= 0 or wb <= 0:
        return 0.0
    # Best of both directions. Alias expansion inflates one side ("SAIB & ADIB"
    # becomes eight tokens) and a single fixed denominator then measures
    # containment against a name neither source actually wrote.
    base = min(1.0, max(w(shared) / wa, w(shared) / wb))

    # A series number that disagrees is DISQUALIFYING, not merely penalised.
    # Softening it to a multiplier was not enough: greedy assignment still put
    # EIMA's "Banque Misr Fund II" on our "Banque Misr Mutual Fund 1" and its
    # "Fund III" on "Mutual Fund 2", because a discounted score still beat every
    # alternative. Fund 2 and fund 3 are different funds holding different
    # assets; a confident wrong answer here is worse than no answer, and it would
    # consume the correct fund's slot under one-to-one assignment.
    sa, sb = _series_number(a_toks), _series_number(b_toks)
    if sa and sb and sa != sb:
        return 0.0
    if sa and sb and sa == sb:
        base = min(1.0, base + 0.10)
    return base


def match_funds(eima_rows: list[dict], catalogue: list[dict],
                floor: float = 0.45, manager_bonus: float = 0.12) -> dict[str, tuple[str, float]]:
    """
    Assign EIMA names to fund ids, one-to-one, best-scoring first.

    `eima_rows`: {"name", "manager"}.  `catalogue`: {"fund_id", "en", "mgr_en"}.

    One-to-one because a fund id is a unique thing — in the first live run three
    different EIMA names all claimed fund 2703, and at most one could be right.
    """
    cat_toks = {c["fund_id"]: tokens(c.get("en", "")) for c in catalogue}
    weights = idf(list(cat_toks.values()) + [tokens(r["name"]) for r in eima_rows])
    mgr_toks = {c["fund_id"]: set(tokens(c.get("mgr_en", ""))) for c in catalogue}

    pairs = []
    for r in eima_rows:
        et = tokens(r["name"])
        em = set(tokens(r.get("manager") or ""))
        for c in catalogue:
            fid = c["fund_id"]
            s = score(et, cat_toks[fid], weights)
            if s <= 0:
                continue
            # The house that runs the fund is corroboration, never the whole case.
            if em and mgr_toks[fid] and (em & mgr_toks[fid]):
                s = min(1.0, s + manager_bonus)
            if s >= floor:
                pairs.append((s, r["name"], fid))

    pairs.sort(key=lambda p: (-p[0], p[1], p[2]))
    used_name: set[str] = set()
    used_fid: set[str] = set()
    out: dict[str, tuple[str, float]] = {}
    for s, name, fid in pairs:
        if name in used_name or fid in used_fid:
            continue
        out[name] = (fid, s)
        used_name.add(name)
        used_fid.add(fid)
    return out
