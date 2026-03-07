#!/bin/bash

echo "=========================================="
echo "  Restarting DRS Backend Server"
echo "=========================================="
echo ""

cd "$(dirname "$0")/backend"

# Kill any existing uvicorn processes
echo "Stopping existing backend processes..."
pkill -f uvicorn || true
sleep 2

# Start new backend
echo "Starting backend server..."
echo "=========================================="
echo "Server running on: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "=========================================="
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload