import asyncio
import os
import sys

# Mocking the environment and imports
sys.path.append(os.getcwd())

from unittest.mock import AsyncMock, MagicMock

# Define a fake ChatService to avoid importing the whole app
class FakeChatService:
    def __init__(self, conn):
        self.conn = conn
        
    async def _get_user_name(self, user_id: str) -> str:
        """Fetch the first name of the user from the database and clean it."""
        if not user_id:
            return "Trader"
            
        try:
            user_id_str = str(user_id).strip()
            if "@" in user_id_str:
                query = "SELECT full_name FROM users WHERE email = $1"
                row = await self.conn.fetchrow(query, user_id_str)
            elif user_id_str.isdigit():
                query = "SELECT full_name FROM users WHERE id = $1"
                row = await self.conn.fetchrow(query, int(user_id_str))
            else:
                return "Trader"

            if row and row['full_name']:
                import re
                full_name = row['full_name'].strip()
                first_name = full_name.split(' ')[0]
                clean_name = re.sub(r'[^\w\s\u0600-\u06FF]', '', first_name)
                return clean_name if clean_name else "Trader"
        except Exception as e:
            return "Trader"
            
        return "Trader"

async def verify_name_retrieval():
    print("--- Verifying User Name Retrieval Logic (Isolated) ---")
    mock_conn = AsyncMock()
    # Mocking row for email lookup
    async def side_effect(query, val):
        if "email" in query:
            return {'full_name': 'Mohamed Bhidy'}
        if "id" in query:
            return {'full_name': 'Numeric User'}
        return None
        
    mock_conn.fetchrow.side_effect = side_effect
    
    service = FakeChatService(mock_conn)
    
    # Test Email Path
    name_email = await service._get_user_name("test@finhub.com")
    print(f"Email lookup ('test@finhub.com'): {name_email} (Expected: Mohamed)")
    assert name_email == "Mohamed"
    
    # Test Numeric Path
    name_numeric = await service._get_user_name("123")
    print(f"Numeric lookup ('123'): {name_numeric} (Expected: Numeric)")
    assert name_numeric == "Numeric"
    
    # Test Guest Path
    name_guest = await service._get_user_name(None)
    print(f"Guest lookup (None): {name_guest} (Expected: Trader)")
    assert name_guest == "Trader"
    
    print("✅ Name Retrieval Logic Verification Passed!")

if __name__ == "__main__":
    asyncio.run(verify_name_retrieval())
