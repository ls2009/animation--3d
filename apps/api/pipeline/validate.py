"""Bridge to the engine's validator — the validator is law, and there is
exactly one implementation (TypeScript). Model output goes through
packages/engine/scripts/validate-cli.ts via a short-lived node process, so
Python and the player can never disagree about what a valid script is.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from .errors import UnrepairableScriptError, ValidatorBridgeError


def _tsx_path(repo_root: Path) -> Path:
    for candidate in (
        repo_root / "packages/engine/node_modules/.bin/tsx",
        repo_root / "node_modules/.bin/tsx",
    ):
        if candidate.exists():
            return candidate
    raise ValidatorBridgeError(
        "tsx not found — run `pnpm install` at the repo root so the validator bridge can run"
    )


def validate_script(raw: Any, repo_root: Path, timeout_s: float = 60.0) -> dict[str, Any]:
    """Returns {script, warnings, stats}. Raises UnrepairableScriptError for
    scripts the validator rejects outright (no scenes / non-object), and
    ValidatorBridgeError when the bridge itself fails."""
    cli = repo_root / "packages/engine/scripts/validate-cli.ts"
    try:
        proc = subprocess.run(
            [str(_tsx_path(repo_root)), str(cli)],
            input=json.dumps(raw).encode("utf-8"),
            capture_output=True,
            timeout=timeout_s,
            cwd=str(repo_root),
        )
    except subprocess.TimeoutExpired as err:
        raise ValidatorBridgeError(f"validator timed out after {timeout_s}s") from err

    if proc.returncode != 0:
        raise ValidatorBridgeError(
            f"validator process failed (rc={proc.returncode}): {proc.stderr.decode()[:500]}"
        )
    try:
        result = json.loads(proc.stdout.decode("utf-8"))
    except json.JSONDecodeError as err:
        raise ValidatorBridgeError(f"validator wrote non-JSON: {proc.stdout[:200]!r}") from err

    if not result.get("ok"):
        error = result.get("error", {})
        raise UnrepairableScriptError(f"{error.get('code')}: {error.get('message')}")
    return {
        "script": result["script"],
        "warnings": result["warnings"],
        "stats": result["stats"],
    }
