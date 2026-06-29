-- Recommendation history: powers cross-session de-duplication ("never repeat
-- a recommendation") and the thumbs up/down feedback loop for the AI engine.
--
-- NOTE: policies below mirror the permissive pattern of the existing tables so
-- the app keeps working under the current anon-key architecture. Tightening RLS
-- (scoping rows to auth.uid()/email and removing anon writes) is tracked as a
-- separate security hardening task — see SECURITY.md.

create table if not exists public.mentorist_recommendations (
  id text primary key,
  student_email text not null,
  request_type text,
  user_query text,
  topic text,
  summary text not null default '',
  source text not null default 'gemini',
  grounded boolean not null default false,
  feedback text,                       -- 'up' | 'down' | null
  created_at timestamptz not null default now()
);

create index if not exists mentorist_recommendations_email_created_idx
  on public.mentorist_recommendations (student_email, created_at desc);

alter table public.mentorist_recommendations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_recommendations'
      and policyname = 'mentorist_recommendations_select_all'
  ) then
    create policy mentorist_recommendations_select_all
      on public.mentorist_recommendations
      for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_recommendations'
      and policyname = 'mentorist_recommendations_insert_all'
  ) then
    create policy mentorist_recommendations_insert_all
      on public.mentorist_recommendations
      for insert to anon, authenticated with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_recommendations'
      and policyname = 'mentorist_recommendations_update_all'
  ) then
    create policy mentorist_recommendations_update_all
      on public.mentorist_recommendations
      for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
