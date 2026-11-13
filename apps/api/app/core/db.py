from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def normalize_database_url(url: str) -> str:
    """Hosted Postgres (Neon, Supabase) hands out postgres:// or postgresql:// URLs; use the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _make_engine(url: str, *, pooled: bool) -> Engine:
    url = normalize_database_url(url)
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(
        url,
        # Neon's pooled endpoint runs PgBouncer in transaction mode: psycopg must not keep
        # server-side prepared statements across transactions.
        connect_args={"prepare_threshold": None} if pooled else {},
        # Neon scales compute to zero and closes idle connections: check before use, recycle early.
        pool_pre_ping=True,
        pool_recycle=280,
    )


_settings = get_settings()
# App traffic uses the pooled connection string (DATABASE_URL).
engine = _make_engine(_settings.database_url, pooled=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def schema_engine() -> Engine:
    """Engine for schema changes (create_all / migrations): Neon recommends the direct, unpooled connection."""
    if _settings.database_url_unpooled:
        return _make_engine(_settings.database_url_unpooled, pooled=False)
    return engine


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
