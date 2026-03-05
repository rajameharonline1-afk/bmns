from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api import router as api_router

app = FastAPI(title="BMNS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")


@app.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}

# If a built frontend is present (frontend/dist), mount it so the backend can serve the SPA
FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if FRONTEND_DIST.exists():
    # Serve built frontend files and enable SPA fallback (index.html)
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # In development (no built frontend) redirect to vite dev server login page.
    # In production (built frontend mounted) redirect to the local SPA login route.
    if FRONTEND_DIST.exists():
        return RedirectResponse(url="/login")
    return RedirectResponse(url="http://localhost:5173/login")


@app.get("/login", include_in_schema=False)
def login_redirect() -> RedirectResponse:
    if FRONTEND_DIST.exists():
        return RedirectResponse(url="/login")
    return RedirectResponse(url="http://localhost:5173/login")
