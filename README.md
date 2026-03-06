# BMNS - ISP Billing & Network Automation

BMNS is now structured as a multi-service full-stack platform with your requested stack:

- `django_backend/` : Django billing/admin backend (MySQL)
- `app/` : FastAPI network automation API (EasySNMP + RouterOS API + Celery + Redis + MySQL)
- `frontend/` : React.js + Tailwind CSS web frontend
- `mobile_app/` : React Native (Expo) mobile app

## Requested Credentials

- Database Host: `172.16.3.10`
- Database Name: `bmns_db`
- Database User: `bmns_user`
- Database Password: `bmns!010230`
- Login: `admin / 1234`

## 1) Python Dependencies

```bash
pip install -r requirements.txt
```

## 2) Environment

Copy `.env.example` to `.env` if needed.

```bash
copy .env.example .env
```

## 3) FastAPI Backend (Automation API)

Run API:

```bash
python -m uvicorn app.main:app --reload
```

Health check:

- `http://127.0.0.1:8000/health`

Apply SQLAlchemy migrations:

```bash
alembic upgrade head
```

Bootstrap default admin user for FastAPI auth:

```bash
python scripts/bootstrap_admin.py
```

Login endpoint:

- `POST /api/auth/login` with `admin / 1234`

Network automation endpoints:

- `POST /api/automation/snapshot`
- `GET /api/automation/tasks/{task_id}`

## 4) Celery + Redis

Start Redis server (local or remote).

Run Celery worker:

```bash
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

## 5) Django Backend (Billing + Admin)

Go to Django folder:

```bash
cd django_backend
```

Create migrations and migrate:

```bash
python manage.py makemigrations
python manage.py migrate
```

Create/update default Django admin:

```bash
python manage.py seed_admin
```

Run Django:

```bash
python manage.py runserver
```

Django admin URL:

- `http://127.0.0.1:8000/admin/`
- Username: `admin`
- Password: `1234`

## 6) React Web Frontend (FastAPI + React + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Web URL:

- `http://localhost:5173`

## 7) React Native Mobile App

```bash
cd mobile_app
npm install
npm run start
```

Default mobile login fields are prefilled with:

- Username: `admin`
- Password: `1234`

## Notes

- FastAPI and Django can share the same MySQL instance.
- If `easysnmp` build fails on Windows, install Net-SNMP first.
- RouterOS automation requires reachable MikroTik API service/credentials.

## Quick Start (All Services)

- One-click (Windows): `start-all.cmd`
- PowerShell: `.\scripts\start_all.ps1`
- Git Bash: `bash scripts/start_all.sh`

This starts:
- FastAPI (`:8001`)
- Celery worker
- Django (`:8000`)
- React frontend (`:5173`)

To stop all services on Windows:
- `stop-all.cmd`

## Dashboard Live API

- Frontend admin dashboard now consumes: `GET /api/dashboard/admin-summary`
- Auth refresh endpoint: `POST /api/auth/refresh`
