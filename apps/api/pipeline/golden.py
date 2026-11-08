"""Golden-set runner — the regression gate.

`pnpm golden:run` → this module. Generates every topic in
packages/golden/topics.json through the pipeline with CACHING OFF (every
topic is re-generated even when a lesson with the same fingerprint already
holds a script), stores one golden_runs row plus one golden_results row per
topic, prints the table, and exits 1 when any metric regresses beyond the
thresholds versus the previous completed run.

No prompt, prop, validator or DSL change merges without a run.
"""

from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .single_pass import SinglePassPipeline
from .store import Store

# Regression thresholds (mission "Evaluation" table).
THRESHOLDS = {
    "success_rate": {"target": 0.90, "max_drop": 0.05},
    "mean_repairs": {"target": 2.0, "max_rise": 1.0},
    "inspector_first_pass_rate": {"target": 0.70, "max_drop": 0.10},
    "mean_cost_usd": {"target": 0.40, "max_rise_pct": 0.25},
    "p50_runtime_s": {"target": 60.0, "max_rise_pct": 0.30},
}


@dataclass
class TopicResult:
    topic_id: str
    lesson_id: str | None
    status: str
    repairs: int | None
    inspector_pass_rate: float | None
    runtime_s: float
    cost_usd: float
    script: dict[str, Any] | None
    error: str | None = None


def load_topics(repo_root: Path) -> list[dict[str, Any]]:
    data = json.loads(
        (repo_root / "packages" / "golden" / "topics.json").read_text(encoding="utf-8")
    )
    return data["topics"]


def git_sha(repo_root: Path) -> str:
    try:
        return (
            subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_root,
                capture_output=True,
                timeout=10,
                check=True,
            )
            .stdout.decode()
            .strip()
        )
    except Exception:
        return "unknown"


def run_topic(pipeline: SinglePassPipeline, store: Store, topic: dict[str, Any]) -> TopicResult:
    fingerprint = pipeline.fingerprint(topic["topic"], topic["audience"], topic["language"])
    lesson = store.get_lesson_by_fingerprint(fingerprint)
    if lesson is None:
        lesson = store.create_lesson(
            fingerprint, topic["topic"], topic["audience"], topic["language"]
        )
    else:
        # Caching OFF: regenerate even though a script exists.
        store.set_status(lesson.id, "queued")

    started = time.monotonic()
    pipeline.run(lesson.id)
    runtime_s = round(time.monotonic() - started, 2)

    refreshed = store.get_lesson(lesson.id)
    events = store.list_events(lesson.id)

    # Metrics come from THIS generation's events (the tail after the last
    # generation_started — the ledger accumulates across reruns).
    last_gen_start = max(
        (i for i, e in enumerate(events) if e["kind"] == "generation_started"), default=0
    )
    tail = events[last_gen_start:]
    repairs = None
    cost = 0.0
    error = None
    first_inspection: float | None = None
    for event in tail:
        if event["kind"] == "validator_repairs":
            repairs = event["payload"]["repair_count"]
        if event["kind"] == "agent_call":
            cost += float(event["payload"].get("cost_usd") or 0)
        if event["kind"] == "inspection" and first_inspection is None:
            first_inspection = float(event["payload"].get("pass_rate") or 0)
        if event["kind"] == "failed":
            error = f"{event['payload'].get('error_code')}: {event['payload'].get('message')}"

    return TopicResult(
        topic_id=topic["id"],
        lesson_id=lesson.id,
        status=refreshed.status if refreshed else "failed",
        repairs=repairs,
        inspector_pass_rate=first_inspection,  # first-pass rate; None on single-pass
        runtime_s=runtime_s,
        cost_usd=round(cost, 6),
        script=refreshed.current_script if refreshed and refreshed.status == "ready" else None,
        error=error,
    )


def summarize(results: list[TopicResult]) -> dict[str, Any]:
    total = len(results)
    successes = [r for r in results if r.status == "ready"]
    repairs = [r.repairs for r in successes if r.repairs is not None]
    inspector = [r.inspector_pass_rate for r in results if r.inspector_pass_rate is not None]
    costs = [r.cost_usd for r in results if r.cost_usd]
    runtimes = sorted(r.runtime_s for r in results)
    return {
        "topics": total,
        "success_rate": round(len(successes) / total, 4) if total else 0.0,
        "mean_repairs": round(statistics.mean(repairs), 3) if repairs else None,
        "inspector_first_pass_rate": (
            round(statistics.mean(inspector), 4) if inspector else None
        ),
        "mean_cost_usd": round(statistics.mean(costs), 4) if costs else None,
        "p50_runtime_s": round(statistics.median(runtimes), 2) if runtimes else None,
    }


