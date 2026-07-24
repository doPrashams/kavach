"""Postmortem retrieval for Investigator grounding."""

from __future__ import annotations

from dataclasses import dataclass

from app.agents.state import IncidentState
from app.flywheel.store import STORE


@dataclass(frozen=True)
class PostmortemMatch:
    """Ranked prior postmortem with resolution."""

    urn: str
    title: str
    similarity: float
    resolution: str
    scenario: str | None


def _query_from_incident(incident: IncidentState) -> tuple[str, str | None]:
    trigger = incident.trigger
    scenario = trigger.get("scenario")
    parts = [
        str(scenario or ""),
        str(trigger.get("root_cause") or ""),
        str(trigger.get("summary") or ""),
        str(incident.root_cause or ""),
    ]
    return " ".join(p for p in parts if p), str(scenario) if scenario else None


def find_similar(incident: IncidentState, k: int = 3) -> list[PostmortemMatch]:
    """Find prior postmortems similar to the current incident."""
    query, scenario = _query_from_incident(incident)
    if scenario:
        for item in STORE._items:
            if item.scenario == scenario:
                return [
                    PostmortemMatch(
                        urn=item.urn,
                        title=item.title,
                        similarity=1.0,
                        resolution=item.resolution,
                        scenario=item.scenario,
                    )
                ]
    hits = STORE.search(query, k=k, scenario=scenario)
    return [
        PostmortemMatch(
            urn=item.urn,
            title=item.title,
            similarity=score,
            resolution=item.resolution,
            scenario=item.scenario,
        )
        for item, score in hits
    ]
