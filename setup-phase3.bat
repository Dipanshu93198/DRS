@echo off
REM Quick Start Script for Phase 3 - Resource Coordination System (Windows)

echo.
echo ==========================================
echo  Resource Coordination System Setup
echo ==========================================
echo.

REM Backend Setup
echo 1️⃣  Backend Setup...

cd backend

if not exist "venv" (
    echo    Creating virtual environment...
    python -m venv venv
)

echo    Activating virtual environment...
call venv\Scripts\activate.bat

echo    Installing dependencies...
pip install -r requirements.txt -q

echo    ✅ Backend ready
echo    ⚠️  Make sure PostgreSQL is running with resilience_hub database
echo.

REM Frontend Setup
echo 2️⃣  Frontend Setup...
cd ..
call npm install -q
echo    ✅ Frontend dependencies installed
echo.

echo ==========================================
echo ✅ Setup Complete!
echo ==========================================
echo.
echo To start development:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   venv\Scripts\activate
echo   python -m uvicorn app.main:app --reload --port 8000
echo.
echo Terminal 2 - Frontend:
echo   npm run dev
echo.
echo Then open:
echo   Frontend: http://localhost:8080
echo   API Docs: http://localhost:8000/docs
echo.
pause
