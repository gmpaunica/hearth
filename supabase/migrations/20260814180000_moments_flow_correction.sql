-- Hearth Moments flow correction -- timeless, dead-end-free state machine
--
-- This is additive and wire-compatible with the 1.0.3 Moments migrations.
-- Legacy schedule parameters/columns remain present but are always cleared.

begin;

alter table public.moment_participants
  add column if not exists readiness boolean not null default false,
  add column if not exists readiness_updated_at timestamptz;

-- Every positive terminal event has one durable, destination-independent heart.
alter table public.moment_completion_events
  drop constraint if exists moment_completion_events_payoff_kind_check;
alter table public.moment_completion_events
  add constraint moment_completion_events_payoff_kind_check
  check (payoff_kind in ('heart', 'mutual_heart', 'destination'));

create or replace function public.moment_payoff_kind(p_destination text)
returns text language sql immutable
set search_path = pg_catalog, public as $$
  select 'heart'::text;
$$;

create or replace function public.canonical_moment_action(
  p_destination text,
  p_intent text,
  p_action text
)
returns text language sql immutable
set search_path = pg_catalog, public as $$
  select case p_destination
    when 'fireplace' then case
      when p_action in ('not_now', 'need_more_time', 'care_need_time', 'talk_later',
                        'appreciate_need_time', 'respect_more_time',
                        'offer_reassurance', 'understand_first') then 'not_now'
      when p_action in ('come_sit', 'join_by_fire') then 'come_sit'
      when p_action in ('talk_by_fire', 'talk_now_by_fire') then 'talk_by_fire'
      when p_action = 'listen_by_fire' then 'listen_by_fire'
      when p_action in ('hear_them_out', 'acknowledge_by_fire', 'receive_apology')
        then 'hear_them_out'
      else p_action
    end
    when 'garden' then case
      when p_action in ('give_quiet', 'respect_space') then 'give_quiet'
      when p_action in ('leave_rose', 'reassure_from_home', 'leave_door_open') then 'leave_rose'
      else p_action
    end
    when 'sofa' then case
      when p_action in ('sit_with_them', 'sit_together') then 'sit_with_them'
      when p_action = 'send_hug' then 'send_hug'
      when p_action in ('bring_tea', 'offer_practical_help', 'care_need_time') then 'bring_tea'
      else p_action
    end
    when 'table' then case
      when p_action = 'talk_now' then 'talk_now'
      when p_action in ('not_now', 'need_more_time', 'talk_later') then 'not_now'
      else p_action
    end
    when 'rest' then case
      when p_action in ('quiet_room', 'remove_pressure') then 'quiet_room'
      when p_action in ('leave_blanket', 'offer_practical_help') then 'leave_blanket'
      when p_action in ('tiny_drawing', 'encourage', 'send_affection') then 'tiny_drawing'
      else p_action
    end
    when 'romantic' then case
      when p_action = 'come_close' then 'come_close'
      when p_action in ('send_affection', 'return_affection') then 'send_affection'
      when p_action = 'kindly_decline' then 'kindly_decline'
      else p_action
    end
    else p_action
  end;
$$;

create or replace function public.moment_action_prop(
  p_destination text,
  p_action text
)
returns text language sql immutable
set search_path = pg_catalog, public as $$
  select case
    when p_destination = 'fireplace' and p_action = 'not_now' then 'banked_embers'
    when p_destination = 'garden' and p_action = 'give_quiet' then 'garden_departure'
    when p_destination = 'garden' and p_action = 'leave_rose' then 'rose'
    when p_destination = 'sofa' and p_action = 'bring_tea' then 'tea_tray'
    when p_destination = 'sofa' and p_action = 'send_hug' then 'heart_cushion'
    when p_destination = 'table' and p_action = 'not_now' then 'waiting_mug'
    when p_destination = 'table' and p_action in ('talk_now', 'join_table') then 'second_mug'
    when p_destination = 'rest' and p_action = 'quiet_room' then 'soft_light'
    when p_destination = 'rest' and p_action = 'leave_blanket' then 'folded_blanket'
    when p_destination = 'rest' and p_action = 'tiny_drawing' then 'tiny_drawing'
    when p_destination = 'romantic' and p_action = 'send_affection' then 'paired_lanterns'
    when p_destination = 'romantic' and p_action = 'kindly_decline' then 'gentle_light'
    else null
  end;
