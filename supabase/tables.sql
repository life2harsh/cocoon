-- Just create the new tables (no policies - they may already exist)

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
