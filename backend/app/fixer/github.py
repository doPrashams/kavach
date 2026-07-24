"""GitHub PR opener with dry-run fallback."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import Settings
from app.errors import FixerError
from app.fixer.codegen import FixArtifacts

logger = structlog.get_logger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLES_ROOT = REPO_ROOT / "examples" / "prs"

_FIX_STORE: dict[str, FixArtifacts] = {}
_PR_REFS: dict[str, str] = {}


def store_fix(run_id: str, artifacts: FixArtifacts, pr_ref: str) -> None:
    """Persist generated artifacts for API lookup."""
    _FIX_STORE[run_id] = artifacts
    _PR_REFS[run_id] = pr_ref


def get_fix_artifacts(run_id: str) -> FixArtifacts | None:
    """Return stored fix artifacts for a run."""
    return _FIX_STORE.get(run_id)


def get_pr_ref(run_id: str) -> str | None:
    """Return PR reference (URL or dry-run ref) for a run."""
    return _PR_REFS.get(run_id)


def _write_dry_run(artifacts: FixArtifacts) -> str:
    """Write branch/diff/body/files to examples/prs/<scenario>/."""
    out_dir = EXAMPLES_ROOT / artifacts.scenario
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "branch.txt").write_text(artifacts.branch_name, encoding="utf-8")
    (out_dir / "diff.patch").write_text(artifacts.diff, encoding="utf-8")
    (out_dir / "pr_body.md").write_text(artifacts.pr_body, encoding="utf-8")
    (out_dir / "pr_title.txt").write_text(artifacts.pr_title, encoding="utf-8")
    files_dir = out_dir / "files"
    for rel_path, content in artifacts.files.items():
        target = files_dir / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    ref = f"dry-run://{artifacts.scenario}"
    logger.info("fixer.dry_run_written", scenario=artifacts.scenario, path=str(out_dir))
    return ref


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
async def _github_request(
    method: str,
    url: str,
    token: str,
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method,
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            json=json_body,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise FixerError("Unexpected GitHub API response")
        return data


async def open_pr(artifacts: FixArtifacts, settings: Settings) -> str:
    """Open a PR against DEMO_PIPELINE_REPO or write dry-run artifacts."""
    if not settings.github_pat:
        return _write_dry_run(artifacts)

    repo = settings.demo_pipeline_repo
    base = f"https://api.github.com/repos/{repo}"
    branch = artifacts.branch_name

    ref_data = await _github_request(
        "GET",
        f"{base}/git/ref/heads/main",
        settings.github_pat,
    )
    sha = ref_data["object"]["sha"]

    await _github_request(
        "POST",
        f"{base}/git/refs",
        settings.github_pat,
        json_body={"ref": f"refs/heads/{branch}", "sha": sha},
    )

    for path, content in artifacts.files.items():
        body: dict[str, Any] = {
            "message": f"fix({artifacts.scenario}): {artifacts.pr_title}",
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": branch,
        }
        # Updating an existing file requires its current blob SHA (422 without it).
        async with httpx.AsyncClient(timeout=30.0) as client:
            existing = await client.get(
                f"{base}/contents/{path}",
                headers={
                    "Authorization": f"Bearer {settings.github_pat}",
                    "Accept": "application/vnd.github+json",
                },
                params={"ref": branch},
            )
            if existing.status_code == 200:
                existing_sha = existing.json().get("sha")
                if existing_sha:
                    body["sha"] = existing_sha
        await _github_request(
            "PUT",
            f"{base}/contents/{path}",
            settings.github_pat,
            json_body=body,
        )

    pr = await _github_request(
        "POST",
        f"{base}/pulls",
        settings.github_pat,
        json_body={
            "title": artifacts.pr_title,
            "body": artifacts.pr_body,
            "head": branch,
            "base": "main",
        },
    )
    url = str(pr.get("html_url", f"{base}/pulls"))
    logger.info("fixer.pr_opened", url=url, scenario=artifacts.scenario)
    return url
