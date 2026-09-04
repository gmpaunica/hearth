-- Hearth Moments owner-review revision -- ritual fire, visible readiness,
-- spatial event payloads, and real Rest responses.
--
-- Additive follow-up to 20260814180000_moments_flow_correction.sql. Existing
-- tables, action identifiers, and RPC signatures remain wire-compatible.

begin;

-- -- One shared home day ---------------------------------------------------

alter table public.couples
  add column if not exists home_timezone text;

alter table public.couples
  drop constraint if exists couples_home_timezone_shape_check;
alter table public.couples
  add constraint couples_home_timezone_shape_check check (
    home_timezone is null or (
      home_timezone = btrim(home_timezone)
      and char_length(home_timezone) between 1 and 63
      and home_timezone !~ '[[:cntrl:]]'
    )
  );

create or replace function public.reject_invalid_home_timezone()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if new.home_timezone is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names
    where name = new.home_timezone
  ) then
    raise exception 'Unknown IANA home timezone';
  end if;
  return new;
end;
$$;

drop trigger if exists couples_validate_home_timezone on public.couples;
create trigger couples_validate_home_timezone
  before insert or update of home_timezone on public.couples
  for each row execute function public.reject_invalid_home_timezone();

create or replace function public.initialize_home_timezone(p_timezone text)
returns text language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  normalized text := btrim(p_timezone);
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into home from public.couples c
  where c.member_a = uid
  order by c.created_at desc limit 1 for update;
  if home.id is null then
    raise exception 'Only member A can initialize the home timezone'
      using errcode = '42501';
  end if;
  if normalized is null or char_length(normalized) not between 1 and 63
     or normalized <> p_timezone or normalized ~ '[[:cntrl:]]'
     or not exists (
       select 1 from pg_catalog.pg_timezone_names where name = normalized
     ) then
    raise exception 'Unknown IANA home timezone';
  end if;
  if home.home_timezone is null then
    update public.couples set home_timezone = normalized where id = home.id;
    return normalized;
  end if;
  -- Initialization is deliberately first-writer-only. A retry with the same
  -- value is idempotent; changing the couple's day boundary needs a separate,
  -- explicit product flow.
  if home.home_timezone <> normalized then
    raise exception 'The home timezone is already initialized';
  end if;
  return home.home_timezone;
end;
$$;

create or replace function public.get_daily_ritual_snapshot()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  zone text;
  local_now timestamp;
  home_day date;
  after_evening boolean;
  available integer;
  completed integer;
  fire text;
  next_local timestamp;
  next_refresh timestamptz;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into home from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc limit 1;
  if home.id is null then
    raise exception 'Home not found' using errcode = '42501';
  end if;

  zone := coalesce(home.home_timezone, 'UTC');
  local_now := statement_timestamp() at time zone zone;
  home_day := local_now::date;
  after_evening := local_now::time >= time '19:00';
  available := case when home.member_b is null then 1 else 2 end;

  select count(distinct d.from_user)::integer into completed
  from public.drawings d
  where d.couple_id = home.id
    and d.day = home_day
    and d.from_user in (home.member_a, home.member_b);
  completed := least(available, coalesce(completed, 0));

  fire := case
    when completed >= available then 'glowing'
    when completed > 0 then 'warming'
    when after_evening then 'low'
    else 'steady'
  end;

  next_local := case
    when not after_evening then home_day::timestamp + time '19:00'
    else (home_day + 1)::timestamp
  end;
  next_refresh := next_local at time zone zone;

  return jsonb_build_object(
    'home_date', home_day,
    'home_timezone', zone,
    'after_evening_check', after_evening,
    'available_units', available,
    'completed_units', completed,
    'fire_state', fire,
    'next_refresh_at', next_refresh
  );
end;
$$;

-- -- Durable, visible readiness -------------------------------------------

