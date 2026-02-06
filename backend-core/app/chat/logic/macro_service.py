
from typing import Dict, Any, List, Optional
import json
from ..macro_scorer import calculate_macro_score, get_macro_scorer

class MacroService:
    """
    Service to retrieve Macro Scores and Expert Insights.
    Integrates quantitative scores with qualitative insights from 'macro_insights'.
    """

    async def get_macro_context(self, conn, ticker: str = None) -> Dict[str, Any]:
        """
        Get full macro context: Score + Text Insights.
        """
        # 1. Calculate Score (Quantitative)
        score_card = await calculate_macro_score(conn, "EGX")
        
        # 2. Fetch Insights (Qualitative)
        insights = []
        try:
            # Fetch general market insights OR ticker specific ones
            query = """
                SELECT insight_type, insight_text, supporting_data
                FROM macro_insights
                WHERE (ticker = $1 OR ticker IS NULL)
                AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
                ORDER BY created_at DESC
                LIMIT 5
            """
            rows = await conn.fetch(query, ticker)
            
            for r in rows:
                insights.append({
                    'type': r['insight_type'],
                    'text': r['insight_text'],
                    'data': json.loads(r['supporting_data']) if r['supporting_data'] else None
                })
        except Exception as e:
            print(f"Error fetching macro insights: {e}")
            
        return {
            'score': score_card.score,
            'assessment': score_card.assessment,
            'factors': [
                {'name': f.name, 'points': f.points, 'max': f.max_points, 'status': f.status}
                for f in score_card.factors
            ],
            'insights': insights
        }

_macro_service = MacroService()
def get_macro_service():
    return _macro_service
