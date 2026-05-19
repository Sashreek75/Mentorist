-- Mentorist shared user store
-- This table backs cross-device account sync for students, mentors, and admin review.

create table if not exists public.mentorist_profiles (
  email text primary key,
  name text not null default '',
  role text not null default 'student',
  status text not null default 'active',
  onboarded boolean not null default false,
  profile jsonb,
  application_data jsonb,
  applied_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.mentorist_profiles enable row level security;

drop policy if exists "Public read mentorist profiles" on public.mentorist_profiles;
drop policy if exists "Public insert mentorist profiles" on public.mentorist_profiles;
drop policy if exists "Public update mentorist profiles" on public.mentorist_profiles;
drop policy if exists "Public delete mentorist profiles" on public.mentorist_profiles;

create policy "Public read mentorist profiles"
on public.mentorist_profiles
for select
using (true);

create policy "Public insert mentorist profiles"
on public.mentorist_profiles
for insert
with check (true);

create policy "Public update mentorist profiles"
on public.mentorist_profiles
for update
using (true)
with check (true);

create policy "Public delete mentorist profiles"
on public.mentorist_profiles
for delete
using (true);

create or replace function public.set_mentorist_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mentorist_profiles_updated_at on public.mentorist_profiles;
create trigger mentorist_profiles_updated_at
before update on public.mentorist_profiles
for each row
execute function public.set_mentorist_profiles_updated_at();
