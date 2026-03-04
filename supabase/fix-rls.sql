-- Fix: break infinite RLS recursion between journals <-> journal_members
-- Run this in the Supabase SQL Editor

-- Helper function: checks membership bypassing RLS (security definer)
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

-- Helper function: checks ownership bypassing RLS (security definer)
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

-- Fix journals policies
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

-- Fix journal_members policies
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

-- Fix invite policies (they also reference journals/members)
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

-- Fix entries policies
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

-- Fix journal_templates policy
drop policy if exists "journal_templates_members" on public.journal_templates;
create policy "journal_templates_members" on public.journal_templates
for all using (public.is_member_of(journal_id));

-- Grant execute on helper functions
grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;
