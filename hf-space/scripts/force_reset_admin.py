import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import db
from app.core.security import get_password_hash, verify_password
from app.core.config import settings

async def reset_admin():
    print("----------------------------------------------------------------")
    print("ENTERPRISE AUTH RESTORATION: FORCE RESET ADMIN")
    print("----------------------------------------------------------------")

    # Connect to DB
    print(f"Connecting to Database: {settings.DATABASE_URL.split('@')[-1] if settings.DATABASE_URL else 'None'}")
    await db.connect()
    
    if not db._pool:
        print("CRITICAL: Could not connect to database.")
        return

    admin_email = "admin@financehub.com"
    admin_password = "admin" # The desired password
    
    try:
        # 1. Audit current state (Deep Diagnostics Phase)
        print(f"Auditing existing user: {admin_email}...")
        existing_user = await db.fetch_one("SELECT id, hashed_password FROM users WHERE email = $1", admin_email)
        
        if existing_user:
            print(f"Found existing user (ID: {existing_user['id']})")
            print(f"Current Hash Start: {existing_user['hashed_password'][:10]}...")
            
            # Simple check
            is_valid = verify_password(admin_password, existing_user['hashed_password'])
            print(f"Pre-check Verification: {'PASS' if is_valid else 'FAIL (Root Cause Confirmed)'}")
            
            # DELETE
            print("Deleting existing admin user...")
            await db.execute("DELETE FROM users WHERE email = $1", admin_email)
            print("Deletion complete.")
        else:
            print("Admin user does not currently exist.")

        # 2. Programmatic Restore (The Forever Fix)
        print("Generating new password hash via application security module...")
        new_hash = get_password_hash(admin_password)
        print(f"New Hash generated: {new_hash[:10]}...")

        print("Inserting new admin user record...")
        full_name = "Admin User"
        role = "admin"
        phone = "+1234567890"
        
        # Insert with explicit columns to match schema
        insert_query = """
            INSERT INTO users (email, hashed_password, full_name, role, is_active, phone, email_verified, created_at, last_login)
            VALUES ($1, $2, $3, $4, TRUE, $5, TRUE, NOW(), NOW())
            RETURNING id
        """
        
        user_id = await db.fetch_val(insert_query, admin_email, new_hash, full_name, role, phone)
        print(f"Admin user created successfully (ID: {user_id})")

        # 3. Verification
        print("Verifying new credentials against database...")
        # Re-fetch to be sure
        saved_user = await db.fetch_one("SELECT hashed_password FROM users WHERE email = $1", admin_email)
        
        if verify_password(admin_password, saved_user['hashed_password']):
            print("✅ SUCCESS: Password verified successfully against database.")
            print("CRITICAL ISSUE RESOLVED.")
        else:
            print("❌ FAILURE: Validation failed immediately after insert.")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(reset_admin())