create table if not exists public.moment_readiness_events (
  id           uuid primary key default gen_random_uuid(),
  signal_id    uuid not null references public.moment_sessions (signal_id) on delete cascade,
  couple_id    uuid not null references public.couples (id) on delete cascade,
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  readiness    boolean not null,
  occurred_at  timestamptz not null default now()
);

create index if not exists moment_readiness_events_couple_time_idx
  on public.moment_readiness_events (couple_id, occurred_at);
create index if not exists moment_readiness_events_signal_time_idx
  on public.moment_readiness_events (signal_id, occurred_at);

create or replace function public.reject_moment_readiness_event_mutation()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  raise exception 'Moment readiness events are immutable';
end;
$$;

drop trigger if exists moment_readiness_events_immutable
  on public.moment_readiness_events;
create trigger moment_readiness_events_immutable
  before update or delete on public.moment_readiness_events
  for each row execute function public.reject_moment_readiness_event_mutation();

create or replace function public.set_moment_readiness(p_signal_id uuid, p_ready boolean)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
  joined_count integer;
  ready_count integer;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  -- A retry after resolution is an animation no-op as well as a database
  -- no-op. The completion event is already available through the snapshot.
  if target.terminal_at is not null then return null; end if;
  if target.destination <> 'fireplace' then
    raise exception 'Readiness is only available at the fireplace';
  end if;
  select count(*) into joined_count from public.moment_participants
  where signal_id = target.signal_id and joined_at is not null;
  if joined_count <> 2 then
    raise exception 'Both people must join before choosing readiness';
  end if;

  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;
  -- No timestamp, event, or animation identity changes on an identical retry.
  if participant.readiness is not distinct from p_ready then return null; end if;

  update public.moment_participants
  set readiness = p_ready,
      readiness_updated_at = now(),
      completion_choice = null,
      completion_chosen_at = null,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;

  insert into public.moment_readiness_events (
    signal_id, couple_id, actor_id, readiness
  ) values (target.signal_id, target.couple_id, uid, p_ready);

  select count(*) into ready_count from public.moment_participants
  where signal_id = target.signal_id and readiness;
  if ready_count = 2 then
    return public.finish_moment_internal(
      target.signal_id, 'fireplace_reconnected', true, null
    );
  end if;
  return null;
end;
$$;

-- -- Validated Rest action payloads ---------------------------------------

alter table public.moment_action_events
  add column if not exists payload jsonb;

alter table public.moment_action_events
  drop constraint if exists moment_action_events_prop_type_check;
alter table public.moment_action_events
  add constraint moment_action_events_prop_type_check check (
    prop_type is null or prop_type in (
      'banked_embers', 'garden_departure', 'rose', 'tea_tray',
      'heart_cushion', 'waiting_mug', 'second_mug', 'soft_light',
      'folded_blanket', 'tiny_drawing', 'paired_lanterns', 'gentle_light',
      'silly_visitor', 'hug_token'
    )
  );

