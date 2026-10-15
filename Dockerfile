# OceanEmbed Production Backend Dockerfile (Repo Root Context)
FROM python:3.14-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install minimal system dependencies for numerical libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition
COPY backend/requirements.txt /app/backend/requirements.txt

# Install PyTorch CPU first (saves ~3GB vs full CUDA package for inference)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch>=2.2.0 --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application source code
COPY backend /app/backend

# Create required runtime directories for data caches and R2 model weight streaming
RUN mkdir -p /app/data/raw /app/data/interim /app/data/processed /app/data/argo /app/runs/_final_v2 /app/backend/storage

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command using Uvicorn
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
