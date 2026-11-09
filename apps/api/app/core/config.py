from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", ".env"), extra="ignore"
    )

    app_env: str = "development"
    database_url: str = f"sqlite:///{(REPO_ROOT / 'apps' / 'api' / 'langkahku.db').as_posix()}"
    jwt_secret: str = "dev-only-secret-change-me-please-32chars!!"
    jwt_access_ttl_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:5173"
    content_dir: Path = REPO_ROOT / "content"
    web_dist_dir: Path = REPO_ROOT / "apps" / "web" / "dist"

    anthropic_api_key: str = ""
    modeler_model: str = "claude-opus-5-5"
    modeler_effort: str = "medium"
    modeler_timeout_seconds: float = 30.0
    modeler_default_daily_quota: int = 10
    modeler_monthly_budget_usd: float = 50.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
