-- Hearth F1 — stackable fireplace pathways
--
-- Additive production migration. Run after schema.sql, hardening.sql, and
-- notifications.sql. Existing signals remain readable; every legacy signal is
-- placed in its own group and its encoded response history is left untouched.
-- New client mutations use only the SECURITY DEFINER RPCs below.

begin;

-- ── Interaction roots and structured state ─────────────────────────────────

create table if not exists public.interaction_groups (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (id, couple_id)
);

alter table public.signals add column if not exists group_id uuid;
alter table public.signals
  add column if not exists latest_activity_at timestamptz not null default now();

-- A legacy signal becomes a one-signal group. Reusing the signal UUID makes the
-- backfill deterministic and safe to rerun.
insert into public.interaction_groups (id, couple_id, created_by, created_at)
select s.id, s.couple_id, s.from_user, s.created_at
from public.signals s
where s.group_id is null
on conflict (id) do nothing;

update public.signals set group_id = id where group_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'signals_group_couple_fkey'
      and conrelid = 'public.signals'::regclass
  ) then
    alter table public.signals
      add constraint signals_group_couple_fkey
      foreign key (group_id, couple_id)
      references public.interaction_groups (id, couple_id)
      on delete cascade;
  end if;
end $$;

alter table public.signals alter column group_id set not null;

create index if not exists interaction_groups_couple_created_idx
  on public.interaction_groups (couple_id, created_at desc);
create index if not exists signals_stack_idx
  on public.signals (couple_id, resolved_at, latest_activity_at desc);
create index if not exists signals_group_idx
  on public.signals (group_id, created_at);

