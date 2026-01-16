#!/bin/sh
set -e

echo "Starting FinanceHub Pro Backend..."
echo "Current Directory: $(pwd)"
echo "Listing Directory:"
ls -la

# Default to port 8000 if PORT not set
export PORT=${PORT:-8000}
echo "Using PORT: $PORT"

# Ensure we can import the app
export PYTHONPATH=$PYTHONPATH:$(pwd)

echo "Starting Uvicorn..."
# DIAGNOSTIC: Run ultra-minimal ASGI app
exec uvicorn app.ultra_minimal:app --host 0.0.0.0 --port $PORT
