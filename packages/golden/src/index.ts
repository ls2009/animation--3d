/**
 * @sinaa/golden — the golden set. topics.json is DATA (the owner edits it);
 * this module only loads and types it. The runner lives in
 * apps/api/pipeline/golden.py and reads the same file.
 */
import raw from "../topics.json";

export interface GoldenTopic {
  id: string;
  subject: string;
  topic: string;
  audience: string;
  language: string;
}

export const GOLDEN_TOPICS: GoldenTopic[] = raw.topics;

export const GOLDEN_SET_VERSION: number = raw.version;
