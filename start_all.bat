@echo off
title FleetIQ Platform Runner
echo ========================================================
echo   STARTING FLEETIQ - AI FLEET INTELLIGENCE PLATFORM
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Backend Server on http://127.0.0.1:8000 ...
start "FleetIQ Backend (FastAPI)" cmd /k ""%~dp0.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching Frontend Dashboard on http://localhost:3000 ...
start "FleetIQ Frontend (Vite/React)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   Services are running!
echo   - Frontend Dashboard: http://localhost:3000
echo   - Backend API Docs:   http://127.0.0.1:8000/api/v1/docs
echo ========================================================
echo.
pause
