# FinanceHub Pro Backend - Hugging Face Spaces Dockerfile
# HF Spaces uses port 7860 by default

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for asyncpg
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend folder
COPY backend/requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app
COPY backend/engine ./engine

# Set python path
ENV PYTHONPATH=/app

# HF Spaces uses port 7860
EXPOSE 7860

# Run uvicorn on port 7860 (HF Spaces default)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
