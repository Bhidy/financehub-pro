from yahooquery import search
import json

def main():
    print("Searching for 'Commercial International Bank'...")
    try:
        results = search("Commercial International Bank")
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(e)
        
    print("Searching for 'Egypt'...")
    try:
        results2 = search("Egypt")
        print(json.dumps(results2, indent=2))
    except Exception as e:
        print(e)

if __name__ == "__main__":
    main()
