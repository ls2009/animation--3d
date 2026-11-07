"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLesson } from "../../lib/api";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

export default function NewLessonPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("curious teens");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id } = await createLesson({ topic, audience, language });
      router.push(`/lessons/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Animate any topic</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Type a topic, pick an audience and a language — watch a generated
            3D lesson in about a minute.
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-300">Topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            placeholder="How a turbocharger works"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:border-sky-500"
            data-testid="topic"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-300">Audience</span>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="curious teens"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:border-sky-500"
            data-testid="audience"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-300">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 outline-none focus:border-sky-500"
            data-testid="language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-500 py-2.5 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          data-testid="submit"
        >
          {busy ? "Starting…" : "Generate the lesson"}
        </button>
      </form>
    </main>
  );
}
