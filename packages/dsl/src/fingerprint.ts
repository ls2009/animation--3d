/**
 * Lesson fingerprint: same fingerprint → same cached script, no model call.
 *
 * sha256(version + normalized topic + audience + language +
 *        prop_library_version + prompt_version)
 *
 * Server-side only (Node). The Python pipeline mirrors this exactly —
 * see apps/api; both sides are covered by the stability test vectors in
 * packages/dsl/tests/fingerprint.test.ts.
 */
import { createHash } from "node:crypto";
import { DSL_VERSION } from "./schema";

/** Lower-case, trim, collapse internal whitespace. */
export function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface FingerprintInput {
  topic: string;
  audience: string;
  language: string;
  propLibraryVersion: string;
  promptVersion: string;
  /** Defaults to the current DSL version. */
  version?: string;
}

export function computeFingerprint(input: FingerprintInput): string {
  const parts = [
    input.version ?? DSL_VERSION,
    normalizeTopic(input.topic),
    input.audience.toLowerCase().trim(),
    input.language.toLowerCase().trim(),
    input.propLibraryVersion,
    input.promptVersion,
  ];
  return createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex");
}
