import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // NOTE: 'news' table does NOT exist in the database
    // Return empty array - NO FAKE DATA per GOO_RULES
    return NextResponse.json([]);
}
