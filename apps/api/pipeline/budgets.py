"""Hard budgets per lesson generation. Exceeding any budget fails the
generation with a typed error — never a silent retry.

MAX_MODEL_CALLS caps the primary chain: the five roles' first calls plus
any fails-back re-runs (the table in the crew spec). Inspector repair
loops are budgeted separately by MAX_INSPECTOR_LOOPS (each loop is one
choreographer fix + one re-inspection); with both at their defaults a
generation can never exceed 6 + 2x2 = 10 calls.
"""

MAX_MODEL_CALLS = 6
MAX_INSPECTOR_LOOPS = 2

# Token cap per model call.
MAX_TOKENS_PER_CALL = 8192
