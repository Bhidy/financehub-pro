# FinanceHub Pro Backend - Production Dockerfile
# Optimized for Speed: Uses pre-built 'starta-base:latest'
# Deploy time: <60 seconds

FROM starta-base:latest

WORKDIR /app

# Arguments
ARG CACHEBUST=1

# Copy Application Code (The only thing that changes frequently)
COPY backend-core/app ./app
COPY backend-core/engine ./engine
COPY backend-core/scripts ./scripts
COPY backend-core/data_pipeline ./data_pipeline

# Ensure run script is present (if applicable, or just CMD)
COPY backend-core/run.sh ./run.sh
RUN chmod +x run.sh

# Environment
ENV PYTHONPATH=/app
ENV PORT=7860

# Port
EXPOSE 7860

# Command
CMD ["./run.sh"]
