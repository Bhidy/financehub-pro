import asyncio
import logging
from scripts.egx_enterprise_extractor import StockAnalysisEnterpriseClient

# Configure logging
logging.basicConfig(level=logging.INFO)

async def test():
    client = StockAnalysisEnterpriseClient()
    symbol = 'COMI'
    print(f"Fetching financials for {symbol}...")
    
    # Test Income Statement Annual
    data = client.get_financials(symbol, 'income-statement', 'annual')
    print(f"Data Type: {type(data)}")
    if data:
        print(f"Keys: {data.keys()}")
        print(f"Symbol: {data.get('symbol')}")
        print(f"Data items: {len(data.get('data', []))}")
    else:
        print("❌ No data returned")
        
    # Check raw response
    url = f"{client.BASE_URL}/quote/egx/{symbol.lower()}/financials/income-statement/"
    print(f"Checking URL: {url}")
    resp = client._get(url)
    if resp:
        print(f"Status: {resp.status_code}")
        print(f"Length: {len(resp.text)}")
        if '__NEXT_DATA__' in resp.text:
            print("✅ Found __NEXT_DATA__ in HTML")
        else:
            print("❌ __NEXT_DATA__ NOT found in HTML")
            print("Snippet: ", resp.text[:500])
            # Find script tags
            import re
            scripts = re.findall(r'<script[^>]*>(.*?)</script>', resp.text, re.DOTALL)
            print(f"Found {len(scripts)} scripts")
            for i, s in enumerate(scripts):
                if 'data' in s and 'revenue' in s.lower():
                    print(f"Potential Data Script {i}: {s[:200]}...")
            
            # Check for JSON in script tags with type="application/json"
            json_scripts = re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', resp.text, re.DOTALL)
            print(f"Found {len(json_scripts)} JSON scripts")
            for i, js in enumerate(json_scripts):
                print(f"JSON Script {i} content: {js[:200]}...")
                
    # Check SvelteKit __data.json convention
    data_url = f"{client.BASE_URL}/quote/egx/{symbol.lower()}/financials/income-statement/__data.json"
    print(f"Checking Data URL: {data_url}")
    resp = client._get(data_url)
    if resp and resp.status_code == 200:
        print("✅ Found __data.json endpoint!")
        d = resp.json()
        print(f"Keys: {d.keys()}")
        if 'nodes' in d:
            print(f"Nodes count: {len(d['nodes'])}")
            for i, node in enumerate(d['nodes']):
                print(f"Node {i} keys: {node.keys()}")
                if 'data' in node:
                    print(f"Node {i} Data type: {type(node['data'])}")
                    print(f"Node {i} Data content: {str(node['data'])[:500]}...")
                    # If list, check elements assumption
                    if isinstance(node['data'], list):
                        print("Data is a list.")
                        if len(node['data']) > 0:
                            # Check schema at index 0
                            schema = node['data'][0]
                            if isinstance(schema, dict) and 'financialData' in schema:
                                idx = schema['financialData']
                                print(f"Found 'financialData' at index {idx}")
                                if idx < len(node['data']):
                                    fin_data = node['data'][idx]
                                    print(f"Financial Data Content: {str(fin_data)[:500]}...")
                                    
                                    # Check one column (e.g. revenue) if it exists
                                    if 'revenue' in fin_data:
                                        col_idx = fin_data['revenue']
                                        print(f"Revenue is at index {col_idx}")
                                        if col_idx < len(node['data']):
                                            col_indices = node['data'][col_idx]
                                            print(f"Revenue Indices: {col_indices}")
                                            if isinstance(col_indices, list):
                                                for val_idx in col_indices:
                                                    if isinstance(val_idx, int) and val_idx < len(node['data']):
                                                        val = node['data'][val_idx]
                                                        print(f"  Val at {val_idx}: {val} (Type: {type(val)})")
                    
                    print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test())
