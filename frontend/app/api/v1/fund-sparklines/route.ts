import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

/**
 * Batch sparkline endpoint for funds.
 * GET /api/v1/fund-sparklines?ids=2738,2740&period=1y
 * -> { "2738": [nav1, nav2, ...], ... }  (real NAV history, ascending)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids') || '';
  const period = (searchParams.get('period') || '1y').toLowerCase();

  let days = 370;
  switch (period) {
    case '3m': days = 95; break;
    case '6m': days = 185; break;
    case '1y': days = 370; break;
    case '3y': days = 1100; break;
  }

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (!ids.length) return NextResponse.json({});

  try {
    const result = await db.query(
      `SELECT fund_id, date, nav
         FROM nav_history
        WHERE fund_id = ANY($1)
          AND date >= NOW() - INTERVAL '${days} days'
        ORDER BY date ASC`,
      [ids],
    );

    const out: Record<string, number[]> = {};
    for (const row of result.rows) {
      const key = String(row.fund_id);
      const nav = Number(row.nav);
      if (!Number.isFinite(nav)) continue;
      (out[key] ||= []).push(nav);
    }
    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
