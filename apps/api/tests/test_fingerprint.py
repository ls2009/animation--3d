"""Cross-language fingerprint stability: this vector is pinned to the SAME
value as packages/dsl/tests/fingerprint.test.ts. If either side changes,
every cached lesson is invalidated — bump both deliberately, never one."""

from pipeline.fingerprint import compute_fingerprint, normalize_topic

PINNED = "50c9c5d57788328027cbb255248229830c4fbe208d363e68567042e04244c5a5"


def test_pinned_vector_matches_typescript():
    assert (
        compute_fingerprint(
            "The Four-Stroke Engine",
            "curious teens",
            "en",
            "1.0.0",
            "single-pass@1",
        )
        == PINNED
    )


def test_normalization():
    assert normalize_topic("  How   DNS\tWorks ") == "how dns works"
    assert compute_fingerprint(
        "  the four-stroke   ENGINE ", "Curious Teens ", "EN", "1.0.0", "single-pass@1"
    ) == PINNED


def test_every_ingredient_matters():
    base = compute_fingerprint("t", "a", "en", "1.0.0", "p@1")
    assert compute_fingerprint("t2", "a", "en", "1.0.0", "p@1") != base
    assert compute_fingerprint("t", "a2", "en", "1.0.0", "p@1") != base
    assert compute_fingerprint("t", "a", "fr", "1.0.0", "p@1") != base
    assert compute_fingerprint("t", "a", "en", "1.0.1", "p@1") != base
    assert compute_fingerprint("t", "a", "en", "1.0.0", "p@2") != base
