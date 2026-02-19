#!/bin/bash
# Quick Start Script for Phase 3 - Resource Coordination System

echo "=========================================="
echo " Resource Coordination System Setup"
echo "=========================================="

# Check if running on Windows (Git Bash or WSL)
if [ "$OS" = "Windows_NT" ]; then
    echo "Windows detected"
    ACTIVATE_VENV="venv\\Scripts\\activate"
else
    echo "Unix-like OS detected"
    ACTIVATE_VENV="venv/bin/activate"
fi

echo ""
echo "1️⃣  Backend Setup..."
cd backend

if ! [ -d "venv" ]; then
    echo "   Creating virtual environment..."
    python -m venv venv
fi

echo "   Activating virtual environment..."
source "$ACTIVATE_VENV" || . "$ACTIVATE_VENV"

echo "   Installing dependencies..."
pip install -r requirements.txt -q

echo "   ✅ Backend ready"
echo "   ⚠️  Make sure PostgreSQL is running with resilience_hub database"
echo ""

echo "2️⃣  Frontend Setup..."
cd ..
npm install -q
echo "   ✅ Frontend dependencies installed"
echo ""

echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "To start development:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
source "$ACTIVATE_VENV" || . "$ACTIVATE_VENV"
echo "  python -m uvicorn app.main:app --reload --port 8000"
echo ""
echo "Terminal 2 - Frontend:"
echo "  npm run dev"
echo ""
echo "Then open:"
echo "  Frontend: http://localhost:8080"
echo "  API Docs: http://localhost:8000/docs"
echo ""
