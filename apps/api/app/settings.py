"""Configuration — read from the environment (and .env), never hardcoded."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parents[1]  # apps/api
REPO_ROOT = API_DIR.parents[1]

# Repo-root .env first, then apps/api/.env overrides for local tweaks.
load_dotenv(REPO_ROOT / ".env")
load_dotenv(API_DIR / ".env", override=True)


@dataclass
class Settings:
    anthropic_api_key: str = field(default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", ""))
    supabase_url: str = field(default_factory=lambda: os.environ.get("SUPABASE_URL", ""))
    supabase_anon_key: str = field(default_factory=lambda: os.environ.get("SUPABASE_ANON_KEY", ""))
    supabase_service_role_key: str = field(
        default_factory=lambda: os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    golden_languages: list[str] = field(
        default_factory=lambda: [
            lang.strip()
            for lang in os.environ.get("GOLDEN_LANGUAGES", "en,fr,ar").split(",")
            if lang.strip()
        ]
    )
    # Local fallback store until Supabase credentials exist.
    sqlite_path: str = field(
        default_factory=lambda: os.environ.get(
            "SINAA_DB_PATH", str(API_DIR / "data" / "sinaa.db")
        )
    )
    model_complex: str = field(
        default_factory=lambda: os.environ.get("SINAA_MODEL_COMPLEX", "claude-opus-5-5")
    )
    model_default: str = field(
        default_factory=lambda: os.environ.get("SINAA_MODEL_DEFAULT", "claude-sonnet-5-5")
    )
    # Feature flag: which pipeline serves generations ("single" | "crew").
    pipeline: str = field(default_factory=lambda: os.environ.get("PIPELINE", "single"))
    # Comma-separated origins for CORS; "*" only outside production.
    allowed_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
            if origin.strip()
        ]
    )

    repo_root: Path = REPO_ROOT
    prompt_dir: Path = API_DIR / "prompts"
    schema_path: Path = REPO_ROOT / "packages" / "dsl" / "schema.json"
    catalog_path: Path = REPO_ROOT / "packages" / "engine" / "props.catalog.json"

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)