create or replace function public.rest_moment_payload_is_valid(
  p_action text,
  p_payload jsonb
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case
  when coalesce(jsonb_typeof(p_payload), '') <> 'object' then false
  else case p_action
    when 'make_doodle' then
      p_payload - array['version', 'width', 'height', 'palette_id', 'cells']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
      and p_payload -> 'width' = '12'::jsonb
      and p_payload -> 'height' = '12'::jsonb
      and jsonb_typeof(p_payload -> 'palette_id') = 'string'
      and p_payload ->> 'palette_id' = 'hearth-rest-v1'
      and jsonb_typeof(p_payload -> 'cells') = 'string'
      and char_length(p_payload ->> 'cells') = 144
      and (p_payload ->> 'cells') ~ '^[.0-5]{144}$'
    when 'rest_doodle' then
      p_payload - array['version', 'width', 'height', 'palette_id', 'cells']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
      and p_payload -> 'width' = '12'::jsonb
      and p_payload -> 'height' = '12'::jsonb
      and jsonb_typeof(p_payload -> 'palette_id') = 'string'
      and p_payload ->> 'palette_id' = 'hearth-rest-v1'
      and jsonb_typeof(p_payload -> 'cells') = 'string'
      and char_length(p_payload ->> 'cells') = 144
      and (p_payload ->> 'cells') ~ '^[.0-5]{144}$'
    when 'send_visitor' then
      p_payload - array['version', 'visitor']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
      and jsonb_typeof(p_payload -> 'visitor') = 'string'
      and p_payload ->> 'visitor' in ('duck', 'frog', 'toast')
    when 'rest_visitor' then
      p_payload - array['version', 'visitor']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
      and jsonb_typeof(p_payload -> 'visitor') = 'string'
      and p_payload ->> 'visitor' in ('duck', 'frog', 'toast')
    when 'send_hug' then
      p_payload - array['version']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
    when 'rest_hug' then
      p_payload - array['version']::text[] = '{}'::jsonb
      and p_payload -> 'version' = '1'::jsonb
    else false
  end end;
$$;

alter table public.moment_action_events
  drop constraint if exists moment_action_events_payload_check;
alter table public.moment_action_events
  add constraint moment_action_events_payload_check check (
    payload is null or (
      destination = 'rest'
      and public.rest_moment_payload_is_valid(canonical_action, payload)
    )
  );

create or replace function public.respond_to_rest_moment(
  p_signal_id uuid,
  p_action text,
  p_payload jsonb
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
  event_id uuid;
  existing_payload jsonb;
  canonical_value text;
  prop text;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_action not in ('make_doodle', 'send_visitor', 'send_hug')
     or not coalesce(public.rest_moment_payload_is_valid(p_action, p_payload), false) then
    raise exception 'Invalid Rest response payload';
  end if;

  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  if target.destination <> 'rest' then
    raise exception 'This response belongs in the Rest nook';
  end if;
  if target.author_id = uid then
    raise exception 'Only the invited partner can respond';
  end if;

  canonical_value := case p_action
    when 'make_doodle' then 'rest_doodle'
    when 'send_visitor' then 'rest_visitor'
    when 'send_hug' then 'rest_hug'
  end;

  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;
  if participant.response_action is not null then
    if participant.response_action = canonical_value then
      select id, payload into event_id, existing_payload
      from public.moment_action_events
      where signal_id = target.signal_id
        and actor_id = uid
        and canonical_action = canonical_value;
      if event_id is not null and existing_payload = p_payload then return event_id; end if;
    end if;
    raise exception 'Use the available next action for this moment';
  end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;

  prop := case canonical_value
    when 'rest_doodle' then 'tiny_drawing'
    when 'rest_visitor' then 'silly_visitor'
    when 'rest_hug' then 'hug_token'
  end;
  insert into public.moment_action_events (
    signal_id, couple_id, actor_id, destination,
    canonical_action, prop_type, payload
  ) values (
    target.signal_id, target.couple_id, uid, 'rest',
    canonical_value, prop, p_payload
  ) returning id into event_id;

  update public.moment_participants
  set response_action = canonical_value,
      responded_at = now(),
      note = null,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;
  update public.moment_sessions
  set phase = 'responded', updated_at = now()
  where signal_id = target.signal_id;
  return event_id;
end;
$$;

-- -- Snapshot enrichment --------------------------------------------------

alter function public.get_moment_snapshot_v2()
  rename to get_moment_snapshot_v2_owner_review_base;
revoke execute on function public.get_moment_snapshot_v2_owner_review_base()
  from public, anon, authenticated;

create function public.get_moment_snapshot_v2()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  base jsonb;
  home public.couples;
  zone text;
  home_start timestamptz;
  active_id uuid;
  destination text;
  intent text;
  participant_rows jsonb := '[]'::jsonb;
  current_events jsonb := '[]'::jsonb;
  today_events jsonb := '[]'::jsonb;
  readiness_rows jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  base := public.get_moment_snapshot_v2_owner_review_base();
  select * into home from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc limit 1;
  zone := coalesce(home.home_timezone, 'UTC');
  home_start := ((statement_timestamp() at time zone zone)::date)::timestamp at time zone zone;
  active_id := nullif(base #>> '{active,signal_id}', '')::uuid;
  destination := base #>> '{active,destination}';
  intent := base #>> '{active,intent}';

  if active_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', mp.user_id,
      'role', mp.participant_role,
      'note', mp.note,
      'note_removed', mp.note_removed_at is not null,
      'response_action', case when mp.response_action is null then null else
        public.canonical_moment_action(destination, intent, mp.response_action) end,
      'responded_at', mp.responded_at,
      'joined_at', mp.joined_at,
      'readiness', mp.readiness,
      'readiness_updated_at', mp.readiness_updated_at,
      'completion_choice', null,
      'completion_chosen_at', null,
      'returned_at', mp.returned_at
    ) order by mp.participant_role), '[]'::jsonb)
    into participant_rows
    from public.moment_participants mp
    where mp.signal_id = active_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'signal_id', e.signal_id, 'actor_id', e.actor_id,
    'destination', e.destination, 'canonical_action', e.canonical_action,
    'prop_type', e.prop_type, 'payload', e.payload,
    'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into current_events from public.moment_action_events e
  where e.couple_id = home.id and e.signal_id = active_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'signal_id', e.signal_id, 'actor_id', e.actor_id,
    'destination', e.destination, 'canonical_action', e.canonical_action,
    'prop_type', e.prop_type, 'payload', e.payload,
    'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into today_events from public.moment_action_events e
  where e.couple_id = home.id and e.occurred_at >= home_start;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'signal_id', e.signal_id, 'actor_id', e.actor_id,
    'readiness', e.readiness, 'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into readiness_rows from public.moment_readiness_events e
  where e.couple_id = home.id and e.occurred_at >= home_start;

  base := jsonb_set(base, '{participants}', participant_rows, false);
  base := jsonb_set(base, '{current_action_events}', current_events, true);
  base := jsonb_set(base, '{today_action_events}', today_events, true);
  base := jsonb_set(base, '{readiness_events}', readiness_rows, true);
  return base;
