import time
import subprocess
import os
import datetime

SCANNER_SCRIPT = "hf-space/scripts/yahoo_scanner.py"
INTERVAL = 600  # 10 minutes

def run_scanner():
    print(f"⏰ [Scheduler] Running Scanner at {datetime.datetime.now()}...")
    try:
        # Run scanner
        subprocess.run(["python3", SCANNER_SCRIPT], check=True)
        print("✅ [Scheduler] Scan Complete.")
    except subprocess.CalledProcessError as e:
        print(f"❌ [Scheduler] Scan Failed: {e}")
    except Exception as e:
        print(f"❌ [Scheduler] Error: {e}")

def main():
    print(f"🚀 Scheduler Started. Running {SCANNER_SCRIPT} every {INTERVAL}s.")
    
    # Run immediately
    run_scanner()
    
    while True:
        try:
            time.sleep(INTERVAL)
            run_scanner()
        except KeyboardInterrupt:
            print("\n🛑 Scheduler Stopped.")
            break

if __name__ == "__main__":
    main()
