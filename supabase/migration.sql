-- Safe to run multiple times. Sets up new tables + RLS policies.
-- Run this in Supabase SQL Editor.

-- 1. Create tables (idempotent)

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_templates (
  journal_id uuid primary key references public.journals (id) on delete cascade,
  template_type text not null default 'free_write',
  ai_prompts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_text text not null,
  question_date date not null,
  template_type text not null,
  answered boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, question_date)
);

create table if not exists public.journal_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  journal_id uuid references public.journals (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_entry_date date,
  total_entries integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, journal_id)
);

-- 2. Enable RLS on all new tables

alter table public.user_settings enable row level security;
alter table public.journal_templates enable row level security;
alter table public.daily_questions enable row level security;
alter table public.journal_streaks enable row level security;

-- 3. Ensure helper functions exist (from fix-rls.sql)

create or replace function public.is_member_of(j_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.journal_members
    where journal_members.journal_id = j_id
      and journal_members.user_id = auth.uid()
  );
$$;

grant execute on function public.is_member_of(uuid) to authenticated;

-- 4. RLS policies (drop + create = safe to re-run)

drop policy if exists "user_settings_self" on public.user_settings;
create policy "user_settings_self" on public.user_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "journal_templates_members" on public.journal_templates;
create policy "journal_templates_members" on public.journal_templates
for all using (public.is_member_of(journal_id)) with check (public.is_member_of(journal_id));

drop policy if exists "daily_questions_self" on public.daily_questions;
create policy "daily_questions_self" on public.daily_questions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "journal_streaks_self" on public.journal_streaks;
create policy "journal_streaks_self" on public.journal_streaks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5. Updated-at triggers

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
before update on public.user_settings
for each row execute function public.touch_updated_at();

drop trigger if exists journal_templates_touch_updated_at on public.journal_templates;
create trigger journal_templates_touch_updated_at
before update on public.journal_templates
for each row execute function public.touch_updated_at();

drop trigger if exists journal_streaks_touch_updated_at on public.journal_streaks;
create trigger journal_streaks_touch_updated_at
before update on public.journal_streaks
for each row execute function public.touch_updated_at();
