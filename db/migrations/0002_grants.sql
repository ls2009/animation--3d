-- Sinaa Motion Lab — role grants (fixes 42501 on hosted Supabase).
--
-- 0001 created the tables but granted no base privileges; RLS policies sit
-- ON TOP of grants, so without these every API write fails with 42501.
-- Grants mirror the access model exactly:
--   service_role: everything (the API server; bypasses RLS)
--   anon:         read lessons + insert feedback ONLY (RLS further limits
--                 lesson reads to status='ready')

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

grant select on public.lessons  to anon;
grant insert on public.feedback to anon;

-- Future tables created by the same admin role inherit the service grant.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
