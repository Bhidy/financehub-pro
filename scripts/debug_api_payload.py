#!/usr/bin/env python3
"""
Fast API Debugger
=================
This tool hits the backend chat API directly and prints the exact structure of the response 
(cards, conversational_text, follow_up_prompt) without needing a browser.
This is the fastest way to debug issues like missing cards, weird text artifacts, 
or formatting errors before looking at the frontend UI.

Usage:
  python3 scripts/debug_api_payload.py "What is the price of MASR?"
  python3 scripts/debug_api_payload.py "Compare COMI and CIB" --prod
"""

import sys
import httpx
import json
import argparse
from typing import Dict, Any

LOCAL_URL = "http://localhost:8000/api/v1/chat"
PROD_URL = "https://starta.46-224-223-172.sslip.io/api/v1/chat"

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    ENDC = '\033[0m'

def print_section(title: str, content: Any):
    print(f"\n{Colors.CYAN}{Colors.BOLD}=== {title} ==={Colors.ENDC}")
    if isinstance(content, str):
        print(content)
    else:
        print(json.dumps(content, indent=2, ensure_ascii=False))

def debug_query(query: str, use_prod: bool = False):
    url = PROD_URL if use_prod else LOCAL_URL
    target_env = "PRODUCTION" if use_prod else "LOCAL"
    
    print(f"{Colors.BOLD}Sending query to {target_env}: {query}{Colors.ENDC}")
    print(f"URL: {url}")
    
    payload = {
        "message": query,
        "language": "en"
    }
    
    with httpx.Client(timeout=60) as client:
        try:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"{Colors.RED}Request failed: {e}{Colors.ENDC}")
            return
            
    print(f"\n{Colors.GREEN}Successfully received response!{Colors.ENDC}")
    
    # Print the core components that the frontend uses to render
    conversational_text = data.get('conversational_text', '')
    print_section("Conversational Text (Main Chat Bubble)", conversational_text)
    
    # Check for anomalies like [FRAMEWORK]
    if "[FRAMEWORK]" in conversational_text or "[KEY_INSIGHT]" in conversational_text:
         print(f"{Colors.RED}⚠️ WARNING: Artifact tags detected in conversational text!{Colors.ENDC}")
    
    cards = data.get('cards', [])
    print_section(f"Rendered Cards ({len(cards)} found)", [{"type": c.get("type"), "title": c.get("title")} for c in cards])
    print_section("Cards Full Payload", cards)
    
    print_section("Follow Up Prompt (Gray Box)", data.get('follow_up_prompt', ''))
    
    # Extended structured components
    structured_keys = ['bull_case', 'bear_case', 'framework_card', 'data_card', 'macro_score', 'comparison_table']
    found_structured = {k: data[k] for k in structured_keys if data.get(k)}
    if found_structured:
        print_section("Extended Structured Data", found_structured)
        
    print(f"\n{Colors.BOLD}Use this output to verify what the frontend receives before debugging React components.{Colors.ENDC}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Debug backend chat API responses")
    parser.add_argument("query", type=str, help="The message to send to the chatbot")
    parser.add_argument("--prod", action="store_true", help="Hit the production backend instead of localhost")
    
    args = parser.parse_args()
    debug_query(args.query, args.prod)
