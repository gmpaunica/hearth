-- Hearth Moments 1.0.3 -- one meaningful shared state per couple
--
-- Additive follow-up to the fireplace-stack migrations. Legacy signals and
-- RPC signatures remain intact, while current clients use the v2 functions
-- and typed snapshot below. Run after 20260812120000_calm_moments.sql.

begin;

-- -- Durable v2 state -------------------------------------------------------

create table if not exists public.moment_sessions (
  signal_id             uuid primary key references public.signals (id) on delete cascade,
  couple_id             uuid not null references public.couples (id) on delete cascade,
  author_id             uuid not null references public.profiles (id) on delete cascade,
  destination           text not null check (destination in (
    'fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic'
  )),
  intent                text check (intent is null or intent in (
    'stay_close', 'talk_through', 'hear_first',
    'acknowledge_hurt', 'apologize', 'more_time'
  )),
  phase                 text not null default 'waiting' check (phase in (
    'waiting', 'responded', 'shared', 'completed', 'closed'
  )),
  scheduled_for         timestamptz,
  scheduled_by_user_id  uuid references public.profiles (id) on delete set null,
  shared_started_at     timestamptz,
  shared_due_at         timestamptz,
  shared_ended_at       timestamptz,
  terminal_at           timestamptz,
  terminal_reason       text check (terminal_reason is null or terminal_reason in (
    'fireplace_reconnected', 'garden_ready', 'sofa_care',
    'table_talked', 'rest_ready', 'romantic_remote_affection',
    'romantic_declined', 'romantic_elapsed', 'withdrawn'
  )),
  completion_event_id   uuid unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (signal_id, couple_id),
  check (
    (destination = 'fireplace' and intent is not null)
    or (destination <> 'fireplace' and intent is null)
  ),
  check (
    (terminal_at is null and terminal_reason is null and phase in ('waiting', 'responded', 'shared'))
    or (terminal_at is not null and terminal_reason is not null and phase in ('completed', 'closed'))
  ),
  check (
    (shared_started_at is null and shared_due_at is null)
    or destination = 'romantic'
  )
);

create unique index if not exists moment_sessions_one_active_per_couple_idx
  on public.moment_sessions (couple_id)
  where terminal_at is null;
create index if not exists moment_sessions_recent_idx
  on public.moment_sessions (couple_id, terminal_at desc, created_at desc);
create index if not exists moment_sessions_romantic_due_idx
  on public.moment_sessions (shared_due_at)
  where destination = 'romantic' and terminal_at is null and shared_due_at is not null;

