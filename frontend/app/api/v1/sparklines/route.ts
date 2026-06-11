import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

/**
 * Batch sparkline endpoint for stocks.
 * GET /api/v1/sparklines?symbols=COMI,SWDY,HRHO&period=1m
 * -> { "COMI": [c1, c2, ...], "SWDY": [...] }  (real daily closes, ascending)
 *
 * One query for the whole list so market/movers/watchlist screens render real
 * mini-charts without N round-trips.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const period = (searchParams.get('period') || '1m').toLowerCase();

  let days = 35;
  switch (period) {
    case '1w': days = 12; break;
    case '1m': days = 35; break;
    case '3m': days = 95; break;
    case '6m': days = 185; break;
    case '1y': days = 370; break;
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 320);

  if (!symbols.length) return NextResponse.json({});

  // ohlc_data may store either bare ("COMI") or suffixed ("COMI.CA") symbols.
  const expanded = Array.from(new Set(symbols.flatMap((s) => [s, `${s}.CA`])));

  try {
    // `days` comes from a fixed switch above, but keep SQL fully parametrized so
    // a future edit can never turn this into string-built SQL (audit 2026-06-11).
    const result = await db.query(
      `SELECT symbol, date, close
         FROM ohlc_data
        WHERE symbol = ANY($1)
          AND date >= CURRENT_DATE - $2::int
        ORDER BY date ASC`,
      [expanded, days],
    );

    const out: Record<string, number[]> = {};
    for (const row of result.rows) {
      const key = String(row.symbol).toUpperCase().replace('.CA', '');
      const close = Number(row.close);
      if (!Number.isFinite(close)) continue;
      (out[key] ||= []).push(close);
    }
    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
