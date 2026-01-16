import tls_client
import json

def check_pag():
    session = tls_client.Session(client_identifier="chrome_120")
    headers = {
         "Referer": "https://www.mubasher.info/",
         "Accept": "application/json"
    }
    
    url0 = "https://www.mubasher.info/api/1/funds?page=0"
    resp0 = session.get(url0, headers=headers).json()
    ids0 = [x['fundId'] for x in resp0['rows']]
    print(f"Page 0 IDs: {ids0}")
    
    url1 = "https://www.mubasher.info/api/1/funds?page=1"
    resp1 = session.get(url1, headers=headers).json()
    ids1 = [x['fundId'] for x in resp1['rows']]
    print(f"Page 1 IDs: {ids1}")
    
    if ids0 == ids1:
        print("❌ DUPLICATE! Pagination is broken (Parameters ignored).")
    else:
        print("✅ Unique pages.")

if __name__ == "__main__":
    check_pag()
