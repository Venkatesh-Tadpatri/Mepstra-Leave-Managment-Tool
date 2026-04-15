@echo off
echo Starting Mepstra Leave Tool - Backend Server...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
echo Backend starting at http://localhost:8000
echo API Docs available at http://localhost:8000/api/docs
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
