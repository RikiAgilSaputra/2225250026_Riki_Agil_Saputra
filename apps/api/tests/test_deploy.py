"""Deployment settings: hosted Postgres URLs and production safety guards."""

import asyncio

import pytest

from app import main
from app.core.db import normalize_database_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql://u:p@ep-x.neon.tech/db?sslmode=require", "postgresql+psycopg://u:p@ep-x.neon.tech/db?sslmode=require"),
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("sqlite:///local.db", "sqlite:///local.db"),
    ],
)
def test_normalize_database_url(url, expected):
    assert normalize_database_url(url) == expected


def _start(monkeypatch, **env):
    settings = main.get_settings()
    for k, v in env.items():
        monkeypatch.setattr(settings, k, v)

    async def run():
        async with main.lifespan(main.app):
            pass

    asyncio.run(run())


def test_production_rejects_default_jwt_secret(monkeypatch):
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        _start(monkeypatch, app_env="production", jwt_secret="dev-only-secret-change-me-please-32chars!!")


def test_production_rejects_sqlite(monkeypatch):
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        _start(monkeypatch, app_env="production", jwt_secret="x" * 40)
