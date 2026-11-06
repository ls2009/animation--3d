"""Hard budgets per lesson generation.

Phase 0 placeholder — the Producer (Phase 5) reads these values and fails a
generation with a typed error when a budget is exceeded, never a silent retry.
The single-pass pipeline (Phase 3) enforces MAX_MODEL_CALLS.
"""

MAX_MODEL_CALLS = 6
MAX_INSPECTOR_LOOPS = 2

# Token cap per model call; per-role overrides arrive with the crew in Phase 5.
MAX_TOKENS_PER_CALL = 8192
