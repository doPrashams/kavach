"""Application configuration via pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings. All vars optional with sane defaults."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "prod"] = "dev"
    frontend_origin: str = "http://localhost:3000"

    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    llm_provider: Literal["openai", "anthropic", "stub"] = "openai"
    llm_model: str = "gpt-4.1"

    datahub_gms_url: str | None = None
    datahub_token: str | None = None
    # When True, live MCP/protocol failures raise (no silent fixture fallback).
    kavach_strict_datahub: bool = False

    github_pat: str | None = None
    demo_pipeline_repo: str = "doPrashams/kavach-demo-pipeline"

    slack_webhook_url: str | None = None

    mlflow_tracking_uri: str | None = Field(default=None, validation_alias="MLFLOW_TRACKING_URI")


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
