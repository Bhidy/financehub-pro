
import asyncio
import asyncpg
import os
import json
from datetime import datetime

# DB Connection
DATABASE_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

TARGET_EMAIL = "geovane.zomer@gmail.com"

async def audit_user():
    print(f"🔍 Starting Audit for user: {TARGET_EMAIL}")
    print("-" * 60)
    
    try:
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    try:
        # 1. User Profile
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", TARGET_EMAIL)
        
        if not user:
            print(f"❌ User not found with email: {TARGET_EMAIL}")
            return

        user_id = user['id']
        print(f"👤 User Found: {user['full_name']} (ID: {user_id})")
        print(f"   Row Keys: {list(user.keys())}") # Debug keys
        print(f"   Created: {user['created_at']}")
        print(f"   Last Login: {user['last_login']}")
        print(f"   Role: {user['role']}")
        print(f"   Phone: {user.get('phone')}")
        print("-" * 60)

        # 2. Portfolio
        portfolio = await conn.fetchrow("SELECT * FROM portfolios WHERE user_id = $1", str(user_id))
        if portfolio:
            print(f"💼 Portfolio: Found (ID: {portfolio['id']})")
            print(f"   Cash: {portfolio['cash_balance']} {portfolio['currency']}")
            
            holdings = await conn.fetch("SELECT * FROM portfolio_holdings WHERE portfolio_id = $1", portfolio['id'])
            if holdings:
                print("   Holdings:")
                for h in holdings:
                    print(f"   - {h['symbol']}: {h['quantity']} shares @ {h['average_price']}")
            else:
                print("   Holdings: None")
        else:
            print("💼 Portfolio: Not created")
        
        print("-" * 60)

        # Sanity Check
        total_sessions = await conn.fetchval("SELECT COUNT(*) FROM chat_sessions")
        print(f"📊 Global System Stats: {total_sessions} total chat sessions in DB.")
        
        if total_sessions > 0:
            sample = await conn.fetchrow("SELECT user_id, session_id FROM chat_sessions LIMIT 1")
            print(f"   Sample Record: user_id='{sample['user_id']}', session_id='{sample['session_id']}'")
            
        print("-" * 60)

        # 3. Chat Sessions
        # Checking string ID, email, and maybe oauth_id if present
        check_ids = [str(user_id), user['email']]
        if user.get('oauth_provider_id'):
            check_ids.append(user['oauth_provider_id'])
            
        print(f"🔍 Searching sessions for IDs: {check_ids}")

        sessions = await conn.fetch("""
            SELECT * FROM chat_sessions 
            WHERE user_id = ANY($1::text[])
            ORDER BY created_at DESC
        """, check_ids)
        
        print(f"💬 Chat Sessions: {len(sessions)}")
        session_ids = [s['session_id'] for s in sessions]
        
        for sess in sessions:
            print(f"   - Session {sess['session_id']} ({sess['created_at']})")
            print(f"     Title: {sess.get('title')}")
            print(f"     Last Intent: {sess.get('last_intent')}")
        
        print("-" * 60)

        # 4. Chat Interactions (Detailed Logs)
        # Assuming chat_interactions uses int user_id
        interactions = await conn.fetch("""
            SELECT * FROM chat_interactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        """, user_id)

        if not interactions:
            # Fallback: Check by session_id if any sessions were found
            if sessions:
                 session_ids = [s['session_id'] for s in sessions]
                 interactions = await conn.fetch("""
                    SELECT * FROM chat_interactions 
                    WHERE session_id = ANY($1::text[]) 
                    ORDER BY created_at DESC
                """, session_ids)

        print(f"📝 Chat Interactions ({len(interactions)} Total)")
        
        if interactions:
            for i, inter in enumerate(interactions, 1):
                raw = inter.get('raw_text') or "N/A"
                intent = inter.get('detected_intent') or "N/A"
                ts = inter['created_at'].strftime("%Y-%m-%d %H:%M:%S")
                print(f"{i}. [{ts}] '{raw}'")
                print(f"    Intent: {intent} | Symbol: {inter.get('resolved_symbol')}")
                print(f"    Response Data: {'Yes' if inter.get('response_has_data') else 'No'}")
                if inter.get('error_code'):
                     print(f"    ❌ Error: {inter.get('error_code')}")
                print("")
        else:
            print("   No detailed interaction logs found.")

        # 5. Check 'chat_analytics' (Legacy/Duplicate table check)
        if not interactions and sessions:
             session_ids = [s['session_id'] for s in sessions]
             analytics = await conn.fetch("""
                SELECT * FROM chat_analytics
                WHERE session_id = ANY($1::text[])
                ORDER BY created_at DESC
             """, session_ids)
             if analytics:
                 print(f"📊 Legacy Analytics Found ({len(analytics)}):")
                 for i, a in enumerate(analytics, 1):
                     print(f"{i}. [{a['created_at']}] '{a.get('message_text')}' -> {a.get('detected_intent')}")

        print("-" * 60)

        # 6. Check 'chat_messages' (Actual Chat History Persistence)
        # Trying to guess schema based on typical patterns: id, session_id, content, role/sender, created_at
        try:
            # 6. Check 'chat_messages' using session_ids found 
            if session_ids:
                 messages = await conn.fetch("""
                    SELECT * FROM chat_messages 
                    WHERE session_id = ANY($1::text[]) 
                    ORDER BY created_at DESC, id ASC
                 """, session_ids) 
                 
                 print(f"📜 Chat History (chat_messages): {len(messages)} messages")
                 for m in messages:
                    role = m.get('role') or 'unknown'
                    content = m.get('content') or ''
                    ts = m.get('created_at')
                    print(f"   [{ts}] {role}: {content[:100]}...") # truncate
            else:
                 print("📜 Chat History: No sessions found, skipping message lookup.")

        except Exception as e:
            print(f"⚠️ Could not inspect schema: {e}")

        print("-" * 60)

        # 7. Check 'guest_sessions' (Pre-registration activity)
        guest = await conn.fetchrow("SELECT * FROM guest_sessions WHERE converted_user_id = $1", user_id)
        if guest:
            print(f"🕵️ Guest Session Conv: Found (ID: {guest['id']})")
            print(f"   IP: {guest.get('ip_address')}")
            print(f"   Device: {guest.get('device_fingerprint')}")
            print(f"   Questions asked as guest: {guest.get('question_count')}")
        else:
            print("🕵️ No linked guest session conversion found.")


    except Exception as e:
        print(f"❌ Error during audit: {e}")
    finally:
        await conn.close()
        print("-" * 60)
        print("Audit Complete.")

if __name__ == "__main__":
    asyncio.run(audit_user())
