"""Keyframe rendering for the Inspector: one PNG per scene at its midpoint,
via the Phase 2 headless renderer (`pnpm keyframes` CLI). Injectable so
tests supply a fake renderer."""

from __future__ import annotations

import json
import subprocess
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol

from .errors import GenerationError


class KeyframeRenderError(GenerationError):
    code = "keyframe_render_failed"


class KeyframeRenderer(Protocol):
    def __call__(self, script: dict[str, Any]) -> list[bytes]: ...


def make_cli_renderer(repo_root: Path, timeout_s: float = 300.0) -> Callable[[dict], list[bytes]]:
    def render(script: dict[str, Any]) -> list[bytes]:
        with tempfile.TemporaryDirectory(prefix="sinaa-inspect-") as tmp:
            tmp_path = Path(tmp)
            script_file = tmp_path / "script.json"
            script_file.write_text(json.dumps(script), encoding="utf-8")
            out_dir = tmp_path / "frames"
            tsx = repo_root / "packages/engine/node_modules/.bin/tsx"
            proc = subprocess.run(
                [
                    str(tsx),
                    str(repo_root / "tools/headless/src/cli.ts"),
                    str(script_file),
                    str(out_dir),
                ],
                capture_output=True,
                timeout=timeout_s,
                cwd=str(repo_root / "tools/headless"),
            )
            if proc.returncode != 0:
                raise KeyframeRenderError(
                    f"keyframes CLI failed (rc={proc.returncode}): {proc.stderr.decode()[:400]}"
                )
            frames = sorted(out_dir.glob("scene-*.png"))
            if len(frames) != len(script["scenes"]):
                raise KeyframeRenderError(
                    f"expected {len(script['scenes'])} frames, got {len(frames)}"
                )
            return [frame.read_bytes() for frame in frames]

    return render