create table if not exists public.moment_participants (
  signal_id          uuid not null references public.moment_sessions (signal_id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  participant_role   text not null check (participant_role in ('author', 'partner')),
  note               text check (note is null or char_length(note) between 1 and 240),
  note_removed_at    timestamptz,
  response_action    text,
  responded_at       timestamptz,
  completion_choice  text check (completion_choice is null or completion_choice in (
    'reconnected', 'talk_first', 'more_time', 'talked', 'not_yet'
  )),
  completion_chosen_at timestamptz,
  returned_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (signal_id, user_id),
  unique (signal_id, participant_role),
  check (
    (response_action is null and responded_at is null)
    or (response_action is not null and responded_at is not null)
  ),
  check (note_removed_at is null or note is null)
);

create table if not exists public.moment_completion_events (
  id               uuid primary key default gen_random_uuid(),
  signal_id        uuid not null unique references public.moment_sessions (signal_id) on delete cascade,
  couple_id        uuid not null references public.couples (id) on delete cascade,
  destination      text not null check (destination in (
    'fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic'
  )),
  terminal_reason  text not null check (terminal_reason <> 'withdrawn'),
  response_action  text,
  payoff_kind      text not null check (payoff_kind in ('mutual_heart', 'destination')),
  occurred_at      timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'moment_sessions_completion_event_fkey'
      and conrelid = 'public.moment_sessions'::regclass
  ) then
    alter table public.moment_sessions
      add constraint moment_sessions_completion_event_fkey
      foreign key (completion_event_id)
      references public.moment_completion_events (id)
      deferrable initially deferred;
  end if;
end $$;

create index if not exists moment_completion_events_couple_time_idx
  on public.moment_completion_events (couple_id, occurred_at desc);

-- -- Validation and state-machine helpers ----------------------------------

create or replace function public.moment_response_is_valid(
  p_destination text,
  p_intent text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case p_destination
    when 'fireplace' then case p_intent
      when 'stay_close' then p_action in ('join_by_fire', 'offer_reassurance', 'care_need_time')
      when 'talk_through' then p_action in ('talk_now_by_fire', 'talk_later')
      when 'hear_first' then p_action = 'listen_by_fire'
      when 'acknowledge_hurt' then p_action in (
        'acknowledge_by_fire', 'understand_first', 'care_need_time'
      )
      when 'apologize' then p_action in (
        'receive_apology', 'appreciate_need_time', 'talk_by_fire'
      )
      when 'more_time' then p_action = 'respect_more_time'
      else false
    end
    when 'garden' then p_action in ('respect_space', 'reassure_from_home', 'leave_door_open')
    when 'sofa' then p_action in ('sit_together', 'send_hug', 'offer_practical_help', 'care_need_time')
    when 'table' then p_action in ('talk_now', 'talk_later')
    when 'rest' then p_action in ('remove_pressure', 'encourage', 'offer_practical_help', 'send_affection')
    when 'romantic' then p_action in ('come_close', 'return_affection', 'kindly_decline')
    else false
  end;
$$;

create or replace function public.moment_response_moves_to_destination(
  p_destination text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case p_destination
    when 'fireplace' then p_action in (
      'join_by_fire', 'talk_now_by_fire', 'listen_by_fire',
      'acknowledge_by_fire', 'talk_by_fire'
    )
    when 'sofa' then p_action = 'sit_together'
    when 'table' then p_action = 'talk_now'
    when 'romantic' then p_action = 'come_close'
    else false
  end;
$$;

create or replace function public.moment_response_needs_schedule(
  p_destination text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select
    (p_destination = 'table' and p_action = 'talk_later')
    or (p_destination = 'fireplace' and p_action in (
      'care_need_time', 'talk_later', 'appreciate_need_time'
    ));
$$;

create or replace function public.normalize_moment_note(p_note text)
returns text language plpgsql immutable
set search_path = pg_catalog, public as $$
declare
  normalized text := nullif(btrim(p_note), '');
begin
  if normalized is not null and char_length(normalized) > 240 then
    raise exception 'A moment note can contain at most 240 characters'
      using errcode = '22001';
  end if;
  return normalized;
end;
$$;

create or replace function public.moment_payoff_kind(p_destination text)
returns text language sql immutable
set search_path = pg_catalog, public as $$
  select case
    when p_destination in ('fireplace', 'table') then 'mutual_heart'
    else 'destination'
  end;
$$;

create or replace function public.finish_moment_internal(
  p_signal_id uuid,
  p_terminal_reason text,
  p_emit_completion boolean,
  p_response_action text default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  target public.moment_sessions;
  event_id uuid;
  finished_at timestamptz := now();
begin
  select * into target
  from public.moment_sessions
  where signal_id = p_signal_id
  for update;

  if target.signal_id is null then
    raise exception 'Moment not found';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;

  if p_emit_completion then
    event_id := gen_random_uuid();
    insert into public.moment_completion_events (
      id, signal_id, couple_id, destination, terminal_reason,
      response_action, payoff_kind, occurred_at
    ) values (
      event_id, target.signal_id, target.couple_id, target.destination,
      p_terminal_reason, p_response_action,
      public.moment_payoff_kind(target.destination), finished_at
    );
  end if;

  update public.moment_sessions
  set phase = case when p_emit_completion then 'completed' else 'closed' end,
      terminal_at = finished_at,
      terminal_reason = p_terminal_reason,
      completion_event_id = event_id,
      shared_ended_at = case
        when shared_started_at is not null then finished_at
        else shared_ended_at
      end,
      updated_at = finished_at
  where signal_id = target.signal_id;

  -- Clear only presence that still points at this moment. A later move already
  -- made this row non-current, so unrelated presence is never overwritten.
  update public.signal_presence
  set is_current = false,
      left_at = coalesce(left_at, finished_at),
      updated_at = finished_at
  where signal_id = target.signal_id
    and is_current;

  -- v2 is the only path allowed to resolve the compatibility signal row.
  perform set_config('hearth.moment_v2_terminal', 'on', true);
  update public.signals
  set resolved_at = coalesce(resolved_at, finished_at),
      latest_activity_at = finished_at
  where id = target.signal_id;

  return event_id;
end;
$$;

create or replace function public.maybe_start_romantic_shared_internal(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  target public.moment_sessions;
  both_present boolean;
  started_at timestamptz := now();
begin
  select * into target
  from public.moment_sessions
  where signal_id = p_signal_id
  for update;

  if target.signal_id is null
     or target.destination <> 'romantic'
     or target.terminal_at is not null
     or target.shared_started_at is not null then
    return;
  end if;

  select count(*) = 2 into both_present
  from public.signal_presence p
  join public.moment_participants mp
    on mp.signal_id = p.signal_id and mp.user_id = p.user_id
  where p.signal_id = target.signal_id and p.is_current;

  if both_present then
    update public.moment_sessions
    set phase = 'shared',
        shared_started_at = started_at,
        shared_due_at = started_at + interval '20 minutes',
        updated_at = started_at
    where signal_id = target.signal_id;
  end if;
end;
$$;

-- A legacy client may still call close_authored_interaction(signal_id). It may
-- append inert legacy response/presence rows, but it cannot resolve or change
-- the authoritative v2 session.
create or replace function public.protect_v2_signal_resolution()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if new.resolved_at is distinct from old.resolved_at
     and exists (
       select 1 from public.moment_sessions ms where ms.signal_id = old.id
     )
     and coalesce(current_setting('hearth.moment_v2_terminal', true), '') <> 'on' then
    raise exception 'This moment requires the current client';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_v2_signal_resolution_before_update on public.signals;
create trigger protect_v2_signal_resolution_before_update
  before update of resolved_at on public.signals
  for each row execute function public.protect_v2_signal_resolution();

-- Legacy clients keep their exact RPC signatures, but a guessed v2 signal ID
-- cannot bypass destination/action movement validation or append a second,
-- legacy-shaped response to the authoritative moment.
create or replace function public.reject_v2_legacy_response()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if exists (
    select 1 from public.moment_sessions ms where ms.signal_id = new.signal_id
  ) then
    raise exception 'This moment requires the current client';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_v2_legacy_response_before_insert on public.responses;
create trigger reject_v2_legacy_response_before_insert
  before insert on public.responses
  for each row execute function public.reject_v2_legacy_response();

create or replace function public.move_to_interaction(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id
    and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
    and not exists (
      select 1 from public.moment_sessions ms where ms.signal_id = s.id
    )
  for update of s;
  if target.id is null then
    raise exception 'Open legacy interaction not found' using errcode = '42501';
  end if;
  perform public.move_interaction_presence_internal(uid, target.couple_id, target.id);
end;
$$;

create or replace function public.leave_interaction(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id
    and uid in (c.member_a, c.member_b)
    and not exists (
      select 1 from public.moment_sessions ms where ms.signal_id = s.id
    )
  for update of s;
  if target.id is null then
    raise exception 'Legacy interaction not found' using errcode = '42501';
  end if;
  update public.signal_presence
  set is_current = false, left_at = now(), updated_at = now()
  where signal_id = target.id and user_id = uid and is_current;
end;
$$;

-- -- Typed mutations --------------------------------------------------------

create or replace function public.start_moment(
  p_type text,
  p_intent text default null,
  p_note text default null,
  p_scheduled_for timestamptz default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  partner_id uuid;
  group_id uuid;
  signal_id uuid;
  normalized_note text := public.normalize_moment_note(p_note);
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into home
  from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc
  limit 1
  for update;

  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;
  partner_id := case when home.member_a = uid then home.member_b else home.member_a end;

  if p_type not in ('fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic') then
    raise exception 'Unknown moment destination';
  end if;
  if p_type = 'fireplace' then
    if p_intent not in (
      'stay_close', 'talk_through', 'hear_first',
      'acknowledge_hurt', 'apologize', 'more_time'
    ) then
      raise exception 'Choose a fireplace intent';
    end if;
  elsif p_intent is not null then
    raise exception 'Only fireplace moments accept an intent';
  end if;

  if p_type = 'fireplace' and p_intent = 'more_time' then
    if p_scheduled_for is null or p_scheduled_for <= now()
       or p_scheduled_for > now() + interval '7 days' then
      raise exception 'Choose a return time within the next seven days';
    end if;
  elsif p_scheduled_for is not null then
    raise exception 'This moment does not accept a creation schedule';
  end if;

  if exists (
    select 1 from public.moment_sessions ms
    where ms.couple_id = home.id and ms.terminal_at is null
  ) then
    raise exception 'A shared moment is already open' using errcode = '23505';
  end if;

  insert into public.interaction_groups (couple_id, created_by)
  values (home.id, uid)
  returning id into group_id;

  insert into public.signals (
    couple_id, from_user, type, group_id, latest_activity_at
  ) values (
    home.id, uid, p_type, group_id, now()
  ) returning id into signal_id;

  insert into public.moment_sessions (
    signal_id, couple_id, author_id, destination, intent,
    scheduled_for, scheduled_by_user_id
  ) values (
    signal_id, home.id, uid, p_type, p_intent,
    p_scheduled_for,
    case when p_scheduled_for is not null then uid else null end
  );

  insert into public.moment_participants (
    signal_id, user_id, participant_role, note
  ) values
    (signal_id, uid, 'author', normalized_note),
    (signal_id, partner_id, 'partner', null);

  perform public.move_interaction_presence_internal(uid, home.id, signal_id);
  return signal_id;
exception
  when unique_violation then
    raise exception 'A shared moment is already open' using errcode = '23505';
end;
$$;

create or replace function public.respond_to_moment(
  p_signal_id uuid,
  p_action text,
  p_note text default null,
  p_scheduled_for timestamptz default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
  normalized_note text := public.normalize_moment_note(p_note);
  completion_reason text;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;

  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  if target.author_id = uid then
    raise exception 'Only the invited partner can respond';
  end if;

  select * into participant
  from public.moment_participants
  where signal_id = target.signal_id and user_id = uid
  for update;

  if participant.response_action is not null then
    if participant.response_action = p_action
       and participant.note is not distinct from normalized_note
       and (
         (
           public.moment_response_needs_schedule(target.destination, p_action)
           and target.scheduled_for is not distinct from p_scheduled_for
         )
         or (
           not public.moment_response_needs_schedule(target.destination, p_action)
           and p_scheduled_for is null
         )
       ) then
      return target.completion_event_id;
    end if;
    raise exception 'A response cannot be replaced';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if not public.moment_response_is_valid(target.destination, target.intent, p_action) then
    raise exception 'That response is not available for this moment';
  end if;

  if public.moment_response_needs_schedule(target.destination, p_action) then
    if p_scheduled_for is null or p_scheduled_for <= now()
       or p_scheduled_for > now() + interval '7 days' then
      raise exception 'Choose a return time within the next seven days';
    end if;
  elsif p_scheduled_for is not null then
    raise exception 'That response does not accept a return time';
  end if;

  update public.moment_participants
  set response_action = p_action,
      responded_at = now(),
      note = normalized_note,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;

  update public.moment_sessions
  set phase = case
        when public.moment_response_moves_to_destination(destination, p_action)
          then 'shared'
        else 'responded'
      end,
      scheduled_for = coalesce(p_scheduled_for, scheduled_for),
      scheduled_by_user_id = case
        when p_scheduled_for is not null then uid
        else scheduled_by_user_id
      end,
      updated_at = now()
  where signal_id = target.signal_id;

  if public.moment_response_moves_to_destination(target.destination, p_action) then
    perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  end if;

  if target.destination = 'sofa' and p_action <> 'care_need_time' then
    perform public.finish_moment_internal(
      target.signal_id, 'sofa_care', true, p_action
    );
  elsif target.destination = 'romantic' and p_action = 'return_affection' then
    perform public.finish_moment_internal(
      target.signal_id, 'romantic_remote_affection', true, p_action
    );
  elsif target.destination = 'romantic' and p_action = 'kindly_decline' then
    perform public.finish_moment_internal(
      target.signal_id, 'romantic_declined', true, p_action
    );
  elsif target.destination = 'romantic' and p_action = 'come_close' then
    perform public.maybe_start_romantic_shared_internal(target.signal_id);
  end if;

  return (
    select completion_event_id from public.moment_sessions
    where signal_id = target.signal_id
  );
end;
$$;

create or replace function public.set_moment_completion_choice(
  p_signal_id uuid,
  p_choice text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  partner_responded boolean;
  ready_count integer;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;

  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if target.destination not in ('fireplace', 'table') then
    raise exception 'This moment has no mutual completion choice';
  end if;

  select exists (
    select 1 from public.moment_participants mp
    where mp.signal_id = target.signal_id
      and mp.participant_role = 'partner'
      and mp.response_action is not null
  ) into partner_responded;
  if not partner_responded then
    raise exception 'The partner response comes first';
  end if;

  if target.destination = 'fireplace'
     and p_choice not in ('reconnected', 'talk_first', 'more_time') then
    raise exception 'Unknown fireplace completion choice';
  end if;
  if target.destination = 'table' and p_choice not in ('talked', 'not_yet') then
    raise exception 'Unknown table completion choice';
  end if;
  if target.destination = 'table' and not exists (
    select 1 from public.moment_participants mp
    where mp.signal_id = target.signal_id
      and mp.participant_role = 'partner'
      and (
        mp.response_action = 'talk_now'
        or (mp.response_action = 'talk_later' and mp.returned_at is not null)
      )
  ) then
    raise exception 'The conversation is not ready yet';
  end if;

  update public.moment_participants
  set completion_choice = p_choice,
      completion_chosen_at = now(),
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;

  select count(*) into ready_count
  from public.moment_participants mp
  where mp.signal_id = target.signal_id
    and mp.completion_choice = case
      when target.destination = 'fireplace' then 'reconnected'
      else 'talked'
    end;

  if ready_count = 2 then
    return public.finish_moment_internal(
      target.signal_id,
      case
        when target.destination = 'fireplace' then 'fireplace_reconnected'
        else 'table_talked'
      end,
      true,
      null
    );
  end if;

  -- Private nonterminal choices deliberately do not touch the public session:
  -- the other phone gets neither a status leak nor a Realtime nudge.
  return null;
end;
$$;

create or replace function public.remove_moment_note(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;

  update public.moment_participants
  set note = null,
      note_removed_at = coalesce(note_removed_at, now()),
      updated_at = now()
  where signal_id = target.signal_id
    and user_id = uid
    and note is not null;

  if found then
    update public.moment_sessions set updated_at = now()
    where signal_id = target.signal_id;
  end if;
  return found;
end;
$$;

create or replace function public.end_moment(
  p_signal_id uuid,
  p_reason text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if target.author_id <> uid then
    raise exception 'Only the creator can end this moment';
  end if;

  if p_reason = 'close_without_resolved' then
    perform public.finish_moment_internal(target.signal_id, 'withdrawn', false, null);
    return null;
  end if;
  if target.destination = 'garden' and p_reason = 'ready_to_come_back' then
    return public.finish_moment_internal(target.signal_id, 'garden_ready', true, null);
  end if;
  if target.destination = 'rest' and p_reason = 'feeling_ready' then
    return public.finish_moment_internal(target.signal_id, 'rest_ready', true, null);
  end if;
  raise exception 'That ending is not available for this moment';
end;
$$;

create or replace function public.move_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null or target.terminal_at is not null then
    return false;
  end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid;

  if participant.participant_role = 'partner' and not coalesce((
      public.moment_response_moves_to_destination(target.destination, participant.response_action)
      or (
        target.destination = 'table'
        and participant.response_action = 'talk_later'
        and target.scheduled_for <= now()
      )
    ), false) then
    raise exception 'That response does not enter this destination';
  end if;
  if target.destination in ('garden', 'rest') and participant.participant_role = 'partner' then
    raise exception 'This destination remains private for the author';
  end if;

  perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  if target.destination = 'romantic' then
    perform public.maybe_start_romantic_shared_internal(target.signal_id);
  end if;
  return true;
end;
$$;

create or replace function public.leave_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;

  update public.signal_presence
  set is_current = false,
      left_at = coalesce(left_at, now()),
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid and is_current;
  return true;
end;
$$;

create or replace function public.return_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  was_present boolean;
begin
  select exists (
    select 1 from public.signal_presence
    where signal_id = p_signal_id and user_id = uid and is_current
  ) into was_present;

  perform public.move_to_moment(p_signal_id);
  if not was_present then
    update public.moment_participants
    set returned_at = coalesce(returned_at, now()),
        updated_at = now()
    where signal_id = p_signal_id and user_id = uid;
  end if;
  return true;
end;
$$;

create or replace function public.finalize_due_romantic_moment(p_signal_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then
    raise exception 'Moment not found' using errcode = '42501';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if target.destination <> 'romantic' or target.shared_due_at is null then
    raise exception 'This romantic moment has no shared timer';
  end if;
  if target.shared_due_at > now() then
    return null;
  end if;
  return public.finish_moment_internal(
    target.signal_id, 'romantic_elapsed', true, 'come_close'
  );
end;
$$;

create or replace function public.finalize_all_due_romantic_moments()
returns integer language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  due record;
  finalized integer := 0;
begin
  for due in
    select signal_id
    from public.moment_sessions
    where destination = 'romantic'
      and terminal_at is null
      and shared_due_at <= now()
    order by shared_due_at
    for update skip locked
  loop
    perform public.finish_moment_internal(
      due.signal_id, 'romantic_elapsed', true, 'come_close'
    );
    finalized := finalized + 1;
  end loop;
  return finalized;
end;
$$;

-- -- Typed snapshot ---------------------------------------------------------

create or replace function public.get_moment_snapshot_v2()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  active public.moment_sessions;
  partner_id uuid;
  action_kind text := 'none';
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into home
  from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc
  limit 1;
  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;
  partner_id := case when home.member_a = uid then home.member_b else home.member_a end;

  select * into active
  from public.moment_sessions ms
  where ms.couple_id = home.id and ms.terminal_at is null
  order by ms.created_at desc
  limit 1;

  if active.signal_id is not null then
    if uid <> active.author_id and not exists (
      select 1 from public.moment_participants mp
      where mp.signal_id = active.signal_id and mp.user_id = uid
        and mp.response_action is not null
    ) then
      action_kind := 'respond';
    elsif active.destination = 'table'
      and exists (
        select 1 from public.moment_participants mine
        where mine.signal_id = active.signal_id and mine.user_id = uid
          and mine.participant_role = 'partner'
          and mine.response_action = 'talk_later'
          and mine.returned_at is null
      ) then
      action_kind := 'return_when_ready';
    elsif active.destination in ('fireplace', 'table') and exists (
      select 1 from public.moment_participants partner
      where partner.signal_id = active.signal_id
        and partner.participant_role = 'partner'
        and partner.response_action is not null
        and (
          active.destination = 'fireplace'
          or partner.response_action = 'talk_now'
          or (partner.response_action = 'talk_later' and partner.returned_at is not null)
        )
    ) and not exists (
      select 1 from public.moment_participants mine
      where mine.signal_id = active.signal_id and mine.user_id = uid
        and mine.completion_choice is not null
    ) then
      action_kind := 'choose_completion';
    elsif uid = active.author_id and active.destination in ('garden', 'rest') then
      action_kind := 'end_when_ready';
    else
      action_kind := 'wait';
    end if;
  end if;

  return jsonb_build_object(
    'identity', jsonb_build_object(
      'user_id', uid,
      'partner_id', partner_id,
      'user_name', (
        select coalesce(nullif(btrim(p.display_name), ''), 'You')
        from public.profiles p where p.id = uid
      ),
      'partner_name', (
        select coalesce(nullif(btrim(p.display_name), ''), 'your partner')
        from public.profiles p where p.id = partner_id
      )
    ),
    'active', case when active.signal_id is null then null else jsonb_build_object(
      'signal_id', active.signal_id,
      'couple_id', active.couple_id,
      'author_id', active.author_id,
      'destination', active.destination,
      'intent', active.intent,
      'phase', active.phase,
      'scheduled_for', active.scheduled_for,
      'scheduled_by_user_id', active.scheduled_by_user_id,
      'shared_started_at', active.shared_started_at,
      'shared_due_at', active.shared_due_at,
      'shared_ended_at', active.shared_ended_at,
      'created_at', active.created_at,
      'updated_at', active.updated_at
    ) end,
    'personal_action', jsonb_build_object('kind', action_kind),
    'participants', case when active.signal_id is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', mp.user_id,
        'role', mp.participant_role,
        'note', mp.note,
        'note_removed', mp.note_removed_at is not null,
        'response_action', mp.response_action,
        'responded_at', mp.responded_at,
        'completion_choice', case when mp.user_id = uid then mp.completion_choice end,
        'completion_chosen_at', case when mp.user_id = uid then mp.completion_chosen_at end,
        'returned_at', mp.returned_at
      ) order by mp.participant_role)
      from public.moment_participants mp
      where mp.signal_id = active.signal_id
    ), '[]'::jsonb) end,
    'presence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'signal_id', p.signal_id,
        'destination', case
          when s.type in ('fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic')
            then s.type
          else 'fireplace'
        end,
        'is_active_moment', p.signal_id = active.signal_id,
        'is_present', p.is_current,
        'moved_at', p.moved_at,
        'left_at', p.left_at
      ) order by p.user_id, p.moved_at desc)
      from public.signal_presence p
      join public.signals s on s.id = p.signal_id
      where s.couple_id = home.id
        and (p.is_current or p.signal_id = active.signal_id)
    ), '[]'::jsonb),
    'today_outcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'signal_id', ms.signal_id,
        'destination', ms.destination,
        'intent', ms.intent,
        'terminal_reason', ms.terminal_reason,
        'completed_at', ms.terminal_at,
        'completion_event_id', ms.completion_event_id
      ) order by ms.terminal_at desc)
      from public.moment_sessions ms
      where ms.couple_id = home.id
        and ms.terminal_at >= date_trunc('day', now())
        and ms.terminal_reason <> 'withdrawn'
    ), '[]'::jsonb),
    'completion_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'signal_id', e.signal_id,
        'destination', e.destination,
        'terminal_reason', e.terminal_reason,
        'response_action', e.response_action,
        'payoff_kind', e.payoff_kind,
        'occurred_at', e.occurred_at
      ) order by e.occurred_at)
      from public.moment_completion_events e
      where e.couple_id = home.id
        and e.occurred_at >= date_trunc('day', now())
    ), '[]'::jsonb),
    'earlier_moments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'signal_id', s.id,
        'destination', case
          when s.type in ('fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic')
            then s.type
          else 'fireplace'
        end,
        'author_id', s.from_user,
        'created_at', s.created_at,
        'state', 'earlier_unresolved'
      ) order by s.created_at desc)
      from public.signals s
      where s.couple_id = home.id
        and s.resolved_at is null
        and not exists (
          select 1 from public.moment_sessions ms where ms.signal_id = s.id
        )
    ), '[]'::jsonb)
  );
