"""Application settings — loaded from environment / .env file.

All secrets live here (server-side only). The browser never receives the
NVIDIA API key; it only talks to our FastAPI routes.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Repo root (backend/ is one level down). Used to locate the frontend folder.
REPO_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── NVIDIA NIM ────────────────────────────────────────────────────
    nvidia_api_key: str = ""
    nim_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nim_timeout: float = 180.0

    # ── Server ────────────────────────────────────────────────────────
    port: int = 8000

    # ── Database ──────────────────────────────────────────────────────
    database_url: str = "sqlite:///./ideaforge.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
