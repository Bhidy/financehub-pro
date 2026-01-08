import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase() {
    if (!supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error("Supabase credentials not configured");
        }

        supabase = createClient(url, key);
    }
    return supabase;
}

export async function GET(request: Request) {
    try {
        const client = getSupabase();

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get("sort_by") || "volume";
        const order = searchParams.get("order") || "desc";
        const limit = parseInt(searchParams.get("limit") || "200");

        // Validate sort column
        const validColumns = ["volume", "last_price", "change_percent", "symbol", "trades", "updated_at"];
        const sortColumn = validColumns.includes(sortBy) ? sortBy : "volume";
        const ascending = order.toLowerCase() === "asc";

        const { data, error } = await client
            .from("egx_watchlist")
            .select("symbol, description, last_price, change, change_percent, bid, ask, bid_qty, ask_qty, volume, trades, turnover, updated_at")
            .order(sortColumn, { ascending, nullsFirst: false })
            .limit(limit);

        if (error) {
            console.error("EGX Watchlist Error:", error);
            return NextResponse.json(
                { status: "error", message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: "success",
            count: data?.length || 0,
            data: data || [],
            last_updated: data?.[0]?.updated_at || null
        });
    } catch (err) {
        console.error("EGX Watchlist Route Error:", err);
        return NextResponse.json(
            { status: "error", message: err instanceof Error ? err.message : "Internal server error" },
            { status: 500 }
        );
    }
}
