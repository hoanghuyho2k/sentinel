# ===== Backend Dockerfile =====
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend files into container
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir fastapi uvicorn

# Expose FastAPI default port
EXPOSE 8000

# Run backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]