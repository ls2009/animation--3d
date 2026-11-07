"""Lesson fingerprint — byte-identical to packages/dsl/src/fingerprint.ts.

sha256 over NUL-joined: version, normalized topic, audience, language,
prop_library_version, prompt_version. Same fingerprint => same cached
script, no model call. The cross-language stability test pins the same
vector as the TS suite; bump deliberately, never accidentally.
"""

import hashlib
import re

DSL_VERSION = "1.0"


def normalize_topic(topic: str) -> str:
    return re.sub(r"\s+", " ", topic.lower().strip())


def compute_fingerprint(
    topic: str,
    audience: str,
    language: str,
    prop_library_version: str,
    prompt_version: str,
    version: str = DSL_VERSION,
) -> str:
    parts = [
        version,
        normalize_topic(topic),
        audience.lower().strip(),
        language.lower().strip(),
        prop_library_version,
        prompt_version,
    ]
    return hashlib.sha256("\u0000".join(parts).encode("utf-8")).hexdigest()
