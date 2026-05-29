import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db-server";

type ProfileRow = {
    symbol: string;
    company_name: string | null;
    exchange_code: string | null;
    source_url: string;
    as_of_date: string | null;
    last_price: string | null;
    currency: string | null;
    change_percent: string | null;
    change_value: string | null;
    best_bid: string | null;
    best_ask: string | null;
    performance_1w: string | null;
    performance_1m: string | null;
    performance_3m: string | null;
    disclaimer: string | null;
    header_raw: string | null;
    tabs: Record<string, unknown>;
    raw_payload: Record<string, unknown>;
    extracted_at: string;
    updated_at: string;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbolParam = searchParams.get("symbol");
        const symbol = symbolParam?.trim().toUpperCase() || null;

        let profileResult;
        if (symbol) {
            profileResult = await db.query(
                `
                SELECT *
                FROM egx_company_profile_v2
                WHERE symbol = $1
                LIMIT 1
                `,
                [symbol]
            );
        } else {
            profileResult = await db.query(
                `
                SELECT *
                FROM egx_company_profile_v2
                ORDER BY extracted_at DESC
                LIMIT 1
                `
            );
        }

        const row = profileResult.rows[0] as ProfileRow | undefined;
        if (!row) {
            return NextResponse.json(
                { error: "Company profile v2 data not found. Run scraper first." },
                { status: 404 }
            );
        }

        const symbolsResult = await db.query(
            `
            SELECT symbol, company_name, extracted_at
            FROM egx_company_profile_v2
            ORDER BY symbol ASC
            `
        );

        return NextResponse.json({
            profile: row,
            available_symbols: symbolsResult.rows,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown server error";
        console.error("[API /company-profile-v2 ERROR]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

