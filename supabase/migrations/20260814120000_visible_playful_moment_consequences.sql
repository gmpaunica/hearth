-- Moments 1.0.3 -- visible, playful consequences
--
-- Additive follow-up to Meaningful Shared States. Existing RPC signatures and
-- schedule columns remain wire-compatible, but all new responses are timeless:
-- delayed Fireplace/Table replies become `need_more_time` and may join later.

begin;

alter table public.moment_participants
  add column if not exists joined_at timestamptz;

create table if not exists public.moment_action_events (
  id                uuid primary key default gen_random_uuid(),
  signal_id         uuid not null references public.moment_sessions (signal_id) on delete cascade,
  couple_id         uuid not null references public.couples (id) on delete cascade,
  actor_id          uuid not null references public.profiles (id) on delete cascade,
  destination       text not null check (destination in (
    'fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic'
  )),
  canonical_action  text not null,
  prop_type         text check (prop_type is null or prop_type in (
    'banked_embers', 'garden_departure', 'rose', 'tea_tray',
    'heart_cushion', 'waiting_mug', 'second_mug', 'soft_light',
    'folded_blanket', 'tiny_drawing', 'paired_lanterns', 'gentle_light'
  )),
  occurred_at       timestamptz not null default now(),
  unique (signal_id, actor_id, canonical_action)
);

create index if not exists moment_action_events_couple_time_idx
  on public.moment_action_events (couple_id, occurred_at desc);
create index if not exists moment_action_events_signal_time_idx
  on public.moment_action_events (signal_id, occurred_at);

create or replace function public.reject_moment_action_event_mutation()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  raise exception 'Moment action events are immutable';
end;
$$;

drop trigger if exists moment_action_events_immutable_update
  on public.moment_action_events;
create trigger moment_action_events_immutable_update
  before update or delete on public.moment_action_events
  for each row execute function public.reject_moment_action_event_mutation();

create or replace function public.canonical_moment_action(
  p_destination text,
  p_intent text,
  p_action text
)
returns text language sql immutable
set search_path = pg_catalog, public as $$
  select case p_destination
    when 'fireplace' then case
      when p_action in ('need_more_time', 'care_need_time', 'talk_later',
                        'appreciate_need_time', 'respect_more_time',
                        'offer_reassurance', 'understand_first') then 'need_more_time'
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
      when p_action in ('need_more_time', 'talk_later') then 'need_more_time'
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
    when p_destination = 'fireplace' and p_action = 'need_more_time' then 'banked_embers'
    when p_destination = 'garden' and p_action = 'give_quiet' then 'garden_departure'
    when p_destination = 'garden' and p_action = 'leave_rose' then 'rose'
    when p_destination = 'sofa' and p_action = 'bring_tea' then 'tea_tray'
    when p_destination = 'sofa' and p_action = 'send_hug' then 'heart_cushion'
    when p_destination = 'table' and p_action = 'need_more_time' then 'waiting_mug'
    when p_destination = 'table' and p_action in ('talk_now', 'join_table') then 'second_mug'
    when p_destination = 'rest' and p_action = 'quiet_room' then 'soft_light'
    when p_destination = 'rest' and p_action = 'leave_blanket' then 'folded_blanket'
    when p_destination = 'rest' and p_action = 'tiny_drawing' then 'tiny_drawing'
    when p_destination = 'romantic' and p_action = 'send_affection' then 'paired_lanterns'
    when p_destination = 'romantic' and p_action = 'kindly_decline' then 'gentle_light'
    else null
  end;
$$;

