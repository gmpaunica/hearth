-- Remove two unused PL/pgSQL locals reported by the linked database linter.
-- Function signatures and behavior are unchanged.

begin;

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

create or replace function public.return_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
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

commit;
