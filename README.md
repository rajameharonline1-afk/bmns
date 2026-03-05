# BMNS

BMNS is a full-stack project:
- Backend: FastAPI + Alembic + PostgreSQL
- Frontend: React + Vite + TypeScript

## Project Structure

```
bmns/
  app/                # FastAPI app
  alembic/            # DB migrations
  frontend/           # React frontend
  uploads/            # Uploaded files
  tests/              # Backend tests
```

## Prerequisites

- Python 3.11+ (the project currently uses a local `.venv`)
- Node.js 18+ and npm
- PostgreSQL

## Backend Setup (Windows / Git Bash)

1. Go to project root:

```bash
cd /c/Users/bdida/PyCharmMiscProject/bmns
```

2. Activate virtual environment (if you are setting up fresh):

```bash
python -m venv .venv
source .venv/Scripts/activate
```

3. Install dependencies.
```bash
python -m pip install -r requirements.txt
```

4. Run backend:

```bash
python -m uvicorn app.main:app --reload
```

Or:

```bash
./run-backend.cmd
```

Backend URL: `http://127.0.0.1:8000`  
Health check: `http://127.0.0.1:8000/health`

## Database Migration

To apply migrations:

```bash
alembic upgrade head
```

To generate a new migration (PowerShell):

```powershell
.\scripts\make_migration.ps1 -Message "your_migration_message"
```

## Frontend Setup

1. Go to frontend folder:

```bash
cd /c/Users/bdida/PyCharmMiscProject/bmns/frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run dev server:

```bash
npm run dev
```

Or:

```bash
./run-dev.cmd
```

Frontend URL: `http://localhost:5173`

## Run Backend + Frontend Together

Open two terminals:
- Terminal 1 (root): `python -m uvicorn app.main:app --reload`
- Terminal 2 (`frontend/`): `npm run dev`

Then open `http://localhost:5173` in your browser.

## Git Workflow

```bash
git add .
git commit -m "your message"
git push
```
