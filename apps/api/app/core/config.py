from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # One settings file for the whole repo: <repo>/.env (never committed).
        env_file=REPO_ROOT / ".env", extra="ignore"
    )

    app_env: str = "development"
    database_url: str = f"sqlite:///{(REPO_ROOT / 'apps' / 'api' / 'langkahku.db').as_posix()}"
    # Neon: DATABASE_URL is the pooled string (app traffic); DATABASE_URL_UNPOOLED is direct (schema changes).
    database_url_unpooled: str = ""
    jwt_secret: str = "dev-only-secret-change-me-please-32chars!!"
    jwt_access_ttl_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:5173"
    # Demo class and accounts (siswa/siswa123, guru/guru123). Turn off before real students use the app.
    seed_demo: bool = True
    content_dir: Path = REPO_ROOT / "content"
    web_dist_dir: Path = REPO_ROOT / "apps" / "web" / "dist"

    anthropic_api_key: str = ""
    modeler_model: str = "claude-opus-5-5"
    modeler_effort: str = "medium"
    modeler_timeout_seconds: float = 30.0
    modeler_default_daily_quota: int = 10
    modeler_monthly_budget_usd: float = 50.0

    @field_validator("database_url")
    @classmethod
    def _default_sqlite(cls, v: str) -> str:
        # An empty DATABASE_URL (as in the default .env) means "use the local SQLite file".
        return v.strip() or f"sqlite:///{(REPO_ROOT / 'apps' / 'api' / 'langkahku.db').as_posix()}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
