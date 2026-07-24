"""Postmortem vector store with deterministic local embeddings."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass

import structlog

from app.datahub.models import ContextDocument

logger = structlog.get_logger(__name__)

EMBED_DIMS = 64


def deterministic_embed(text: str, *, dims: int = EMBED_DIMS) -> list[float]:
    """Hash-based embedding for offline reproducible retrieval."""
    vec = [0.0] * dims
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        idx = int(digest, 16) % dims
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    return sum(x * y for x, y in zip(a, b, strict=True))


@dataclass(frozen=True)
class IndexedPostmortem:
    """Stored postmortem with embedding."""

    urn: str
    title: str
    body: str
    scenario: str | None
    resolution: str
    embedding: list[float]


class PostmortemStore:
    """In-memory index over Context Documents / postmortems."""

    def __init__(self) -> None:
        self._items: list[IndexedPostmortem] = []

    def clear(self) -> None:
        """Reset the index (tests)."""
        self._items.clear()

    @staticmethod
    def _scenario_from_doc(doc: ContextDocument) -> str | None:
        haystack = f"{doc.title} {doc.body}".lower()
        for name in (
            "freshness_lag",
            "schema_drift",
            "null_spike",
            "value_corruption",
        ):
            if name.replace("_", " ") in haystack or name in haystack:
                return name
        for tag in doc.tags:
            if tag in {
                "freshness_lag",
                "schema_drift",
                "null_spike",
                "value_corruption",
            }:
                return tag
        return None

    @staticmethod
    def _resolution_from_body(body: str) -> str:
        for line in body.splitlines():
            if line.lower().startswith("fix:") or line.lower().startswith("root cause:"):
                return line.split(":", 1)[-1].strip()
        return body.splitlines()[0] if body else "unknown resolution"

    def index_document(self, doc: ContextDocument, *, scenario: str | None = None) -> None:
        """Add a context document to the index."""
        sc = scenario or self._scenario_from_doc(doc)
        resolution = self._resolution_from_body(doc.body)
        item = IndexedPostmortem(
            urn=doc.urn,
            title=doc.title,
            body=doc.body,
            scenario=sc,
            resolution=resolution,
            embedding=deterministic_embed(f"{doc.title}\n{doc.body}"),
        )
        self._items = [i for i in self._items if i.urn != doc.urn]
        self._items.append(item)
        logger.info("flywheel.indexed", urn=doc.urn, scenario=sc)

    def search(
        self,
        query: str,
        *,
        k: int = 3,
        scenario: str | None = None,
    ) -> list[tuple[IndexedPostmortem, float]]:
        """Return top-k postmortems by cosine similarity."""
        q_vec = deterministic_embed(query)
        scored: list[tuple[IndexedPostmortem, float]] = []
        for item in self._items:
            if scenario and item.scenario and item.scenario != scenario:
                continue
            score = cosine_similarity(q_vec, item.embedding)
            scored.append((item, score))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:k]


STORE = PostmortemStore()
