# FinanceHub Pro - Product Requirements Document

## Overview
FinanceHub Pro is an enterprise-grade financial intelligence and data platform. It provides real-time and historical analytics for stock markets in the MENA (Middle East and North Africa) region, with a primary focus on the Saudi Stock Exchange (Tadawul) and the Egyptian Exchange (EGX).

## Goals
- Provide institutional-grade data accuracy and display.
- Automate market data ingestion from diverse sources (Yahoo, Mubasher).
- Offer advanced screening and analytical tools for investors and analysts.

## Key Features
1. **Real-Time Market Monitoring**: Live price feeds, volume, and percentage changes.
2. **Comprehensive Stock Profiles**: Historical OHLC data, financial ratios (P/E, P/B), and company information.
3. **Deep Screener**: Multi-factor filtering (sector, market cap, valuation ratios).
4. **Mutual Funds Explorer**: Full tracking of fund NAVs, sector allocations, and returns.
5. **AI analyst**: NLP-powered financial assistant for querying market trends and specific stock performance.

## Technical Architecture
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion. Deployed on Vercel.
- **Backend API**: FastAPI (Python), uvicorn. Deployed on HuggingFace Spaces as a Docker container.
- **Database**: PostgreSQL (Supabase) using `databases` and `asyncpg` for high-concurrency access.
- **Data Pipeline**: Custom scrapers and integration with Yahoo Finance (yfinance/yahooquery).

## Data Quality Requirements
- All financial metrics must align with the production database schema (`market_tickers`, `ohlc_data`).
- Zero-error presentation across all UI components.
- Graceful handling of "N/A" or missing data points from upstream providers.
