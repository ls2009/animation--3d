export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Sinaa Motion Lab</h1>
      <p className="max-w-xl text-center text-lg text-neutral-500">
        Type any topic, an audience and a language — watch a generated 3D
        animated lesson you can orbit, scrub, listen to, and finish with a
        three-question check.
      </p>
      <div className="flex gap-3">
        <a
          href="/new"
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Generate a lesson
        </a>
        <a
          href="/demo"
          className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
        >
          Built-in demo
        </a>
      </div>
    </main>
  );
}
