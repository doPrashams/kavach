"""MTTR computation and trend persistence."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, Field

from app.agents.state import AgentEvent, IncidentState

METRICS_DIR = Path(__file__).resolve().parents[1] / "events" / "metrics"
MTTR_PATH = METRICS_DIR / "mttr.jsonl"


class MttrRecord(BaseModel):
    """Single MTTR observation."""

    run_id: str
    scenario: str | None = None
    mttr_seconds: float
    cited_prior: bool = False
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


def compute_mttr(
    state: IncidentState,
    events: list[AgentEvent] | None = None,
) -> float:
    """Compute MTTR from timeline processing durations (fallback to wall clock)."""
    timeline = events if events is not None else state.timeline
    if not timeline:
        return 0.0
    total_ms = 0.0
    for event in timeline:
        ms = event.payload.get("processing_ms")
        if isinstance(ms, (int, float)):
            total_ms += float(ms)
    if total_ms > 0:
        return total_ms / 1000.0
    start = timeline[0].timestamp
    end = timeline[-1].timestamp
    return max((end - start).total_seconds(), 0.0)


def record_mttr(
    state: IncidentState,
    *,
    cited_prior: bool = False,
    events: list[AgentEvent] | None = None,
) -> MttrRecord:
    """Persist MTTR for a completed run."""
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    scenario = state.trigger.get("scenario")
    record = MttrRecord(
        run_id=state.run_id,
        scenario=str(scenario) if scenario else None,
        mttr_seconds=compute_mttr(state, events=events),
        cited_prior=cited_prior,
    )
    with MTTR_PATH.open("a", encoding="utf-8") as handle:
        handle.write(record.model_dump_json() + "\n")
    return record


def mttr_trend(*, scenario: str | None = None) -> list[float]:
    """Return MTTR series across recorded runs (optionally filtered by scenario)."""
    if not MTTR_PATH.exists():
        return []
    values: list[float] = []
    for line in MTTR_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = MttrRecord.model_validate_json(line)
        if scenario and record.scenario != scenario:
            continue
        values.append(record.mttr_seconds)
    return values


def load_records(*, scenario: str | None = None) -> list[MttrRecord]:
    """Load MTTR records for tests."""
    if not MTTR_PATH.exists():
        return []
    records: list[MttrRecord] = []
    for line in MTTR_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rec = MttrRecord.model_validate_json(line)
            if scenario is None or rec.scenario == scenario:
                records.append(rec)
    return records
