alter table public.mentorist_profiles
  add column if not exists dismissed_alert_ids jsonb not null default '[]'::jsonb;

create table if not exists public.mentorist_alerts (
  id text primary key,
  title text not null,
  tag text not null default 'Alert',
  body text not null,
  author text not null default 'Founder',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mentorist_alerts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_alerts'
      and policyname = 'mentorist_alerts_select_all'
  ) then
    create policy mentorist_alerts_select_all
      on public.mentorist_alerts
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_alerts'
      and policyname = 'mentorist_alerts_insert_all'
  ) then
    create policy mentorist_alerts_insert_all
      on public.mentorist_alerts
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_alerts'
      and policyname = 'mentorist_alerts_update_all'
  ) then
    create policy mentorist_alerts_update_all
      on public.mentorist_alerts
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_alerts'
      and policyname = 'mentorist_alerts_delete_all'
  ) then
    create policy mentorist_alerts_delete_all
      on public.mentorist_alerts
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;
