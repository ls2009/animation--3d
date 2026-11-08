# Sinaa Motion Lab API — Fly.io / Railway image.
#
# The API needs three runtimes in one container:
#   - Python 3.12 (FastAPI + the pipeline)
#   - Node 22 (the engine's validator bridge and the keyframe renderer)
#   - Chromium via Playwright (the Inspector's keyframe fallback backend)
#
# Build context is the REPO ROOT:  docker build -f apps/api/Dockerfile .

FROM python:3.12-slim-bookworm

# --- Node 22 + pnpm (via corepack) -----------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates xz-utils git \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*

# --- uv (Python dependency manager) ------------------------------------------
RUN pip install --no-cache-dir uv

WORKDIR /srv/sinaa

# --- JS workspace (engine validator bridge + keyframe renderer) ---------------
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages
COPY tools ./tools
# apps/web's manifest must be present for the frozen lockfile to resolve,
# but its dependencies are not installed in this image.
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter '!web'

# Chromium for the Playwright keyframe backend (plus xvfb so the faster
# headless-gl backend can run too).
RUN apt-get update && apt-get install -y --no-install-recommends xvfb \
    && rm -rf /var/lib/apt/lists/* \
    && pnpm --filter @sinaa/headless exec playwright install --with-deps chromium

# --- Python API -----------------------------------------------------------------
COPY apps/api ./apps/api
WORKDIR /srv/sinaa/apps/api
RUN uv sync --frozen --no-dev

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# One worker: generations run as in-process background tasks.
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
