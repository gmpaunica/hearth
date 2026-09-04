-- Hearth — database schema (Phase 4)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste all
-- → Run. Safe to re-run (drops and recreates policies). Nothing here is secret.
--
-- Model: authenticated users (anonymous sign-in) have a profile; a couple links
-- exactly two profiles; signals + responses belong to a couple. Row Level
-- Security guarantees a user only ever sees their own couple's rows.

create extension if not exists pgcrypto with schema extensions;

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_key   text check (avatar_key in ('a', 'b')),
  push_token   text,
  push_registration_epoch bigint not null default 0,
  push_registration_enabled boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  member_a    uuid not null references public.profiles (id) on delete cascade,
  member_b    uuid references public.profiles (id) on delete cascade,
  home_timezone text,
  created_at  timestamptz not null default now()
);

create table if not exists public.signals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  from_user   uuid not null references public.profiles (id) on delete cascade,
  recipient_user_id uuid references public.profiles (id) on delete cascade,
  type        text not null check (type in ('fireplace','sofa','table','garden','rest','romantic')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  signal_id  uuid not null references public.signals (id) on delete cascade,
  from_user  uuid not null references public.profiles (id) on delete cascade,
  choice     text not null,
  created_at timestamptz not null default now()
);

-- CREATE TABLE IF NOT EXISTS does not add columns to an older deployment.
-- These ALTERs keep this canonical schema rerunnable; production upgrades still
-- use hardening.sql first because it also quarantines ambiguous legacy data.
alter table public.profiles
  add column if not exists push_registration_epoch bigint not null default 0;
alter table public.profiles
  add column if not exists push_registration_enabled boolean not null default true;
alter table public.signals
  add column if not exists recipient_user_id uuid;
alter table public.couples
  add column if not exists home_timezone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'signals_recipient_user_id_fkey'
      and conrelid = 'public.signals'::regclass
  ) then
    alter table public.signals
      add constraint signals_recipient_user_id_fkey
      foreign key (recipient_user_id) references public.profiles (id)
      on delete cascade;
  end if;
end $$;

create index if not exists signals_recipient_user_id_idx
  on public.signals (recipient_user_id);

-- ── Helpers ───────────────────────────────────────────────────────────────

-- True when the current user belongs to the given couple. SECURITY DEFINER so
-- policies can call it without recursing through couples' own RLS.
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql security definer stable
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.couples c
    where c.id = cid and (c.member_a = auth.uid() or c.member_b = auth.uid())
  );
$$;

-- Collision-safe six-character codes. The advisory lock serializes both create
-- and rotation so a code checked as free stays free until its write commits.
create or replace function public.new_invite_code()
returns text language plpgsql security definer volatile
set search_path = pg_catalog, public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  candidate text;
  byte_index integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('hearth-invite-code', 0));
  loop
    random_bytes := gen_random_bytes(6);
    candidate := '';
    for byte_index in 0..5 loop
      candidate := candidate || substr(
        alphabet,
        (get_byte(random_bytes, byte_index) % length(alphabet)) + 1,
        1
      );
    end loop;
    exit when not exists (
      select 1 from public.couples where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- Auto-create a profile row the moment a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create a couple with a fresh unique invite code (caller becomes member_a).
create or replace function public.create_couple()
returns public.couples language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  new_row public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if exists (
    select 1 from public.couples where member_a = uid or member_b = uid
  ) then
    raise exception 'Leave your current home before creating another';
  end if;

  insert into public.couples (invite_code, member_a)
  values (public.new_invite_code(), uid)
  returning * into new_row;
  return new_row;
end;
$$;

-- Join an existing couple by code (caller becomes member_b). Bypasses the
-- select policy safely: you can't SELECT a couple you haven't joined yet.
create or replace function public.join_couple(code text)
returns public.couples language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select * into target from public.couples
    where invite_code = upper(trim(code)) for update;
  if target.id is null then
    raise exception 'No home found for that code';
  end if;
  if target.member_a = uid or target.member_b = uid then
    return target;
  end if;
  if exists (
    select 1 from public.couples where member_a = uid or member_b = uid
  ) then
    raise exception 'Leave your current home before joining another';
  end if;
  if target.member_b is not null then
    raise exception 'This home is already full';
  end if;
  update public.couples set member_b = uid
    where id = target.id and member_b is null
    returning * into target;
  if target.id is null then
    raise exception 'This home is already full';
  end if;
  return target;
end;
$$;

-- Fixed recipient and one-way resolution guards.
create or replace function public.set_signal_recipient()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  home public.couples;
begin
  select * into home from public.couples where id = new.couple_id for share;
  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required to send a signal';
  end if;
  if new.from_user = home.member_a then
    new.recipient_user_id := home.member_b;
  elsif new.from_user = home.member_b then
    new.recipient_user_id := home.member_a;
  else
    raise exception 'Signal sender is not a current home member' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists set_signal_recipient_before_insert on public.signals;
create trigger set_signal_recipient_before_insert
  before insert on public.signals
  for each row execute function public.set_signal_recipient();

create or replace function public.enforce_signal_resolution()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if old.resolved_at is not null then
    raise exception 'Resolved signals cannot be reopened or changed';
  end if;
  if new.resolved_at is null then
    raise exception 'A signal can only transition from open to resolved';
  end if;
  new.resolved_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_signal_resolution_before_update on public.signals;
create trigger enforce_signal_resolution_before_update
  before update of resolved_at on public.signals
  for each row execute function public.enforce_signal_resolution();

-- Epoch-checked token storage prevents an in-flight registration from undoing a
-- later notification-off operation.
drop function if exists public.begin_push_registration();
drop function if exists public.begin_push_registration(uuid);
drop function if exists public.store_push_token(text, bigint);
drop function if exists public.store_push_token(uuid, text, bigint);
drop function if exists public.clear_push_token();
drop function if exists public.clear_push_token(uuid);

create function public.begin_push_registration(p_user_id uuid)
returns bigint language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  next_epoch bigint;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if uid is distinct from p_user_id then
    raise exception 'Authenticated identity changed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1
  where id = uid and push_registration_enabled
  returning push_registration_epoch into next_epoch;
  if next_epoch is null then
    raise exception 'Push registration is disabled for this identity' using errcode = '42501';
  end if;
  return next_epoch;
end;
$$;

create function public.store_push_token(p_user_id uuid, p_token text, p_epoch bigint)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  changed integer;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if uid is distinct from p_user_id then
    raise exception 'Authenticated identity changed' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) > 512
     or p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Invalid Expo push token';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_token, 0));
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  -- One physical device token belongs to only its latest anonymous identity.
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1
  where push_token = p_token and id <> uid;

  update public.profiles set push_token = p_token
  where id = uid
    and push_registration_enabled
    and push_registration_epoch = p_epoch;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create function public.clear_push_token(p_user_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if uid is distinct from p_user_id then
    raise exception 'Authenticated identity changed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1
  where id = uid;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles  enable row level security;
alter table public.couples   enable row level security;
alter table public.signals   enable row level security;
alter table public.responses enable row level security;

-- profiles: read your own + your partner's; write only your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.couples c
    where (c.member_a = auth.uid() and c.member_b = profiles.id)
       or (c.member_b = auth.uid() and c.member_a = profiles.id)
  )
);
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- couples: read only couples you belong to (membership changes go via RPCs).
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select to authenticated
  using (member_a = auth.uid() or member_b = auth.uid());
