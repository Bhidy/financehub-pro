import tls_client
import json

def fuzz_pag():
    session = tls_client.Session(client_identifier="chrome_120")
    base = "https://www.mubasher.info/api/1/funds"
    
    # Check default IDs to compare
    def0 = session.get(base).json()['rows'][0]['fundId']
    print(f"Default First ID: {def0}")
    
    params = [
        {"offset": 20},
        {"start": 20},
        {"from": 20},
        {"page": 1}, # Already tried
        {"p": 1},
        {"pageIndex": 1},
        {"limit": 100}, # different limit might change set
        {"size": 100},
        {"per_page": 100}
    ]
    
    for p in params:
        try:
            resp = session.get(base, params=p).json()
            first_id = resp['rows'][0]['fundId']
            count = len(resp['rows'])
            
            print(f"Params {p}: FirstID={first_id}, Count={count}")
            
            if first_id != def0 or count != 20:
                print("✅ CHANGE DETECTED!")
        except Exception as e:
            print(f"Error {p}: {e}")

if __name__ == "__main__":
    fuzz_pag()
