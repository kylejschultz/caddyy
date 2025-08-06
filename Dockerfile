# Multi-stage Dockerfile for Caddyy
# This builds both the frontend and backend in a single container

FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Backend stage
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python project files
COPY pyproject.toml ./
COPY backend/ ./backend/

# Install Python dependencies
RUN pip install -e .

# Copy built frontend assets (adjust path as needed for your setup)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Create directories for mounted volumes
RUN mkdir -p /caddyy/app /caddyy/movies /caddyy/tvshows /caddyy/downloads

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app \
    && chown -R app:app /caddyy
USER app

# Environment variables with defaults
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false
ENV WORKERS=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ./start.sh health

# Expose port
EXPOSE 8000

# Use startup script as entrypoint
ENTRYPOINT ["./start.sh"]
