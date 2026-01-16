import asyncio
import csv
import os
from database import db

async def load_snapshot():
    await db.connect()
    print("Connected to DB")
    
    count = 0
    try:
        # Check current dir or backend dir
        csv_path = 'market_snapshot.csv'
        if not os.path.exists(csv_path):
             csv_path = 'backend/market_snapshot.csv'
             
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                symbol = row['symbol']
                # Clean header 'price' -> 'last_price', 'change', 'volume', 'status'
                price = None
                change = None
                volume = None
                
                try:
                    price = float(row.get('price', 0))
                except:
                    pass
                
                try:
                    change = float(row.get('change', 0))
                except:
                    pass
                    
                try:
                    # Handle 'N/A' or formatting
                    vol_str = row.get('volume', '0').replace(',', '')
                    if vol_str == 'N/A':
                        vol_str = '0'
                    volume = int(float(vol_str))
                except:
                    pass

                # Upsert into market_tickers
                query = """
                    INSERT INTO market_tickers (symbol, name_en, market_code, last_price, change, volume)
                    VALUES ($1, $2, 'TDWL', $3, $4, $5)
                    ON CONFLICT (symbol) DO UPDATE 
                    SET last_price = EXCLUDED.last_price,
                        change = EXCLUDED.change,
                        volume = EXCLUDED.volume,
                        last_updated = NOW();
                """
                # Use symbol as name if name missing
                name = row.get('name', symbol)
                
                await db.execute(query, symbol, name, price, change, volume)
                count += 1
                
        print(f"Successfully loaded {count} tickers from snapshot.")
        
    except Exception as e:
        print(f"Error loading snapshot: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(load_snapshot())
