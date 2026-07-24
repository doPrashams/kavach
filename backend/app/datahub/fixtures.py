"""Load recorded DataHub fixtures for offline demos and CI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

FIXTURES_ROOT = Path(__file__).resolve().parents[3] / "data" / "fixtures"


def load_json(name: str) -> Any:
    """Load a JSON fixture by filename (with or without .json suffix)."""
    filename = name if name.endswith(".json") else f"{name}.json"
    path = FIXTURES_ROOT / filename
    if not path.exists():
        raise FileNotFoundError(f"Fixture not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_queries() -> list[dict[str, Any]]:
    """Return recorded query-history entries."""
    data = load_json("queries")
    if not isinstance(data, list):
        raise ValueError("queries fixture must be a list")
    return data


def load_schemas() -> dict[str, Any]:
    """Return recorded dataset schema payloads."""
    data = load_json("schemas")
    if not isinstance(data, dict):
        raise ValueError("schemas fixture must be a dict")
    return data


def load_lineage() -> list[dict[str, Any]]:
    """Return recorded lineage edges."""
    data = load_json("lineage")
    if not isinstance(data, list):
        raise ValueError("lineage fixture must be a list")
    return data
