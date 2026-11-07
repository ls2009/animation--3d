"use client";

/**
 * Golden-set dashboard: the last five runs side by side, with a per-topic
 * drill-down for the selected run. Inspector keyframes and the feedback
 * backlog join in Phase 5/6.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";

interface GoldenRun {
  id: string;
  git_sha: string;
  started_at: string;
  prompt_versions: Record<string, string> | null;
  summary: {
    topics?: number;
    success_rate?: number;
    mean_repairs?: number | null;
    inspector_first_pass_rate?: number | null;
    mean_cost_usd?: number | null;
    p50_runtime_s?: number | null;
    regressions?: string[];
  } | null;
}

interface GoldenResult {
  topic_id: string;
  lesson_id: string | null;
  status: string;
  repairs: number | null;
  inspector_pass_rate: number | null;
  runtime_s: number | null;
  cost_usd: number | null;
}

const METRICS: {
  key: keyof NonNullable<GoldenRun["summary"]>;
  label: string;
  fmt: (v: number) => string;
}[] = [
  { key: "success_rate", label: "Success rate", fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: "mean_repairs", label: "Mean repairs", fmt: (v) => v.toFixed(2) },
  {
    key: "inspector_first_pass_rate",
    label: "Inspector 1st-pass",
    fmt: (v) => `${(v * 100).toFixed(0)}%`,
  },
  { key: "mean_cost_usd", label: "Mean cost", fmt: (v) => `$${v.toFixed(3)}` },
  { key: "p50_runtime_s", label: "p50 runtime", fmt: (v) => `${v.toFixed(0)}s` },
];

export default function GoldenDashboard() {
  const [runs, setRuns] = useState<GoldenRun[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<GoldenResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/golden/runs?limit=5`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRuns(d.runs);
        if (d.runs[0]) setSelected(d.runs[0].id);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setResults(null);
    fetch(`${API_URL}/golden/runs/${selected}/results`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setResults(d.results))
      .catch((e) => setError(String(e)));
  }, [selected]);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Golden set</h1>
          <p className="text-sm text-neutral-400">
            The regression gate: no prompt, prop, validator or DSL change merges without a run.
          </p>
        </header>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {runs && runs.length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
            No runs yet — run <code className="text-sky-300">pnpm golden:run</code>.
          </p>
        )}

        {runs && runs.length > 0 && (
          <section className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400">
                  <th className="py-1 pr-4">Metric</th>
                  {runs.map((run) => (
                    <th key={run.id} className="py-1 pr-4">
                      <button
                        onClick={() => setSelected(run.id)}
                        className={`font-mono text-xs ${
                          selected === run.id ? "text-sky-300" : "hover:text-neutral-200"
                        }`}
                        title={new Date(run.started_at).toLocaleString()}
                      >
                        {run.git_sha.slice(0, 7)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => (
                  <tr key={metric.key} className="border-t border-neutral-800">
                    <td className="py-1.5 pr-4 text-neutral-300">{metric.label}</td>
                    {runs.map((run) => {
                      const value = run.summary?.[metric.key];
                      return (
                        <td key={run.id} className="py-1.5 pr-4 font-mono text-xs">
                          {typeof value === "number" ? metric.fmt(value) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-neutral-800">
                  <td className="py-1.5 pr-4 text-neutral-300">Gate</td>
                  {runs.map((run) => {
                    const regressions = run.summary?.regressions ?? [];
                    return (
                      <td key={run.id} className="py-1.5 pr-4 text-xs">
                        {run.summary === null ? (
                          <span className="text-neutral-500">running…</span>
                        ) : regressions.length === 0 ? (
                          <span className="text-emerald-400">pass</span>
                        ) : (
                          <span className="text-rose-400" title={regressions.join("\n")}>
                            FAIL ({regressions.length})
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {results && (
          <section className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-200">
              Topics in run <span className="font-mono text-xs">{selected?.slice(0, 8)}</span>
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400">
                  <th className="py-1 pr-3">Topic</th>
                  <th className="py-1 pr-3">Status</th>
                  <th className="py-1 pr-3">Repairs</th>
                  <th className="py-1 pr-3">Inspector</th>
                  <th className="py-1 pr-3">Runtime</th>
                  <th className="py-1 pr-3">Cost</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.topic_id} className="border-t border-neutral-800">
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.topic_id}</td>
                    <td className={`py-1.5 pr-3 text-xs ${r.status === "ready" ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.status}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.repairs ?? "—"}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">
                      {r.inspector_pass_rate !== null
                        ? `${((r.inspector_pass_rate ?? 0) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">
                      {r.runtime_s !== null ? `${r.runtime_s.toFixed(1)}s` : "—"}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">
                      {r.cost_usd !== null ? `$${r.cost_usd.toFixed(3)}` : "—"}
                    </td>
                    <td className="py-1.5 text-xs">
                      {r.lesson_id && r.status === "ready" && (
                        <Link
                          href={`/lessons/${r.lesson_id}`}
                          className="text-sky-400 hover:underline"
                        >
                          open
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
