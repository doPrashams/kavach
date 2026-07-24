"""Persist agent run events for replay."""

from __future__ import annotations

from pathlib import Path

from app.agents.state import AgentEvent

RECORDINGS_DIR = Path(__file__).resolve().parents[1] / "events" / "recordings"


class RunRecorder:
    """Append AgentEvents to a per-run JSONL file."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self._base_dir = base_dir or RECORDINGS_DIR
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def path_for(self, run_id: str) -> Path:
        """Return the JSONL path for a run."""
        return self._base_dir / f"{run_id}.jsonl"

    def record(self, event: AgentEvent) -> None:
        """Append a single event."""
        path = self.path_for(event.run_id)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(event.model_dump_json() + "\n")

    def load(self, run_id: str) -> list[AgentEvent]:
        """Load all events for a run."""
        path = self.path_for(run_id)
        if not path.exists():
            return []
        events: list[AgentEvent] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                events.append(AgentEvent.model_validate_json(line))
        return events

    def list_recordings(self) -> list[str]:
        """List available recording run ids."""
        return sorted(p.stem for p in self._base_dir.glob("*.jsonl"))
