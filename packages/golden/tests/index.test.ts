import { describe, expect, it } from "vitest";
import { GOLDEN_TOPICS } from "../src/index";

describe("golden set", () => {
  it("has 36 topics = 12 subjects x 3 audiences", () => {
    expect(GOLDEN_TOPICS).toHaveLength(36);
    expect(new Set(GOLDEN_TOPICS.map((t) => t.subject)).size).toBe(12);
    expect(new Set(GOLDEN_TOPICS.map((t) => t.audience)).size).toBe(3);
  });

  it("ids are unique and well-formed", () => {
    const ids = GOLDEN_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(36);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+--[a-z]+$/);
  });

  it("languages are balanced across GOLDEN_LANGUAGES", () => {
    const counts = new Map<string, number>();
    for (const t of GOLDEN_TOPICS) counts.set(t.language, (counts.get(t.language) ?? 0) + 1);
    expect([...counts.keys()].sort()).toEqual(["ar", "en", "fr"]);
    for (const n of counts.values()) expect(n).toBe(12);
  });

  it("every subject covers every language", () => {
    const bySubject = new Map<string, Set<string>>();
    for (const t of GOLDEN_TOPICS) {
      if (!bySubject.has(t.subject)) bySubject.set(t.subject, new Set());
      bySubject.get(t.subject)!.add(t.language);
    }
    for (const langs of bySubject.values()) expect(langs.size).toBe(3);
  });
});