create or replace function public.record_moment_action_internal(
  p_signal_id uuid,
  p_couple_id uuid,
  p_actor_id uuid,
  p_destination text,
  p_action text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  event_id uuid;
begin
  insert into public.moment_action_events (
    signal_id, couple_id, actor_id, destination, canonical_action, prop_type
  ) values (
    p_signal_id, p_couple_id, p_actor_id, p_destination, p_action,
    public.moment_action_prop(p_destination, p_action)
  )
  on conflict (signal_id, actor_id, canonical_action) do nothing
  returning id into event_id;

  if event_id is null then
    select id into event_id from public.moment_action_events
    where signal_id = p_signal_id
      and actor_id = p_actor_id
      and canonical_action = p_action;
  end if;
  return event_id;
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
      p_action = 'need_more_time' or
      (p_intent = 'stay_close' and p_action = 'come_sit') or
      (p_intent = 'talk_through' and p_action = 'talk_by_fire') or
      (p_intent = 'hear_first' and p_action = 'listen_by_fire') or
      (p_intent in ('apologize', 'acknowledge_hurt') and p_action = 'hear_them_out')
    when 'garden' then p_action in ('give_quiet', 'leave_rose')
    when 'sofa' then p_action in ('sit_with_them', 'bring_tea', 'send_hug')
    when 'table' then p_action in ('talk_now', 'need_more_time')
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

-- Kept for signature compatibility. No new action requires a schedule.
create or replace function public.moment_response_needs_schedule(
  p_destination text,
  p_action text
)
returns boolean language sql immutable
set search_path = pg_catalog, public as $$
  select false;
$$;

-- The creator is already at the destination. Backfill partners who previously
-- chose a joining response; hydration treats these as state, never animation.
update public.moment_participants mp
set joined_at = coalesce(mp.joined_at, mp.created_at)
where mp.participant_role = 'author';

update public.moment_participants mp
set joined_at = coalesce(mp.joined_at, mp.responded_at, mp.returned_at)
from public.moment_sessions ms
where ms.signal_id = mp.signal_id
  and mp.participant_role = 'partner'
  and (
    public.moment_response_moves_to_destination(
      ms.destination,
      public.canonical_moment_action(ms.destination, ms.intent, mp.response_action)
    )
    or (
      ms.destination in ('fireplace', 'table')
      and mp.returned_at is not null
      and public.canonical_moment_action(ms.destination, ms.intent, mp.response_action) = 'need_more_time'
    )
  );

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
    scheduled_for, scheduled_by_user_id
  ) values (signal_id, home.id, uid, p_type, p_intent, null, null);
  insert into public.moment_participants (
    signal_id, user_id, participant_role, note, joined_at
  ) values
    (signal_id, uid, 'author', normalized_note, now()),
    (signal_id, partner_id, 'partner', null, null);
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
  if target.author_id = uid then
    raise exception 'Only the invited partner can respond';
  end if;
  canonical_value := public.canonical_moment_action(
    target.destination, target.intent, p_action
  );
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;

  if participant.response_action is not null then
    if public.canonical_moment_action(
         target.destination, target.intent, participant.response_action
       ) = canonical_value
       and participant.note is not distinct from normalized_note then
      select id into action_event_id from public.moment_action_events
      where signal_id = target.signal_id and actor_id = uid
        and canonical_action = canonical_value;
      return action_event_id;
    end if;
    raise exception 'A response cannot be replaced';
  end if;
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if not public.moment_response_is_valid(
    target.destination, target.intent, canonical_value
  ) then
    raise exception 'That response is not available for this moment';
  end if;

  update public.moment_participants
  set response_action = canonical_value,
      responded_at = now(),
      joined_at = case
        when public.moment_response_moves_to_destination(target.destination, canonical_value)
          then coalesce(joined_at, now())
        else joined_at
      end,
      note = normalized_note,
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid;

  update public.moment_sessions
  set phase = case
        when public.moment_response_moves_to_destination(destination, canonical_value)
          then 'shared'
        else 'responded'
      end,
      -- Parameters and columns remain compatible, but schedules are ignored.
      scheduled_for = null,
      scheduled_by_user_id = null,
      updated_at = now()
  where signal_id = target.signal_id;

  if public.moment_response_moves_to_destination(target.destination, canonical_value) then
    perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  end if;
  action_event_id := public.record_moment_action_internal(
    target.signal_id, target.couple_id, uid, target.destination, canonical_value
  );

  if target.destination = 'romantic' and canonical_value = 'send_affection' then
    perform public.finish_moment_internal(
      target.signal_id, 'romantic_remote_affection', true, canonical_value
    );
  elsif target.destination = 'romantic' and canonical_value = 'kindly_decline' then
    perform public.finish_moment_internal(
      target.signal_id, 'romantic_declined', true, canonical_value
    );
  elsif target.destination = 'romantic' and canonical_value = 'come_close' then
    perform public.maybe_start_romantic_shared_internal(target.signal_id);
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
  if target.terminal_at is not null then
    return null;
  end if;
  if target.destination not in ('fireplace', 'table') or target.author_id = uid then
    raise exception 'This participant cannot join later';
  end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid for update;
  if public.canonical_moment_action(
       target.destination, target.intent, participant.response_action
     ) <> 'need_more_time' then
    raise exception 'Choose more time before joining later';
  end if;
  join_action := case when target.destination = 'fireplace'
    then 'join_fireplace' else 'join_table' end;

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

