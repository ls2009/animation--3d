"use client";

/** Demo surface: the three built-in lessons through the shared LessonPlayer. */
import { useState } from "react";
import { BUILTIN_LESSONS } from "@sinaa/engine";
import LessonPlayer from "../../components/LessonPlayer";

export default function DemoPlayer() {
  const [lessonIndex, setLessonIndex] = useState(0);

  return (
    <div className="space-y-4">
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
      <LessonPlayer script={BUILTIN_LESSONS[lessonIndex]!} />
    </div>
  );
}
