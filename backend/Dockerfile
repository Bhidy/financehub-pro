FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for asyncpg
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
# Set python path
ENV PYTHONPATH=/app

# Run uvicorn directly with shell form for PORT expansion
CMD sh -c "uvicorn app.ultra_minimal:app --host 0.0.0.0 --port \${PORT:-8000}"
