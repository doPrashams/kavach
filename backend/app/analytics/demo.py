"""Before/after Analytics Agent demo using writeback deltas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.analytics.agent import DEFAULT_QUESTION, AnalyticsAgentClient, Answer
from app.config import Settings

SCENARIO_WRITEBACKS: dict[str, list[dict[str, Any]]] = {
    "schema_drift": [
        {
            "operation": "create_incident",
            "payload": {
                "urn": "urn:li:incident:demo-schema-drift",
                "title": "Anomaly on raw.order_items",
                "description": "Schema drift on raw.order_items.quantity breaking staging model",
                "status": "open",
                "affected_entities": [
                    "urn:li:dataset:(urn:li:dataPlatform:duckdb,raw.order_items,PROD)"
                ],
                "created_at": "2026-07-24T10:00:00Z",
            },
        },
        {
            "operation": "save_context_document",
            "payload": {
                "urn": "urn:li:contextDocument:demo-schema-drift-postmortem",
                "title": "Postmortem schema_drift",
                "body": (
                    "## Incident: schema_drift\n"
                    "Root cause: Supplier feed renamed quantity to qty, breaking stg_order_items "
                    "→ mart_demand_features\n"
                    "Blast radius: demand forecast prod deployment\n"
                    "Fix: cast coalesce(quantity, qty) in stg_order_items + not_null assertion\n"
                    "Scenario tag: schema_drift\n"
                ),
                "related_entities": [
                    (
                        "urn:li:dataset:(urn:li:dataPlatform:duckdb,"
                        "main_marts.mart_demand_features,PROD)"
                    )
                ],
                "tags": ["postmortem", "incident", "schema_drift"],
                "created_at": "2026-07-24T10:05:00Z",
            },
        },
        {
            "operation": "add_tags",
            "payload": {
                "urn": (
                    "urn:li:dataset:(urn:li:dataPlatform:duckdb,"
                    "main_marts.mart_demand_features,PROD)"
                ),
                "tags": ["incident-resolved"],
            },
        },
        {
            "operation": "update_incident",
            "payload": {
                "urn": "urn:li:incident:demo-schema-drift",
                "title": "Anomaly on raw.order_items",
                "description": "Schema drift on raw.order_items.quantity breaking staging model",
                "status": "resolved",
                "affected_entities": [
                    "urn:li:dataset:(urn:li:dataPlatform:duckdb,raw.order_items,PROD)"
                ],
                "created_at": "2026-07-24T10:00:00Z",
            },
        },
    ],
    "null_spike": [
        {
            "operation": "save_context_document",
            "payload": {
                "urn": "urn:li:contextDocument:demo-null-spike-postmortem",
                "title": "Postmortem null_spike",
                "body": (
                    "## Incident: null_spike\n"
                    "Root cause: Join drops on stg_order_items caused next_day_qty null spike\n"
                    "Fix: widened lookback + not_null assertion on "
                    "mart_demand_features.next_day_qty\n"
                    "Scenario tag: null_spike\n"
                ),
                "related_entities": [
                    (
                        "urn:li:dataset:(urn:li:dataPlatform:duckdb,"
                        "main_marts.mart_demand_features,PROD)"
                    )
                ],
                "tags": ["postmortem", "incident", "null_spike"],
                "created_at": "2026-07-24T10:05:00Z",
            },
        }
    ],
}


class BeforeAfterResult(BaseModel):
    """Comparison of Analytics Agent answers pre/post write-back."""

    question: str
    scenario: str
    before: Answer
    after: Answer
    diff: list[str] = Field(default_factory=list)


def _extract_diff(before: Answer, after: Answer) -> list[str]:
    """Highlight phrases present after write-back but absent before."""
    snippets: list[str] = []
    for line in after.text.splitlines():
        cleaned = line.strip("# ").strip()
        if len(cleaned) < 12:
            continue
        if cleaned.lower() not in before.text.lower():
            snippets.append(cleaned)
    for source in after.sources:
        if source not in before.sources:
            snippets.append(f"source:{source}")
    return snippets


async def before_after(
    question: str = DEFAULT_QUESTION,
    scenario: str = "schema_drift",
    *,
    client: AnalyticsAgentClient | None = None,
) -> BeforeAfterResult:
    """Run the Analytics Agent before and after a scenario write-back."""
    analytics = client or AnalyticsAgentClient(
        settings=Settings(datahub_gms_url=None, datahub_token=None),
    )
    backend = analytics.fixture_backend

    backend.clear()
    before = await analytics.ask(question)

    writebacks = SCENARIO_WRITEBACKS.get(scenario)
    if writebacks is None:
        raise ValueError(f"Unknown analytics scenario: {scenario}")
    backend.load_writebacks(writebacks)
    after = await analytics.ask(question)

    return BeforeAfterResult(
        question=question,
        scenario=scenario,
        before=before,
        after=after,
        diff=_extract_diff(before, after),
    )
