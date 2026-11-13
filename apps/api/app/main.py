from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.db import Base, SessionLocal, engine, schema_engine
from app.routers import attempts, auth, content, home, modeler, teacher
from app.seed import seed

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    if s.app_env == "production":
        # Fail loudly instead of running with a guessable secret or a database that is wiped on every deploy.
        if s.jwt_secret.startswith("dev-only") or len(s.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters in production")
        if engine.url.get_backend_name() == "sqlite":
            raise RuntimeError("DATABASE_URL must point to PostgreSQL (e.g. Neon) in production")
    # v0.1 uses create_all; switch to Alembic migrations before real use (docs/08 §5).
    # Schema changes go over the direct (unpooled) Neon connection when it is configured.
    ddl = schema_engine()
    Base.metadata.create_all(ddl)
    if ddl is not engine:
        ddl.dispose()
    if get_settings().seed_demo:
        with SessionLocal() as db:
            seed(db)
    yield


settings = get_settings()
app = FastAPI(title="LangkahKu API", version="0.1.0", lifespan=lifespan,
              docs_url="/docs" if settings.app_env != "production" else None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
    return JSONResponse({"error": detail}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse({"error": {"code": "VALIDATION_ERROR", "message": "Isian belum lengkap atau tidak sesuai.",
                                   "fields": [".".join(map(str, e["loc"][1:])) for e in exc.errors()]}},
                        status_code=422)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response


for r in (auth, content, attempts, home, modeler, teacher):
    app.include_router(r.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health")
def health():
    return {"ok": True, "ai_configured": bool(settings.anthropic_api_key)}


# Serve the built PWA (apps/web/dist) from the same server: one command runs everything.
dist: Path = settings.web_dist_dir
if dist.exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        target = (dist / path).resolve()
        if path and target.is_file() and dist.resolve() in target.parents:
            return FileResponse(target)
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})
