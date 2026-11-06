-- Sinaa Motion Lab — initial schema (Phase 0)
-- Event-sourced: truth lives in lesson_events; lessons.current_script is a
-- derived cache of the last passed script.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id             uuid primary key default gen_random_uuid(),
  fingerprint    text not null unique,
  topic          text not null,
  audience       text not null,
  language       text not null,
  status         text not null default 'queued'
                 check (status in ('queued','directing','designing','choreographing',
                                   'inspecting','ready','failed')),
  script_version text,
  current_script jsonb,
  owner_id       uuid,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- lesson_events — append-only ledger
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_events (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid not null references public.lessons (id) on delete restrict,
  seq            integer not null,
  kind           text not null
                 check (kind in ('generation_started','agent_call','validator_repairs',
                                 'inspection','ready','failed','feedback')),
  role           text,
  prompt_version text,
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  latency_ms     integer,
  payload        jsonb,
  created_at     timestamptz not null default now(),
  unique (lesson_id, seq)
);

create or replace function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'lesson_events is append-only: % is forbidden', tg_op;
end;
$$;

drop trigger if exists lesson_events_append_only on public.lesson_events;
create trigger lesson_events_append_only
  before update or delete on public.lesson_events
  for each row execute function public.forbid_mutation();

-- ---------------------------------------------------------------------------
-- storyboards — exemplar store for the Director (pgvector)
-- ---------------------------------------------------------------------------
create table if not exists public.storyboards (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete restrict,
  embedding  vector(1024),
  passed     boolean not null default false,
  storyboard jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- prop_requests — Set designer backlog
-- ---------------------------------------------------------------------------
create table if not exists public.prop_requests (
  name             text primary key,
  count            integer not null default 1,
  nearest_existing text,
  last_lesson_id   uuid references public.lessons (id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete restrict,
  viewer_id   uuid,
  verdict     text not null
              check (verdict in ('good','wrong','confusing','boring','broken')),
  scene_index integer,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- golden_runs / golden_results — regression gate
-- ---------------------------------------------------------------------------
create table if not exists public.golden_runs (
  id              uuid primary key default gen_random_uuid(),
  git_sha         text not null,
  prompt_versions jsonb,
  started_at      timestamptz not null default now(),
  summary         jsonb,
  created_at      timestamptz not null default now()
);

create table if not exists public.golden_results (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid not null references public.golden_runs (id) on delete restrict,
  topic_id            text not null,
  status              text not null,
  repairs             integer,
  inspector_pass_rate real,
  runtime_s           real,
  cost_usd            numeric(10, 4),
  script              jsonb,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security: enabled on EVERY table.
-- The service role bypasses RLS; anonymous visitors get exactly two abilities:
--   1. read lessons that are ready
--   2. insert feedback
-- No other policies exist, so everything else is deny-by-default.
-- ---------------------------------------------------------------------------
alter table public.lessons        enable row level security;
alter table public.lesson_events  enable row level security;
alter table public.storyboards    enable row level security;
alter table public.prop_requests  enable row level security;
alter table public.feedback       enable row level security;
alter table public.golden_runs    enable row level security;
alter table public.golden_results enable row level security;

drop policy if exists lessons_anon_read_ready on public.lessons;
create policy lessons_anon_read_ready
  on public.lessons
  for select
  to anon
  using (status = 'ready');

drop policy if exists feedback_anon_insert on public.feedback;
create policy feedback_anon_insert
  on public.feedback
  for insert
  to anon
  with check (true);
