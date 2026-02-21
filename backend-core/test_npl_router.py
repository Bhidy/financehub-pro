import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.chat.intent_router import IntentRouter

def test():
    router = IntentRouter()
    
    res1 = router.route("Compare COMI and SWDY")
    print(f"Intent 1 (COMI and SWDY): {res1.intent}, Entities: {res1.entities}")

    res2 = router.route("COMI vs SWDY")
    print(f"Intent 2 (COMI vs SWDY): {res2.intent}, Entities: {res2.entities}")

    res3 = router.route("How serious is the Non-Performing Loans (NPL) risk for DGTZ, and what would a worst-case scenario look like in terms of credit losses and impact on the company's finances")
    print(f"Intent 3 (NPL Risk): {res3.intent}")

test()
