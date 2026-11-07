import type { Metadata } from "next";
import DemoPlayer from "./DemoPlayer";

export const metadata: Metadata = {
  title: "Sinaa Motion Lab — Engine demo",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Sinaa Motion Lab</h1>
          <p className="text-sm text-neutral-400">
            Engine demo — three built-in lessons, played fully offline
          </p>
        </header>
        <DemoPlayer />
      </div>
    </main>
  );
}
