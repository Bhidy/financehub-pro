#!/usr/bin/env python3
"""
Verification Script for Enterprise Brain Upgrade
================================================
Verifies Phase 2, 3, & 4 components:
1. Universal Screener (Dynamic SQL Generation)
2. Semantic Router (Prompt Context & Entities)
3. CFA Persona (System Prompt Structure)

Run this on the server (or local with env vars) to verify integrity.
"""

import sys
import os
import asyncio
import logging
from typing import Dict, Any

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger("BrainVerifier")

# Import Components (lazy imports to avoid startup errors if deps missing)
try:
    from backend_core.app.chat.handlers.universal_screener import UniversalScreener
    from backend_core.app.chat.claude_orchestrator import ClaudeOrchestrator
    from backend_core.app.chat.context_assembler import ContextAssembler, ActiveEntities
    from backend_core.app.chat.llm_explainer import LLMExplainerService, get_explainer
    from backend_core.app.chat.schemas import Intent
except ImportError:
    # Try alternate path if generic backend_core fails (local dev structure)
    try:
        sys.path.append(os.path.join(os.getcwd(), 'backend-core'))
        from app.chat.handlers.universal_screener import UniversalScreener
        from app.chat.claude_orchestrator import ClaudeOrchestrator
        from app.chat.context_assembler import ContextAssembler, ActiveEntities
        from app.chat.llm_explainer import LLMExplainerService, get_explainer
        from app.chat.schemas import Intent
    except ImportError as e:
        logger.error(f"Failed to import backend modules: {e}")
        sys.exit(1)

def test_universal_screener_sql():
    """Test if UniversalScreener generates valid SQL for complex queries."""
    logger.info("🧪 Testing Universal Screener SQL Generation...")
    
    screener = UniversalScreener()
    
    # Text Case 1: "Cheap banks with high yield"
    # Entities: Sector=Banks, Filters=[PE < 15, Yield > 5]
    entities = {
        "sector": "Banks",
        "filters": [
            {"metric": "pe_ratio", "operator": "lt", "value": 15},
            {"metric": "dividend_yield", "operator": "gt", "value": 5}
        ],
        "sort_by": "dividend_yield",
        "direction": "desc",
        "limit": 10
    }
    
    query, params = screener.build_query(entities, "EGX")
    
    if "SELECT" not in query or "WHERE" not in query:
        logger.error("❌ SQL generation failed structure check.")
        return False
        
    if "m.sector_name = $1" not in query and "m.sector_name = $2" not in query:
        # Parameter index might vary, just checking logic
        if "sector_name" not in query:
            logger.error("❌ Sector filter missing in SQL.")
            return False
            
    if "m.pe_ratio <" not in query:
        logger.error("❌ PE Ratio filter missing.")
        return False
        
    logger.info("✅ Universal Screener SQL Logic Passed.")
    return True

def test_context_assembler_entities():
    """Test if ActiveEntities supports new fields."""
    logger.info("🧪 Testing Context Assembler Entity Tracking...")
    
    entities = ActiveEntities()
    entities.update(
        symbol="COMI",
        filters=[{"metric": "pe", "value": 10}],
        last_intent="SCREENER_DEEP"
    )
    
    data = entities.to_dict()
    
    if "filters" not in data or data["filters"][0]["metric"] != "pe":
        logger.error("❌ ActiveEntities failed to store 'filters'.")
        return False
        
    if "last_intent" not in data or data["last_intent"] != "SCREENER_DEEP":
        logger.error("❌ ActiveEntities failed to store 'last_intent'.")
        return False
        
    logger.info("✅ Context Assembler Entity Storage Passed.")
    return True

def test_cfa_prompt_structure():
    """Verify LLMExplainer uses the new Chief Expert prompt."""
    logger.info("🧪 Testing CFA Persona System Prompt...")
    
    explainer = get_explainer()
    
    # We can't access inner variables easily without mocking, 
    # but we can check if the file content was updated by looking for signature phrases.
    import inspect
    source = inspect.getsource(explainer.generate_narrative)
    
    required_phrases = [
        "CHIEF LISTED SECURITIES ANALYST",
        "CFA Level 3",
        "NO DEFINITIONS",
        "INSIGHTS FIRST",
        "[BULL_CASE]",
        "[BEAR_CASE]",
        "[FRAMEWORK]",
        "[LEARNING]"
    ]
    
    missing = []
    for phrase in required_phrases:
        if phrase not in source:
            missing.append(phrase)
            
    if missing:
        logger.error(f"❌ CFA Prompt missing key elements: {missing}")
        # Note: inspect.getsource might return the code in running memory. 
        # If we just hot-patched, it might not show if checking imported module vs file.
        # But this is a good sanity check.
        return False
        
    logger.info("✅ CFA Persona System Prompt Verified.")
    return True

async def main():
    logger.info("🚀 Starting Brain Verification Suite...")
    
    results = [
        test_universal_screener_sql(),
        test_context_assembler_entities(),
        test_cfa_prompt_structure()
    ]
    
    if all(results):
        logger.info("\n🏆 ALL SYSTEMS GO. READY FOR NUCLEAR DEPLOYMENT.")
        sys.exit(0)
    else:
        logger.error("\n💥 VERIFICATION FAILED. DO NOT DEPLOY.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