end;
$$;

-- Keep rollback clients intact by removing authoritative v2 rows from the v1
-- snapshot. They continue to see every genuine legacy signal and outcome.
create or replace function public.get_interaction_snapshot(p_couple_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.couples c
    where c.id = p_couple_id and uid in (c.member_a, c.member_b)
  ) then
    raise exception 'Home membership required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'signals', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select s.id, s.couple_id, s.from_user, s.recipient_user_id, s.type,
               s.group_id, s.created_at, s.latest_activity_at, s.resolved_at
        from public.signals s
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        where s.couple_id = p_couple_id
          and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
          and (s.resolved_at is null or fs.expires_at > now())
      ) row_data
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select g.id, g.couple_id, g.created_by, g.created_at,
               (select count(*)::integer from public.signals all_signals
                where all_signals.group_id = g.id
                  and not exists (
                    select 1 from public.moment_sessions ms
                    where ms.signal_id = all_signals.id
                  )) as signal_count
        from public.interaction_groups g
        where g.couple_id = p_couple_id
          and exists (
            select 1 from public.signals s
            left join public.fireplace_sessions fs on fs.signal_id = s.id
            where s.group_id = g.id
              and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
              and (s.resolved_at is null or fs.expires_at > now())
          )
      ) row_data
    ), '[]'::jsonb),
    'presence', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.updated_at)
      from (
        select p.signal_id, p.user_id, p.is_current, p.moved_at, p.left_at,
               p.created_at, p.updated_at
        from public.signal_presence p
        join public.signals s on s.id = p.signal_id
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        where s.couple_id = p_couple_id
          and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
          and (s.resolved_at is null or fs.expires_at > now())
      ) row_data
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select fs.signal_id, fs.pathway, fs.phase, fs.initiator_timezone,
               fs.scheduled_for, fs.scheduled_by_user_id, fs.returned_at,
               fs.outcome_key, fs.completed_at, fs.expires_at,
               fs.created_at, fs.updated_at
        from public.fireplace_sessions fs
        join public.signals s on s.id = fs.signal_id
        where s.couple_id = p_couple_id
          and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
          and (s.resolved_at is null or fs.expires_at > now())
      ) row_data
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'signal_id', fp.signal_id,
        'user_id', fp.user_id,
        'participant_role', fp.participant_role,
        'sentence', fp.sentence,
        'sentence_redacted_at', fp.sentence_redacted_at,
        'response_action', fp.response_action,
        'responded_at', fp.responded_at,
        'action_completed_at', case when fp.user_id = uid then fp.action_completed_at end,
        'readiness', case when fp.user_id = uid then fp.readiness end,
        'readiness_at', case when fp.user_id = uid then fp.readiness_at end,
        'related_prompt_signal_id', case when fp.user_id = uid then fp.related_prompt_signal_id end,
        'related_settlement_decision', case when fp.user_id = uid then fp.related_settlement_decision end
      ) order by fp.created_at)
      from public.fireplace_participants fp
      join public.signals s on s.id = fp.signal_id
      join public.fireplace_sessions fs on fs.signal_id = s.id
      where s.couple_id = p_couple_id
        and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
        and (s.resolved_at is null or fs.expires_at > now())
    ), '[]'::jsonb),
    'legacy_state', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select
          s.id as signal_id,
          s.created_at,
          (
            select substr(r.choice, length('__hearth_fireplace_need_v1__:') + 1)
            from public.responses r
            where r.signal_id = s.id and r.from_user = s.from_user
              and r.choice like '__hearth_fireplace_need_v1__:%'
            order by r.created_at desc limit 1
          ) as need,
          human.response,
          human.response_at,
          (select max(r.created_at) from public.responses r
           where r.signal_id = s.id and r.from_user = s.from_user
             and r.choice = '__hearth_signal_presence_v1__:author-return') as author_returned_at,
          (select max(r.created_at) from public.responses r
           where r.signal_id = s.id and r.from_user = s.from_user
             and r.choice = '__hearth_signal_presence_v1__:leave') as author_left_at,
          (select max(r.created_at) from public.responses r
           where r.signal_id = s.id and r.from_user <> s.from_user
             and r.choice = '__hearth_signal_presence_v1__:leave') as responder_left_at
        from public.signals s
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        left join lateral (
          select r.choice as response, r.created_at as response_at
          from public.responses r
          where r.signal_id = s.id and r.from_user <> s.from_user
            and left(r.choice, 9) <> '__hearth_'
          order by r.created_at desc limit 1
        ) human on true
        where s.couple_id = p_couple_id and s.resolved_at is null
          and fs.signal_id is null
          and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
      ) row_data
    ), '[]'::jsonb),
    'legacy_responses', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select r.id, r.signal_id, r.from_user, r.choice, r.created_at
        from public.responses r
        join public.signals s on s.id = r.signal_id
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        where s.couple_id = p_couple_id and s.resolved_at is null
          and fs.signal_id is null
          and not exists (select 1 from public.moment_sessions ms where ms.signal_id = s.id)
      ) row_data
    ), '[]'::jsonb)
  );
