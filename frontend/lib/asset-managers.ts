/**
 * The 23 Egyptian asset-management houses harvested from snduk (Arabic names,
 * real logos in a public Supabase bucket, establishment year, chairman, AUM,
 * fund count). Held STATICALLY in the frontend — the DB asset_managers table is
 * unreliable to populate (read-only Supabase windows), and this dataset is small
 * and rarely changes. A fund is matched to its house by normalized, Arabic-aware,
 * order-independent token-set equality (mgrTokenKey) — the same matcher that
 * rejects "اتون فاروس" (Aton Pharos) for a "فاروس" (Pharos) fund. Powers the
 * detail-page hero logo + "About the manager" section and the listing-card logo.
 */

export type AssetManager = {
    name: string;
    code: string | null;
    establishment_year: string | null;
    chairman: string | null;
    capital: string | null;
    total_aum: string | null;
    fund_count: number | null;
    logo_url: string | null;
};

const MGR_STOP = new Set([
    'لاداره', 'لادارة', 'لإدارة', 'لادار', 'واداره', 'وادارة', 'وإدارة', 'لتكوين',
    'الاصول', 'الأصول', 'الاستثمارات', 'الاستثمار', 'صناديق', 'الماليه', 'المالية', 'المحافظ',
    'القابضه', 'القابضة', 'شركه', 'شركة', 'مصر', 'ايجيبت', 'الاوراق', 'للاستثمارات', 'للاستثمار',
    'asset', 'management', 'capital', 'for', 'investment', 'investments', 'securities', 'holding',
    'company', 'and', 'funds', 'fund', 'the', 'egypt',
]);

/**
 * Normalized, order-independent token key for a manager name. Prefers Arabic
 * tokens (embedded English translations like "(NI Capital)" are dropped so they
 * cannot block a match), but keeps distinctive Arabic tokens so "اتون فاروس"
 * never collapses to "فاروس".
 */
