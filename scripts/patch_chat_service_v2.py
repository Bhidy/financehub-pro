
import os

target_file = 'backend-core/app/chat/chat_service.py'

# The ACTUAL OLD content currently in the file (from view_file)
# Note: Indentation is 8 spaces
old_content = """        \"\"\"Infer peer symbols from the same sector, fallback to largest names in market.\"\"\"
        if not primary_symbol:
            return []

        market = market_code or await self.conn.fetchval(
            "SELECT market_code FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )
        sector = await self.conn.fetchval(
            "SELECT sector_name FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )

        peers: List[str] = []
        try:
            if sector:
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                      AND sector_name = $3
                    ORDER BY market_cap DESC NULLS LAST, volume DESC NULLS LAST
                    LIMIT $4
                    \"\"\",
                    primary_symbol,
                    market,
                    sector,
                    limit
                )
                peers = [r["symbol"] for r in rows if r.get("symbol")]

            if len(peers) < limit:
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                    ORDER BY market_cap DESC NULLS LAST, volume DESC NULLS LAST
                    LIMIT $3
                    \"\"\",
                    primary_symbol,
                    market,
                    limit + 2
                )
                for row in rows:
                    sym = row.get("symbol")
                    if sym and sym not in peers:
                        peers.append(sym)
                    if len(peers) >= limit:
                        break
        except Exception as e:
            print(f"[ChatService] ⚠️ Failed to infer peers for {primary_symbol}: {e}")
            return []

        return peers[:limit]"""

# The NEW content (Enterprise Logic V2 - Fixed Casting & Logic)
new_content = """        \"\"\"
        Infer peer symbols using SMART SECTOR LOGIC (Enterprise Grade).
        Prioritizes:
        1. Same Sector + EGX Only
        2. Sorted by Market Cap (Leaders)
        3. Fallback: EGX30 Constituents (if sector undefined)
        \"\"\"
        if not primary_symbol:
            return []

        # FORCE EGX
        market = "EGX"
        
        # Get Sector and Market Cap
        row = await self.conn.fetchrow(
            "SELECT sector_name, market_cap FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )
        
        if not row:
            return []
            
        sector = row['sector_name']
        primary_mcap = row['market_cap'] or 0

        peers: List[str] = []
        try:
            # STRATEGY 1: Same Sector, Market Cap Neighbors
            # We want peers that are similar in size OR larger leaders
            if sector:
                # Get top peers in sector by Market Cap
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                      AND sector_name = $2::text
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $3
                    \"\"\",
                    primary_symbol,
                    sector,
                    limit + 2  # Fetch extra to filter
                )
                peers = [r["symbol"] for r in rows if r.get("symbol")]

            # STRATEGY 2: Fallback to EGX30 (Market Leaders) if no sector peers
            if len(peers) < 1:
                # Fallback to top EGX stocks by Market Cap (Proxy for EGX30)
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $2
                    \"\"\",
                    primary_symbol,
                    limit
                )
                peers = [r["symbol"] for r in rows]

        except Exception as e:
            print(f"[ChatService] ⚠️ Failed to infer peers for {primary_symbol}: {e}")
            return []

        # Deduplicate and return limit
        return list(dict.fromkeys(peers))[:limit]"""

def patch_file():
    try:
        with open(target_file, 'r') as f:
            content = f.read()
            
        # Try to find old content
        if old_content in content:
            print("✅ Found exact match for old content.")
            new_file_content = content.replace(old_content, new_content)
        else:
            print("⚠️ Exact match failed. Trying relaxed match (ignoring leading/trailing whitespace lines).")
            # Fallback logic if needed, but let's try exact first
            # Or print what we see
            # Identify the block by start/end
            start_marker = '"""Infer peer symbols from the same sector, fallback to largest names in market."""'
            end_marker = 'return peers[:limit]'
            
            p1 = content.find(start_marker)
            p2 = content.find(end_marker, p1)
            
            if p1 != -1 and p2 != -1:
                p2 += len(end_marker)
                print(f"   Found block from {p1} to {p2}. Replacing...")
                # Indentation of new_content is already 8 spaces? 
                # new_content string has 8 spaces.
                # But strict replacement is safer.
                new_file_content = content[:p1-8] + new_content + content[p2:] 
            else:
                 print("❌ Markers not found!")
                 return

        with open(target_file, 'w') as f:
            f.write(new_file_content)
            
        print("✅ Successfully patched chat_service.py with V2 fixes (Casting)")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    patch_file()