create table if not exists public.signal_presence (
  signal_id    uuid not null references public.signals (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  is_current   boolean not null default false,
  moved_at     timestamptz,
  left_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (signal_id, user_id)
);

-- This is the database-level guarantee that an avatar has one physical
-- location, even when two phones race to move it.
create unique index if not exists signal_presence_one_current_per_user_idx
  on public.signal_presence (user_id)
  where is_current;
create index if not exists signal_presence_signal_idx
  on public.signal_presence (signal_id, user_id);

create table if not exists public.fireplace_sessions (
  signal_id             uuid primary key references public.signals (id) on delete cascade,
  pathway               text not null check (pathway in (
    'stay_close', 'talk_through', 'hear_first',
    'acknowledge_hurt', 'apologize', 'more_time'
  )),
  phase                 text not null default 'waiting' check (phase in (
    'waiting', 'responded', 'continue', 'completed', 'closed'
  )),
  initiator_timezone    text not null,
  scheduled_for         timestamptz,
  scheduled_by_user_id  uuid references public.profiles (id) on delete set null,
  returned_at           timestamptz,
  outcome_key           text check (outcome_key is null or outcome_key in (
    'stay_close', 'talk_through', 'hear_first',
    'acknowledge_hurt', 'apologize', 'more_time'
  )),
  completed_at          timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (
    (phase = 'completed' and completed_at is not null and expires_at is not null)
    or phase <> 'completed'
  )
);

create index if not exists fireplace_sessions_expiry_idx
  on public.fireplace_sessions (expires_at)
  where expires_at is not null;
create index if not exists fireplace_sessions_schedule_idx
  on public.fireplace_sessions (scheduled_for)
  where scheduled_for is not null and completed_at is null;

create table if not exists public.fireplace_participants (
  signal_id                   uuid not null references public.fireplace_sessions (signal_id) on delete cascade,
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  participant_role            text not null check (participant_role in ('author', 'partner')),
  sentence                    text check (sentence is null or char_length(sentence) <= 240),
  sentence_redacted_at        timestamptz,
  response_action             text,
  responded_at                timestamptz,
  action_completed_at         timestamptz,
  readiness                   text check (readiness is null or readiness in (
    'reconnected', 'talk_first', 'more_time'
  )),
  readiness_at                timestamptz,
  related_prompt_signal_id    uuid references public.signals (id) on delete set null,
  related_settlement_decision text check (related_settlement_decision is null or related_settlement_decision in (
    'closed', 'keep_open'
  )),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  primary key (signal_id, user_id),
  unique (signal_id, participant_role)
);

-- Create the required two presence rows for pre-migration signals without
-- guessing current location from the legacy event encoding. The client keeps
-- decoding that legacy history until a structured move is made.
insert into public.signal_presence (signal_id, user_id)
select s.id, c.member_a
from public.signals s
join public.couples c on c.id = s.couple_id
on conflict (signal_id, user_id) do nothing;

insert into public.signal_presence (signal_id, user_id)
select s.id, c.member_b
from public.signals s
join public.couples c on c.id = s.couple_id
where c.member_b is not null
on conflict (signal_id, user_id) do nothing;

-- ── Private helpers ─────────────────────────────────────────────────────────

create or replace function public.fireplace_response_is_valid(
  p_pathway text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case p_pathway
    when 'stay_close' then p_action in ('sit_beside', 'send_reassurance', 'request_time')
    when 'talk_through' then p_action in (
      'talk_now', 'one_hour', 'tonight', 'tomorrow', 'request_more_time'
    )
    when 'hear_first' then p_action = 'ready_to_listen'
    when 'acknowledge_hurt' then p_action in (
      'acknowledge', 'understand_first', 'request_time'
    )
    when 'apologize' then p_action in ('read', 'appreciate_need_time', 'suggest_talking')
    when 'more_time' then p_action = 'acknowledge'
    else false
  end;
$$;

create or replace function public.next_midnight_in_timezone(
  p_moment timestamptz,
  p_timezone text
)
returns timestamptz language plpgsql stable
set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid timezone';
  end if;
  return (date_trunc('day', timezone(p_timezone, p_moment)) + interval '1 day')
    at time zone p_timezone;
end;
$$;

create or replace function public.move_interaction_presence_internal(
  p_user_id uuid,
  p_couple_id uuid,
  p_signal_id uuid
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.signal_presence p
  set is_current = false,
      left_at = now(),
      updated_at = now()
  from public.signals s
  where p.signal_id = s.id
    and p.user_id = p_user_id
    and s.couple_id = p_couple_id
    and p.is_current
    and p.signal_id <> p_signal_id;

  insert into public.signal_presence (
    signal_id, user_id, is_current, moved_at, left_at, updated_at
  ) values (
    p_signal_id, p_user_id, true, now(), null, now()
  )
  on conflict (signal_id, user_id) do update
  set is_current = true,
      moved_at = excluded.moved_at,
      left_at = null,
      updated_at = excluded.updated_at;
end;
$$;

-- ── Snapshot read ───────────────────────────────────────────────────────────

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
          and (s.resolved_at is null or fs.expires_at > now())
      ) row_data
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select g.id, g.couple_id, g.created_by, g.created_at,
               (select count(*)::integer from public.signals all_signals
                where all_signals.group_id = g.id) as signal_count
        from public.interaction_groups g
        where g.couple_id = p_couple_id
          and exists (
            select 1
            from public.signals s
            left join public.fireplace_sessions fs on fs.signal_id = s.id
            where s.group_id = g.id
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
          and (s.resolved_at is null or fs.expires_at > now())
      ) row_data
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'signal_id', fp.signal_id,
          'user_id', fp.user_id,
          'participant_role', fp.participant_role,
          'sentence', fp.sentence,
          'sentence_redacted_at', fp.sentence_redacted_at,
          'response_action', fp.response_action,
          'responded_at', fp.responded_at,
          -- Continue/readiness are private. A partner sees only neutral session
          -- state and never learns who has not answered.
          'action_completed_at', case when fp.user_id = uid then fp.action_completed_at end,
          'readiness', case when fp.user_id = uid then fp.readiness end,
          'readiness_at', case when fp.user_id = uid then fp.readiness_at end,
          'related_prompt_signal_id', case when fp.user_id = uid then fp.related_prompt_signal_id end,
          'related_settlement_decision', case when fp.user_id = uid then fp.related_settlement_decision end
        ) order by fp.created_at
      )
      from public.fireplace_participants fp
      join public.signals s on s.id = fp.signal_id
      join public.fireplace_sessions fs on fs.signal_id = s.id
      where s.couple_id = p_couple_id
        and (s.resolved_at is null or fs.expires_at > now())
    ), '[]'::jsonb),
    'legacy_responses', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select r.id, r.signal_id, r.from_user, r.choice, r.created_at
        from public.responses r
        join public.signals s on s.id = r.signal_id
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        where s.couple_id = p_couple_id
          and s.resolved_at is null
          and fs.signal_id is null
      ) row_data
    ), '[]'::jsonb)
  );
end;
$$;

-- ── RPC-only mutations ──────────────────────────────────────────────────────