$$;

create or replace function public.moment_response_is_valid(
  p_destination text,
  p_intent text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select case p_destination
    when 'fireplace' then
      p_action = 'not_now' or
      (p_intent = 'stay_close' and p_action = 'come_sit') or
      (p_intent = 'talk_through' and p_action = 'talk_by_fire') or
      (p_intent = 'hear_first' and p_action = 'listen_by_fire') or
      (p_intent in ('apologize', 'acknowledge_hurt') and p_action = 'hear_them_out')
    when 'garden' then p_action in ('give_quiet', 'leave_rose')
    when 'sofa' then p_action in ('sit_with_them', 'bring_tea', 'send_hug')
    when 'table' then p_action in ('talk_now', 'not_now')
    when 'rest' then p_action in ('quiet_room', 'leave_blanket', 'tiny_drawing')
    when 'romantic' then p_action in ('come_close', 'send_affection', 'kindly_decline')
    else false
  end;
$$;

create or replace function public.moment_response_moves_to_destination(
  p_destination text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select
    (p_destination = 'fireplace' and p_action in (
      'come_sit', 'talk_by_fire', 'listen_by_fire', 'hear_them_out', 'join_fireplace'
    )) or
    (p_destination = 'sofa' and p_action = 'sit_with_them') or
    (p_destination = 'table' and p_action in ('talk_now', 'join_table')) or
    (p_destination = 'romantic' and p_action = 'come_close');
$$;

-- Old clients may keep sending these arguments. Current state never stores one.
create or replace function public.moment_response_needs_schedule(
  p_destination text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$ select false; $$;

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
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc limit 1 for update;
  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;
  partner_id := case when home.member_a = uid then home.member_b else home.member_a end;
  if p_type not in ('fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic') then
    raise exception 'Unknown moment destination';
  end if;
  if p_type = 'fireplace' and p_intent not in (
    'stay_close', 'talk_through', 'hear_first', 'apologize'
  ) then
    raise exception 'Choose a fireplace intent';
  elsif p_type <> 'fireplace' and p_intent is not null then
    raise exception 'Only fireplace moments accept an intent';
  end if;
  if exists (select 1 from public.moment_sessions ms
             where ms.couple_id = home.id and ms.terminal_at is null) then
    raise exception 'A shared moment is already open' using errcode = '23505';
  end if;
  insert into public.interaction_groups (couple_id, created_by)
  values (home.id, uid) returning id into group_id;
  insert into public.signals (couple_id, from_user, type, group_id, latest_activity_at)
  values (home.id, uid, p_type, group_id, now()) returning id into signal_id;
  insert into public.moment_sessions (
    signal_id, couple_id, author_id, destination, intent,
    scheduled_for, scheduled_by_user_id, shared_started_at, shared_due_at
  ) values (signal_id, home.id, uid, p_type, p_intent, null, null, null, null);
  insert into public.moment_participants (
    signal_id, user_id, participant_role, note, joined_at, readiness
  ) values
    (signal_id, uid, 'author', normalized_note, now(), false),
    (signal_id, partner_id, 'partner', null, null, false);
  perform public.move_interaction_presence_internal(uid, home.id, signal_id);
  return signal_id;
exception when unique_violation then
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
  canonical_value text;
  action_event_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.author_id = uid then raise exception 'Only the invited partner can respond'; end if;
  canonical_value := public.canonical_moment_action(target.destination, target.intent, p_action);
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;
  if participant.response_action is not null then
    if public.canonical_moment_action(target.destination, target.intent, participant.response_action) = canonical_value
       and participant.note is not distinct from normalized_note then
      select id into action_event_id from public.moment_action_events
      where signal_id = target.signal_id and actor_id = uid and canonical_action = canonical_value;
      return action_event_id;
    end if;
    raise exception 'Use the available next action for this moment';
  end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;
  if not public.moment_response_is_valid(target.destination, target.intent, canonical_value) then
    raise exception 'That response is not available for this moment';
  end if;
  update public.moment_participants
  set response_action = canonical_value,
      responded_at = now(),
      joined_at = case when public.moment_response_moves_to_destination(target.destination, canonical_value)
        then coalesce(joined_at, now()) else joined_at end,
      note = normalized_note,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;
  update public.moment_sessions
  set phase = case when public.moment_response_moves_to_destination(destination, canonical_value)
        then 'shared' else 'responded' end,
      scheduled_for = null,
      scheduled_by_user_id = null,
      shared_started_at = case
        when destination = 'romantic' and canonical_value = 'come_close'
          then coalesce(shared_started_at, now())
        else shared_started_at end,
      shared_due_at = null,
      updated_at = now()
  where signal_id = target.signal_id;
  if public.moment_response_moves_to_destination(target.destination, canonical_value) then
    perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  end if;
  action_event_id := public.record_moment_action_internal(
    target.signal_id, target.couple_id, uid, target.destination, canonical_value
  );
  if target.destination = 'romantic' and canonical_value = 'kindly_decline' then
    perform public.finish_moment_internal(target.signal_id, 'romantic_declined', false, canonical_value);
  end if;
  return action_event_id;
end;
$$;

create or replace function public.join_moment(p_signal_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
  join_action text;
  event_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.terminal_at is not null then return null; end if;
  if target.destination not in ('fireplace', 'table') or target.author_id = uid then
    raise exception 'This participant cannot join later';
  end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;
  if public.canonical_moment_action(target.destination, target.intent, participant.response_action) <> 'not_now' then
    raise exception 'Choose Not now before joining later';
  end if;
  join_action := case when target.destination = 'fireplace' then 'join_fireplace' else 'join_table' end;
  if participant.joined_at is null then
    update public.moment_participants
    set joined_at = now(), returned_at = coalesce(returned_at, now()), updated_at = now()
    where signal_id = target.signal_id and user_id = uid;
    update public.moment_sessions set phase = 'shared', updated_at = now()
    where signal_id = target.signal_id;
    perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  end if;
  event_id := public.record_moment_action_internal(
    target.signal_id, target.couple_id, uid, target.destination, join_action
  );
  return event_id;
end;
$$;

create or replace function public.set_moment_readiness(p_signal_id uuid, p_ready boolean)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  joined_count integer;
  ready_count integer;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;
  if target.destination <> 'fireplace' then raise exception 'Readiness is only available at the fireplace'; end if;
  select count(*) into joined_count from public.moment_participants
  where signal_id = target.signal_id and joined_at is not null;
  if joined_count <> 2 then raise exception 'Both people must join before choosing readiness'; end if;
  update public.moment_participants
  set readiness = p_ready,
      readiness_updated_at = now(),
      completion_choice = null,
      completion_chosen_at = null,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;
  select count(*) into ready_count from public.moment_participants
  where signal_id = target.signal_id and readiness;
  if ready_count = 2 then
    return public.finish_moment_internal(target.signal_id, 'fireplace_reconnected', true, null);
  end if;
  return null;
end;
$$;

create or replace function public.resolve_moment(p_signal_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  partner public.moment_participants;
  canonical_response text;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;
  if target.author_id <> uid then raise exception 'Only the creator can resolve this moment'; end if;
  if target.destination = 'fireplace' then
    raise exception 'Fireplace moments resolve through private readiness';
  end if;
  select * into partner from public.moment_participants
  where signal_id = target.signal_id and participant_role = 'partner';
  canonical_response := public.canonical_moment_action(target.destination, target.intent, partner.response_action);
  if canonical_response is null then raise exception 'Wait for a response before resolving'; end if;
  if target.destination = 'table' then
    if partner.joined_at is null then raise exception 'Both people must join before resolving the table moment'; end if;
    return public.finish_moment_internal(target.signal_id, 'table_talked', true, canonical_response);
  elsif target.destination = 'garden' then
    return public.finish_moment_internal(target.signal_id, 'garden_ready', true, canonical_response);
  elsif target.destination = 'sofa' then
    return public.finish_moment_internal(target.signal_id, 'sofa_care', true, canonical_response);
  elsif target.destination = 'rest' then
    return public.finish_moment_internal(target.signal_id, 'rest_ready', true, canonical_response);
  elsif target.destination = 'romantic' and canonical_response in ('come_close', 'send_affection') then
    return public.finish_moment_internal(target.signal_id, 'romantic_remote_affection', true, canonical_response);
  end if;
  raise exception 'That resolution is not available for this moment';
end;
$$;

create or replace function public.cancel_moment(p_signal_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b)
  for update of ms;
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;
  if target.author_id <> uid then raise exception 'Only the creator can cancel this moment'; end if;
  perform public.finish_moment_internal(target.signal_id, 'withdrawn', false, null);
  return null;
end;
$$;

-- Compatibility wrappers: old clients cannot manufacture a terminal result.
create or replace function public.set_moment_completion_choice(
  p_signal_id uuid,
  p_choice text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare target public.moment_sessions; uid uuid := auth.uid();
begin
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  if target.terminal_at is not null then return target.completion_event_id; end if;
  if target.destination = 'fireplace' then
    return public.set_moment_readiness(p_signal_id, p_choice = 'reconnected');
  elsif target.destination = 'table' and target.author_id = uid and p_choice = 'talked' then
    return public.resolve_moment(p_signal_id);
  end if;
  return null;
end;
$$;

create or replace function public.end_moment(p_signal_id uuid, p_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if p_reason = 'close_without_resolved' then return public.cancel_moment(p_signal_id); end if;
  return public.resolve_moment(p_signal_id);
end;
$$;

create or replace function public.maybe_start_romantic_shared_internal(p_signal_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.moment_sessions
  set phase = 'shared', shared_started_at = coalesce(shared_started_at, now()),
      shared_due_at = null, updated_at = now()
  where signal_id = p_signal_id and destination = 'romantic' and terminal_at is null;
end;
$$;

create or replace function public.finalize_due_romantic_moment(p_signal_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid(); target public.moment_sessions;
begin
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null then raise exception 'Moment not found' using errcode = '42501'; end if;
  return target.completion_event_id;
end;
$$;

create or replace function public.finalize_all_due_romantic_moments()
returns integer language sql security definer
set search_path = pg_catalog, public as $$ select 0; $$;

-- Clear every legacy timer/schedule and remove the durable expiry job.
update public.moment_sessions
set scheduled_for = null,
    scheduled_by_user_id = null,
    shared_due_at = null,
    updated_at = now()
where scheduled_for is not null or scheduled_by_user_id is not null or shared_due_at is not null;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job where jobname = 'hearth-romantic-moment-expiry-v2';
  end if;
end $$;

-- Extend the current enriched snapshot without exposing anybody else's readiness.
alter function public.get_moment_snapshot_v2()
  rename to get_moment_snapshot_v2_flow_base;
revoke execute on function public.get_moment_snapshot_v2_flow_base()
  from public, anon, authenticated;

create function public.get_moment_snapshot_v2()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  base jsonb;
  home_id uuid;
  active_id uuid;
  destination text;
  author_id uuid;
  partner_response text;
  partner_joined boolean := false;
  joined_count integer := 0;
  participant_rows jsonb := '[]'::jsonb;
  completion_rows jsonb := '[]'::jsonb;
  action_kind text := 'none';
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  base := public.get_moment_snapshot_v2_flow_base();
  select c.id into home_id from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc limit 1;
  active_id := nullif(base #>> '{active,signal_id}', '')::uuid;
  destination := base #>> '{active,destination}';
  author_id := nullif(base #>> '{active,author_id}', '')::uuid;
  if active_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', mp.user_id,
      'role', mp.participant_role,
      'note', mp.note,
      'note_removed', mp.note_removed_at is not null,
      'response_action', case when mp.response_action is null then null else
        public.canonical_moment_action(destination, base #>> '{active,intent}', mp.response_action) end,
      'responded_at', mp.responded_at,
      'joined_at', mp.joined_at,
      'readiness', case when mp.user_id = uid then mp.readiness end,
      'readiness_updated_at', case when mp.user_id = uid then mp.readiness_updated_at end,
      'completion_choice', null,
      'completion_chosen_at', null,
      'returned_at', mp.returned_at
    ) order by mp.participant_role), '[]'::jsonb),
    count(*) filter (where mp.joined_at is not null),
    bool_or(mp.participant_role = 'partner' and mp.joined_at is not null),
    max(case when mp.participant_role = 'partner' then
      public.canonical_moment_action(destination, base #>> '{active,intent}', mp.response_action) end)
    into participant_rows, joined_count, partner_joined, partner_response
    from public.moment_participants mp where mp.signal_id = active_id;

    if uid <> author_id and partner_response is null then
      action_kind := 'respond_' || destination;
    elsif uid <> author_id and destination = 'fireplace' and partner_response = 'not_now' and not partner_joined then
      action_kind := 'join_fireplace';
    elsif uid <> author_id and destination = 'table' and partner_response = 'not_now' and not partner_joined then
      action_kind := 'join_table';
    elsif destination = 'fireplace' and joined_count = 2 then
      action_kind := 'confirm_fireplace';
    elsif uid = author_id and destination = 'table' and joined_count = 2 then
      action_kind := 'resolve_table';
    elsif uid = author_id and partner_response is not null and destination in ('garden','sofa','rest','romantic') then
      action_kind := 'resolve_' || destination;
    else
      action_kind := 'wait';
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'signal_id', e.signal_id,
    'author_id', ms.author_id,
    'destination', e.destination,
    'terminal_reason', e.terminal_reason,
    'response_action', e.response_action,
    'payoff_kind', e.payoff_kind,
    'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into completion_rows
  from public.moment_completion_events e
  join public.moment_sessions ms on ms.signal_id = e.signal_id
  where e.couple_id = home_id and e.occurred_at >= date_trunc('day', now());
  base := jsonb_set(base, '{participants}', participant_rows, false);
  base := jsonb_set(base, '{personal_action}', jsonb_build_object('kind', action_kind), false);
  base := jsonb_set(base, '{completion_events}', completion_rows, false);
  base := jsonb_set(base, '{active,scheduled_for}', 'null'::jsonb, false);
  base := jsonb_set(base, '{active,scheduled_by_user_id}', 'null'::jsonb, false);
  base := jsonb_set(base, '{active,shared_due_at}', 'null'::jsonb, false);
  return base;
end;
$$;

revoke execute on function public.get_moment_snapshot_v2() from public, anon;
grant execute on function public.get_moment_snapshot_v2() to authenticated;
revoke execute on function public.set_moment_readiness(uuid, boolean) from public, anon;
grant execute on function public.set_moment_readiness(uuid, boolean) to authenticated;
revoke execute on function public.resolve_moment(uuid) from public, anon;
grant execute on function public.resolve_moment(uuid) to authenticated;
revoke execute on function public.cancel_moment(uuid) from public, anon;
grant execute on function public.cancel_moment(uuid) to authenticated;

commit;
