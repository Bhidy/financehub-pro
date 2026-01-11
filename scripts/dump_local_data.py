import asyncio
import asyncpg
import json
import os
from datetime import date, datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

from decimal import Decimal

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

async def dump_table(conn, table_name, out_file):
    print(f"📦 Dumping {table_name}...")
    rows = await conn.fetch(f"SELECT * FROM {table_name}")
    data = [dict(r) for r in rows]
    
    with open(out_file, 'w') as f:
        json.dump(data, f, default=json_serial)
    print(f"✅ Saved {len(data)} rows to {out_file}")

async def main():
    conn = await asyncpg.connect(DB_URL)
    
    await dump_table(conn, "yahoo_universe", "hf-space/data/seed_universe.json")
    await dump_table(conn, "yahoo_realtime", "hf-space/data/seed_realtime.json")
    await dump_table(conn, "yahoo_history", "hf-space/data/seed_history.json")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
