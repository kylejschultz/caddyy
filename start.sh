#!/bin/bash

# Production startup script for Caddyy
# This script handles database migrations and starts the FastAPI server

set -e  # Exit on any error

echo "🚀 Starting Caddyy Production Server"
echo "===================================="

# Change to backend directory
cd /caddyy/app/backend 2>/dev/null || cd /app/backend 2>/dev/null || cd backend || {
    echo "❌ Could not find backend directory"
    exit 1
}

# Function to wait for database to be ready (if using external DB)
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    # Add database connectivity check here if needed for external databases
    # For SQLite, this is not needed, but useful for PostgreSQL/MySQL
    sleep 1
    echo "✅ Database is ready"
}

# Function to run database migrations
run_migrations() {
    echo "📊 Running database migrations..."
    
    # Check if alembic is available
    if ! command -v alembic &> /dev/null; then
        echo "❌ Alembic not found. Please ensure it's installed."
        exit 1
    fi
    
    # Run migrations
    alembic upgrade head
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
}

# Function to start the FastAPI server
start_server() {
    echo "🌐 Starting FastAPI server..."
    
    # Set default values for production
    export HOST=${HOST:-0.0.0.0}
    export PORT=${PORT:-8000}
    export DEBUG=${DEBUG:-false}
    
    echo "📡 Server will start on http://${HOST}:${PORT}"
    
    # Start the server using uvicorn directly
    # Using the module path that matches your current setup
    exec uvicorn backend.main:app \
        --host ${HOST} \
        --port ${PORT} \
        --workers ${WORKERS:-1} \
        --access-log \
        --log-level info
}

# Function for graceful shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down Caddyy server..."
    exit 0
}

# Set up signal handling for graceful shutdown
trap cleanup SIGINT SIGTERM

# Main execution flow
main() {
    wait_for_db
    run_migrations
    start_server
}

# Health check function (useful for Docker health checks)
health_check() {
    echo "🏥 Performing health check..."
    
    # Try to connect to the server
    if command -v curl &> /dev/null; then
        curl -f http://localhost:${PORT:-8000}/api/health/ > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ Health check passed"
            exit 0
        else
            echo "❌ Health check failed"
            exit 1
        fi
    else
        echo "⚠️  curl not available, skipping health check"
        exit 0
    fi
}

# Check if this is a health check call
if [ "$1" = "health" ]; then
    health_check
    exit 0
fi

# Print environment info
echo "🔧 Environment:"
echo "   HOST: ${HOST:-0.0.0.0}"
echo "   PORT: ${PORT:-8000}"
echo "   DEBUG: ${DEBUG:-false}"
echo "   WORKERS: ${WORKERS:-1}"
echo ""

# Start the application
main
