import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Read the canonical single-source-of-truth view. latest_nav / last_nav_date
        // are derived LIVE from nav_history by funds_view, so the headline can never
        // drift from the chart (both read nav_history).
        const result = await db.query(
            `SELECT * FROM funds_view WHERE fund_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        const row = result.rows[0];
        // Canonical NAV = live value from nav_history; never the drifted stored copy.
        row.latest_nav = row.live_latest_nav ?? (Number(row.latest_nav) || null);

        // Unified SUPERSET: include peers + actions so this single Supabase-backed
        // endpoint loses nothing vs the legacy backend get_fund_details (which can
        // then be retired). Each side-table is isolated: a schema issue there can
        // never break the core fund payload.
        const fid = row.fund_id;
        try {
            const peers = await db.query(
                `SELECT * FROM fund_peers WHERE fund_id = $1 ORDER BY peer_rank`, [fid]);
            row.peers = peers.rows;
        } catch { row.peers = []; }
        try {
            const actions = await db.query(
                `SELECT * FROM fund_actions WHERE fund_id = $1 ORDER BY action_date DESC`, [fid]);
            row.actions = actions.rows;
        } catch { row.actions = []; }
        // Risk metrics (volatility / max_drawdown / 52w) computed from nav_history
        // into a companion table. Isolated like peers/actions: a missing table or
        // schema issue here can never break the core fund payload.
        try {
            const rm = await db.query(
                `SELECT * FROM fund_risk_metrics WHERE fund_id = $1`, [String(fid)]);
            row.risk_metrics = rm.rows[0] ?? null;
        } catch { row.risk_metrics = null; }

        return NextResponse.json(row);
    } catch (error: any) {
        return apiError('/funds/[id]', error);
    }
}
