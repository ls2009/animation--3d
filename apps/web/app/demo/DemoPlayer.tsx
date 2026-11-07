"use client";

/**
 * Demo surface for the engine: lesson switcher, 3D stage with orbit,
 * scene strip, scrub bar, voice toggle, learner controls and the quick
 * check. Everything plays offline from the built-in scripts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BUILTIN_LESSONS, createPlayer, type Player } from "@sinaa/engine";
import type { Script } from "@sinaa/dsl";

export default function DemoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  const [lessonIndex, setLessonIndex] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneTime, setSceneTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(false);
  const [ended, setEnded] = useState(false);
  const [controlValues, setControlValues] = useState<Record<string, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);

  const script: Script = BUILTIN_LESSONS[lessonIndex]!;
  const scene = script.scenes[sceneIndex] ?? script.scenes[0]!;

  // Mount the player once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const labels = labelsRef.current;
    if (!canvas || !labels) return;
    const player = createPlayer(canvas, labels);
    playerRef.current = player;

    const offScene = player.on("scene", (i) => {
      setSceneIndex(i);
      setEnded(false);
    });
    const offTick = player.on("tick", (_i, t) => setSceneTime(t));
    const offEnded = player.on("ended", () => {
      setEnded(true);
      setPlaying(false);
      setShowQuiz(true);
    });

    const onResize = () => player.resize();
    window.addEventListener("resize", onResize);

    return () => {
      offScene();
      offTick();
      offEnded();
      window.removeEventListener("resize", onResize);
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  // (Re)load on lesson change.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.load(BUILTIN_LESSONS[lessonIndex]!);
    setSceneIndex(0);
    setSceneTime(0);
    setPlaying(false);
    setEnded(false);
    setShowQuiz(false);
    setControlValues(player.getControls());
  }, [lessonIndex]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
      setEnded(false);
    }
  }, []);

  const seek = useCallback((i: number, t: number) => {
    playerRef.current?.seek(i, t);
    setSceneIndex(i);
    setSceneTime(t);
  }, []);

  const activeNarration = (() => {
    let text = "";
    for (const n of scene.narration) if (n.t <= sceneTime) text = n.text;
    return text;
  })();

  return (
    <div className="space-y-4">
      {/* Lesson switcher */}
      <div className="flex flex-wrap gap-2">
        {BUILTIN_LESSONS.map((lesson, i) => (
          <button
            key={lesson.title}
            onClick={() => setLessonIndex(i)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              i === lessonIndex
                ? "bg-sky-500 text-white"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {lesson.title}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <canvas ref={canvasRef} className="block h-[420px] w-full touch-none" />
        <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden text-xs font-medium text-neutral-100 [&>div]:rounded [&>div]:bg-black/55 [&>div]:px-1.5 [&>div]:py-0.5" />
        {/* Caption — always visible */}
        <div
          data-testid="caption"
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-8 text-center text-sm text-neutral-100"
        >
          {activeNarration}
        </div>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
        <button
          onClick={() => playerRef.current && seek(sceneIndex - 1, 0)}
          disabled={sceneIndex === 0}
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm disabled:opacity-40"
          aria-label="Previous scene"
        >
          ⏮
        </button>
        <button
          onClick={togglePlay}
          className="rounded bg-sky-500 px-5 py-1.5 text-sm font-semibold text-white"
          aria-label={playing ? "Pause" : "Play"}
          data-testid="play"
        >
          {playing ? "Pause" : ended ? "Replay" : "Play"}
        </button>
        <button
          onClick={() => playerRef.current && seek(sceneIndex + 1, 0)}
          disabled={sceneIndex >= script.scenes.length - 1}
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm disabled:opacity-40"
          aria-label="Next scene"
        >
          ⏭
        </button>
        <input
          type="range"
          min={0}
          max={scene.duration}
          step={0.05}
          value={sceneTime}
          onChange={(e) => seek(sceneIndex, Number(e.target.value))}
          className="min-w-32 flex-1 accent-sky-500"
          aria-label="Scrub scene time"
          data-testid="scrub"
        />
        <span className="w-20 text-right font-mono text-xs text-neutral-400">
          {sceneTime.toFixed(1)}s / {scene.duration}s
        </span>
        <label className="flex items-center gap-1.5 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={voice}
            onChange={(e) => {
              setVoice(e.target.checked);
              playerRef.current?.setVoice(e.target.checked);
            }}
            className="accent-sky-500"
          />
          Voice
        </label>
      </div>

      {/* Scene strip */}
      <div className="flex flex-wrap gap-2" data-testid="scene-strip">
        {script.scenes.map((sc, i) => (
          <button
            key={`${sc.title}-${i}`}
            onClick={() => seek(i, 0)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              i === sceneIndex
                ? "border-sky-500 bg-sky-500/15 text-sky-300"
                : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            {i + 1}. {sc.title}
          </button>
        ))}
      </div>

      {/* Key fact */}
      {scene.keyFact && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          <span className="mr-2 font-semibold uppercase tracking-wide text-amber-400">Key fact</span>
          {scene.keyFact}
        </p>
      )}

      {/* Learner controls */}
      {script.controls.length > 0 && (
        <div className="flex flex-wrap gap-6 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
          {script.controls.map((control) => (
            <label key={control.id} className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
              <span className="flex justify-between text-neutral-300">
                {control.label}
                <span className="font-mono text-xs text-neutral-500">
                  {controlValues[control.id] ?? control.default}
                </span>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={(control.max - control.min) / 100}
                value={controlValues[control.id] ?? control.default}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setControlValues((v) => ({ ...v, [control.id]: value }));
                  playerRef.current?.setControl(control.id, value);
                }}
                className="accent-sky-500"
              />
            </label>
          ))}
        </div>
      )}

      {/* Quick check */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">Quick check</h2>
          {!showQuiz && (
            <button
              onClick={() => setShowQuiz(true)}
              className="text-xs text-sky-400 hover:underline"
              data-testid="show-quiz"
            >
              Take it now
            </button>
          )}
        </div>
        {showQuiz && <Quiz key={lessonIndex} script={script} />}
      </div>
    </div>
  );
}

function Quiz({ script }: { script: Script }) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    script.checks.map(() => null),
  );
  const score = answers.filter((a, i) => a === script.checks[i]!.answer).length;
  const done = answers.every((a) => a !== null);

  return (
    <div className="mt-3 space-y-4" data-testid="quiz">
      {script.checks.map((check, qi) => {
        const picked = answers[qi];
        return (
          <div key={qi}>
            <p className="mb-2 text-sm text-neutral-200">
              {qi + 1}. {check.question}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {check.options.map((option, oi) => {
                const isPicked = picked === oi;
                const isRight = oi === check.answer;
                const cls =
                  picked === null
                    ? "border-neutral-700 bg-neutral-800 hover:border-sky-500"
                    : isRight
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                      : isPicked
                        ? "border-rose-500 bg-rose-500/15 text-rose-200"
                        : "border-neutral-800 bg-neutral-900 text-neutral-500";
                return (
                  <button
                    key={oi}
                    disabled={picked !== null}
                    onClick={() =>
                      setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {picked !== null && check.explain && (
              <p className="mt-2 text-xs text-neutral-400">{check.explain}</p>
            )}
          </div>
        );
      })}
      {done && (
        <p className="text-sm font-semibold text-sky-300" data-testid="quiz-score">
          Score: {score} / {script.checks.length}
        </p>
      )}
    </div>
  );
}