end;
$$;

-- -- RLS, immutability, Realtime, and least privilege ---------------------

alter table public.moment_readiness_events enable row level security;
drop policy if exists moment_readiness_events_select
  on public.moment_readiness_events;
create policy moment_readiness_events_select on public.moment_readiness_events
  for select to authenticated using (public.is_couple_member(couple_id));

revoke all privileges on table public.moment_readiness_events
  from public, anon, authenticated;
grant select on table public.moment_readiness_events to authenticated;

revoke execute on function public.initialize_home_timezone(text) from public, anon;
grant execute on function public.initialize_home_timezone(text) to authenticated;
revoke execute on function public.get_daily_ritual_snapshot() from public, anon;
grant execute on function public.get_daily_ritual_snapshot() to authenticated;
revoke execute on function public.set_moment_readiness(uuid, boolean) from public, anon;
grant execute on function public.set_moment_readiness(uuid, boolean) to authenticated;
revoke execute on function public.respond_to_rest_moment(uuid, text, jsonb) from public, anon;
grant execute on function public.respond_to_rest_moment(uuid, text, jsonb) to authenticated;
revoke execute on function public.get_moment_snapshot_v2() from public, anon;
grant execute on function public.get_moment_snapshot_v2() to authenticated;

revoke execute on function public.reject_invalid_home_timezone()
  from public, anon, authenticated;
revoke execute on function public.reject_moment_readiness_event_mutation()
  from public, anon, authenticated;
revoke execute on function public.rest_moment_payload_is_valid(text, jsonb)
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'moment_readiness_events'
  ) then
    alter publication supabase_realtime
      add table public.moment_readiness_events;
  end if;
end $$;

commit;
