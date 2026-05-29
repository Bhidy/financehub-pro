import requests
import json

url = "https://starta.46-224-223-172.sslip.io/api/v1/yahoo/stock/COMI"

def check():
    try:
        res = requests.get(url)
        if res.ok:
            data = res.json()
            print("=== YAHOO KEYS FOR COMI ===")
            print(json.dumps(list(data.keys()), indent=2))
            
            if "profile" in data:
                print("\n=== PROFILE SAMPLE ===")
                print(json.dumps(data["profile"], indent=2)[:1000])
                
            if "fundamentals" in data:
                print("\n=== FUNDAMENTALS SAMPLE ===")
                print(json.dumps(data["fundamentals"], indent=2)[:1000])
        else:
            print("Failed:", res.status_code, res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check()
