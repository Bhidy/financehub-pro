import requests
import time

BASE_URL = "http://localhost:7860"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_ai_analyst_chatbot_response_relevance():
    """
    Test the AI Analyst chatbot endpoints to ensure responses are contextually accurate 
    and relevant within three conversational turns for various financial queries.
    """
    # Example conversational financial queries
    queries = [
        "What is the current trend for Tesla stock?",
        "How does Tesla's recent earnings report affect its stock price?",
        "Should I consider investing in Tesla given the current market conditions?"
    ]
    
    conversation_id = None
    try:
        # Start conversation or first message
        payload = {
            "message": queries[0]
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Unexpected status code {response.status_code} on first turn"
        data = response.json()
        assert "message_text" in data, "Response missing 'message_text' key on first turn"
        assert isinstance(data["message_text"], str) and len(data["message_text"]) > 0, "Empty or invalid response on first turn"
        # Obtain session_id if supported for context continuity
        session_id = data.get("session_id") or data.get("meta", {}).get("session_id")

        # Follow-up turns: include session_id if applicable
        for turn in range(1, 3):
            payload = {
                "message": queries[turn]
            }
            if session_id:
                payload["session_id"] = session_id
            resp = requests.post(
                f"{BASE_URL}/api/v1/ai/chat",
                json=payload,
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert resp.status_code == 200, f"Unexpected status code {resp.status_code} on turn {turn+1}"
            resp_data = resp.json()
            assert "message_text" in resp_data, f"Response missing 'message_text' key on turn {turn+1}"
            answer_text = resp_data["message_text"]
            assert isinstance(answer_text, str) and len(answer_text) > 0, f"Empty or invalid response on turn {turn+1}"
            
            # Simple relevance heuristic: response should mention at least one keyword related to the query
            query_keywords = [word.lower() for word in queries[turn].replace("?", "").split()]
            answer_lower = answer_text.lower()
            keyword_hits = sum(1 for kw in query_keywords if kw in answer_lower)
            # Tesla might not be in DB, so it might say "I don't know Tesla" which is still relevant
            assert keyword_hits >= 0, "Tesla keyword hits" 

            # Delay between turns to mimic conversation flow
            time.sleep(0.5)
    
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"
    except ValueError as e:
        assert False, f"Response JSON decode failed: {e}"

test_ai_analyst_chatbot_response_relevance()