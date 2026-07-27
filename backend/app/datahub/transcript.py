"""Redacted MCP transcript recorder for judge-facing DataHub receipts."""

from __future__ import annotations

import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# Default judge-facing receipts directory (repo root / examples/datahub-transcripts).
_REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_TRANSCRIPT_DIR = _REPO_ROOT / "examples" / "datahub-transcripts"

_BEARER_RE = re.compile(r"(Bearer\s+)([A-Za-z0-9._\-+=/]{8,})", re.IGNORECASE)
_SECRET_KEY_RE = re.compile(
    r"^(authorization|token|access[_-]?token|api[_-]?key|secret|password|credential)$",
    re.IGNORECASE,
)
_REDACTED = "[REDACTED]"


def redact_headers(headers: dict[str, Any] | None) -> dict[str, Any]:
    """Strip Authorization / Bearer / token values from HTTP-style headers."""
    if not headers:
        return {}
    out: dict[str, Any] = {}
    for key, value in headers.items():
        if _SECRET_KEY_RE.match(str(key)):
            out[key] = _REDACTED
        else:
            out[key] = redact_secrets(value)
    return out


def redact_secrets(value: Any) -> Any:
    """Recursively redact Authorization / Bearer / token-like secrets before write."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key, item in value.items():
            if _SECRET_KEY_RE.match(str(key)):
                out[key] = _REDACTED
            else:
                out[key] = redact_secrets(item)
        return out
    if isinstance(value, list):
        return [redact_secrets(item) for item in value]
    if isinstance(value, str):
        return _BEARER_RE.sub(rf"\1{_REDACTED}", value)
    return value


def summarize_result(result: Any, *, max_chars: int = 400) -> dict[str, Any]:
    """Build a compact, redacted summary of an MCP tool result."""
    redacted = redact_secrets(result)
    summary: dict[str, Any] = {"type": type(result).__name__}
    if isinstance(redacted, dict):
        summary["keys"] = sorted(str(k) for k in redacted.keys())[:20]
        urns = _extract_urns(redacted)
        if urns:
            summary["urns"] = urns[:12]
        preview = json.dumps(redacted, default=str)
    elif isinstance(redacted, list):
        summary["count"] = len(redacted)
        urns = _extract_urns(redacted)
        if urns:
            summary["urns"] = urns[:12]
        preview = json.dumps(redacted, default=str)
    else:
        preview = str(redacted)
    if len(preview) > max_chars:
        preview = preview[: max_chars - 3] + "..."
    summary["preview"] = preview
    return summary


def _extract_urns(value: Any, found: list[str] | None = None) -> list[str]:
    """Collect urn:li:… strings from nested payloads (order-preserving, unique)."""
    if found is None:
        found = []
    seen = set(found)
    if isinstance(value, str):
        if value.startswith("urn:li:") and value not in seen:
            found.append(value)
            seen.add(value)
    elif isinstance(value, dict):
        for item in value.values():
            _extract_urns(item, found)
    elif isinstance(value, list):
        for item in value:
            _extract_urns(item, found)
    return found


class TranscriptRecorder:
    """Append redacted MCP tools/call receipts to a JSONL transcript file."""

    def __init__(self, base_dir: Path | None = None, *, session_id: str | None = None) -> None:
        self._base_dir = base_dir or DEFAULT_TRANSCRIPT_DIR
        self._base_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        name = f"mcp-{session_id or stamp}.jsonl"
        self._path = self._base_dir / name

    @property
    def path(self) -> Path:
        return self._path

    def record_tool_call(
        self,
        tool: str,
        arguments: dict[str, Any] | None,
        result: Any,
        *,
        latency_ms: float,
        headers: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        """Persist one redacted tools/call receipt. Returns the written envelope."""
        entry: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(),
            "method": "tools/call",
            "tool": tool,
            "args": redact_secrets(arguments or {}),
            "result_summary": summarize_result(result) if error is None else None,
            "latency_ms": round(latency_ms, 2),
            "headers": redact_headers(headers),
        }
        if error is not None:
            entry["error"] = redact_secrets(error)
        line = json.dumps(entry, default=str)
        with self._path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        logger.debug(
            "datahub.mcp.transcript",
            tool=tool,
            latency_ms=entry["latency_ms"],
            path=str(self._path),
        )
        return entry


_default_recorder: TranscriptRecorder | None = None


def get_transcript_recorder() -> TranscriptRecorder:
    """Return a process-wide transcript recorder (lazy singleton)."""
    global _default_recorder
    if _default_recorder is None:
        _default_recorder = TranscriptRecorder()
    return _default_recorder


class timed_tool_call:
    """Context manager that measures latency for a tool call."""

    def __init__(self) -> None:
        self._start = 0.0

    def __enter__(self) -> timed_tool_call:
        self._start = time.perf_counter()
        return self

    def elapsed_ms(self) -> float:
        """Milliseconds since enter (safe to call from finally before exit)."""
        return (time.perf_counter() - self._start) * 1000.0

    def __exit__(self, *args: object) -> None:
        return None