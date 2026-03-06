@echo off
setlocal
cd /d "%~dp0"

echo Stopping BMNS service processes...

for /f "tokens=*" %%P in ('powershell -NoProfile -Command "Get-CimInstance Win32_Process ^| Where-Object { ($_.Name -eq 'python.exe' -and ($_.CommandLine -match 'uvicorn app.main:app' -or $_.CommandLine -match 'manage.py runserver')) -or ($_.Name -eq 'celery.exe') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'vite') } ^| Select-Object -ExpandProperty ProcessId"') do (
  taskkill /F /PID %%P >nul 2>nul
)

echo Done.
exit /b 0
