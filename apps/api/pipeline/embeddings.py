"""Embeddings behind ONE function, per the data-model spec.

Voyage AI when VOYAGE_API_KEY is set (voyage-3-large, 1024 dims, matching
storyboards.embedding vector(1024)); otherwise None — the Director then
runs with zero exemplars, which is the sanctioned fallback.
"""

from __future__ import annotations

import os


def embed(text: str) -> list[float] | None:
    api_key = os.environ.get("VOYAGE_API_KEY", "")
    if not api_key:
        return None
    import httpx

    response = httpx.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": "voyage-3-large", "input": [text], "output_dimension": 1024},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["data"][0]["embedding"]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
