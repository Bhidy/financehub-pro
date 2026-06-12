import asyncio
import sys
import os
import logging
from datetime import datetime

# Adjust path to enable imports from 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ManualVerify")

async def main():
    print("🚀 Initializing Auto-Update Verification...")
    
    try:
        # 1. Load Environment
        from dotenv import load_dotenv
        load_dotenv(os.path.join(project_root, '.env'))
        
        # 2. Import Service & Logic (Simulating Scheduler imports)
        print("📥 Importing Services...")
        from app.services.notification_service import notification_service
        from data_pipeline.market_loader import run_daily_market_job
        
        # 3. Send Start Notification
        print("🔔 Sending Start Notification...")
        notification_service.send_discord(
            "🧪 **Manual Verification Started**\n"
            "Process: `Tier 1B (Daily Close Path)`\n"
            "Initiated by: **User Request**",
            is_error=False
        )
        
        # 4. Run the Job (Exactly as Scheduler does)
        print("⚙️ Running Market Data Job (This handles DB & Scraping)...")
        start_time = datetime.now()
        
        # This calls EGXProductionLoader().run_daily_update_job()
        result = await run_daily_market_job()
        
        duration = (datetime.now() - start_time).total_seconds()
        print(f"✅ Job Complete in {duration:.1f}s")
        print(f"📊 Result: {result}")
        
        # 5. Send Result Notification (Scheduler Logic)
        if result.get('status') == 'success':
            stats = result.get('stats', {})
            msg = (f"✅ **Verification Success**\n"
                   f"Type: **Manual Trigger**\n"
                   f"Tickers Updated: `{stats.get('tickers_updated', 0)}`\n"
                   f"New OHLC: `{stats.get('ohlc_new', 0)}`\n"
                   f"Duration: `{duration:.1f}s`"
                   )
            notification_service.send_discord(msg, is_error=False)
            print("📨 Success Notification Sent.")
        else:
            msg = (f"❌ **Verification Failed**\n"
                   f"Error: `{result.get('error')}`")
            notification_service.send_discord(msg, is_error=True)
            print("📨 Failure Notification Sent.")
            
    except Exception as e:
        print(f"🔥 CRITICAL ERROR: {e}")
        # Try to notify on crash
        try:
            from app.services.notification_service import notification_service
            notification_service.send_discord(f"🔥 **Test Crashed**: {e}", is_error=True)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
