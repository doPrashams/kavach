"""Configuration tests."""

import os

from app.config import Settings, get_settings


def test_settings_defaults() -> None:
    """Default settings load without required env vars."""
    settings = Settings()
    assert settings.env == "dev"
    assert settings.llm_provider == "openai"
    assert settings.demo_pipeline_repo == "doPrashams/kavach-demo-pipeline"
    assert settings.datahub_gms_url is None


def test_settings_env_override(monkeypatch: object) -> None:
    """Environment variables override defaults."""
    get_settings.cache_clear()
    os.environ["ENV"] = "prod"
    os.environ["LLM_MODEL"] = "claude-sonnet-4"
    try:
        settings = get_settings()
        assert settings.env == "prod"
        assert settings.llm_model == "claude-sonnet-4"
    finally:
        os.environ.pop("ENV", None)
        os.environ.pop("LLM_MODEL", None)
        get_settings.cache_clear()
