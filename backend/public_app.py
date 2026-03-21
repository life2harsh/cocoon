from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST") or (PROJECT_ROOT / "dist"))
FRONTEND_URLS = [
    url.strip()
    for url in os.environ.get(
        "FRONTEND_URLS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if url.strip()
]


app = FastAPI(
    title="Cocoon Journal API (Redacted)",
    description=(
        "This open-source backend entrypoint intentionally omits private application routes. "
        "Create backend/main_private.py locally if you need the full internal implementation."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "mode": "redacted",
        "message": "Private application routes are intentionally omitted from the public repo.",
    }


@app.api_route("/api", methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], include_in_schema=False)
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], include_in_schema=False)
def redacted_api(path: str = ""):
    raise HTTPException(
        status_code=404,
        detail=(
            "This open-source build redacts private application routes. "
            "Add backend/main_private.py locally to restore the full backend."
        ),
    )


if FRONTEND_DIST.is_dir():
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        requested_path = FRONTEND_DIST / full_path
        if full_path and requested_path.is_file():
            return FileResponse(requested_path)

        index_path = FRONTEND_DIST / "index.html"
        if index_path.is_file():
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="Frontend build not found")
