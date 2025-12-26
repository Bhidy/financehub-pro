"""Create database schema"""
import asyncio
import asyncpg

async def create_schema():
    conn = await asyncpg.connect('postgresql://home@localhost:5432/mubasher_db')
    
    with open('schema_complete.sql', 'r') as f:
        schema = f.read()
    
    await conn.execute(schema)
    print('✅ Database schema created successfully')
    
    # Verify tables
    tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    print(f'\nCreated tables ({len(tables)}):')
    for row in tables:
        print(f'  - {row["tablename"]}')
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(create_schema())
