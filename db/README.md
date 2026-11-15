# db/

Supabase Postgres 17 schema. Migrations are plain SQL in `migrations/`,
applied in filename order.

## Apply

With the Supabase CLI (linked project):

```bash
supabase db push
```

Or directly with psql (apply ALL migrations, in order):

```bash
psql "$SUPABASE_DB_URL" -f db/migrations/0001_init.sql
```

```bash
psql "$SUPABASE_DB_URL" -f db/migrations/0002_grants.sql
```

`0002_grants.sql` is required on hosted Supabase: policies sit on top of
base table grants, and without it every write fails with 42501.

Not applied in Phase 0 — no Supabase project is provisioned yet; credentials
arrive before Phase 3.

## Rules

- Append-only ledger: a trigger forbids `UPDATE`/`DELETE` on `lesson_events`.
- RLS is enabled on **every** table. Anonymous visitors may only read
  `lessons` with `status='ready'` and insert into `feedback`; the service role
  writes everything else.
- `scripts/check_rls.py` runs in CI and fails the build if any `CREATE TABLE`
  in `migrations/` lacks a matching `ENABLE ROW LEVEL SECURITY`.
