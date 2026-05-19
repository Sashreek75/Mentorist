create table if not exists public.mentorist_questions (
  id text primary key,
  student_email text,
  student_name text,
  student_profile jsonb not null default '{}'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  question text not null,
  context text,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mentorist_questions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mentorist_questions'
      and policyname = 'mentorist_questions_select_all'
  ) then
    create policy mentorist_questions_select_all
      on public.mentorist_questions
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
      and tablename = 'mentorist_questions'
      and policyname = 'mentorist_questions_insert_all'
  ) then
    create policy mentorist_questions_insert_all
      on public.mentorist_questions
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
      and tablename = 'mentorist_questions'
      and policyname = 'mentorist_questions_update_all'
  ) then
    create policy mentorist_questions_update_all
      on public.mentorist_questions
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
      and tablename = 'mentorist_questions'
      and policyname = 'mentorist_questions_delete_all'
  ) then
    create policy mentorist_questions_delete_all
      on public.mentorist_questions
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;