create or replace function public.set_moment_completion_choice(
  p_signal_id uuid,
  p_choice text
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
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
  if target.terminal_at is not null then
    return target.completion_event_id;
  end if;
  if target.destination not in ('fireplace', 'table') then
    raise exception 'This moment has no mutual completion choice';
  end if;
  select count(*) into joined_count from public.moment_participants
  where signal_id = target.signal_id and joined_at is not null;
  if joined_count <> 2 then
    raise exception 'Both people must join before choosing an ending';
  end if;
  if target.destination = 'fireplace'
     and p_choice not in ('reconnected', 'talk_first', 'more_time') then
    raise exception 'Unknown fireplace completion choice';
  end if;
  if target.destination = 'table' and p_choice not in ('talked', 'not_yet') then
    raise exception 'Unknown table completion choice';
  end if;

  update public.moment_participants
  set completion_choice = p_choice,
      completion_chosen_at = coalesce(completion_chosen_at, now()),
      updated_at = now()
  where signal_id = target.signal_id and user_id = uid
    and completion_choice is null;

  select count(*) into ready_count from public.moment_participants
  where signal_id = target.signal_id
    and completion_choice = case when target.destination = 'fireplace'
      then 'reconnected' else 'talked' end;
  if ready_count = 2 then
    return public.finish_moment_internal(
      target.signal_id,
      case when target.destination = 'fireplace'
        then 'fireplace_reconnected' else 'table_talked' end,
      true,
      null
    );
  end if;
  return null;
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
  select ms.* into target from public.moment_sessions ms
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
  if target.destination = 'sofa' and p_reason = 'feel_cared_for'
     and exists (select 1 from public.moment_participants mp
                 where mp.signal_id = target.signal_id
                   and mp.participant_role = 'partner'
                   and mp.response_action is not null) then
    return public.finish_moment_internal(target.signal_id, 'sofa_care', true, null);
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
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null or target.terminal_at is not null then return false; end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid;
  if participant.participant_role = 'partner' and participant.joined_at is null then
    raise exception 'Use the available join action first';
  end if;
  if target.destination in ('garden', 'rest') and participant.participant_role = 'partner' then
    raise exception 'This destination remains private for the author';
  end if;
  perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  return true;
end;
$$;

create or replace function public.return_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
  moved boolean;
begin
  select ms.* into target from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null or target.terminal_at is not null then return false; end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid;
  if participant.participant_role = 'partner'
     and target.destination in ('fireplace', 'table')
     and public.canonical_moment_action(
       target.destination, target.intent, participant.response_action
     ) = 'need_more_time' then
    perform public.join_moment(p_signal_id);
    return true;
  end if;
  moved := public.move_to_moment(p_signal_id);
  if moved then
    update public.moment_participants
    set returned_at = coalesce(returned_at, now()), updated_at = now()
    where signal_id = p_signal_id and user_id = uid;
  end if;
  return moved;
end;
$$;

-- Preserve the note-enriched snapshot and replace only the v2 additions.
alter function public.get_moment_snapshot_v2()
  rename to get_moment_snapshot_v2_consequences_base;
revoke execute on function public.get_moment_snapshot_v2_consequences_base()
  from public, anon, authenticated;

create function public.get_moment_snapshot_v2()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home_id uuid;
  active_id uuid;
  active_destination text;
  active_author uuid;
  base jsonb;
  participant_rows jsonb := '[]'::jsonb;
  current_events jsonb := '[]'::jsonb;
  today_events jsonb := '[]'::jsonb;
  action_kind text := 'none';
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  base := public.get_moment_snapshot_v2_consequences_base();
  select c.id into home_id from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc limit 1;
  select ms.signal_id, ms.destination, ms.author_id
  into active_id, active_destination, active_author
  from public.moment_sessions ms
  where ms.couple_id = home_id and ms.terminal_at is null
  order by ms.created_at desc limit 1;

  if active_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', mp.user_id,
      'role', mp.participant_role,
      'note', mp.note,
      'note_removed', mp.note_removed_at is not null,
      'response_action', case when mp.response_action is null then null else
        public.canonical_moment_action(active_destination, null, mp.response_action) end,
      'responded_at', mp.responded_at,
      'joined_at', mp.joined_at,
      'completion_choice', case when mp.user_id = uid then mp.completion_choice end,
      'completion_chosen_at', case when mp.user_id = uid then mp.completion_chosen_at end,
      'returned_at', mp.returned_at
    ) order by mp.participant_role), '[]'::jsonb)
    into participant_rows from public.moment_participants mp
    where mp.signal_id = active_id;

    if uid <> active_author and exists (
      select 1 from public.moment_participants mp
      where mp.signal_id = active_id and mp.user_id = uid and mp.response_action is null
    ) then action_kind := 'respond';
    elsif uid <> active_author and active_destination = 'fireplace' and exists (
      select 1 from public.moment_participants mp where mp.signal_id = active_id
      and mp.user_id = uid and mp.joined_at is null
      and public.canonical_moment_action(active_destination, null, mp.response_action) = 'need_more_time'
    ) then action_kind := 'join_fireplace';
    elsif uid <> active_author and active_destination = 'table' and exists (
      select 1 from public.moment_participants mp where mp.signal_id = active_id
      and mp.user_id = uid and mp.joined_at is null
      and public.canonical_moment_action(active_destination, null, mp.response_action) = 'need_more_time'
    ) then action_kind := 'join_table';
    elsif active_destination in ('fireplace', 'table')
      and (select count(*) from public.moment_participants mp
           where mp.signal_id = active_id and mp.joined_at is not null) = 2
      and exists (select 1 from public.moment_participants mp
                  where mp.signal_id = active_id and mp.user_id = uid
                    and mp.completion_choice is null)
      then action_kind := 'choose_completion';
    elsif uid = active_author and active_destination = 'garden' then action_kind := 'garden_return';
    elsif uid = active_author and active_destination = 'sofa' and exists (
      select 1 from public.moment_participants mp where mp.signal_id = active_id
      and mp.participant_role = 'partner' and mp.response_action is not null
    ) then action_kind := 'sofa_cared';
    elsif uid = active_author and active_destination = 'rest' then action_kind := 'rest_ready';
    else action_kind := 'wait';
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'signal_id', e.signal_id, 'actor_id', e.actor_id,
    'destination', e.destination, 'canonical_action', e.canonical_action,
    'prop_type', e.prop_type, 'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into current_events from public.moment_action_events e
  where e.couple_id = home_id and e.signal_id = active_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'signal_id', e.signal_id, 'actor_id', e.actor_id,
    'destination', e.destination, 'canonical_action', e.canonical_action,
    'prop_type', e.prop_type, 'occurred_at', e.occurred_at
  ) order by e.occurred_at), '[]'::jsonb)
  into today_events from public.moment_action_events e
  where e.couple_id = home_id and e.occurred_at >= date_trunc('day', now());

  base := jsonb_set(base, '{participants}', participant_rows, false);
  base := jsonb_set(base, '{personal_action}', jsonb_build_object('kind', action_kind), false);
  base := jsonb_set(base, '{current_action_events}', current_events, true);
  base := jsonb_set(base, '{today_action_events}', today_events, true);
  return base;
end;
$$;

alter table public.moment_action_events enable row level security;
drop policy if exists moment_action_events_select on public.moment_action_events;
create policy moment_action_events_select on public.moment_action_events
  for select to authenticated using (public.is_couple_member(couple_id));
revoke all privileges on table public.moment_action_events from public, anon, authenticated;
grant select on table public.moment_action_events to authenticated;

revoke execute on function public.get_moment_snapshot_v2() from public, anon;
grant execute on function public.get_moment_snapshot_v2() to authenticated;
revoke execute on function public.join_moment(uuid) from public, anon;
grant execute on function public.join_moment(uuid) to authenticated;

do $$
declare signature text;
begin
  foreach signature in array array[
    'canonical_moment_action(text,text,text)',
    'moment_action_prop(text,text)',
    'record_moment_action_internal(uuid,uuid,uuid,text,text)',
    'reject_moment_action_event_mutation()'
  ] loop
    execute format(
      'revoke execute on function public.%s from public, anon, authenticated',
      signature
    );
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'moment_action_events'
  ) then
    alter publication supabase_realtime add table public.moment_action_events;
  end if;
end $$;

commit;
