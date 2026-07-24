"""Analytics Agent before/after write-back tests."""

from __future__ import annotations

import pytest

from app.analytics.agent import AnalyticsAgentClient
from app.analytics.demo import before_after


@pytest.mark.asyncio
async def test_before_lacks_postmortem_context() -> None:
    """Before write-back the answer should not include Scribe postmortem details."""
    result = await before_after(
        question="what happened to orders data this week?",
        scenario="schema_drift",
        client=AnalyticsAgentClient(),
    )

    assert "postmortem" not in result.before.text.lower()
    assert "root cause" not in result.before.text.lower()
    assert result.before.confidence < result.after.confidence


@pytest.mark.asyncio
async def test_after_includes_postmortem_context() -> None:
    """After write-back the answer includes incident postmortem context."""
    result = await before_after(
        question="what happened to orders data this week?",
        scenario="schema_drift",
    )

    assert "schema_drift" in result.after.text
    assert "root cause" in result.after.text.lower()
    assert any("postmortem" in source or "contextDocument" in source for source in result.after.sources)
    assert result.diff
    assert any("root cause" in snippet.lower() for snippet in result.diff)


@pytest.mark.asyncio
async def test_before_after_is_deterministic() -> None:
    """Repeated calls produce identical before/after payloads."""
    first = await before_after(scenario="schema_drift")
    second = await before_after(scenario="schema_drift")
    assert first.before.text == second.before.text
    assert first.after.text == second.after.text
    assert first.diff == second.diff
