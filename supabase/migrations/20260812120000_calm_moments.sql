-- Hearth F1 revision -- calm moments and reliable presence
--
-- Additive follow-up to 20260811183000_fireplace_stack.sql. Presence is quiet,
-- scheduled return is explicit, private readiness never changes public
-- ordering, and completion is a one-way transition.

begin;

-- Server-owned movement allowlist. The compatibility boolean accepted by
-- respond_to_interaction is deliberately ignored below.
create or replace function public.interaction_response_moves_to_location(
  p_type text,
  p_pathway text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case
    when p_pathway = 'stay_close' then p_action = 'sit_beside'
    when p_pathway = 'talk_through' then p_action = 'talk_now'
    when p_pathway = 'hear_first' then p_action = 'ready_to_listen'
    when p_pathway = 'acknowledge_hurt' then p_action = 'acknowledge'
    when p_pathway = 'apologize' then p_action = 'suggest_talking'
    when p_pathway = 'more_time' then false
    when p_type = 'fireplace' then p_action = 'Sit beside them'
    when p_type = 'sofa' then p_action = 'Sit with them'
    when p_type = 'table' then p_action = 'I''m ready'
    when p_type = 'romantic' then p_action = 'Come close'
    else false
  end;
$$;

-- A presence write is emitted only when the caller actually changes location.
-- This helper never touches signal/session activity or another person's rows.
create or replace function public.move_interaction_presence_internal(
  p_user_id uuid,
  p_couple_id uuid,
  p_signal_id uuid
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if exists (
    select 1
    from public.signal_presence p
    where p.signal_id = p_signal_id
      and p.user_id = p_user_id
      and p.is_current
  ) then
    return;
  end if;

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
      updated_at = excluded.updated_at
  where not public.signal_presence.is_current;
end;
$$;

-- Guard the durable state machine even if a future SECURITY DEFINER function
-- regresses. Completed/closed sessions and recorded returns cannot move back.
create or replace function public.enforce_fireplace_session_progress()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if old.phase in ('completed', 'closed') and new.phase is distinct from old.phase then
    raise exception 'Finished fireplace sessions cannot change phase';
  end if;

  if new.phase is distinct from old.phase and not (
    (old.phase = 'waiting' and new.phase in ('responded', 'closed'))
    or (old.phase = 'responded' and new.phase in ('continue', 'closed'))
    or (old.phase = 'continue' and new.phase in ('completed', 'closed'))
  ) then
    raise exception 'Fireplace phase cannot move backwards';
  end if;

  if old.returned_at is not null and new.returned_at is distinct from old.returned_at then
    raise exception 'A scheduled return can only be recorded once';
  end if;
  if old.completed_at is not null and new.completed_at is distinct from old.completed_at then
    raise exception 'Completion time is immutable';
  end if;
  if old.expires_at is not null and new.expires_at is distinct from old.expires_at then
    raise exception 'Completion expiry is immutable';
  end if;
  if old.outcome_key is not null and new.outcome_key is distinct from old.outcome_key then
    raise exception 'Completion outcome is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_fireplace_session_progress_before_update
  on public.fireplace_sessions;
create trigger enforce_fireplace_session_progress_before_update
  before update on public.fireplace_sessions
  for each row execute function public.enforce_fireplace_session_progress();

-- The snapshot retains the legacy response rows for rollback-client
-- compatibility, but current clients consume legacy_state and never parse an
-- internal marker as presentation copy.
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
    'legacy_state', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at)
      from (
        select
          s.id as signal_id,
          s.created_at,
          (
            select substr(r.choice, length('__hearth_fireplace_need_v1__:') + 1)
            from public.responses r
            where r.signal_id = s.id
              and r.from_user = s.from_user
              and r.choice like '__hearth_fireplace_need_v1__:%'
            order by r.created_at desc
            limit 1
          ) as need,
          human.response,
          human.response_at,
          (
            select max(r.created_at) from public.responses r
            where r.signal_id = s.id and r.from_user = s.from_user
              and r.choice = '__hearth_signal_presence_v1__:author-return'
          ) as author_returned_at,
          (
            select max(r.created_at) from public.responses r
            where r.signal_id = s.id and r.from_user = s.from_user
              and r.choice = '__hearth_signal_presence_v1__:leave'
          ) as author_left_at,
          (
            select max(r.created_at) from public.responses r
            where r.signal_id = s.id and r.from_user <> s.from_user
              and r.choice = '__hearth_signal_presence_v1__:leave'
          ) as responder_left_at
        from public.signals s
        left join public.fireplace_sessions fs on fs.signal_id = s.id
        left join lateral (
          select r.choice as response, r.created_at as response_at
          from public.responses r
          where r.signal_id = s.id
            and r.from_user <> s.from_user
            and left(r.choice, 9) <> '__hearth_'
          order by r.created_at desc
          limit 1
        ) human on true
        where s.couple_id = p_couple_id
          and s.resolved_at is null
          and fs.signal_id is null
      ) row_data
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
end;
$$;

create or replace function public.return_to_fireplace(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.signals;
  session_row public.fireplace_sessions;
  returned_moment timestamptz := now();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null or target.type <> 'fireplace' then
    raise exception 'Open fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.signal_id is null
     or session_row.scheduled_by_user_id is distinct from uid then
    raise exception 'Only the person who chose the return may record it' using errcode = '42501';
  end if;
  if session_row.returned_at is not null then
    return false;
  end if;
  if session_row.phase not in ('waiting', 'responded', 'continue') then
    raise exception 'This fireplace return is no longer open';
  end if;

  update public.fireplace_sessions
  set returned_at = returned_moment, updated_at = returned_moment
  where signal_id = target.id and returned_at is null;
  perform public.move_interaction_presence_internal(uid, target.couple_id, target.id);
  update public.signals set latest_activity_at = returned_moment where id = target.id;
  return true;
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
  should_move boolean := false;
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
  where s.id = p_signal_id and s.resolved_at is null
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
        updated_at = now()
    where signal_id = target.id;
  end if;

  should_move := public.interaction_response_moves_to_location(
    target.type::text, session_row.pathway, p_action
  );
  if should_move then
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
  where s.id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.phase = 'completed' then
    return;
  end if;
  if target.resolved_at is not null
     or session_row.signal_id is null
     or session_row.phase not in ('responded', 'continue') then
    raise exception 'The pathway action must happen before continuing';
  end if;
  if session_row.scheduled_by_user_id = uid and session_row.returned_at is null then
    raise exception 'Return to this moment before continuing';
  end if;

  update public.fireplace_participants
  set action_completed_at = now(), updated_at = now()
  where signal_id = target.id and user_id = uid and action_completed_at is null;
  if not exists (
    select 1 from public.fireplace_participants
    where signal_id = target.id and user_id = uid and action_completed_at is not null
  ) then
    raise exception 'Fireplace participant not found' using errcode = '42501';
  end if;
  update public.fireplace_sessions set phase = 'continue', updated_at = now()
  where signal_id = target.id and phase = 'responded';
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
  where s.id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null then
    raise exception 'Fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.phase = 'completed' then
    return true;
  end if;
  if target.resolved_at is not null
     or session_row.signal_id is null
     or session_row.phase <> 'continue' then
    raise exception 'Continue before choosing readiness';
  end if;

  update public.fireplace_participants
  set readiness = p_readiness, readiness_at = now(), updated_at = now()
  where signal_id = target.id and user_id = uid
    and action_completed_at is not null
    and readiness is distinct from p_readiness;
  if not exists (
    select 1 from public.fireplace_participants
    where signal_id = target.id and user_id = uid and action_completed_at is not null
  ) then
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
        expires_at = public.next_midnight_in_timezone(completed_moment, initiator_timezone),
        scheduled_for = null,
        updated_at = completed_moment
    where signal_id = target.id and phase = 'continue';
    update public.signals
    set resolved_at = completed_moment, latest_activity_at = completed_moment
    where id = target.id and resolved_at is null;
    update public.signal_presence
    set is_current = false, left_at = completed_moment, updated_at = completed_moment
    where signal_id = target.id and is_current;
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
  session_row public.fireplace_sessions;
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
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.scheduled_by_user_id is distinct from uid then
    raise exception 'Only the person who selected the return time may reschedule it' using errcode = '42501';
  end if;
  if session_row.returned_at is not null then
    raise exception 'A completed return cannot be rescheduled';
  end if;
  if session_row.phase not in ('waiting', 'responded', 'continue') then
    raise exception 'This return is no longer open';
  end if;
  if session_row.scheduled_for is not distinct from p_return_at then
    return;
  end if;

  update public.fireplace_sessions
  set scheduled_for = p_return_at, updated_at = now()
  where signal_id = target.id and returned_at is null;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

create or replace function public.set_fireplace_sentence(
  p_signal_id uuid,
  p_sentence text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  clean_sentence text := nullif(btrim(p_sentence), '');
  target public.signals;
  session_row public.fireplace_sessions;
  participant_row public.fireplace_participants;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if clean_sentence is not null and char_length(clean_sentence) > 240 then
    raise exception 'A sentence may contain at most 240 characters';
  end if;
  select s.* into target
  from public.signals s
  join public.couples c on c.id = s.couple_id
  where s.id = p_signal_id and s.resolved_at is null
    and uid in (c.member_a, c.member_b)
  for update of s;
  if target.id is null or target.type <> 'fireplace' then
    raise exception 'Open fireplace interaction not found' using errcode = '42501';
  end if;
  select * into session_row from public.fireplace_sessions
  where signal_id = target.id for update;
  if session_row.phase not in ('waiting', 'responded', 'continue') then
    raise exception 'Sentences can only change while a moment is open';
  end if;
  select * into participant_row from public.fireplace_participants
  where signal_id = target.id and user_id = uid for update;
  if participant_row.signal_id is null
     or (participant_row.participant_role = 'partner' and participant_row.response_action is null) then
    raise exception 'Add a sentence only after sending or responding' using errcode = '42501';
  end if;
  if participant_row.sentence is not distinct from clean_sentence then
    return;
  end if;

  update public.fireplace_participants
  set sentence = clean_sentence,
      sentence_redacted_at = case when clean_sentence is null then now() else null end,
      updated_at = now()
  where signal_id = target.id and user_id = uid;
  update public.signals set latest_activity_at = now() where id = target.id;
end;
$$;

-- Keep the old removal RPC safe for installed rollback clients.
create or replace function public.redact_fireplace_sentence(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  perform public.set_fireplace_sentence(p_signal_id, null);
end;
$$;

revoke execute on function public.interaction_response_moves_to_location(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.enforce_fireplace_session_progress()
  from public, anon, authenticated;
revoke execute on function public.return_to_fireplace(uuid) from public, anon;
revoke execute on function public.set_fireplace_sentence(uuid, text) from public, anon;
grant execute on function public.return_to_fireplace(uuid) to authenticated;
grant execute on function public.set_fireplace_sentence(uuid, text) to authenticated;

commit;