drop policy if exists couples_insert on public.couples;
drop policy if exists couples_update on public.couples;
drop policy if exists couples_delete on public.couples;

-- signals: scoped to your couple; you can only author your own.
drop policy if exists signals_select on public.signals;
create policy signals_select on public.signals for select to authenticated
  using (is_couple_member(couple_id));
drop policy if exists signals_insert on public.signals;
create policy signals_insert on public.signals for insert to authenticated
  with check (
    is_couple_member(couple_id)
    and from_user = auth.uid()
    and recipient_user_id is not null
    and recipient_user_id <> auth.uid()
  );
drop policy if exists signals_update on public.signals;
create policy signals_update on public.signals for update to authenticated
  using (is_couple_member(couple_id) and resolved_at is null)
  with check (is_couple_member(couple_id) and resolved_at is not null);
drop policy if exists signals_delete on public.signals;

-- responses: scoped to your couple's signals; you can only author your own.
drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses for select to authenticated using (
  exists (select 1 from public.signals s where s.id = signal_id and is_couple_member(s.couple_id))
);
drop policy if exists responses_insert on public.responses;
create policy responses_insert on public.responses for insert to authenticated with check (
  from_user = auth.uid()
  and exists (select 1 from public.signals s where s.id = signal_id and is_couple_member(s.couple_id))
);
drop policy if exists responses_update on public.responses;
drop policy if exists responses_delete on public.responses;

-- ── API privileges ─────────────────────────────────────────────────────────
-- SECURITY DEFINER functions otherwise inherit EXECUTE for PUBLIC.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

revoke execute on function public.create_couple() from public;
revoke execute on function public.create_couple() from anon;
grant execute on function public.create_couple() to authenticated;
revoke execute on function public.join_couple(text) from public;
revoke execute on function public.join_couple(text) from anon;
grant execute on function public.join_couple(text) to authenticated;
revoke execute on function public.is_couple_member(uuid) from public;
revoke execute on function public.is_couple_member(uuid) from anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.new_invite_code() from public, anon, authenticated;
revoke execute on function public.set_signal_recipient() from public, anon, authenticated;
revoke execute on function public.enforce_signal_resolution() from public, anon, authenticated;
revoke execute on function public.begin_push_registration(uuid) from public;
revoke execute on function public.begin_push_registration(uuid) from anon;
grant execute on function public.begin_push_registration(uuid) to authenticated;
revoke execute on function public.store_push_token(uuid, text, bigint) from public;
revoke execute on function public.store_push_token(uuid, text, bigint) from anon;
grant execute on function public.store_push_token(uuid, text, bigint) to authenticated;
revoke execute on function public.clear_push_token(uuid) from public;
revoke execute on function public.clear_push_token(uuid) from anon;
grant execute on function public.clear_push_token(uuid) to authenticated;

-- Partners may see public profile fields, never each other's Expo push token.
-- Start from zero so legacy ALL grants cannot leave TRUNCATE/TRIGGER access.
revoke all privileges on table public.profiles from public, anon, authenticated;
revoke all privileges on table public.couples from public, anon, authenticated;
revoke all privileges on table public.signals from public, anon, authenticated;
revoke all privileges on table public.responses from public, anon, authenticated;

grant select (id, display_name, avatar_key, created_at)
  on table public.profiles to authenticated;
grant update (display_name, avatar_key)
  on table public.profiles to authenticated;
grant select on table public.couples to authenticated;
grant select on table public.signals to authenticated;
grant insert (couple_id, from_user, type)
  on table public.signals to authenticated;
grant update (resolved_at) on table public.signals to authenticated;
grant select on table public.responses to authenticated;
grant insert (signal_id, from_user, choice)
  on table public.responses to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Push live inserts/updates to the partner's app (Phase 5). Idempotent: adding
-- a table already in the publication raises 42710, so guard each add.
do $$
declare t text;
begin
  foreach t in array array['signals', 'responses', 'couples'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
