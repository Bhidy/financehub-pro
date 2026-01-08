import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get("sort_by") || "volume";
        const order = searchParams.get("order") || "desc";
        const limit = parseInt(searchParams.get("limit") || "200");

        // Validate sort column
        const validColumns = ["volume", "last_price", "change_percent", "symbol", "trades", "updated_at"];
        const sortColumn = validColumns.includes(sortBy) ? sortBy : "volume";
        const ascending = order.toLowerCase() === "asc";

        const { data, error } = await supabase
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
            { status: "error", message: "Internal server error" },
            { status: 500 }
        );
    }
}
