#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

source .venv/Scripts/activate

# Kill stale local dev processes to avoid port conflicts.
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "celery -A app.core.celery_app.celery_app worker" 2>/dev/null || true
pkill -f "vite --host 127.0.0.1 --port 5173" 2>/dev/null || true

sleep 1

python -m uvicorn app.main:app --reload --port 8001 &
FASTAPI_PID=$!

celery -A app.core.celery_app.celery_app worker --loglevel=info &
CELERY_PID=$!

(
  cd django_backend
  python manage.py runserver 127.0.0.1:8000
) &
DJANGO_PID=$!

(
  cd frontend
  npm run dev -- --host 127.0.0.1 --port 5173
) &
FRONTEND_PID=$!

cleanup() {
  kill "$FASTAPI_PID" "$CELERY_PID" "$DJANGO_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait
