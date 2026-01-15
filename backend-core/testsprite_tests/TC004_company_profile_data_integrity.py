import requests

BASE_URL = "http://localhost:7860"
TIMEOUT = 30


def test_company_profile_data_integrity():
    headers = {
        "Accept": "application/json",
    }
    # Health check to ensure data extraction services and system health
    health_resp = requests.get(f"{BASE_URL}/api/v1/health", headers=headers, timeout=TIMEOUT)
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert "status" in health_data and isinstance(health_data["status"], str) and health_data["status"].strip().lower() == "healthy"

    # Retrieve list of companies to get an existing company ID
    companies_resp = requests.get(f"{BASE_URL}/api/v1/company/companies", headers=headers, timeout=TIMEOUT)
    assert companies_resp.status_code == 200
    companies_data = companies_resp.json()
    assert isinstance(companies_data, list) and len(companies_data) > 0, "Companies list should not be empty"

    company_id = None
    # Try to find a company with detailed profile info
    for c in companies_data:
        if isinstance(c, dict) and "id" in c:
            company_id = c["id"]
            break
    assert company_id is not None, "No valid company id found in the companies list"

    # Fetch detailed profile of the company
    profile_resp = requests.get(f"{BASE_URL}/api/v1/company/profile/{company_id}", headers=headers, timeout=TIMEOUT)
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()

    # Validate required fields in the profile
    # Check company details presence
    assert "company" in profile_data and isinstance(profile_data["company"], dict)
    company_info = profile_data["company"]

    # Basic company info validation
    assert "id" in company_info and company_info["id"] == company_id
    assert "name" in company_info and isinstance(company_info["name"], str) and company_info["name"]
    assert "sector" in company_info and isinstance(company_info["sector"], str)
    assert "industry" in company_info and isinstance(company_info["industry"], str)
    assert "description" in company_info and isinstance(company_info["description"], str)

    # Financial statements validation
    assert "financial_statements" in profile_data and isinstance(profile_data["financial_statements"], dict)
    fin_stmts = profile_data["financial_statements"]

    # Expect typical financial statements keys
    for statement in ["income_statement", "balance_sheet", "cash_flow_statement"]:
        assert statement in fin_stmts
        assert isinstance(fin_stmts[statement], dict)

    # Check that financial data has some entries (non-empty)
    for statement_key, statement_val in fin_stmts.items():
        assert len(statement_val) > 0, f"{statement_key} should contain financial data"

    # Shareholder information validation
    assert "shareholders" in profile_data and isinstance(profile_data["shareholders"], list)
    shareholders = profile_data["shareholders"]
    # Validate shareholders list entries if present
    for shareholder in shareholders:
        assert "name" in shareholder and isinstance(shareholder["name"], str) and shareholder["name"]
        assert "shares_held" in shareholder
        # shares_held may be int or float, check type
        assert isinstance(shareholder["shares_held"], (int, float))
        assert shareholder["shares_held"] >= 0

    # Additional optional check: company summary endpoint returns matching name and sector
    summary_resp = requests.get(f"{BASE_URL}/api/v1/company/summary/{company_id}", headers=headers, timeout=TIMEOUT)
    if summary_resp.status_code == 200:
        summary_data = summary_resp.json()
        assert "name" in summary_data and summary_data["name"] == company_info["name"]
        assert "sector" in summary_data and summary_data["sector"] == company_info["sector"]
    else:
        # summary endpoint may be optional, just warn
        pass

test_company_profile_data_integrity()
