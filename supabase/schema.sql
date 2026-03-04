create extension if not exists "pgcrypto";

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_members (
  journal_id uuid not null references public.journals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (journal_id, user_id)
);

create table if not exists public.journal_invites (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.normalize_invite_code()
returns trigger as $$
begin
  new.code = upper(new.code);
  return new;
end;
$$ language plpgsql;

drop trigger if exists journal_invites_normalize_code on public.journal_invites;
create trigger journal_invites_normalize_code
before insert or update on public.journal_invites
for each row execute function public.normalize_invite_code();

create index if not exists journal_invites_code_idx
  on public.journal_invites (code);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  reminder_time time,
  timezone text not null default 'UTC',
  next_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

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

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.ensure_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.journal_members (journal_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.journal_invites%rowtype;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into invite_record
  from public.journal_invites
  where code = upper(invite_code);

  if not found then
    raise exception 'invalid_invite';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  if invite_record.max_uses is not null and invite_record.uses >= invite_record.max_uses then
    raise exception 'invite_used';
  end if;

  select exists (
    select 1 from public.journal_members
    where journal_members.journal_id = invite_record.journal_id
      and journal_members.user_id = auth.uid()
  ) into already_member;

  if not already_member then
    insert into public.journal_members (journal_id, user_id, role)
    values (invite_record.journal_id, auth.uid(), 'member')
    on conflict do nothing;

    update public.journal_invites
    set uses = uses + 1
    where id = invite_record.id;
  end if;

  return invite_record.journal_id;
end;
$$;

drop trigger if exists journals_touch_updated_at on public.journals;
create trigger journals_touch_updated_at
before update on public.journals
for each row execute function public.touch_updated_at();

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at
before update on public.entries
for each row execute function public.touch_updated_at();

drop trigger if exists notification_settings_touch_updated_at on public.notification_settings;
create trigger notification_settings_touch_updated_at
before update on public.notification_settings
for each row execute function public.touch_updated_at();

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

drop trigger if exists journals_create_member on public.journals;
create trigger journals_create_member
after insert on public.journals
for each row execute function public.ensure_membership();

grant execute on function public.ensure_membership() to authenticated;

alter table public.journals enable row level security;
alter table public.journal_members enable row level security;
alter table public.journal_invites enable row level security;
alter table public.entries enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.journal_templates enable row level security;
alter table public.daily_questions enable row level security;
alter table public.journal_streaks enable row level security;

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

create or replace function public.is_owner_of(j_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.journals
    where journals.id = j_id
      and journals.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;

drop policy if exists "journals_select_members" on public.journals;
create policy "journals_select_members" on public.journals
for select using (public.is_member_of(id));

drop policy if exists "journals_insert_owner" on public.journals;
create policy "journals_insert_owner" on public.journals
for insert with check (owner_id = auth.uid());

drop policy if exists "journals_update_owner" on public.journals;
create policy "journals_update_owner" on public.journals
for update using (owner_id = auth.uid());

drop policy if exists "journals_delete_owner" on public.journals;
create policy "journals_delete_owner" on public.journals
for delete using (owner_id = auth.uid());

drop policy if exists "members_select" on public.journal_members;
create policy "members_select" on public.journal_members
for select using (
  public.is_owner_of(journal_id)
  or user_id = auth.uid()
);

drop policy if exists "members_insert_owner" on public.journal_members;
create policy "members_insert_owner" on public.journal_members
for insert with check (public.is_owner_of(journal_id));

drop policy if exists "members_delete_owner" on public.journal_members;
create policy "members_delete_owner" on public.journal_members
for delete using (
  public.is_owner_of(journal_id)
  or user_id = auth.uid()
);

drop policy if exists "invites_select_members" on public.journal_invites;
create policy "invites_select_members" on public.journal_invites
for select using (public.is_member_of(journal_id));

drop policy if exists "invites_insert_owner" on public.journal_invites;
create policy "invites_insert_owner" on public.journal_invites
for insert with check (
  public.is_owner_of(journal_id)
  and created_by = auth.uid()
);

drop policy if exists "invites_update_service" on public.journal_invites;
create policy "invites_update_service" on public.journal_invites
for update using (auth.role() = 'service_role');

drop policy if exists "invites_update_owner" on public.journal_invites;
create policy "invites_update_owner" on public.journal_invites
for update using (public.is_owner_of(journal_id));

drop policy if exists "invites_delete_owner" on public.journal_invites;
create policy "invites_delete_owner" on public.journal_invites
for delete using (public.is_owner_of(journal_id));

grant execute on function public.accept_invite(text) to authenticated;

drop policy if exists "entries_select_members" on public.entries;
create policy "entries_select_members" on public.entries
for select using (public.is_member_of(journal_id));

drop policy if exists "entries_insert_members" on public.entries;
create policy "entries_insert_members" on public.entries
for insert with check (
  public.is_member_of(journal_id)
  and author_id = auth.uid()
);

drop policy if exists "entries_update_author" on public.entries;
create policy "entries_update_author" on public.entries
for update using (
  author_id = auth.uid()
  and public.is_member_of(journal_id)
);

drop policy if exists "entries_delete_disabled" on public.entries;
create policy "entries_delete_disabled" on public.entries
for delete using (false);

drop policy if exists "notification_settings_self" on public.notification_settings;
create policy "notification_settings_self" on public.notification_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
create policy "push_subscriptions_self" on public.push_subscriptions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_self" on public.notifications;
create policy "notifications_self" on public.notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_settings_self" on public.user_settings;
create policy "user_settings_self" on public.user_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "journal_templates_members" on public.journal_templates;
create policy "journal_templates_members" on public.journal_templates
for all using (public.is_member_of(journal_id));

drop policy if exists "daily_questions_self" on public.daily_questions;
create policy "daily_questions_self" on public.daily_questions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "journal_streaks_self" on public.journal_streaks;
create policy "journal_streaks_self" on public.journal_streaks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
