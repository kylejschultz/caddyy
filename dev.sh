#!/bin/bash

# Development startup script for Caddyy

echo "🚀 Starting Caddyy Development Environment"
echo "========================================="

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start backend
echo "📡 Starting FastAPI backend on http://localhost:8000"
source venv/bin/activate
python -m caddyy.main &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Test backend health
echo "🔍 Testing backend health..."
if curl -s http://localhost:8000/api/health/ > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Start frontend
echo "🎨 Starting Vite frontend on http://localhost:3000"
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Development servers started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
echo "📋 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for either process to finish
wait
