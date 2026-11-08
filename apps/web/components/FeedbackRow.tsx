"use client";

/**
 * One row after the quiz: thumbs up, or thumbs down with one of
 * wrong / confusing / boring / broken and an optional note, tied to the
 * current scene index. "broken" routes to the engine backlog in the
 * dashboard; the rest to the prompt & prop backlogs.
 */
import { useState } from "react";
import { postFeedback, type FeedbackVerdict } from "../lib/api";

const DOWN_VERDICTS: { value: FeedbackVerdict; label: string }[] = [
  { value: "wrong", label: "Wrong" },
  { value: "confusing", label: "Confusing" },
  { value: "boring", label: "Boring" },
  { value: "broken", label: "Broken" },
];

export default function FeedbackRow({
  lessonId,
  sceneIndex,
}: {
  lessonId: string;
  sceneIndex: number;
}) {
  const [mode, setMode] = useState<"idle" | "down" | "sent" | "error">("idle");
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [note, setNote] = useState("");

  async function send(v: FeedbackVerdict, withNote?: string) {
    try {
      await postFeedback(lessonId, {
        verdict: v,
        scene_index: sceneIndex,
        note: withNote?.trim() || undefined,
      });
      setMode("sent");
    } catch {
      setMode("error");
    }
  }

  if (mode === "sent") {
    return (
      <p
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        data-testid="feedback-sent"
      >
        Thanks — your feedback shapes the next version of this lesson.
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
      data-testid="feedback-row"
    >
      <span className="text-sm text-neutral-300">Was this lesson good?</span>
      <button
        onClick={() => send("good")}
        aria-label="Thumbs up"
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:border-emerald-500"
        data-testid="thumbs-up"
      >
        👍
      </button>
      <button
        onClick={() => setMode("down")}
        aria-label="Thumbs down"
        aria-expanded={mode === "down"}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:border-rose-500"
        data-testid="thumbs-down"
      >
        👎
      </button>

      {mode === "down" && (
        <div className="flex w-full flex-wrap items-center gap-2 pt-1">
          {DOWN_VERDICTS.map((option) => (
            <button
              key={option.value}
              onClick={() => setVerdict(option.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                verdict === option.value
                  ? "border-rose-500 bg-rose-500/15 text-rose-200"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
              }`}
              data-testid={`verdict-${option.value}`}
            >
              {option.label}
            </button>
          ))}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Optional note (about scene ${sceneIndex + 1})`}
            maxLength={1000}
            aria-label="Feedback note"
            className="min-w-40 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs outline-none focus:border-sky-500"
            data-testid="feedback-note"
          />
          <button
            onClick={() => verdict && send(verdict, note)}
            disabled={!verdict}
            className="rounded-lg bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            data-testid="feedback-send"
          >
            Send
          </button>
        </div>
      )}
      {mode === "error" && (
        <span className="text-xs text-rose-400">Could not send — try again.</span>
      )}
    </div>
  );
}
