@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Python virtual environment not found at .venv\Scripts\python.exe
  echo Please create venv first: python -m venv .venv
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_all.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Failed to start services.
  pause
  exit /b 1
)

echo.
echo BMNS services started:
echo - FastAPI:  http://127.0.0.1:8001
echo - Django:   http://127.0.0.1:8000/admin/
echo - Frontend: http://127.0.0.1:5173
echo.
echo You can close this window.
exit /b 0