export function mgrTokenKey(name: string | null | undefined): string | null {
    if (!name || !name.trim()) return null;
    const x = name
        .toLowerCase()
        .replace(/[\u064B-\u0652\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
    const all = x.split(/[^a-z0-9\u0600-\u06FF]+/).filter((w) => w.length > 1 && !MGR_STOP.has(w));
    const arabic = all.filter((w) => /[\u0600-\u06FF]/.test(w));
    const toks = arabic.length ? arabic : all;
    return toks.length ? Array.from(new Set(toks)).sort().join(' ') : null;
}

export const ASSET_MANAGERS: AssetManager[] = [
    { name: 'أتون فاروس لإدارة الاصول', code: 'PHAROS', establishment_year: '2020', chairman: null, capital: null, total_aum: '675435413', fund_count: 1, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1775387582300-h4co7m1ivqf.jpeg' },
    { name: 'أكيومن لإدارة صناديق الاستثمار', code: 'ACUMEN', establishment_year: '2010', chairman: null, capital: null, total_aum: '30247536', fund_count: 1, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774432627775-saxbtxbl5ha.png' },
    { name: 'ألفا لإدارة الاستثمارات المالية', code: 'ALPHA', establishment_year: '2009', chairman: null, capital: '10,000,000,000', total_aum: '907932416', fund_count: 2, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1776002534667-rcweoca38f.png' },
    { name: 'إن اي كابيتال (NI Capital)', code: 'NI_CAPITAL', establishment_year: '2015', chairman: 'محمد متولي', capital: null, total_aum: '11675557616', fund_count: 5, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774727942953-62n959yxmg.png' },
    { name: 'اتش سى للأوراق المالية', code: 'HC', establishment_year: '1996', chairman: 'حسين شكري', capital: '5,500,000,000 ج.م', total_aum: '499412666', fund_count: 3, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774439391840-qkrki2kvefk.jpg' },
    { name: 'ازيموت للاستثمارات مصر', code: 'AZIMUT_EG', establishment_year: '2019', chairman: 'أحمد أبو السعد', capital: '~ 10,000,000,000 ج.م', total_aum: '16775258231', fund_count: 10, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774221738819-fdogjmxke2.jpg' },
    { name: 'اسباير كابيتال القابضة للاستثمارات المالية', code: 'ASPIRE', establishment_year: '1997', chairman: 'Hana Mohamed Al Hilali', capital: '5,000,000,000', total_aum: '409485643', fund_count: 2, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1780224854197-3civrro8xmf.png' },
    { name: 'العربي الإفريقي لإدارة الاستثمارات', code: 'AAIM', establishment_year: '2006', chairman: 'محمد مصطفى', capital: '80,000,000,000 ج.م', total_aum: '64236177434', fund_count: 16, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774131178493-a5tsjqb19j.jpeg' },
    { name: 'النعيم للاستثمارات المالية', code: 'NAEEM', establishment_year: '2005', chairman: 'Hussein Shobokshi', capital: null, total_aum: '120359595', fund_count: 2, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774436528781-gztk7zaayx.jpeg' },
    { name: 'الوطني مصر للاستثمارات المالية', code: 'NBK_CAPITAL', establishment_year: '2010', chairman: null, capital: null, total_aum: '279057428', fund_count: 3, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774450813994-47huedj6lac.jpg' },
    { name: 'ايه اي ام للاستثمارات الماليه', code: 'AIM', establishment_year: '2006', chairman: null, capital: '5,000,000,000 ج.م', total_aum: '23677061', fund_count: 1, logo_url: null },
    { name: 'برايم إنفستمنتس لإدارة الإستثمارات المالية', code: 'PRIME', establishment_year: '1995', chairman: 'احمد امام الليثي', capital: '13000000000', total_aum: '422283522', fund_count: 3, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1780584876001-huepja0r2fr.png' },
    { name: 'بلتون لإدارة صناديق الاستثمار', code: 'BELTONE', establishment_year: '2002', chairman: 'داليا خورشيد', capital: '26,500,000,000 ج.م', total_aum: '8228097729', fund_count: 17, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774122498557-tsdvaprwjgr.png' },
    { name: 'بي إف أي لإدارة الأصول', code: 'PFI', establishment_year: '2023', chairman: null, capital: '6,000,000,000', total_aum: '2659753746', fund_count: 2, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1780069045380-dulguau48t9.jpeg' },
    { name: 'تارجت لتكوين وإدارة صناديق الاستثمار', code: 'TARGET', establishment_year: '2006', chairman: 'نور الدين محمد', capital: null, total_aum: '117250493', fund_count: 1, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1781539747201-fubf7cekck.png' },
    { name: 'ثاندر لإدارة الأصول', code: 'THNDR', establishment_year: '2025', chairman: null, capital: 'غير محدد', total_aum: '47165263', fund_count: 1, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1778107843964-euxmtabowt.png' },
    { name: 'جرانيت لادارة صناديق الاستثمار', code: 'GRANITE', establishment_year: '2023', chairman: null, capital: null, total_aum: '2292782257', fund_count: 1, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774293784955-danvdww6l9v.png' },
    { name: 'سي آي لإدارة الأصول', code: 'CIAM', establishment_year: '2004', chairman: 'د. عمرو أبو العنين', capital: '+ 102,000,000,000 ج.م', total_aum: '73413427850', fund_count: 28, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774132264570-ppkz0ixlrrg.jpeg' },
    { name: 'سي إف إتش لادراة الأصول', code: 'CFH', establishment_year: '1995', chairman: 'Amr El Aroussy', capital: '4,500,000,000 ج.م', total_aum: '1107584302', fund_count: 3, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1776356345422-ly9ayhv2qw.webp' },
    { name: 'شركة زالدي للاستثمارات', code: 'ZALDI', establishment_year: '2008', chairman: 'أحمد عزت', capital: '11,000,000,000 ج.م', total_aum: '3436792443', fund_count: 4, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1777804781543-oegu7p0i54d.jpeg' },
    { name: 'شركه الاهلي لاداره الاستثمارات الماليه', code: 'AFIM', establishment_year: '1994', chairman: 'كريم ابو النجا', capital: '+ 60,000,000,000 ج.م', total_aum: '65832474613', fund_count: 13, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774221950049-p8e59hxyh.webp' },
    { name: 'مباشر لتكوين وإدارة محافظ الأوراق المالية', code: 'MUBASHER', establishment_year: '2013', chairman: null, capital: null, total_aum: '350155002', fund_count: 2, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774269629811-tztc3bdixmi.jpg' },
    { name: 'هيرمس لإدارة المحافظ المالية وصناديق الاستثمار', code: 'HERMES', establishment_year: '1996', chairman: 'كريم عوض', capital: null, total_aum: '20261932086', fund_count: 17, logo_url: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/logos/asset-managers/1774788549018-taqryf1xok.jpg' },
];

// Precomputed key -> manager, built once.
const BY_KEY = new Map<string, AssetManager>();
for (const m of ASSET_MANAGERS) {
    const k = mgrTokenKey(m.name);
    if (k && !BY_KEY.has(k)) BY_KEY.set(k, m);
}

/** Match a fund's manager name(s) to a house profile, or null. Precise: only an
 *  exact normalized token-set match counts (no substring false positives). */
export function matchAssetManager(...names: Array<string | null | undefined>): AssetManager | null {
    for (const n of names) {
        const k = mgrTokenKey(n);
        if (k && BY_KEY.has(k)) return BY_KEY.get(k)!;
    }
    return null;
}
