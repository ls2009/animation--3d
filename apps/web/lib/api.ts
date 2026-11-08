/** apps/web talks only to apps/api. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LessonStatus {
  id: string;
  topic: string;
  audience: string;
  language: string;
  status:
    | "queued"
    | "directing"
    | "designing"
    | "choreographing"
    | "inspecting"
    | "ready"
    | "failed";
  script_version: string | null;
  script?: unknown;
  error?: { error_code?: string; message?: string };
}

export async function createLesson(body: {
  topic: string;
  audience: string;
  language: string;
}): Promise<{ id: string; status: string; cached: boolean }> {
  const res = await fetch(`${API_URL}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /lessons failed: ${res.status}`);
  return res.json();
}

export async function getLesson(id: string): Promise<LessonStatus> {
  const res = await fetch(`${API_URL}/lessons/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /lessons/${id} failed: ${res.status}`);
  return res.json();
}

export interface LessonListItem {
  id: string;
  topic: string;
  audience: string;
  language: string;
  title: string;
  created_at: string;
}

export async function listLessons(limit = 12): Promise<LessonListItem[]> {
  const res = await fetch(`${API_URL}/lessons?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /lessons failed: ${res.status}`);
  return (await res.json()).lessons;
}

export type FeedbackVerdict = "good" | "wrong" | "confusing" | "boring" | "broken";

export async function postFeedback(
  lessonId: string,
  body: { verdict: FeedbackVerdict; scene_index?: number; note?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/lessons/${lessonId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST feedback failed: ${res.status}`);
}