def compare(current: dict[str, Any], previous: dict[str, Any] | None) -> list[str]:
    """Returns a list of regression descriptions; empty = gate passes."""
    if previous is None:
        return []
    regressions: list[str] = []

    def both(key: str) -> tuple[float, float] | None:
        a, b = current.get(key), previous.get(key)
        if a is None or b is None:
            return None
        return float(a), float(b)

    v = both("success_rate")
    if v and v[0] < v[1] - THRESHOLDS["success_rate"]["max_drop"]:
        regressions.append(f"success_rate fell {v[1]:.2%} -> {v[0]:.2%} (allowed -5pts)")
    v = both("mean_repairs")
    if v and v[0] > v[1] + THRESHOLDS["mean_repairs"]["max_rise"]:
        regressions.append(f"mean_repairs rose {v[1]} -> {v[0]} (allowed +1)")
    v = both("inspector_first_pass_rate")
    if v and v[0] < v[1] - THRESHOLDS["inspector_first_pass_rate"]["max_drop"]:
        regressions.append(
            f"inspector_first_pass_rate fell {v[1]:.2%} -> {v[0]:.2%} (allowed -10pts)"
        )
    v = both("mean_cost_usd")
    if v and v[1] > 0 and v[0] > v[1] * (1 + THRESHOLDS["mean_cost_usd"]["max_rise_pct"]):
        regressions.append(f"mean_cost_usd rose ${v[1]} -> ${v[0]} (allowed +25%)")
    v = both("p50_runtime_s")
    if v and v[1] > 0 and v[0] > v[1] * (1 + THRESHOLDS["p50_runtime_s"]["max_rise_pct"]):
        regressions.append(f"p50_runtime_s rose {v[1]}s -> {v[0]}s (allowed +30%)")
    return regressions


def print_table(results: list[TopicResult], summary: dict[str, Any]) -> None:
    header = f"{'topic':<34} {'status':<8} {'repairs':>7} {'inspect':>8} {'runtime':>8} {'cost':>8}"
    print(header)
    print("-" * len(header))
    for r in results:
        inspect = f"{r.inspector_pass_rate:.0%}" if r.inspector_pass_rate is not None else "-"
        repairs = str(r.repairs) if r.repairs is not None else "-"
        print(
            f"{r.topic_id:<34} {r.status:<8} {repairs:>7} {inspect:>8} "
            f"{r.runtime_s:>7.1f}s ${r.cost_usd:>6.3f}"
        )
        if r.error:
            print(f"    ! {r.error[:110]}")
    print("-" * len(header))
    print(f"summary: {json.dumps(summary)}")


def run_golden(
    pipeline: SinglePassPipeline,
    store: Store,
    topics: list[dict[str, Any]],
    *,
    repo_root: Path,
    workers: int = 4,
) -> tuple[str, dict[str, Any], list[str]]:
    versions = getattr(pipeline, "versions", None) or {"single_pass": pipeline.prompt_version}
    run_id = store.create_golden_run(git_sha(repo_root), dict(versions))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(lambda t: run_topic(pipeline, store, t), topics))
    for r in results:
        store.save_golden_result(
            run_id,
            {
                "topic_id": r.topic_id,
                "lesson_id": r.lesson_id,
                "status": r.status,
                "repairs": r.repairs,
                "inspector_pass_rate": r.inspector_pass_rate,
                "runtime_s": r.runtime_s,
                "cost_usd": r.cost_usd,
                "script": r.script,
            },
        )
    summary = summarize(results)
    previous = store.previous_golden_run(run_id)
    regressions = compare(summary, previous["summary"] if previous else None)
    summary["regressions"] = regressions
    summary["previous_run_id"] = previous["id"] if previous else None
    store.finish_golden_run(run_id, summary)
    print_table(results, summary)
    if regressions:
        print("\nREGRESSION GATE FAILED:")
        for regression in regressions:
            print(f"  - {regression}")
    return run_id, summary, regressions


def main() -> int:
    parser = argparse.ArgumentParser(description="Golden-set regression runner")
    parser.add_argument("--limit", type=int, default=0, help="run only the first N topics")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    # Wiring imports live here so the pipeline package stays app-free.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.main import build_pipeline, build_store
    from app.settings import Settings

    settings = Settings()
    store = build_store(settings)
    pipeline = build_pipeline(settings, store)
    topics = load_topics(settings.repo_root)
    if args.limit:
        topics = topics[: args.limit]

    print(f"golden run: {len(topics)} topics, caching OFF, model={pipeline.model}")
    _, _, regressions = run_golden(
        pipeline, store, topics, repo_root=settings.repo_root, workers=args.workers
    )
    return 1 if regressions else 0


if __name__ == "__main__":
    raise SystemExit(main())
