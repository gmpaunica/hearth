-- Hearth — production security and lifecycle hardening
--
-- Live upgrade: run this directly against the existing Hearth tables, before
-- notifications.sql. Do not rerun the newer schema.sql first. Fresh install:
-- schema.sql, unpair.sql, drawings.sql, romantic.sql, then this file.
-- Safe to re-run: targeted legacy cleanup is guarded by a private marker.

begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists push_registration_epoch bigint not null default 0;
alter table public.profiles
  add column if not exists push_registration_enabled boolean not null default true;

alter table public.signals
  add column if not exists recipient_user_id uuid;

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

-- Existing rows predate immutable recipients/relationship epochs. Preserve rows
-- authored by a member of a currently paired home, backfill their present
-- recipient, and quarantine only rows that cannot belong to the current pair.
-- Every currently reusable invite and legacy device route is still retired.
create table if not exists public.hearth_internal_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public.hearth_internal_migrations enable row level security;
revoke all privileges on table public.hearth_internal_migrations
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from public.hearth_internal_migrations
    where name = '2026-07-legacy-relationship-and-token-reset-v1'
  ) then
    -- A response by somebody outside the current pair must not survive even if
    -- its parent signal was authored by a current member.
    delete from public.responses r
    using public.signals s, public.couples c
    where r.signal_id = s.id
      and c.id = s.couple_id
      and (
        c.member_b is null
        or (r.from_user <> c.member_a and r.from_user <> c.member_b)
      );

    -- Waiting homes have no current recipient. Rows whose author is no longer a
    -- member are likewise ambiguous and are removed with cascading responses.
    delete from public.signals s
    where not exists (
      select 1 from public.couples c
      where c.id = s.couple_id
        and c.member_b is not null
        and (s.from_user = c.member_a or s.from_user = c.member_b)
    );
    delete from public.drawings d
    where not exists (
      select 1 from public.couples c
      where c.id = d.couple_id
        and c.member_b is not null
        and (d.from_user = c.member_a or d.from_user = c.member_b)
    );

    update public.signals s
    set recipient_user_id = case
      when s.from_user = c.member_a then c.member_b
      else c.member_a
    end
    from public.couples c
    where c.id = s.couple_id
      and c.member_b is not null
      and (s.from_user = c.member_a or s.from_user = c.member_b);

    update public.couples
    set invite_code = public.new_invite_code()
    where member_b is null;
    update public.profiles
    set push_token = null,
        push_registration_epoch = push_registration_epoch + 1
    where push_token is not null;

    insert into public.hearth_internal_migrations (name)
    values ('2026-07-legacy-relationship-and-token-reset-v1');
  end if;
end $$;

alter table public.signals
  alter column recipient_user_id set not null;
create unique index if not exists profiles_push_token_unique_idx
  on public.profiles (push_token)
  where push_token is not null;

-- Keep existing auth-trigger and RLS helper dependencies while replacing their
-- unsafe legacy search paths.
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql security definer stable
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.couples c
    where c.id = cid and (c.member_a = auth.uid() or c.member_b = auth.uid())
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

-- The legacy live functions return SETOF couples. Drop them before changing the
-- return shape to one composite row; CREATE OR REPLACE cannot change return type.
drop function if exists public.create_couple();
drop function if exists public.join_couple(text);

-- Serialize membership changes per identity and enforce one current home.
create function public.create_couple()
returns public.couples language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
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

create function public.join_couple(code text)
returns public.couples language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  uid uuid := auth.uid();
  target public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into target
  from public.couples
  where invite_code = upper(trim(code))
  for update;

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

  update public.couples
  set member_b = uid
  where id = target.id and member_b is null
  returning * into target;
  if target.id is null then
    raise exception 'This home is already full';
  end if;
  return target;
end;
$$;

-- Purge the relationship epoch before allowing a replacement member. Surviving
-- homes reset their age, and the loop also repairs identities admitted to
-- multiple homes by older policies.
create or replace function public.leave_couple()
returns void language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  uid uuid := auth.uid();
  home public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  for home in
    select * from public.couples
    where member_a = uid or member_b = uid
    order by created_at
    for update
  loop
    delete from public.signals where couple_id = home.id;
    if to_regclass('public.drawings') is not null then
      execute 'delete from public.drawings where couple_id = $1' using home.id;
    end if;

    if home.member_b = uid then
      update public.couples
      set member_b = null,
          invite_code = public.new_invite_code(),
          created_at = now()
      where id = home.id;
    elsif home.member_a = uid then
      if home.member_b is null then
        delete from public.couples where id = home.id;
      else
        update public.couples
        set member_a = home.member_b,
            member_b = null,
            invite_code = public.new_invite_code(),
            created_at = now()
        where id = home.id;
      end if;
    end if;
  end loop;
end;
$$;

