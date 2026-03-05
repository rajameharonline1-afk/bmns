$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

# Kill stale local dev processes to avoid port conflicts.
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "python.exe" -and (
      $_.CommandLine -match "uvicorn app.main:app" -or
      $_.CommandLine -match "manage.py runserver"
    )
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "celery.exe" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -match "vite" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root'; & '$root\\.venv\\Scripts\\python.exe' -m uvicorn app.main:app --reload --port 8001"
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root'; & '$root\\.venv\\Scripts\\celery.exe' -A app.core.celery_app.celery_app worker --loglevel=info --pool=solo"
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root\\django_backend'; & '$root\\.venv\\Scripts\\python.exe' manage.py runserver 127.0.0.1:8000 --noreload"
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$root\\frontend'; npm.cmd run dev -- --host 127.0.0.1 --port 5173"
)

Write-Host 'Started FastAPI(8001), Celery, Django(8000), Frontend(5173) in separate windows.'
