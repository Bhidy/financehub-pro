import asyncio
import asyncpg
import json
import os
import glob
from datetime import datetime

# In Production (HF), DATABASE_URL is set in the environment secrets.
DB_URL = os.getenv("DATABASE_URL")

async def apply_schema(conn):
    print("📜 Applying Schema Updates...")
    schemas = [
        'hf-space/scripts/yahoo_schema.sql',
        'hf-space/scripts/gap_fill.sql',
        'hf-space/scripts/gap_fill_v2.sql'
    ]
    for param in schemas:
        if os.path.exists(param):
            print(f"  Executing {param}...")
            with open(param, 'r') as f:
                sql = f.read()
            try:
                await conn.execute(sql)
            except Exception as e:
                print(f"  ⚠️ Schema Error (might be duplicate): {e}")

async def seed_table(conn, table, json_file, conflict_cols):
    print(f"🌱 Seeding {table} from {json_file}...")
    if not os.path.exists(json_file):
        print(f"  ❌ File missing: {json_file}")
        return

    with open(json_file, 'r') as f:
        data = json.load(f)
        
    if not data:
        print("  ⚠️ No data to seed.")
        return

    # Construct columns and values
    columns = list(data[0].keys())
    # Prepare params
    records = []
    for row in data:
        vals = []
        for c in columns:
            v = row.get(c)
            # Handle date strings
            if isinstance(v, str) and len(v) == 10 and v.count('-') == 2:
                 try:
                     v = datetime.strptime(v, "%Y-%m-%d").date()
                 except: pass
            vals.append(v)
        records.append(tuple(vals))
        
    # Batch Insert
    cols_str = ", ".join(columns)
    vals_ph = ", ".join([f"${i+1}" for i in range(len(columns))])
    
    # Conflict handling
    conflict_str = f"ON CONFLICT ({', '.join(conflict_cols)}) DO UPDATE SET " + \
                   ", ".join([f"{c} = EXCLUDED.{c}" for c in columns if c not in conflict_cols])
                   
    query = f"INSERT INTO {table} ({cols_str}) VALUES ({vals_ph}) {conflict_str}"
    
    try:
        await conn.executemany(query, records)
        print(f"  ✅ Seeded {len(records)} rows to {table}")
    except Exception as e:
        print(f"  ❌ Seed Error {table}: {e}")

async def main():
    if not DB_URL:
        print("❌ DATABASE_URL is not set. Skipping Seeder.")
        return

    print("🚀 Starting Production Seeder...")
    try:
        conn = await asyncpg.connect(DB_URL)
        
        # 1. Apply Schema
        await apply_schema(conn)
        
        # 2. Seed Data
        # PATH FIX: In HF Spaces, repo root is /code or /app.
        # If running from scripts/, base_dir is up one level.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Check if data dir exists at root or inside hf-space (local dev vs prod)
        # In Prod (HF), layout is likely flat if contents of hf-space/ are root.
        # Let's try flexible resolution.
        data_dir = os.path.join(base_dir, "data")
        if not os.path.exists(data_dir):
            # Fallback for local dev if running from project root
            data_dir = os.path.join(base_dir, "hf-space", "data")
            
        print(f"📂 Seeder Data Directory: {data_dir}")
        
        seed_files = {
            "universe": os.path.join(data_dir, "seed_universe.json"),
            "realtime": os.path.join(data_dir, "seed_realtime.json"),
            "history": os.path.join(data_dir, "seed_history.json")
        }
        
        await seed_table(conn, "yahoo_universe", seed_files["universe"], ["isin"])
        await seed_table(conn, "yahoo_realtime", seed_files["realtime"], ["isin"])
        await seed_table(conn, "yahoo_history", seed_files["history"], ["isin", "date"])
        
        await conn.close()
        print("🎉 Production Database Seeded Successfully.")
    except Exception as e:
        print(f"❌ Seeder Critical Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
