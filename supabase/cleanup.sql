-- Delete everything - run this FIRST to clean up

drop trigger if exists journals_create_member on public.journals;
drop trigger if exists journals_touch_updated_at on public.journals;
drop trigger if exists entries_touch_updated_at on public.entries;
drop trigger if exists notification_settings_touch_updated_at on public.notification_settings;
drop trigger if exists journal_invites_normalize_code on public.journal_invites;

drop function if exists public.ensure_membership;
drop function if exists public.touch_updated_at;
drop function if exists public.normalize_invite_code;
drop function if exists public.accept_invite;

drop policy if exists journals_select_members on public.journals;
drop policy if exists journals_insert_owner on public.journals;
drop policy if exists journals_update_owner on public.journals;
drop policy if exists journals_delete_owner on public.journals;

drop policy if exists members_select on public.journal_members;
drop policy if exists members_insert_owner on public.journal_members;
drop policy if exists members_delete_owner on public.journal_members;

drop policy if exists invites_select_members on public.journal_invites;
drop policy if exists invites_insert_owner on public.journal_invites;
drop policy if exists invites_update_owner on public.journal_invites;
drop policy if exists invites_delete_owner on public.journal_invites;
drop policy if exists invites_update_service on public.journal_invites;

drop policy if exists entries_select_members on public.entries;
drop policy if exists entries_insert_members on public.entries;
drop policy if exists entries_update_author on public.entries;
drop policy if exists entries_delete_disabled on public.entries;

drop policy if exists notification_settings_self on public.notification_settings;
drop policy if exists push_subscriptions_self on public.push_subscriptions;
drop policy if exists notifications_self on public.notifications;

drop table if exists public.notifications;
drop table if exists public.push_subscriptions;
drop table if exists public.notification_settings;
drop table if exists public.entries;
drop table if exists public.journal_invites;
drop table if exists public.journal_members;
drop table if exists public.journals;