end;
$$;

-- -- RLS, grants, Realtime, and durable expiry ------------------------------

alter table public.moment_sessions enable row level security;
alter table public.moment_participants enable row level security;
alter table public.moment_completion_events enable row level security;

drop policy if exists moment_sessions_select on public.moment_sessions;
create policy moment_sessions_select on public.moment_sessions
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists moment_participants_select on public.moment_participants;
drop policy if exists moment_completion_events_select on public.moment_completion_events;
create policy moment_completion_events_select on public.moment_completion_events
  for select to authenticated using (public.is_couple_member(couple_id));

revoke all privileges on table public.moment_sessions from public, anon, authenticated;
revoke all privileges on table public.moment_participants from public, anon, authenticated;
revoke all privileges on table public.moment_completion_events from public, anon, authenticated;
grant select on table public.moment_sessions to authenticated;
grant select on table public.moment_completion_events to authenticated;

do $$
declare signature text;
begin
  foreach signature in array array[
    'start_moment(text,text,text,timestamptz)',
    'respond_to_moment(uuid,text,text,timestamptz)',
    'set_moment_completion_choice(uuid,text)',
    'remove_moment_note(uuid)',
    'end_moment(uuid,text)',
    'move_to_moment(uuid)',
    'leave_moment(uuid)',
    'return_to_moment(uuid)',
    'finalize_due_romantic_moment(uuid)',
    'get_moment_snapshot_v2()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', signature);
    execute format('grant execute on function public.%s to authenticated', signature);
  end loop;
end $$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'moment_response_is_valid(text,text,text)',
    'moment_response_moves_to_destination(text,text)',
    'moment_response_needs_schedule(text,text)',
    'normalize_moment_note(text)',
    'moment_payoff_kind(text)',
    'finish_moment_internal(uuid,text,boolean,text)',
    'maybe_start_romantic_shared_internal(uuid)',
    'finalize_all_due_romantic_moments()',
    'protect_v2_signal_resolution()',
    'reject_v2_legacy_response()'
  ] loop
    execute format(
      'revoke execute on function public.%s from public, anon, authenticated',
      signature
    );
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['moment_sessions', 'moment_completion_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job where jobname = 'hearth-romantic-moment-expiry-v2';
    perform cron.schedule(
      'hearth-romantic-moment-expiry-v2',
      '* * * * *',
      'select public.finalize_all_due_romantic_moments();'
    );
  end if;
exception when others then
  raise warning 'Hearth romantic v2 expiry scheduler deferred: %', sqlerrm;
end $$;

commit;
