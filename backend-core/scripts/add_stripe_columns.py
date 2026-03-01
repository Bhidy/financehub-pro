import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import db

async def add_stripe_columns():
    print("Connecting to database...")
    await db.connect()
    
    try:
        print("Adding Stripe columns to users table...")
        
        # Add stripe_customer_id
        await db.execute('''
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
        ''')
        print("✅ Added stripe_customer_id column")

        # Add subscription_status
        await db.execute('''
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'none';
        ''')
        print("✅ Added subscription_status column")

        # Add subscription_plan
        await db.execute('''
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR;
        ''')
        print("✅ Added subscription_plan column")

        # Add subscription_end_date
        await db.execute('''
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
        ''')
        print("✅ Added subscription_end_date column")

        print("\nAll Stripe columns added successfully!")
        
    except Exception as e:
        print(f"Error adding columns: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(add_stripe_columns())
