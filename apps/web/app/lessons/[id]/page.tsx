"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ScriptSchema, type Script } from "@sinaa/dsl";
import LessonPlayer from "../../../components/LessonPlayer";
import { getLesson, type LessonStatus } from "../../../lib/api";

const PIPELINE_STEPS = [
  "queued",
  "directing",
  "designing",
  "choreographing",
  "inspecting",
] as const;

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lesson, setLesson] = useState<LessonStatus | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const data = await getLesson(id);
        if (stopped) return;
        setLesson(data);
        setFetchError(null);
        if (data.status !== "ready" && data.status !== "failed") {
          timer = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (stopped) return;
        setFetchError(err instanceof Error ? err.message : String(err));
        timer = setTimeout(poll, 4000);
      }
    }
    poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  let script: Script | null = null;
  if (lesson?.status === "ready" && lesson.script) {
    const parsed = ScriptSchema.safeParse(lesson.script);
    if (parsed.success) script = parsed.data;
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {lesson?.topic ?? "Loading lesson…"}
            </h1>
            {lesson && (
              <p className="text-sm text-neutral-400">
                for {lesson.audience} · {lesson.language}
              </p>
            )}
          </div>
          <Link href="/new" className="text-sm text-sky-400 hover:underline">
            New lesson
          </Link>
        </header>

        {fetchError && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Connection hiccup ({fetchError}) — retrying…
          </p>
        )}

        {lesson && lesson.status !== "ready" && lesson.status !== "failed" && (
          <div
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8"
            data-testid="status-screen"
          >
            <p className="mb-6 text-center text-neutral-300">
              The crew is building your lesson — usually under a minute.
            </p>
            <ol className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
              {PIPELINE_STEPS.map((step) => {
                const reached =
                  PIPELINE_STEPS.indexOf(lesson.status as (typeof PIPELINE_STEPS)[number]) >=
                  PIPELINE_STEPS.indexOf(step);
                const active = lesson.status === step;
                return (
                  <li
                    key={step}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      active
                        ? "animate-pulse border-sky-500 bg-sky-500/20 text-sky-200"
                        : reached
                          ? "border-sky-700 bg-sky-900/30 text-sky-300"
                          : "border-neutral-800 text-neutral-500"
                    }`}
                  >
                    {step}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {lesson?.status === "failed" && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6" data-testid="failed">
            <h2 className="font-semibold text-rose-200">Generation failed</h2>
            <p className="mt-1 text-sm text-rose-300">
              {lesson.error?.error_code ?? "error"}: {lesson.error?.message ?? "unknown"}
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Submitting the same topic again retries the generation.
            </p>
          </div>
        )}

        {script && <LessonPlayer script={script} />}

        {lesson?.status === "ready" && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <button
              onClick={() => setShowScript((v) => !v)}
              className="text-xs text-sky-400 hover:underline"
              data-testid="toggle-script"
            >
              {showScript ? "Hide" : "Show"} scene script (JSON)
            </button>
            {showScript && (
              <pre className="mt-3 max-h-96 overflow-auto rounded bg-neutral-950 p-3 text-xs text-neutral-300">
                {JSON.stringify(lesson.script, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
