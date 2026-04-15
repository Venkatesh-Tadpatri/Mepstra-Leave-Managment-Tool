@echo off
echo Starting Mepstra Leave Tool - Frontend...
cd /d "%~dp0frontend"
echo Frontend starting at http://localhost:5173
npm run dev
pause