drop function if exists public.start_interaction(text, text, text, text, timestamptz, uuid);
create function public.start_interaction(
  p_type text,
  p_pathway text default null,
  p_timezone text default 'UTC',
  p_sentence text default null,
  p_return_at timestamptz default null,
  p_connect_to_signal_id uuid default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  target public.signals;
  new_group_id uuid;
  new_signal_id uuid;
  clean_sentence text := nullif(btrim(p_sentence), '');
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_type not in ('fireplace','sofa','table','garden','rest','romantic') then
    raise exception 'Invalid interaction type';
  end if;
  if clean_sentence is not null and char_length(clean_sentence) > 240 then
    raise exception 'A sentence may contain at most 240 characters';
  end if;
  if p_type = 'fireplace' and p_pathway not in (
    'stay_close', 'talk_through', 'hear_first',
    'acknowledge_hurt', 'apologize', 'more_time'
  ) then
    raise exception 'A fireplace pathway is required';
  end if;
  if p_type <> 'fireplace' and (p_pathway is not null or clean_sentence is not null) then
    raise exception 'Pathway details belong to fireplace interactions';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid timezone';
  end if;
  if p_return_at is not null and (p_return_at <= now() or p_return_at > now() + interval '30 days') then
    raise exception 'Return time must be within the next 30 days';
  end if;
  if p_type = 'fireplace' and p_pathway = 'more_time' and p_return_at is null then
    -- NULL represents "signal when ready" and is therefore valid.
    null;
  elsif p_type <> 'fireplace' and p_return_at is not null then
    raise exception 'Return timing belongs to a fireplace pathway';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into home from public.couples c
  where uid in (c.member_a, c.member_b)
  for update;
  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;

  if p_connect_to_signal_id is null then
    insert into public.interaction_groups (couple_id, created_by)
    values (home.id, uid)
    returning id into new_group_id;
  else
    select * into target from public.signals s
    where s.id = p_connect_to_signal_id
      and s.couple_id = home.id
      and s.resolved_at is null
    for share;
    if target.id is null then
      raise exception 'Only an open moment in this home can be connected';
    end if;
    new_group_id := target.group_id;
  end if;

  insert into public.signals (
    couple_id, from_user, type, group_id, latest_activity_at
  ) values (
    home.id, uid, p_type, new_group_id, now()
  ) returning id into new_signal_id;

  insert into public.signal_presence (signal_id, user_id, is_current)
  values
    (new_signal_id, home.member_a, false),
    (new_signal_id, home.member_b, false)
  on conflict (signal_id, user_id) do nothing;

  perform public.move_interaction_presence_internal(uid, home.id, new_signal_id);

  if p_type = 'fireplace' then
    insert into public.fireplace_sessions (
      signal_id, pathway, initiator_timezone, scheduled_for,
      scheduled_by_user_id
    ) values (
      new_signal_id, p_pathway, p_timezone, p_return_at,
      case when p_return_at is not null or p_pathway = 'more_time' then uid end
    );
    insert into public.fireplace_participants (
      signal_id, user_id, participant_role, sentence
    ) values
      (new_signal_id, uid, 'author', clean_sentence),
      (
        new_signal_id,
        case when uid = home.member_a then home.member_b else home.member_a end,
        'partner',
        null
      );
  end if;

  return new_signal_id;
end;
$$;

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
  for update of s;
  if target.id is null then
    raise exception 'Open interaction not found' using errcode = '42501';
  end if;

  perform public.move_interaction_presence_internal(uid, target.couple_id, target.id);
  update public.signals set latest_activity_at = now() where id = target.id;
  update public.fireplace_sessions
  set returned_at = case when scheduled_by_user_id = uid then now() else returned_at end,
      updated_at = now()
  where signal_id = target.id;
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
  where s.id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Interaction not found' using errcode = '42501';
  end if;

  update public.signal_presence
  set is_current = false, left_at = now(), updated_at = now()
  where signal_id = target.id and user_id = uid and is_current;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

create or replace function public.respond_to_interaction(
  p_signal_id uuid,
  p_action text,
  p_sentence text default null,
  p_return_at timestamptz default null,
  p_move_to_interaction boolean default false
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
  session_row public.fireplace_sessions;
  clean_sentence text := nullif(btrim(p_sentence), '');
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_action is null or char_length(p_action) > 64 then
    raise exception 'Invalid response';
  end if;
  if clean_sentence is not null and char_length(clean_sentence) > 240 then
    raise exception 'A sentence may contain at most 240 characters';
  end if;
  if p_return_at is not null and (p_return_at <= now() or p_return_at > now() + interval '30 days') then
    raise exception 'Return time must be within the next 30 days';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id
    and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null or target.from_user = uid then
    raise exception 'Only the receiving partner may respond' using errcode = '42501';
  end if;

  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;

  if session_row.signal_id is null then
    if clean_sentence is not null or p_return_at is not null then
      raise exception 'Legacy responses do not accept structured details';
    end if;
    insert into public.responses (signal_id, from_user, choice)
    values (target.id, uid, p_action);
  else
    if session_row.phase not in ('waiting', 'responded') then
      raise exception 'This fireplace action is out of order';
    end if;
    if not public.fireplace_response_is_valid(session_row.pathway, p_action) then
      raise exception 'Response is not valid for this pathway';
    end if;
    if exists (
      select 1 from public.fireplace_participants
      where signal_id = target.id and participant_role = 'partner'
        and response_action is not null
    ) then
      raise exception 'This moment already has a response';
    end if;
    if p_action in ('one_hour', 'tonight', 'tomorrow', 'request_time', 'request_more_time')
       and p_return_at is null then
      raise exception 'This response needs a return time';
    end if;
    if p_action not in ('one_hour', 'tonight', 'tomorrow', 'request_time', 'request_more_time')
       and p_return_at is not null then
      raise exception 'This response does not use a return time';
    end if;

    update public.fireplace_participants
    set response_action = p_action,
        sentence = clean_sentence,
        sentence_redacted_at = null,
        responded_at = now(),
        updated_at = now()
    where signal_id = target.id and user_id = uid and participant_role = 'partner';
    if not found then
      raise exception 'Fireplace participant not found' using errcode = '42501';
    end if;

    update public.fireplace_sessions
    set phase = 'responded',
        scheduled_for = coalesce(p_return_at, scheduled_for),
        scheduled_by_user_id = case when p_return_at is not null then uid else scheduled_by_user_id end,
        returned_at = case when p_return_at is not null then null else returned_at end,
        updated_at = now()
    where signal_id = target.id;
  end if;

  if p_move_to_interaction then
    perform public.move_interaction_presence_internal(uid, target.couple_id, target.id);
  end if;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

create or replace function public.complete_fireplace_action(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
  session_row public.fireplace_sessions;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Open fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.signal_id is null or session_row.phase not in ('responded', 'continue') then
    raise exception 'The pathway action must happen before continuing';
  end if;
  if session_row.scheduled_by_user_id = uid and session_row.returned_at is null then
    raise exception 'Return to this moment before continuing';
  end if;

  update public.fireplace_participants
  set action_completed_at = coalesce(action_completed_at, now()), updated_at = now()
  where signal_id = target.id and user_id = uid;
  if not found then
    raise exception 'Fireplace participant not found' using errcode = '42501';
  end if;
  update public.fireplace_sessions set phase = 'continue', updated_at = now()
  where signal_id = target.id;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

create or replace function public.set_fireplace_readiness(
  p_signal_id uuid,
  p_readiness text
)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
  session_row public.fireplace_sessions;
  all_reconnected boolean;
  completed_moment timestamptz := now();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_readiness not in ('reconnected', 'talk_first', 'more_time') then
    raise exception 'Invalid readiness choice';
  end if;

  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Open fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.signal_id is null or session_row.phase <> 'continue' then
    raise exception 'Continue before choosing readiness';
  end if;

  update public.fireplace_participants
  set readiness = p_readiness, readiness_at = now(), updated_at = now()
  where signal_id = target.id and user_id = uid and action_completed_at is not null;
  if not found then
    raise exception 'Continue before choosing readiness';
  end if;

  select count(*) = 2 into all_reconnected
  from public.fireplace_participants
  where signal_id = target.id and readiness = 'reconnected';

  if all_reconnected then
    update public.fireplace_sessions
    set phase = 'completed',
        outcome_key = pathway,
        completed_at = completed_moment,
        expires_at = public.next_midnight_in_timezone(
          completed_moment,
          initiator_timezone
        ),
        scheduled_for = null,
        returned_at = coalesce(returned_at, completed_moment),
        updated_at = completed_moment
    where signal_id = target.id;
    update public.signals set resolved_at = completed_moment,
      latest_activity_at = completed_moment where id = target.id;
    update public.signal_presence
    set is_current = false, left_at = completed_moment, updated_at = completed_moment
    where signal_id = target.id and is_current;
  else
    update public.fireplace_sessions set updated_at = now() where signal_id = target.id;
    update public.signals set latest_activity_at = now() where id = target.id;
  end if;
  return all_reconnected;
end;
$$;

create or replace function public.reschedule_fireplace_return(
  p_signal_id uuid,
  p_return_at timestamptz
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
  changed integer;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_return_at is null or p_return_at <= now() or p_return_at > now() + interval '30 days' then
    raise exception 'Return time must be within the next 30 days';
  end if;
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Open fireplace interaction not found' using errcode = '42501';
  end if;
  update public.fireplace_sessions
  set scheduled_for = p_return_at,
      scheduled_by_user_id = uid,
      returned_at = null,
      updated_at = now()
  where signal_id = target.id and phase in ('waiting', 'responded', 'continue')
    and (scheduled_by_user_id is null or scheduled_by_user_id = uid);
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Only the person who selected the return time may reschedule it' using errcode = '42501';
  end if;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

create or replace function public.redact_fireplace_sentence(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  changed integer;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.fireplace_participants fp
  set sentence = null, sentence_redacted_at = now(), updated_at = now()
  from public.signals s, public.couples c
  where fp.signal_id = p_signal_id
    and fp.user_id = uid
    and s.id = fp.signal_id
    and c.id = s.couple_id
    and uid in (c.member_a, c.member_b);
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Sentence not found' using errcode = '42501';
  end if;
  update public.fireplace_sessions set updated_at = now() where signal_id = p_signal_id;
end;
$$;

create or replace function public.close_authored_interaction(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select s.* into target from public.signals s
  where s.id = p_signal_id and s.from_user = uid and s.resolved_at is null
  for update;
  if target.id is null or not public.is_couple_member(target.couple_id) then
    raise exception 'Only the author may close this open interaction' using errcode = '42501';
  end if;
  update public.fireplace_sessions set phase = 'closed', scheduled_for = null,
    updated_at = now() where signal_id = target.id;
  update public.signals set resolved_at = now(), latest_activity_at = now()
  where id = target.id;
  update public.signal_presence set is_current = false, left_at = now(), updated_at = now()
  where signal_id = target.id and is_current;
end;
$$;

create or replace function public.answer_related_settlement(
  p_signal_id uuid,
  p_completed_signal_id uuid,
  p_settled boolean
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select s.* into target from public.signals s
  where s.id = p_signal_id and s.from_user = uid and s.resolved_at is null
  for update;
  if target.id is null or not exists (
    select 1
    from public.signals completed_signal
    join public.fireplace_sessions completed_session
      on completed_session.signal_id = completed_signal.id
    where completed_signal.id = p_completed_signal_id
      and completed_signal.group_id = target.group_id
      and completed_signal.id <> target.id
      and completed_session.phase = 'completed'
      and completed_session.expires_at > now()
  ) then
    raise exception 'Related completed moment not found' using errcode = '42501';
  end if;

  update public.fireplace_participants
  set related_prompt_signal_id = p_completed_signal_id,
      related_settlement_decision = case when p_settled then 'closed' else 'keep_open' end,
      updated_at = now()
  where signal_id = target.id and user_id = uid;
  update public.fireplace_sessions set updated_at = now() where signal_id = target.id;

  if p_settled then
    update public.fireplace_sessions set phase = 'closed', scheduled_for = null,
      updated_at = now() where signal_id = target.id;
    update public.signals set resolved_at = now(), latest_activity_at = now()
    where id = target.id;
    update public.signal_presence set is_current = false, left_at = now(), updated_at = now()
    where signal_id = target.id and is_current;
  end if;
end;
$$;

create or replace function public.purge_expired_fireplace_content()
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.fireplace_participants fp
  set sentence = null,
      sentence_redacted_at = coalesce(sentence_redacted_at, now()),
      updated_at = now()
  from public.fireplace_sessions fs
  where fs.signal_id = fp.signal_id
    and fs.expires_at <= now()
    and fp.sentence is not null;

  -- Touch each session once at expiry so subscribed clients refresh even when
  -- neither optional sentence needs redaction. The snapshot then omits the
  -- expired outcome immediately, without requiring an app reopen.
  update public.fireplace_sessions
  set updated_at = now()
  where expires_at <= now()
    and updated_at < expires_at;
end;
$$;

-- Existing leave_couple()/prepare_sign_out() implementations already delete
-- signals transactionally. A membership change also removes the now-empty
-- group roots so a future partner cannot inherit relationship metadata.
create or replace function public.purge_interaction_groups_on_membership_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if old.member_a is distinct from new.member_a
     or old.member_b is distinct from new.member_b then
    delete from public.interaction_groups where couple_id = old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists purge_interaction_groups_before_membership_change on public.couples;
create trigger purge_interaction_groups_before_membership_change
  before update of member_a, member_b on public.couples
  for each row execute function public.purge_interaction_groups_on_membership_change();

-- ── RLS, privileges, Realtime, and expiry cleanup ───────────────────────────

alter table public.interaction_groups enable row level security;
alter table public.signal_presence enable row level security;
alter table public.fireplace_sessions enable row level security;
alter table public.fireplace_participants enable row level security;

drop policy if exists interaction_groups_select on public.interaction_groups;
create policy interaction_groups_select on public.interaction_groups
  for select to authenticated using (public.is_couple_member(couple_id));

drop policy if exists signal_presence_select on public.signal_presence;
create policy signal_presence_select on public.signal_presence
  for select to authenticated using (
    exists (
      select 1 from public.signals s
      where s.id = signal_presence.signal_id
        and public.is_couple_member(s.couple_id)
    )
  );

drop policy if exists fireplace_sessions_select on public.fireplace_sessions;
create policy fireplace_sessions_select on public.fireplace_sessions
  for select to authenticated using (
    exists (
      select 1 from public.signals s
      where s.id = fireplace_sessions.signal_id
        and public.is_couple_member(s.couple_id)
    )
  );

-- fireplace_participants intentionally has no SELECT policy or table grant.
-- Its readiness fields are only projected by get_interaction_snapshot().
drop policy if exists fireplace_participants_select on public.fireplace_participants;

-- Remove direct write paths, including the legacy signal/response mutations.
drop policy if exists signals_insert on public.signals;
drop policy if exists signals_update on public.signals;
drop policy if exists responses_insert on public.responses;

revoke all privileges on table public.interaction_groups from public, anon, authenticated;
revoke all privileges on table public.signal_presence from public, anon, authenticated;
revoke all privileges on table public.fireplace_sessions from public, anon, authenticated;
revoke all privileges on table public.fireplace_participants from public, anon, authenticated;
revoke insert, update, delete on table public.signals from public, anon, authenticated;
revoke insert, update, delete on table public.responses from public, anon, authenticated;

grant select on table public.interaction_groups to authenticated;
grant select on table public.signal_presence to authenticated;
grant select on table public.fireplace_sessions to authenticated;
grant select on table public.signals to authenticated;
grant select on table public.responses to authenticated;

revoke execute on function public.fireplace_response_is_valid(text, text)
  from public, anon, authenticated;
revoke execute on function public.next_midnight_in_timezone(timestamptz, text)
  from public, anon, authenticated;
revoke execute on function public.move_interaction_presence_internal(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.purge_expired_fireplace_content()
  from public, anon, authenticated;
revoke execute on function public.purge_interaction_groups_on_membership_change()
  from public, anon, authenticated;

do $$
declare signature text;
begin
  foreach signature in array array[
    'get_interaction_snapshot(uuid)',
    'start_interaction(text,text,text,text,timestamptz,uuid)',
    'move_to_interaction(uuid)',
    'leave_interaction(uuid)',
    'respond_to_interaction(uuid,text,text,timestamptz,boolean)',
    'complete_fireplace_action(uuid)',
    'set_fireplace_readiness(uuid,text)',
    'reschedule_fireplace_return(uuid,timestamptz)',
    'redact_fireplace_sentence(uuid)',
    'close_authored_interaction(uuid)',
    'answer_related_settlement(uuid,uuid,boolean)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', signature);
    execute format('grant execute on function public.%s to authenticated', signature);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'interaction_groups', 'signal_presence', 'fireplace_sessions',
    'fireplace_participants'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end $$;

-- Supabase projects used by Hearth already have pg_cron for the durable push
-- outbox. The minute job deletes optional text as soon as its outcome expires.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job where jobname = 'hearth-fireplace-expiry';
    perform cron.schedule(
      'hearth-fireplace-expiry',
      '* * * * *',
      'select public.purge_expired_fireplace_content();'
    );
  end if;
exception when others then
  raise warning 'Hearth fireplace expiry scheduler deferred: %', sqlerrm;
end $$;

commit;
