# FinanceHub Pro Backend - Hugging Face Spaces
# Build Version: 2026-01-14-v4 - Stock Profile Fix
FROM python:3.11-slim

# Cache bust - change this to force rebuild
ARG CACHEBUST=20260120-1857-GREETING-FIX-V2

WORKDIR /app

# Install system dependencies for asyncpg
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright removed for lightweight deployment
# ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# RUN mkdir -p /ms-playwright && \
#    playwright install --with-deps chromium

# Copy application code
COPY app ./app
COPY data_pipeline ./data_pipeline
COPY scripts ./scripts

# Create empty engine directory (not needed for API-only mode)
RUN mkdir -p engine

# Set python path
ENV PYTHONPATH=/app

# HF Spaces uses port 7860
EXPOSE 7860

# Run uvicorn on port 7860
COPY run.sh /code/run.sh
RUN chmod +x /code/run.sh
CMD ["/code/run.sh"]
