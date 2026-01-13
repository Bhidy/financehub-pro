
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** FinanceHub_Pro_Frontend_Production_QA
- **Date:** 2026-01-12
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Dashboard loads and displays market overview correctly
- **Test Code:** [TC001_Dashboard_loads_and_displays_market_overview_correctly.py](./TC001_Dashboard_loads_and_displays_market_overview_correctly.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/f024ea46-edbc-43a2-8159-9e3a4d2bb15e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Company Profile page displays detailed stock data
- **Test Code:** [TC002_Company_Profile_page_displays_detailed_stock_data.py](./TC002_Company_Profile_page_displays_detailed_stock_data.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/b699d60f-638e-4c1b-aa5e-52e8814b74c6
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 AI Chatbot provides contextually relevant responses
- **Test Code:** [TC003_AI_Chatbot_provides_contextually_relevant_responses.py](./TC003_AI_Chatbot_provides_contextually_relevant_responses.py)
- **Test Error:** The AI Chatbot interface was tested with questions about current market movement and specific stock performance (AAPL). The chatbot failed to provide accurate, context-aware responses and instead returned generic fallback messages. This indicates a failure in integrating live market data and historical analysis. Further testing is stopped and the issue is reported for resolution.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /ai-analyst. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /ai-analyst. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/29b6eccf-890b-4812-b4e4-e0782f4f54d6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Stock Screener filters stocks based on user criteria
- **Test Code:** [TC004_Stock_Screener_filters_stocks_based_on_user_criteria.py](./TC004_Stock_Screener_filters_stocks_based_on_user_criteria.py)
- **Test Error:** Export button on Stock Screener page is not functioning as expected. It does not provide any feedback or save the filter criteria and results. Reporting this issue and stopping further testing as saving functionality is critical for the task.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /screener. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /screener. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/4131c5e6-bbf9-4f18-b16f-22951d80edf1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Real-time intraday data visualizations update smoothly
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/dd941069-476c-4b80-84e8-a9590f3fab4b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Create and manage Watchlists with price alerts
- **Test Code:** [TC006_Create_and_manage_Watchlists_with_price_alerts.py](./TC006_Create_and_manage_Watchlists_with_price_alerts.py)
- **Test Error:** Testing stopped due to critical missing or non-functional watchlist and price alert management features on the stock detail page. The UI does not provide any way to create watchlists, add or remove stocks, set price alerts, or receive notifications. Please investigate and fix these issues to enable full testing.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /egx-watchlist. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /egx-watchlist. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /egx-watchlist. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /egx-watchlist. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /egx/[symbol]. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[ERROR] Failed to load resource: the server responded with a status of 500 () (at https://bhidy-financehub-api.hf.space/api/v1/yahoo/stock/ARAB:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/c0e92f96-19d7-4e0a-94ca-bd9a7e30a2f1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Backend API endpoints respond correctly with production data
- **Test Code:** [TC007_Backend_API_endpoints_respond_correctly_with_production_data.py](./TC007_Backend_API_endpoints_respond_correctly_with_production_data.py)
- **Test Error:** Completed testing key API endpoints for Dashboard Summary, Company Profile, AI Chat, Stock Screener, and Watchlist APIs. Dashboard Summary endpoint returned valid data. Company Profile endpoint returned 'Company not found' for 'AAPL'. AI Chat API requires POST with JSON payload but only GET is supported via browser, so testing was limited. Stock Screener and Watchlist API tests were not possible due to interface limitations. Reported the AI Chat API method issue. Task is now complete.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://bhidy-financehub-api.hf.space/api/dashboard:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://bhidy-financehub-api.hf.space/api/company-profile?symbol=AAPL:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://bhidy-financehub-api.hf.space/api/v1/company/AAPL/profile:0:0)
[ERROR] Failed to load resource: the server responded with a status of 405 () (at https://bhidy-financehub-api.hf.space/api/v1/ai/chat?query=Price%20of%20Aramco:0:0)
[ERROR] Failed to load resource: the server responded with a status of 405 () (at https://bhidy-financehub-api.hf.space/api/v1/ai/chat:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/85a7c213-1fd8-46ce-b43e-e5c2a1be4077
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Production deployment via CLI follows prescribed procedure successfully
- **Test Code:** [TC008_Production_deployment_via_CLI_follows_prescribed_procedure_successfully.py](./TC008_Production_deployment_via_CLI_follows_prescribed_procedure_successfully.py)
- **Test Error:** Frontend deployment page is loaded and UI elements are visible without errors. Next, frontend deployment via Vercel CLI and backend deployment via git push need to be performed and validated. Since CLI actions cannot be performed in this browser environment, please confirm if you want me to proceed with backend deployment validation and endpoint health checks or provide deployment logs for verification.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at https://finhub-pro.vercel.app/_next/static/chunks/854c2b4ebbacaf9d.js:0:68416)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/3acb41f4-4cce-4de3-b5da-bbd392074624
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Health monitoring endpoints and alerts operate correctly
- **Test Code:** [TC009_Health_monitoring_endpoints_and_alerts_operate_correctly.py](./TC009_Health_monitoring_endpoints_and_alerts_operate_correctly.py)
- **Test Error:** The automated health monitoring endpoints provide accurate system status as confirmed by the health check endpoint. However, attempts to simulate failure scenarios and trigger alerting mechanisms were unsuccessful due to lack of accessible simulation endpoints. Additionally, authentication to access alert data failed with 401 Unauthorized errors using test credentials, preventing verification of alert content and alert notifications. Further testing is blocked until valid authentication credentials or failure simulation methods are provided.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://bhidy-financehub-api.hf.space/simulate-failure:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 () (at https://bhidy-financehub-api.hf.space/alerts:0:0)
[ERROR] Failed to load resource: the server responded with a status of 401 () (at https://bhidy-financehub-api.hf.space/api/v1/auth/token:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/d6e8271f-c166-4b4d-9f50-42bba9031fa4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Environment variables and secrets are correctly configured and validated
- **Test Code:** [TC010_Environment_variables_and_secrets_are_correctly_configured_and_validated.py](./TC010_Environment_variables_and_secrets_are_correctly_configured_and_validated.py)
- **Test Error:** The FinanceHub Pro Terminal page is loaded successfully. Next, environment variables and secrets validation will be performed by starting backend and frontend applications with correct environment variables.
Browser Console Logs:
[WARNING] %c%s%c ⚠ Unsupported metadata viewport is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] %c%s%c ⚠ Unsupported metadata themeColor is configured in metadata export in /. Please move it to viewport export instead.
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px  Server   (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
[WARNING] The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the
       height and width. (at http://localhost:3000/_next/static/chunks/66d5b_next_dist_7139520d._.js:2297:27)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/be5a1cd3-72cc-42df-a785-26c01c975cdc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 UI responsiveness and load times meet performance standards
- **Test Code:** [TC011_UI_responsiveness_and_load_times_meet_performance_standards.py](./TC011_UI_responsiveness_and_load_times_meet_performance_standards.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/05caf7fe-c1d7-45e6-9d2b-c0e70543bee6
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Error handling for backend API failures
- **Test Code:** [TC012_Error_handling_for_backend_API_failures.py](./TC012_Error_handling_for_backend_API_failures.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/6af9a2e3-6339-43f2-b0dd-3b2f886c41b6/4de6c503-07a8-4c25-ae0a-8bc8070a31fe
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **33.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---