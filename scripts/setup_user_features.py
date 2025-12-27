import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.kgjpkphfjmmiyjsgsaup:DgYNreqd4S7YLF6R@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS watchlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,  -- Can link to auth service later
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS watchlist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(watchlist_id, symbol)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS price_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        symbol TEXT NOT NULL,
        target_price DECIMAL(10, 2) NOT NULL,
        condition TEXT CHECK (condition IN ('ABOVE', 'BELOW')),
        is_active BOOLEAN DEFAULT TRUE,
        triggered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        notification_sent BOOLEAN DEFAULT FALSE
    );
    """,
    # Create an index for faster lookups
    "CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlists(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(symbol) WHERE is_active = TRUE;"
]

async def main():
    print("Creating User Feature Tables (Watchlists & Alerts)...")
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        for stmt in DDL_STATEMENTS:
            print(f"Executing: {stmt.split('(')[0].strip()}...")
            await conn.execute(stmt)
            
        print("✅ Tables created successfully!")
        
        # Insert a default watchlist for a demo/guest user
        # We'll use a fixed UUID for a 'guest' user for now, or just leave it empty
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
