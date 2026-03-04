-- Quick minimal schema fix - run this in Supabase SQL editor

-- 1. Create tables if they don't exist
create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_members (
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (journal_id, user_id)
);

-- 2. Enable RLS
alter table public.journals enable row level security;
alter table public.journal_members enable row level security;

-- 3. Create policies
create policy "journals_select" on public.journals for select using (
  exists (select 1 from public.journal_members where journal_id = journals.id and user_id = auth.uid())
);

create policy "journals_insert" on public.journals for insert with check (owner_id = auth.uid());

create policy "journals_update" on public.journals for update using (owner_id = auth.uid());

create policy "journals_delete" on public.journals for delete using (owner_id = auth.uid());

create policy "members_select" on public.journal_members for select using (
  user_id = auth.uid() or exists (select 1 from public.journals where id = journal_members.journal_id and owner_id = auth.uid())
);

create policy "members_insert" on public.journal_members for insert with check (user_id = auth.uid());

-- 4. Function to auto-create owner membership
create or replace function public.ensure_membership()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.journal_members (journal_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

-- 5. Trigger
drop trigger if exists journals_create_member on public.journals;
create trigger journals_create_member
after insert on public.journals
for each row execute function public.ensure_membership();

-- 6. Grant execute
grant execute on function public.ensure_membership() to authenticated;

-- 7. Function to touch updated_at
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists journals_touch_updated_at on public.journals;
create trigger journals_touch_updated_at
before update on public.journals
for each row execute function public.touch_updated_at();