-- Capture the insertion-time recipient. The Edge Function never derives a
-- recipient from whichever members happen to be in the home later.
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

-- Clients may only resolve an open signal. They cannot reopen it or forge the
-- resolution timestamp.
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

-- Push-token writes use an epoch. Clear/sign-out increments it, making every
-- already-running registration incapable of restoring a stale token.
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

  -- Reassign a physical device token from every stale anonymous identity before
  -- the unique index permits this identity to own it.
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1
  where push_token = p_token and id <> uid;

  update public.profiles
  set push_token = p_token
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
  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

-- Token invalidation and every home departure share one PostgreSQL transaction.
create or replace function public.prepare_sign_out()
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1,
      push_registration_enabled = false
  where id = uid;
  if not found then
    raise exception 'Profile not found';
  end if;
  perform public.leave_couple();
end;
$$;

-- SECURITY DEFINER functions are API endpoints unless PUBLIC is revoked.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

revoke execute on function public.new_invite_code() from public, anon, authenticated;
revoke execute on function public.set_signal_recipient() from public, anon, authenticated;
revoke execute on function public.enforce_signal_resolution() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.create_couple() from public;
revoke execute on function public.create_couple() from anon;
grant execute on function public.create_couple() to authenticated;
revoke execute on function public.join_couple(text) from public;
revoke execute on function public.join_couple(text) from anon;
grant execute on function public.join_couple(text) to authenticated;
revoke execute on function public.leave_couple() from public;
revoke execute on function public.leave_couple() from anon;
grant execute on function public.leave_couple() to authenticated;
revoke execute on function public.prepare_sign_out() from public;
revoke execute on function public.prepare_sign_out() from anon;
grant execute on function public.prepare_sign_out() to authenticated;
revoke execute on function public.begin_push_registration(uuid) from public;
revoke execute on function public.begin_push_registration(uuid) from anon;
grant execute on function public.begin_push_registration(uuid) to authenticated;
revoke execute on function public.store_push_token(uuid, text, bigint) from public;
revoke execute on function public.store_push_token(uuid, text, bigint) from anon;
grant execute on function public.store_push_token(uuid, text, bigint) to authenticated;
revoke execute on function public.clear_push_token(uuid) from public;
revoke execute on function public.clear_push_token(uuid) from anon;
grant execute on function public.clear_push_token(uuid) to authenticated;
revoke execute on function public.is_couple_member(uuid) from public;
revoke execute on function public.is_couple_member(uuid) from anon;
grant execute on function public.is_couple_member(uuid) to authenticated;

-- RLS chooses visible rows; table/column grants remove every legacy API
-- privilege first, including TRUNCATE, REFERENCES, and TRIGGER.
revoke all privileges on table public.profiles from public, anon, authenticated;
revoke all privileges on table public.couples from public, anon, authenticated;
revoke all privileges on table public.signals from public, anon, authenticated;
revoke all privileges on table public.responses from public, anon, authenticated;
revoke all privileges on table public.drawings from public, anon, authenticated;

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
grant select, insert, update on table public.drawings to authenticated;

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

drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select to authenticated
  using (member_a = auth.uid() or member_b = auth.uid());
drop policy if exists couples_insert on public.couples;
drop policy if exists couples_update on public.couples;
drop policy if exists couples_delete on public.couples;

drop policy if exists signals_select on public.signals;
create policy signals_select on public.signals for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists signals_insert on public.signals;
create policy signals_insert on public.signals for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and from_user = auth.uid()
    and recipient_user_id is not null
    and recipient_user_id <> auth.uid()
  );
drop policy if exists signals_update on public.signals;
create policy signals_update on public.signals for update to authenticated
  using (public.is_couple_member(couple_id) and resolved_at is null)
  with check (public.is_couple_member(couple_id) and resolved_at is not null);
drop policy if exists signals_delete on public.signals;

drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses for select to authenticated using (
  exists (
    select 1 from public.signals s
    where s.id = signal_id and public.is_couple_member(s.couple_id)
  )
);
drop policy if exists responses_insert on public.responses;
create policy responses_insert on public.responses for insert to authenticated with check (
  from_user = auth.uid()
  and exists (
    select 1 from public.signals s
    where s.id = signal_id and public.is_couple_member(s.couple_id)
  )
);
drop policy if exists responses_update on public.responses;
drop policy if exists responses_delete on public.responses;

drop policy if exists drawings_select on public.drawings;
create policy drawings_select on public.drawings for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists drawings_insert on public.drawings;
create policy drawings_insert on public.drawings for insert to authenticated
  with check (public.is_couple_member(couple_id) and from_user = auth.uid());
drop policy if exists drawings_update on public.drawings;
create policy drawings_update on public.drawings for update to authenticated
  using (from_user = auth.uid() and public.is_couple_member(couple_id))
  with check (from_user = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists drawings_delete on public.drawings;

commit;
