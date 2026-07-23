-- Hearth — database schema (Phase 4)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste all
-- → Run. Safe to re-run (drops and recreates policies). Nothing here is secret.
--
-- Model: authenticated users (anonymous sign-in) have a profile; a couple links
-- exactly two profiles; signals + responses belong to a couple. Row Level
-- Security guarantees a user only ever sees their own couple's rows.

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_key   text check (avatar_key in ('a', 'b')),
  push_token   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  member_a    uuid not null references public.profiles (id) on delete cascade,
  member_b    uuid references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.signals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  from_user   uuid not null references public.profiles (id) on delete cascade,
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

-- ── Helpers ───────────────────────────────────────────────────────────────

-- True when the current user belongs to the given couple. SECURITY DEFINER so
-- policies can call it without recursing through couples' own RLS.
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.couples c
    where c.id = cid and (c.member_a = auth.uid() or c.member_b = auth.uid())
  );
$$;

-- Auto-create a profile row the moment a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
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
set search_path = public as $$
declare new_code text; new_row public.couples;
begin
  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into public.couples (invite_code, member_a)
      values (new_code, auth.uid())
      returning * into new_row;
      return new_row;
    exception when unique_violation then
      -- code collided, try another
    end;
  end loop;
end;
$$;

-- Join an existing couple by code (caller becomes member_b). Bypasses the
-- select policy safely: you can't SELECT a couple you haven't joined yet.
create or replace function public.join_couple(code text)
returns public.couples language plpgsql security definer
set search_path = public as $$
declare target public.couples;
begin
  select * into target from public.couples where invite_code = upper(code);
  if target.id is null then
    raise exception 'No home found for that code';
  end if;
  if target.member_a = auth.uid() then
    return target; -- you made this home
  end if;
  if target.member_b is not null and target.member_b <> auth.uid() then
    raise exception 'This home is already full';
  end if;
  update public.couples set member_b = auth.uid()
    where id = target.id and (member_b is null or member_b = auth.uid())
    returning * into target;
  return target;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles  enable row level security;
alter table public.couples   enable row level security;
alter table public.signals   enable row level security;
alter table public.responses enable row level security;

-- profiles: read your own + your partner's; write only your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.couples c
    where (c.member_a = auth.uid() and c.member_b = profiles.id)
       or (c.member_b = auth.uid() and c.member_a = profiles.id)
  )
);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- couples: read/update only couples you belong to (pairing goes via RPCs).
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select
  using (member_a = auth.uid() or member_b = auth.uid());
drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples for update
  using (member_a = auth.uid() or member_b = auth.uid());

-- signals: scoped to your couple; you can only author your own.
drop policy if exists signals_select on public.signals;
create policy signals_select on public.signals for select using (is_couple_member(couple_id));
drop policy if exists signals_insert on public.signals;
create policy signals_insert on public.signals for insert
  with check (is_couple_member(couple_id) and from_user = auth.uid());
drop policy if exists signals_update on public.signals;
create policy signals_update on public.signals for update using (is_couple_member(couple_id));

-- responses: scoped to your couple's signals; you can only author your own.
drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses for select using (
  exists (select 1 from public.signals s where s.id = signal_id and is_couple_member(s.couple_id))
);
drop policy if exists responses_insert on public.responses;
create policy responses_insert on public.responses for insert with check (
  from_user = auth.uid()
  and exists (select 1 from public.signals s where s.id = signal_id and is_couple_member(s.couple_id))
);

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
