"""
Application settings loaded from environment / .env file.
Uses pydantic-settings so every value is validated and typed.
"""
from __future__ import annotations

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    api_port: int = 8000
    environment: str = "development"
    log_level: str = "info"

    # CORS — comma-separated string in .env, parsed to a list here
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"

    # Data directories (relative to project root)
    raw_data_dir: str = "./data/raw"
    processed_data_dir: str = "./data/processed"

    # Copernicus Marine credentials
    copernicusmarine_service_username: str = ""
    copernicusmarine_service_password: str = ""

    # NASA Earthdata credentials
    earthdata_username: str = ""
    earthdata_password: str = ""

    @property
    def cors_origins(self) -> List[str]:
        """Return allowed origins as a list (split on commas)."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


# Module-level singleton — import this everywhere
settings = Settings()
