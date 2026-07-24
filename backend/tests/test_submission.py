"""H12 submission asset checks."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
README = REPO_ROOT / "README.md"
DOC_PATHS = [
    REPO_ROOT / "docs/JUDGING.md",
    REPO_ROOT / "docs/VIDEO.md",
    REPO_ROOT / "docs/DEVPOST.md",
    REPO_ROOT / "docs/handoffs/H12-submission/SUBMIT.md",
    REPO_ROOT / "docs/ARCHITECTURE.md",
]


def _readme() -> str:
    return README.read_text(encoding="utf-8")


def test_readme_datahub_matrix() -> None:
    text = _readme().lower()
    assert "how kavach uses datahub" in text or "uses datahub" in text
    assert "|" in text  # matrix table


def test_readme_quickstart() -> None:
    assert "quickstart" in _readme().lower()


def test_readme_architecture_diagram() -> None:
    text = _readme().lower()
    assert "mermaid" in text or "architecture" in text


def test_readme_claims_four_categories() -> None:
    text = _readme()
    hits = len(re.findall(r"category|challenge [1-4]|cat [1-4]", text, flags=re.I))
    assert hits >= 4


def test_submission_docs_exist() -> None:
    for path in DOC_PATHS:
        assert path.is_file(), f"missing {path}"


def test_internal_doc_links_resolve() -> None:
    link_pattern = re.compile(r"\]\(([^)#]+(?:\.md|/)[^)]*)\)")
    for doc in DOC_PATHS + [README]:
        content = doc.read_text(encoding="utf-8")
        for raw in link_pattern.findall(content):
            if raw.startswith("http"):
                continue
            target = (doc.parent / raw).resolve()
            if not target.exists():
                # repo-root relative from README/docs
                alt = (REPO_ROOT / raw.lstrip("/")).resolve()
                assert alt.exists(), f"broken link in {doc.name}: {raw}"


def test_examples_populated() -> None:
    examples = REPO_ROOT / "examples"
    entries = [p for p in examples.iterdir() if p.name != ".gitkeep"]
    assert len(entries) >= 4
    for sub in ("prs", "postmortems", "assertions", "mttr_report.json"):
        path = examples / sub
        assert path.exists(), f"missing examples/{sub}"
