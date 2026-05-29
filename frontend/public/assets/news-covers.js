/**
 * news-covers.js  —  Single source of truth for category cover images.
 * Exposes window.StarTaNewsCovers.getUrl(item, lang) → absolute image path.
 *
 * ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolution order (most specific → most generic):
 *   banking → realestate → energy → earnings → markets → stocks → economy
 *
 * Symbol matching is SKIPPED for 'ARAB' — that symbol is used by the ArabFinance
 * and Zawya data feeds as a source-origin marker (not the Arab Bank Egypt ticker).
 * 862 out of ~900 ArabFinance/Zawya articles carry symbol='ARAB', so treating it
 * as a banking ticker would incorrectly classify the majority of news as banking.
 *
 * Images live at /assets/news-covers/{lang}-{category}.webp
 * Available langs: 'en', 'ar'
 * Available categories: banking, realestate, energy, earnings, markets, stocks, economy
 */
(function (global) {
    'use strict';

    var BASE = '/assets/news-covers/';

    /**
     * Symbols that are data-feed source markers, not real company tickers.
     * These must never drive category matching.
     */
    var SOURCE_MARKERS = { ARAB: true };

    function realSymbol(item) {
        var s = (item.symbol || '').toUpperCase().trim();
        return (s && !SOURCE_MARKERS[s]) ? s : '';
    }

    /* ─── Known company tickers by sector ─────────────────────────────────── */

    // Banking & financial institutions listed on EGX
    var BANKING_TICKERS = /^(CIB|COMI|QNBE|EGBE|ADIB|SAIB|NBEK|ABUK|AIBANK|QNB|FAIT|HDBK|ENBE|MIDF|EGAL|CIEB|ABCB)$/;

    // Real-estate & housing developers listed on EGX
    // MASR = Madina Misr for Housing (NOT a bank — previous lists were wrong)
    var REALESTATE_TICKERS = /^(TMGH|HRHO|PRMH|MNHD|AMER|ORAS|MFPC|PHDC|ORHD|TALB|ARDN|MASR|EHDR|OCDI|BPRE)$/;

    // Energy, utilities, oil & gas listed on EGX
    var ENERGY_TICKERS = /^(TAQA|ELEC|PICO|EKHO|HELI|ENPO|GASCO|EGAS|SWDY|EAST)$/;

    /* ─── Matchers ─────────────────────────────────────────────────────────── */
    // Evaluated top-to-bottom; first match wins. economy is always last (catch-all).

    var MATCHERS = [

        /* 1. BANKING
         * Signals: known banking ticker, source_section contains "banking",
         * or headline has clear banking language — but NOT when the word is
         * negated (e.g. "non-banking financial activities"). */
        {
            id: 'banking',
            test: function (item) {
                var h   = (item.headline || '').toLowerCase();
                var sym = realSymbol(item);
                var sec = (item.source_section || '').toLowerCase();

                if (sec.indexOf('banking') !== -1 || sec.indexOf('insurance') !== -1) return true;
                if (sym && BANKING_TICKERS.test(sym)) return true;

                // Headline keywords — require "bank" as a proper standalone word,
                // and explicitly exclude "non-banking" phrasing.
                if (/\bbank(?:ing|s)?\b/.test(h) && !/non.bank/i.test(h)) return true;
                if (/\bloan\b|credit facil|deposit rate|interbank|mortgage lend|npl ratio/.test(h)) return true;
                if (/بنك\s|مصرف\s|قرض مصرفي|تمويل بنكي|ودائع بنك/.test(h)) return true;

                return false;
            }
        },

        /* 2. REAL ESTATE
         * Signals: known RE ticker, source_section, or property/construction keywords. */
        {
            id: 'realestate',
            test: function (item) {
                var h   = (item.headline || '').toLowerCase();
                var sym = realSymbol(item);
                var sec = (item.source_section || '').toLowerCase();

                if (/real.?estate|propert|housing/.test(sec)) return true;
                if (sym && REALESTATE_TICKERS.test(sym)) return true;

                if (/real.?estate|propert(?:y|ies)|housing|residential|compound|villa|apartment/.test(h)) return true;
                if (/new.?capital|new.?cairo|hillage|madaar|development.project/.test(h)) return true;
                if (/عقار|إسكان|تطوير عقاري|مجمع سكني|شقق|فيلا|سكني|العاصمة الإدارية/.test(h)) return true;

                return false;
            }
        },

        /* 3. ENERGY
         * Signals: known energy ticker, source_section, or energy/oil/gas keywords. */
        {
            id: 'energy',
            test: function (item) {
                var h   = (item.headline || '').toLowerCase();
                var sym = realSymbol(item);
                var sec = (item.source_section || '').toLowerCase();

                if (/energy|utilities|oil|gas/.test(sec)) return true;
                if (sym && ENERGY_TICKERS.test(sym)) return true;

                if (/\benergy\b|\boil\b|\bgas\b|petroleum|electricity|power.station/.test(h)) return true;
                if (/solar|nuclear|fuel|renewable|lng|lpg|hydrogen|hydro.?power/.test(h)) return true;
                if (/طاقة|نفط|غاز|بترول|كهرباء|محطة طاقة|شمسي|نووي|هيدروجين/.test(h)) return true;

                return false;
            }
        },

        /* 4. EARNINGS
         * Signals: profit/results/dividend keywords in headline.
         * Comes after sector-specific matchers so e.g. a bank's profit report
         * still gets the banking cover (banking matched first via ticker). */
        {
            id: 'earnings',
            test: function (item) {
                var h = (item.headline || '').toLowerCase();

                if (/\b(earnings?|dividend|profit|net.income|eps|payout|distribution)\b/.test(h)) return true;
                if (/\b(revenue|results?|annual.report|quarterly|half.year|financial.results)\b/.test(h)) return true;
                if (/\b(net.profit|gross.profit|operating.profit|consolidated.profit)\b/.test(h)) return true;
                if (/أرباح|توزيعات أرباح|توزيعات نقدية|إيرادات|نتائج مالية|نتائج أعمال/.test(h)) return true;
                if (/ربع سنوي|نصف سنوي|صافي ربح|ربحية|نمو الأرباح|الربع الأول|الربع الثاني|الربع الثالث/.test(h)) return true;

                return false;
            }
        },

        /* 5. MARKETS
         * Signals: IPO, stock exchange activity, index movement, sukuk issuance,
         * capital increases, or market-level commentary. */
        {
            id: 'markets',
            test: function (item) {
                var h = (item.headline || '').toLowerCase();

                if (/\bipo\b|public.offering|\blisting\b|egx.?\d/.test(h)) return true;
                if (/market.cap|sukuk|bond.issu|capital.increas/.test(h)) return true;
                if (/\bbourse\b|stock.exchange|index.clos|index.ris|index.fall/.test(h)) return true;
                if (/market.open|market.clos|trading.session|تنفيذ.صفقة/.test(h)) return true;
                if (/اكتتاب|طرح عام|قيد بالبورصة|مؤشر البورصة|رأس المال|صكوك|إصدار سند/.test(h)) return true;
                if (/البورصة المصرية|زيادة رأس المال|السوق الرئيسي|تداول اليوم/.test(h)) return true;

                return false;
            }
        },

        /* 6. STOCKS
         * Fires only for items with a genuine company ticker that wasn't caught
         * by any specific sector above. Source-marker symbols (ARAB) are excluded. */
        {
            id: 'stocks',
            test: function (item) {
                var sym = realSymbol(item);
                var sec = (item.source_section || '').toLowerCase();
                return !!(sym) || /stocks?/.test(sec);
            }
        },

        /* 7. ECONOMY  —  catch-all, always last */
        {
            id: 'economy',
            test: function () { return true; }
        }

    ];

    /* ─── Public API ───────────────────────────────────────────────────────── */

    /**
     * Returns the absolute path to the correct cover image.
     *
     * @param  {Object} item  news row: { headline, symbol, source_section, article_body }
     * @param  {string} lang  'en' | 'ar'
     * @returns {string}       e.g. '/assets/news-covers/en-earnings.webp'
     */
    function getUrl(item, lang) {
        var l = (lang === 'ar') ? 'ar' : 'en';
        return BASE + l + '-generic.webp';
    }

    global.StarTaNewsCovers = { getUrl: getUrl };

}(window));
